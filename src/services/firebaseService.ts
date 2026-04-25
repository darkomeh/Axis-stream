import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
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
  getCountFromServer
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
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    await saveUser(result.user);
    return result.user;
  } catch (error) {
    console.error("Login Error", error);
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
        email: user.email,
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
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
