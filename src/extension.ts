/**
 * pi-watch — File watcher for Pi
 *
 * Watch source files for #pi! comments and send them as prompts.
 * Aider-style watch mode. Also watches for file changes and notifies the agent.
 *
 * Commands:
 *   /watch start [dir] [--pattern <glob>]  — start watching
 *   /watch stop                             — stop watching
 *   /watch status                           — show watch state
 *   /watch add <path>                       — add file/dir to watch
 *   /watch ignore <pattern>                 — add ignore pattern
 *
 * How it works:
 *   Scans watched files for lines containing #pi! <instruction>
 *   When found, sends the instruction as a prompt to the agent.
 *   Removes the #pi! comment after sending.
 *   Also tracks file changes and can notify the agent of modifications.
 */

import type { ExtensionAPI } from '@anthropic-ai/claude-code'
import * as fs from 'fs'
import * as path from 'path'

interface WatchState {
  active: boolean
  dirs: string[]
  ignorePatterns: string[]
  interval: ReturnType<typeof setInterval> | null
  scanCount: number
  promptsSent: number
  lastScan: number
  knownFiles: Map<string, number> // path → last modified time
}

const state: WatchState = {
  active: false,
  dirs: [],
  ignorePatterns: ['node_modules', '.git', 'dist', 'build', '__pycache__', '.next', '.pi', 'venv'],
  interval: null,
  scanCount: 0,
  promptsSent: 0,
  lastScan: 0,
  knownFiles: new Map(),
}

const SCAN_INTERVAL_MS = 3000
const PI_COMMENT_PATTERN = /^(.*)(\/\/|#|--|\/\*)\s*#pi!\s*(.+?)\s*(\*\/)?$/
const WATCHABLE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java', '.c', '.cpp', '.h',
  '.rb', '.php', '.swift', '.kt', '.scala', '.sh', '.bash', '.zsh',
  '.html', '.css', '.scss', '.vue', '.svelte',
  '.md', '.txt', '.yaml', '.yml', '.toml', '.json',
])

function shouldIgnore(filePath: string): boolean {
  const parts = filePath.split(path.sep)
  return state.ignorePatterns.some(p => parts.includes(p))
}

function isWatchable(filePath: string): boolean {
  return WATCHABLE_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

function walkDir(dir: string, maxDepth: number = 5, depth: number = 0): string[] {
  if (depth > maxDepth) return []
  const files: string[] = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (shouldIgnore(fullPath)) continue
      if (entry.isDirectory()) {
        files.push(...walkDir(fullPath, maxDepth, depth + 1))
      } else if (entry.isFile() && isWatchable(fullPath)) {
        files.push(fullPath)
      }
    }
  } catch {}
  return files
}

function scanForPiComments(filePath: string): { line: number; instruction: string; fullLine: string }[] {
  const found: { line: number; instruction: string; fullLine: string }[] = []
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(PI_COMMENT_PATTERN)
      if (match) {
        found.push({ line: i + 1, instruction: match[3].trim(), fullLine: lines[i] })
      }
    }
  } catch {}
  return found
}

function removePiComment(filePath: string, lineNum: number): void {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    const idx = lineNum - 1
    if (idx >= 0 && idx < lines.length) {
      // Remove just the #pi! part, keep the rest of the line
      const match = lines[idx].match(PI_COMMENT_PATTERN)
      if (match) {
        const prefix = match[1].trimEnd()
        if (prefix) {
          lines[idx] = prefix
        } else {
          lines.splice(idx, 1)
        }
        fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')
      }
    }
  } catch {}
}

function formatStatus(): string {
  const lines = [
    `## Watch Status`,
    ``,
    `**Active:** ${state.active ? '🟢 watching' : '⚫ stopped'}`,
    `**Directories:** ${state.dirs.length ? state.dirs.join(', ') : 'none'}`,
    `**Scans:** ${state.scanCount}`,
    `**Prompts sent:** ${state.promptsSent}`,
    `**Files tracked:** ${state.knownFiles.size}`,
    `**Ignore:** ${state.ignorePatterns.join(', ')}`,
  ]
  if (state.lastScan) {
    const ago = Math.round((Date.now() - state.lastScan) / 1000)
    lines.push(`**Last scan:** ${ago}s ago`)
  }
  return lines.join('\n')
}

export default function init(pi: ExtensionAPI) {
  const cwd = pi.context?.cwd || process.cwd()

  function doScan() {
    state.scanCount++
    state.lastScan = Date.now()

    for (const dir of state.dirs) {
      const files = walkDir(dir)
      for (const filePath of files) {
        const comments = scanForPiComments(filePath)
        for (const { line, instruction } of comments) {
          const relPath = path.relative(cwd, filePath)
          const prompt = `[pi-watch] ${relPath}:${line} → ${instruction}`

          // Remove the comment first so we don't re-send it
          removePiComment(filePath, line)
          state.promptsSent++

          // Send as a user message
          pi.sendMessage({
            content: prompt,
            display: true,
          }, { triggerTurn: true })
        }
      }
    }
  }

  function startWatching(dirs: string[]) {
    if (state.active) {
      stopWatching()
    }
    state.dirs = dirs.map(d => path.resolve(d))
    state.active = true
    state.scanCount = 0
    state.promptsSent = 0

    // Initial scan
    doScan()

    // Periodic scan
    state.interval = setInterval(doScan, SCAN_INTERVAL_MS)
  }

  function stopWatching() {
    if (state.interval) {
      clearInterval(state.interval)
      state.interval = null
    }
    state.active = false
  }

  // Command
  pi.addCommand({
    name: 'watch',
    description: 'Watch files for #pi! comments and send them as prompts',
    handler: async (args) => {
      const parts = args.trim().split(/\s+/)
      const sub = parts[0]?.toLowerCase()

      if (!sub || sub === 'status') {
        pi.sendMessage({ content: formatStatus(), display: true }, { triggerTurn: false })
        return
      }

      if (sub === 'start') {
        const dir = parts[1] || cwd
        startWatching([dir])
        pi.sendMessage({
          content: `🔍 Watching **${dir}** for #pi! comments. Scanning every ${SCAN_INTERVAL_MS / 1000}s.`,
          display: true,
        }, { triggerTurn: false })
        return
      }

      if (sub === 'stop') {
        stopWatching()
        pi.sendMessage({ content: `Stopped watching. ${state.promptsSent} prompts sent this session.`, display: true }, { triggerTurn: false })
        return
      }

      if (sub === 'add') {
        const dir = parts[1]
        if (!dir) {
          pi.sendMessage({ content: 'Usage: /watch add <path>', display: true }, { triggerTurn: false })
          return
        }
        const resolved = path.resolve(dir)
        if (!state.dirs.includes(resolved)) {
          state.dirs.push(resolved)
        }
        pi.sendMessage({ content: `Added ${resolved} to watch list.`, display: true }, { triggerTurn: false })
        return
      }

      if (sub === 'ignore') {
        const pattern = parts[1]
        if (!pattern) {
          pi.sendMessage({ content: 'Usage: /watch ignore <pattern>', display: true }, { triggerTurn: false })
          return
        }
        state.ignorePatterns.push(pattern)
        pi.sendMessage({ content: `Added "${pattern}" to ignore list.`, display: true }, { triggerTurn: false })
        return
      }

      pi.sendMessage({
        content: '**Usage:**\n- `/watch start [dir]` — start watching\n- `/watch stop` — stop\n- `/watch status` — show state\n- `/watch add <path>` — add directory\n- `/watch ignore <pattern>` — ignore pattern',
        display: true,
      }, { triggerTurn: false })
    },
  })

  // Tools
  pi.addTool({
    name: 'watch_start',
    description: 'Start watching a directory for #pi! comments in source files. Comments trigger agent prompts automatically.',
    parameters: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Directory to watch (default: cwd)' },
      },
    },
    handler: async (params: { directory?: string }) => {
      const dir = params.directory || cwd
      startWatching([dir])
      return `Watching ${dir} for #pi! comments. Scan interval: ${SCAN_INTERVAL_MS / 1000}s.`
    },
  })

  pi.addTool({
    name: 'watch_stop',
    description: 'Stop watching for file changes.',
    parameters: { type: 'object', properties: {} },
    handler: async () => {
      stopWatching()
      return `Stopped. ${state.promptsSent} prompts sent this session.`
    },
  })

  pi.addTool({
    name: 'watch_status',
    description: 'Show current watch state — active, directories, scan count, prompts sent.',
    parameters: { type: 'object', properties: {} },
    handler: async () => formatStatus(),
  })

  // Cleanup
  process.on('exit', () => { stopWatching() })
}
