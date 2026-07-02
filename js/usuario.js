// ======================================
// ISA Finance - Usuário
// ======================================

import { auth, db } from "./firebase.js";

import { verificarLogin, sair } from "./auth.js";

import {
    doc,
    getDoc,
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

    const totalGerado = config.totalEntradas || 0;

const percentual =
totalGerado >= (config.limiteMudancaPercentual || 5000)
    ? (config.percentualAcima || 20)
    : (config.percentualNormal || 12);

const fundoSeparado = config.fundoSeparado || 0;

const disponivel = totalGerado * (percentual / 100);

const faltaSeparar = Math.max(0, disponivel - fundoSeparado);

document.getElementById("totalGerado").innerHTML = moeda(totalGerado);

document.getElementById("fundoSeparado").innerHTML = moeda(fundoSeparado);

document.getElementById("faltaSeparar").innerHTML = moeda(faltaSeparar);

document.getElementById("saldoDisponivel").innerHTML = moeda(disponivel);

document.getElementById("percentualAtual").innerHTML = percentual + "%";
    
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

    const percentual =
        config.totalEntradas >= config.limiteMudancaPercentual
        ? config.percentualAcima
        : config.percentualNormal;

    // Saldo

    let saldo = 0;

    if(user.email === "isa@isafinance.com"){
        saldo = config.saldoIsaias || 0;
    }else{
        saldo = config.saldoEvelyn || 0;
    }

    // Valores

    const totalGerado = config.totalEntradas || 0;

    const fundoSeparado = usuario.fundoSeparado || 0;

    const faltaSeparar = saldo - fundoSeparado;

    const totalSacado = usuario.totalSacado || 0;

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
        percentual + "%";

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
.addEventListener("click",async()=>{

    const valor = prompt("Valor do saque:");

    if(!valor) return;

    const numero = Number(valor);

    if(numero<=0){

        alert("Valor inválido.");

        return;

    }

    await addDoc(collection(db,"saques"),{

        email:auth.currentUser.email,

        valor:numero,

        status:"Aguardando",

        criadoEm:serverTimestamp()

    });

    alert("Solicitação enviada.");

    carregar();

});

auth.onAuthStateChanged((user)=>{

    if(user){

        carregar();

    }

});
