// ======================================
// ISA Finance - Usuário
// ======================================

import { auth, db } from "./firebase.js";  

import { verificarLogin, sair } from "./auth.js";
      
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
window.sair = sair;

verificarLogin();

function moeda(valor){
    return Number(valor || 0).toLocaleString("pt-PT",{
        style:"currency",
        currency:"EUR"
    });
}

async function carregar(){

    const user = auth.currentUser;

    if(!user){
        return;
    }

    // Configurações Gerais
    const configSnap = await getDoc(doc(db,"configuracoes","geral"));

    if(!configSnap.exists()){
        return;
    }

    const config = configSnap.data();
   console.log("totalEntradas =", config.totalEntradas);
   console.log("config =", config);
    
    // Procura o usuário pelo e-mail
    const q = query(
        collection(db,"usuarios"),
        where("email","==",user.email)
    );

    const resultado = await getDocs(q);

    if(resultado.empty){
        alert("Usuário não encontrado.");
        return;
    }

    const usuario = resultado.docs[0].data();

    // Percentual

    const percentualAtual =
        config.totalEntradas >= config.limiteMudancaPercentual
        ? config.percentualAcima
        : config.percentualNormal;

    // Saldo

    // Valores

  const totalGerado = config.saldoIsaias + config.saldoEvellyn + config.empresa;

const fundoSeparado = config.fundoSeparado || 0;

const faltaSeparar = Math.max(
    0,
    (config.saldoIsaias + config.saldoEvellyn) - fundoSeparado
);

let saldo = 0;
let totalSacado = 0;

if (user.uid === config.uidIsaias) {

    saldo = config.saldoDisponivelIsaias || 0;
    totalSacado = config.totalSacadoIsaias || 0;

} else if (user.uid === config.uidEvellyn) {

    saldo = config.saldoDisponivelEvellyn || 0;
    totalSacado = config.totalSacadoEvellyn || 0;

}
    // Atualiza tela

    document.getElementById("totalGerado").innerHTML =
        moeda(totalGerado);

    document.getElementById("fundoSeparado").innerHTML =
        moeda(fundoSeparado);

    document.getElementById("faltaSeparar").innerHTML =
        moeda(faltaSeparar);

    document.getElementById("saldoDisponivel").innerHTML =
        moeda(saldo);

    document.getElementById("totalSacado").innerHTML =
        moeda(totalSacado);

   document.getElementById("percentualAtual").innerHTML =
    percentualAtual + "%";

    carregarHistorico(user.email);

}

async function carregarHistorico(email){

    const corpo = document.getElementById("listaSaques");

    corpo.innerHTML = "";

    const q = query(
        collection(db,"saques"),
        where("email","==",email)
    );

    const snap = await getDocs(q);

    snap.forEach(docSaque=>{

        const s = docSaque.data();

        corpo.innerHTML += `
        <tr>
            <td>-</td>
            <td>${moeda(s.valor)}</td>
            <td>${s.status}</td>
        </tr>
        `;

    });

}

document
.getElementById("btnSolicitarSaque")
.addEventListener("click", async () => {

    const user = auth.currentUser;

    const configRef = doc(db, "configuracoes", "geral");
    const configSnap = await getDoc(configRef);
    const config = configSnap.data();

    let saldoDisponivel = 0;
    let campoSaldo = "";
    let campoSacado = "";
    const valor = Number(document.getElementById("valorSaque").value);

if (isNaN(valor) || valor <= 0) {
    alert("Informe um valor válido.");
    return;
}
      
    if (user.uid === config.uidIsaias) {
        saldoDisponivel = config.saldoDisponivelIsaias || 0;
        campoSaldo = "saldoDisponivelIsaias";
        campoSacado = "totalSacadoIsaias";
    } else {
        saldoDisponivel = config.saldoDisponivelEvellyn || 0;
        campoSaldo = "saldoDisponivelEvellyn";
        campoSacado = "totalSacadoEvellyn";
    }

    if (valor > saldoDisponivel) {
    alert("Saldo insuficiente para realizar o saque.");
    return;
}

    await addDoc(collection(db, "saques"), {

    uid: user.uid,

    email: user.email,

    nome: user.uid === config.uidIsaias ? "Isaías" : "Evellyn",

    valor: valor,

    status: "Pago",

    criadoEm: serverTimestamp()

});

    await updateDoc(configRef, {
        fundoSeparado: (config.fundoSeparado || 0) - valor,
        [campoSaldo]: saldoDisponivel - valor,
        [campoSacado]: (config[campoSacado] || 0) + valor
    });
    document.getElementById("valorSaque").value = "";
    alert("Saque realizado com sucesso!");

    carregar();

});
auth.onAuthStateChanged((user)=>{

    if(user){

        carregar();

    }

});
