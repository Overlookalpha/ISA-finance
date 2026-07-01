// ===============================
// Firebase ISA Finance
// ===============================

const firebaseConfig = {
    apiKey: "AIzaSyAPnVm1JeoV6-XELOq5zfIscl3RerWVtmk",
    authDomain: "isa-finance.firebaseapp.com",
    projectId: "isa-finance",
    storageBucket: "isa-finance.firebasestorage.app",
    messagingSenderId: "384353293578",
    appId: "1:384353293578:web:a08279141bf50e5cba56f3"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Serviços
const auth = firebase.auth();
const db = firebase.firestore();

// Timestamp do servidor
const timestamp = firebase.firestore.FieldValue.serverTimestamp;

console.log("✅ Firebase conectado!");
