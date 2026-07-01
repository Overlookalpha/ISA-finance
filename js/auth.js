document.addEventListener("DOMContentLoaded", () => {

    const email = document.getElementById("email");
    const senha = document.getElementById("senha");
    const entrar = document.getElementById("entrar");

    entrar.addEventListener("click", async () => {

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
                alert("Usuário não existe no Firestore.");
                return;
            }

            const dados = doc.data();

            if (dados.tipo === "admin") {

                window.location = "admin/index.html";

            } else {

                window.location = "app/index.html";

            }

        } catch (e) {

            console.error(e);
            alert(e.message);

        }

    });

});
