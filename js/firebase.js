// firebase.js

const firebaseConfig = {
  apiKey: "AIzaSyAPnVm1JeoV6-XElOq5zfIscl3RerWVtmk",
  authDomain: "isa-finance.firebaseapp.com",
  projectId: "isa-finance",
  storageBucket: "isa-finance.firebasestorage.app",
  messagingSenderId: "384353293578",
  appId: "1:384353293578:web:a08279141bf50e5cba56f3"
};

// Inicializa apenas uma vez
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

console.log("Firebase conectado!");
