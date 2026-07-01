// auth.js

document.addEventListener("DOMContentLoaded", () => {

    const email = document.getElementById("email");
    const senha = document.getElementById("senha");
    const entrar = document.getElementById("btnEntrar");

    entrar.addEventListener("click", async () => {

        if (!email.value || !senha.value) {
            alert("Informe e-mail e senha.");
            return;
        }

        try {

            const cred = await firebase.auth().signInWithEmailAndPassword(
                email.value.trim(),
                senha.value
            );

            console.log("Login realizado:", cred.user.uid);

            const doc = await firebase.firestore()
                .collection("usuarios")
                .doc(cred.user.uid)
                .get();

            if (!doc.exists) {
                alert("Usuário não encontrado no Firestore.");
                await firebase.auth().signOut();
                return;
            }

            const dados = doc.data();

            if (dados.tipo !== "admin") {
                alert("Acesso permitido apenas para administradores.");
                await firebase.auth().signOut();
                return;
            }

            location.href = "admin/index.html";

        } catch (e) {
            console.error(e);
            alert(e.message);
        }

    });

});
