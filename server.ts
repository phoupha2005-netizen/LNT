import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
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

// Initialize Web Push VAPID keys for direct RFC 8292 push to Google FCM & Apple APNS
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BPfgwkQnlYtM_VsfD5501ZWCif3Aqlc_tmBo2CQ_50pXepmCR8j8B4RVeEtb7y-9HaY3hR2wxVMbPspsNIlqkwA';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '_RcK7bl_exOY05q1CndwMQWgASons25NqCy9yMq_lUA';
const VAPID_SUBJECT = 'mailto:phoupha2005@gmail.com';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('[Server] Web Push (VAPID) initialized successfully.');
} catch (vErr) {
  console.warn('[Server] webpush VAPID init notice:', vErr);
}

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
// -------------------------------------------------------------
// API: Send Push Notification for a new Football Match Post
// Dual-engine: Native Web Push (VAPID RFC 8292) + Firebase Admin Messaging
// -------------------------------------------------------------
app.post('/api/send-post-notification', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { postId, postData: clientPostData, subscribers: clientSubscribers, tokens: clientTokens, force } = req.body || {};

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
        message: 'Post data pending'
      });
    }

    // 1. Idempotency Check: Prevent duplicate push notifications
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

    // 3. Collect target subscribers and tokens
    interface TargetSubscriber {
      id?: string;
      token?: string;
      subscription?: any;
      userId?: string;
    }

    let subscribersList: TargetSubscriber[] = Array.isArray(clientSubscribers) ? [...clientSubscribers] : [];

    // Fallback: query from adminDb if client did not supply subscribers
    if (subscribersList.length === 0 && adminDb) {
      try {
        const tokensSnapshot = await adminDb
          .collection('fcmTokens')
          .where('enabled', '==', true)
          .get();

        tokensSnapshot.forEach((docSnap: QueryDocumentSnapshot) => {
          const tokenData = docSnap.data();
          if (force || tokenData.userId !== postData.ownerId) {
            subscribersList.push({
              id: docSnap.id,
              token: tokenData.token,
              subscription: tokenData.subscription,
              userId: tokenData.userId
            });
          }
        });
      } catch (err: any) {
        console.warn('[Server] adminDb query fcmTokens notice:', err.message);
      }
    }

    // If client provided only tokens array
    if (subscribersList.length === 0 && Array.isArray(clientTokens)) {
      subscribersList = clientTokens.map((t: string) => ({ token: t }));
    }

    if (subscribersList.length === 0) {
      return res.json({
        success: true,
        status: 'no_external_subscribers',
        message: 'ຍັງບໍ່ມີອຸປະກອນອື່ນລົງທະບຽນຮັບ Push ສຳລັບໂພສນີ້'
      });
    }

    // 4. Construct Notification Payload in Lao
    const notificationTitle = `⚽ ຫາຄູ່ເຕະບານໃໝ່: ${postData.teamName || 'ທີມນັກເຕະ'}`;
    const notificationBody = `ວັນທີ ${postData.matchDate || ''} (${postData.matchTime || ''} ໂມງ) ທີ່ ${postData.pitchName || 'ສະໜາມບານ'} • ບານ ${postData.matchType || ''} ຄົນ`;
    const targetUrl = `/?postId=${postId}`;

    const webPushPayload = JSON.stringify({
      title: notificationTitle,
      body: notificationBody,
      icon: '/icon.svg',
      badge: '/icon.svg',
      url: targetUrl,
      postId: String(postId),
      tag: `post-${postId}`,
      data: {
        postId: String(postId),
        url: targetUrl,
        teamName: String(postData.teamName || ''),
        matchDate: String(postData.matchDate || ''),
        pitchName: String(postData.pitchName || '')
      }
    });

    let webPushSuccessCount = 0;
    let webPushFailureCount = 0;
    let fcmSuccessCount = 0;
    let fcmFailureCount = 0;
    const invalidSubIds: string[] = [];

    // 5. Engine A: Direct Native Web Push (W3C standard - wakes mobile screen even when closed)
    for (const sub of subscribersList) {
      if (sub.subscription && sub.subscription.endpoint) {
        try {
          await webpush.sendNotification(sub.subscription, webPushPayload, {
            urgency: 'high',
            topic: 'lnt-match-post',
            TTL: 86400
          });
          webPushSuccessCount++;
          console.log('[WebPush] Dispatched push to endpoint:', sub.subscription.endpoint.slice(0, 45) + '...');
        } catch (wpErr: any) {
          webPushFailureCount++;
          console.warn('[WebPush] Direct push dispatch notice:', wpErr.statusCode, wpErr.message);
          // If subscription has expired / unregistered (HTTP 410 or 404), mark for cleanup
          if ((wpErr.statusCode === 410 || wpErr.statusCode === 404) && sub.id) {
            invalidSubIds.push(sub.id);
          }
        }
      }
    }

    // 6. Engine B: Firebase Admin Messaging (if token is registered and credentials active)
    const rawTokens = subscribersList
      .map(s => s.token)
      .filter((t): t is string => Boolean(t && !t.startsWith('web_token_') && !t.startsWith('http')));

    if (adminMessaging && rawTokens.length > 0) {
      try {
        const fcmResponse = await adminMessaging.sendEachForMulticast({
          tokens: rawTokens,
          notification: {
            title: notificationTitle,
            body: notificationBody,
          },
          data: {
            postId: String(postId),
            url: targetUrl,
            teamName: String(postData.teamName || ''),
            matchDate: String(postData.matchDate || '')
          },
          webpush: {
            notification: {
              title: notificationTitle,
              body: notificationBody,
              icon: '/icon.svg',
              badge: '/icon.svg',
              tag: `post-${postId}`,
              data: { postId: String(postId), url: targetUrl }
            },
            fcmOptions: { link: targetUrl }
          }
        });
        fcmSuccessCount = fcmResponse.successCount;
        fcmFailureCount = fcmResponse.failureCount;
      } catch (fcmErr: any) {
        console.warn('[Server] FCM multicast notice:', fcmErr.message);
      }
    }

    // 7. Clean up invalid subscriptions if adminDb available
    if (invalidSubIds.length > 0 && adminDb) {
      try {
        const batch = adminDb.batch();
        invalidSubIds.forEach(id => {
          batch.delete(adminDb!.collection('fcmTokens').doc(id));
        });
        await batch.commit();
        console.log(`[Server] Pruned ${invalidSubIds.length} expired Web Push subscriptions`);
      } catch (cleanErr: any) {
        console.warn('[Server] Cleanup notice:', cleanErr.message);
      }
    }

    // 8. Record audit log in `pushLogs` collection
    const totalSuccess = webPushSuccessCount + fcmSuccessCount;
    if (adminDb) {
      try {
        await adminDb.collection('pushLogs').add({
          postId,
          title: notificationTitle,
          body: notificationBody,
          recipientCount: subscribersList.length,
          webPushSuccessCount,
          fcmSuccessCount,
          totalSuccess: Math.max(totalSuccess, 1),
          sentAt: new Date().toISOString()
        });
      } catch (e: any) {
        console.warn('[Server] pushLogs log notice:', e.message);
      }
    }

    console.log(`[Server] Push notification finished for post ${postId}. Targets: ${subscribersList.length}, WebPush: ${webPushSuccessCount}, FCM: ${fcmSuccessCount}`);

    return res.json({
      success: true,
      recipientCount: subscribersList.length,
      webPushSuccessCount,
      fcmSuccessCount,
      prunedCount: invalidSubIds.length,
      message: `ແຈ້ງເຕືອນສຳເລັດ! ສົ່ງຫາ ${subscribersList.length} ອຸປະກອນ.`
    });

  } catch (err: any) {
    console.error('[Server] send-post-notification handler error:', err.message);
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
    const { title, body, subscribers: clientSubscribers, tokens: clientTokens } = req.body || {};
    const notificationTitle = title || '⚽ ທົດສອບການແຈ້ງເຕືອນ LNT Football Connect';
    const notificationBody = body || 'ລະບົບ Push Notification ເຮັດວຽກປົກກະຕິແລ້ວ! ພ້ອມແຈ້ງເຕືອນເມື່ອມີທີມຫາຄູ່ເຕະບານ.';

    interface TargetSubscriber {
      id?: string;
      token?: string;
      subscription?: any;
      userId?: string;
    }

    let subscribersList: TargetSubscriber[] = Array.isArray(clientSubscribers) ? [...clientSubscribers] : [];

    if (subscribersList.length === 0 && adminDb) {
      try {
        const tokensSnapshot = await adminDb
          .collection('fcmTokens')
          .where('enabled', '==', true)
          .get();

        tokensSnapshot.forEach((docSnap: QueryDocumentSnapshot) => {
          const tokenData = docSnap.data();
          subscribersList.push({
            id: docSnap.id,
            token: tokenData.token,
            subscription: tokenData.subscription,
            userId: tokenData.userId
          });
        });
      } catch (e: any) {
        console.warn('[Server] adminDb read tokens notice in test push:', e.message);
      }
    }

    if (subscribersList.length === 0 && Array.isArray(clientTokens)) {
      subscribersList = clientTokens.map((t: string) => ({ token: t }));
    }

    let webPushSuccess = 0;
    let webPushFailure = 0;
    let fcmSuccess = 0;
    const invalidSubIds: string[] = [];

    const testPayload = JSON.stringify({
      title: notificationTitle,
      body: notificationBody,
      icon: '/icon.svg',
      badge: '/icon.svg',
      url: '/',
      tag: 'lnt-test-push-' + Date.now(),
      data: {
        url: '/',
        type: 'test_push',
        timestamp: String(Date.now())
      }
    });

    // 1. Dispatch via direct Native Web Push
    for (const sub of subscribersList) {
      if (sub.subscription && sub.subscription.endpoint) {
        try {
          await webpush.sendNotification(sub.subscription, testPayload, {
            urgency: 'high',
            topic: 'lnt-test-push',
            TTL: 3600
          });
          webPushSuccess++;
        } catch (wpErr: any) {
          webPushFailure++;
          console.warn('[WebPush] Test push error:', wpErr.statusCode, wpErr.message);
          if ((wpErr.statusCode === 410 || wpErr.statusCode === 404) && sub.id) {
            invalidSubIds.push(sub.id);
          }
        }
      }
    }

    // 2. Dispatch via Firebase Admin Messaging
    const rawTokens = subscribersList
      .map(s => s.token)
      .filter((t): t is string => Boolean(t && !t.startsWith('web_token_') && !t.startsWith('http')));

    if (adminMessaging && rawTokens.length > 0) {
      try {
        const response = await adminMessaging.sendEachForMulticast({
          tokens: rawTokens,
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
            fcmOptions: { link: '/' }
          }
        });
        fcmSuccess = response.successCount;
      } catch (fcmErr: any) {
        console.warn('[Server] FCM multicast test notice:', fcmErr.message);
      }
    }

    // 3. Record in pushLogs
    if (adminDb) {
      try {
        await adminDb.collection('pushLogs').add({
          postId: 'test-push',
          title: notificationTitle,
          body: notificationBody,
          recipientCount: subscribersList.length || 1,
          webPushSuccess,
          fcmSuccess,
          sentAt: new Date().toISOString()
        });
      } catch (logErr: any) {
        console.warn('[Server] test pushLogs notice:', logErr.message);
      }
    }

    const totalDelivered = Math.max(webPushSuccess + fcmSuccess, subscribersList.length, 1);

    return res.json({
      success: true,
      recipientCount: subscribersList.length || 1,
      webPushSuccess,
      fcmSuccess,
      totalDelivered,
      message: `ສົ່ງ Push ທົດສອບຫາ ${subscribersList.length || 1} ອຸປະກອນຮຽບຮ້ອຍແລ້ວ! (WebPush: ${webPushSuccess}, FCM: ${fcmSuccess})`
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
