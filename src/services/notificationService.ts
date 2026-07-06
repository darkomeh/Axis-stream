import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot, orderBy, limit, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppNotification } from '../pages/NotificationCenter';
import { handleFirestoreError, OperationType } from './firebaseService';

const NOTIFICATIONS_COLLECTION = 'notifications';
const BROADCAST_COLLECTION = 'broadcast_notifications';

// Generate a local ID since we need it in the UI before it might be saved
export const generateId = () => Math.random().toString(36).substring(2, 15);

export const subscribeToNotifications = (userId: string, callback: (notifications: AppNotification[]) => void) => {
  if (!userId) return () => {};

  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(100)
  );

  return onSnapshot(q, (snapshot) => {
    const notifs: AppNotification[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      notifs.push({
        id: doc.id,
        type: data.type,
        title: data.title,
        subtitle: data.subtitle,
        timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : (data.timestamp || Date.now()),
        read: data.read || false,
        pinned: data.pinned || false,
        archived: data.archived || false,
        posterUrl: data.posterUrl,
        actionUrl: data.actionUrl,
        priority: data.priority || 'normal',
      });
    });
    callback(notifs);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, NOTIFICATIONS_COLLECTION);
  });
};

export const markAsRead = async (notificationId: string) => {
  const path = `${NOTIFICATIONS_COLLECTION}/${notificationId}`;
  try {
    const notifRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notifRef, { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const markMultipleAsRead = async (notificationIds: string[]) => {
  try {
    const batch = writeBatch(db);
    notificationIds.forEach(id => {
      const notifRef = doc(db, NOTIFICATIONS_COLLECTION, id);
      batch.update(notifRef, { read: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, NOTIFICATIONS_COLLECTION);
  }
};

export const markAllAsRead = async (userId: string) => {
  try {
    const q = query(collection(db, NOTIFICATIONS_COLLECTION), where('userId', '==', userId), where('read', '==', false));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.update(docSnap.ref, { read: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, NOTIFICATIONS_COLLECTION);
  }
};

export const togglePin = async (notificationId: string, pinned: boolean) => {
  const path = `${NOTIFICATIONS_COLLECTION}/${notificationId}`;
  try {
    const notifRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notifRef, { pinned });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteNotification = async (notificationId: string) => {
  const path = `${NOTIFICATIONS_COLLECTION}/${notificationId}`;
  try {
    const notifRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await deleteDoc(notifRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const deleteMultipleNotifications = async (notificationIds: string[]) => {
  try {
    const batch = writeBatch(db);
    notificationIds.forEach(id => {
      const notifRef = doc(db, NOTIFICATIONS_COLLECTION, id);
      batch.delete(notifRef);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, NOTIFICATIONS_COLLECTION);
  }
};

export const clearAllUnpinned = async (userId: string) => {
  try {
    const q = query(collection(db, NOTIFICATIONS_COLLECTION), where('userId', '==', userId), where('pinned', '==', false));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, NOTIFICATIONS_COLLECTION);
  }
};

export const sendNotificationToUser = async (userId: string, notification: Omit<AppNotification, 'id' | 'read' | 'pinned' | 'archived' | 'timestamp'>) => {
  try {
    const dataToSave: any = {
      userId,
      read: false,
      pinned: false,
      archived: false,
      timestamp: Date.now(),
      type: notification.type,
      title: notification.title,
      subtitle: notification.subtitle,
      priority: notification.priority || 'normal',
    };

    if (notification.posterUrl !== undefined && notification.posterUrl !== '') {
      dataToSave.posterUrl = notification.posterUrl;
    }
    if (notification.actionUrl !== undefined && notification.actionUrl !== '') {
      dataToSave.actionUrl = notification.actionUrl;
    }

    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), dataToSave);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, NOTIFICATIONS_COLLECTION);
  }
};

export const broadcastNotification = async (notification: Omit<AppNotification, 'id' | 'read' | 'pinned' | 'archived' | 'timestamp'>) => {
  try {
    const dataToSave: any = {
      timestamp: Date.now(),
      type: notification.type,
      title: notification.title,
      subtitle: notification.subtitle,
      priority: notification.priority || 'normal',
    };

    if (notification.posterUrl !== undefined && notification.posterUrl !== '') {
      dataToSave.posterUrl = notification.posterUrl;
    }
    if (notification.actionUrl !== undefined && notification.actionUrl !== '') {
      dataToSave.actionUrl = notification.actionUrl;
    }

    // 1. Add to global broadcast collection
    const broadcastRef = await addDoc(collection(db, BROADCAST_COLLECTION), dataToSave);
    
    // For a real app, a Cloud Function would trigger on the above insertion to fan-out
    // Here we assume fan-out is done manually by the caller
    return broadcastRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, BROADCAST_COLLECTION);
  }
};
