// ======================================
// ISA Finance - Autenticação
// ======================================

import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===========================
// LOGIN
// ===========================

const btnEntrar = document.getElementById("entrar");

if (btnEntrar) {

    btnEntrar.addEventListener("click", async () => {

        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value;

        if (!email || !senha) {
            alert("Informe o e-mail e a senha.");
            return;
        }

        try {

            const credencial = await signInWithEmailAndPassword(auth, email, senha);

            const uid = credencial.user.uid;

            const usuarioRef = doc(db, "usuarios", uid);

            const usuarioSnap = await getDoc(usuarioRef);

            if (!usuarioSnap.exists()) {

                alert("Usuário não encontrado.");

                await signOut(auth);

                return;

            }

            const usuario = usuarioSnap.data();

            if (usuario.tipo === "admin") {

                window.location.href = "admin.html";

            } else {

                window.location.href = "usuario.html";

            }

        } catch (erro) {

            console.error(erro);

            alert("E-mail ou senha inválidos.");

        }

    });

}

// ===========================
// Verificar Login
// ===========================

export function verificarLogin() {

    onAuthStateChanged(auth, (user) => {

        if (!user) {

            window.location.href = "login.html";

        }

    });

}

// ===========================
// Logout
// ===========================

export async function sair() {

    await signOut(auth);

    window.location.href = "login.html";

}

window.sair = sair;
