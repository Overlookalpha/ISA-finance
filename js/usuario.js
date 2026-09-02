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

// =============================
// SEMPRE ABRIR NO MÊS ATUAL
// =============================

const mesSelecionado = document.getElementById("mesSelecionado");

(function selecionarMesAtual(){

    const hoje = new Date();

    const mesAtual =
        `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

    const existeOpcao = Array.from(mesSelecionado.options)
        .some((opcao) => opcao.value === mesAtual);

    if (existeOpcao) {
        mesSelecionado.value = mesAtual;
    }

})();

function calcularIntervaloMes(mes){

    const [ano, numeroMes] = mes.split("-");

    const inicio = Timestamp.fromDate(
        new Date(Number(ano), Number(numeroMes) - 1, 1)
    );

    const fim = Timestamp.fromDate(
        new Date(Number(ano), Number(numeroMes), 1)
    );

    return { ano, numeroMes, inicio, fim };

}

async function carregar(){

    const user = auth.currentUser;

    if(!user){
        return;
    }

    const mes = mesSelecionado.value;

    const { inicio, fim } = calcularIntervaloMes(mes);

    const usuarioQuery = query(
        collection(db, "usuarios"),
        where("email", "==", user.email)
    );

    const movimentacoesQuery = query(
        collection(db, "movimentacoes"),
        where("criadoEm", ">=", inicio),
        where("criadoEm", "<", fim)
    );

    const saquesQuery = query(
        collection(db, "saques"),
        where("email", "==", user.email),
        where("criadoEm", ">=", inicio),
        where("criadoEm", "<", fim)
    );

    const todosSaquesQuery = query(
        collection(db, "saques"),
        where("criadoEm", ">=", inicio),
        where("criadoEm", "<", fim)
    );

    // Todas as leituras independentes disparam juntas, em vez de
    // esperar uma terminar para começar a próxima.
    const [
        configSnap,
        usuarioSnap,
        movimentacoesSnap,
        saquesSnap,
        todosSaquesSnap
    ] = await Promise.all([
        getDoc(doc(db, "configuracoes", "geral")),
        getDocs(usuarioQuery),
        getDocs(movimentacoesQuery),
        getDocs(saquesQuery),
        getDocs(todosSaquesQuery)
    ]);

    if(!configSnap.exists()){
        return;
    }

    const config = configSnap.data();

    if(usuarioSnap.empty){
        alert("Usuário não encontrado.");
        return;
    }

    const usuario = usuarioSnap.docs[0].data();

    document.getElementById("nomeUsuario").innerHTML =
        `👤 ${usuario.nome}`;

    document.getElementById("tipoUsuario").innerHTML =
        "💼 Usuário";

    let totalGeradoMes = 0;
    let isaiasMes = 0;
    let evellynMes = 0;
    let fundoMes = 0;

    movimentacoesSnap.forEach((docMov) => {

        const m = docMov.data();

        totalGeradoMes += m.valor || 0;
        isaiasMes += m.isaias || 0;
        evellynMes += m.evelyn || 0;
        fundoMes += m.fundoSeparado || 0;

    });

    let totalSacadoMes = 0;

    saquesSnap.forEach((docSaque) => {
        totalSacadoMes += docSaque.data().valor || 0;
    });

    let totalPago = 0;

    todosSaquesSnap.forEach((docSaque) => {
        totalPago += docSaque.data().valor || 0;
    });

    const percentualAtual = 12;

    const faltaSeparar = Math.max(
        0,
        (isaiasMes + evellynMes) - fundoMes
    );

    let saldoMes = 0;

    const metadeFundo = fundoMes / 2;

    if (user.uid === config.uidIsaias) {
        saldoMes = metadeFundo;
    } else if (user.uid === config.uidEvellyn) {
        saldoMes = metadeFundo;
    }

    document.getElementById("totalGerado").innerHTML =
        moeda(totalGeradoMes);

    const fundoAtual = Math.max(0, fundoMes - totalPago);

    document.getElementById("fundoSeparado").innerHTML =
        moeda(fundoAtual);

    document.getElementById("faltaSeparar").innerHTML =
        moeda(faltaSeparar);

    saldoMes = Math.max(0, saldoMes - totalSacadoMes);

    document.getElementById("saldoDisponivel").innerHTML =
        moeda(saldoMes);

    document.getElementById("totalSacado").innerHTML =
        moeda(totalSacadoMes);

    document.getElementById("percentualAtual").innerHTML =
        percentualAtual + "%";

    // Reaproveita o snapshot de saques já buscado acima —
    // evita repetir a mesma consulta para montar o histórico.
    renderizarHistorico(saquesSnap);

}

function renderizarHistorico(saquesSnap){

    const corpo = document.getElementById("listaSaques");

    corpo.innerHTML = "";

    saquesSnap.forEach((docSaque) => {

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

const btnSolicitarSaque = document.getElementById("btnSolicitarSaque");
const textoOriginalBtnSaque = btnSolicitarSaque.innerHTML;

btnSolicitarSaque.addEventListener("click", async () => {

    const user = auth.currentUser;

    const valor = Number(document.getElementById("valorSaque").value);

    if (isNaN(valor) || valor <= 0) {
        alert("Informe um valor válido.");
        return;
    }

    // Feedback imediato: o botão muda na hora do clique,
    // então não parece "travado" enquanto espera o Firebase.
    btnSolicitarSaque.disabled = true;
    btnSolicitarSaque.innerHTML = "Processando...";

    try {

        const configRef = doc(db, "configuracoes", "geral");

        const mes = mesSelecionado.value;

        const { ano, numeroMes, inicio, fim } = calcularIntervaloMes(mes);

        const movQuery = query(
            collection(db, "movimentacoes"),
            where("criadoEm", ">=", inicio),
            where("criadoEm", "<", fim)
        );

        const saquesQuery = query(
            collection(db, "saques"),
            where("email", "==", user.email),
            where("criadoEm", ">=", inicio),
            where("criadoEm", "<", fim)
        );

        // Essas três leituras não dependem uma da outra:
        // disparam ao mesmo tempo em vez de em fila.
        const [configSnap, movSnap, saquesSnap] = await Promise.all([
            getDoc(configRef),
            getDocs(movQuery),
            getDocs(saquesQuery)
        ]);

        const config = configSnap.data();

        let fundoMes = 0;

        movSnap.forEach((docMov) => {
            fundoMes += docMov.data().fundoSeparado || 0;
        });

        let totalSacadoMes = 0;

        saquesSnap.forEach((docSaque) => {
            totalSacadoMes += docSaque.data().valor || 0;
        });

        const saldoDisponivel = Math.max(
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

        // A gravação do saque e a atualização do fundo não dependem
        // uma da outra, então também podem rodar em paralelo.
        await Promise.all([
            addDoc(collection(db, "saques"), {
                uid: user.uid,
                email: user.email,
                nome: user.uid === config.uidIsaias ? "Isaías" : "Evellyn",
                valor: valor,
                status: "Pago",
                criadoEm: dataReferencia
            }),
            updateDoc(configRef, {
                fundoSeparado: (config.fundoSeparado || 0) - valor
            })
        ]);

        document.getElementById("valorSaque").value = "";
        alert("Saque realizado com sucesso!");

        await carregar();

    } catch (erro) {

        console.error("ERRO AO GRAVAR SAQUE:", erro);
        alert("Erro ao gravar o saque.");

    } finally {

        btnSolicitarSaque.disabled = false;
        btnSolicitarSaque.innerHTML = textoOriginalBtnSaque;

    }

});

mesSelecionado.addEventListener("change", () => {
    carregar();
});

auth.onAuthStateChanged((user) => {

    if (user) {
        carregar();
    }

});
