#!/bin/bash

trap 'echo "[ERROR] Error in line $LINENO when executing: $BASH_COMMAND"' ERR
trap 'pkill -P $$ || true; exit 0' SIGTERM SIGINT SIGHUP SIGQUIT

# run at lowest CPU and I/O priority
renice 20 $$ || true
ionice -c 3 -p $$ 2>/dev/null || true

source /etc/default/graphs1090

if [[ -z $DRAW_INTERVAL ]]; then
    DRAW_INTERVAL=60
fi

DRAW_INTERVAL=$(cut -d '.' -f1 <<< $DRAW_INTERVAL)
DRAW_INTERVAL=$(( 10#$DRAW_INTERVAL ))

if (( DRAW_INTERVAL < 1 )); then
    DRAW_INTERVAL=1
fi

if (( DRAW_INTERVAL < 40 )); then
    GRAPH_DELAY=
else
    GRAPH_DELAY=0.4
fi

if [[ -z $DRAW_ALL ]]; then
    DRAW_ALL=no
fi

if [[ -z $BOOT_DRAW_DELAY ]]; then
    BOOT_DRAW_DELAY=0
fi

BOOT_DRAW_DELAY=$(cut -d '.' -f1 <<< $BOOT_DRAW_DELAY)
BOOT_DRAW_DELAY=$(( 10#$BOOT_DRAW_DELAY ))

if (( BOOT_DRAW_DELAY > 0 )); then
    # set the web page up right away so it is usable, but hold the graphs
    # themselves back until the boot-time load has passed
    /usr/share/graphs1090/boot.sh nographs &
    wait || true;
    sleep "$BOOT_DRAW_DELAY"
fi

/usr/share/graphs1090/boot.sh 0 &
wait || true;

graphs() {
	/usr/share/graphs1090/graphs1090.sh $1 $GRAPH_DELAY &>/dev/null
}

# load bash sleep builtin if available
[[ -f /usr/lib/bash/sleep ]] && enable -f /usr/lib/bash/sleep sleep || true

while wait;
do
    SEC=$(( 10#$(date -u +%s) ))

    DRAW_OFFSET=$(( DRAW_INTERVAL * 2 / 3 + $RANDOM % (DRAW_INTERVAL / 8 + 1)))

    sleep "$(( DRAW_INTERVAL - ((SEC - DRAW_OFFSET) % DRAW_INTERVAL) )).$RANDOM"

    SEC=$(( 10#$(date -u +%s) ))

    if [[ $DRAW_ALL == yes ]]; then
        # boot.sh already draws every range, so reuse it rather than
        # duplicating the range list here.
        /usr/share/graphs1090/boot.sh $GRAPH_DELAY &>/dev/null
        # the 00:07 check below never matches when the loop only wakes
        # once a day, so refresh the scatter data as part of the sweep
        if [[ "$enable_scatter" == "yes" ]]; then
            /usr/share/graphs1090/scatter.sh
        fi
        continue
    fi

    m=$(( SEC / DRAW_INTERVAL))

    if   (( m % 2 == 1 )); then          graphs 2h
    elif (( m % 4 == 2 )); then          graphs 8h
    elif (( m % 8 == 4 )); then          graphs 24h
    elif (( m % 16 == 8 )); then         graphs 48h
    elif (( m % 32 == 16 )); then        graphs 7d
    elif (( m % 64 == 32 )); then        graphs 14d
    elif (( m % 128 == 64 )); then       graphs 30d
    elif (( m % 256 == 128 )); then      graphs 90d
    elif (( m % 512 == 256 )); then      graphs 180d
    elif (( m % 1024 == 512 )); then     graphs 365d
    elif (( m % 2048 == 1024 )); then    graphs 730d
    elif (( m % 4096 == 2048 )); then    graphs 1095d
    elif (( m % 8192 == 4096 )); then    graphs 1825d
    else                                 graphs 3650d
    fi

    if [[ $(date +%H:%M) == 00:07 ]]; then
        echo running scatter.sh
        /usr/share/graphs1090/scatter.sh
    fi
done &
wait || true;
