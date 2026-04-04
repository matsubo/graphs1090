//*** BEGIN USER DEFINED VARIABLES ***//

// Set the default time frame to use when loading images when the page is first accessed.
// Can be set to 2h, 8h, 24h, 7d, 30d, or 365d.
let timeFrame = '24h';

// Set the page refresh interval in milliseconds.
let refreshInterval = 60000

//*** END USER DEFINED VARIABLES ***//

// Set this to the hostName of the system which is running dump1090.
let hostName = 'localhost';

let usp;
try {
    // let's make this case insensitive
    usp = {
        params: new URLSearchParams(),
        has: function(s) {return this.params.has(s.toLowerCase());},
        get: function(s) {
            let val = this.params.get(s.toLowerCase());
            if (val) {
                // make XSS a bit harder
                val = val.replace(/[<>#&]/g, '');
            }
            return val;
        },
        getFloat: function(s) {
            if (!this.params.has(s.toLowerCase())) return null;
            const param = this.params.get(s.toLowerCase());
            if (!param) return null;
            const val = parseFloat(param);
            if (isNaN(val)) return null;
            return val;
        },
        getInt: function(s) {
            if (!this.params.has(s.toLowerCase())) return null;
            const param = this.params.get(s.toLowerCase());
            if (!param) return null;
            const val = parseInt(param, 10);
            if (isNaN(val)) return null;
            return val;
        }
    };
    const inputParams = new URLSearchParams(window.location.search);
    for (const [k, v] of inputParams) {
        usp.params.append(k.toLowerCase(), v);
    }
} catch (error) {
    console.error(error);
    usp = {
        has: function() {return false;},
        get: function() {return null;},
    }
}

if (usp.getInt('refreshInterval')) {
    const ri = usp.getInt('refreshInterval') * 1000;
    if (ri >= 10000 && ri <= 3600000) {
        refreshInterval = ri;
    }
}

if (usp.get('timeframe')) {
    timeFrame = usp.get('timeframe');
}

//*** DO NOT EDIT BELOW THIS LINE UNLESS YOU KNOW WHAT YOU ARE DOING ***//

function setGraph(id, src) {
    const img = document.getElementById(id + '-image');
    const link = document.getElementById(id + '-link');
    if (img) img.src = src;
    if (link) link.href = src;
}

function switchView(newTimeFrame) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(switchView, refreshInterval);

    if (newTimeFrame) {
        timeFrame = newTimeFrame;
    }

    const timestamp = Math.round(new Date().getTime() / 1000 / 15) * 15;

    function graphUrl(source, metric) {
        return `graphs/${source}-${hostName}-${metric}-${timeFrame}.png?time=${timestamp}`;
    }

    setGraph('dump1090-local_trailing_rate', graphUrl('dump1090', 'local_trailing_rate'));
    setGraph('dump1090-local_rate',          graphUrl('dump1090', 'local_rate'));
    setGraph('dump1090-aircraft_message_rate', graphUrl('dump1090', 'aircraft_message_rate'));
    setGraph('dump1090-aircraft',            graphUrl('dump1090', 'aircraft'));
    setGraph('dump1090-tracks',              graphUrl('dump1090', 'tracks'));
    setGraph('dump1090-signal',              graphUrl('dump1090', 'signal'));
    setGraph('dump1090-cpu',                 graphUrl('dump1090', 'cpu'));
    setGraph('dump1090-misc',                graphUrl('dump1090', 'misc'));

    if (document.getElementById('dump1090-range-image'))
        setGraph('dump1090-range', graphUrl('dump1090', 'range'));
    if (document.getElementById('dump1090-range_imperial_statute-image'))
        setGraph('dump1090-range_imperial_statute', graphUrl('dump1090', 'range_imperial_statute'));
    if (document.getElementById('dump1090-range_metric-image'))
        setGraph('dump1090-range_metric', graphUrl('dump1090', 'range_metric'));

    const panelAirspy = document.getElementById('panel_airspy');
    if (panelAirspy && panelAirspy.style.display !== 'none') {
        setGraph('airspy-rssi',  graphUrl('airspy', 'rssi'));
        setGraph('airspy-snr',   graphUrl('airspy', 'snr'));
        setGraph('airspy-noise', graphUrl('airspy', 'noise'));
        setGraph('airspy-misc',  graphUrl('airspy', 'misc'));
        setGraph('df_counts', `graphs/df_counts-${hostName}-${timeFrame}.png?time=${timestamp}`);
    }

    const panel978 = document.getElementById('panel_978');
    if (panel978 && panel978.style.display !== 'none') {
        setGraph('dump1090-aircraft_978', graphUrl('dump1090', 'aircraft_978'));
        setGraph('dump1090-range_978',    graphUrl('dump1090', 'range_978'));
        setGraph('dump1090-messages_978', graphUrl('dump1090', 'messages_978'));
        setGraph('dump1090-signal_978',   graphUrl('dump1090', 'signal_978'));
    }


    // Update active button
    document.querySelectorAll('.btn-group .btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-' + timeFrame)?.classList.add('active');

    const pathName = window.location.pathname.replace(/\/+/, '/') || '/';
    window.history.replaceState(null, '', window.location.origin + pathName + '?timeframe=' + timeFrame);
}

let verbose = false;
let refreshTimer = null;
let timersActive = false;

function handleVisibilityChange() {
    if (document.hidden && timersActive) {
        verbose && console.log(new Date().toLocaleTimeString() + ' visibility change: stopping timers');
        clearTimeout(refreshTimer);
        timersActive = false;
    }
    if (!document.hidden && !timersActive) {
        verbose && console.log(new Date().toLocaleTimeString() + ' visibility change: starting timers');
        timersActive = true;
        switchView();
    }
}

if (typeof document.addEventListener === 'undefined' || document.hidden === undefined) {
    console.error('hidden tab handler requires a browser that supports the Page Visibility API.');
} else {
    document.addEventListener('visibilitychange', handleVisibilityChange, false);
}

handleVisibilityChange();


function isDarkTheme() {
    return document.documentElement.dataset.theme === 'dark';
}

function toggleTheme() {
    const next = isDarkTheme() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    updateThemeButton();
}

function updateThemeButton() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.textContent = isDarkTheme() ? '☀ Light' : '☾ Dark';
}

updateThemeButton();

async function loadScatter() {
    const panel = document.getElementById('panel_scatter');
    if (!panel || panel.style.display === 'none') return;
    const canvas = document.getElementById('scatter-canvas');
    if (!canvas) return;

    // find latest scatter data file
    let data;
    try {
        const index = await fetch('scatter/').then(r => r.text());
        const files = [...index.matchAll(/href="(\d{4}-\d{2}-\d{2})"/g)].map(m => m[1]).sort();
        if (!files.length) return;
        const latest = files[files.length - 1];
        const text = await fetch('scatter/' + latest).then(r => r.text());
        data = text.trim().split('\n').map(l => l.trim().split(/\s+/).map(Number)).filter(r => r.length === 4);
    } catch (e) { return; }

    const dark = isDarkTheme();
    const W = canvas.offsetWidth || 800;
    const H = 300;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = dark ? '#1c1c1f' : '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const pad = 40;
    const maxRange = Math.max(...data.map(r => r[0]), 1);
    const maxAircraft = Math.max(...data.map(r => r[3]), 1);

    ctx.fillStyle = dark ? 'rgba(91,158,255,0.6)' : 'rgba(0,87,216,0.5)';
    for (const [range, , , aircraft] of data) {
        const x = pad + (range / maxRange) * (W - pad * 2);
        const y = H - pad - (aircraft / maxAircraft) * (H - pad * 2);
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // axis labels
    ctx.fillStyle = dark ? '#71717a' : '#6b7280';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Max Range (NM)', W / 2, H - 4);
    ctx.save();
    ctx.translate(12, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Aircraft', 0, 0);
    ctx.restore();
}

loadScatter();
