# Backup and restore

The helper scripts referenced here live in `tools/` in the repository and are installed flat into
`/usr/share/graphs1090`.

## Same architecture

```
cd /var/lib/collectd/rrd
sudo systemctl stop collectd
sudo /usr/share/graphs1090/gunzip.sh /var/lib/collectd/rrd/localhost
sudo tar -cz -f rrd.tar.gz localhost
cp rrd.tar.gz /tmp
sudo systemctl restart collectd
```

Back up `/tmp/rrd.tar.gz`, for example with FileZilla over SSH/SCP.

To restore, install graphs1090 on the new card, copy the file back to `/tmp`, then:

```
sudo mkdir -p /var/lib/collectd/rrd/
cd /var/lib/collectd/rrd
sudo cp /tmp/rrd.tar.gz /var/lib/collectd/rrd/
sudo systemctl stop collectd
sudo /usr/share/graphs1090/gunzip.sh /var/lib/collectd/rrd/localhost
sudo tar -x -f rrd.tar.gz
sudo systemctl restart collectd graphs1090
```

## Moving from 32-bit to 64-bit

RRD files are not portable across word sizes, so they have to go through XML. Between arm64 and
amd64 the normal backup should work, but no guarantees. Run the install/update script on **both**
machines first, then dump the databases:

```
sudo /usr/share/graphs1090/rrd-dump.sh /var/lib/collectd/rrd/localhost /tmp/xml.tar.gz
```

Copy `xml.tar.gz` to `/tmp` on the new machine and restore:

```
sudo /usr/share/graphs1090/rrd-restore.sh /tmp/xml.tar.gz /var/lib/collectd/rrd/localhost
```

## Automatic backups

With the write saving measures enabled (the default), backups for the last 8 weeks are kept.
This was introduced around 2021-08-07; older installs won't have them. List them with:

```
cd /var/lib/collectd/rrd
ls
```

Restoring a backup discards all data collected after it:

```
cd /var/lib/collectd/rrd
sudo systemctl stop collectd
sudo tar --overwrite -x -f auto-backup-2021-week_42.tar.gz
sudo systemctl restart collectd graphs1090
```

Choose the week you want — `42` in the example above.

## Integrating two data sets (experimental)

Results are not guaranteed and often differ from restoring a backup; using the old data outright is
often better. Back up the current data set first.

Put the old data in `/tmp/localhost` — from an automatic backup that is:

```
cp /var/lib/collectd/rrd/auto-backup-2021-week_42.tar.gz /tmp
cd /tmp
sudo tar --overwrite -x -f auto-backup-2021-week_42.tar.gz
```

Then:

```
sudo systemctl stop collectd
sudo /usr/share/graphs1090/gunzip.sh /var/lib/collectd/rrd/localhost
sudo /usr/share/graphs1090/rrd-integrate-old.sh /tmp/localhost
sudo systemctl restart collectd graphs1090
```

## Moving data to adsb.im

On the old install, update graphs1090 to the latest version, then:

```
sudo /usr/share/graphs1090/generate-adsb.im-backup.sh
```

Download the backup by appending `/graphs1090-to-adsb.im.backup` to the graphs URL, for example
`http://192.168.1.38/graphs1090/graphs1090-to-adsb.im.backup`.

On the adsb.im install, use System → Restore with that file. If the old system was 32-bit, update
adsb.im to beta before importing — that support is not in stable yet.
