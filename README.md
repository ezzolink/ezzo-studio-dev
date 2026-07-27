# EZZO Studio Dev

<div align="center">
  <img src="assets/icon-256.png" alt="EZZO Studio Dev" height="80" />

  <br />
  <br />

  **IDE Colaborativo Desktop de Alta Performance para Equipas de Desenvolvimento**

  Edita código, gere ficheiros, analisa repositórios, edita imagens, executa terminais e trabalha em equipa em tempo real na mesma rede local.

  <br />

  ![Version](https://img.shields.io/badge/Version-1.0.9-22c55e?style=for-the-badge)
  ![Electron](https://img.shields.io/badge/Electron-36-47848F?style=for-the-badge&logo=electron&logoColor=white)
  ![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
  ![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101?style=for-the-badge&logo=socket.io)
  ![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

</div>

---

## 🚀 O que é o EZZO Studio Dev?

O **EZZO Studio Dev** é uma ambiente de desenvolvimento integrado (IDE) desktop de última geração construído com Electron, React, TypeScript e Socket.io. Foi concebido para acelerar a **colaboração em tempo real** entre programadores na mesma rede local, combinando ferramentas avançadas de edição de código, análise de projetos, terminal integrado e gestão de dependências.

---

## 🎨 Novidades da Versão v1.0.9

### 🟢 Rebranding & Identidade Visual EZZO Studio Dev
- **Logótipo Dev**: Emblema oficial com o distintivo "Dev" em tom verde neon `#22c55e`.
- **Botões Nativos da Janela Electron**: Botões de **Minimizar**, **Maximizar / Restaurar** e **Fechar** perfeitamente integrados na barra superior adaptável aos temas claro e escuro.
- **Barra de Ações Rápidas do Cabeçalho**:
  - 📁 **Open Folder**: Seleção rápida de repositório local.
  - 💾 **Save All**: Guardar todos os ficheiros modificados simultaneamente.
  - 🖥️ **Hide Terminal**: Alternar visibilidade do painel inferior do terminal.
  - 📂 **Hide Sidebar**: Alternar barra lateral do explorer.
  - 📑 **Split Editor**: Dividir o editor em dois painéis lado a lado.
  - 🌐 **Ícone VS Code**: Atalho direto para integração com ecossistema.

---

### 📂 File Explorer Avançado & Ícones Oficiais de Ficheiros
- **Vetorização Oficial de Ícones**: Ícones oficiais para `.ts`, `.tsx`, `.js`, `.jsx`, `.html`, `.css`, `.scss`, `.py`, `.json`, `.md`, `.env`, `.sql`, `package.json`, `tsconfig.json`, `.gitignore`, `Dockerfile`, entre outros.
- **Ordenação Padrão de IDE**: Hierarquia rigorosa — **pastas organizadas no topo (A-Z)** seguidas por **ficheiros (A-Z)**.
- **Emblemas do Git**: Identificação em tempo real de ficheiros **Modificados (M - Amarelo)**, **Adicionados (A - Verde)**, **Não Rastreados (U - Cinzento)** e **Eliminados (D - Vermelho)**.
- **5 Botões Rápidos de Ação no Explorer**:
  1. 📄`+` **Novo Ficheiro (New File)**
  2. 📁`+` **Nova Pasta (New Folder)**
  3. 🔄 **Atualizar / Refresh**
  4. 📂⬆ **Recolher Pastas (Collapse All Folders)**
  5. 🧪 **EZZO Project Analytics (Análise Avançada do Repositório)**
- **Criação Direcionada por Seleção**: Diálogo popover flutuante não obstrutivo que reconhece a pasta selecionada no Explorer e indica o caminho de criação em tempo real (ex: `em: src/components`).

---

### 🧪 EZZO Project Analytics & Gestão de Dependências
- **Visão Geral e Estatísticas**: Total de ficheiros, pastas, tamanho total e linhas de código do repositório.
- **Gráfico de Linguagens**: Ícones coloridos com a percentagem e barra proporcional visual de cada linguagem.
- **Instalação Real de Dependências (`npm.cmd`)**:
  - Deteção automática de ausência do diretório `node_modules`.
  - Botão **Instalar Tudo (npm i)** com execução nativa do `npm.cmd` em background.
  - Botões **Update ↺** individuais por pacote para atualização direta (`npm install <pacote>@latest`).
  - **Barra de Progresso (0 a 100%)** com feedback visual e notificação no ambiente de trabalho (OS Desktop Notification).
- **Navegação Interativa**: Ficheiros modificados recentemente e lista de TODOs/FIXMEs clicáveis para navegação direta ao código e linha exata.

---

### 🖼️ Editor de Imagens & Live HTML Preview
- **Ferramenta de Edição de Imagens**: Suporte para ficheiros `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg` com alternador entre **Edição** e **Visualização**.
- **Ferramentas de Crop & Resize**: Recorte com grelha visual, rotação, ajuste de largura/altura com bloqueio de proporção (Aspect Ratio) e presets de dimensão rápida (Desktop, Logo, Banner, Electron App).
- **Preview de HTML em Tempo Real**: Pré-visualização ao vivo de ficheiros HTML numa moldura isolada com atualização automática.

---

### 🖥️ Terminal Integrado de Alta Performance
- **Xterm.js + node-pty**: Suporte para PowerShell, CMD e Git Bash.
- **Múltiplos Terminais & Split Screen**: Divida terminais lado a lado no mesmo painel.
- **Copiar & Colar Inteligente (`Ctrl+C` / `Ctrl+V`)**: `Ctrl+C` copia a seleção ou envia sinal de interrupção; `Ctrl+V` cola texto da área de transferência.
- **Alinhamento Perfeito (`convertEol: true`)**: Eliminação de quebras de linha e texto desalinhado ao redimensionar a janela.

---

## 🛠️ Instalação e Execução Local

```bash
# Clone o repositório
git clone https://github.com/ezzolink/ezzo-studio-dev.git

# Entre no diretório
cd ezzo-work-local-main

# Instale as dependências
npm install

# Inicie o ambiente de desenvolvimento
npm run dev
```

---

## 📜 Licença

Distribuído sob a Licença **MIT**. Consulte o ficheiro [LICENSE.txt](file:///d:/EZZO%20Workspace/ezzo-work-local-main/LICENSE.txt) para mais informações.
