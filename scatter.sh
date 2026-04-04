#!/bin/bash

DB=/var/lib/collectd/rrd
# settings in /etc/default/graphs1090 will overwrite the DB directory

source /etc/default/graphs1090

if [[ -z "$enable_scatter" ]] || [[ "$enable_scatter" == "no" ]]; then
    exit 0
fi

# Fetch a day worth of data from the rrds
data_dir=/var/lib/graphs1090/scatter
tmp=/run/graphs1090/scatter
mkdir -p ${tmp}

date=$(date -I --date=yesterday)
endtime="midnight today"
if ! [ -z $1 ]; then
	date=$(date -I --date=-${1}days)
	endtime="midnight tomorrow -${1}days"
fi


rrdtool fetch ${DB}/localhost/dump1090-localhost/dump1090_messages-local_accepted.rrd AVERAGE -s end-1439m -e "$endtime" -r 3m -a > ${tmp}/messages_l
rrdtool fetch ${DB}/localhost/dump1090-localhost/dump1090_messages-remote_accepted.rrd AVERAGE -s end-1439m -e "$endtime" -r 3m -a > ${tmp}/messages_r
rrdtool fetch ${DB}/localhost/dump1090-localhost/dump1090_range-max_range.rrd MAX -s end-1439m -e "$endtime" -r 3m -a > ${tmp}/range
rrdtool fetch ${DB}/localhost/dump1090-localhost/dump1090_aircraft-recent.rrd AVERAGE -s end-1439m -e "$endtime" -r 3m -a > ${tmp}/aircraft


# Remove headers and extraneous :


sed -i -e 's/://' -e 's/\,/\./g' ${tmp}/messages_l
sed -i -e 's/://' -e 's/\,/\./g' ${tmp}/messages_r
sed -i -e 's/://' -e 's/\,/\./g' ${tmp}/range
sed -i -e 's/://' -e 's/\,/\./g' ${tmp}/aircraft


sed -i -e '1d;2d' ${tmp}/messages_l
sed -i -e '1d;2d' ${tmp}/messages_r
sed -i -e '1d;2d' ${tmp}/range
sed -i -e '1d;2d' ${tmp}/aircraft

# Combine files to create space separated data file for use by gnuplot


join -o 1.1 1.2 2.2 ${tmp}/range ${tmp}/messages_l > ${tmp}/tmp
join -o 1.1 1.2 1.3 2.2 ${tmp}/tmp ${tmp}/messages_r > ${tmp}/tmp1
join -o 1.2 1.3 1.4 2.2 ${tmp}/tmp1 ${tmp}/aircraft > $data_dir/$date

# get rid of nan values to simplify usage in gnuplot

sed -i 's/nan/0/g' $data_dir/$date

# update latest symlink for web access
ln -snf "$data_dir/$date" "$data_dir/latest"

# some cleanup
find "$data_dir" -maxdepth 1 -type f -print0 | sort -z | head -zn -450 | xargs -0 -r rm -f
rm -rf "${tmp}"
