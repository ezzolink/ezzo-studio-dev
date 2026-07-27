# SPEC.md — ONDA Agent Architecture

## Overview
Agente de IA autônomo integrado ao EZZO Studio Dev com acesso completo a:
- **Repositório**: ler/escrever/buscar arquivos, git status
- **Computador**: navegar qualquer pasta, operações de arquivo
- **Terminal**: spawn, send commands, read output, wait for completion
- **Editor**: insert/replace code, create files, apply diffs, move cursor

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      RENDERER PROCESS (React)                   │
├─────────────────────────────────────────────────────────────────┤
│  OndaPanel (UI)                                                 │
│   ├── Chat history                                              │
│   ├── Agent mode toggle                                         │
│   ├── Streaming tool calls display                              │
│   └── Approval prompts (deny/allow)                             │
│                                                                 │
│  useAgent Hook                                                  │
│   ├── startAgent(task)                                          │
│   ├── stopAgent()                                               │
│   ├── onToolCall(tool, args) → UI update                        │
│   └── onAgentStep(step)                                         │
│                                                                 │
│  Preload API (window.api.agent)                                 │
│   ├── fs: read, write, list, glob, grep, exists                │
│   ├── terminal: spawn, write, read, kill, wait                 │
│   ├── editor: getContent, setContent, insert, replace,         │
│   │        getCursor, setCursor, applyDiff, createFile         │
│   ├── git: status, diff, log, branch, add, commit              │
│   └── workspace: getRoot, setRoot, watch                       │
└─────────────────────────────────────────────────────────────────┘
                                │ IPC (contextBridge)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MAIN PROCESS (Electron)                    │
├─────────────────────────────────────────────────────────────────┤
│  AgentIPC Handlers                                              │
│   ├── fs-*          → Node fs/promises + chokidar              │
│   ├── terminal-*    → node-pty (spawn, write, onData, kill)    │
│   ├── editor-*      → Forward to renderer via webContents      │
│   ├── git-*         → simple-git or child_process git          │
│   └── workspace-*   → dialog.showOpenDialog, fs.watch          │
│                                                                 │
│  Terminal Manager                                               │
│   ├── sessions: Map<string, { pty, cols, rows }>               │
│   ├── spawn(shell, cwd, env) → sessionId                       │
│   ├── write(sessionId, data)                                   │
│   ├── resize(sessionId, cols, rows)                            │
│   └── kill(sessionId)                                          │
│                                                                 │
│  Editor Bridge                                                  │
│   ├── Register editor views by filePath                        │
│   └── Forward editor ops to focused EditorView                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Tool Schemas (OpenAI Function Calling Format)

### Filesystem Tools
```typescript
// fs_read
{ path: string, encoding?: 'utf8' | 'base64', limit?: number, offset?: number }

// fs_write
{ path: string, content: string, encoding?: 'utf8' | 'base64', createDirs?: boolean }

// fs_list
{ path: string, recursive?: boolean, filter?: string }

// fs_glob
{ pattern: string, cwd?: string, absolute?: boolean }

// fs_grep
{ pattern: string, cwd?: string, include?: string[], exclude?: string[], maxResults?: number }

// fs_exists
{ path: string }

// fs_stat
{ path: string }
```

### Terminal Tools
```typescript
// term_spawn
{ shell?: string, cwd?: string, env?: Record<string,string>, cols?: number, rows?: number }
// Returns: { sessionId: string }

// term_write
{ sessionId: string, data: string }

// term_read
{ sessionId: string, waitFor?: string, timeoutMs?: number }
// Returns: { output: string, exited: boolean, exitCode?: number }

// term_kill
{ sessionId: string, signal?: 'SIGTERM' | 'SIGKILL' }

// term_resize
{ sessionId: string, cols: number, rows: number }
```

### Editor Tools
```typescript
// editor_get_content
{ path: string }
// Returns: { content: string, version: number }

// editor_set_content
{ path: string, content: string }

// editor_insert
{ path: string, position: { line: number, column: number }, text: string }

// editor_replace
{ path: string, range: { from: { line: number, column: number }, to: { line: number, column: number } }, text: string }

// editor_apply_diff
{ path: string, diff: string } // Unified diff format

// editor_get_cursor
{ path: string }
// Returns: { line: number, column: number, selection?: { from: Pos, to: Pos } }

// editor_set_cursor
{ path: string, line: number, column: number }

// editor_create_file
{ path: string, content?: string, open?: boolean }

// editor_open_file
{ path: string }
```

### Git Tools
```typescript
// git_status
{ cwd?: string }
// Returns: { staged: string[], unstaged: string[], untracked: string[] }

// git_diff
{ cwd?: string, staged?: boolean, path?: string }
// Returns: { diff: string }

// git_log
{ cwd?: string, maxCount?: number }
// Returns: { commits: { hash: string, message: string, author: string, date: string }[] }
```

---

## 3. Agent Core Loop

```typescript
// src/agent/agent.ts
interface AgentStep {
  type: 'think' | 'tool_call' | 'tool_result' | 'observation' | 'done'
  content: string
  toolCall?: { name: string; args: any; id: string }
  toolResult?: { success: boolean; output: any; error?: string }
}

class OndaAgent {
  private messages: ChatMessage[] = []
  private tools: ToolDefinition[] = ALL_TOOLS
  private abortController: AbortController
  
  async *run(task: string, options: { 
    model: string
    maxSteps?: number
    onStep?: (step: AgentStep) => void
    onApproval?: (tool: string, args: any) => Promise<'allow' | 'deny'>
  }): AsyncGenerator<AgentStep> {
    
    this.messages.push({ role: 'user', content: task })
    
    for (let step = 0; step < (options.maxSteps ?? 50); step++) {
      // 1. THINK - call LLM with tools
      const response = await this.callLLM(this.messages, this.tools)
      
      if (response.content) {
        yield { type: 'think', content: response.content }
        this.messages.push({ role: 'assistant', content: response.content })
      }
      
      // 2. TOOL CALLS
      for (const toolCall of response.toolCalls ?? []) {
        // Approval gate
        const approved = options.onApproval 
          ? await options.onApproval(toolCall.name, toolCall.args)
          : 'allow'
        
        if (approved === 'deny') {
          yield { type: 'tool_result', toolCall, toolResult: { success: false, error: 'Denied by user' } }
          continue
        }
        
        yield { type: 'tool_call', toolCall }
        
        // Execute via IPC
        const result = await window.api.agent.tools[toolCall.name](toolCall.args)
        
        yield { type: 'tool_result', toolCall, toolResult: result }
        
        this.messages.push({ 
          role: 'tool', 
          content: JSON.stringify(result), 
          tool_call_id: toolCall.id 
        })
      }
      
      // 3. Check for completion
      if (!response.toolCalls?.length && response.content?.includes('DONE')) {
        yield { type: 'done', content: response.content }
        return
      }
    }
  }
}
```

---

## 4. Implementation Phases

### Phase 1: IPC Foundation (Main + Preload)
- [ ] Add `agent:` IPC handlers in `electron/main.ts`
- [ ] Expose `window.api.agent` in `electron/preload.ts`
- [ ] Terminal session manager in main process
- [ ] Editor bridge: register views, forward ops

### Phase 2: Tool Implementations
- [ ] Filesystem tools (read, write, list, glob, grep, stat)
- [ ] Terminal tools (spawn, write, read, kill, resize)
- [ ] Editor tools (get/set content, insert, replace, diff, cursor)
- [ ] Git tools (status, diff, log)
- [ ] Workspace tools (get/set root, watch)

### Phase 3: Agent Core
- [ ] `src/agent/agent.ts` - reasoning loop with tool calling
- [ ] `src/agent/tools.ts` - tool definitions + IPC wrappers
- [ ] `src/agent/models.ts` - model config (OpenAI, Ollama, Anthropic)
- [ ] `src/hooks/useAgent.ts` - React hook for agent lifecycle

### Phase 4: UI Integration (OndaPanel)
- [ ] Agent mode toggle (chat ↔ agent)
- [ ] Streaming tool call display with status
- [ ] Approval dialog for sensitive ops (write, terminal, delete)
- [ ] Step-by-step visualization
- [ ] Token usage / cost display

### Phase 5: Safety & Polish
- [ ] Permission system (allowlist paths, commands)
- [ ] Sandbox mode (readonly filesystem)
- [ ] Cost limits / step limits
- [ ] Streaming LLM responses
- [ ] Conversation persistence

---

## 5. Security Model

| Tool Category | Risk | Approval Required |
|--------------|------|-------------------|
| fs_read, fs_list, fs_glob, fs_grep, fs_stat | Low | No |
| fs_write, fs_delete | Medium | Yes (outside workspace) |
| term_spawn, term_write | High | Yes (first command per session) |
| term_read, term_resize | Low | No |
| editor_insert, editor_replace, editor_apply_diff | Medium | Yes (first edit per file) |
| editor_create_file | Medium | Yes |
| git_commit, git_push | High | Yes |

**Workspace isolation**: All fs ops relative to `workspaceRoot` unless explicitly allowed via settings.

---

## 6. Settings Schema (Add to ThemePanel)

```typescript
interface AgentSettings {
  enabled: boolean
  model: 'gpt-4o' | 'gpt-4o-mini' | 'claude-3.5-sonnet' | 'ollama:llama3.1' | 'custom'
  apiKey: string // encrypted in storage
  baseUrl?: string // for custom/OpenAI-compatible
  maxSteps: number // default 50
  maxTokens: number // default 4096
  temperature: number // default 0.1
  autoApprove: 'none' | 'read-only' | 'workspace' | 'all'
  allowedPaths: string[] // additional paths outside workspace
  allowedCommands: string[] // e.g. ['npm', 'git', 'python']
  deniedCommands: string[] // e.g. ['rm -rf', 'format', 'shutdown']
  sandboxMode: boolean // readonly fs, no terminal spawn
}
```

---

## 7. File Structure (New Files)

```
src/
├── agent/
│   ├── index.ts           # Exports
│   ├── agent.ts           # Core loop
│   ├── tools.ts           # Tool definitions + IPC calls
│   ├── models.ts          # Model providers
│   ├── types.ts           # Tool schemas, AgentStep, etc.
│   └── prompts.ts         # System prompts
├── hooks/
│   └── useAgent.ts        # React hook
├── components/
│   ├── OndaPanel.tsx      # Update with agent mode
│   ├── AgentStep.tsx      # Render single step
│   ├── ToolCallCard.tsx   # Tool call display
│   └── ApprovalDialog.tsx # Permission prompt
electron/
├── main.ts                # Add agent IPC handlers
├── preload.ts             # Expose agent API
└── terminalManager.ts     # Terminal session management
```

---

## 8. Integration Points

### AppStore additions
```typescript
// src/store/appStore.ts
interface AppState {
  // ... existing
  agent: {
    running: boolean
    currentTask: string | null
    steps: AgentStep[]
    sessionId: string | null
  }
  setAgentRunning: (v: boolean) => void
  addAgentStep: (step: AgentStep) => void
  clearAgentSteps: () => void
}
```

### ToolBar
- Add agent status indicator (spinner when running)
- Quick toggle for agent mode

---

## 9. Model Providers

```typescript
// src/agent/models.ts
type Provider = 'openai' | 'anthropic' | 'ollama' | 'openai-compatible'

interface ModelConfig {
  provider: Provider
  model: string
  apiKey?: string
  baseUrl?: string
  maxTokens: number
  temperature: number
  supportsTools: boolean
  supportsVision: boolean
}
```

---

## 10. Next Steps

1. **Start Phase 1**: Add IPC handlers in `electron/main.ts` for filesystem + terminal
2. **Expose in preload**: `window.api.agent.fs.*`, `window.api.agent.terminal.*`
3. **Test IPC**: Simple read/write from renderer
4. **Build agent loop**: Connect to LLM (start with Ollama local for zero-config)
5. **Wire UI**: OndaPanel agent mode toggle + step display

---

*Generated from codebase analysis on 2026-07-22*