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
    serverTimestamp,
    Timestamp
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
  console.log("UID LOGADO:", user.uid);
console.log("UID ISAIAS:", config.uidIsaias);
console.log("UID EVELLYN:", config.uidEvellyn);
  
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
document.getElementById("nomeUsuario").innerHTML =
    `👤 ${usuario.nome}`;
  if (user.uid === config.uidIsaias) {

    document.getElementById("tipoUsuario").innerHTML =
        "🛠️ Administrador";

} else {

    document.getElementById("tipoUsuario").innerHTML =
        "💼 Usuário";

}
const mes = document.getElementById("mesSelecionado").value;

const [ano, numeroMes] = mes.split("-");

const inicio = Timestamp.fromDate(
    new Date(Number(ano), Number(numeroMes) - 1, 1)
);

const fim = Timestamp.fromDate(
    new Date(Number(ano), Number(numeroMes), 1)
);

const movimentacoesQuery = query(
    collection(db, "movimentacoes"),
    where("criadoEm", ">=", inicio),
    where("criadoEm", "<", fim)
);

const movimentacoesSnap = await getDocs(movimentacoesQuery);

let totalGeradoMes = 0;
let empresaMes = 0;
let isaiasMes = 0;
let evellynMes = 0;
let fundoMes = 0;

movimentacoesSnap.forEach((docMov) => {

    const m = docMov.data();

    totalGeradoMes += m.valor || 0;
    empresaMes += m.empresa || 0;
    isaiasMes += m.isaias || 0;
    evellynMes += m.evelyn || 0;
    fundoMes += m.fundoSeparado || 0;

});

  const saquesQuery = query(
    collection(db, "saques"),
    where("email", "==", user.email),
    where("criadoEm", ">=", inicio),
    where("criadoEm", "<", fim)
);

const saquesSnap = await getDocs(saquesQuery);

let totalSacadoMes = 0;

saquesSnap.forEach((docSaque) => {

    const s = docSaque.data();

    totalSacadoMes += s.valor || 0;

});
  
    // Percentual

   const percentualAtual = 12;

    // Saldo

    // Valores

  const totalGerado = totalGeradoMes;

const fundoSeparado = config.fundoSeparado || 0;

console.log("ADMIN");
console.log("saldoIsaias:", config.saldoIsaias);
console.log("saldoEvellyn:", config.saldoEvellyn);
console.log("fundoSeparado:", config.fundoSeparado);
console.log("totalSacadoIsaias:", config.totalSacadoIsaias);
console.log("totalSacadoEvellyn:", config.totalSacadoEvellyn);
  


let faltaSeparar = Math.max(
    0,
    (isaiasMes + evellynMes) - fundoMes
);


let saldoMes = 0;

let saldo = 0;
let totalSacado = 0;

const metadeFundo = fundoMes / 2;

if (user.uid === config.uidIsaias) {

    saldoMes = metadeFundo;
    totalSacado = totalSacadoMes;

} else if (user.uid === config.uidEvellyn) {

    saldoMes = metadeFundo;
    totalSacado = totalSacadoMes;

}
    // Atualiza tela

   document.getElementById("totalGerado").innerHTML =
    moeda(totalGeradoMes);
  
document.getElementById("fundoSeparado").innerHTML =
    moeda(fundoMes);

    document.getElementById("faltaSeparar").innerHTML =
        moeda(faltaSeparar);

saldoMes = Math.max(0, saldoMes - totalSacadoMes);

document.getElementById("saldoDisponivel").innerHTML =
    moeda(saldoMes);

    document.getElementById("totalSacado").innerHTML =
    moeda(totalSacadoMes);
  
   document.getElementById("percentualAtual").innerHTML =
    percentualAtual + "%";

    carregarHistorico(user.email);

}

async function carregarHistorico(email){

    const corpo = document.getElementById("listaSaques");

const mes = document.getElementById("mesSelecionado").value;

const [ano, numeroMes] = mes.split("-");

const inicio = Timestamp.fromDate(
    new Date(Number(ano), Number(numeroMes) - 1, 1)
);

const fim = Timestamp.fromDate(
    new Date(Number(ano), Number(numeroMes), 1)
);
  
    corpo.innerHTML = "";

    const q = query(
    collection(db,"saques"),
    where("email","==",email),
    where("criadoEm", ">=", inicio),
    where("criadoEm", "<", fim)
);
    const snap = await getDocs(q);
console.log("Quantidade de saques:", snap.size);

snap.forEach(doc => console.log(doc.data()));
    snap.forEach(docSaque=>{

        const s = docSaque.data();

        corpo.innerHTML += `
<tr>
    <td>${
        s.criadoEm
            ? s.criadoEm.toDate().toLocaleDateString("pt-PT")
            : "-"
    }</td>
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
      
    const mes = document.getElementById("mesSelecionado").value;

const [ano, numeroMes] = mes.split("-");

const inicio = Timestamp.fromDate(
    new Date(Number(ano), Number(numeroMes) - 1, 1)
);

const fim = Timestamp.fromDate(
    new Date(Number(ano), Number(numeroMes), 1)
);

const movSnap = await getDocs(query(
    collection(db, "movimentacoes"),
    where("criadoEm", ">=", inicio),
    where("criadoEm", "<", fim)
));

let fundoMes = 0;

movSnap.forEach(doc => {
    fundoMes += doc.data().fundoSeparado || 0;
});

const saquesSnap = await getDocs(query(
    collection(db, "saques"),
    where("email", "==", user.email),
    where("criadoEm", ">=", inicio),
    where("criadoEm", "<", fim)
));

let totalSacadoMes = 0;

saquesSnap.forEach(doc => {
    totalSacadoMes += doc.data().valor || 0;
});

saldoDisponivel = Math.max(
    0,
    (fundoMes / 2) - totalSacadoMes
);
  
    const saldoCorrigido = Math.round(saldoDisponivel * 100);
const valorCorrigido = Math.round(valor * 100);

if (valorCorrigido > saldoCorrigido) {
    alert("Saldo insuficiente para realizar o saque.");
    return;
}

const dataReferencia = Timestamp.fromDate(
    new Date(Number(ano), Number(numeroMes) - 1, 1)
);

try {

    await addDoc(collection(db, "saques"), {

        uid: user.uid,
        email: user.email,
        nome: user.uid === config.uidIsaias ? "Isaías" : "Evellyn",
        valor: valor,
        status: "Pago",
        criadoEm: dataReferencia

    });

    console.log("SAQUE GRAVADO COM SUCESSO");

} catch (erro) {

    console.error("ERRO AO GRAVAR SAQUE:", erro);
    alert("Erro ao gravar o saque.");
    return;

}

    await updateDoc(configRef, {

    fundoSeparado: (config.fundoSeparado || 0) - valor

});
    document.getElementById("valorSaque").value = "";
    alert("Saque realizado com sucesso!");

    carregar();

});

document
.getElementById("mesSelecionado")
.addEventListener("change", () => {

    carregar();

});
  
auth.onAuthStateChanged((user)=>{

    if(user){

        carregar();

    }

});
