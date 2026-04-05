#!/bin/bash

trap 'echo "[ERROR] Error in line $LINENO when executing: $BASH_COMMAND"' ERR
trap "pkill -P $$ || true; exit 1" SIGTERM SIGINT SIGHUP SIGQUIT

DB=/var/lib/collectd/rrd

source /etc/default/graphs1090

# autodetect and use /run/collectd as DB folder if it exists and has localhost
# folder having it automatically changed in /etc/default/graphs1090 causes
# issues for example when the user replaces his configuration with the default
# which is a valid approach
if [[ -d /run/collectd/localhost ]]; then
    DB=/run/collectd
fi

# fontconfig writes stuff to that directory for no good reason
# graphs1090 is mostly used on RPis, avoiding frequent disk writes is preferred
# if this fails, no big deal either.
if ! mount | grep -qs -e /var/cache/fontconfig &>/dev/null; then
    mount -o rw,nosuid,nodev,relatime,size=32000k,mode=755 -t tmpfs tmpfs /var/cache/fontconfig &>/dev/null || true
fi

# load bash sleep builtin if available
[[ -f /usr/lib/bash/sleep ]] && enable -f /usr/lib/bash/sleep sleep || true

IHTML=/usr/share/graphs1090/html/index.html

if [[ -n "$WWW_TITLE" ]]; then
    safe_title=$(printf '%s' "$WWW_TITLE" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
    sed -i -e "s#<title>.*</title>#<title>${safe_title}</title>#" "$IHTML"
fi
if [[ -n "$WWW_HEADER" ]]; then
    safe_header=$(printf '%s' "$WWW_HEADER" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
    sed -i -e "s#<h1>.*</h1>#<h1>${safe_header}</h1>#" "$IHTML"
fi

function checkrrd() {
    if [[ -f "/var/lib/collectd/rrd/localhost/dump1090-localhost/$1" ]] \
        || [[ -f "/var/lib/collectd/rrd/localhost/dump1090-localhost/$1.gz" ]] \
        || [[ -f "/run/collectd/localhost/dump1090-localhost/$1" ]]
    then
        return 0
    else
        return 1
    fi
}
function show() {
    if grep -qs -e 'style="display:none"> <!-- '$1' -->' "$IHTML"; then
        sed -i -e 's/ style="display:none"> <!-- '$1' -->/> <!-- '$1' -->/' "$IHTML"
    fi
}
function hide() {
    if ! grep -qs -e 'style="display:none"> <!-- '$1' -->' "$IHTML"; then
        sed -i -e 's/> <!-- '$1' -->/ style="display:none"> <!-- '$1' -->/' "$IHTML"
    fi
}
function show_hide() {
    if checkrrd "$1"; then
        show "$2"
    else
        hide "$2"
    fi
}
show_hide dump1090_messages-messages_978.rrd dump978
show_hide airspy_rssi-max.rrd airspy
show_hide dump1090_misc-gain_db.rrd dump1090-misc

# scatter plot: show panel and symlink data dir if enabled
scatter_dir=/var/lib/graphs1090/scatter
if [[ "$enable_scatter" == "yes" ]] && [[ -d "$scatter_dir" ]]; then
    ln -snf "$scatter_dir" /usr/share/graphs1090/html/scatter
    show scatter
else
    hide scatter
fi

if [[ $1 == "nographs" ]]; then
	exit 0
fi

for i in {1..30}; do
    if [[ -f $DB/localhost/dump1090-localhost/dump1090_dbfs-NaN.rrd ]]; then break; fi
    if (( i == 5 )); then
        echo Waiting at most another 25 seconds for database directory / collectd to start.
    fi
    sleep 1
done

echo "Generating all graphs"

for i in 24h 8h 2h 48h 7d 14d 30d 90d 180d 365d 730d 1095d 1825d 3650d
do
	/usr/share/graphs1090/graphs1090.sh $i $1 &>/dev/null &
    if ! wait; then
        echo "boot.sh(graphs1090): early exit"
        exit 0
    fi
done

echo "Done with initial graph generation"
