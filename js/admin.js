// =========================================
// ISA Finance - Admin
// =========================================

import { db, auth } from "./firebase.js";

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
auth.onAuthStateChanged(async (user) => {

    if (!user) return;

    const q = query(
        collection(db, "usuarios"),
        where("email", "==", user.email)
    );

    const resultado = await getDocs(q);

    if (resultado.empty) return;

    const usuario = resultado.docs[0].data();

    document.getElementById("nomeUsuario").innerHTML =
        `👤 ${usuario.nome}`;

    document.getElementById("tipoUsuario").innerHTML =
        "🛠️ Administrador";

});
// =============================
// ELEMENTOS
// =============================

const btnSalvar = document.getElementById("salvarEntrada");
const textoOriginalBtnSalvar = btnSalvar.innerHTML;

const txtValor = document.getElementById("valor");

const txtDescricao = document.getElementById("descricao");

const totalEntradas = document.getElementById("totalEntradas");

const empresa = document.getElementById("empresa");

const isaias = document.getElementById("isaias");

const evelyn = document.getElementById("evelyn");

const fundoSeparadoTotal = document.getElementById("fundoSeparadoTotal");

const faltaSepararTotal = document.getElementById("faltaSepararTotal");

const listaEntradas = document.getElementById("listaEntradas");

const txtValorFundo = document.getElementById("valorFundo");

const btnAdicionarFundo = document.getElementById("btnAdicionarFundo");
const textoOriginalBtnFundo = btnAdicionarFundo.innerHTML;

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

    // Feedback imediato — o botão já muda no clique, então
    // não fica parecendo travado enquanto espera o Firebase.
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = "Salvando...";

    try {

        const config = await carregarConfiguracoes();

        const percentual = 12;

        const valorUsuario = valor * 0.12;

        const valorEmpresa = valor - (valorUsuario * 2);

        // Gravar a entrada e atualizar os totais não dependem um
        // do outro, então rodam ao mesmo tempo em vez de em fila.
        await Promise.all([
            addDoc(collection(db, "movimentacoes"), {
                tipo: "entrada",
                valor: valor,
                descricao: descricao,
                fundoSeparado: fundoSeparado,
                percentual: percentual,
                empresa: valorEmpresa,
                isaias: valorUsuario,
                evelyn: valorUsuario,
                criadoEm: serverTimestamp()
            }),
            updateDoc(doc(db, "configuracoes", "geral"), {
                totalEntradas: (config.totalEntradas || 0) + valor,
                empresa: (config.empresa || 0) + valorEmpresa,
                saldoIsaias: (config.saldoIsaias || 0) + valorUsuario,
                saldoEvellyn: (config.saldoEvellyn || 0) + valorUsuario
            })
        ]);

        txtValor.value = "";
        txtDescricao.value = "";

        alert("Entrada registrada com sucesso!");
        await carregarPainel();

    } catch (erro) {

        console.error(erro);

        alert("Erro ao registrar a entrada.");

    } finally {

        btnSalvar.disabled = false;
        btnSalvar.innerHTML = textoOriginalBtnSalvar;

    }

});
// =============================
// CARREGAR PAINEL
// =============================

async function carregarPainel(){

    const [ano, mes] = mesReferencia.value.split("-");

    const inicio = Timestamp.fromDate(
        new Date(Number(ano), Number(mes) - 1, 1)
    );

    const fim = Timestamp.fromDate(
        new Date(Number(ano), Number(mes), 1)
    );

    const movimentacoesQuery = query(
        collection(db, "movimentacoes"),
        where("criadoEm", ">=", inicio),
        where("criadoEm", "<", fim)
    );

    const saquesQuery = query(
        collection(db, "saques"),
        where("criadoEm", ">=", inicio),
        where("criadoEm", "<", fim)
    );

    // As duas consultas independentes disparam juntas.
    const [snap, saquesSnap] = await Promise.all([
        getDocs(movimentacoesQuery),
        getDocs(saquesQuery)
    ]);

    let totalMes = 0;
    let empresaMes = 0;
    let isaiasMes = 0;
    let evelynMes = 0;
    let fundoMes = 0;
    let totalPago = 0;

    snap.forEach((docMov) => {
        const m = docMov.data();

        totalMes += m.valor || 0;
        empresaMes += m.empresa || 0;
        isaiasMes += m.isaias || 0;
        evelynMes += m.evelyn || 0;
        fundoMes += m.fundoSeparado || 0;
    });

    saquesSnap.forEach((docSaque) => {
        totalPago += docSaque.data().valor || 0;
    });

    totalEntradas.innerHTML = moeda(totalMes);

    empresa.innerHTML = moeda(empresaMes);

    isaias.innerHTML = moeda(isaiasMes);

    evelyn.innerHTML = moeda(evelynMes);

    const fundoAtual = Math.max(0, fundoMes - totalPago);

    fundoSeparadoTotal.innerHTML = moeda(fundoAtual);

    const faltaSeparar = Math.max(
        0,
        (isaiasMes + evelynMes) - fundoMes
    );

    faltaSepararTotal.innerHTML = moeda(faltaSeparar);

    // Reaproveita o snapshot de movimentações já buscado acima —
    // evita repetir a mesma consulta só para montar o histórico.
    renderizarHistorico(snap);

}

function renderizarHistorico(snap) {

    listaEntradas.innerHTML = "";

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

    btnAdicionarFundo.disabled = true;
    btnAdicionarFundo.innerHTML = "Salvando...";

    try {

        const config = await carregarConfiguracoes();
        const [ano, mes] = mesReferencia.value.split("-");

        const dataReferencia = Timestamp.fromDate(
            new Date(Number(ano), Number(mes) - 1, 1)
        );

        const novoFundo = (config.fundoSeparado || 0) + valor;

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

        // Gravar o lançamento do fundo e atualizar a configuração
        // geral não dependem um do outro — rodam em paralelo.
        await Promise.all([
            addDoc(collection(db, "movimentacoes"), {
                tipo: "fundo",
                descricao: "Fundo Separado",
                valor: 0,
                empresa: 0,
                isaias: 0,
                evelyn: 0,
                fundoSeparado: valor,
                criadoEm: dataReferencia
            }),
            updateDoc(doc(db, "configuracoes", "geral"), {
                fundoSeparado: novoFundo,
                saldoDisponivelIsaias,
                saldoDisponivelEvellyn
            })
        ]);

        txtValorFundo.value = "";

        await carregarPainel();

        alert("Fundo atualizado com sucesso!");

    } catch (erro) {

        console.error(erro);

        alert("Erro ao atualizar o fundo.");

    } finally {

        btnAdicionarFundo.disabled = false;
        btnAdicionarFundo.innerHTML = textoOriginalBtnFundo;

    }

});

const hoje = new Date();

mesReferencia.value =
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

carregarPainel();

mesReferencia.addEventListener("change", () => {
    carregarPainel();
});
