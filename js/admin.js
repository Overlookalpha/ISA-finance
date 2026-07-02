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

const faltaSepararTotal = document.getElementById("faltaSepararTotal");

const listaEntradas = document.getElementById("listaEntradas");

const txtValorFundo = document.getElementById("valorFundo");

const btnAdicionarFundo = document.getElementById("btnAdicionarFundo");

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

   const percentual = (config.totalEntradas || 0) >= (config.limiteMudancaPercentual || 5000)
    ? (config.percentualAcima || 20)
    : (config.percentualNormal || 12);

const valorCadaSocio = (config.totalEntradas || 0) * (percentual / 100);

const fundoNecessario = valorCadaSocio * 2;

const faltaSeparar = Math.max(
    0,
    fundoNecessario - (config.fundoSeparado || 0)
);

faltaSepararTotal.innerHTML = moeda(faltaSeparar);
   
}
carregarPainel();

btnAdicionarFundo.addEventListener("click", async () => {

    const valor = Number(txtValorFundo.value);

    if (!valor || valor <= 0) {
        alert("Informe um valor válido.");
        return;
    }

    try {

        await updateDoc(
            doc(db, "configuracoes", "geral"),
            {
                fundoSeparado: increment(valor)
            }
        );

        txtValorFundo.value = "";

        await carregarPainel();

        alert("Valor adicionado ao Fundo Separado!");

    } catch (erro) {

        console.error(erro);

        alert("Erro ao adicionar ao Fundo.");
    }

});
