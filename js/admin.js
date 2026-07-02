
// =====================================
// ISA Finance - Administração
// =====================================

import { db } from "./firebase.js";

import {

    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    serverTimestamp

} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const btnSalvar = document.getElementById("salvarEntrada");

const lista = document.getElementById("listaEntradas");

const totalEntradas = document.getElementById("totalEntradas");

const empresa = document.getElementById("empresa");

const isaias = document.getElementById("isaias");

const evelyn = document.getElementById("evelyn");

// =========================
// Formatar dinheiro
// =========================

function dinheiro(valor){

    return valor.toLocaleString("pt-PT",{

        style:"currency",

        currency:"EUR"

    });

}
// =========================
// Salvar entrada
// =========================

btnSalvar.addEventListener("click", async () => {

    const valor = Number(document.getElementById("valor").value);

    const descricao = document.getElementById("descricao").value.trim();

    if (!valor || valor <= 0) {

        alert("Informe um valor válido.");

        return;

    }

    try {

        await addDoc(collection(db, "entradas"), {

            valor: valor,

            descricao: descricao,

            data: serverTimestamp()

        });

        document.getElementById("valor").value = "";

        document.getElementById("descricao").value = "";

        carregarEntradas();

        alert("Entrada cadastrada com sucesso!");

    } catch (erro) {

        console.error(erro);

        alert("Erro ao salvar.");

    }

});

// =========================
// Carregar Entradas
// =========================

async function carregarEntradas() {

    lista.innerHTML = "";

    let total = 0;
    let totalEmpresa = 0;
    let totalIsaias = 0;
    let totalEvelyn = 0;

    const q = query(
        collection(db, "entradas"),
        orderBy("data", "desc")
    );

    const snapshot = await getDocs(q);

    snapshot.forEach((doc) => {

        const entrada = doc.data();

        const valor = Number(entrada.valor);

        total += valor;

        // Regra de divisão
        const percentual = total <= 5000 ? 0.12 : 0.20;

        const parteIsaias = valor * percentual;
        const parteEvelyn = valor * percentual;
        const parteEmpresa = valor - parteIsaias - parteEvelyn;

        totalEmpresa += parteEmpresa;
        totalIsaias += parteIsaias;
        totalEvelyn += parteEvelyn;

        const data = entrada.data?.toDate
            ? entrada.data.toDate().toLocaleDateString("pt-PT")
            : "-";

        lista.innerHTML += `
            <tr>
                <td>${data}</td>
                <td>${entrada.descricao || "-"}</td>
                <td>${dinheiro(valor)}</td>
                <td>${dinheiro(parteEmpresa)}</td>
                <td>${dinheiro(parteIsaias)}</td>
                <td>${dinheiro(parteEvelyn)}</td>
            </tr>
        `;

    });

    totalEntradas.textContent = dinheiro(total);
    empresa.textContent = dinheiro(totalEmpresa);
    isaias.textContent = dinheiro(totalIsaias);
    evelyn.textContent = dinheiro(totalEvelyn);

}

// =========================
// Inicialização
// =========================

carregarEntradas();

// Atualiza a lista a cada 10 segundos
setInterval(() => {

    carregarEntradas();

}, 10000);
