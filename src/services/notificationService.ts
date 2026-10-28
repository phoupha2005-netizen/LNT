import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AppNotification } from '../types';

export async function sendAppNotification({
  recipientId,
  senderId,
  senderName,
  title,
  message,
  link,
  type
}: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) {
  if (!recipientId || recipientId === senderId) return; // Don't notify self

  try {
    const colRef = collection(db, 'notifications');
    await addDoc(colRef, {
      recipientId,
      senderId: senderId || '',
      senderName: senderName || '',
      title,
      message,
      link: link || '',
      type,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Failed to send in-app notification:', error);
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}
