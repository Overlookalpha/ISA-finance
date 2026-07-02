// =========================================
// ISA Finance - Admin
// =========================================

import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    getDoc,
    doc,
    updateDoc,
    increment,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { verificarLogin } from "./auth.js";

verificarLogin();

// =============================
// ELEMENTOS
// =============================

const btnSalvar = document.getElementById("salvarEntrada");

const txtValor = document.getElementById("valor");

const txtDescricao = document.getElementById("descricao");

const totalEntradas = document.getElementById("totalEntradas");

const empresa = document.getElementById("empresa");

const isaias = document.getElementById("isaias");

const evelyn = document.getElementById("evelyn");

const listaEntradas = document.getElementById("listaEntradas");

// =============================
// FORMATA MOEDA
// =============================

function moeda(valor){

    return valor.toLocaleString("pt-PT",{
        style:"currency",
        currency:"EUR"
    });

}

// =============================
// CONFIGURAÇÕES
// =============================

async function carregarConfiguracoes(){

    const snap = await getDoc(
        doc(db,"configuracoes","geral")
    );

    return snap.data();

}
// =============================
// SALVAR MOVIMENTAÇÃO
// =============================

btnSalvar.addEventListener("click", async () => {

    const valor = Number(txtValor.value);

    const descricao = txtDescricao.value.trim();

    if (isNaN(valor) || valor <= 0) {

        alert("Informe um valor válido.");

        return;

    }

    try {

        const config = await carregarConfiguracoes();

        const percentual = config.totalEntradas >= config.limiteMudancaPercentual
            ? config.percentualAcima
            : config.percentualNormal;

        const valorUsuario = valor * (percentual / 100);

        const valorEmpresa = valor - (valorUsuario * 2);

        await addDoc(collection(db, "movimentacoes"), {

            tipo: "entrada",

            valor: valor,

            descricao: descricao,

            percentual: percentual,

            empresa: valorEmpresa,

            isaias: valorUsuario,

            evelyn: valorUsuario,

            criadoEm: serverTimestamp()

        });

        await updateDoc(doc(db, "configuracoes", "geral"), {

            totalEntradas: (config.totalEntradas || 0) + valor,

            empresa: (config.empresa || 0) + valorEmpresa,

            saldoIsaias: (config.saldoIsaias || 0) + valorUsuario,

            saldoEvelyn: (config.saldoEvelyn || 0) + valorUsuario

        });

        txtValor.value = "";
        txtDescricao.value = "";

        alert("Entrada registrada com sucesso!");

    } catch (erro) {

        console.error(erro);

        alert("Erro ao registrar a entrada.");

    }

});
