export const URL_API = "https://ifsp.trojahn.uk/redesocial";

export function salvarSessao(token, usuario) {
    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(usuario));
}

export function pegarToken() {
    return localStorage.getItem("token");
}

export function pegarUsuario() {
    const dados = localStorage.getItem("usuario");
    if (!dados) return null;
    return JSON.parse(dados);
}

export function sairSessao(caminhoLogin = null) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    if (caminhoLogin) {
        window.location.href = caminhoLogin;
    }
}

export async function chamarApi(rota, metodo = "GET", corpo = null, precisaToken = true) {
    const cabecalhos = {
        "Content-Type": "application/json"
    };

    if (precisaToken) {
        const token = pegarToken();
        if (token) {
            cabecalhos["Authorization"] = `Bearer ${token}`;
        }
    }

    const opcoes = {
        method: metodo,
        headers: cabecalhos
    };

    if (corpo !== null) {
        opcoes.body = JSON.stringify(corpo);
    }

    const resposta = await fetch(URL_API + rota, opcoes);
    const dados = await resposta.json();

    if (!resposta.ok) {
        const erro = new Error(dados.msg || "Erro na requisição");
        erro.status = resposta.status;
        throw erro;
    }

    return dados;
}

export async function verificarAutenticacao() {
    const token = pegarToken();

    if (!token) {
        window.location.replace("../index.html");
        return false;
    }

    try {
        await chamarApi("/usuarios/check", "GET", null, true);
        return true;
    } catch (erro) {
        sairSessao();
        window.location.replace("../index.html");
        return false;
    }
}