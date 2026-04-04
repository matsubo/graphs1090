# graphs1090 — Development Guide

## What this project is

An ADS-B flight tracking graph dashboard for Raspberry Pi (and similar). It:
- Collects data via **collectd** into RRD files
- Generates PNG graphs via **rrdtool** using `graphs1090.sh`
- Serves a static HTML/JS frontend from `html/`
- Is installed as a systemd service (`service-graphs1090.sh`)

This is a fork of [wiedehopf/graphs1090](https://github.com/wiedehopf/graphs1090).

## Design philosophy

**Minimum is beautiful.** Prefer removal over addition at every decision point:
- No external font downloads, CDN assets, or third-party dependencies
- No features added speculatively — only what is explicitly asked for
- System defaults over custom assets
- Simple, direct code over abstractions

## Architecture

```
graphs1090.sh       — rrdtool graph generation (bash, ~970 lines)
boot.sh             — startup: sets up HTML, show/hide panels, font size
service-graphs1090.sh — systemd service entrypoint
default             — user config file (/etc/default/graphs1090)
html/
  index.html        — single-page frontend
  graphs.js         — image URL updates + refresh timer
  portal.css        — all custom styling (dark theme, CSS variables)
  bootstrap.custom.{light,dark}.css — Bootstrap theming (vendor, do not edit)
dump1090.py         — collectd Python plugin: reads dump1090 stats.json
system_stats.py     — collectd Python plugin: reads /proc/meminfo
install.sh          — installer/updater script
malarky.sh          — enables RAM-based collectd write reduction
scatter.sh          — generates scatter plot data files
```

## Critical constraints — do not break these

### boot.sh manipulates index.html at runtime via `sed`

`boot.sh` uses `sed` to:
1. **Show/hide panels** — matches the pattern `> <!-- panelname -->` and `style="display:none"> <!-- panelname -->`. Panel IDs and inline comments **must be preserved exactly**:
   ```html
   <div id="panel_1090" style="display:block" class="..."> <!-- 1090 -->
   <div id="panel_airspy" ...> <!-- airspy -->
   <div id="panel_978" ...> <!-- dump978 -->
   ```
2. **Inject title/header** — replaces `<title>...</title>` and `<h1>...</h1>` content from `WWW_TITLE`/`WWW_HEADER` config values. Keep exactly one `<title>` and one `<h1>` in the document.

### graphs.js image IDs must match graphs1090.sh output filenames

Image `src` attributes are built from IDs like `dump1090-aircraft-image` → `graphs/dump1090-localhost-aircraft-24h.png`. Adding/renaming graph panels requires changes in both places.

### No OS system graphs

The OS system graphs (CPU, memory, disk I/O, network bandwidth, temperature) were intentionally removed. Do not re-add them.

## Frontend

- **Dark theme** via CSS variables in `portal.css` — edit tokens in `:root` to retheme
- **No external assets** — use system font stack only (`system-ui`, `ui-monospace`)
- Bootstrap is present as a vendor base but portal.css overrides all visible styles
- No crosshair feature (removed)

## Known issues / tech debt (not yet fixed)

- `graphs1090.sh` is ~970 lines — exceeds the 800-line guideline but splitting it is non-trivial
- `dump1090.py` has functions exceeding 50 lines (`read_1090` ~230 lines, `read_978` ~180 lines)
- jQuery 3.6.4 is outdated (has CVEs); upgrade requires replacing the bundled file
- Unquoted variables remain in several shell scripts (pre-existing; fix incrementally)

## Commit conventions

```
feat:     new user-facing feature
fix:      bug fix
perf:     performance improvement
refactor: code restructure, no behaviour change
chore:    tooling, deps, config
```

No issue ID required unless one exists.

## Testing

There is no automated test suite. Manual verification:
1. Run `sudo /usr/share/graphs1090/graphs1090.sh` — check graphs generate without errors
2. Open `http://<pi-ip>/graphs1090` — verify panels load and time buttons switch graphs
3. Run `sudo bash /usr/share/graphs1090/boot.sh nographs` — check show/hide logic runs cleanly

## Releasing

Use `release.sh` — never bump version or create releases manually:

```bash
./release.sh           # patch bump: 1.1.2 → 1.1.3
./release.sh --minor   # minor bump: 1.1.2 → 1.2.0
```

The script updates `version`, commits, pushes, and tags. GitHub Actions (`release.yml`) automatically creates the GitHub release when the tag is pushed.
