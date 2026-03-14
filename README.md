# pi-watch

File watcher for Pi. Watch source files for `#pi!` comments and send them as prompts — aider-style watch mode.

## Install

```bash
pi install npm:@artale/pi-watch
```

## How it works

Add a `#pi!` comment anywhere in your code:

```python
# #pi! add error handling to this function
def process_data(items):
    return [transform(x) for x in items]
```

```typescript
// #pi! make this component responsive
export function Dashboard() {
```

```css
/* #pi! add dark mode support */
.container { background: white; }
```

Pi-watch scans your files every 3 seconds. When it finds a `#pi!` comment, it:
1. Sends the instruction as a prompt to the agent
2. Removes the `#pi!` comment from the file
3. The agent processes the instruction

## Commands

```
/watch start [dir]          — start watching (default: cwd)
/watch stop                 — stop watching
/watch status               — show watch state
/watch add <path>           — add directory to watch
/watch ignore <pattern>     — add ignore pattern
```

## Tools

- `watch_start` — start watching a directory
- `watch_stop` — stop watching
- `watch_status` — show current state

## Supported file types

`.ts` `.tsx` `.js` `.jsx` `.py` `.rs` `.go` `.java` `.c` `.cpp` `.h` `.rb` `.php` `.swift` `.kt` `.scala` `.sh` `.html` `.css` `.scss` `.vue` `.svelte` `.md` `.txt` `.yaml` `.yml` `.toml` `.json`

## Default ignore patterns

`node_modules` `.git` `dist` `build` `__pycache__` `.next` `.pi` `venv`

## Zero dependencies

Uses only Node.js built-ins (fs, path). No chokidar, no external watchers.

## License

MIT
