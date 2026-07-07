import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  OAuthProvider,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  orderBy,
  limit,
  Timestamp,
  getCountFromServer,
  onSnapshot,
  increment,
  writeBatch,
  where,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const trackVisitorWithGeo = async () => {
  const path = 'analytics/global';
  try {
    // Attempt to get geolocation info via public API
    let country = 'Unknown';
    try {
      const geoRes = await fetch('https://ipapi.co/json/');
      const geoData = await geoRes.json();
      if (geoData.country_name) country = geoData.country_name;
    } catch (e) {
      console.warn("Geo lookup failed", e);
    }

    const today = new Date().toISOString().split('T')[0];
    const statsRef = doc(db, 'analytics', 'global');
    
    await setDoc(statsRef, {
      totalVisitors: increment(1),
      [`dailyVisitors.${today}`]: increment(1),
      [`countries.${country}`]: increment(1),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (error: any) {
    console.error("Advanced visitor tracking failed", error);
  }
};

export const logPlatformError = async (message: string, stack?: string, componentName?: string) => {
  const path = 'platform_errors';
  try {
    const errorData = {
      message,
      stack: stack || 'No stack trace',
      componentName: componentName || 'Unknown',
      userId: auth.currentUser?.uid || 'anonymous',
      userEmail: auth.currentUser?.email || 'anonymous',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: serverTimestamp(),
      resolved: false
    };
    await addDoc(collection(db, path), errorData);
  } catch (error) {
    console.error("Failed to log platform error:", error);
  }
};

export const trackSessionDuration = async (seconds: number) => {
  const path = 'analytics/global';
  try {
    const statsRef = doc(db, 'analytics', 'global');
    await updateDoc(statsRef, {
      totalSessionSeconds: increment(seconds),
      lastUpdated: serverTimestamp()
    });
    
    // Also track per-user if logged in
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        'stats.totalSessionSeconds': increment(seconds)
      });
    }
  } catch (error) {
    console.warn("Session tracking failed", error);
  }
};

export const trackVisitor = async () => {
  const path = 'analytics/global';
  try {
    const today = new Date().toISOString().split('T')[0];
    const statsRef = doc(db, path);
    await updateDoc(statsRef, {
      totalVisitors: increment(1),
      [`dailyVisitors.${today}`]: increment(1),
      lastUpdated: serverTimestamp()
    });
  } catch (error: any) {
    // If doc doesn't exist, create it (error code for missing doc is usually 404 or specific firestore error)
    try {
      const today = new Date().toISOString().split('T')[0];
      await setDoc(doc(db, path), {
        totalVisitors: 1,
        totalWatchTimeSeconds: 0,
        dailyVisitors: { [today]: 1 },
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } catch (e) {
       console.error("Visitor tracking failed", e);
    }
  }
};

export const trackWatchTime = async (seconds: number) => {
  const path = 'analytics/global';
  try {
    const statsRef = doc(db, path);
    await updateDoc(statsRef, {
      totalWatchTimeSeconds: increment(seconds),
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    console.warn("Watch time tracking failed", error);
  }
};

export const createSupportTicket = async (subject: string, message: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Authentication required");
  
  const path = 'supportTickets';
  try {
    const ticketData = {
      userId: user.uid,
      userName: user.displayName || 'Anonymous User',
      userEmail: user.email || '',
      subject,
      message,
      status: 'open',
      createdAt: serverTimestamp(),
      lastUpdate: serverTimestamp()
    };
    await addDoc(collection(db, path), ticketData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getSupportTickets = async () => {
  const path = 'supportTickets';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const replyToTicket = async (ticketId: string, text: string) => {
  const admin = auth.currentUser;
  if (!admin) throw new Error("Admin authentication required");

  const path = `supportTickets/${ticketId}/replies`;
  try {
    const batch = writeBatch(db);
    
    // Create reply
    const replyRef = doc(collection(db, path));
    batch.set(replyRef, {
      adminId: admin.uid,
      text,
      createdAt: serverTimestamp()
    });

    // Update ticket status
    const ticketRef = doc(db, 'supportTickets', ticketId);
    batch.update(ticketRef, {
      status: 'replied',
      lastUpdate: serverTimestamp()
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getGlobalStats = async () => {
  try {
    const snap = await getDoc(doc(db, 'analytics', 'global'));
    let globalData = snap.exists() ? snap.data() : { totalVisitors: 0, totalWatchTimeSeconds: 0, totalSearches: 0, mostSearchedQueries: [], dailyVisitors: {} };
    
    // Attempt to get accurate user count, but don't fail if permissions are missing
    let totalUsers = 0;
    try {
      const coll = collection(db, 'users');
      const snapshot = await getCountFromServer(coll);
      totalUsers = snapshot.data().count;
    } catch (e) {
      console.warn("Could not fetch user count for global stats (permissions?)");
    }

    const today = new Date().toISOString().split('T')[0];
    const todayVisitors = globalData.dailyVisitors?.[today] || 0;

    return {
      ...globalData,
      todayVisitors,
      totalUsers: totalUsers || globalData.totalUsers || 0
    };
  } catch (error) {
    console.error("Failed to fetch global stats", error);
    return null;
  }
};

export const getAdvancedUserStats = async () => {
  const path = 'users';
  try {
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * day);
    const thirtyDaysAgo = new Date(now - 30 * day);

    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const users = snap.docs.map(doc => doc.data());

    const stats = {
      total: users.length,
      last7Days: users.filter(u => (u.createdAt as Timestamp).toDate() > sevenDaysAgo).length,
      last30Days: users.filter(u => (u.createdAt as Timestamp).toDate() > thirtyDaysAgo).length,
      admins: users.filter(u => u.role === 'admin').length,
      banned: users.filter(u => u.isBanned).length
    };
    
    return stats;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    await saveUser(result.user);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.log("Login popup closed by user");
      return null;
    }
    console.error("Google Login Error", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error", error);
    throw error;
  }
};

export const saveUser = async (user: FirebaseUser, displayName?: string) => {
  const userRef = doc(db, 'users', user.uid);
  const path = `users/${user.uid}`;
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        name: displayName || user.displayName || 'User',
        username: user.email?.split('@')[0] || 'user_' + user.uid.substring(0, 5),
        email: user.email,
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        bio: '',
        role: 'user',
        isBanned: false,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        securityInfo: {
          identityVerified: true,
          securityScore: 100,
          platform: navigator.platform,
          browser: navigator.userAgent.split(' ')[0]
        }
      });
    } else {
      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
        'securityInfo.lastSession': serverTimestamp(),
        'securityInfo.platform': navigator.platform
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const updateProfile = async (data: { name?: string, photoURL?: string, bio?: string, username?: string, tasteProfile?: string[] }) => {
  if (!auth.currentUser) return;
  const userRef = doc(db, 'users', auth.currentUser.uid);
  try {
    await updateDoc(userRef, {
      ...data,
      lastLogin: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
  }
};

export const saveContinueWatching = async (item: import('../contexts/AuthContext').ContinueWatchingItem) => {
  if (!auth.currentUser) return;
  const docRef = doc(db, `users/${auth.currentUser.uid}/continueWatching`, item.id);
  try {
    await setDoc(docRef, {
      movieId: item.id,
      title: item.title,
      poster: item.poster || '',
      background: (item as any).background || '',
      avgHueDark: item.avgHueDark || '',
      type: item.type || 'Movie',
      lastPosition: item.progress || 0,
      duration: item.duration || 1,
      season: item.season || null,
      episode: item.episode || null,
      rating: item.rating || '',
      year: item.year || '',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser.uid}/continueWatching/${item.id}`);
  }
};

export const addWatchHistory = async (item: any) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/watchHistory`;
  try {
    const docRef = doc(collection(db, path), item.id);
    await setDoc(docRef, {
      movieId: item.id,
      title: item.title,
      type: item.type || 'Movie',
      poster: item.poster || '',
      year: item.year || '',
      rating: item.rating || '',
      watchedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const removeWatchHistory = async (movieId: string) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/watchHistory/${movieId}`;
  try {
    await deleteDoc(doc(db, `users/${auth.currentUser.uid}/watchHistory`, movieId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const clearWatchHistory = async () => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/watchHistory`;
  try {
    const q = query(collection(db, path));
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const removeContinueWatching = async (movieId: string) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/continueWatching/${movieId}`;
  try {
    await deleteDoc(doc(db, `users/${auth.currentUser.uid}/continueWatching`, movieId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const removeFavorite = async (movieId: string) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/favorites`;
  const q = query(collection(db, path), where("movieId", "==", movieId));
  try {
    const snap = await getDocs(q);
    snap.forEach(async (document) => {
      await deleteDoc(doc(db, path, document.id));
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const addFavorite = async (item: import('../types').MediaItem) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/favorites`;
  // Use the item id as the document id to prevent duplicates easily, or query first
  const q = query(collection(db, path), where("movieId", "==", item.id));
  try {
    const snap = await getDocs(q);
    if (!snap.empty) return; // already in favs
    
    await addDoc(collection(db, path), {
      movieId: item.id,
      title: item.title,
      poster: item.poster || '',
      type: item.type || 'Movie',
      rating: item.rating || '',
      year: item.year || '',
      addedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const sendChatMessage = async (text: string) => {
  if (!auth.currentUser) return;
  const path = 'globalChat';
  try {
    await addDoc(collection(db, path), {
      text,
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0],
      userAvatar: auth.currentUser.photoURL,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateLiveViewerCount = async (delta: number) => {
  const docRef = doc(db, 'liveStats', 'viewers');
  try {
    await setDoc(docRef, {
      count: increment(delta),
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    // Silently fail if rules restrict
  }
};

export const getPlatformErrors = async () => {
  const path = 'platform_errors';
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const resolvePlatformError = async (errorId: string) => {
  const path = `platform_errors/${errorId}`;
  try {
    await updateDoc(doc(db, 'platform_errors', errorId), {
      resolved: true,
      resolvedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const getUsers = async () => {
  const path = 'users';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const getUserCount = async () => {
  const path = 'users';
  try {
    const coll = collection(db, path);
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const getActiveUserCount = async () => {
  const path = 'users';
  try {
    // Active in last 24h
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const q = query(collection(db, path), orderBy('lastLogin', 'desc'));
    const snap = await getDocs(q);
    const active = snap.docs.filter(doc => doc.data().lastLogin.toDate() > dayAgo);
    return active.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const getTotalWatchCount = async () => {
  const path = 'analytics/global';
  try {
    const snap = await getDoc(doc(db, path));
    if (snap.exists()) {
      return snap.data().totalWatchTimeSeconds || 0;
    }
    return 0;
  } catch (error) {
    console.error("Failed to fetch total watch count", error);
    return 0;
  }
};

export const updateAdminConfig = async (configData: any) => {
  const path = 'admin/config';
  try {
    const configRef = doc(db, 'admin', 'config');
    // Recursively remove undefined values
    const cleanObject = (obj: any): any => {
      if (obj === null || obj === undefined) return null;
      if (typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(cleanObject);
      const result: any = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          result[key] = cleanObject(obj[key]);
        }
      }
      return result;
    };
    
    const cleanedData = cleanObject(configData);
    await setDoc(configRef, { ...cleanedData, lastUpdated: serverTimestamp() }, { merge: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      console.warn("Only verified admins can update config.");
    }
    throw error;
  }
};

export const submitContentReport = async (userId: string, category: string, detail: string) => {
  const path = 'reports';
  try {
    await addDoc(collection(db, path), {
      userId,
      category,
      detail,
      status: 'open',
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Failed to submit report", error);
    return false;
  }
};

export const getReports = async () => {
  const path = 'reports';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Failed to get reports", error);
    return [];
  }
};

export const resolveReport = async (reportId: string) => {
  const path = `reports/${reportId}`;
  try {
    const reportRef = doc(db, 'reports', reportId);
    await updateDoc(reportRef, { status: 'closed' });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteReport = async (reportId: string) => {
  const path = `reports/${reportId}`;
  try {
    const reportRef = doc(db, 'reports', reportId);
    await deleteDoc(reportRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const getAdminConfig = async () => {
  try {
    const configRef = doc(db, 'admin', 'config');
    const snap = await getDoc(configRef);
    if (snap.exists()) return snap.data();
    return null;
  } catch (error) {
    return null; // Silent catch, non-strict config
  }
};

export const updateBanStatus = async (uid: string, isBanned: boolean) => {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { isBanned });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const updateRole = async (uid: string, role: 'admin' | 'user') => {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { role });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const getWatchHistory = async (userId: string) => {
  const path = `users/${userId}/watchHistory`;
  try {
    const q = query(collection(db, path), orderBy('watchedAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const deleteUserProfileData = async (uid: string) => {
  const subcollections = ['favorites', 'continueWatching', 'watchHistory'];
  for (const sub of subcollections) {
    const path = `users/${uid}/${sub}`;
    try {
      const snap = await getDocs(collection(db, path));
      const promises = snap.docs.map(docSnapshot => deleteDoc(doc(db, path, docSnapshot.id)));
      await Promise.all(promises);
    } catch (error) {
      console.error(`Error deleting subcollection ${sub} for user ${uid}`, error);
    }
  }

  // Purge main user doc
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
};
