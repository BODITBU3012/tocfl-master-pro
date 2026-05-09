import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBBmuJ421TTd9Bu7pebZi6uHTxUD9zQ_Ik",
  authDomain: "tocfl-master-pro.firebaseapp.com",
  projectId: "tocfl-master-pro",
  storageBucket: "tocfl-master-pro.firebasestorage.app",
  messagingSenderId: "317844838813",
  appId: "1:317844838813:web:089c8239cc8c25124b3774",
  measurementId: "G-0505KN2JDB"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
