import { initializeApp } from "firebase/app";
import * as firestore from "firebase/firestore"

const firebaseConfig = true /* (process.env.NODE_ENV === 'development') */ ? {
  apiKey: "AIzaSyCfoZFKKOaxF-c0qZQCXrJSzHLe5nAmkBE",
  authDomain: "test-firestore-desmat-ca.firebaseapp.com",
  projectId: "test-firestore-desmat-ca",
  storageBucket: "test-firestore-desmat-ca.appspot.com",
  messagingSenderId: "279126390661",
  appId: "1:279126390661:web:f42dd60f352501985876ec"
} : {
  // TODO
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig)
export const db = firestore.getFirestore()

// REMOVE BEFORE SHIPPING
// window.db = db // ALLOW CONSOLE DEBUG
// window.firestore = firestore // ALLOW CONSOLE DEBUG
