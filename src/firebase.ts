import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, setLogLevel, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Suppress harmless internal warnings like "Disconnecting idle stream"
setLogLevel('error');

// Force long polling to avoid gRPC stream errors in sandboxed environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Enable Firestore Client-side Offline Persistence (IndexedDB) to minimize read charges and support offline queries
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore offline persistence failed-precondition (multiple tabs open).');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore offline persistence not supported by this browser.');
  } else {
    console.warn('Firestore offline persistence error:', err);
  }
});

export const auth = getAuth(app);
