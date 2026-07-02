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

const txtFundoSeparado = document.getElementById("fundoSeparado");

const totalEntradas = document.getElementById("totalEntradas");

const empresa = document.getElementById("empresa");

const isaias = document.getElementById("isaias");

const evelyn = document.getElementById("evelyn");

const fundoSeparadoTotal = document.getElementById("fundoSeparadoTotal");

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

const fundoSeparado = Number(txtFundoSeparado.value) || 0;
    
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

           fundoSeparado: fundoSeparado,

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

            saldoEvelyn: (config.saldoEvelyn || 0) + valorUsuario,

           fundoSeparado: (config.fundoSeparado || 0) + fundoSeparado

        });

        await updateDoc(
    doc(db, "usuarios", config.uidIsaias),
    {
        saldoDisponivel: increment(valorUsuario),
        totalReceber: increment(valorUsuario)
    }
);

await updateDoc(
    doc(db, "usuarios", config.uidEvellyn),
    {
        saldoDisponivel: increment(valorUsuario),
        totalReceber: increment(valorUsuario)
    }
);
        
       txtValor.value = "";
       txtFundoSeparado.value = "0";
       txtDescricao.value = "";

        alert("Entrada registrada com sucesso!");
        await carregarPainel();
        
    } catch (erro) {

        console.error(erro);

        alert("Erro ao registrar a entrada.");

    }

});
// =============================
// CARREGAR PAINEL
// =============================

async function carregarPainel(){

    const config = await carregarConfiguracoes();

    totalEntradas.innerHTML = moeda(config.totalEntradas || 0);

    empresa.innerHTML = moeda(config.empresa || 0);

    isaias.innerHTML = moeda(config.saldoIsaias || 0);

    evelyn.innerHTML = moeda(config.saldoEvelyn || 0);

    fundoSeparadoTotal.innerHTML = moeda(config.fundoSeparado || 0);
    
}
carregarPainel();
