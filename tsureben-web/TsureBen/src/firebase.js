// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDcGpXuofSqCj3Ngc22lKq3VZoeXAV2hUw",
    authDomain: "tsureben.firebaseapp.com",
    projectId: "tsureben",
    storageBucket: "tsureben.appspot.com",
    messagingSenderId: "77789669140",
    appId: "1:77789669140:web:65acf425f634ebc8b58401",
    measurementId: "G-X6VXB3N196"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { app, auth, db };