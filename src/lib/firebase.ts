import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { LoggedWorkout } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Provider Config with Calendar Scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar');

// Keep token in memory
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize auth session
export const initAuth = (
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else {
        // If we have a user but no cached token, we can show login or try to silent-auth. 
        // We will default to needing login to acquire the calendar token securely.
        onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure();
    }
  });
};

// Login user
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso para Google Calendar.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Error de autenticación Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Access Token Getter
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Sync to Google Calendar
export interface CalendarEventPayload {
  summary: string;
  description: string;
  date: string; // YYYY-MM-DD
}

export const syncToGoogleCalendar = async (
  accessToken: string,
  payload: CalendarEventPayload
): Promise<boolean> => {
  try {
    // Generate start & end times based on the date (let's say 7:00 AM to 8:30 AM which is Gaston's workout time)
    const startTimeStr = `${payload.date}T07:00:00`;
    const endTimeStr = `${payload.date}T08:30:00`;
    
    // Attempt to discover local or use direct dates
    const event = {
      summary: payload.summary,
      description: payload.description,
      start: {
        dateTime: startTimeStr,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima'
      },
      end: {
        dateTime: endTimeStr,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima'
      },
      colorId: '5' // Yellow/Banana color for highlights!
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Error Google Calendar Response:', errText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error de conexión con Google Calendar:', error);
    return false;
  }
};

// Firestore logs persistence
export interface DbActivityLog {
  id?: string;
  userId: string;
  date: string;
  dayType: 'gym' | 'run' | 'rest';
  focusName: string;
  completedExercises: string[];
  rating: number; // Motivation Score 1-10
  notes: string;
  syncedToCalendar: boolean;
  createdAt?: any;
}

// Function to handle database errors
function handleFirestoreError(error: unknown, operationType: string, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email
    },
    operationType,
    path
  };
  console.error('Firestore Database error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const addActivityLogDb = async (log: Omit<DbActivityLog, 'userId' | 'createdAt'>): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    // Fallback to localStorage
    const localLogs = JSON.parse(localStorage.getItem('betterme_logs') || '[]');
    const newId = 'local_' + Date.now();
    const newLog = { ...log, id: newId, userId: 'local', createdAt: new Date().toISOString() };
    localLogs.unshift(newLog);
    localStorage.setItem('betterme_logs', JSON.stringify(localLogs));
    return newId;
  }

  const path = 'activityLogs';
  try {
    const docRef = await addDoc(collection(db, path), {
      ...log,
      userId: currentUser.uid,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, 'create', path);
    return '';
  }
};

export const getActivityLogsDb = async (): Promise<DbActivityLog[]> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    // Fallback to localStorage
    return JSON.parse(localStorage.getItem('betterme_logs') || '[]');
  }

  const path = 'activityLogs';
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', currentUser.uid),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const logs: DbActivityLog[] = [];
    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data()
      } as DbActivityLog);
    });
    return logs;
  } catch (error) {
    // If indexing is pending or query fails, try a simple query first & sort in memory
    try {
      const qSimple = query(
        collection(db, path),
        where('userId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(qSimple);
      const logs: DbActivityLog[] = [];
      querySnapshot.forEach((doc) => {
        logs.push({
          id: doc.id,
          ...doc.data()
        } as DbActivityLog);
      });
      return logs.sort((a, b) => b.date.localeCompare(a.date));
    } catch (innerError) {
      handleFirestoreError(innerError, 'list', path);
      return [];
    }
  }
};

export const deleteActivityLogDb = async (id: string): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser || id.startsWith('local_')) {
    // Fallback to localStorage
    const localLogs = JSON.parse(localStorage.getItem('betterme_logs') || '[]');
    const filtered = localLogs.filter((l: any) => l.id !== id);
    localStorage.setItem('betterme_logs', JSON.stringify(filtered));
    return;
  }
  const path = `activityLogs/${id}`;
  try {
    await deleteDoc(doc(db, 'activityLogs', id));
  } catch (error) {
    handleFirestoreError(error, 'delete', path);
  }
};

export const userLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
