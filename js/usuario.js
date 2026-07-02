
import { auth, db } from "./firebase.js";
import { verificarLogin, sair } from "./auth.js";

window.sair = sair;

verificarLogin();

console.log("✅ Usuário carregado.");
