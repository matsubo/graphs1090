# Configuration

```
sudo nano /etc/default/graphs1090
```

Ctrl-x, then y and enter to save. Restart afterwards: `sudo systemctl restart graphs1090`.

## Commonly changed options

| Option | Default | Description |
| --- | --- | --- |
| `DRAW_INTERVAL` | `60` | Seconds between draws. Longer ranges are drawn at multiples of this (2h: 2x, 8h: 4x, 24h: 8x, 48h: 16x, 7d: 32x …). |
| `DRAW_ALL` | `no` | Draw every range on each interval instead of rotating through one range at a time. |
| `BOOT_DRAW_DELAY` | `0` | Seconds to wait after the service starts before drawing the first set of graphs, to keep that work off a busy boot. |
| `range` | `nautical` | Range graph unit: `nautical`, `statute`, or `metric`. |
| `range2` | `leftaxis` | Right axis unit: `leftaxis`, `nautical`, `statute`, or `metric`. |
| `colorscheme` | `default` | `default` or `dark`. Keep `default` — the web interface has its own light/dark toggle and inverts the images itself, so `dark` is inverted twice and shows light on the dark page. |
| `graph_size` | `default` | `small`, `default`, `large`, `huge`, or `custom`. |
| `all_large` | `no` | Draw the small graphs at full size. |
| `font_size` | `10.0` | Relative to graph size. |
| `enable_scatter` | `yes` | Collect data for the scatter graphs. |
| `WWW_TITLE` | `graphs1090` | Browser tab title. |
| `WWW_HEADER` | `ADS-B Performance Graphs` | Heading shown on the page. |
| `export TZ=` | system timezone | Timezone used in the graphs, e.g. `export TZ=Europe/Berlin`. List names with `timedatectl list-timezones`. |

Custom y-axis limits, axis ratios and custom graph dimensions are also available — see the
[full option list](https://raw.githubusercontent.com/matsubo/graphs1090/master/config/default) for all of them.

## Redrawing every range (DRAW_ALL)

By default the service draws one range per interval on a doubling schedule, which assumes
`DRAW_INTERVAL` is short. With a long interval the rarely drawn ranges fall far behind — at
`DRAW_INTERVAL=86400` the 365d graph would only be redrawn every 1024 days.

Set `DRAW_ALL=yes` to draw every range on each interval instead. For one full refresh per day:

```
DRAW_INTERVAL=86400
DRAW_ALL=yes
```

In this mode the scatter data is refreshed as part of each sweep rather than at 00:07.

## Holding the first draw back after boot (BOOT_DRAW_DELAY)

The graphs live in `/run` (tmpfs), so they are gone after a reboot and have to be drawn again.
On a single-core receiver that full sweep lands on top of everything else that is starting up.

Set `BOOT_DRAW_DELAY` to the number of seconds to wait first:

```
BOOT_DRAW_DELAY=600
```

The web page is still set up immediately, so it is reachable right away — only the images are
missing until the delay has passed. The default is `0`, which draws them straight away.

This only applies to a real boot. Restarting the service — an update, a config change — keeps the
graphs that are already drawn, so the page stays populated through the delay and the images are
simply replaced when the sweep finishes. Their watermark shows when each one was drawn.

`DRAW_ALL` and `BOOT_DRAW_DELAY` are extensions in this fork; upstream ignores both.

## Reset the configuration to defaults

```
sudo cp /usr/share/graphs1090/default-config /etc/default/graphs1090
```
