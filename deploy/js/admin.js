import { iniciarGestao } from "./gestao.mjs?v=estrelas-anuais-1";
import { normalizarCliente, resumirPeriodo, periodoAnterior, detalharClienteAno } from "./desempenho.mjs?v=resumo-cliente-1";
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
const gestao = iniciarGestao({db,auth,mesReferencia,atualizarPainel:()=>carregarPainel(),moeda});

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

    const descricao = txtDescricao.value.trim() || txtClienteEntrada.value.trim() || "Entrada recebida";
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
    btnAtualizarPainel.querySelector(".action-label").textContent = "Atualizando…";
    btnAtualizarPainel.setAttribute("aria-busy","true");
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
    await carregarRelatorios();

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
        btnAtualizarPainel.querySelector(".action-label").textContent = "Atualizar";
        btnAtualizarPainel.removeAttribute("aria-busy");

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
    rankingMes.value = mesReferencia.value;
    rankingAno.value = mesReferencia.value.slice(0,4);
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
let movimentosDesempenho = [];
const rankingModo = document.getElementById("rankingModo");
const rankingMes = document.getElementById("rankingMes");
const rankingAno = document.getElementById("rankingAno");
rankingMes.value = mesReferencia.value;
function escaparHTML(valor){ return String(valor).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function estrelasTexto(cliente){ return "★".repeat(cliente.estrelas) + "☆".repeat(5-cliente.estrelas); }
function atualizarEstrelasEntrada(resumo, ano){
    const cliente = resumo.clientes.find(c => c.chave === normalizarCliente(txtClienteEntrada.value));
    document.getElementById("estrelasClienteEntrada").textContent = cliente ? estrelasTexto(cliente) : "Sem avaliação";
    document.getElementById("detalheEstrelasCliente").textContent = cliente
        ? `${moeda(cliente.total)} recebidos no ano ${ano} · ${cliente.entradas} entrada(s) anuais. A nova entrada só conta após guardar.`
        : "Sem recebimentos associados a este cliente no ano selecionado.";
}
function atualizarRanking(){
    const anual = rankingModo.value === "anual", periodo = anual ? rankingAno.value : rankingMes.value;
    document.getElementById("rankingMesLabel").hidden = anual;
    document.getElementById("rankingAnoLabel").hidden = !anual;
    const resumo = resumirPeriodo(movimentosDesempenho, rankingModo.value, periodo);
    const anoAvaliacao = periodo.slice(0,4);
    const resumoAnual = resumirPeriodo(movimentosDesempenho,"anual",anoAvaliacao);
    document.getElementById("criterioEstrelas").textContent = `Estrelas anuais (${anoAvaliacao}): 60% do valor recebido no ano + 40% da frequência anual, em relação aos líderes desse ano. A vista mensal não altera a avaliação. Sem histórico no ano, sem avaliação.`;
    const anterior = resumirPeriodo(movimentosDesempenho, rankingModo.value, periodoAnterior(rankingModo.value, periodo));
    document.getElementById("rankingPeriodoResumo").textContent = `Top 10 · ${anual ? periodo : periodo.slice(5)+"/"+periodo.slice(0,4)}`;
    document.getElementById("rankingClientes").innerHTML = resumo.clientes.length
        ? resumo.clientes.slice(0,10).map((c,i)=>`<li><span>${i+1}. <button type="button" class="cliente-resumo-link" data-cliente="${escaparHTML(c.nome)}" aria-label="Ver resumo anual de ${escaparHTML(c.nome)}">${escaparHTML(c.nome)}</button><small><span class="ranking-estrelas" aria-label="${c.estrelas} de 5 estrelas no ano ${anoAvaliacao}" title="Avaliação anual ${anoAvaliacao}: ${moeda(c.totalAnual)}, ${c.entradasAnuais} entradas">${estrelasTexto(c)}</span> · ${c.entradas} entrada(s)</small></span><b>${moeda(c.total)}</b></li>`).join("")
        : "<li>Não há recebimentos associados a clientes neste período.</li>";
    const notas = [];
    notas.push(`${moeda(resumo.total)} recebidos em ${resumo.quantidade} entrada(s). Valor médio por entrada: ${moeda(resumo.ticket)}.`);
    if(anterior.total > 0){
        const variacao = (resumo.total/anterior.total-1)*100;
        notas.push(`${variacao >= 0 ? "Acima" : "Abaixo"} do período anterior em ${Math.abs(variacao).toFixed(1)}%. O período atual pode estar incompleto; isto não é uma previsão.`);
    } else notas.push("Não há recebimentos no período anterior para calcular uma comparação.");
    const lider = resumo.clientes[0];
    if(lider && resumo.total > 0){
        const participacao = lider.total/resumo.total*100;
        notas.push(`${lider.nome} representa ${participacao.toFixed(1)}% das entradas. ${participacao >= 40 ? "Considere diversificar a carteira e acompanhar a recorrência dos outros clientes." : "Acompanhe os clientes recorrentes para manter o relacionamento."}`);
    }
    if(resumo.quantidade > 0 && !resumo.clientes.length) notas.push("Associe os recebimentos a clientes para obter um ranking útil.");
    const destino = document.getElementById("cenarioDesempenho"); destino.replaceChildren();
    notas.forEach(n=>{const p=document.createElement("p");p.textContent=n;destino.appendChild(p);});
    atualizarEstrelasEntrada(resumoAnual, anoAvaliacao);
}
[rankingModo,rankingMes,rankingAno].forEach(c=>c.addEventListener("change",atualizarRanking));
txtClienteEntrada.addEventListener("input",atualizarRanking);


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
                backgroundColor: "#8b35d2",
                borderRadius: 8
            }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: "#71667d" }, grid: { color: "#e9e2ef" } }, x: { ticks: { color: "#71667d" }, grid: { display: false } } } }
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
    listaClientes.innerHTML = [...clientes.values()].map((nome) => `<option value="${escaparHTML(nome)}"></option>`).join("");
    const porMes = new Map();
    movimentosDesempenho = [];
    movimentacoesSnap.forEach((item) => {
        const mov = item.data(); if (mov.tipo === "fundo" || !mov.valor || !mov.criadoEm) return;
        const data = mov.criadoEm.toDate(); const mes = `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,"0")}`;
        porMes.set(mes, (porMes.get(mes) || 0) + Number(mov.valor));
        const nome = (mov.clienteNome || clientes.get((mov.descricao || "").trim().toLowerCase()) || "").trim();
        movimentosDesempenho.push({...mov, data, clienteNome:nome});
    });
    const meses = [...porMes.keys()].sort().slice(-10);
    const canvas = document.getElementById("graficoMensal");
    if (canvas && window.Chart) {
        if (graficoMensal) graficoMensal.destroy();
        graficoMensal = new Chart(canvas, { type:"line", data:{labels:meses.map((m) => m.slice(5)+"/"+m.slice(0,4)),datasets:[{label:"Entradas por mês (€)",data:meses.map((m)=>porMes.get(m)),borderColor:"#8b35d2",backgroundColor:"rgba(139,53,210,.12)",fill:true,tension:.35}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{color:"#71667d"},grid:{color:"#e9e2ef"}},x:{ticks:{color:"#71667d"},grid:{display:false}}}} });
    }
    const nomesDisponiveis = new Map(clientes);
    movimentosDesempenho.forEach(m=>{if(m.clienteNome) nomesDisponiveis.set(normalizarCliente(m.clienteNome),m.clienteNome);});
    listaClientes.innerHTML = [...nomesDisponiveis.values()].map(nome=>`<option value="${escaparHTML(nome)}"></option>`).join("");
    const anos = [...new Set([String(new Date().getFullYear()), mesReferencia.value.slice(0,4), ...movimentosDesempenho.map(m=>String(m.data.getFullYear()))])].sort().reverse();
    const anoAnterior = rankingAno.value;
    rankingAno.replaceChildren(...anos.map(ano=>{const op=document.createElement("option");op.value=ano;op.textContent=ano;return op;}));
    rankingAno.value = anos.includes(anoAnterior) ? anoAnterior : mesReferencia.value.slice(0,4);
    atualizarRanking();
    await gestao.carregar(mesReferencia.value,movimentosDesempenho);
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
        const nomesEncontrados=new Set(encontrados.map(c=>normalizarCliente(c.nome)));
        movimentosDesempenho.forEach(m=>{const chave=normalizarCliente(m.clienteNome);if(chave && chave.includes(normalizarCliente(termo)) && !nomesEncontrados.has(chave)){encontrados.push({nome:m.clienteNome});nomesEncontrados.add(chave);}});
        resultadoCliente.innerHTML = encontrados.length
            ? encontrados.map((c) => `<button type="button" class="cliente-resumo-link" data-cliente="${escaparHTML(c.nome || "")}">${escaparHTML(c.nome || "Cliente sem nome")} · Ver resumo anual</button><br><span>${escaparHTML(c.telefone || "Sem contacto")}${c.email ? " · " + escaparHTML(c.email) : ""}</span>`).join("<hr>")
            : "Nenhum cliente encontrado.";
    } catch (erro) {
        console.error("Erro ao pesquisar clientes:", erro);
        resultadoCliente.innerText = "Não foi possível pesquisar agora.";
    }
});



const dialogoCliente=document.getElementById("resumoClienteDialog");
const seletorAnoCliente=document.getElementById("resumoClienteAno");
let clienteResumoAtual="", pedidoResumoCliente=0;
function renderizarResumoCliente(){
    if(!clienteResumoAtual)return;
    const agora=new Date(),r=detalharClienteAno(movimentosDesempenho,clienteResumoAtual,seletorAnoCliente.value,agora);
    document.getElementById("resumoClienteTotal").textContent=moeda(r.total);
    document.getElementById("resumoClienteCorte").textContent=`Ano ${r.ano} · até ${agora.toLocaleDateString("pt-PT")}; não inclui entradas futuras.`;
    document.getElementById("resumoClienteMetricas").textContent=`${r.quantidade} entrada(s) · valor médio: ${moeda(r.media)}.`;
    document.getElementById("resumoClienteStatus").textContent=r.quantidade?"Valores atualizados a partir dos registos.":"Não há entradas associadas a este cliente neste ano até à data atual.";
    const corpo=document.getElementById("resumoClienteMeses");corpo.replaceChildren();
    r.meses.forEach(m=>{const tr=document.createElement("tr");[new Date(r.ano,m.mes,1).toLocaleDateString("pt-PT",{month:"long"}),m.quantidade,moeda(m.total)].forEach(texto=>{const td=document.createElement("td");td.textContent=texto;tr.appendChild(td);});corpo.appendChild(tr);});
    if(!r.meses.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=3;td.textContent="Sem recebimentos no ano.";tr.appendChild(td);corpo.appendChild(tr);}
    const lista=document.getElementById("resumoClienteEntradas");lista.replaceChildren();
    r.entradas.forEach(m=>{const li=document.createElement("li"),texto=document.createElement("span"),valor=document.createElement("strong");texto.textContent=m.data.toLocaleDateString("pt-PT")+(m.descricao ? " · "+m.descricao : "");valor.textContent=moeda(Number(m.valor));li.append(texto,valor);lista.appendChild(li);});
    document.getElementById("resumoClienteConteudo").hidden=false;
}
async function abrirResumoCliente(nome,ano){
    if(!normalizarCliente(nome))return;
    const pedido=++pedidoResumoCliente;clienteResumoAtual=nome;
    document.getElementById("resumoClienteTitulo").textContent=nome;
    document.getElementById("resumoClienteConteudo").hidden=true;
    document.getElementById("resumoClienteStatus").textContent="A consultar os recebimentos…";seletorAnoCliente.disabled=true;
    if(!dialogoCliente.open)dialogoCliente.showModal();
    try{
        await carregarRelatorios();
        if(pedido!==pedidoResumoCliente || !dialogoCliente.open)return;
        const anos=[...new Set([String(new Date().getFullYear()),String(ano),...movimentosDesempenho.map(m=>String(m.data.getFullYear()))])].filter(a=>/^\d{4}$/.test(a)).sort().reverse();
        seletorAnoCliente.replaceChildren(...anos.map(a=>{const op=document.createElement("option");op.value=a;op.textContent=a;return op;}));
        seletorAnoCliente.value=anos.includes(String(ano))?String(ano):String(new Date().getFullYear());seletorAnoCliente.disabled=false;renderizarResumoCliente();
    }catch(erro){if(pedido!==pedidoResumoCliente)return;console.error("Erro ao consultar resumo do cliente:",erro);document.getElementById("resumoClienteStatus").textContent="Não foi possível consultar as entradas. Feche e tente novamente.";}
}
document.getElementById("fecharResumoCliente").addEventListener("click",()=>dialogoCliente.close());
dialogoCliente.addEventListener("close",()=>{pedidoResumoCliente++;clienteResumoAtual="";});
seletorAnoCliente.addEventListener("change",renderizarResumoCliente);
[document.getElementById("rankingClientes"),resultadoCliente].forEach(area=>area.addEventListener("click",e=>{const botao=e.target.closest("[data-cliente]");if(!botao)return;if(!normalizarCliente(botao.dataset.cliente)){resultadoCliente.textContent="O cliente precisa de um nome para associar os recebimentos.";return;}const ano=area.id==="rankingClientes" ? (rankingModo.value==="anual"?rankingAno.value:rankingMes.value.slice(0,4)) : mesReferencia.value.slice(0,4);abrirResumoCliente(botao.dataset.cliente,ano);}));

const botoesAbas = document.querySelectorAll("[data-aba]");
const areasAbas = document.querySelectorAll("[data-area]");

function abrirAba(nomeAba) {
    areasAbas.forEach((area) => area.classList.toggle("ativa", area.dataset.area === nomeAba));
    botoesAbas.forEach((botao) => botao.classList.toggle("ativa", botao.dataset.aba === nomeAba));
    window.scrollTo({ top: 0, behavior: "smooth" });
}

botoesAbas.forEach((botao) => botao.addEventListener("click", () => abrirAba(botao.dataset.aba)));
