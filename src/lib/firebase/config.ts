import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager, type Firestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyA1fuMTGVxpnDDrkjeqwAHcLcAYFuV93-U',
  authDomain: 'myat-pwint.firebaseapp.com',
  projectId: 'myat-pwint',
  storageBucket: 'myat-pwint.firebasestorage.app',
  messagingSenderId: '714479332640',
  appId: '1:714479332640:web:dd63bd12dab7a8c811bb45',
  measurementId: 'G-0KEN542NMX',
}

// Initialize Firebase (singleton)
const app: FirebaseApp = getApps().length ? (getApps()[0] as FirebaseApp) : initializeApp(firebaseConfig)

// Initialize Firestore with offline persistence - fixes "client is offline" error
let db: Firestore
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager(),
    }),
  })
} catch (e) {
  // Already initialized (e.g. hot reload or multi-tab)
  const { getFirestore } = require('firebase/firestore')
  db = getFirestore(app)
}

export const firestore = db
export const auth = getAuth(app)
export default app
