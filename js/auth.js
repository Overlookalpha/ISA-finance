// ===============================
// ISA Finance - Autenticação
// ===============================

import { auth } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ===============================
// LOGIN
// ===============================

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

            const credencial = await signInWithEmailAndPassword(
                auth,
                email,
                senha
            );

            const usuario = credencial.user;

            // ADMIN
            if (usuario.email === "admin@isafinance.com") {

                window.location.href = "admin.html";
                return;

            }

            // USUÁRIOS
            window.location.href = "usuario.html";

        } catch (erro) {

            alert("E-mail ou senha inválidos.");
            console.error(erro);

        }

    });

}

// ===============================
// VERIFICA LOGIN
// ===============================

export function verificarLogin() {

    onAuthStateChanged(auth, (usuario) => {

        if (!usuario) {

            window.location.href = "login.html";

        }

    });

}

// ===============================
// LOGOUT
// ===============================

export async function sair() {

    await signOut(auth);

    window.location.href = "login.html";

}

window.sair = sair;
