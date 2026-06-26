import { db, auth } from '../lib/firebase';
import { 
  collection, doc, getDoc, setDoc, updateDoc, 
  onSnapshot, serverTimestamp, query, orderBy, 
  addDoc, deleteDoc, Timestamp, getDocs
} from 'firebase/firestore';

export interface PartyParticipant {
  uid: string;
  displayName: string;
  photoURL?: string;
  isOnline: boolean;
  joinedAt: number;
}

export interface PartyMessage {
  id?: string;
  uid: string;
  displayName: string;
  photoURL?: string;
  text: string;
  createdAt: number;
}

export interface WatchParty {
  id: string;
  hostId: string;
  mediaId: string;
  mediaType: string;
  mediaTitle: string;
  posterUrl: string;
  playbackState: {
    status: 'PAUSED' | 'PLAYING';
    position: number;
    updatedAt: number;
  };
  createdAt: number;
}

const PARTIES_COLLECTION = 'watchParties';

export const createWatchParty = async (
  mediaId: string, 
  mediaType: string, 
  mediaTitle: string, 
  posterUrl: string
): Promise<string> => {
  if (!auth.currentUser) throw new Error("Must be logged in to create a party");

  const partyRef = doc(collection(db, PARTIES_COLLECTION));
  const newParty: Omit<WatchParty, 'id'> = {
    hostId: auth.currentUser.uid,
    mediaId,
    mediaType,
    mediaTitle,
    posterUrl,
    playbackState: {
      status: 'PAUSED',
      position: 0,
      updatedAt: Date.now()
    },
    createdAt: Date.now()
  };

  await setDoc(partyRef, newParty);
  return partyRef.id;
};

export const joinWatchParty = async (partyId: string) => {
  if (!auth.currentUser) throw new Error("Must be logged in to join");
  
  const participantRef = doc(db, PARTIES_COLLECTION, partyId, 'participants', auth.currentUser.uid);
  await setDoc(participantRef, {
    uid: auth.currentUser.uid,
    displayName: auth.currentUser.displayName || 'Anonymous',
    photoURL: auth.currentUser.photoURL || '',
    isOnline: true,
    joinedAt: Date.now()
  }, { merge: true });
};

export const leaveWatchParty = async (partyId: string) => {
  if (!auth.currentUser) return;
  const participantRef = doc(db, PARTIES_COLLECTION, partyId, 'participants', auth.currentUser.uid);
  try {
    await updateDoc(participantRef, {
      isOnline: false
    });
  } catch (err) {
    // Participant might not exist or already deleted, safe to ignore on leave.
  }
};

export const updatePlaybackState = async (
  partyId: string, 
  state: { status: 'PAUSED' | 'PLAYING'; position: number }
) => {
  const partyRef = doc(db, PARTIES_COLLECTION, partyId);
  await updateDoc(partyRef, {
    playbackState: {
      ...state,
      updatedAt: Date.now()
    }
  });
};

export const sendPartyMessage = async (partyId: string, text: string) => {
  if (!auth.currentUser) throw new Error("Not logged in");
  if (!text.trim()) return;

  const messagesRef = collection(db, PARTIES_COLLECTION, partyId, 'messages');
  await addDoc(messagesRef, {
    uid: auth.currentUser.uid,
    displayName: auth.currentUser.displayName || 'Anonymous',
    photoURL: auth.currentUser.photoURL || '',
    text: text.trim(),
    createdAt: Date.now()
  });
};

export const listenToParty = (partyId: string, callback: (party: WatchParty | null) => void) => {
  const partyRef = doc(db, PARTIES_COLLECTION, partyId);
  return onSnapshot(partyRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as WatchParty);
    } else {
      callback(null);
    }
  });
};

export const listenToParticipants = (partyId: string, callback: (participants: PartyParticipant[]) => void) => {
  const participantsRef = collection(db, PARTIES_COLLECTION, partyId, 'participants');
  return onSnapshot(participantsRef, (snapshot) => {
    const participants: PartyParticipant[] = [];
    snapshot.forEach((doc) => {
      participants.push(doc.data() as PartyParticipant);
    });
    // Filter out offline users or keep them to show "offline" state
    callback(participants.filter(p => p.isOnline));
  });
};

export const listenToMessages = (partyId: string, callback: (messages: PartyMessage[]) => void) => {
  const messagesRef = collection(db, PARTIES_COLLECTION, partyId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const messages: PartyMessage[] = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() } as PartyMessage);
    });
    callback(messages);
  });
};
