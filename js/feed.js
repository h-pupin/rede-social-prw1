import { chamarApi, pegarUsuario, sairSessao, verificarAutenticacao } from "./api.js";

let usuarioLogado = null;
let todosPosts = [];
let usuariosPorId = {};
let filtroUsuarioId = null;
let acaoExclusaoPendente = null;

function escaparHtml(texto) {
    if (!texto) return "";
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

function urlImagemValida(url) {
    if (!url || typeof url !== "string") return false;
    const limpa = url.trim();
    return limpa.startsWith("http://") || limpa.startsWith("https://") || limpa.startsWith("data:image/");
}

function formatarData(isoString) {
    if (!isoString) return "";
    const data = new Date(isoString);
    return data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function renderizarAvatar(elemento, usuario) {
    if (!elemento) return;
    const inicial = usuario && usuario.nome ? usuario.nome.charAt(0).toUpperCase() : "?";

    if (usuario && urlImagemValida(usuario.img)) {
        elemento.innerHTML = `<img src="${escaparHtml(usuario.img.trim())}" alt="${escaparHtml(usuario.nome)}">`;
        const imgEl = elemento.querySelector("img");
        imgEl.addEventListener("error", () => {
            elemento.textContent = inicial;
        });
    } else {
        elemento.textContent = inicial;
    }
}

async function iniciarFeed() {
    const autenticado = await verificarAutenticacao("../index.html");
    if (!autenticado) return;

    //exibição da página so dps de confirmar o token
    document.body.classList.remove("escondido");

    usuarioLogado = pegarUsuario();

    //dados no topo e coluna esquerda
    document.getElementById("topo-nome").textContent = usuarioLogado.nome;
    document.getElementById("perfil-nome").textContent = usuarioLogado.nome;
    document.getElementById("perfil-login").textContent = `@${usuarioLogado.login}`;
    renderizarAvatar(document.getElementById("topo-avatar"), usuarioLogado);
    renderizarAvatar(document.getElementById("perfil-avatar"), usuarioLogado);

    configurarEventos();
    await carregarDados();
}

async function carregarDados() {
    try {
        const listaUsuarios = await chamarApi("/usuarios/", "GET", null, true);
        usuariosPorId = {};
        listaUsuarios.forEach((u) => {
            usuariosPorId[u.id] = u;
        });
        renderizarListaUsuarios(listaUsuarios);
    } catch (erro) {
        console.error("Erro ao carregar usuários:", erro);
    }

    try {
        const posts = await chamarApi("/posts/", "GET", null, true);
        //mais novo pro mais velho
        todosPosts = Array.isArray(posts)
            ? posts.sort((a, b) => new Date(b.data) - new Date(a.data))
            : [];
    } catch (erro) {
        // retorno 400 quando nao tem post
        if (erro.status === 400) {
            todosPosts = [];
        } else {
            console.error("Erro ao carregar posts:", erro);
            todosPosts = [];
        }
    }

    atualizarEstatisticas();
    renderizarPosts();
}

function atualizarEstatisticas() {
    const qtdMeusPosts = todosPosts.filter((p) => p.usuario === usuarioLogado.id).length;
    let qtdLikesDados = 0;

    todosPosts.forEach((p) => {
        if (Array.isArray(p.likes) && p.likes.some((l) => l.usuario === usuarioLogado.id)) {
            qtdLikesDados++;
        }
    });

    document.getElementById("stat-posts").textContent = qtdMeusPosts;
    document.getElementById("stat-likes").textContent = qtdLikesDados;
}

function renderizarListaUsuarios(usuarios) {
    const ul = document.getElementById("lista-usuarios");
    ul.innerHTML = "";

    usuarios.forEach((u) => {
        const li = document.createElement("li");
        li.className = "item-usuario-lateral";
        if (filtroUsuarioId === u.id) li.classList.add("selecionado");

        const avatarDiv = document.createElement("div");
        avatarDiv.className = "avatar-usuario-lista";
        renderizarAvatar(avatarDiv, u);

        const infoDiv = document.createElement("div");
        infoDiv.innerHTML = `
            <div class="usuario-lateral-nome">${escaparHtml(u.nome)}</div>
            <div class="usuario-lateral-login">@${escaparHtml(u.login)}</div>
        `;

        li.appendChild(avatarDiv);
        li.appendChild(infoDiv);

        li.addEventListener("click", () => {
            if (filtroUsuarioId === u.id) {
                aplicarFiltro(null);
            } else {
                aplicarFiltro(u.id);
            }
        });

        ul.appendChild(li);
    });
}

function aplicarFiltro(idUsuario) {
    filtroUsuarioId = idUsuario;

    const btnTodos = document.getElementById("btn-todos-posts");
    const btnMeus = document.getElementById("btn-meus-posts");
    const barraFiltro = document.getElementById("barra-filtro");
    const textoFiltro = document.getElementById("texto-filtro");

    btnTodos.classList.toggle("ativo", filtroUsuarioId === null);
    btnMeus.classList.toggle("ativo", filtroUsuarioId === usuarioLogado.id);

    if (filtroUsuarioId !== null) {
        const autor = usuariosPorId[filtroUsuarioId];
        textoFiltro.textContent = `Mostrando posts de: ${autor ? autor.nome : "Usuário"}`;
        barraFiltro.classList.remove("escondido");
    } else {
        barraFiltro.classList.add("escondido");
    }

    renderizarListaUsuarios(Object.values(usuariosPorId));
    renderizarPosts();
}

function renderizarPosts() {
    const container = document.getElementById("lista-posts");
    container.innerHTML = "";

    const postsFiltrados = filtroUsuarioId !== null
        ? todosPosts.filter((p) => p.usuario === filtroUsuarioId)
        : todosPosts;

    if (postsFiltrados.length === 0) {
        container.innerHTML = `<p class="estado-vazio">Nenhum post encontrado por aqui.</p>`;
        return;
    }

    postsFiltrados.forEach((post) => {
        const autor = usuariosPorId[post.usuario] || { nome: `Usuário #${post.usuario}`, login: "usuario", img: "" };
        const ehMeuPost = post.usuario === usuarioLogado.id;
        const likes = Array.isArray(post.likes) ? post.likes : [];
        const comentarios = Array.isArray(post.comentarios) ? post.comentarios : [];
        const euCurti = likes.some((l) => l.usuario === usuarioLogado.id);

        const artigo = document.createElement("article");
        artigo.className = "card-post";

        const botoesDonoHtml = ehMeuPost
            ? `
                <div class="post-acoes-dono">
                    <button type="button" class="btn-acao-pequeno btn-editar-post">Editar</button>
                    <button type="button" class="btn-acao-pequeno excluir btn-excluir-post">Excluir</button>
                </div>
            `
            : "";

        const imagemPostHtml = urlImagemValida(post.img)
            ? `<img src="${escaparHtml(post.img.trim())}" class="post-imagem" alt="Imagem do post">`
            : "";

        const tagEditado = post.editado ? " • (editado)" : "";

        artigo.innerHTML = `
            <div class="post-cabecalho">
                <div class="post-autor-info">
                    <div class="avatar-post"></div>
                    <div>
                        <div class="post-autor-nome">${escaparHtml(autor.nome)}</div>
                        <div class="post-meta">@${escaparHtml(autor.login)} • ${formatarData(post.data)}${tagEditado}</div>
                    </div>
                </div>
                ${botoesDonoHtml}
            </div>

            ${post.texto ? `<p class="post-texto">${escaparHtml(post.texto)}</p>` : ""}
            ${imagemPostHtml}

            <div class="post-rodape">
                <button type="button" class="btn-like ${euCurti ? "curtido" : ""}" title="${euCurti ? "Remover curtida" : "Curtir"}">
                    <svg class="icone-like" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span>${likes.length}</span>
                </button>
                <span class="contador-comentarios">${comentarios.length} comentário(s)</span>
            </div>

            <div class="secao-comentarios">
                <div class="lista-comentarios"></div>
                <form class="form-comentario">
                    <input type="text" placeholder="Escreva um comentário..." required>
                    <button type="submit" class="btn-secundario">Enviar</button>
                </form>
            </div>
        `;

        renderizarAvatar(artigo.querySelector(".avatar-post"), autor);

        const imgPostEl = artigo.querySelector(".post-imagem");
        if (imgPostEl) {
            imgPostEl.addEventListener("error", () => imgPostEl.remove());
        }

        // eventos post(like,editar,excluir)
        artigo.querySelector(".btn-like").addEventListener("click", () => alternarLike(post.id));

        if (ehMeuPost) {
            artigo.querySelector(".btn-editar-post").addEventListener("click", () => abrirModalEdicao(post));
            artigo.querySelector(".btn-excluir-post").addEventListener("click", () => excluirPost(post.id));
        }

        // comentários do post
        const listaComentariosEl = artigo.querySelector(".lista-comentarios");
        comentarios.forEach((comentario) => {
            listaComentariosEl.appendChild(criarElementoComentario(comentario));
        });

        // criar novo comentário
        const formComentario = artigo.querySelector(".form-comentario");
        formComentario.addEventListener("submit", async (e) => {
            e.preventDefault();
            const input = formComentario.querySelector("input");
            const texto = input.value.trim();
            if (!texto) return;

            try {
                await chamarApi(`/posts/${post.id}/comentarios`, "POST", { texto }, true);
                input.value = "";
                await carregarDados();
            } catch (erro) {
                alert("Erro ao enviar comentário.");
            }
        });

        container.appendChild(artigo);
    });
}

function criarElementoComentario(comentario) {
    const autor = usuariosPorId[comentario.usuario] || { nome: `Usuário #${comentario.usuario}`, img: "" };
    const ehMeuComentario = comentario.usuario === usuarioLogado.id;
    const tagEditado = comentario.editado ? " (editado)" : "";

    const item = document.createElement("div");
    item.className = "item-comentario";

    const acoesComentario = ehMeuComentario
        ? `
            <div class="post-acoes-dono">
                <button type="button" class="btn-acao-pequeno btn-editar-coment">Editar</button>
                <button type="button" class="btn-acao-pequeno excluir btn-excluir-coment">Excluir</button>
            </div>
        `
        : "";

    item.innerHTML = `
        <div class="comentario-topo">
            <div class="comentario-autor-info">
                <div class="avatar-comentario"></div>
                <div>
                    <span class="comentario-autor">${escaparHtml(autor.nome)}</span>
                    <span class="comentario-data">${formatarData(comentario.data)}${tagEditado}</span>
                </div>
            </div>
            ${acoesComentario}
        </div>
        <div class="comentario-texto">${escaparHtml(comentario.texto)}</div>
    `;

    renderizarAvatar(item.querySelector(".avatar-comentario"), autor);

    if (ehMeuComentario) {
        item.querySelector(".btn-editar-coment").addEventListener("click", () => {
            abrirModalComentario(comentario);
        });

        item.querySelector(".btn-excluir-coment").addEventListener("click", () => {
            abrirModalExclusao(
                "Excluir comentário",
                "Tem certeza que deseja excluir este comentário?",
                async () => {
                    await chamarApi(`/comentarios/${comentario.id}`, "DELETE", null, true);
                    await carregarDados();
                }
            );
        });
    }

    return item;
}

async function alternarLike(postId) {
    try {
        await chamarApi(`/posts/${postId}/likes`, "POST", null, true);
        await carregarDados();
    } catch (erro) {
        console.error("Erro ao curtir/descurtir:", erro);
    }
}

function excluirPost(postId) {
    abrirModalExclusao(
        "Excluir post",
        "Tem certeza que deseja excluir este post? Essa ação não pode ser desfeita.",
        async () => {
            await chamarApi(`/posts/${postId}`, "DELETE", null, true);
            await carregarDados();
        }
    );
}

function abrirModalEdicao(post) {
    document.getElementById("editar-post-id").value = post.id;
    document.getElementById("editar-post-texto").value = post.texto || "";
    document.getElementById("editar-post-input-img").value = post.img || "";
    document.getElementById("status-img-edicao").textContent = post.img
        ? "Edite ou apague o link da foto acima."
        : "Cole um link se quiser adicionar foto.";

    document.getElementById("modal-editar-post").classList.remove("escondido");
}

function fecharModalEdicao() {
    document.getElementById("modal-editar-post").classList.add("escondido");
}

function abrirModalComentario(comentario) {
    document.getElementById("editar-comentario-id").value = comentario.id;
    document.getElementById("editar-comentario-texto").value = comentario.texto || "";
    document.getElementById("modal-editar-comentario").classList.remove("escondido");
    document.getElementById("editar-comentario-texto").focus();
}

function fecharModalComentario() {
    document.getElementById("modal-editar-comentario").classList.add("escondido");
}

function abrirModalExclusao(titulo, mensagem, callbackConfirmar) {
    document.getElementById("titulo-confirmar-exclusao").textContent = titulo;
    document.getElementById("texto-confirmar-exclusao").textContent = mensagem;
    acaoExclusaoPendente = callbackConfirmar;
    document.getElementById("modal-confirmar-exclusao").classList.remove("escondido");
}

function fecharModalExclusao() {
    acaoExclusaoPendente = null;
    document.getElementById("modal-confirmar-exclusao").classList.add("escondido");
}

function configurarEventos() {
    // Sair
    const btnSair = document.getElementById("btn-sair");
    if (btnSair) {
        btnSair.addEventListener("click", () => {
            sairSessao("../index.html");
            window.location.href = "../index.html";
        });
    }

    // filtro lateral
    document.getElementById("btn-todos-posts").addEventListener("click", () => aplicarFiltro(null));
    document.getElementById("btn-meus-posts").addEventListener("click", () => aplicarFiltro(usuarioLogado.id));
    document.getElementById("btn-limpar-filtro").addEventListener("click", () => aplicarFiltro(null));

    // previa foto quando cria post
    const btnToggleUrl = document.getElementById("btn-toggle-url-post");
    const grupoUrlPost = document.getElementById("grupo-url-post");
    const inputImgPost = document.getElementById("input-img-post");
    const areaPreview = document.getElementById("area-preview-post");
    const imgPreview = document.getElementById("img-preview-post");

    btnToggleUrl.addEventListener("click", () => {
        grupoUrlPost.classList.toggle("escondido");
        if (!grupoUrlPost.classList.contains("escondido")) {
            inputImgPost.focus();
        }
    });

    inputImgPost.addEventListener("input", () => {
        const url = inputImgPost.value.trim();
        if (url) {
            imgPreview.src = url;
            areaPreview.classList.remove("escondido");
        } else {
            areaPreview.classList.add("escondido");
        }
    });

    imgPreview.addEventListener("error", () => {
        areaPreview.classList.add("escondido");
    });

    document.getElementById("btn-remover-img-post").addEventListener("click", () => {
        inputImgPost.value = "";
        areaPreview.classList.add("escondido");
        grupoUrlPost.classList.add("escondido");
    });

    // novo post
    document.getElementById("form-novo-post").addEventListener("submit", async (e) => {
        e.preventDefault();

        const textarea = document.getElementById("texto-novo-post");
        const erroPost = document.getElementById("erro-post");
        const texto = textarea.value.trim();
        const img = inputImgPost.value.trim();

        if (!texto && !img) {
            erroPost.textContent = "Escreva um texto ou cole o link de uma foto para publicar.";
            erroPost.classList.remove("escondido");
            return;
        }

        erroPost.classList.add("escondido");

        try {
            await chamarApi("/posts/", "POST", { texto, img }, true);

            textarea.value = "";
            inputImgPost.value = "";
            areaPreview.classList.add("escondido");
            grupoUrlPost.classList.add("escondido");

            await carregarDados();
        } catch (erro) {
            erroPost.textContent = "Erro ao publicar post.";
            erroPost.classList.remove("escondido");
        }
    });

    // editar post
    document.getElementById("btn-cancelar-edicao").addEventListener("click", fecharModalEdicao);

    document.getElementById("form-editar-post").addEventListener("submit", async (e) => {
        e.preventDefault();

        const id = document.getElementById("editar-post-id").value;
        const texto = document.getElementById("editar-post-texto").value.trim();
        const imgValor = document.getElementById("editar-post-input-img").value.trim();
        const img = imgValor === "" ? null : imgValor;

        try {
            await chamarApi(`/posts/${id}`, "PUT", { texto, img }, true);
            fecharModalEdicao();
            await carregarDados();
        } catch (erro) {
            alert("Erro ao salvar edição do post.");
        }
    });

    // editar comentário
    document.getElementById("btn-cancelar-comentario").addEventListener("click", fecharModalComentario);

    document.getElementById("form-editar-comentario").addEventListener("submit", async (e) => {
        e.preventDefault();

        const id = document.getElementById("editar-comentario-id").value;
        const texto = document.getElementById("editar-comentario-texto").value.trim();
        if (!texto) return;

        try {
            await chamarApi(`/comentarios/${id}`, "PUT", { texto }, true);
            fecharModalComentario();
            await carregarDados();
        } catch (erro) {
            alert("Erro ao editar comentário.");
        }
    });

    // confirmar exclusão
    document.getElementById("btn-cancelar-exclusao").addEventListener("click", fecharModalExclusao);

    document.getElementById("btn-confirmar-exclusao").addEventListener("click", async () => {
        if (!acaoExclusaoPendente) return;
        const executar = acaoExclusaoPendente;
        fecharModalExclusao();

        try {
            await executar();
        } catch (erro) {
            alert("Erro ao excluir item.");
        }
    });
}

iniciarFeed();