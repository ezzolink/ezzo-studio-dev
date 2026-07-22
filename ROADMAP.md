# EZZO Work Local — Roadmap de Funcionalidades

> Documento criado em 24/06/2026  
> Estado actual: v1.0 — Base funcional (Electron + React + TypeScript + Socket.io + CodeMirror + Xterm.js)

---

## Fase 1 — Developer Experience (Prioridade Alta)

### 1. Command Palette
- **Atalho:** `Ctrl+P` (ficheiros) / `Ctrl+Shift+P` (comandos)
- Fuzzy search sobre todos os ficheiros da pasta aberta
- Executar acções: abrir ficheiro, mudar painel, guardar, abrir terminal, etc.
- **Tecnologia:** lógica de fuzzy filter + overlay React com `useEffect` no keydown global
- **Ficheiros a criar:** `src/components/CommandPalette.tsx`

### 2. Split Editor
- Dividir o editor em dois painéis lado a lado (horizontal ou vertical)
- Cada painel tem as suas próprias tabs
- Drag & drop de tab de um painel para o outro
- **Ficheiros a modificar:** `src/components/Editor.tsx`, `src/store/appStore.ts`

### 3. Find & Replace no Editor
- `Ctrl+F` — pesquisa no ficheiro activo com highlight das ocorrências
- `Ctrl+H` — substituição com opções: case sensitive, regex, substituir tudo
- Integração nativa com CodeMirror 6 (`@codemirror/search` já instalado)
- **Ficheiros a modificar:** `src/components/Editor.tsx`

### 4. Minimap
- Visão geral do ficheiro no lado direito do editor
- Clicável para navegação rápida
- Extensão CodeMirror ou canvas custom
- **Ficheiros a modificar:** `src/components/Editor.tsx`

### 5. Breadcrumbs
- Barra acima do editor: `src > components > Editor.tsx`
- Cada segmento é clicável para navegar no explorer
- **Ficheiros a criar:** `src/components/Breadcrumbs.tsx`

### 6. Preview de Imagens
- Quando se abre `.png`, `.jpg`, `.svg`, `.gif`, `.webp` — mostrar imagem em vez de texto
- Zoom in/out com scroll
- Mostrar dimensões e tamanho do ficheiro
- **Ficheiros a modificar:** `src/components/Editor.tsx`

### 7. Themes / Appearance
- Toggle dark / light mode
- Escolher cor de accent (azul EZZO, verde, roxo, etc.)
- Persistido em localStorage
- **Ficheiros a criar:** `src/components/ThemePanel.tsx`, actualizar `src/index.css`

---

## Fase 2 — Colaboração em Rede (Prioridade Alta)

### 8. Cursors em Tempo Real
- Ver o cursor e selecção dos outros peers no mesmo ficheiro
- Nome do peer mostrado ao lado do cursor (label colorido)
- Cada peer tem uma cor única
- **Tecnologia:** Socket.io para broadcast de posição do cursor + decorações CodeMirror
- **Ficheiros a criar:** `src/hooks/useCollabCursor.ts`
- **Ficheiros a modificar:** `src/components/Editor.tsx`, `electron/main.ts`

### 9. Chat Integrado
- Painel de chat na sidebar (novo painel na ActivityBar)
- Mensagens em tempo real via Socket.io
- Suporte a Markdown inline nas mensagens
- Indicador de "a escrever…"
- **Ficheiros a criar:** `src/components/ChatPanel.tsx`

### 10. Notificações de Actividade Remota
- Toast no canto inferior direito quando um peer:
  - Abre um ficheiro
  - Guarda um ficheiro
  - Cria ou apaga ficheiros
- Auto-dismiss após 4 segundos
- **Ficheiros a criar:** `src/components/Toast.tsx`, `src/hooks/useToast.ts`

### 11. Permissões por Peer
- O Host pode definir: `read-only` ou `read-write` por peer
- Interface no painel Network para gerir permissões
- Bloqueio no servidor Socket.io quando peer sem permissão tenta escrever
- **Ficheiros a modificar:** `src/components/Connection.tsx`, `electron/main.ts`

### 12. Histórico de Sessão
- Log local (JSON) de todas as sessões: quem conectou, quando, ficheiros alterados
- Painel de histórico na sidebar
- **Ficheiros a criar:** `src/components/SessionLog.tsx`, handler em `electron/main.ts`

---

## Fase 3 — Git & Source Control (Prioridade Média)

### 13. Git Diff Inline no Editor
- Gutter do CodeMirror mostra linhas modificadas (amarelo), adicionadas (verde), removidas (vermelho)
- Hover sobre o gutter mostra o diff da linha
- **Tecnologia:** `child_process` para `git diff` + extensão CodeMirror custom
- **Ficheiros a criar:** `src/hooks/useGitDiff.ts`
- **Ficheiros a modificar:** `src/components/Editor.tsx`, `electron/main.ts`

### 14. Git Log / Timeline
- Painel com lista de commits: hash, mensagem, autor, data
- Clicar num commit mostra os ficheiros alterados
- **Ficheiros a modificar:** `src/components/GitPanel.tsx`, `electron/main.ts`

### 15. Push / Pull GitHub
- Botões `git push` e `git pull` no painel Git
- Autenticação via Personal Access Token (guardado com `electron-store` encriptado)
- Feedback de progresso no terminal
- **Ficheiros a modificar:** `src/components/GitPanel.tsx`, `electron/main.ts`

---

## Fase 4 — Terminal & Task Runner (Prioridade Média)

### 16. Múltiplos Terminais em Tabs
- Tabs no topo do painel Terminal: `bash 1`, `bash 2`, `+`
- Cada tab tem o seu processo `node-pty` independente
- Fechar tab mata o processo
- **Ficheiros a modificar:** `src/components/Terminal.tsx`, `electron/main.ts`

### 17. Terminal com Detecção de Erros
- Quando o output contém `Error:`, `error TS`, `FAILED` — highlight em vermelho
- Link clicável para abrir o ficheiro na linha do erro
- Parser de stack traces (Node.js, Python, TypeScript)
- **Ficheiros a modificar:** `src/components/Terminal.tsx`

### 18. Task Runner
- Ler `package.json` → `scripts`, `Makefile`, `Taskfile.yml`
- Mostrar botões de execução rápida no painel lateral
- Output no terminal activo
- **Ficheiros a criar:** `src/components/TaskRunner.tsx`, `electron/main.ts`

---

## Fase 5 — Qualidade de Vida (Prioridade Normal)

### 19. Drag & Drop de Ficheiros Externos
- Arrastar ficheiro do Windows Explorer para a sidebar ou editor
- Copia o ficheiro para a pasta aberta
- Para imagens: pergunta onde colocar
- **Ficheiros a modificar:** `src/components/FileExplorer.tsx`, `electron/main.ts`

### 20. Workspace / Sessions
- Ao fechar, guardar: pasta aberta, ficheiros abertos, painel activo, altura do terminal
- Ao abrir, restaurar automaticamente o último estado
- Múltiplos workspaces (lista de workspaces recentes)
- **Tecnologia:** `electron-store` para persistência
- **Ficheiros a criar:** `src/hooks/useWorkspace.ts`
- **Ficheiros a modificar:** `src/App.tsx`, `electron/main.ts`

---

## Resumo por Fase

| Fase | Funcionalidades | Estimativa |
|------|----------------|-----------|
| 1 — Developer Experience | 1–7  | 7 itens |
| 2 — Colaboração em Rede  | 8–12 | 5 itens |
| 3 — Git & Source Control | 13–15 | 3 itens |
| 4 — Terminal & Tasks     | 16–18 | 3 itens |
| 5 — Qualidade de Vida    | 19–20 | 2 itens |
| **Total**                | **20 funcionalidades** | |

---

## Ordem de Implementação Recomendada

```
Fase 1 → Fase 2 → Fase 4 → Fase 3 → Fase 5
```

Começar pela **Fase 1** porque melhora a experiência de uso imediata.  
Depois **Fase 2** porque é o diferencial do EZZO vs outras ferramentas.  
**Fase 4** antes da 3 porque o terminal melhorado suporta os comandos Git da Fase 3.

---

*EZZO Work Local — Built with Electron + React + TypeScript + Socket.io*
