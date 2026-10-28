const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Cloud Function Trigger:
 * Executes whenever a new match post document is created in Firestore `posts/{postId}`
 */
exports.sendNewPostNotification = onDocumentCreated(
  {
    document: "posts/{postId}",
    region: "asia-east1" // Closest region
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("No data associated with the event");
      return;
    }

    const postData = snapshot.data();
    const postId = event.params.postId;

    // Idempotency: skip if already sent
    if (postData.pushNotified === true) {
      logger.info(`Post ${postId} already notified, skipping.`);
      return;
    }

    try {
      const db = admin.firestore();

      // Mark post as notified immediately to avoid re-triggering
      await snapshot.ref.update({
        pushNotified: true,
        pushNotifiedAt: new Date().toISOString()
      });

      // Query enabled FCM device tokens
      const tokensSnap = await db
        .collection("fcmTokens")
        .where("enabled", "==", true)
        .get();

      if (tokensSnap.empty) {
        logger.info("No active FCM tokens found in fcmTokens collection.");
        return;
      }

      const targetTokens = [];
      const tokenDocIds = [];

      tokensSnap.forEach((doc) => {
        const d = doc.data();
        // Do not notify the person who posted the match
        if (d.userId !== postData.ownerId && d.token) {
          targetTokens.push(d.token);
          tokenDocIds.push(doc.id);
        }
      });

      if (targetTokens.length === 0) {
        logger.info("No external subscribers to notify.");
        return;
      }

      const title = `⚽ ຫາຄູ່ເຕະບານໃໝ່: ${postData.teamName}`;
      const body = `ວັນທີ ${postData.matchDate} (${postData.matchTime} ໂມງ) ທີ່ ${postData.pitchName} • ບານ ${postData.matchType} ຄົນ (${postData.skillLevel})`;
      const targetUrl = `/?postId=${postId}`;

      const response = await admin.messaging().sendEachForMulticast({
        tokens: targetTokens,
        notification: {
          title,
          body
        },
        data: {
          postId: String(postId),
          url: targetUrl
        },
        webpush: {
          notification: {
            title,
            body,
            icon: "/icon.svg",
            badge: "/icon.svg",
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

      logger.info(
        `Dispatched notifications for post ${postId}. Success: ${response.successCount}, Failure: ${response.failureCount}`
      );

      // Clean up invalid or expired tokens
      const deadTokenIds = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code;
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token"
          ) {
            deadTokenIds.push(tokenDocIds[idx]);
          }
        }
      });

      if (deadTokenIds.length > 0) {
        const batch = db.batch();
        deadTokenIds.forEach((id) => {
          batch.delete(db.collection("fcmTokens").doc(id));
        });
        await batch.commit();
        logger.info(`Removed ${deadTokenIds.length} invalid tokens.`);
      }

      // Record audit log
      await db.collection("pushLogs").add({
        postId,
        title,
        body,
        recipientCount: targetTokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
        sentAt: new Date().toISOString()
      });

    } catch (error) {
      logger.error("Error sending push notifications:", error);
    }
  }
);
