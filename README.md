[![GitHub release](https://img.shields.io/github/v/release/matsubo/graphs1090)](https://github.com/matsubo/graphs1090/releases)
[![License](https://img.shields.io/github/license/matsubo/graphs1090)](LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/matsubo/graphs1090)](https://github.com/matsubo/graphs1090/issues)
[![GitHub stars](https://img.shields.io/github/stars/matsubo/graphs1090)](https://github.com/matsubo/graphs1090/stargazers)

![Screenshot](screenshots/screenshot.png)

# graphs1090

Graphs for readsb (wiedehopf fork) and dump1090-fa, based on dump1090-tools by mutability.
Also works with other dump1090 variants that supply `stats.json`.

A fork of [wiedehopf/graphs1090](https://github.com/wiedehopf/graphs1090), kept in sync with it.
It drops the OS system graphs and all CDN assets, and adds `DRAW_ALL` and `BOOT_DRAW_DELAY` for
single-core receivers.

## Install and update

The same command installs and updates; it checks the remote version and skips if already current.

```
sudo bash -c "$(curl -L -o - https://github.com/matsubo/graphs1090/raw/master/install.sh)"
```

Force a reinstall regardless of version:

```
sudo bash -c "$(curl -L -o - https://github.com/matsubo/graphs1090/raw/master/install.sh)" bash reinstall
```

To install local changes, clone the repository, edit, then run `./install.sh test`.

> **Data loss:** graph data written after 23:42 of the previous day is lost on power loss.
> Run `sudo shutdown now` before unplugging. Reboots and shutdowns are safe.
> See [Reducing sd-card writes](docs/sd-card-writes.md).

## Viewing the graphs

Replace the IP address with that of your Raspberry Pi:

- <http://192.168.x.yy/graphs1090>
- <http://192.168.x.yy/perf>
- <http://192.168.x.yy:8542>

## Configuration

```
sudo nano /etc/default/graphs1090
sudo systemctl restart graphs1090
```

The options you are most likely to touch:

| Option | Default | Description |
| --- | --- | --- |
| `DRAW_INTERVAL` | `60` | Seconds between draws. |
| `DRAW_ALL` | `no` | Draw every range on each interval instead of one at a time. |
| `BOOT_DRAW_DELAY` | `0` | Seconds to wait after start before the first draw. |
| `range` | `nautical` | Range graph unit. |
| `graph_size` | `default` | `small`, `default`, `large`, `huge`, or `custom`. |
| `WWW_TITLE` | `graphs1090` | Browser tab title. |

On a single-core receiver, one full refresh per day instead of the default cadence:

```
DRAW_INTERVAL=86400
DRAW_ALL=yes
BOOT_DRAW_DELAY=600
```

See **[docs/configuration.md](docs/configuration.md)** for the full option table and what these do.

## Documentation

| | |
| --- | --- |
| [Configuration](docs/configuration.md) | Every option, `DRAW_ALL`, `BOOT_DRAW_DELAY`, resetting to defaults |
| [Troubleshooting](docs/troubleshooting.md) | Range graph not working, collectd startup errors, reporting issues |
| [Reducing sd-card writes](docs/sd-card-writes.md) | How the in-memory database works and how to change it |
| [Backup and restore](docs/backup-restore.md) | Moving data between cards, 32-bit to 64-bit, automatic backups |
| [Advanced](docs/advanced.md) | Non-standard decoder URLs, nginx, hiding panels, gain, wiping data |

## Uninstall

```
sudo bash /usr/share/graphs1090/uninstall.sh
```

## Repository layout

The install target `/usr/share/graphs1090` is flat — everything that runs on the receiver is
addressed by absolute path from `collectd.conf`, the systemd units and the docs. The repository is
split up only to make it obvious what each file is; `install.sh` flattens it on the way in.

| | |
| --- | --- |
| `install.sh` | Installer and updater. The curl entry point, so it stays at the root. |
| `src/` | Runs on the receiver: the drawing engine, the systemd entrypoint, the collectd plugins. |
| `config/` | Templates copied to `/etc/...` and `/lib/systemd/system` at install time. |
| `tools/` | Manual maintenance — backup, restore, pruning. Installed, but never run for you. |
| `dev/` | Repository maintenance. Not installed. |
| `html/` | The web frontend, copied wholesale. |
| `docs/` | The pages linked above. |

Contributor notes, including the constraints that are easy to break, are in
[CLAUDE.md](CLAUDE.md).

## Releasing (maintainers)

```bash
./dev/release.sh           # patch bump: 1.1.2 → 1.1.3
./dev/release.sh --minor   # minor bump: 1.1.2 → 1.2.0
```
