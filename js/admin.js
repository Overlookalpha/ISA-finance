// =========================================
// ISA Finance - Admin
// =========================================

import { db } from "./firebase.js";
      
import {
    collection,
    addDoc,
    getDoc,
    getDocs,
    doc,
    updateDoc,
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

const mesReferencia = document.getElementById("mesReferencia");

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

const fundoSeparado = 0;
    
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

    saldoEvelyn: (config.saldoEvelyn || 0) + valorUsuario

});

    
        
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

 await carregarHistorico();     
      
}

async function carregarHistorico() {

    listaEntradas.innerHTML = "";

    const snap = await getDocs(collection(db, "movimentacoes"));

    snap.forEach((docMov) => {

        const m = docMov.data();

        listaEntradas.innerHTML += `
            <tr>
                <td>-</td>
                <td>${m.descricao || ""}</td>
                <td>${moeda(m.valor || 0)}</td>
                <td>${moeda(m.empresa || 0)}</td>
                <td>${moeda(m.isaias || 0)}</td>
                <td>${moeda(m.evelyn || 0)}</td>
            </tr>
        `;

    });

}

btnAdicionarFundo.addEventListener("click", async () => {

    const valor = Number(txtValorFundo.value);

    if (valor <= 0) {
        alert("Informe um valor válido.");
        return;
    }

    const config = await carregarConfiguracoes();

    const novoFundo = (config.fundoSeparado || 0) + valor;

    await updateDoc(doc(db, "configuracoes", "geral"), {
        fundoSeparado: novoFundo
    });

   
    txtValorFundo.value = "";

    await carregarPainel();

    alert("Fundo atualizado com sucesso!");

});

const hoje = new Date();

mesReferencia.value =
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

carregarPainel();

mesReferencia.addEventListener("change", () => {
    carregarPainel();
});
