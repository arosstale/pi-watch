# pi-watch

File watcher for Pi. Type `#pi!` in any source file — the agent sees it, acts on it, removes the comment.

[![npm](https://img.shields.io/npm/v/@artale/pi-watch?style=flat-square)](https://www.npmjs.com/package/@artale/pi-watch)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

## Install

```bash
pi install npm:@artale/pi-watch
```

## How it works

Add a `#pi!` comment anywhere in your code:

```python
# #pi! add error handling and input validation
def process_data(items):
    return [transform(x) for x in items]
```

```typescript
// #pi! make this component responsive and add dark mode
export function Dashboard() {
    return <div className="dashboard">...</div>
}
```

```css
/* #pi! add smooth transitions and hover effects */
.button { background: blue; color: white; }
```

Pi-watch scans your files every 3 seconds. When it finds `#pi!`:
1. Sends the instruction as a prompt to the agent
2. Removes the `#pi!` comment from the file
3. Agent processes the instruction and modifies the code

**You stay in your editor. The agent works in the background.**

## Quick Start

```
/watch start              ← start watching current directory
/watch start ./src        ← watch specific directory
```

That's it. Now type `#pi!` in any file.

## Commands

| Command | What it does |
|---------|-------------|
| `/watch start [dir]` | Start watching (default: cwd) |
| `/watch stop` | Stop watching |
| `/watch status` | Show scan count, prompts sent |
| `/watch add <path>` | Add another directory |
| `/watch ignore <pattern>` | Ignore a directory name |

## Supported file types

`.ts` `.tsx` `.js` `.jsx` `.py` `.rs` `.go` `.java` `.c` `.cpp` `.h` `.rb` `.php` `.swift` `.kt` `.scala` `.sh` `.html` `.css` `.scss` `.vue` `.svelte` `.md` `.txt` `.yaml` `.yml` `.toml` `.json`

## Default ignores

`node_modules` `.git` `dist` `build` `__pycache__` `.next` `.pi` `venv`

## Comment syntax

Works with any comment style:

| Language | Syntax |
|----------|--------|
| Python/Ruby/Shell | `# #pi! instruction` |
| JS/TS/Java/C/Go/Rust | `// #pi! instruction` |
| CSS | `/* #pi! instruction */` |
| HTML | `<!-- #pi! instruction -->` |
| SQL | `-- #pi! instruction` |

## Why this is different

Other tools require you to switch to the agent, type a prompt, wait, switch back. With pi-watch, you **never leave your editor**. Type a comment, keep coding. The agent picks it up.

Inspired by [aider](https://github.com/paul-gauthier/aider)'s watch mode, but simpler — no config, no setup, just `#pi!`.

## License

MIT
