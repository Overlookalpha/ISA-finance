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
    query,
    where,
    Timestamp,
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
        console.log("Config totalEntradas:", config.totalEntradas);
          
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

    saldoEvellyn: (config.saldoEvellyn || 0) + valorUsuario

});

    
        console.log(txtValor);
       console.log(txtFundoSeparado);
       console.log(txtDescricao);
       txtValor.value = "";
       // txtFundoSeparado.value = "0";
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

    const [ano, mes] = mesReferencia.value.split("-");

const inicio = Timestamp.fromDate(
    new Date(Number(ano), Number(mes) - 1, 1)
);

const fim = Timestamp.fromDate(
    new Date(Number(ano), Number(mes), 1)
);

const q = query(
    collection(db, "movimentacoes"),
    where("criadoEm", ">=", inicio),
    where("criadoEm", "<", fim)
);

const snap = await getDocs(q);

let totalMes = 0;
let empresaMes = 0;
let isaiasMes = 0;
let evelynMes = 0;
let fundoMes = 0;
      
snap.forEach((docMov) => {
    const m = docMov.data();

    totalMes += m.valor || 0;
    empresaMes += m.empresa || 0;
    isaiasMes += m.isaias || 0;
    evelynMes += m.evelyn || 0;
    fundoMes += m.fundoSeparado || 0;
});
    console.log("Total do mês:", totalMes);  
    totalEntradas.innerHTML = moeda(totalMes);

empresa.innerHTML = moeda(empresaMes);

isaias.innerHTML = moeda(isaiasMes);

evelyn.innerHTML = moeda(evelynMes);
   
  fundoSeparadoTotal.innerHTML = moeda(config.fundoSeparado || 0);
  console.log("Saldo disponível Isaías:", config.saldoDisponivelIsaias || 0);
console.log("Saldo disponível Evellyn:", config.saldoDisponivelEvellyn || 0);

console.log("Total sacado Isaías:", config.totalSacadoIsaias || 0);
console.log("Total sacado Evellyn:", config.totalSacadoEvellyn || 0);
        
const percentual =
    totalMes >= (config.limiteMudancaPercentual || 5000)
        ? (config.percentualAcima || 20)
        : (config.percentualNormal || 12);

const valorCadaSocio = totalMes * (percentual / 100);

const fundoNecessario = valorCadaSocio * 2;

const totalSacado =
    (config.totalSacadoIsaias || 0) +
    (config.totalSacadoEvellyn || 0);

const faltaSeparar = Math.max(
    0,
    fundoNecessario -
    totalSacado -
    (config.fundoSeparado || 0)
);

faltaSepararTotal.innerHTML = moeda(faltaSeparar);

await carregarHistorico();
 
      
}

async function carregarHistorico() {

    listaEntradas.innerHTML = "";

    const [ano, mes] = mesReferencia.value.split("-");

const inicio = Timestamp.fromDate(
    new Date(Number(ano), Number(mes) - 1, 1)
);

const fim = Timestamp.fromDate(
    new Date(Number(ano), Number(mes), 1)
);

const q = query(
    collection(db, "movimentacoes"),
    where("criadoEm", ">=", inicio),
    where("criadoEm", "<", fim)
);

const snap = await getDocs(q);

    snap.forEach((docMov) => {

        const m = docMov.data();

        listaEntradas.innerHTML += `
            <tr>
                <td>${
                 m.criadoEm
               ? m.criadoEm.toDate().toLocaleDateString("pt-PT")
               : "-"
               }</td>
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
    await addDoc(collection(db, "movimentacoes"), {

    tipo: "fundo",

    descricao: "Fundo Separado",

    valor: 0,

    empresa: 0,

    isaias: 0,

    evelyn: 0,

    fundoSeparado: valor,

    criadoEm: serverTimestamp()

});
  const saldoDisponivelIsaias =
    ((config.saldoDisponivelIsaias || 0) === 0 &&
     (config.saldoDisponivelEvellyn || 0) === 0 &&
     (config.fundoSeparado || 0) > 0)
        ? (config.fundoSeparado / 2) + (valor / 2)
        : (config.saldoDisponivelIsaias || 0) + (valor / 2);

const saldoDisponivelEvellyn =
    ((config.saldoDisponivelIsaias || 0) === 0 &&
     (config.saldoDisponivelEvellyn || 0) === 0 &&
     (config.fundoSeparado || 0) > 0)
        ? (config.fundoSeparado / 2) + (valor / 2)
        : (config.saldoDisponivelEvellyn || 0) + (valor / 2);

await updateDoc(doc(db, "configuracoes", "geral"), {
    fundoSeparado: novoFundo,
    saldoDisponivelIsaias,
    saldoDisponivelEvellyn
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
