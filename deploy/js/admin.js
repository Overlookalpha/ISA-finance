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
    serverTimestamp,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { verificarLogin } from "./auth.js";

verificarLogin();
auth.onAuthStateChanged(async (user) => {

    if (!user) return;

    try {
        const q = query(
            collection(db, "usuarios"),
            where("email", "==", user.email)
        );

        const resultado = await getDocs(q);

        if (!resultado.empty) {
            const usuario = resultado.docs[0].data();

            document.getElementById("nomeUsuario").innerHTML =
                `👤 ${usuario.nome}`;

            document.getElementById("tipoUsuario").innerHTML =
                "🛠️ Administrador";
        }
    } catch (erro) {
        console.error("Erro ao carregar identificação do admin:", erro);
    }

    await carregarPainel();

});
// =============================
// ELEMENTOS
// =============================

const btnSalvar = document.getElementById("salvarEntrada");
const textoOriginalBtnSalvar = btnSalvar.innerHTML;

const txtValor = document.getElementById("valor");

const txtDescricao = document.getElementById("descricao");
const txtObservacaoEntrada = document.getElementById("observacaoEntrada");
const txtClienteEntrada = document.getElementById("clienteEntrada");

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
const btnAtualizarPainel = document.getElementById("btnAtualizarPainel");
const statusAtualizacao = document.getElementById("statusAtualizacao");

let painelCarregando = false;
let recarregamentoPendente = false;
let ultimoCarregamento = 0;

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
    const observacao = txtObservacaoEntrada.value.trim();
    const clienteNome = txtClienteEntrada.value.trim();

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

        const percentual = 12;

        const valorUsuario = valor * 0.12;

        const valorEmpresa = valor - (valorUsuario * 2);

        // O lançamento e os saldos precisam ser uma única operação: duas
        // entradas salvas ao mesmo tempo não podem sobrescrever os totais.
        await runTransaction(db, async (transaction) => {
            const configRef = doc(db, "configuracoes", "geral");
            const configSnap = await transaction.get(configRef);

            if (!configSnap.exists()) {
                throw new Error("Configuração geral não encontrada.");
            }

            const config = configSnap.data();
            const movimentacaoRef = doc(collection(db, "movimentacoes"));

            transaction.set(movimentacaoRef, {
                tipo: "entrada",
                valor: valor,
                descricao: descricao,
                observacao,
                clienteNome,
                fundoSeparado: fundoSeparado,
                percentual: percentual,
                empresa: valorEmpresa,
                isaias: valorUsuario,
                evelyn: valorUsuario,
                criadoEm: serverTimestamp()
            });

            transaction.update(configRef, {
                totalEntradas: (config.totalEntradas || 0) + valor,
                empresa: (config.empresa || 0) + valorEmpresa,
                saldoIsaias: (config.saldoIsaias || 0) + valorUsuario,
                saldoEvellyn: (config.saldoEvellyn || 0) + valorUsuario
            });
        });

        txtValor.value = "";
        txtDescricao.value = "";
        txtObservacaoEntrada.value = "";
        txtClienteEntrada.value = "";

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

async function carregarPainel(mostrarErro = false){

    // Em telemóveis é comum o utilizador mudar o mês enquanto a primeira
    // consulta ainda está a terminar. Guarda essa intenção para que o painel
    // atualize o último mês selecionado assim que ficar livre.
    if (painelCarregando) {
        recarregamentoPendente = true;
        return;
    }

    painelCarregando = true;
    btnAtualizarPainel.disabled = true;
    btnAtualizarPainel.innerHTML = "🔄 Atualizando...";
    statusAtualizacao.innerText = "Buscando dados...";

    if (!listaEntradas.children.length) {
        listaEntradas.innerHTML = `
            <tr><td colspan="7">Carregando histórico...</td></tr>
        `;
    }

    try {

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

    // "Falta separar" mede somente o que ainda não foi transferido para o
    // fundo. Pagamentos já feitos são controlados separadamente e não mudam
    // este cartão.
    const faltaSeparar = Math.max(
        0,
        (isaiasMes + evelynMes) - fundoMes
    );

    faltaSepararTotal.innerHTML = moeda(faltaSeparar);

    // Reaproveita o snapshot de movimentações já buscado acima —
    // evita repetir a mesma consulta só para montar o histórico.
    renderizarHistorico(snap);
    atualizarRecursosPainel(totalMes, snap);
    carregarRelatorios();

    ultimoCarregamento = Date.now();
    statusAtualizacao.innerText = "Atualizado agora";

    } catch (erro) {

        console.error("Erro ao atualizar painel:", erro);
        statusAtualizacao.innerText = "Falha ao atualizar. Toque em Atualizar tela.";

        if (listaEntradas.textContent.includes("Carregando histórico")) {
            listaEntradas.innerHTML = `
                <tr><td colspan="7">Não foi possível carregar o histórico.</td></tr>
            `;
        }

        if (mostrarErro) {
            alert("Não foi possível atualizar agora. Verifique a internet e tente novamente.");
        }

    } finally {

        painelCarregando = false;
        btnAtualizarPainel.disabled = false;
        btnAtualizarPainel.innerHTML = "🔄 Atualizar tela";

        if (recarregamentoPendente) {
            recarregamentoPendente = false;
            carregarPainel(mostrarErro);
        }

    }

}

function renderizarHistorico(snap) {

    listaEntradas.innerHTML = "";

    if (snap.empty) {
        listaEntradas.innerHTML = `
            <tr><td colspan="7">Nenhuma movimentação neste mês.</td></tr>
        `;
        return;
    }

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
                <td>${m.observacao || "-"}</td>
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

btnAtualizarPainel.addEventListener("click", () => {
    carregarPainel(true);
});

mesReferencia.addEventListener("change", () => {
    carregarPainel();
});

window.addEventListener("online", () => {
    if (auth.currentUser) carregarPainel();
});

document.addEventListener("visibilitychange", () => {
    const voltouParaTela = document.visibilityState === "visible";
    const precisaAtualizar = Date.now() - ultimoCarregamento > 10000;

    if (voltouParaTela && precisaAtualizar && auth.currentUser) {
        carregarPainel();
    }
});

// Recursos visuais adicionados sem interferir no fluxo financeiro existente.
let graficoDesempenho;
let graficoMensal;

function atualizarRecursosPainel(total, movimentacoes) {
    const canvas = document.getElementById("graficoDesempenho");
    if (!canvas || !window.Chart) return;

    if (graficoDesempenho) graficoDesempenho.destroy();
    const porDia = new Map();
    movimentacoes.forEach((docMov) => {
        const entrada = docMov.data();
        if (entrada.tipo === "fundo" || !entrada.criadoEm) return;
        const dia = entrada.criadoEm.toDate().toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
        porDia.set(dia, (porDia.get(dia) || 0) + Number(entrada.valor || 0));
    });
    const labels = [...porDia.keys()];
    const valores = [...porDia.values()];

    graficoDesempenho = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Entradas por dia (€)",
                data: valores,
                backgroundColor: "#38bdf8",
                borderRadius: 8
            }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: "#cbd5e1" }, grid: { color: "#334155" } }, x: { ticks: { color: "#cbd5e1" }, grid: { display: false } } } }
    });

    document.getElementById("insightTitulo").innerText = total ? "Entradas registadas por dia." : "Ainda não há entradas neste mês.";
    document.getElementById("insightTexto").innerText = total ? `Foram registados ${moeda(total)} no período selecionado.` : "Registe uma nova entrada para ver o desempenho.";
    document.getElementById("periodoGrafico").innerText = mesReferencia.value || "Período";
}

async function carregarRelatorios() {
    const [movimentacoesSnap, clientesSnap] = await Promise.all([
        getDocs(collection(db, "movimentacoes")), getDocs(collection(db, "clientes"))
    ]);
    const clientes = new Map();
    clientesSnap.forEach((item) => clientes.set((item.data().nome || "").trim().toLowerCase(), item.data().nome || "Cliente"));
    const listaClientes = document.getElementById("clientesEntrada");
    listaClientes.innerHTML = [...clientes.values()].map((nome) => `<option value="${nome}"></option>`).join("");
    const porMes = new Map(); const porCliente = new Map();
    movimentacoesSnap.forEach((item) => {
        const mov = item.data(); if (mov.tipo === "fundo" || !mov.valor || !mov.criadoEm) return;
        const data = mov.criadoEm.toDate(); const mes = `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,"0")}`;
        porMes.set(mes, (porMes.get(mes) || 0) + Number(mov.valor));
        const nome = (mov.clienteNome || clientes.get((mov.descricao || "").trim().toLowerCase()) || "").trim();
        if (nome) porCliente.set(nome, (porCliente.get(nome) || 0) + Number(mov.valor));
    });
    const meses = [...porMes.keys()].sort().slice(-10);
    const canvas = document.getElementById("graficoMensal");
    if (canvas && window.Chart) {
        if (graficoMensal) graficoMensal.destroy();
        graficoMensal = new Chart(canvas, { type:"line", data:{labels:meses.map((m) => m.slice(5)+"/"+m.slice(0,4)),datasets:[{label:"Entradas por mês (€)",data:meses.map((m)=>porMes.get(m)),borderColor:"#38bdf8",backgroundColor:"rgba(56,189,248,.18)",fill:true,tension:.35}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{color:"#cbd5e1"},grid:{color:"#334155"}},x:{ticks:{color:"#cbd5e1"},grid:{display:false}}}} });
    }
    const ranking = [...porCliente.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
    document.getElementById("rankingClientes").innerHTML = ranking.length ? ranking.map(([nome,valor],i)=>`<li><span>${i+1}. <strong>${nome}</strong></span><b>${moeda(valor)}</b></li>`).join("") : "<li>As novas entradas podem ser associadas a um cliente para formar o ranking.</li>";
}

document.getElementById("btnRelatorios").addEventListener("click", () => document.getElementById("relatoriosFinanceiros").scrollIntoView({behavior:"smooth"}));

const buscaCliente = document.getElementById("buscaCliente");
const resultadoCliente = document.getElementById("resultadoCliente");

document.getElementById("btnBuscarCliente").addEventListener("click", async () => {
    const termo = buscaCliente.value.trim().toLowerCase();
    if (!termo) return resultadoCliente.innerText = "Digite um nome, telefone ou e-mail para pesquisar.";
    resultadoCliente.innerText = "A pesquisar clientes…";
    try {
        const clientes = await getDocs(collection(db, "clientes"));
        const encontrados = [];
        clientes.forEach((cliente) => {
            const dados = cliente.data();
            const texto = `${dados.nome || ""} ${dados.telefone || ""} ${dados.email || ""}`.toLowerCase();
            if (texto.includes(termo)) encontrados.push(dados);
        });
        resultadoCliente.innerHTML = encontrados.length
            ? encontrados.map((c) => `<strong>${c.nome || "Cliente sem nome"}</strong><br><span>${c.telefone || "Sem contacto"}${c.email ? " · " + c.email : ""}</span>`).join("<hr>")
            : "Nenhum cliente encontrado.";
    } catch (erro) {
        console.error("Erro ao pesquisar clientes:", erro);
        resultadoCliente.innerText = "Não foi possível pesquisar agora.";
    }
});


const botoesAbas = document.querySelectorAll("[data-aba]");
const areasAbas = document.querySelectorAll("[data-area]");

function abrirAba(nomeAba) {
    areasAbas.forEach((area) => area.classList.toggle("ativa", area.dataset.area === nomeAba));
    botoesAbas.forEach((botao) => botao.classList.toggle("ativa", botao.dataset.aba === nomeAba));
    window.scrollTo({ top: 0, behavior: "smooth" });
}

botoesAbas.forEach((botao) => botao.addEventListener("click", () => abrirAba(botao.dataset.aba)));
