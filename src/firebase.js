import { getAnalytics } from "firebase/analytics"
import { initializeApp } from "firebase/app"
import * as firestore from "firebase/firestore"
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth"

const firebaseConfig = (process.env.NODE_ENV === 'development') ? {
  apiKey: "AIzaSyCfoZFKKOaxF-c0qZQCXrJSzHLe5nAmkBE",
  authDomain: "test-firestore-desmat-ca.firebaseapp.com",
  projectId: "test-firestore-desmat-ca",
  storageBucket: "test-firestore-desmat-ca.appspot.com",
  messagingSenderId: "279126390661",
  appId: "1:279126390661:web:f42dd60f352501985876ec"
} : {
  apiKey: "AIzaSyCnvzVYXmJENHsFQsn-OwETEa-04SrAr58",
  authDomain: "tic-tac-toe-desmat-ca.firebaseapp.com",
  projectId: "tic-tac-toe-desmat-ca",
  storageBucket: "tic-tac-toe-desmat-ca.appspot.com",
  messagingSenderId: "484294760836",
  appId: "1:484294760836:web:1767b8a65ec3d22d15a5d1",
  measurementId: "G-FQG06GM7KV"
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig)
export const db = firestore.getFirestore()

if (process.env.NODE_ENV === 'development') {
  window.db = db // enable console debugging
  window.firestore = firestore // enable console debugging
} else {  
  getAnalytics(app)

  // anonymous auth (prod only)

  const auth = getAuth()


  onAuthStateChanged(auth, (user) => {
    if (user) {
      // // User is signed in, see docs for a list of available properties
      // // https://firebase.google.com/docs/reference/js/firebase.User
      // const uid = user.uid
      // console.log('onAuthStateChanged', { uid })
    } else {
      // // User is signed out
      // console.log('onAuthStateChanged signed out')
    }
  })

  signInAnonymously(auth)
    .then(() => {
      // // Signed in..
      // console.log('Signed in anonymously to firebase auth')
    })
    .catch((error) => {
      console.error('Firestore signing error', { error })
    })
}
