// ===============================
// Firebase ISA Finance
// ===============================

// IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// CONFIGURAÇÃO FIREBASE
const firebaseConfig = {

    apiKey: "AIzaSyAPnVm1JeoV6-XElOq5zfIscl3RerWVtmk",
  authDomain: "isa-finance.firebaseapp.com",
  projectId: "isa-finance",
  storageBucket: "isa-finance.firebasestorage.app",
  messagingSenderId: "384353293578",
  appId: "1:384353293578:web:a08279141bf50e5cba56f3"

};

// INICIALIZA
const app = initializeApp(firebaseConfig);

// EXPORTA
export const db = getFirestore(app);
export const auth = getAuth(app);
