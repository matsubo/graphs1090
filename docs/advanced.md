# Advanced

## Non-standard dump1090 URL

If your local map is not at `/dump1090-fa` or `/dump1090`, edit `/etc/collectd/collectd.conf` and
change the URL:

```
<Plugin python>
        ModulePath "/usr/share/graphs1090"
        LogTraces true
        Import "dump1090"
        <Module dump1090>
                <Instance localhost>
                        URL "http://localhost/dump1090-fa"
                </Instance>
        </Module>
</Plugin>
```

Then `sudo systemctl restart collectd`.

## Reading data without http

In `collectd.conf`:

```
  URL "file:///usr/local/share/dump1090-data"
```

```
sudo mkdir -p /usr/local/share/dump1090-data
sudo ln -s /run/dump1090-fa /usr/local/share/dump1090-data/data
```

## nginx

Add this line inside the `server { }` block of `/etc/nginx/sites-enabled/default` or
`/etc/nginx/conf.d/default.conf`, then restart nginx:

```
include /usr/share/graphs1090/nginx-graphs1090.conf;
```

## Hiding or showing the 1090 graphs

```
# Hide:
sudo sed -i -e 's/id="panel_1090" style="display:block"/id="panel_1090" style="display:none"/' /usr/share/graphs1090/html/index.html
# Show:
sudo sed -i -e 's/id="panel_1090" style="display:none"/id="panel_1090" style="display:block"/' /usr/share/graphs1090/html/index.html
```

## Removing UAT / 978 graphs and data

```
sudo systemctl stop collectd
sudo /usr/share/graphs1090/gunzip.sh /var/lib/collectd/rrd/localhost
sudo rm /var/lib/collectd/rrd/localhost/dump1090-localhost/*978*
sudo systemctl restart collectd graphs1090
```

## Adjusting gain

dump1090-fa and readsb adjust gain automatically, which is generally the better approach. If you
do want to tune it manually: <https://github.com/wiedehopf/adsb-scripts/wiki/Optimizing-gain>
(AGC is maximum gain and does not work as intended for ADS-B — many setups use far too much).

## Resetting the database format

This retains data but can cause anomalies — back up first. The script makes an automatic backup
too, but better that you know where yours is.

Useful if you switched from the adsb receiver project graphs and kept the data, if you upgraded
around 2019-07-15/16, or to allow storing more than 3 years of data on databases created before
2022-03-20.

```
sudo bash -c "$(curl -L -o - https://github.com/matsubo/graphs1090/raw/master/install.sh)"
sudo apt update
sudo apt install -y screen
sudo screen /usr/share/graphs1090/new-format.sh
```

## Wiping the database

Deletes **all** data:

```
sudo systemctl stop collectd
sudo rm /var/lib/collectd/rrd/localhost* -rf
sudo rm -f /var/lib/collectd/rrd/auto-backup-$(date +%Y-week_%V).tar.gz
sudo systemctl restart collectd graphs1090
```
