/**
 * Battery Day Card – Home Assistant Lovelace Custom Card
 * Zeigt Laden / Entladen der Batterie über den Tag, Spitzen und Top-Stunden.
 *
 * Funktioniert mit Leistungs-Sensoren (W / kW) und mit Energie-Zählern (Wh / kWh).
 */
const CARD_VERSION = "1.0.0";

const DEFAULTS = {
  title: "Batterie heute",
  charge_entity: "sensor.h3_6kw_battery_charge",
  discharge_entity: "sensor.h3_6kw_battery_discharge",
  soc_entity: "",
  bucket_minutes: 15,
  charge_color: "#2fd38a",
  discharge_color: "#ff8a3d",
  soc_color: "#7aa7ff",
  refresh_minutes: 5,
};

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

const fmtKW = (v) => (v >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(".", ",");
const fmtKWh = (v) => (v >= 100 ? v.toFixed(0) : v.toFixed(1)).replace(".", ",");
const pad = (n) => String(n).padStart(2, "0");
const fmtTime = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function startOfDay(offsetDays = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d.getTime();
}

function hexToRgba(hex, a) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return hex;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

class BatteryDayCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._dayOffset = 0;
    this._data = null;
    this._loading = false;
    this._lastFetch = 0;
    this._error = null;
  }

  static getStubConfig() {
    return { ...DEFAULTS };
  }

  static getConfigElement() {
    return document.createElement("battery-day-card-editor");
  }

  setConfig(config) {
    if (!config.charge_entity || !config.discharge_entity) {
      throw new Error("Bitte charge_entity und discharge_entity angeben.");
    }
    let bm = Number(config.bucket_minutes) || DEFAULTS.bucket_minutes;
    const allowed = [5, 10, 15, 20, 30, 60];
    bm = allowed.reduce((a, b) => (Math.abs(b - bm) < Math.abs(a - bm) ? b : a));
    this._config = { ...DEFAULTS, ...config, bucket_minutes: bm };
    this._data = null;
    this._lastFetch = 0;
    if (this._hass) this._fetch();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (!this._config) return;
    const refresh = (this._config.refresh_minutes || 5) * 60 * 1000;
    if (first || (this._dayOffset === 0 && Date.now() - this._lastFetch > refresh)) {
      this._fetch();
    }
  }

  getCardSize() {
    return 6;
  }

  connectedCallback() {
    this._timer = setInterval(() => {
      if (this._hass && this._dayOffset === 0) this._fetch();
    }, (this._config?.refresh_minutes || 5) * 60 * 1000);
  }

  disconnectedCallback() {
    clearInterval(this._timer);
  }

  /* ------------------------------------------------------------ Daten */

  async _fetch() {
    if (this._loading || !this._hass) return;
    this._loading = true;
    this._lastFetch = Date.now();
    const c = this._config;
    const dayStart = startOfDay(this._dayOffset);
    const dayEnd = dayStart + DAY_MS;
    const now = Date.now();
    const end = Math.min(dayEnd, now);
    const ids = [c.charge_entity, c.discharge_entity, c.soc_entity].filter(Boolean);
    try {
      const res = await this._hass.callWS({
        type: "history/history_during_period",
        start_time: new Date(dayStart).toISOString(),
        end_time: new Date(end).toISOString(),
        entity_ids: ids,
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false,
      });
      this._error = null;
      this._data = this._process(res, dayStart, end);
    } catch (e) {
      this._error = e?.message || String(e);
    }
    this._loading = false;
    this._render();
  }

  _points(raw) {
    return (raw || [])
      .map((p) => ({
        t: (p.lu ?? p.lc ?? Date.parse(p.last_updated || p.last_changed) / 1000) * 1000,
        v: parseFloat(p.s ?? p.state),
      }))
      .filter((p) => Number.isFinite(p.t))
      .sort((a, b) => a.t - b.t);
  }

  _unit(entity) {
    return (this._hass.states[entity]?.attributes?.unit_of_measurement || "").trim();
  }

  _series(entity, raw, dayStart, end) {
    const unit = this._unit(entity);
    const bucketMs = this._config.bucket_minutes * 60 * 1000;
    const nB = Math.round(DAY_MS / bucketMs);
    const energy = new Array(nB).fill(0); // kWh je Bucket
    const pts = this._points(raw);
    const isEnergy = /wh$/i.test(unit);
    const toK = /^(w|wh)$/i.test(unit) ? 0.001 : /^m/i.test(unit) ? 1000 : 1;
    let peak = { v: 0, t: null };

    if (isEnergy) {
      // Zählerstände: Differenzen auf Buckets verteilen
      let prev = null;
      for (const p of pts) {
        if (!Number.isFinite(p.v)) continue;
        if (prev !== null) {
          let d = p.v - prev;
          if (d < 0) d = p.v; // Reset (z. B. Tageszähler um Mitternacht)
          const b = Math.floor((Math.max(p.t, dayStart) - dayStart) / bucketMs);
          if (b >= 0 && b < nB) energy[b] += d * toK;
        }
        prev = p.v;
      }
      energy.forEach((e, b) => {
        const kw = e / (bucketMs / HOUR_MS);
        if (kw > peak.v) peak = { v: kw, t: dayStart + b * bucketMs + bucketMs / 2 };
      });
    } else {
      // Leistung: Treppenfunktion zeitgewichtet integrieren
      for (let i = 0; i < pts.length; i++) {
        const v = Number.isFinite(pts[i].v) ? Math.max(0, pts[i].v * toK) : 0;
        const s = Math.max(pts[i].t, dayStart);
        const e = Math.min(i + 1 < pts.length ? pts[i + 1].t : end, end);
        if (pts[i].t >= dayStart && pts[i].t <= end && v > peak.v) peak = { v, t: pts[i].t };
        if (e <= s || v === 0) continue;
        let cur = s;
        while (cur < e) {
          const b = Math.floor((cur - dayStart) / bucketMs);
          const bEnd = dayStart + (b + 1) * bucketMs;
          const segEnd = Math.min(bEnd, e);
          if (b >= 0 && b < nB) energy[b] += (v * (segEnd - cur)) / HOUR_MS;
          cur = segEnd;
        }
      }
    }

    // mittlere Leistung je Bucket (laufender Bucket: nur bisher vergangene Zeit)
    const avg = energy.map((e, b) => {
      const bs = dayStart + b * bucketMs;
      const span = Math.min(bucketMs, Math.max(0, end - bs));
      return span > 0 ? e / (span / HOUR_MS) : null;
    });

    const hourly = new Array(24).fill(0);
    energy.forEach((e, b) => (hourly[Math.floor((b * bucketMs) / HOUR_MS)] += e));
    const total = energy.reduce((a, b) => a + b, 0);
    return { avg, hourly, total, peak, unit, isEnergy };
  }

  _soc(raw, dayStart, end) {
    return this._points(raw)
      .filter((p) => Number.isFinite(p.v))
      .map((p) => ({ t: Math.max(p.t, dayStart), v: Math.min(100, Math.max(0, p.v)) }))
      .filter((p) => p.t <= end);
  }

  _process(res, dayStart, end) {
    const c = this._config;
    return {
      dayStart,
      end,
      charge: this._series(c.charge_entity, res[c.charge_entity], dayStart, end),
      discharge: this._series(c.discharge_entity, res[c.discharge_entity], dayStart, end),
      soc: c.soc_entity ? this._soc(res[c.soc_entity], dayStart, end) : null,
    };
  }

  /* ------------------------------------------------------------ Rendering */

  _render() {
    const c = this._config;
    const d = this._data;
    const dayStart = startOfDay(this._dayOffset);
    const dateLabel =
      this._dayOffset === 0
        ? "Heute"
        : this._dayOffset === 1
        ? "Gestern"
        : new Date(dayStart).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });

    const body = this._error
      ? `<div class="msg">Fehler beim Laden der Historie:<br>${this._error}</div>`
      : !d
      ? `<div class="msg">Lade Verlauf …</div>`
      : this._renderBody(d);

    this.shadowRoot.innerHTML = `
      <style>${this._css()}</style>
      <ha-card>
        <div class="head">
          <div class="title">
            <svg viewBox="0 0 24 24" class="icon"><path fill="currentColor" d="M16 4h-1V2H9v2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm-3 15h-2v-4H9l4-7v4h2l-2 7Z"/></svg>
            <span>${c.title || ""}</span>
          </div>
          <div class="nav">
            <button id="prev" title="Vorheriger Tag">‹</button>
            <span class="date">${dateLabel}</span>
            <button id="next" title="Nächster Tag" ${this._dayOffset === 0 ? "disabled" : ""}>›</button>
          </div>
        </div>
        ${body}
      </ha-card>`;

    this.shadowRoot.getElementById("prev").onclick = () => this._shift(1);
    this.shadowRoot.getElementById("next").onclick = () => this._shift(-1);
    if (d && !this._error) this._bindHover(d);
  }

  _shift(delta) {
    this._dayOffset = Math.max(0, this._dayOffset + delta);
    this._data = null;
    this._render();
    this._fetch();
  }

  _renderBody(d) {
    const c = this._config;
    const ch = d.charge;
    const dis = d.discharge;
    return `
      <div class="stats">
        ${this._stat("Geladen", fmtKWh(ch.total), "kWh", c.charge_color, "▲")}
        ${this._stat("Entladen", fmtKWh(dis.total), "kWh", c.discharge_color, "▼")}
        ${this._stat("Spitze Laden", ch.peak.t ? fmtKW(ch.peak.v) : "–", "kW", c.charge_color, "", ch.peak.t ? `um ${fmtTime(ch.peak.t)}` : "")}
        ${this._stat("Spitze Entladen", dis.peak.t ? fmtKW(dis.peak.v) : "–", "kW", c.discharge_color, "", dis.peak.t ? `um ${fmtTime(dis.peak.t)}` : "")}
      </div>
      <div class="chart">
        ${this._svg(d)}
        <div class="tip" id="tip"></div>
      </div>
      ${this._heat(d)}
      <div class="tops">
        ${this._top("Stärkste Ladestunden", ch.hourly, c.charge_color)}
        ${this._top("Stärkste Entladestunden", dis.hourly, c.discharge_color)}
      </div>`;
  }

  _stat(label, value, unit, color, arrow, sub = "") {
    return `
      <div class="stat" style="--c:${color}">
        <div class="lbl">${arrow ? `<span class="arr">${arrow}</span>` : ""}${label}</div>
        <div class="val">${value}<small>${unit}</small></div>
        <div class="sub">${sub || "&nbsp;"}</div>
      </div>`;
  }

  _svg(d) {
    const c = this._config;
    const W = 640, H = 230, L = 38, R = 30, T = 14, B = 22;
    const iw = W - L - R, ih = H - T - B, mid = T + ih / 2;
    this._geo = { W, H, L, R, T, B, iw, ih, mid };

    const ca = d.charge.avg, da = d.discharge.avg, n = ca.length;
    const maxV = Math.max(0.3, ...ca.map((v) => v || 0), ...da.map((v) => v || 0)) * 1.15;
    const step = maxV > 4 ? 2 : maxV > 2 ? 1 : maxV > 1 ? 0.5 : 0.25;
    const top = Math.ceil(maxV / step) * step;
    this._geo.top = top;
    const x = (i) => L + ((i + 0.5) / n) * iw;
    const y = (v, sign) => mid - sign * (v / top) * (ih / 2);

    const area = (arr, sign) => {
      const idx = arr.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0);
      if (!idx.length) return { fill: "", line: "" };
      const pts = idx.map((i) => [x(i), y(arr[i], sign)]);
      // geglättete Kurve (Catmull-Rom → Bezier)
      let line = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        const c1y = p1[1] + (p2[1] - p0[1]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
        const clamp = (v) => (sign > 0 ? Math.min(mid, v) : Math.max(mid, v));
        line += ` C${p1[0] + (p2[0] - p0[0]) / 6},${clamp(c1y)} ${p2[0] - (p3[0] - p1[0]) / 6},${clamp(c2y)} ${p2[0]},${p2[1]}`;
      }
      const fill = `${line} L${pts[pts.length - 1][0]},${mid} L${pts[0][0]},${mid} Z`;
      return { fill, line };
    };
    const up = area(ca, 1), dn = area(da, -1);

    // Gitter
    let grid = "";
    for (let v = step; v <= top + 1e-9; v += step) {
      for (const s of [1, -1]) {
        grid += `<line x1="${L}" x2="${W - R}" y1="${y(v, s)}" y2="${y(v, s)}" class="g"/>`;
        grid += `<text x="${L - 6}" y="${y(v, s) + 3}" class="ax" text-anchor="end">${fmtKW(v).replace(/,?0+$/, "")}</text>`;
      }
    }
    grid += `<line x1="${L}" x2="${W - R}" y1="${mid}" y2="${mid}" class="zero"/>`;
    grid += `<text x="${L - 6}" y="${mid + 3}" class="ax" text-anchor="end">0</text>`;
    let hours = "";
    for (let h = 0; h <= 24; h += 3) {
      const hx = L + (h / 24) * iw;
      hours += `<line x1="${hx}" x2="${hx}" y1="${T}" y2="${H - B}" class="g v"/>`;
      hours += `<text x="${hx}" y="${H - 6}" class="ax" text-anchor="middle">${pad(h % 24 === 0 && h ? 24 : h)}</text>`;
    }
    hours += `<text x="${L - 6}" y="${T - 9}" class="ax unit" text-anchor="end">kW</text>`;

    // Jetzt-Linie
    let nowLine = "";
    if (this._dayOffset === 0) {
      const nx = L + ((Date.now() - d.dayStart) / DAY_MS) * iw;
      nowLine = `<line x1="${nx}" x2="${nx}" y1="${T}" y2="${H - B}" class="now"/><text x="${nx}" y="${T - 3}" class="ax nowt" text-anchor="middle">jetzt</text>`;
    }

    // SoC
    let soc = "";
    if (d.soc && d.soc.length) {
      const sx = (t) => L + ((t - d.dayStart) / DAY_MS) * iw;
      const sy = (v) => T + ih - (v / 100) * ih;
      let p = "";
      d.soc.forEach((pt, i) => {
        p += i === 0 ? `M${sx(pt.t)},${sy(pt.v)}` : ` H${sx(pt.t)} V${sy(pt.v)}`;
      });
      p += ` H${sx(d.end)}`;
      soc = `<path d="${p}" class="soc" stroke="${c.soc_color}"/>`;
      for (const v of [0, 50, 100]) soc += `<text x="${W - R + 5}" y="${sy(v) + 3}" class="ax" fill="${c.soc_color}" style="fill:${c.soc_color}">${v}%</text>`;
    }

    // Peak-Marker (an der Bucket-Position der Spitze)
    const bucketMs = this._config.bucket_minutes * 60 * 1000;
    const marker = (ser, arr, sign, color) => {
      if (!ser.peak.t) return "";
      const i = Math.min(n - 1, Math.floor((ser.peak.t - d.dayStart) / bucketMs));
      const v = arr[i] || 0;
      const px = x(i), py = y(v, sign);
      const lbl = `${fmtKW(ser.peak.v)} kW · ${fmtTime(ser.peak.t)}`;
      const ty = sign > 0 ? Math.max(T + 10, py - 10) : Math.min(H - B - 4, py + 18);
      const anchor = px > W - R - 70 ? "end" : px < L + 70 ? "start" : "middle";
      return `
        <circle cx="${px}" cy="${py}" r="9" fill="${hexToRgba(color, 0.25)}" class="pulse"/>
        <circle cx="${px}" cy="${py}" r="4" fill="${color}" stroke="var(--card-background-color,#fff)" stroke-width="1.5"/>
        <text x="${px}" y="${ty}" class="pk" text-anchor="${anchor}" style="fill:${color}">${lbl}</text>`;
    };

    return `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" id="svg">
        <defs>
          <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${c.charge_color}" stop-opacity=".75"/>
            <stop offset="1" stop-color="${c.charge_color}" stop-opacity=".05"/>
          </linearGradient>
          <linearGradient id="gd" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stop-color="${c.discharge_color}" stop-opacity=".75"/>
            <stop offset="1" stop-color="${c.discharge_color}" stop-opacity=".05"/>
          </linearGradient>
        </defs>
        ${grid}${hours}
        <text x="${L + 6}" y="${T + 10}" class="side" style="fill:${c.charge_color}">▲ Laden</text>
        <text x="${L + 6}" y="${H - B - 5}" class="side" style="fill:${c.discharge_color}">▼ Entladen</text>
        <path d="${up.fill}" fill="url(#gc)"/>
        <path d="${up.line}" fill="none" stroke="${c.charge_color}" stroke-width="2"/>
        <path d="${dn.fill}" fill="url(#gd)"/>
        <path d="${dn.line}" fill="none" stroke="${c.discharge_color}" stroke-width="2"/>
        ${soc}${nowLine}
        ${marker(d.charge, ca, 1, c.charge_color)}
        ${marker(d.discharge, da, -1, c.discharge_color)}
        <line id="cursor" x1="0" x2="0" y1="${T}" y2="${H - B}" class="cursor"/>
        <rect id="hit" x="${L}" y="${T}" width="${iw}" height="${ih}" fill="transparent"/>
      </svg>`;
  }

  _heat(d) {
    const c = this._config;
    const row = (arr, color, label) => {
      const max = Math.max(...arr, 0.001);
      const cells = arr
        .map((e, h) => {
          const a = e > 0 ? 0.12 + 0.88 * (e / max) : 0.04;
          return `<div class="cell" style="background:${hexToRgba(color, a)}" title="${pad(h)}–${pad(h + 1)} Uhr: ${fmtKWh(e)} kWh"></div>`;
        })
        .join("");
      return `<div class="hrow"><span class="hl" style="color:${color}">${label}</span><div class="cells">${cells}</div></div>`;
    };
    return `<div class="heat">${row(d.charge.hourly, c.charge_color, "Laden")}${row(d.discharge.hourly, c.discharge_color, "Entl.")}</div>`;
  }

  _top(label, hourly, color) {
    const top = hourly
      .map((e, h) => ({ e, h }))
      .filter((x) => x.e > 0.005)
      .sort((a, b) => b.e - a.e)
      .slice(0, 3);
    const chips = top.length
      ? top
          .map(
            (x, i) =>
              `<span class="chip" style="--c:${color}"><b>${i + 1}</b>${pad(x.h)}–${pad(x.h + 1)} Uhr<em>${fmtKWh(x.e)} kWh</em></span>`
          )
          .join("")
      : `<span class="none">keine Aktivität</span>`;
    return `<div class="top"><div class="tl">${label}</div><div class="chips">${chips}</div></div>`;
  }

  _bindHover(d) {
    const svg = this.shadowRoot.getElementById("svg");
    const hit = this.shadowRoot.getElementById("hit");
    const tip = this.shadowRoot.getElementById("tip");
    const cur = this.shadowRoot.getElementById("cursor");
    if (!svg || !hit) return;
    const { W, L, iw } = this._geo;
    const n = d.charge.avg.length;
    const bucketMs = this._config.bucket_minutes * 60 * 1000;
    const move = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) * (W / r.width);
      const i = Math.max(0, Math.min(n - 1, Math.floor(((px - L) / iw) * n)));
      const cv = d.charge.avg[i], dv = d.discharge.avg[i];
      if (cv === null && dv === null) return leave();
      const t0 = d.dayStart + i * bucketMs;
      const cx = L + ((i + 0.5) / n) * iw;
      cur.setAttribute("x1", cx);
      cur.setAttribute("x2", cx);
      cur.style.opacity = 1;
      tip.innerHTML = `<div class="tt">${fmtTime(t0)}–${fmtTime(t0 + bucketMs)}</div>
        <div><i style="background:${this._config.charge_color}"></i>Laden <b>${fmtKW(cv || 0)} kW</b></div>
        <div><i style="background:${this._config.discharge_color}"></i>Entladen <b>${fmtKW(dv || 0)} kW</b></div>`;
      tip.style.opacity = 1;
      const rel = (cx / W) * r.width;
      tip.style.left = `${Math.min(Math.max(rel, 70), r.width - 70)}px`;
    };
    const leave = () => {
      tip.style.opacity = 0;
      cur.style.opacity = 0;
    };
    hit.addEventListener("mousemove", move);
    hit.addEventListener("touchmove", move, { passive: true });
    hit.addEventListener("mouseleave", leave);
    hit.addEventListener("touchend", leave);
  }

  _css() {
    return `
      :host { display:block; }
      ha-card { padding:16px 16px 14px; overflow:hidden; }
      .head { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
      .title { display:flex; align-items:center; gap:8px; font-size:1.1rem; font-weight:600; color:var(--primary-text-color); }
      .icon { width:22px; height:22px; color:${this._config.charge_color}; }
      .nav { display:flex; align-items:center; gap:4px; font-size:.85rem; color:var(--secondary-text-color); }
      .nav button { background:var(--secondary-background-color, rgba(127,127,127,.12)); border:none; color:var(--primary-text-color);
        width:26px; height:26px; border-radius:8px; cursor:pointer; font-size:1.1rem; line-height:1; }
      .nav button:disabled { opacity:.3; cursor:default; }
      .date { min-width:72px; text-align:center; font-weight:500; }
      .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:10px; }
      @media (max-width:500px){ .stats{ grid-template-columns:repeat(2,1fr);} }
      .stat { position:relative; padding:9px 10px 8px; border-radius:12px;
        background:linear-gradient(135deg, color-mix(in srgb, var(--c) 16%, transparent), color-mix(in srgb, var(--c) 4%, transparent));
        border:1px solid color-mix(in srgb, var(--c) 25%, transparent); }
      .lbl { font-size:.72rem; color:var(--secondary-text-color); text-transform:uppercase; letter-spacing:.04em; white-space:nowrap; }
      .arr { color:var(--c); margin-right:4px; }
      .val { font-size:1.35rem; font-weight:700; color:var(--primary-text-color); font-variant-numeric:tabular-nums; }
      .val small { font-size:.75rem; font-weight:500; margin-left:3px; color:var(--secondary-text-color); }
      .sub { font-size:.72rem; color:var(--c); font-weight:600; }
      .chart { position:relative; }
      svg { width:100%; height:220px; display:block; overflow:visible; }
      .g { stroke:var(--divider-color, rgba(127,127,127,.2)); stroke-width:1; stroke-dasharray:2 4; vector-effect:non-scaling-stroke; }
      .zero { stroke:var(--secondary-text-color); stroke-opacity:.5; stroke-width:1; vector-effect:non-scaling-stroke; }
      .ax { font-size:10px; fill:var(--secondary-text-color); }
      .unit { font-weight:600; }
      .side { font-size:10px; font-weight:700; letter-spacing:.05em; opacity:.85; }
      .now { stroke:var(--primary-color,#03a9f4); stroke-width:1.5; stroke-dasharray:3 3; vector-effect:non-scaling-stroke; }
      .nowt { fill:var(--primary-color,#03a9f4); font-weight:600; }
      .soc { fill:none; stroke-width:1.5; stroke-dasharray:4 3; opacity:.9; vector-effect:non-scaling-stroke; }
      .pk { font-size:10.5px; font-weight:700; paint-order:stroke; stroke:var(--card-background-color, var(--ha-card-background,#fff)); stroke-width:3px; }
      .pulse { animation:pulse 2s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
      @keyframes pulse { 0%,100%{ transform:scale(.7); opacity:.9;} 50%{ transform:scale(1.4); opacity:.2;} }
      .cursor { stroke:var(--primary-text-color); stroke-opacity:.35; stroke-width:1; opacity:0; vector-effect:non-scaling-stroke; }
      .tip { position:absolute; top:4px; transform:translateX(-50%); pointer-events:none; opacity:0; transition:opacity .12s;
        background:var(--card-background-color, var(--ha-card-background,#fff)); color:var(--primary-text-color);
        border:1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius:10px; padding:6px 9px; font-size:.75rem;
        box-shadow:0 4px 14px rgba(0,0,0,.18); white-space:nowrap; }
      .tip .tt { font-weight:700; margin-bottom:2px; }
      .tip i { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:5px; }
      .heat { margin:8px 0 4px; display:flex; flex-direction:column; gap:3px; }
      .hrow { display:flex; align-items:center; gap:6px; }
      .hl { width:36px; font-size:.68rem; font-weight:700; text-align:right; }
      .cells { flex:1; display:grid; grid-template-columns:repeat(24,1fr); gap:2px; }
      .cell { height:12px; border-radius:3px; }
      .tops { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px; }
      @media (max-width:500px){ .tops{ grid-template-columns:1fr; } }
      .tl { font-size:.72rem; text-transform:uppercase; letter-spacing:.04em; color:var(--secondary-text-color); margin-bottom:5px; }
      .chips { display:flex; flex-direction:column; gap:4px; }
      .chip { display:flex; align-items:center; gap:8px; font-size:.8rem; color:var(--primary-text-color);
        background:color-mix(in srgb, var(--c) 10%, transparent); border-radius:8px; padding:4px 8px; }
      .chip b { width:18px; height:18px; border-radius:50%; background:var(--c); color:#fff; font-size:.7rem;
        display:inline-flex; align-items:center; justify-content:center; }
      .chip em { margin-left:auto; font-style:normal; font-weight:700; color:var(--c); font-variant-numeric:tabular-nums; }
      .none { font-size:.8rem; color:var(--secondary-text-color); }
      .msg { padding:40px 0; text-align:center; color:var(--secondary-text-color); }
    `;
  }
}

/* ------------------------------------------------------------ Editor */

class BatteryDayCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }
  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }
  _render() {
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) =>
        ({
          title: "Titel",
          charge_entity: "Sensor Laden",
          discharge_entity: "Sensor Entladen",
          soc_entity: "Ladezustand (SoC, optional)",
          bucket_minutes: "Auflösung (Minuten)",
          charge_color: "Farbe Laden",
          discharge_color: "Farbe Entladen",
          soc_color: "Farbe SoC",
          refresh_minutes: "Aktualisierung (Minuten)",
        }[s.name] || s.name);
      this._form.addEventListener("value-changed", (ev) => {
        const cfg = { ...ev.detail.value };
        if (cfg.bucket_minutes) cfg.bucket_minutes = Number(cfg.bucket_minutes);
        this._config = cfg;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = { ...this._config, bucket_minutes: String(this._config.bucket_minutes ?? DEFAULTS.bucket_minutes) };
    this._form.schema = [
      { name: "title", selector: { text: {} } },
      { name: "charge_entity", required: true, selector: { entity: { domain: "sensor" } } },
      { name: "discharge_entity", required: true, selector: { entity: { domain: "sensor" } } },
      { name: "soc_entity", selector: { entity: { domain: "sensor" } } },
      {
        name: "bucket_minutes",
        selector: { select: { mode: "dropdown", options: ["5", "10", "15", "30", "60"].map((v) => ({ value: v, label: `${v} min` })) } },
      },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "charge_color", selector: { text: {} } },
          { name: "discharge_color", selector: { text: {} } },
          { name: "soc_color", selector: { text: {} } },
        ],
      },
      { name: "refresh_minutes", selector: { number: { min: 1, max: 60, mode: "box" } } },
    ];
  }
}

customElements.define("battery-day-card", BatteryDayCard);
customElements.define("battery-day-card-editor", BatteryDayCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "battery-day-card",
  name: "Battery Day Card",
  description: "Laden & Entladen der Batterie über den Tag mit Spitzen und Top-Stunden",
  preview: true,
});

console.info(`%c BATTERY-DAY-CARD %c v${CARD_VERSION} `, "background:#2fd38a;color:#000;font-weight:700", "background:#ff8a3d;color:#000");
