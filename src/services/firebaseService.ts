import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  OAuthProvider,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
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
  writeBatch
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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Password reset error", error);
    throw error;
  }
};

export const trackVisitor = async () => {
  const path = 'analytics/global';
  try {
    const statsRef = doc(db, path);
    await updateDoc(statsRef, {
      totalVisitors: increment(1),
      lastUpdated: serverTimestamp()
    });
  } catch (error: any) {
    // If doc doesn't exist, create it (error code for missing doc is usually 404 or specific firestore error)
    try {
      await setDoc(doc(db, path), {
        totalVisitors: 1,
        totalWatchTimeSeconds: 0,
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
    return snap.exists() ? snap.data() : null;
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
  } catch (error) {
    console.error("Google Login Error", error);
    throw error;
  }
};

export const signupWithEmail = async (email: string, pass: string, name: string) => {
  if (!/^[a-zA-Z][a-zA-Z0-9._]*@gmail\.com$/i.test(email)) {
    throw new Error("Only valid Gmail addresses are allowed.");
  }
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await saveUser(result.user, name);
    return result.user;
  } catch (error) {
    console.error("Signup Error", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  if (!/^[a-zA-Z][a-zA-Z0-9._]*@gmail\.com$/i.test(email)) {
    throw new Error("Only valid Gmail addresses are allowed.");
  }
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    await saveUser(result.user);
    return result.user;
  } catch (error) {
    console.error("Login Error", error);
    throw error;
  }
};

export const sendMagicLink = async (email: string) => {
  if (!/^[a-zA-Z][a-zA-Z0-9._]*@gmail\.com$/i.test(email)) {
    throw new Error("Only valid Gmail addresses are allowed.");
  }
  try {
    const actionCodeSettings = {
      url: window.location.href, // Redirects back to the current setup
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
  } catch (error) {
    console.error("Error sending magic link", error);
    throw error;
  }
};

export const completeMagicLinkSignIn = async (url: string) => {
  try {
    if (isSignInWithEmailLink(auth, url)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      if (email) {
        const result = await signInWithEmailLink(auth, email, url);
        window.localStorage.removeItem('emailForSignIn');
        await saveUser(result.user);
        return result.user;
      }
    }
  } catch (error) {
    console.error("Error completing magic link sign-in", error);
    throw error;
  }
  return null;
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
      });
    } else {
      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const updateProfile = async (data: { name?: string, photoURL?: string, bio?: string, username?: string }) => {
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

export const saveContinueWatching = async (movieId: string, title: string, lastPosition: number, duration: number) => {
  if (!auth.currentUser) return;
  const docRef = doc(db, `users/${auth.currentUser.uid}/continueWatching`, movieId);
  try {
    await setDoc(docRef, {
      movieId,
      title,
      lastPosition,
      duration,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser.uid}/continueWatching/${movieId}`);
  }
};

export const addWatchHistory = async (movieId: string, title: string) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/watchHistory`;
  try {
    await addDoc(collection(db, path), {
      movieId,
      title,
      watchedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const addFavorite = async (movieId: string, title: string) => {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/favorites`;
  try {
    await addDoc(collection(db, path), {
      movieId,
      title,
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
