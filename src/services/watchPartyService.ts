import { db, auth } from '../lib/firebase';
import { 
  collection, doc, getDoc, setDoc, updateDoc, 
  onSnapshot, serverTimestamp, query, orderBy, 
  addDoc, deleteDoc, Timestamp, getDocs
} from 'firebase/firestore';
import { slugify } from '../types';

const generateAlphabeticId = (length = 6): string => {
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
};

export interface PartyParticipant {
  uid: string;
  displayName: string;
  photoURL?: string;
  isOnline: boolean;
  joinedAt: number;
  email?: string;
}

export interface PartyMessage {
  id?: string;
  uid: string;
  displayName: string;
  photoURL?: string;
  text: string;
  createdAt: number;
  email?: string;
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

  const cleanSlug = slugify(mediaTitle).replace(/[0-9]/g, '') || 'party';
  const partyId = `${cleanSlug}-party-${generateAlphabeticId(6)}`;
  const partyRef = doc(db, PARTIES_COLLECTION, partyId);
  
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
  return partyId;
};

export const joinWatchParty = async (partyId: string) => {
  if (!auth.currentUser) throw new Error("Must be logged in to join");
  
  let displayName = auth.currentUser.displayName || 'Anonymous';
  const email = auth.currentUser.email || '';
  
  if (email.toLowerCase() === 'greatmayuku2@gmail.com') {
    displayName = '×͜× 𝙿𝚛𝚘𝚋𝚊𝚋𝚕𝚢 𝙱𝚞𝚜𝚢 永';
  } else {
    try {
      const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userSnap.exists()) {
        const uData = userSnap.data();
        displayName = uData.username || uData.name || displayName;
      }
    } catch (e) {
      console.warn("Failed to fetch user nickname for watch party join", e);
    }
  }

  const participantRef = doc(db, PARTIES_COLLECTION, partyId, 'participants', auth.currentUser.uid);
  await setDoc(participantRef, {
    uid: auth.currentUser.uid,
    displayName,
    photoURL: auth.currentUser.photoURL || '',
    isOnline: true,
    joinedAt: Date.now(),
    email
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

  let displayName = auth.currentUser.displayName || 'Anonymous';
  const email = auth.currentUser.email || '';
  
  if (email.toLowerCase() === 'greatmayuku2@gmail.com') {
    displayName = '×͜× 𝙿𝚛𝚘𝚋𝚊𝚋𝚕𝚢 𝙱𝚞𝚜𝚢 永';
  } else {
    try {
      const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userSnap.exists()) {
        const uData = userSnap.data();
        displayName = uData.username || uData.name || displayName;
      }
    } catch (e) {
      console.warn("Failed to fetch user nickname for message send", e);
    }
  }

  const messagesRef = collection(db, PARTIES_COLLECTION, partyId, 'messages');
  await addDoc(messagesRef, {
    uid: auth.currentUser.uid,
    displayName,
    photoURL: auth.currentUser.photoURL || '',
    text: text.trim(),
    createdAt: Date.now(),
    email
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
