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
install.sh            — installer/updater, the curl entry point (must stay at root)
version               — single source of truth for the version number

src/                  — installed to /usr/share/graphs1090, runs on the receiver
  graphs1090.sh       — rrdtool graph generation (bash, ~970 lines)
  boot.sh             — startup: sets up HTML, show/hide panels, font size
  service-graphs1090.sh — systemd service entrypoint
  scatter.sh          — generates scatter plot data files
  malarky.sh          — enables RAM-based collectd write reduction
  stopMalarky.sh      — reverts it
  readback.sh         — restores /run/collectd from disk on collectd start
  writeback.sh        — saves /run/collectd to disk on collectd stop
  uninstall.sh        — removes the install
  dump1090.py         — collectd Python plugin: reads dump1090 stats.json
  system_stats.py     — collectd Python plugin: reads /proc/meminfo
  dump1090.db         — collectd type definitions

config/               — templates installed to system paths
  default             — user config    -> /etc/default/graphs1090
  collectd.conf       —                -> /etc/collectd/collectd.conf
  malarky.conf        — systemd drop-in for collectd
  service.service     —                -> /lib/systemd/system/graphs1090.service
  88-graphs1090.conf, 95-graphs1090-otherport.conf -> lighttpd conf-available
  nginx-graphs1090.conf — include for nginx users

tools/                — manual maintenance, installed but never run automatically
  gunzip.sh, rrd-dump.sh, rrd-restore.sh, rrd-integrate-old.sh,
  generate-adsb.im-backup.sh, new-format.sh, rem_rra.sh,
  prune.sh, prune-range.sh, prune-value.py, adjust-scripts-s6-sh

dev/                  — repository maintenance, NOT installed
  release.sh

html/                 — copied wholesale to /usr/share/graphs1090/html
  index.html          — single-page frontend
  graphs.js           — image URL updates + refresh timer
  scatter.js          — canvas scatter plot
  portal.css          — all custom styling (dark theme, CSS variables)

docs/                 — the long-form documentation the README links to
```

### The install target is flat

The repository is split into directories; `/usr/share/graphs1090` is not. Everything
that runs on the receiver is addressed as `/usr/share/graphs1090/<name>` — by
`config/collectd.conf` (`ModulePath`), `config/malarky.conf` (`ExecStartPre`,
`ExecStopPost`), `config/service.service` (`ExecStart`) and the README. `install.sh`
flattens `src/` and `tools/` into that one directory on purpose. Moving a script
between `src/` and `tools/` is therefore free; changing the installed path is not.

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
- No crosshair feature (removed)

## Known issues / tech debt (not yet fixed)

- `graphs1090.sh` is ~970 lines — exceeds the 800-line guideline but splitting it is non-trivial
- `dump1090.py` has functions exceeding 50 lines (`read_1090` ~230 lines, `read_978` ~180 lines)
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

Use `dev/release.sh` from the repository root — never bump version or create releases manually:

```bash
./dev/release.sh           # patch bump: 1.1.2 → 1.1.3
./dev/release.sh --minor   # minor bump: 1.1.2 → 1.2.0
```

The script updates `version`, commits, pushes, and tags. GitHub Actions (`release.yml`) automatically creates the GitHub release when the tag is pushed.
