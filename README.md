# EZZO Work Local

<div align="center">
  <img src="assets/logo-ezzo-work-local-dev.png" alt="EZZO Work Local" height="80" />

  <br />
  <br />

  **IDE colaborativo local para equipas de desenvolvimento**

  Edita código, gere ficheiros, executa terminais e trabalha em equipa —  
  tudo na mesma rede local, sem nuvem, sem latência.

  <br />

  ![Electron](https://img.shields.io/badge/Electron-36-47848F?logo=electron&logoColor=white)
  ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
  ![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101?logo=socket.io)
  ![CodeMirror](https://img.shields.io/badge/CodeMirror-6-D30707)
  ![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## O que é o EZZO Work Local?

O **EZZO Work Local** é um IDE desktop construído com Electron que permite a **colaboração em tempo real** entre vários programadores na mesma rede local. É a alternativa local ao VS Code Live Share — sem contas, sem servidores externos, sem latência de rede.

Um membro da equipa abre uma pasta e torna-se o **Host**. Os restantes ligam-se via IP local e passam a ver e editar os mesmos ficheiros instantaneamente, com cursores partilhados, chat integrado e controlo de permissões.

---

## Funcionalidades

### Editor de Código
- **CodeMirror 6** com syntax highlighting para JavaScript, TypeScript, Python, HTML, CSS, JSON, Markdown e mais
- **Split Editor** — dois painéis lado a lado com tabs independentes
- **Minimap** — visão geral do ficheiro no lado direito, clicável para navegação
- **Find & Replace** — `Ctrl+F` / `Ctrl+H` com suporte a regex e case-sensitive
- **Breadcrumbs** — barra de navegação `src › components › Editor.tsx`
- **Auto Save** — guarda automaticamente 1 segundo após parar de escrever
- **Word Wrap** e **tamanho de fonte** configuráveis
- **Preview de imagens** — `.png`, `.jpg`, `.svg`, `.gif`, `.webp` abrem em modo visual
- **Git Diff inline** — gutter colorido mostra linhas modificadas (🟡), adicionadas (🟢), removidas (🔴)

### Colaboração em Tempo Real
- **Host / Peer** — o Host partilha a pasta; os Peers ligam-se pelo IP local
- **Cursores partilhados** — vê o cursor e selecção de cada peer no editor, com nome e cor únicos
- **Edição síncrona** — alterações de qualquer peer propagam-se instantaneamente via Socket.io
- **Chat integrado** — painel de mensagens em tempo real com suporte a Markdown inline
- **Indicador "a escrever…"** — sabe quando um colega está a escrever no chat
- **Permissões por peer** — o Host define `read-only` ou `read-write` individualmente
- **Toasts de actividade** — notificações quando um peer abre, guarda ou altera ficheiros
- **Histórico de sessão** — log local de todas as sessões: quem ligou, quando, o que alterou

### Terminal Integrado
- **Xterm.js** com `node-pty` — terminal nativo completo (PowerShell / bash)
- **Múltiplas sessões** em tabs independentes (`+` para abrir novo terminal)
- **Redimensionável** — arrasta o divisor para ajustar a altura
- **Detecção de erros** — highlight em vermelho quando o output contém `Error:` ou stack traces
- Executar comandos diretamente a partir do Task Runner

### Explorador de Ficheiros
- Árvore de ficheiros com **watch automático** (chokidar) — detecta criação, renomeação e eliminação em tempo real
- **Criar, renomear e apagar** ficheiros e pastas
- **Drag & drop** de ficheiros externos do Windows Explorer
- **Ficheiros remotos** — o Host vê os ficheiros dos Peers ligados; pode copiar para a pasta local

### Git & Source Control
- **Status** — lista de ficheiros modificados, adicionados e removidos
- **Stage / Unstage** ficheiros individuais ou todos
- **Commit** com mensagem directamente na UI
- **Diff visual** — ver as alterações linha a linha antes de fazer commit
- **Push / Pull** — integração com GitHub via Personal Access Token
- **Git Log** — histórico de commits com hash, mensagem, autor e data
- Contador de alterações pendentes no ícone da ActivityBar

### Command Palette
- `Ctrl+P` — fuzzy search sobre todos os ficheiros da pasta aberta
- `Ctrl+Shift+P` — executar comandos: guardar tudo, abrir terminal, mudar painel, etc.

### Task Runner
- Lê `package.json › scripts`, `Makefile`, `Taskfile.yml` automaticamente
- Botões de execução rápida para cada script/tarefa
- Output directo no terminal activo

### Aparência e Temas
- **Tema claro / escuro** com persistência em localStorage
- **5 cores de accent** (azul EZZO, verde, roxo, laranja, vermelho)
- **Sidebar width** ajustável com slider
- Toda a configuração persistida entre sessões

### Actualizações Automáticas
- Verifica actualizações no arranque via GitHub Releases
- **Ícone animado** na barra de título quando há nova versão disponível
- Modal com logo, notas de versão formatadas e botão de instalação directa
- Verificação manual em **Settings › Updates**

---

## Arquitectura

```
EZZO Work Local
├── Electron (Main Process)
│   ├── Janela nativa sem frame (frameless window)
│   ├── Sistema de ficheiros (readDir, readFile, writeFile, watchDir)
│   ├── Servidor Socket.io integrado (porta 4242) — modo Host
│   ├── node-pty — processos de terminal nativos
│   ├── child_process — comandos Git
│   └── GitHub API — verificação de actualizações
│
├── Preload (IPC Bridge)
│   └── Exposição segura de APIs ao renderer via contextBridge
│
└── React Renderer
    ├── TitleBar — controlos da janela + ícone de actualização
    ├── ToolBar — acções rápidas (abrir pasta, guardar, split, terminal)
    ├── ActivityBar — navegação entre painéis
    ├── Sidebar
    │   ├── FileExplorer — árvore de ficheiros
    │   ├── SearchPanel — pesquisa em ficheiros
    │   ├── GitPanel — source control
    │   ├── Connection — gestão de rede (Host/Peer)
    │   ├── TaskRunner — scripts e tarefas
    │   ├── ChatPanel — chat de equipa
    │   ├── SessionLog — histórico de sessões
    │   └── ThemePanel — aparência e settings
    ├── Editor — CodeMirror 6 com split, minimap, diff
    ├── Terminal — Xterm.js multi-sessão
    ├── StatusBar — linguagem, peers, estado Git
    └── CommandPalette — fuzzy finder
```

### Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Desktop | Electron 36 |
| UI | React 18 + TypeScript 5.8 |
| Build | Vite 6 |
| Editor | CodeMirror 6 |
| Terminal | Xterm.js 5 + node-pty |
| Rede | Socket.io 4.8 |
| Watch | chokidar 3 |
| Estado | Zustand 5 |
| Markdown | marked 15 |
| Installer | electron-builder + NSIS |

---

## Pré-requisitos

- **Node.js** 18 ou superior
- **npm** 9 ou superior
- **Windows** 10/11 x64 (suporte a Linux/macOS em desenvolvimento)
- Para o terminal nativo: compilador C++ (para `node-pty`)
  - Windows: `npm install --global windows-build-tools` ou Visual Studio Build Tools

---

## Instalação e Desenvolvimento

### 1. Clonar o repositório

```bash
git clone https://github.com/ezzo/ezzo-work-local.git
cd ezzo-work-local
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Reconstruir node-pty para Electron

```bash
npm run rebuild-pty
```

> Este passo é obrigatório. O `node-pty` é um módulo nativo e precisa de ser compilado para a versão do Electron instalada.

### 4. Iniciar em modo desenvolvimento

```bash
npm run dev
```

Isto inicia:
1. **Vite** em `http://localhost:5173`
2. **TypeScript** compila o processo principal Electron
3. **Electron** abre a janela quando o Vite estiver pronto

---

## Build e Distribuição

### Gerar o instalador `.exe`

```bash
npm run dist
```

O instalador NSIS é gerado em `dist-app/`. O wizard inclui:
- Página de boas-vindas com lista de funcionalidades
- Contrato de licença
- Escolha do directório de instalação
- Progresso detalhado por etapa
- Atalhos no Ambiente de Trabalho e Menu Iniciar

### Build sem installer (apenas ficheiros)

```bash
npm run build
```

---

## Como Usar

### Abrir uma pasta

1. Clica em **Open Folder** na toolbar ou usa `Ctrl+Shift+P › Open Folder`
2. O explorador de ficheiros carrega a árvore da pasta
3. Clica em qualquer ficheiro para abrir no editor

### Partilhar em rede (modo Host)

1. Vai ao painel **Network** na ActivityBar
2. Clica em **Start Hosting**
3. O servidor Socket.io inicia na porta **4242**
4. Partilha o teu IP local com os colegas (mostrado na UI)

### Ligar a um Host (modo Peer)

1. Vai ao painel **Network**
2. Insere o IP do Host no formato `192.168.x.x`
3. Clica em **Connect**
4. Os ficheiros do Host ficam visíveis no explorador

### Split Editor

- Clica no ícone de split na toolbar, ou
- Clica com o botão direito num ficheiro do explorador › **Open to the Side**
- Os dois painéis são independentes; cada um tem as suas tabs

### Terminal

- O terminal abre automaticamente em baixo
- Clica em `+` para abrir novas sessões
- Arrasta o divisor para ajustar a altura
- `Ctrl+\`` para mostrar/esconder (ou botão na toolbar)

### Git

1. Abre uma pasta que seja um repositório Git
2. O painel **Source Control** mostra os ficheiros alterados
3. Clica num ficheiro para ver o diff
4. Faz stage, escreve a mensagem e clica em **Commit**

---

## Configuração

Todas as preferências são guardadas automaticamente em `localStorage`:

| Opção | Descrição | Padrão |
|-------|-----------|--------|
| Tema | Dark / Light | Dark |
| Accent | Cor de destaque | Azul EZZO |
| Font Size | Tamanho da fonte do editor | 13px |
| Terminal Font Size | Tamanho da fonte do terminal | 13px |
| Sidebar Width | Largura da sidebar | 250px |
| Minimap | Visão geral do ficheiro | Activado |
| Auto Save | Guardar automaticamente | Activado |
| Word Wrap | Quebra de linha | Desactivado |

---

## Actualizações

O EZZO Work Local verifica actualizações automaticamente no arranque. Quando há uma nova versão:

1. Um **ícone animado** aparece na barra de título
2. Clica para abrir o modal de actualização com as notas de versão
3. Clica em **Instalar Actualização** para descarregar o novo instalador

Podes também verificar manualmente em **Settings › Updates**.

---

## Estrutura do Projecto

```
ezzo-work-local/
├── assets/                    # Logos e ícones
├── electron/
│   ├── main.ts                # Processo principal Electron
│   └── preload.ts             # Bridge IPC segura
├── src/
│   ├── components/
│   │   ├── Editor.tsx         # Editor CodeMirror 6 + split + minimap
│   │   ├── Terminal.tsx       # Terminal Xterm.js multi-sessão
│   │   ├── FileExplorer.tsx   # Explorador de ficheiros com watch
│   │   ├── GitPanel.tsx       # Source control integrado
│   │   ├── Connection.tsx     # Gestão Host/Peer Socket.io
│   │   ├── ChatPanel.tsx      # Chat em tempo real
│   │   ├── TitleBar.tsx       # Barra de título + update icon
│   │   ├── UpdateModal.tsx    # Modal de actualização
│   │   ├── ThemePanel.tsx     # Settings e aparência
│   │   ├── CommandPalette.tsx # Ctrl+P fuzzy finder
│   │   ├── TaskRunner.tsx     # Runner de scripts
│   │   ├── ActivityBar.tsx    # Navegação lateral
│   │   ├── StatusBar.tsx      # Barra de estado inferior
│   │   └── ...
│   ├── hooks/
│   │   ├── useUpdate.ts       # Verificação de actualizações
│   │   ├── useTheme.ts        # Gestão de tema
│   │   ├── useCollabCursor.ts # Cursores colaborativos
│   │   ├── useGitDiff.ts      # Diff inline
│   │   └── ...
│   ├── store/
│   │   └── appStore.ts        # Estado global Zustand
│   ├── types/
│   │   └── global.d.ts        # Tipos TypeScript + window.api
│   └── App.tsx                # Componente raiz
├── installer/
│   └── installer-full.nsi     # Script NSIS personalizado
├── electron-builder.config.json
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Contribuir

1. Fork do repositório
2. Cria um branch: `git checkout -b feature/nova-funcionalidade`
3. Faz as alterações e testa: `npm run dev`
4. Commit: `git commit -m "feat: descrição da funcionalidade"`
5. Push: `git push origin feature/nova-funcionalidade`
6. Abre um Pull Request

### Convenções de commit

```
feat:     nova funcionalidade
fix:      correcção de bug
refactor: refactoring sem mudança de comportamento
style:    formatação, sem lógica
docs:     documentação
chore:    build, dependências
```

---

## Roadmap

| Fase | Estado |
|------|--------|
| Editor (CodeMirror, split, minimap, diff) | ✅ Completo |
| Colaboração em rede (Socket.io, cursores, chat) | ✅ Completo |
| Terminal multi-sessão (Xterm.js + node-pty) | ✅ Completo |
| Git integrado (status, diff, commit, push/pull) | ✅ Completo |
| Command Palette + Task Runner | ✅ Completo |
| Actualizações automáticas via GitHub Releases | ✅ Completo |
| Suporte a Linux / macOS | 🔄 Em progresso |
| Extensões / Plugins | 📋 Planeado |
| Sincronização de snippets entre peers | 📋 Planeado |

---

## Licença

MIT © 2026 EZZO Digital — [ezzo.dev](https://www.ezzo.gigital)
