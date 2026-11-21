/**
 * Battery Day Card – Home Assistant Lovelace Custom Card
 * Zeigt Laden / Entladen der Batterie über den Tag, Spitzen und Top-Stunden.
 * https://github.com/muhkuh666/battery-day-card
 */
const CARD_VERSION = "1.2.0";

const DEFAULTS = {
  // Sensoren
  mode: "separate", // separate | combined
  charge_entity: "",
  discharge_entity: "",
  power_entity: "",
  invert: false,
  soc_entity: "",
  unit_mode: "auto", // auto | power | energy
  // Kopf
  title: "Batterie heute",
  icon: "mdi:home-battery",
  show_header: true,
  show_navigation: true,
  // Diagramm
  chart_type: "area", // area | bars
  smooth: true,
  chart_height: 220,
  bucket_minutes: 15,
  y_max: 0,
  show_peaks: true,
  show_now_line: true,
  show_grid: true,
  show_soc: true,
  animate_peaks: true,
  // Bereiche
  show_stats: true,
  show_heatmap: true,
  heatmap_style: "rows", // rows | net | clock
  show_top: true,
  top_count: 3,
  // Farben
  theme: "auto", // auto | dark | light
  charge_color: "#2fd38a",
  discharge_color: "#ff8a3d",
  soc_color: "#7aa7ff",
  now_color: "#03a9f4",
  // Erweitert
  refresh_minutes: 5,
};

const COLOR_KEYS = ["charge_color", "discharge_color", "soc_color", "now_color"];
const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

const fmtKW = (v) => (v >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(".", ",");
const fmtKWh = (v) => (v >= 100 ? v.toFixed(0) : v.toFixed(1)).replace(".", ",");
const pad = (n) => String(n).padStart(2, "0");
const fmtTime = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function startOfDay(offsetDays = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d.getTime();
}

/** akzeptiert "#rrggbb", "#rgb", [r,g,b], "rgb(...)" oder CSS-Variablen */
function toCss(c, fallback) {
  if (Array.isArray(c) && c.length >= 3) return rgbToHex(c);
  if (typeof c === "string" && c.trim()) return c.trim();
  return fallback;
}
function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}
function hexToRgb(hex) {
  if (Array.isArray(hex)) return hex;
  const h = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) return undefined;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const alpha = (color, a) => `color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent)`;

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

  static getStubConfig(hass) {
    const ids = Object.keys(hass?.states || {}).filter((e) => e.startsWith("sensor."));
    const find = (re) => ids.find((e) => re.test(e)) || "";
    const charge = find(/battery_charge$/) || find(/batter.*charg(e|ing)(_power)?$/);
    const discharge = find(/battery_discharge$/) || find(/batter.*discharg(e|ing)(_power)?$/);
    const soc = find(/batter.*soc$/) || find(/battery_level$/);
    return {
      charge_entity: charge || "sensor.h3_6kw_battery_charge",
      discharge_entity: discharge || "sensor.h3_6kw_battery_discharge",
      ...(soc ? { soc_entity: soc } : {}),
    };
  }

  static getConfigElement() {
    return document.createElement("battery-day-card-editor");
  }

  setConfig(config) {
    const cfg = { ...DEFAULTS, ...config };
    if (cfg.mode === "combined") {
      if (!cfg.power_entity) throw new Error("Bitte power_entity angeben (Ein-Sensor-Modus).");
    } else if (!cfg.charge_entity || !cfg.discharge_entity) {
      throw new Error("Bitte charge_entity und discharge_entity angeben.");
    }
    let bm = Number(cfg.bucket_minutes) || DEFAULTS.bucket_minutes;
    bm = [5, 10, 15, 20, 30, 60].reduce((a, b) => (Math.abs(b - bm) < Math.abs(a - bm) ? b : a));
    cfg.bucket_minutes = bm;
    cfg.chart_height = Math.max(100, Math.min(600, Number(cfg.chart_height) || DEFAULTS.chart_height));
    cfg.top_count = Math.max(1, Math.min(8, Number(cfg.top_count) || DEFAULTS.top_count));
    cfg.y_max = Math.max(0, Number(cfg.y_max) || 0);
    for (const k of COLOR_KEYS) cfg[k] = toCss(cfg[k], DEFAULTS[k]);

    const old = this._config;
    this._config = cfg;
    const dataKeys = ["mode", "charge_entity", "discharge_entity", "power_entity", "invert", "soc_entity", "unit_mode", "bucket_minutes"];
    const needsFetch = !old || dataKeys.some((k) => old[k] !== cfg[k]);
    if (needsFetch) {
      this._data = null;
      this._lastFetch = 0;
      if (this._hass) this._fetch();
    } else if (this._raw) {
      this._data = this._process(this._raw.res, this._raw.dayStart, this._raw.end);
    }
    this._render();
    this._restartTimer();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (!this._config) return;
    const refresh = (this._config.refresh_minutes || 5) * 60 * 1000;
    if (first || (this._dayOffset === 0 && Date.now() - this._lastFetch > refresh)) this._fetch();
  }

  getCardSize() {
    const c = this._config || DEFAULTS;
    return Math.ceil(c.chart_height / 50) + (c.show_stats ? 2 : 0) + (c.show_top ? 2 : 0) + (c.show_heatmap ? (c.heatmap_style === "clock" ? 5 : 1) : 0) + 1;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  connectedCallback() {
    this._restartTimer();
  }
  disconnectedCallback() {
    clearInterval(this._timer);
    this._timer = null;
  }
  _restartTimer() {
    clearInterval(this._timer);
    if (!this.isConnected || !this._config) return;
    this._timer = setInterval(() => {
      if (this._hass && this._dayOffset === 0) this._fetch();
    }, Math.max(1, this._config.refresh_minutes) * 60 * 1000);
  }

  /* ------------------------------------------------------------ Daten */

  _entities() {
    const c = this._config;
    const ids = c.mode === "combined" ? [c.power_entity] : [c.charge_entity, c.discharge_entity];
    if (c.soc_entity) ids.push(c.soc_entity);
    return ids.filter(Boolean);
  }

  async _fetch() {
    if (this._loading || !this._hass) return;
    this._loading = true;
    this._lastFetch = Date.now();
    const dayStart = startOfDay(this._dayOffset);
    const end = Math.min(dayStart + DAY_MS, Date.now());
    try {
      const res = await this._hass.callWS({
        type: "history/history_during_period",
        start_time: new Date(dayStart).toISOString(),
        end_time: new Date(end).toISOString(),
        entity_ids: this._entities(),
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false,
      });
      this._error = null;
      this._raw = { res, dayStart, end };
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
    return (this._hass?.states?.[entity]?.attributes?.unit_of_measurement || "").trim();
  }

  /** pts: [{t, v}] in Roh-Einheit; sign: Faktor/Vorzeichen für Ein-Sensor-Modus */
  _series(entity, pts, dayStart, end, sign = 1) {
    const c = this._config;
    const unit = this._unit(entity);
    const bucketMs = c.bucket_minutes * 60 * 1000;
    const nB = Math.round(DAY_MS / bucketMs);
    const energy = new Array(nB).fill(0);
    const isEnergy = c.unit_mode === "energy" || (c.unit_mode === "auto" && /wh$/i.test(unit));
    const toK = /^(w|wh)$/i.test(unit) ? 0.001 : /^m(w|wh)$/i.test(unit) ? 1000 : 1;
    let peak = { v: 0, t: null };

    if (isEnergy) {
      let prev = null;
      for (const p of pts) {
        if (!Number.isFinite(p.v)) continue;
        if (prev !== null) {
          let d = p.v - prev;
          if (d < 0) d = p.v; // Zähler-Reset
          const b = Math.floor((Math.max(p.t, dayStart) - dayStart) / bucketMs);
          if (b >= 0 && b < nB) energy[b] += Math.max(0, d) * toK;
        }
        prev = p.v;
      }
      energy.forEach((e, b) => {
        const kw = e / (bucketMs / HOUR_MS);
        if (kw > peak.v) peak = { v: kw, t: dayStart + b * bucketMs + bucketMs / 2 };
      });
    } else {
      for (let i = 0; i < pts.length; i++) {
        const v = Number.isFinite(pts[i].v) ? Math.max(0, pts[i].v * toK * sign) : 0;
        const s = Math.max(pts[i].t, dayStart);
        const e = Math.min(i + 1 < pts.length ? pts[i + 1].t : end, end);
        if (pts[i].t >= dayStart && pts[i].t <= end && v > peak.v) peak = { v, t: pts[i].t };
        if (e <= s || v === 0) continue;
        let cur = s;
        while (cur < e) {
          const b = Math.floor((cur - dayStart) / bucketMs);
          const segEnd = Math.min(dayStart + (b + 1) * bucketMs, e);
          if (b >= 0 && b < nB) energy[b] += (v * (segEnd - cur)) / HOUR_MS;
          cur = segEnd;
        }
      }
    }

    const avg = energy.map((e, b) => {
      const span = Math.min(bucketMs, Math.max(0, end - (dayStart + b * bucketMs)));
      return span > 0 ? e / (span / HOUR_MS) : null;
    });
    const hourly = new Array(24).fill(0);
    energy.forEach((e, b) => (hourly[Math.floor((b * bucketMs) / HOUR_MS)] += e));
    return { avg, hourly, total: energy.reduce((a, b) => a + b, 0), peak };
  }

  _soc(raw, dayStart, end) {
    return this._points(raw)
      .filter((p) => Number.isFinite(p.v))
      .map((p) => ({ t: Math.max(p.t, dayStart), v: Math.min(100, Math.max(0, p.v)) }))
      .filter((p) => p.t <= end);
  }

  _process(res, dayStart, end) {
    const c = this._config;
    let charge, discharge;
    if (c.mode === "combined") {
      const pts = this._points(res[c.power_entity]);
      const s = c.invert ? -1 : 1;
      charge = this._series(c.power_entity, pts, dayStart, end, s);
      discharge = this._series(c.power_entity, pts, dayStart, end, -s);
    } else {
      charge = this._series(c.charge_entity, this._points(res[c.charge_entity]), dayStart, end);
      discharge = this._series(c.discharge_entity, this._points(res[c.discharge_entity]), dayStart, end);
    }
    return {
      dayStart,
      end,
      charge,
      discharge,
      soc: c.soc_entity && c.show_soc ? this._soc(res[c.soc_entity], dayStart, end) : null,
    };
  }

  /* ------------------------------------------------------------ Rendering */

  _render() {
    if (!this._config) return;
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
      ? `<div class="msg">Fehler beim Laden der Historie:<br>${esc(this._error)}</div>`
      : !d
      ? `<div class="msg">Lade Verlauf …</div>`
      : this._renderBody(d);

    const header = c.show_header
      ? `<div class="head">
          <div class="title">
            ${c.icon ? `<ha-icon icon="${esc(c.icon)}"></ha-icon>` : ""}
            <span>${esc(c.title)}</span>
          </div>
          ${
            c.show_navigation
              ? `<div class="nav">
                  <button id="prev" title="Vorheriger Tag">‹</button>
                  <span class="date">${dateLabel}</span>
                  <button id="next" title="Nächster Tag" ${this._dayOffset === 0 ? "disabled" : ""}>›</button>
                </div>`
              : `<div class="nav"><span class="date">${dateLabel}</span></div>`
          }
        </div>`
      : "";

    this.shadowRoot.innerHTML = `<style>${this._css()}</style><ha-card>${header}${body}</ha-card>`;
    const prev = this.shadowRoot.getElementById("prev");
    const next = this.shadowRoot.getElementById("next");
    if (prev) prev.onclick = () => this._shift(1);
    if (next) next.onclick = () => this._shift(-1);
    if (d && !this._error) this._bindHover(d);
  }

  _shift(delta) {
    this._dayOffset = Math.max(0, this._dayOffset + delta);
    this._data = null;
    this._raw = null;
    this._render();
    this._fetch();
  }

  _renderBody(d) {
    const c = this._config;
    const ch = d.charge, dis = d.discharge;
    const parts = [];
    if (c.show_stats) {
      parts.push(`<div class="stats">
        ${this._stat("Geladen", fmtKWh(ch.total), "kWh", c.charge_color, "▲")}
        ${this._stat("Entladen", fmtKWh(dis.total), "kWh", c.discharge_color, "▼")}
        ${this._stat("Max. Laden", ch.peak.t ? fmtKW(ch.peak.v) : "–", "kW", c.charge_color, "", ch.peak.t ? `um ${fmtTime(ch.peak.t)}` : "")}
        ${this._stat("Max. Entladen", dis.peak.t ? fmtKW(dis.peak.v) : "–", "kW", c.discharge_color, "", dis.peak.t ? `um ${fmtTime(dis.peak.t)}` : "")}
      </div>`);
    }
    parts.push(`<div class="chart">${this._svg(d)}<div class="tip" id="tip"></div></div>`);
    if (c.show_heatmap) parts.push(this._heat(d));
    if (c.show_top) {
      parts.push(`<div class="tops">
        ${this._top("Stärkste Ladestunden", ch.hourly, c.charge_color)}
        ${this._top("Stärkste Entladestunden", dis.hourly, c.discharge_color)}
      </div>`);
    }
    return parts.join("");
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
    const hasSoc = d.soc && d.soc.length;
    const W = 640, H = c.chart_height + 10, L = 38, R = hasSoc ? 34 : 12, T = 16, B = 22;
    const iw = W - L - R, ih = H - T - B, mid = T + ih / 2;
    this._geo = { W, L, iw };

    const ca = d.charge.avg, da = d.discharge.avg, n = ca.length;
    const dataMax = Math.max(0.3, ...ca.map((v) => v || 0), ...da.map((v) => v || 0)) * 1.15;
    const maxV = c.y_max > 0 ? c.y_max : dataMax;
    const step = maxV > 8 ? 4 : maxV > 4 ? 2 : maxV > 2 ? 1 : maxV > 1 ? 0.5 : 0.25;
    const top = c.y_max > 0 ? c.y_max : Math.ceil(maxV / step) * step;
    const x = (i) => L + ((i + 0.5) / n) * iw;
    const y = (v, sign) => mid - sign * (Math.min(v, top) / top) * (ih / 2);

    // ---- Datenformen
    const shape = (arr, sign, grad, color) => {
      if (c.chart_type === "bars") {
        const bw = (iw / n) * 0.72;
        return arr
          .map((v, i) => {
            if (!v) return "";
            const yy = y(v, sign), h = Math.abs(yy - mid);
            if (h < 0.3) return "";
            return `<rect x="${x(i) - bw / 2}" y="${sign > 0 ? yy : mid}" width="${bw}" height="${h}" rx="${Math.min(2, bw / 2)}" fill="url(#${grad})" stroke="${color}" stroke-width=".6"/>`;
          })
          .join("");
      }
      const idx = arr.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0);
      if (!idx.length) return "";
      const pts = idx.map((i) => [x(i), y(arr[i], sign)]);
      const clamp = (v) => (sign > 0 ? Math.min(mid, v) : Math.max(mid, v));
      let line = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i], p2 = pts[i + 1];
        if (c.smooth) {
          const p0 = pts[i - 1] || p1, p3 = pts[i + 2] || p2;
          line += ` C${p1[0] + (p2[0] - p0[0]) / 6},${clamp(p1[1] + (p2[1] - p0[1]) / 6)} ${p2[0] - (p3[0] - p1[0]) / 6},${clamp(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]},${p2[1]}`;
        } else {
          line += ` L${p2[0]},${p2[1]}`;
        }
      }
      const fill = `${line} L${pts[pts.length - 1][0]},${mid} L${pts[0][0]},${mid} Z`;
      return `<path d="${fill}" fill="url(#${grad})"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    };

    // ---- Gitter & Achsen
    let grid = "";
    for (let v = step; v <= top + 1e-9; v += step) {
      for (const s of [1, -1]) {
        if (c.show_grid) grid += `<line x1="${L}" x2="${W - R}" y1="${y(v, s)}" y2="${y(v, s)}" class="g"/>`;
        grid += `<text x="${L - 6}" y="${y(v, s) + 3}" class="ax" text-anchor="end">${String(+v.toFixed(2)).replace(".", ",")}</text>`;
      }
    }
    grid += `<line x1="${L}" x2="${W - R}" y1="${mid}" y2="${mid}" class="zero"/>`;
    grid += `<text x="${L - 6}" y="${mid + 3}" class="ax" text-anchor="end">0</text>`;
    for (let h = 0; h <= 24; h += 3) {
      const hx = L + (h / 24) * iw;
      if (c.show_grid) grid += `<line x1="${hx}" x2="${hx}" y1="${T}" y2="${H - B}" class="g"/>`;
      grid += `<text x="${hx}" y="${H - 6}" class="ax" text-anchor="middle">${pad(h)}</text>`;
    }
    grid += `<text x="${L - 6}" y="${T - 7}" class="ax unit" text-anchor="end">kW</text>`;

    // ---- Jetzt-Linie
    let nowLine = "";
    if (c.show_now_line && this._dayOffset === 0) {
      const nx = L + ((Date.now() - d.dayStart) / DAY_MS) * iw;
      nowLine = `<line x1="${nx}" x2="${nx}" y1="${T}" y2="${H - B}" class="now"/><text x="${nx}" y="${T - 5}" class="ax nowt" text-anchor="middle">jetzt</text>`;
    }

    // ---- SoC
    let soc = "";
    if (hasSoc) {
      const sx = (t) => L + ((t - d.dayStart) / DAY_MS) * iw;
      const sy = (v) => T + ih - (v / 100) * ih;
      let p = "";
      d.soc.forEach((pt, i) => (p += i === 0 ? `M${sx(pt.t)},${sy(pt.v)}` : ` H${sx(pt.t)} V${sy(pt.v)}`));
      p += ` H${sx(d.end)}`;
      soc = `<path d="${p}" class="soc"/>`;
      for (const v of [0, 50, 100]) soc += `<text x="${W - R + 5}" y="${sy(v) + 3}" class="ax socax">${v}%</text>`;
    }

    // ---- Spitzen
    const bucketMs = c.bucket_minutes * 60 * 1000;
    const marker = (ser, arr, sign, color) => {
      if (!c.show_peaks || !ser.peak.t) return "";
      const i = Math.min(n - 1, Math.floor((ser.peak.t - d.dayStart) / bucketMs));
      const px = x(i), py = y(arr[i] || 0, sign);
      const lbl = `${fmtKW(ser.peak.v)} kW · ${fmtTime(ser.peak.t)}`;
      const ty = sign > 0 ? Math.max(T + 10, py - 10) : Math.min(H - B - 4, py + 18);
      const anchor = px > W - R - 70 ? "end" : px < L + 70 ? "start" : "middle";
      return `
        ${c.animate_peaks ? `<circle cx="${px}" cy="${py}" r="9" fill="${alpha(color, 0.3)}" class="pulse"/>` : ""}
        <circle cx="${px}" cy="${py}" r="4" fill="${color}" class="dot"/>
        <text x="${px}" y="${ty}" class="pk" text-anchor="${anchor}" style="fill:${color}">${lbl}</text>`;
    };

    return `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" id="svg" style="height:${c.chart_height}px">
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
        ${grid}
        <text x="${L + 6}" y="${T + 10}" class="side" style="fill:${c.charge_color}">▲ Laden</text>
        <text x="${L + 6}" y="${H - B - 5}" class="side" style="fill:${c.discharge_color}">▼ Entladen</text>
        ${shape(ca, 1, "gc", c.charge_color)}
        ${shape(da, -1, "gd", c.discharge_color)}
        ${soc}${nowLine}
        ${marker(d.charge, ca, 1, c.charge_color)}
        ${marker(d.discharge, da, -1, c.discharge_color)}
        <line id="cursor" x1="0" x2="0" y1="${T}" y2="${H - B}" class="cursor"/>
        <rect id="hit" x="${L}" y="${T}" width="${iw}" height="${ih}" fill="transparent"/>
      </svg>`;
  }

  _heat(d) {
    const style = this._config.heatmap_style;
    if (style === "net") return this._heatNet(d);
    if (style === "clock") return this._heatClock(d);
    return this._heatRows(d);
  }

  _hourAxis(indent) {
    const spans = Array.from({ length: 24 }, (_, h) => `<span>${h % 3 === 0 ? pad(h) : ""}</span>`).join("");
    return `<div class="hax${indent ? " indent" : ""}">${spans}</div>`;
  }

  _hourTitle(h, ch, dis) {
    return `${pad(h)}–${pad(h + 1)} Uhr · ▲ ${fmtKWh(ch)} kWh · ▼ ${fmtKWh(dis)} kWh`;
  }

  /** Variante A: zwei Kachelreihen */
  _heatRows(d) {
    const c = this._config;
    const ch = d.charge.hourly, dis = d.discharge.hourly;
    const row = (arr, color, label) => {
      const max = Math.max(...arr, 0.001);
      const cells = arr
        .map((e, h) => {
          const a = e > 0.005 ? 0.12 + 0.88 * (e / max) : 0.05;
          return `<div class="cell" style="background:${alpha(color, a)}" title="${this._hourTitle(h, ch[h], dis[h])}"></div>`;
        })
        .join("");
      return `<div class="hrow"><span class="hl" style="color:${color}">${label}</span><div class="cells">${cells}</div></div>`;
    };
    return `<div class="heat">${row(ch, c.charge_color, "Laden")}${row(dis, c.discharge_color, "Entl.")}${this._hourAxis(true)}</div>`;
  }

  /** Variante B: Netto-Band – pro Stunde gewinnt die stärkere Richtung */
  _heatNet(d) {
    const c = this._config;
    const ch = d.charge.hourly, dis = d.discharge.hourly;
    const max = Math.max(...ch.map((e, h) => Math.abs(e - dis[h])), 0.001);
    const cells = ch
      .map((e, h) => {
        const net = e - dis[h];
        const col = net >= 0 ? c.charge_color : c.discharge_color;
        const a = Math.abs(net) > 0.005 ? 0.15 + 0.85 * (Math.abs(net) / max) : 0.05;
        return `<div class="cell net" style="background:${alpha(col, a)}" title="${this._hourTitle(h, e, dis[h])} · netto ${net >= 0 ? "+" : "−"}${fmtKWh(Math.abs(net))} kWh"></div>`;
      })
      .join("");
    return `<div class="heat">
      <div class="netlegend"><span style="color:${c.charge_color}">■ mehr geladen</span><span style="color:${c.discharge_color}">■ mehr entladen</span></div>
      <div class="cells">${cells}</div>${this._hourAxis(false)}</div>`;
  }

  /** Variante F: Tagesuhr – 24-h-Ring, außen Laden, innen Entladen */
  _heatClock(d) {
    const c = this._config;
    const ch = d.charge.hourly, dis = d.discharge.hourly;
    const mc = Math.max(...ch, 0.001), md = Math.max(...dis, 0.001);
    const S = 240, cx = S / 2, cy = S / 2;
    const P = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
    const arc = (r1, r2, a0, a1) => {
      const [x1, y1] = P(r2, a0), [x2, y2] = P(r2, a1), [x3, y3] = P(r1, a1), [x4, y4] = P(r1, a0);
      return `M${x1},${y1}A${r2},${r2} 0 0 1 ${x2},${y2}L${x3},${y3}A${r1},${r1} 0 0 0 ${x4},${y4}Z`;
    };
    let s = "";
    for (let h = 0; h < 24; h++) {
      const a0 = (h / 24) * 2 * Math.PI + 0.022, a1 = ((h + 1) / 24) * 2 * Math.PI - 0.022;
      const ac = ch[h] > 0.005 ? 0.12 + 0.88 * (ch[h] / mc) : 0.06;
      const ad = dis[h] > 0.005 ? 0.12 + 0.88 * (dis[h] / md) : 0.06;
      const t = `<title>${this._hourTitle(h, ch[h], dis[h])}</title>`;
      s += `<path d="${arc(86, 114, a0, a1)}" fill="${alpha(c.charge_color, ac)}">${t}</path>`;
      s += `<path d="${arc(55, 83, a0, a1)}" fill="${alpha(c.discharge_color, ad)}">${t}</path>`;
    }
    for (const h of [0, 6, 12, 18]) {
      const [x, y] = P(44, (h / 24) * 2 * Math.PI);
      s += `<text x="${x}" y="${y + 3}" class="ax" text-anchor="middle">${pad(h)}</text>`;
    }
    if (this._dayOffset === 0) {
      const a = ((Date.now() - d.dayStart) / DAY_MS) * 2 * Math.PI;
      const [x1, y1] = P(52, a), [x2, y2] = P(118, a);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="now"/>`;
    }
    s += `<text x="${cx}" y="${cy - 3}" text-anchor="middle" class="ctot" style="fill:${c.charge_color}">▲ ${fmtKWh(d.charge.total)}</text>`;
    s += `<text x="${cx}" y="${cy + 16}" text-anchor="middle" class="ctot" style="fill:${c.discharge_color}">▼ ${fmtKWh(d.discharge.total)}</text>`;
    return `<div class="heat clock">
      <svg viewBox="0 0 ${S} ${S}" class="clocksvg">${s}</svg>
      <div class="clocklegend">
        <span><i style="background:${c.charge_color}"></i>außen: Laden</span>
        <span><i style="background:${c.discharge_color}"></i>innen: Entladen</span>
        <span class="muted">Mitte: Summe kWh</span>
      </div></div>`;
  }

  _top(label, hourly, color) {
    const top = hourly
      .map((e, h) => ({ e, h }))
      .filter((x) => x.e > 0.005)
      .sort((a, b) => b.e - a.e)
      .slice(0, this._config.top_count);
    const chips = top.length
      ? top
          .map((x, i) => `<span class="chip" style="--c:${color}"><b>${i + 1}</b>${pad(x.h)}–${pad(x.h + 1)} Uhr<em>${fmtKWh(x.e)} kWh</em></span>`)
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
    const leave = () => {
      tip.style.opacity = 0;
      cur.style.opacity = 0;
    };
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
      let socTxt = "";
      if (d.soc && d.soc.length) {
        const mt = t0 + bucketMs / 2;
        let s = null;
        for (const p of d.soc) if (p.t <= mt) s = p.v;
        if (s !== null) socTxt = `<div><i style="background:${this._config.soc_color}"></i>SoC <b>${Math.round(s)} %</b></div>`;
      }
      tip.innerHTML = `<div class="tt">${fmtTime(t0)}–${fmtTime(t0 + bucketMs)}</div>
        <div><i style="background:${this._config.charge_color}"></i>Laden <b>${fmtKW(cv || 0)} kW</b></div>
        <div><i style="background:${this._config.discharge_color}"></i>Entladen <b>${fmtKW(dv || 0)} kW</b></div>${socTxt}`;
      tip.style.opacity = 1;
      const rel = (cx / W) * r.width;
      tip.style.left = `${Math.min(Math.max(rel, 75), r.width - 75)}px`;
    };
    hit.addEventListener("mousemove", move);
    hit.addEventListener("touchmove", move, { passive: true });
    hit.addEventListener("touchstart", move, { passive: true });
    hit.addEventListener("mouseleave", leave);
    hit.addEventListener("touchend", leave);
  }

  _themeCss() {
    const t = this._config.theme;
    if (t === "dark")
      return `:host { --primary-text-color:#e6e8eb; --secondary-text-color:#9aa3ad; --card-background-color:#1c2026;
        --ha-card-background:#1c2026; --divider-color:rgba(255,255,255,.12); --secondary-background-color:#262b33; color-scheme:dark; }
        ha-card { background:#1c2026 !important; color:#e6e8eb; }`;
    if (t === "light")
      return `:host { --primary-text-color:#1d2229; --secondary-text-color:#6b7480; --card-background-color:#ffffff;
        --ha-card-background:#ffffff; --divider-color:rgba(0,0,0,.1); --secondary-background-color:#eef0f3; color-scheme:light; }
        ha-card { background:#ffffff !important; color:#1d2229; }`;
    return "";
  }

  _css() {
    const c = this._config;
    return `
      ${this._themeCss()}
      :host { display:block; --bdc-charge:${c.charge_color}; --bdc-dis:${c.discharge_color}; --bdc-soc:${c.soc_color}; --bdc-now:${c.now_color}; }
      ha-card { display:block; padding:16px 16px 14px; overflow:hidden; height:100%; box-sizing:border-box; }
      .head { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; gap:8px; }
      .title { display:flex; align-items:center; gap:8px; font-size:1.1rem; font-weight:600; color:var(--primary-text-color); min-width:0; }
      .title span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .title ha-icon { color:var(--bdc-charge); --mdc-icon-size:24px; flex:none; }
      .nav { display:flex; align-items:center; gap:4px; font-size:.85rem; color:var(--secondary-text-color); flex:none; }
      .nav button { background:var(--secondary-background-color, rgba(127,127,127,.12)); border:none; color:var(--primary-text-color);
        width:26px; height:26px; border-radius:8px; cursor:pointer; font-size:1.1rem; line-height:1; }
      .nav button:disabled { opacity:.3; cursor:default; }
      .date { min-width:72px; text-align:center; font-weight:500; }
      .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:10px; }
      @container (max-width:480px){ .stats{ grid-template-columns:repeat(2,1fr);} .tops{ grid-template-columns:1fr; } }
      ha-card { container-type:inline-size; }
      .stat { padding:9px 10px 8px; border-radius:12px; min-width:0;
        background:linear-gradient(135deg, color-mix(in srgb, var(--c) 16%, transparent), color-mix(in srgb, var(--c) 4%, transparent));
        border:1px solid color-mix(in srgb, var(--c) 25%, transparent); }
      .lbl { font-size:.68rem; color:var(--secondary-text-color); text-transform:uppercase; letter-spacing:.02em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      @container (max-width:540px){ .lbl{ text-transform:none; letter-spacing:0; font-size:.72rem; } }
      .arr { color:var(--c); margin-right:4px; }
      .val { font-size:1.35rem; font-weight:700; color:var(--primary-text-color); font-variant-numeric:tabular-nums; }
      .val small { font-size:.75rem; font-weight:500; margin-left:3px; color:var(--secondary-text-color); }
      .sub { font-size:.72rem; color:var(--c); font-weight:600; }
      .chart { position:relative; }
      svg { width:100%; display:block; overflow:visible; }
      .g { stroke:var(--divider-color, rgba(127,127,127,.2)); stroke-width:1; stroke-dasharray:2 4; vector-effect:non-scaling-stroke; }
      .zero { stroke:var(--secondary-text-color); stroke-opacity:.5; stroke-width:1; vector-effect:non-scaling-stroke; }
      .ax { font-size:10px; fill:var(--secondary-text-color); }
      .unit { font-weight:600; }
      .socax { fill:var(--bdc-soc); }
      .side { font-size:10px; font-weight:700; letter-spacing:.05em; opacity:.85; }
      .now { stroke:var(--bdc-now); stroke-width:1.5; stroke-dasharray:3 3; vector-effect:non-scaling-stroke; }
      .nowt { fill:var(--bdc-now); font-weight:600; }
      .soc { fill:none; stroke:var(--bdc-soc); stroke-width:1.5; stroke-dasharray:4 3; opacity:.9; vector-effect:non-scaling-stroke; }
      .dot { stroke:var(--card-background-color, var(--ha-card-background,#fff)); stroke-width:1.5; }
      .pk { font-size:10.5px; font-weight:700; paint-order:stroke; stroke:var(--card-background-color, var(--ha-card-background,#fff)); stroke-width:3px; }
      .pulse { animation:pulse 2s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
      @keyframes pulse { 0%,100%{ transform:scale(.7); opacity:.9;} 50%{ transform:scale(1.4); opacity:.2;} }
      .cursor { stroke:var(--primary-text-color); stroke-opacity:.35; stroke-width:1; opacity:0; vector-effect:non-scaling-stroke; }
      .tip { position:absolute; top:4px; transform:translateX(-50%); pointer-events:none; opacity:0; transition:opacity .12s;
        background:var(--card-background-color, var(--ha-card-background,#fff)); color:var(--primary-text-color);
        border:1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius:10px; padding:6px 9px; font-size:.75rem;
        box-shadow:0 4px 14px rgba(0,0,0,.18); white-space:nowrap; z-index:2; }
      .tip .tt { font-weight:700; margin-bottom:2px; }
      .tip i { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:5px; }
      .heat { margin:8px 0 4px; display:flex; flex-direction:column; gap:3px; }
      .hrow { display:flex; align-items:center; gap:6px; }
      .hl { width:36px; font-size:.68rem; font-weight:700; text-align:right; flex:none; }
      .cells { flex:1; display:grid; grid-template-columns:repeat(24,1fr); gap:2px; }
      .cell { height:12px; border-radius:3px; }
      .cell.net { height:20px; border-radius:4px; }
      .hax { display:grid; grid-template-columns:repeat(24,1fr); font-size:9.5px; color:var(--secondary-text-color); margin-top:2px; }
      .hax span { text-align:left; transform:translateX(-30%); }
      .hax.indent { margin-left:42px; }
      .netlegend { display:flex; gap:14px; font-size:.7rem; font-weight:600; margin-bottom:4px; }
      .heat.clock { flex-direction:row; align-items:center; justify-content:center; gap:22px; margin:12px 0 4px; flex-wrap:wrap; }
      .clocksvg { width:220px; height:220px; flex:none; overflow:visible; }
      .ctot { font-size:15px; font-weight:700; font-variant-numeric:tabular-nums; }
      .clocklegend { display:flex; flex-direction:column; gap:6px; font-size:.78rem; color:var(--primary-text-color); }
      .clocklegend i { display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:6px; vertical-align:-1px; }
      .clocklegend .muted { color:var(--secondary-text-color); }
      .tops { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px; }
      .tl { font-size:.72rem; text-transform:uppercase; letter-spacing:.04em; color:var(--secondary-text-color); margin-bottom:5px; }
      .chips { display:flex; flex-direction:column; gap:4px; }
      .chip { display:flex; align-items:center; gap:8px; font-size:.8rem; color:var(--primary-text-color);
        background:color-mix(in srgb, var(--c) 10%, transparent); border-radius:8px; padding:4px 8px; }
      .chip b { width:18px; height:18px; border-radius:50%; background:var(--c); color:#fff; font-size:.7rem; flex:none;
        display:inline-flex; align-items:center; justify-content:center; }
      .chip em { margin-left:auto; font-style:normal; font-weight:700; color:var(--c); font-variant-numeric:tabular-nums; }
      .none { font-size:.8rem; color:var(--secondary-text-color); }
      .msg { padding:40px 0; text-align:center; color:var(--secondary-text-color); }
    `;
  }
}

/* ------------------------------------------------------------ Editor */

const LABELS = {
  mode: "Sensor-Art",
  charge_entity: "Sensor Laden",
  discharge_entity: "Sensor Entladen",
  power_entity: "Batterie-Leistung (mit Vorzeichen)",
  invert: "Vorzeichen umkehren (positiv = Entladen)",
  soc_entity: "Ladezustand / SoC (optional)",
  unit_mode: "Sensor-Typ",
  title: "Titel",
  icon: "Symbol",
  show_header: "Kopfzeile anzeigen",
  show_navigation: "Tage blättern (‹ ›)",
  chart_type: "Diagrammtyp",
  smooth: "Kurve glätten",
  chart_height: "Diagrammhöhe (px)",
  bucket_minutes: "Auflösung",
  y_max: "Feste Skala in kW (0 = automatisch)",
  show_peaks: "Spitzen markieren",
  animate_peaks: "Spitzen animieren",
  show_now_line: "„jetzt“-Linie",
  show_grid: "Gitterlinien",
  show_soc: "SoC-Linie anzeigen",
  show_stats: "Kennzahlen (kWh / Spitzen)",
  show_heatmap: "Stunden-Heatmap",
  heatmap_style: "Heatmap-Stil",
  theme: "Farbschema",
  show_top: "Top-Stunden",
  top_count: "Anzahl Top-Stunden",
  charge_color: "Farbe Laden",
  discharge_color: "Farbe Entladen",
  soc_color: "Farbe SoC",
  now_color: "Farbe „jetzt“-Linie",
  refresh_minutes: "Aktualisierung (Minuten)",
};

const HELPERS = {
  power_entity: "Positiv = Laden, negativ = Entladen (umkehrbar).",
  unit_mode: "Automatisch erkennt W/kW (Leistung) und Wh/kWh (Zähler) an der Einheit.",
  y_max: "Praktisch, um mehrere Tage vergleichbar zu machen.",
  theme: "Automatisch übernimmt dein Home-Assistant-Theme, Dunkel/Hell erzwingt das Schema nur für diese Karte.",
};

class BatteryDayCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  _schema(cfg) {
    const combined = cfg.mode === "combined";
    const sel = (opts) => ({ select: { mode: "dropdown", options: opts.map(([value, label]) => ({ value, label })) } });
    return [
      {
        name: "sensors",
        type: "expandable",
        flatten: true,
        expanded: true,
        title: "Sensoren",
        icon: "mdi:battery-charging-high",
        schema: [
          { name: "mode", selector: sel([["separate", "Zwei Sensoren (Laden + Entladen)"], ["combined", "Ein Sensor mit Vorzeichen (+/−)"]]) },
          ...(combined
            ? [
                { name: "power_entity", required: true, selector: { entity: { domain: "sensor" } } },
                { name: "invert", selector: { boolean: {} } },
              ]
            : [
                { name: "charge_entity", required: true, selector: { entity: { domain: "sensor" } } },
                { name: "discharge_entity", required: true, selector: { entity: { domain: "sensor" } } },
              ]),
          { name: "soc_entity", selector: { entity: { domain: "sensor" } } },
          { name: "unit_mode", selector: sel([["auto", "Automatisch"], ["power", "Leistung (W / kW)"], ["energy", "Energiezähler (Wh / kWh)"]]) },
        ],
      },
      {
        name: "header",
        type: "expandable",
        flatten: true,
        title: "Kopfzeile",
        icon: "mdi:format-title",
        schema: [
          { name: "title", selector: { text: {} } },
          { name: "icon", selector: { icon: {} } },
          {
            name: "",
            type: "grid",
            schema: [
              { name: "show_header", selector: { boolean: {} } },
              { name: "show_navigation", selector: { boolean: {} } },
            ],
          },
        ],
      },
      {
        name: "chart",
        type: "expandable",
        flatten: true,
        title: "Diagramm",
        icon: "mdi:chart-areaspline",
        schema: [
          {
            name: "",
            type: "grid",
            schema: [
              { name: "chart_type", selector: sel([["area", "Fläche"], ["bars", "Balken"]]) },
              { name: "bucket_minutes", selector: sel([["5", "5 Minuten"], ["10", "10 Minuten"], ["15", "15 Minuten"], ["30", "30 Minuten"], ["60", "1 Stunde"]]) },
            ],
          },
          { name: "chart_height", selector: { number: { min: 120, max: 450, step: 10, mode: "slider", unit_of_measurement: "px" } } },
          { name: "y_max", selector: { number: { min: 0, max: 50, step: 0.5, mode: "box", unit_of_measurement: "kW" } } },
          {
            name: "",
            type: "grid",
            schema: [
              { name: "smooth", selector: { boolean: {} } },
              { name: "show_grid", selector: { boolean: {} } },
              { name: "show_peaks", selector: { boolean: {} } },
              { name: "animate_peaks", selector: { boolean: {} } },
              { name: "show_now_line", selector: { boolean: {} } },
              { name: "show_soc", selector: { boolean: {} } },
            ],
          },
        ],
      },
      {
        name: "sections",
        type: "expandable",
        flatten: true,
        title: "Bereiche",
        icon: "mdi:view-dashboard-outline",
        schema: [
          {
            name: "",
            type: "grid",
            schema: [
              { name: "show_stats", selector: { boolean: {} } },
              { name: "show_heatmap", selector: { boolean: {} } },
              { name: "show_top", selector: { boolean: {} } },
            ],
          },
          {
            name: "heatmap_style",
            selector: sel([["rows", "Zwei Kachelreihen (Laden / Entladen)"], ["net", "Netto-Band (eine Reihe)"], ["clock", "Tagesuhr (24-h-Ring)"]]),
          },
          { name: "top_count", selector: { number: { min: 1, max: 8, step: 1, mode: "slider" } } },
        ],
      },
      {
        name: "colors",
        type: "expandable",
        flatten: true,
        title: "Farben",
        icon: "mdi:palette",
        schema: [
          { name: "theme", selector: sel([["auto", "Automatisch (HA-Theme)"], ["dark", "Dunkel"], ["light", "Hell"]]) },
          {
            name: "",
            type: "grid",
            schema: [
              { name: "charge_color", selector: { color_rgb: {} } },
              { name: "discharge_color", selector: { color_rgb: {} } },
              { name: "soc_color", selector: { color_rgb: {} } },
              { name: "now_color", selector: { color_rgb: {} } },
            ],
          },
        ],
      },
      {
        name: "advanced",
        type: "expandable",
        flatten: true,
        title: "Erweitert",
        icon: "mdi:cog",
        schema: [{ name: "refresh_minutes", selector: { number: { min: 1, max: 60, step: 1, mode: "box", unit_of_measurement: "min" } } }],
      },
    ];
  }

  _formData() {
    const data = { ...DEFAULTS, ...this._config };
    data.bucket_minutes = String(data.bucket_minutes);
    for (const k of COLOR_KEYS) data[k] = hexToRgb(data[k]) ?? hexToRgb(DEFAULTS[k]);
    return data;
  }

  _render() {
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => LABELS[s.name] ?? s.title ?? s.name;
      this._form.computeHelper = (s) => HELPERS[s.name];
      this._form.addEventListener("value-changed", (ev) => this._changed(ev));
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = this._formData();
    this._form.schema = this._schema({ ...DEFAULTS, ...this._config });
  }

  _changed(ev) {
    ev.stopPropagation();
    const v = { ...ev.detail.value };
    const out = { type: this._config.type || "custom:battery-day-card" };
    for (const [k, val] of Object.entries(v)) {
      if (val === undefined || val === null || val === "") continue;
      let value = val;
      if (COLOR_KEYS.includes(k)) value = Array.isArray(val) ? rgbToHex(val) : val;
      if (k === "bucket_minutes") value = Number(val);
      // nur speichern, was vom Standard abweicht – hält das YAML schlank
      if (k !== "type" && value === DEFAULTS[k] && !["charge_entity", "discharge_entity", "power_entity"].includes(k)) continue;
      out[k] = value;
    }
    if (out.mode !== "combined") {
      delete out.power_entity;
      delete out.invert;
    } else {
      delete out.charge_entity;
      delete out.discharge_entity;
    }
    this._config = out;
    this._render();
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: out }, bubbles: true, composed: true }));
  }
}

customElements.define("battery-day-card", BatteryDayCard);
customElements.define("battery-day-card-editor", BatteryDayCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "battery-day-card",
  name: "Battery Day Card",
  description: "Laden & Entladen der Batterie über den Tag mit Spitzen, Heatmap und Top-Stunden",
  preview: true,
  documentationURL: "https://github.com/muhkuh666/battery-day-card",
});

console.info(`%c BATTERY-DAY-CARD %c v${CARD_VERSION} `, "background:#2fd38a;color:#000;font-weight:700", "background:#ff8a3d;color:#000");
