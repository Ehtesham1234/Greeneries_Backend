importScripts("https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js");
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging.js"
);

const firebaseConfig = {
  apiKey: "AIzaSyD0eCFoZJgYe8DAMTq4WxWw-P-rJsMC9qc",
  authDomain: "blossyleaf.firebaseapp.com",
  projectId: "blossyleaf",
  storageBucket: "blossyleaf.appspot.com",
  messagingSenderId: "15828265324",
  appId: "1:15828265324:web:07ed727c7e51dd584d2b49",
  measurementId: "G-2Z1H79NPNM",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Received background message ", payload);
  // Customize notification here
});
