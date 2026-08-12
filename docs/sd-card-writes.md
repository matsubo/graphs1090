# Reducing sd-card writes

Enabled by default: the service keeps graph data in `/run` (memory) and only writes it to disk each
night, so up to 24h of data is lost on power loss. Reboots and shutdowns write the data out first
and reload it on boot.

> **Data loss:** graph data written after 23:42 of the previous day is lost on power loss.
> Run `sudo shutdown now` before unplugging.

To change how often data is written to disk, edit `/etc/cron.d/collectd_to_disk` — note that
running the install script resets this to the default:

```
# every day at 23:42
42 23 * * * root /bin/systemctl restart collectd

# every Sunday
42 23 * * 0 root /bin/systemctl restart collectd

# every 6 hours
42 */6 * * * root /bin/systemctl restart collectd
```

Disable and re-enable the behaviour:

```
sudo bash /usr/share/graphs1090/stopMalarky.sh
sudo bash /usr/share/graphs1090/malarky.sh
```

## System-wide alternative (if you disabled the above)

The rrd databases are written every minute, roughly 100 MB per hour. Linux flushes cached writes
after at most 30 seconds; raising that to 10 minutes cuts actual disk writes to around 10 MB per
hour. Don't do this if you keep data on the Pi you can't afford to lose the last 10 minutes of.

```
sudo tee /etc/sysctl.d/07-dirty.conf <<EOF
vm.dirty_ratio = 40
vm.dirty_background_ratio = 30
vm.dirty_expire_centisecs = 60000
EOF
```

Takes effect after reboot. Use `vm.dirty_expire_centisecs = 360000` for one hour instead.
