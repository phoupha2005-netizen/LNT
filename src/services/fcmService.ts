import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { initializeApp, getApps } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { FcmToken } from '../types';

// Cryptographically valid NIST P-256 base64url Web Push VAPID public key
export const DEFAULT_VAPID_KEY = "BPfgwkQnlYtM_VsfD5501ZWCif3Aqlc_tmBo2CQ_50pXepmCR8j8B4RVeEtb7y-9HaY3hR2wxVMbPspsNIlqkwA";

// Convert base64url string to Uint8Array for PushManager
export function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Dynamically fetch VAPID key configured by Admin in Firestore settings/fcm_config
export async function getActiveVapidKey(): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'fcm_config'));
    if (snap.exists() && snap.data().vapidKey) {
      return snap.data().vapidKey.trim();
    }
  } catch (err) {
    console.warn('Could not read dynamic VAPID key, using default:', err);
  }
  return DEFAULT_VAPID_KEY;
}

// Save or update custom VAPID key in Firestore
export async function saveVapidKey(newKey: string): Promise<boolean> {
  try {
    await setDoc(doc(db, 'settings', 'fcm_config'), {
      vapidKey: newKey.trim(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to save VAPID key in Firestore:', err);
    return false;
  }
}

// Auto-initialize VAPID key in Firestore settings/fcm_config if not present
export async function ensureVapidKeyInitialized(): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'fcm_config'));
    if (!snap.exists() || !snap.data().vapidKey) {
      await setDoc(doc(db, 'settings', 'fcm_config'), {
        vapidKey: DEFAULT_VAPID_KEY,
        updatedAt: new Date().toISOString(),
        description: 'Auto-configured NIST P-256 Web Push VAPID key for LNT Football Connect'
      }, { merge: true });
      return DEFAULT_VAPID_KEY;
    }
    return snap.data().vapidKey.trim();
  } catch (err) {
    console.warn('Could not auto-initialize VAPID key in Firestore, using default:', err);
    return DEFAULT_VAPID_KEY;
  }
}

// Detect if running in standalone PWA mode (important for iOS Safari)
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// Detect operating system / platform
export function getDevicePlatform(): 'ios' | 'android' | 'desktop' | 'mobile' | 'pwa' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);

  if (isPWA()) return 'pwa';
  if (isIos) return 'ios';
  if (isAndroid) return 'android';
  if (/mobile/.test(ua)) return 'mobile';
  return 'desktop';
}

// Check if Push Notifications and Service Workers are supported
export async function isPushNotificationSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return false;
  }
  try {
    return await isSupported();
  } catch (e) {
    console.warn('FCM isSupported check failed:', e);
    return false;
  }
}

// Initialize FCM messaging instance safely
let messagingInstance: any = null;
export async function getFcmMessaging() {
  if (messagingInstance) return messagingInstance;
  const supported = await isPushNotificationSupported();
  if (!supported) return null;

  try {
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.warn('Failed to initialize Firebase Messaging:', err);
    return null;
  }
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    console.log('[FCM] Service Worker registered with scope:', registration.scope);
    return registration;
  } catch (err) {
    console.warn('[FCM] Service Worker registration failed:', err);
    return null;
  }
}

// Hash token string for Firestore document ID
function hashToken(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = (hash << 5) - hash + token.charCodeAt(i);
    hash |= 0;
  }
  return `token_${Math.abs(hash)}_${token.slice(-8)}`;
}

// Request Notification Permission and Get FCM Token
export async function requestPushPermission(
  userId: string,
  userEmail?: string,
  customVapidKey?: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { success: false, error: 'Browser ນີ້ບໍ່ຮອງຮັບ Push Notification' };
  }

  // iOS check
  const platform = getDevicePlatform();
  if (platform === 'ios' && !isPWA()) {
    console.warn('iOS Safari requires adding to Home Screen as PWA for Web Push');
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'ຜູ້ໃຊ້ບໍ່ໄດ້ອະນຸຍາດ (Permission denied)' };
    }

    const swReg = await registerServiceWorker();
    const messaging = await getFcmMessaging();

    if (!messaging || !swReg) {
      return { success: false, error: 'ບໍ່ສາມາດເຊື່ອມຕໍ່ Firebase Messaging Service Worker ໄດ້' };
    }

    const vapid = customVapidKey || (await getActiveVapidKey());
    let token = '';
    let subscriptionObj: any = undefined;

    // 1. Subscribe to Native Web Push via PushManager (standard RFC 8292 for background lock-screen wake)
    try {
      if ('pushManager' in swReg) {
        let existingSub = await swReg.pushManager.getSubscription();
        if (!existingSub) {
          const appServerKey = urlB64ToUint8Array(vapid);
          existingSub = await swReg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: appServerKey as any
          });
        }
        if (existingSub) {
          subscriptionObj = existingSub.toJSON();
          console.log('[WebPush] Native push subscription acquired:', existingSub.endpoint);
        }
      }
    } catch (subErr: any) {
      console.warn('[WebPush] PushManager subscribe notice:', subErr.message);
    }

    // 2. Obtain Firebase Messaging FCM token
    try {
      token = await getToken(messaging, {
        serviceWorkerRegistration: swReg,
        ...(vapid ? { vapidKey: vapid } : {})
      });
      console.log('[FCM] Token acquired:', token?.slice(0, 20) + '...');
    } catch (tokenErr: any) {
      console.warn('[FCM] getToken notice:', tokenErr.message);
      // If getToken fails, fallback to endpoint hash or unique device ID
      token = subscriptionObj?.endpoint || `web_token_${userId.slice(0, 8)}_${Date.now()}`;
    }

    if (!token && !subscriptionObj) {
      return { success: false, error: 'ບໍ່ສາມາດດຶງ FCM Token ຫຼື Web Push Subscription ໄດ້' };
    }

    // 3. Save token & subscription in Firestore collection `fcmTokens`
    const docId = hashToken(token || subscriptionObj?.endpoint || userId);
    const tokenDocRef = doc(db, 'fcmTokens', docId);

    const fcmData: FcmToken = {
      token,
      subscription: subscriptionObj,
      userId,
      userEmail: userEmail || '',
      deviceType: platform,
      userAgent: navigator.userAgent.slice(0, 200),
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(tokenDocRef, fcmData, { merge: true });
    localStorage.setItem('lnt_fcm_token', token);
    localStorage.setItem('lnt_fcm_enabled', 'true');

    return { success: true, token };
  } catch (err: any) {
    console.error('Error requesting push permission:', err);
    return { success: false, error: err.message || 'ເກີດຂໍ້ຜິດພາດໃນການຂໍສິດ Push Notification' };
  }
}

// Toggle Push Notification Preference
export async function togglePushNotificationPreference(
  userId: string,
  enable: boolean
): Promise<boolean> {
  try {
    const localToken = localStorage.getItem('lnt_fcm_token');
    if (localToken) {
      const docId = hashToken(localToken);
      const tokenRef = doc(db, 'fcmTokens', docId);
      await updateDoc(tokenRef, {
        enabled: enable,
        updatedAt: new Date().toISOString()
      });
    }

    // Also update all tokens for this user
    const q = query(collection(db, 'fcmTokens'), where('userId', '==', userId));
    const snap = await getDocs(q);
    snap.forEach(async (d) => {
      await updateDoc(d.ref, {
        enabled: enable,
        updatedAt: new Date().toISOString()
      });
    });

    localStorage.setItem('lnt_fcm_enabled', enable ? 'true' : 'false');
    return true;
  } catch (err) {
    console.error('Failed to toggle notification preference:', err);
    return false;
  }
}

// Check current user notification status
export async function getPushNotificationStatus(userId?: string): Promise<{
  supported: boolean;
  permission: NotificationPermission;
  enabled: boolean;
}> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, permission: 'denied', enabled: false };
  }

  const supported = await isPushNotificationSupported();
  const permission = Notification.permission;
  const localEnabled = localStorage.getItem('lnt_fcm_enabled') !== 'false' && permission === 'granted';

  return {
    supported,
    permission,
    enabled: localEnabled
  };
}

// Listen to Foreground Messages when app is currently open
export async function setupForegroundMessageListener(
  onNotificationReceived: (payload: { title: string; body: string; postId?: string; data?: any }) => void
) {
  const messaging = await getFcmMessaging();
  if (!messaging) return () => {};

  try {
    return onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message received:', payload);
      const title = payload.notification?.title || payload.data?.title || 'LNT Football Connect';
      const body = payload.notification?.body || payload.data?.body || 'ມີໂພສຫາຄູ່ເຕະບານໃໝ່!';
      const postId = payload.data?.postId;

      onNotificationReceived({
        title,
        body,
        postId,
        data: payload.data
      });
    });
  } catch (e) {
    console.warn('Failed to attach foreground message listener:', e);
    return () => {};
  }
}
