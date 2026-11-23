# Rede Social — Programação Web 1

Aplicação front-end de uma rede social desenvolvida como trabalho prático da disciplina de **Programação Web 1** do curso de Bacharelado em Engenharia de Software do **Instituto Federal de São Paulo (IFSP) — Câmpus São Carlos**.

O projeto consome uma API REST externa para gerenciar autenticação de usuários, publicações, curtidas e comentários em tempo real, utilizando apenas tecnologias web nativas sem frameworks.

---

## Funcionalidades

- **Autenticação e Sessão:**
  - Cadastro de novos usuários com foto de perfil opcional (com pré-visualização em tempo real) e login automático após o registro.
  - Login com persistência de sessão via `localStorage` e validação de token JWT (`Bearer Token`) em rotas protegidas.
- **Feed e Publicações:**
  - Listagem de publicações ordenadas da mais recente para a mais antiga.
  - Criação de posts com texto e/ou link de imagem (com preview antes da publicação).
  - Edição e exclusão de publicações próprias.
  - Filtro dinâmico por **"Todos os posts"**, **"Meus posts"** ou clicando em qualquer usuário na barra lateral.
- **Interações:**
  - Sistema de curtidas (toggle de like/deslike) com atualização imediata no contador de estatísticas do perfil.
  - Criação, edição e exclusão de comentários próprios em qualquer publicação.
- **Interface e UX:**
  - Layout responsivo em três colunas com paleta monocromática em tons de verde escuro.
  - Sanitização de textos renderizados no DOM para prevenção contra injeção de HTML (XSS).

---

## Tecnologias Utilizadas

- **HTML5** (estrutura semântica multipáginas)
- **CSS3** (CSS Variables, Flexbox, CSS Grid, animações e design responsivo)
- **JavaScript (ES6+)** (ES Modules, `Fetch API`, `async/await`, manipulação de DOM e `localStorage`)

---

## Estrutura do Projeto

```text
├── index.html          # Tela de login
├── README.md           # Documentação do projeto
├── css/
│   ├── auth.css        # Estilos das telas de login e cadastro
│   └── feed.css        # Estilos do feed, modal e layout de 3 colunas
├── html/
│   ├── cadastro.html   # Tela de cadastro de usuário
│   └── feed.html       # Tela principal da rede social
└── js/
    ├── api.js          # Configuração da API, requisições HTTP e controle de sessão
    ├── auth.js         # Lógica de login, cadastro e redirecionamento
    └── feed.js         # Lógica do feed, posts, curtidas, comentários e filtros
