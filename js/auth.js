// ===============================
// Login ISA Finance
// ===============================

document.getElementById("entrar").addEventListener("click", async () => {

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    if (!email || !senha) {
        alert("Informe e-mail e senha.");
        return;
    }

   try {

    await auth.signInWithEmailAndPassword(email, senha);

    if (email === "admin@isafinance.com") {
        window.location.href = "dashboard-admin.html";
    } else {
        window.location.href = "dashboard-usuario.html";
    }

} catch (erro) {
    console.error(erro);
    alert(JSON.stringify({
  code: erro.code,
  message: erro.message
}));
}

});
