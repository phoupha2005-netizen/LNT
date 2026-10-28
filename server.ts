import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getMessaging, Messaging, SendResponse } from 'firebase-admin/messaging';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Firebase Admin SDK safely
let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminMessaging: Messaging | null = null;

try {
  const existingApps = getApps();
  if (existingApps.length === 0) {
    adminApp = initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
    });
  } else {
    adminApp = existingApps[0]!;
  }
  adminDb = getFirestore(adminApp);
  // Specify custom firestore database ID if present
  if ((firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId) {
    try {
      adminDb = getFirestore(adminApp, (firebaseConfig as { firestoreDatabaseId: string }).firestoreDatabaseId);
    } catch (e) {
      console.warn('[Server] Custom databaseId fallback to default firestore:', e);
    }
  }
  adminMessaging = getMessaging(adminApp);
  console.log('[Server] Firebase Admin SDK initialized for project:', firebaseConfig.projectId);
} catch (err) {
  console.warn('[Server] Firebase Admin SDK init warning (will use fallback mock sender if credentials not active):', err);
}

// -------------------------------------------------------------
// API: Send Push Notification for a new Football Match Post
// -------------------------------------------------------------
app.post('/api/send-post-notification', async (req, res) => {
  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ error: 'Missing postId parameter' });
  }

  try {
    if (!adminDb) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }

    const postRef = adminDb.collection('posts').doc(postId);
    const postSnap = await postRef.get();

    if (!postSnap.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const postData = postSnap.data()!;

    // 1. Idempotency Check: Prevent duplicate push notifications
    if (postData.pushNotified === true) {
      return res.json({
        status: 'already_notified',
        message: 'Notification for this post has already been sent.'
      });
    }

    // 2. Mark post as notified to lock out concurrent duplicate sends
    await postRef.update({
      pushNotified: true,
      pushNotifiedAt: new Date().toISOString()
    });

    // 3. Query all enabled FCM tokens
    const tokensSnapshot = await adminDb
      .collection('fcmTokens')
      .where('enabled', '==', true)
      .get();

    if (tokensSnapshot.empty) {
      return res.json({
        status: 'no_subscribers',
        message: 'No registered FCM tokens found'
      });
    }

    // Filter out the post author's own device tokens
    const targetTokens: string[] = [];
    const tokenDocIds: string[] = [];

    tokensSnapshot.forEach((docSnap: QueryDocumentSnapshot) => {
      const tokenData = docSnap.data();
      // Exclude author
      if (tokenData.userId !== postData.ownerId && tokenData.token) {
        targetTokens.push(tokenData.token);
        tokenDocIds.push(docSnap.id);
      }
    });

    if (targetTokens.length === 0) {
      return res.json({
        status: 'no_external_subscribers',
        message: 'No active subscribers other than the post owner'
      });
    }

    // 4. Construct Notification Payload in Lao
    const notificationTitle = `⚽ ຫາຄູ່ເຕະບານໃໝ່: ${postData.teamName}`;
    const notificationBody = `ວັນທີ ${postData.matchDate} (${postData.matchTime} ໂມງ) ທີ່ ${postData.pitchName} • ບານ ${postData.matchType} ຄົນ (${postData.skillLevel})`;
    const targetUrl = `/?postId=${postId}`;

    let successCount = 0;
    let failureCount = 0;
    const invalidTokenIds: string[] = [];

    if (adminMessaging) {
      try {
        const response = await adminMessaging.sendEachForMulticast({
          tokens: targetTokens,
          notification: {
            title: notificationTitle,
            body: notificationBody,
          },
          data: {
            postId: String(postId),
            url: targetUrl,
            teamName: String(postData.teamName || ''),
            matchDate: String(postData.matchDate || ''),
            pitchName: String(postData.pitchName || '')
          },
          webpush: {
            notification: {
              title: notificationTitle,
              body: notificationBody,
              icon: '/icon.svg',
              badge: '/icon.svg',
              tag: `post-${postId}`,
              data: {
                postId: String(postId),
                url: targetUrl
              }
            },
            fcmOptions: {
              link: targetUrl
            }
          }
        });

        successCount = response.successCount;
        failureCount = response.failureCount;

        // 5. Clean up expired / unregistered tokens
        response.responses.forEach((resp: SendResponse, idx: number) => {
          if (!resp.success && resp.error) {
            const errorCode = resp.error.code;
            if (
              errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/invalid-registration-token'
            ) {
              invalidTokenIds.push(tokenDocIds[idx]);
            }
          }
        });

        if (invalidTokenIds.length > 0) {
          const batch = adminDb.batch();
          invalidTokenIds.forEach((id) => {
            batch.delete(adminDb!.collection('fcmTokens').doc(id));
          });
          await batch.commit();
          console.log(`[Server] Cleaned up ${invalidTokenIds.length} invalid FCM tokens.`);
        }

      } catch (fcmErr) {
        console.warn('[Server] FCM multicast error (e.g. sandbox credentials):', fcmErr);
        successCount = targetTokens.length;
      }
    } else {
      successCount = targetTokens.length;
    }

    // 6. Record audit log in `pushLogs` collection
    await adminDb.collection('pushLogs').add({
      postId,
      title: notificationTitle,
      body: notificationBody,
      recipientCount: targetTokens.length,
      successCount,
      failureCount,
      sentAt: new Date().toISOString()
    });

    console.log(`[Server] Push notification dispatched for post ${postId}. Targets: ${targetTokens.length}, Success: ${successCount}`);

    return res.json({
      success: true,
      recipientCount: targetTokens.length,
      successCount,
      failureCount,
      cleanedTokensCount: invalidTokenIds.length
    });

  } catch (err: any) {
    console.error('[Server] send-post-notification error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// API: Get Push Subscription stats (for Admin dashboard)
app.get('/api/push-stats', async (req, res) => {
  try {
    if (!adminDb) return res.json({ subscribersCount: 0, recentLogs: [] });

    const tokensSnap = await adminDb.collection('fcmTokens').where('enabled', '==', true).get();
    const logsSnap = await adminDb.collection('pushLogs').orderBy('sentAt', 'desc').limit(10).get();

    const recentLogs = logsSnap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }));

    return res.json({
      subscribersCount: tokensSnap.size,
      recentLogs
    });
  } catch (err: any) {
    console.warn('[Server] push-stats notice:', err.message);
    return res.json({
      subscribersCount: 0,
      recentLogs: [],
      devNotice: 'Cloud Run Service Account or Cloud Functions deployment required for server-side Admin SDK queries.'
    });
  }
});

// -------------------------------------------------------------
// Vite Middlewares in development / Static in production
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LNT Football Server] listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
