import { chamarApi, pegarToken, sairSessao, salvarSessao } from "./api.js";

const estaNaPastaHtml = window.location.pathname.includes("/html/");
const caminhoFeed = estaNaPastaHtml ? "feed.html" : "html/feed.html";

//token salvo e valido vai pro feed
async function verificarSeJaEstaLogado() {
    const token = pegarToken();
    if (!token) return;

    try {
        await chamarApi("/usuarios/check", "GET", null, true);
        window.location.replace(caminhoFeed);
    } catch (erro) {
        sairSessao();
    }
}

verificarSeJaEstaLogado();

//erro na tela sem alert
function mostrarErro(texto) {
    const msgErro = document.getElementById("msg-erro");
    if (!msgErro) return;
    msgErro.textContent = texto;
    msgErro.classList.remove("escondido");
}

const formLogin = document.getElementById("form-login");

if (formLogin) {
    formLogin.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const login = document.getElementById("login-usuario").value.trim();
        const senha = document.getElementById("login-senha").value;

        try {
            const resposta = await chamarApi("/usuarios/login", "POST", { login, senha }, false);

            salvarSessao(resposta.token, resposta.usuario);
            window.location.href = caminhoFeed;
        } catch (erro) {
            if (erro.status === 400 || erro.status === 403) {
                mostrarErro("Login ou senha inválidos.");
            } else {
                mostrarErro("Erro ao conectar com o servidor.");
            }
        }
    });
}

const formCadastro = document.getElementById("form-cadastro");

if (formCadastro) {
    const inputFotoUrl = document.getElementById("cadastro-foto-url");
    const previewFoto = document.getElementById("preview-foto");
    const textoFoto = document.getElementById("texto-foto");

    inputFotoUrl.addEventListener("input", () => {
        const url = inputFotoUrl.value.trim();
        if (url) {
            previewFoto.src = url;
            previewFoto.classList.remove("escondido");
            textoFoto.classList.add("escondido");
        } else {
            previewFoto.classList.add("escondido");
            textoFoto.classList.remove("escondido");
        }
    });

    previewFoto.addEventListener("error", () => {
        previewFoto.classList.add("escondido");
        textoFoto.classList.remove("escondido");
    });

    formCadastro.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const login = document.getElementById("cadastro-login").value.trim();
        const senha = document.getElementById("cadastro-senha").value;
        const nome = document.getElementById("cadastro-nome").value.trim();
        const img = inputFotoUrl.value.trim();

        const novoUsuario = {
            login,
            senha,
            nome,
            img
        };

        try {
            await chamarApi("/usuarios/", "POST", novoUsuario, false);

            // login aut pós-cadastro
            const respostaLogin = await chamarApi("/usuarios/login", "POST", { login, senha }, false);
            salvarSessao(respostaLogin.token, respostaLogin.usuario);
            window.location.href = caminhoFeed;
        } catch (erro) {
            if (erro.status === 400) {
                mostrarErro(erro.message || "Dados inválidos ou login já existente.");
            } else {
                mostrarErro("Erro ao realizar cadastro.");
            }
        }
    });
}