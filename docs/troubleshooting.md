# Troubleshooting

## The range graph isn't working

You need to configure the location in your decoder (dump1090-fa / readsb). These install scripts
provide a command line utility for it:

- <https://github.com/wiedehopf/adsb-scripts/wiki/Automatic-installation-for-readsb>
- <https://github.com/wiedehopf/adsb-scripts/wiki/Automatic-installation-for-dump1090-fa>

Otherwise edit `/etc/default/dump1090-fa` or `/etc/default/readsb` directly. On the piaware image,
set the location on the online FlightAware stats page. If you can't make it work, try <https://adsb.im>.

To include non-ADS-B positions (ADS-C, HFDL) in the range graph — rerun after each update:

```
sed -i -e 's/range_include_nonadsb = False/range_include_nonadsb = True/' /usr/share/graphs1090/dump1090.py
```

## collectd errors out on startup (Ubuntu 20, Linux Mint 20.1)

First try `sudo apt update && sudo apt dist-upgrade`. If that doesn't fix it:

```
# arm64 / aarch64
echo "LD_PRELOAD=/usr/lib/python3.8/config-3.8-aarch64-linux-gnu/libpython3.8.so" | sudo tee -a /etc/default/collectd

# x86_64
echo "LD_PRELOAD=/usr/lib/python3.8/config-3.8-x86_64-linux-gnu/libpython3.8.so" | sudo tee -a /etc/default/collectd

sudo systemctl restart collectd
```

Remove the workaround once your distribution ships a fix:

```
sudo sed -i -e 's#LD_PRELOAD=/usr/lib/python3.8.*##' /etc/default/collectd
sudo systemctl restart collectd
```

## Reporting issues

Include the output of these commands:

```
sudo systemctl restart collectd
sudo journalctl --no-pager -u collectd | tail -n40
sudo /usr/share/graphs1090/graphs1090.sh
sudo systemctl restart graphs1090
```

For 404s or pages not loading, also include:

```
sudo systemctl restart lighttpd
sudo journalctl --no-pager -u lighttpd
ls /etc/lighttpd/conf-enabled
```

Paste the output to <https://pastebin.com/>, then link it along with a description of the issue and
your system (debian / ubuntu / raspbian, RPi vs x86).
