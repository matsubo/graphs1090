// Range / aircraft scatter plot.
//
// Drawn with the plain canvas API on purpose: graphs1090 ships no third-party
// JavaScript, and a receiver on a LAN without internet access must not wait on
// a CDN before the rest of the page can run.

const SCATTER_PAD = { left: 62, right: 18, top: 16, bottom: 46 };
const METRES_PER_NM = 1852;
const SCATTER_HIT_RADIUS = 14;

let scatterPoints = null;
let scatterProjected = [];
let scatterHover = null;
let scatterRedrawQueued = false;

function scatterCanvas() {
    const panel = document.getElementById('panel_scatter');
    const canvas = document.getElementById('scatter-canvas');
    if (!panel || !canvas || panel.style.display === 'none') return null;
    return canvas;
}

function hideScatterPanel() {
    const panel = document.getElementById('panel_scatter');
    if (panel) panel.style.display = 'none';
}

function cssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name);
    return value.trim() || fallback;
}

// Pick a 1/2/5 * 10^n step so roughly `count` ticks cover `span`.
function tickStep(span, count) {
    if (!(span > 0)) return 1;
    const raw = span / Math.max(count, 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const normalized = raw / magnitude;
    return (normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1) * magnitude;
}

function axisBounds(values, tickCount) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const value of values) {
        if (value < lo) lo = value;
        if (value > hi) hi = value;
    }
    if (!isFinite(lo) || !isFinite(hi)) return null;
    if (hi === lo) hi = lo + 1;
    const step = tickStep(hi - lo, tickCount);
    return { lo: Math.floor(lo / step) * step, hi: Math.ceil(hi / step) * step, step };
}

function formatTick(value, step) {
    return value.toFixed(step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step))));
}

// scatter.sh writes "range_metres local_rate remote_rate aircraft" per line.
function parseScatterData(text) {
    return text.trim().split('\n')
        .map(line => line.trim().split(/\s+/).map(Number))
        .filter(row => row.length === 4 && row[0] > 0 && row.every(n => isFinite(n)))
        .map(row => ({ range: row[0] / METRES_PER_NM, aircraft: row[3] }));
}

function drawScatter() {
    const canvas = scatterCanvas();
    if (!canvas || !scatterPoints || !scatterPoints.length) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!ctx || !width || !height) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const xAxis = axisBounds(scatterPoints.map(p => p.range), 6);
    const yAxis = axisBounds(scatterPoints.map(p => p.aircraft), 5);
    if (!xAxis || !yAxis) return;

    const left = SCATTER_PAD.left;
    const top = SCATTER_PAD.top;
    const right = width - SCATTER_PAD.right;
    const bottom = height - SCATTER_PAD.bottom;
    if (right <= left || bottom <= top) return;

    const toX = v => left + (v - xAxis.lo) / (xAxis.hi - xAxis.lo) * (right - left);
    const toY = v => bottom - (v - yAxis.lo) / (yAxis.hi - yAxis.lo) * (bottom - top);

    const grid = cssVar('--border', '#dde1e6');
    const label = cssVar('--text-muted', '#6b7280');
    const accent = cssVar('--accent', '#0057d8');

    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.strokeStyle = grid;
    ctx.fillStyle = label;
    ctx.lineWidth = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = xAxis.lo; v <= xAxis.hi + xAxis.step / 2; v += xAxis.step) {
        const x = Math.round(toX(v)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.stroke();
        ctx.fillText(formatTick(v, xAxis.step), x, bottom + 7);
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = yAxis.lo; v <= yAxis.hi + yAxis.step / 2; v += yAxis.step) {
        const y = Math.round(toY(v)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
        ctx.fillText(formatTick(v, yAxis.step), left - 8, y);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Max Range (NM)', (left + right) / 2, height - 6);
    ctx.save();
    ctx.translate(12, (top + bottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'top';
    ctx.fillText('Aircraft Seen (avg)', 0, 0);
    ctx.restore();

    scatterProjected = scatterPoints.map(p => ({ ...p, cx: toX(p.range), cy: toY(p.aircraft) }));

    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.55;
    for (const point of scatterProjected) {
        ctx.beginPath();
        ctx.arc(point.cx, point.cy, 2.2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (scatterHover) drawScatterTooltip(ctx, width, accent, label);
}

function drawScatterTooltip(ctx, width, accent, label) {
    const point = scatterHover;
    const lines = [
        `Range: ${point.range.toFixed(1)} NM`,
        `Aircraft: ${point.aircraft.toFixed(1)}`
    ];

    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(point.cx, point.cy, 4.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const padding = 7;
    const lineHeight = 15;
    const boxWidth = Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2;
    const boxHeight = lines.length * lineHeight + padding * 2;
    let boxX = point.cx + 12;
    let boxY = point.cy - boxHeight - 8;
    if (boxX + boxWidth > width) boxX = point.cx - boxWidth - 12;
    if (boxY < 0) boxY = point.cy + 12;

    ctx.fillStyle = cssVar('--surface', '#ffffff');
    ctx.strokeStyle = cssVar('--border', '#dde1e6');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(boxX, boxY, boxWidth, boxHeight);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = label;
    lines.forEach((line, i) => ctx.fillText(line, boxX + padding, boxY + padding + i * lineHeight));
}

function queueScatterRedraw() {
    if (scatterRedrawQueued) return;
    scatterRedrawQueued = true;
    window.requestAnimationFrame(() => {
        scatterRedrawQueued = false;
        drawScatter();
    });
}

function handleScatterHover(event) {
    const canvas = scatterCanvas();
    if (!canvas || !scatterProjected.length) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    let nearest = null;
    let nearestDistance = SCATTER_HIT_RADIUS * SCATTER_HIT_RADIUS;
    for (const point of scatterProjected) {
        const distance = (point.cx - mouseX) ** 2 + (point.cy - mouseY) ** 2;
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = point;
        }
    }

    if (nearest !== scatterHover) {
        scatterHover = nearest;
        queueScatterRedraw();
    }
}

function clearScatterHover() {
    if (!scatterHover) return;
    scatterHover = null;
    queueScatterRedraw();
}

async function loadScatter() {
    const canvas = scatterCanvas();
    if (!canvas) return;

    try {
        // scatter.sh repoints this symlink daily without the URL changing,
        // so the cached copy has to be revalidated rather than reused
        const response = await fetch('scatter/latest', { cache: 'no-cache' });
        if (!response.ok) throw new Error(`scatter/latest: ${response.status}`);
        scatterPoints = parseScatterData(await response.text());
    } catch (error) {
        console.error(error);
        hideScatterPanel();
        return;
    }

    // no data yet - scatter.sh only writes a file once a full day is collected
    if (!scatterPoints.length) {
        hideScatterPanel();
        return;
    }

    canvas.addEventListener('mousemove', handleScatterHover);
    canvas.addEventListener('mouseleave', clearScatterHover);
    window.addEventListener('resize', queueScatterRedraw);
    document.addEventListener('themechange', queueScatterRedraw);
    drawScatter();
}

loadScatter();
