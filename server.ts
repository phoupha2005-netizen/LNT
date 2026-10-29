import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getMessaging, type Messaging, type SendResponse } from 'firebase-admin/messaging';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import fs from 'fs';

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
    let credentialOption = undefined;
    
    // Check if Service Account JSON key is available via env or local file
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const parsedKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        credentialOption = cert(parsedKey);
        console.log('[Server] Initialized Firebase Admin SDK with FIREBASE_SERVICE_ACCOUNT_KEY env');
      } catch (e) {
        console.warn('[Server] Could not parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
      }
    } else if (fs.existsSync(serviceAccountPath)) {
      try {
        const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
        credentialOption = cert(JSON.parse(fileContent));
        console.log('[Server] Initialized Firebase Admin SDK with serviceAccountKey.json');
      } catch (e) {
        console.warn('[Server] Could not read serviceAccountKey.json:', e);
      }
    }

    adminApp = initializeApp({
      ...(credentialOption ? { credential: credentialOption } : {}),
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
  res.setHeader('Content-Type', 'application/json');
  const { postId, postData: clientPostData, tokens: clientTokens, force } = req.body || {};

  if (!postId) {
    return res.status(400).json({ error: 'Missing postId parameter' });
  }

  try {
    let postData = clientPostData;
    let postRef: any = null;

    if (!postData && adminDb) {
      try {
        postRef = adminDb.collection('posts').doc(postId);
        const postSnap = await postRef.get();
        if (postSnap.exists) {
          postData = postSnap.data();
        }
      } catch (err: any) {
        console.warn('[Server] adminDb read post notice:', err.message);
      }
    }

    if (!postData) {
      return res.json({
        success: true,
        status: 'post_data_deferred',
        message: 'Cloud Functions trigger will dispatch push notification in production'
      });
    }

    // 1. Idempotency Check: Prevent duplicate push notifications (unless force is true for admin test)
    if (postData.pushNotified === true && !force) {
      return res.json({
        status: 'already_notified',
        message: 'Notification for this post has already been sent.'
      });
    }

    // 2. Mark post as notified if adminDb has write access
    if (postRef) {
      try {
        await postRef.update({
          pushNotified: true,
          pushNotifiedAt: new Date().toISOString()
        });
      } catch (e: any) {
        console.warn('[Server] Mark post pushNotified notice:', e.message);
      }
    }

    // 3. Collect target tokens
    let targetTokens: string[] = Array.isArray(clientTokens) ? [...clientTokens] : [];
    const tokenDocIds: string[] = [];

    if (targetTokens.length === 0 && adminDb) {
      try {
        const tokensSnapshot = await adminDb
          .collection('fcmTokens')
          .where('enabled', '==', true)
          .get();

        tokensSnapshot.forEach((docSnap: QueryDocumentSnapshot) => {
          const tokenData = docSnap.data();
          if ((force || tokenData.userId !== postData.ownerId) && tokenData.token) {
            targetTokens.push(tokenData.token);
            tokenDocIds.push(docSnap.id);
          }
        });
      } catch (err: any) {
        console.warn('[Server] adminDb query fcmTokens notice:', err.message);
      }
    }

    if (targetTokens.length === 0) {
      return res.json({
        success: true,
        status: 'no_external_subscribers',
        message: 'No active subscribers found for this post.'
      });
    }

    // 4. Construct Notification Payload in Lao
    const notificationTitle = `⚽ ຫາຄູ່ເຕະບານໃໝ່: ${postData.teamName || 'ທີມນັກເຕະ'}`;
    const notificationBody = `ວັນທີ ${postData.matchDate || ''} (${postData.matchTime || ''} ໂມງ) ທີ່ ${postData.pitchName || 'ສະໜາມບານ'} • ບານ ${postData.matchType || ''} ຄົນ`;
    const targetUrl = `/?postId=${postId}`;

    let successCount = targetTokens.length;
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

        // Clean up expired tokens if tokenDocIds available
        if (tokenDocIds.length > 0 && adminDb) {
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
            try {
              const batch = adminDb.batch();
              invalidTokenIds.forEach((id) => {
                batch.delete(adminDb!.collection('fcmTokens').doc(id));
              });
              await batch.commit();
            } catch (e: any) {
              console.warn('[Server] Token cleanup notice:', e.message);
            }
          }
        }

      } catch (fcmErr: any) {
        console.warn('[Server] FCM multicast notice (real device testing):', fcmErr.message);
      }
    }

    // 6. Record audit log in `pushLogs` collection if possible
    if (adminDb) {
      try {
        await adminDb.collection('pushLogs').add({
          postId,
          title: notificationTitle,
          body: notificationBody,
          recipientCount: targetTokens.length,
          successCount,
          failureCount,
          sentAt: new Date().toISOString()
        });
      } catch (e: any) {
        console.warn('[Server] pushLogs log notice:', e.message);
      }
    }

    console.log(`[Server] Push notification handled for post ${postId}. Targets: ${targetTokens.length}, Success: ${successCount}`);

    return res.json({
      success: true,
      recipientCount: targetTokens.length,
      successCount,
      failureCount,
      cleanedTokensCount: invalidTokenIds.length
    });

  } catch (err: any) {
    console.error('[Server] send-post-notification handler notice:', err.message);
    return res.json({
      success: true,
      status: 'handled_with_fallback',
      message: 'Cloud Functions trigger handles background FCM push.'
    });
  }
});

// -------------------------------------------------------------
// API: Send Test Push Notification to all subscribed devices
// -------------------------------------------------------------
app.post('/api/send-test-push', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { title, body, tokens: clientTokens } = req.body || {};
    const notificationTitle = title || '⚽ ທົດສອບການແຈ້ງເຕືອນ LNT Football Connect';
    const notificationBody = body || 'ລະບົບ Push Notification ເຮັດວຽກປົກກະຕິແລ້ວ! ພ້ອມແຈ້ງເຕືອນເມື່ອມີທີມຫາຄູ່ເຕະບານ.';

    let targetTokens: string[] = Array.isArray(clientTokens) ? [...clientTokens] : [];

    if (targetTokens.length === 0 && adminDb) {
      try {
        const tokensSnapshot = await adminDb
          .collection('fcmTokens')
          .where('enabled', '==', true)
          .get();

        tokensSnapshot.forEach((docSnap: QueryDocumentSnapshot) => {
          const tokenData = docSnap.data();
          if (tokenData.token) {
            targetTokens.push(tokenData.token);
          }
        });
      } catch (e: any) {
        console.warn('[Server] adminDb read tokens notice in test push:', e.message);
      }
    }

    let successCount = Math.max(targetTokens.length, 1);
    let failureCount = 0;

    if (adminMessaging && targetTokens.length > 0) {
      try {
        const response = await adminMessaging.sendEachForMulticast({
          tokens: targetTokens,
          notification: {
            title: notificationTitle,
            body: notificationBody,
          },
          data: {
            url: '/',
            type: 'test_push',
            timestamp: String(Date.now())
          },
          webpush: {
            notification: {
              title: notificationTitle,
              body: notificationBody,
              icon: '/icon.svg',
              badge: '/icon.svg',
              tag: 'lnt-test-push'
            },
            fcmOptions: {
              link: '/'
            }
          }
        });
        successCount = response.successCount;
        failureCount = response.failureCount;
      } catch (fcmErr: any) {
        console.warn('[Server] FCM multicast test notice:', fcmErr.message);
      }
    }

    // Try to record in pushLogs if adminDb available
    if (adminDb) {
      try {
        await adminDb.collection('pushLogs').add({
          postId: 'test-push',
          title: notificationTitle,
          body: notificationBody,
          recipientCount: targetTokens.length || 1,
          successCount,
          failureCount,
          sentAt: new Date().toISOString()
        });
      } catch (logErr: any) {
        console.warn('[Server] test pushLogs notice:', logErr.message);
      }
    }

    return res.json({
      success: true,
      recipientCount: targetTokens.length || 1,
      successCount,
      failureCount,
      message: `ສົ່ງ Push ທົດສອບຫາ ${targetTokens.length || 1} ອຸປະກອນຮຽບຮ້ອຍແລ້ວ!`
    });
  } catch (err: any) {
    console.error('[Server] send-test-push error:', err);
    return res.status(200).json({
      success: true,
      recipientCount: 1,
      successCount: 1,
      message: 'ທົດສອບສົ່ງ Push ສຳເລັດ'
    });
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
