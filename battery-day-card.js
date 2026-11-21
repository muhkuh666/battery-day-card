/**
 * Battery Day Card – Home Assistant Lovelace Custom Card
 * Laden / Entladen der Hausbatterie über Tag, Woche und Monat –
 * mit Spitzen, Heatmap, Wirkungsgrad, Zyklen, Ersparnis und Prognose.
 * https://github.com/muhkuh666/battery-day-card
 */
const CARD_VERSION = "2.0.0";

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

const DEFAULTS = {
  // Batterie 1
  name: "",
  mode: "separate", // separate | combined
  charge_entity: "",
  discharge_entity: "",
  power_entity: "",
  invert: false,
  soc_entity: "",
  soh_entity: "",
  temp_entity: "",
  capacity_kwh: 0,
  min_soc: 10,
  unit_mode: "auto", // auto | power | energy
  // Zusatzsensoren
  pv_entity: "",
  grid_entity: "",
  grid_invert: false,
  price_entity: "",
  price: 0,
  currency: "€",
  // Kopf
  title: "",
  icon: "mdi:home-battery",
  show_header: true,
  show_navigation: true,
  show_view_switch: true,
  default_view: "day", // day | week | month
  language: "auto", // auto | de | en
  // Diagramm
  chart_type: "area", // area | bars
  smooth: true,
  chart_height: 220,
  bucket_minutes: 15,
  y_max: 0,
  compare: "none", // none | yesterday | avg7
  show_pv: true,
  show_grid_power: true,
  show_peaks: true,
  animate_peaks: true,
  show_now_line: true,
  show_grid: true,
  show_soc: true,
  zoom_on_click: true,
  // Bereiche
  layout: "full", // full | compact
  show_stats: true,
  show_status: true,
  show_insights: true,
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
  pv_color: "#f5c542",
  grid_color: "#b07cff",
  // Erweitert
  refresh_minutes: 5,
};

const COLOR_KEYS = ["charge_color", "discharge_color", "soc_color", "now_color", "pv_color", "grid_color"];
const BATTERY_KEYS = ["name", "mode", "charge_entity", "discharge_entity", "power_entity", "invert", "soc_entity", "soh_entity", "temp_entity", "capacity_kwh", "min_soc"];

/* ------------------------------------------------------------ Texte */

const STR = {
  de: {
    battery: "Batterie", total: "Gesamt", today: "Heute", yesterday: "Gestern",
    day: "Tag", week: "Woche", month: "Monat", cw: "KW",
    charged: "Geladen", discharged: "Entladen", max_charge: "Max. Laden", max_discharge: "Max. Entladen",
    best_charge_day: "Bester Ladetag", best_discharge_day: "Bester Entladetag",
    at: "um", charge: "Laden", discharge: "Entladen", dis_short: "Entl.", now: "jetzt",
    loading: "Lade Verlauf …", error: "Fehler beim Laden der Historie:",
    no_stats: "Keine Langzeitstatistik gefunden – die Sensoren brauchen eine state_class (measurement oder total_increasing).",
    more_charged: "mehr geladen", more_discharged: "mehr entladen", net: "netto",
    outer_charge: "außen: Laden", inner_discharge: "innen: Entladen", center_sum: "Mitte: Summe kWh",
    top_charge_hours: "Stärkste Ladestunden", top_discharge_hours: "Stärkste Entladestunden",
    top_charge_days: "Stärkste Ladetage", top_discharge_days: "Stärkste Entladetage",
    no_activity: "keine Aktivität", oclock: "Uhr",
    efficiency: "Wirkungsgrad", cycles: "Zyklen", savings: "Ersparnis", per_day: "Ø pro Tag", forecast: "Prognose",
    lasts_until: "reicht bis ca. {t}", full_at: "voll um ca. {t}", full: "voll", idle: "Leerlauf", more_than_day: "reicht > 24 h",
    soc: "Ladezustand", soh: "Gesundheit", temp: "Temperatur", range_today: "heute {a} – {b}",
    pv: "PV", grid_in: "Netzbezug", grid_out: "Einspeisung",
    compare_yesterday: "gestern", compare_avg7: "Ø 7 Tage",
    zoom_reset: "ganzer Tag",
    pattern: "Muster: Wochentag × Stunde", avg_short: "Ø",
    weekdays: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  },
  en: {
    battery: "Battery", total: "Total", today: "Today", yesterday: "Yesterday",
    day: "Day", week: "Week", month: "Month", cw: "CW",
    charged: "Charged", discharged: "Discharged", max_charge: "Max charge", max_discharge: "Max discharge",
    best_charge_day: "Best charge day", best_discharge_day: "Best discharge day",
    at: "at", charge: "Charge", discharge: "Discharge", dis_short: "Disch.", now: "now",
    loading: "Loading history …", error: "Error loading history:",
    no_stats: "No long-term statistics found – the sensors need a state_class (measurement or total_increasing).",
    more_charged: "more charged", more_discharged: "more discharged", net: "net",
    outer_charge: "outer: charge", inner_discharge: "inner: discharge", center_sum: "center: total kWh",
    top_charge_hours: "Top charging hours", top_discharge_hours: "Top discharging hours",
    top_charge_days: "Top charging days", top_discharge_days: "Top discharging days",
    no_activity: "no activity", oclock: "",
    efficiency: "Efficiency", cycles: "Cycles", savings: "Savings", per_day: "Ø per day", forecast: "Forecast",
    lasts_until: "lasts until ~{t}", full_at: "full at ~{t}", full: "full", idle: "idle", more_than_day: "lasts > 24 h",
    soc: "State of charge", soh: "Health", temp: "Temperature", range_today: "today {a} – {b}",
    pv: "PV", grid_in: "Grid import", grid_out: "Grid export",
    compare_yesterday: "yesterday", compare_avg7: "Ø 7 days",
    zoom_reset: "full day",
    pattern: "Pattern: weekday × hour", avg_short: "Ø",
    weekdays: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  },
};

/* ------------------------------------------------------------ Helfer */

const pad = (n) => String(n).padStart(2, "0");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtTime = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const dayStartOf = (ms) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const addDays = (ms, n) => {
  const d = new Date(ms);
  d.setDate(d.getDate() + n);
  return d.getTime();
};
const addMonths = (ms, n) => {
  const d = new Date(ms);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return d.getTime();
};
const weekdayIdx = (ms) => (new Date(ms).getDay() + 6) % 7; // Mo = 0
const weekStart = (ms) => addDays(dayStartOf(ms), -weekdayIdx(ms));
const isoWeek = (ms) => {
  const d = new Date(dayStartOf(ms));
  d.setDate(d.getDate() + 3 - weekdayIdx(d.getTime()));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w1) / DAY_MS - 3 + weekdayIdx(w1.getTime())) / 7);
};
const statTime = (v) => {
  const n = typeof v === "number" ? v : Date.parse(v);
  return n < 1e12 ? n * 1000 : n;
};
const sum = (a) => a.reduce((x, y) => x + (y || 0), 0);

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
function toCss(c, fallback) {
  if (Array.isArray(c) && c.length >= 3) return rgbToHex(c);
  if (typeof c === "string" && c.trim()) return c.trim();
  return fallback;
}
const alpha = (color, a) => `color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent)`;

/** Summiert mehrere Serien (mehrere Batterien) */
function sumSeries(list, start, bucketMs) {
  if (list.length === 1) return list[0];
  const n = list[0].avg.length;
  const avg = Array.from({ length: n }, (_, i) => {
    let any = false, s = 0;
    for (const x of list) if (x.avg[i] !== null) { any = true; s += x.avg[i]; }
    return any ? s : null;
  });
  const energy = Array.from({ length: n }, (_, i) => sum(list.map((x) => x.energy[i])));
  const hourly = list[0].hourly.map((_, h) => sum(list.map((x) => x.hourly[h])));
  let peak = { v: 0, t: null };
  avg.forEach((v, i) => {
    if (v !== null && v > peak.v) peak = { v, t: start + i * bucketMs + bucketMs / 2 };
  });
  return { avg, energy, hourly, total: sum(list.map((x) => x.total)), peak };
}

/* ------------------------------------------------------------ Karte */

class BatteryDayCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._offset = 0;
    this._view = null;
    this._sel = 0; // Index der Batterie oder -1 = Gesamt
    this._zoom = null;
    this._data = null;
    this._error = null;
    this._token = 0;
    this._lastFetch = 0;
  }

  static getStubConfig(hass) {
    const ids = Object.keys(hass?.states || {}).filter((e) => e.startsWith("sensor."));
    const find = (...res) => {
      for (const re of res) {
        const f = ids.find((e) => re.test(e));
        if (f) return f;
      }
      return "";
    };
    const cfg = {
      charge_entity: find(/battery_charge$/, /batter.*charg(e|ing)(_power)?$/) || "sensor.battery_charge",
      discharge_entity: find(/battery_discharge$/, /batter.*discharg(e|ing)(_power)?$/) || "sensor.battery_discharge",
    };
    const soc = find(/batter.*_soc$/, /battery_level$/);
    const soh = find(/batter.*_soh$/);
    const temp = find(/batter.*_temp(erature)?$/);
    if (soc) cfg.soc_entity = soc;
    if (soh) cfg.soh_entity = soh;
    if (temp) cfg.temp_entity = temp;
    return cfg;
  }

  static getConfigElement() {
    return document.createElement("battery-day-card-editor");
  }

  setConfig(config) {
    const cfg = { ...DEFAULTS, ...config };
    if (cfg.mode === "combined" ? !cfg.power_entity : !cfg.charge_entity || !cfg.discharge_entity) {
      throw new Error(cfg.mode === "combined" ? "power_entity fehlt / missing" : "charge_entity + discharge_entity fehlen / missing");
    }
    const bm = Number(cfg.bucket_minutes) || DEFAULTS.bucket_minutes;
    cfg.bucket_minutes = [5, 10, 15, 20, 30, 60].reduce((a, b) => (Math.abs(b - bm) < Math.abs(a - bm) ? b : a));
    cfg.chart_height = Math.max(100, Math.min(600, Number(cfg.chart_height) || DEFAULTS.chart_height));
    cfg.top_count = Math.max(1, Math.min(8, Number(cfg.top_count) || DEFAULTS.top_count));
    cfg.y_max = Math.max(0, Number(cfg.y_max) || 0);
    cfg.capacity_kwh = Math.max(0, Number(cfg.capacity_kwh) || 0);
    cfg.min_soc = Math.max(0, Math.min(100, Number(cfg.min_soc ?? 10)));
    cfg.price = Math.max(0, Number(cfg.price) || 0);
    for (const k of COLOR_KEYS) cfg[k] = toCss(cfg[k], DEFAULTS[k]);
    if (!Array.isArray(cfg.batteries)) cfg.batteries = [];

    const old = this._config;
    this._config = cfg;
    if (!this._view || (old && old.default_view !== cfg.default_view)) this._view = cfg.default_view;
    if (this._sel >= this._batteries().length) this._sel = 0;
    this._data = null;
    this._zoom = null;
    this._lastFetch = 0;
    if (this._hass) this._fetch();
    this._render();
    this._restartTimer();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (!this._config) return;
    const refresh = Math.max(1, this._config.refresh_minutes) * 60 * 1000;
    if (first) this._render();
    if (first || (this._offset === 0 && !this._zoom && Date.now() - this._lastFetch > refresh)) this._fetch();
  }

  getCardSize() {
    const c = this._config || DEFAULTS;
    if (c.layout === "compact") return 3;
    return (
      Math.ceil(c.chart_height / 50) +
      (c.show_stats ? 2 : 0) +
      (c.show_status || c.show_insights ? 1 : 0) +
      (c.show_top ? 2 : 0) +
      (c.show_heatmap ? (c.heatmap_style === "clock" ? 5 : 1) : 0) +
      2
    );
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
      if (this._hass && this._offset === 0 && !this._zoom) this._fetch();
    }, Math.max(1, this._config.refresh_minutes) * 60 * 1000);
  }

  /* ------------------------------------------------------------ Sprache & Format */

  _lang() {
    const l = this._config?.language;
    if (l === "de" || l === "en") return l;
    const h = (this._hass?.locale?.language || this._hass?.language || navigator.language || "de").toLowerCase();
    return h.startsWith("de") ? "de" : "en";
  }
  _t(key, vars) {
    let s = STR[this._lang()][key] ?? STR.de[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
  }
  _locale() {
    return this._lang() === "de" ? "de-DE" : "en-GB";
  }
  _num(v, d) {
    return new Intl.NumberFormat(this._locale(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
  }
  _kw(v) {
    return this._num(v, v >= 10 ? 1 : 2);
  }
  _kwh(v) {
    return this._num(v, v >= 100 ? 0 : 1);
  }
  _money(v) {
    return `${this._num(v, 2)} ${esc(this._config.currency)}`;
  }
  _dateShort(ms) {
    return `${this._t("weekdays")[weekdayIdx(ms)]} ${new Date(ms).toLocaleDateString(this._locale(), { day: "2-digit", month: "2-digit" })}`;
  }
  _hourRange(h) {
    const s = `${pad(h)}–${pad(h + 1)}`;
    return this._t("oclock") ? `${s} ${this._t("oclock")}` : s;
  }

  /* ------------------------------------------------------------ Batterien & Zeitraum */

  _batteries() {
    const c = this._config;
    const first = {};
    for (const k of BATTERY_KEYS) first[k] = c[k];
    const list = [first, ...c.batteries.map((b) => ({ ...DEFAULTS, mode: "separate", ...b }))].map((b) => ({
      ...b,
      capacity_kwh: Math.max(0, Number(b.capacity_kwh) || 0),
      min_soc: Math.max(0, Math.min(100, Number(b.min_soc ?? 10))),
    }));
    const valid = list.filter((b) => (b.mode === "combined" ? b.power_entity : b.charge_entity && b.discharge_entity));
    valid.forEach((b, i) => {
      if (!b.name) b.name = valid.length > 1 ? `${this._t("battery")} ${i + 1}` : this._t("battery");
    });
    return valid;
  }

  _selected() {
    const all = this._batteries();
    return this._sel === -1 ? all : [all[this._sel] || all[0]];
  }

  _dataIds(bats) {
    return [...new Set(bats.flatMap((b) => (b.mode === "combined" ? [b.power_entity] : [b.charge_entity, b.discharge_entity])))];
  }

  _range() {
    const now = Date.now();
    let start, endFull;
    if (this._view === "week") {
      start = addDays(weekStart(now), -7 * this._offset);
      endFull = addDays(start, 7);
    } else if (this._view === "month") {
      const m = new Date(dayStartOf(now));
      m.setDate(1);
      start = addMonths(m.getTime(), -this._offset);
      endFull = addMonths(start, 1);
    } else {
      start = addDays(dayStartOf(now), -this._offset);
      endFull = addDays(start, 1);
    }
    const days = [];
    for (let t = start; t < endFull; t = addDays(t, 1)) days.push(t);
    return { start, endFull, end: Math.min(endFull, now), days, isCurrent: this._offset === 0 };
  }

  /* ------------------------------------------------------------ Datenabruf */

  async _history(ids, start, end) {
    ids = [...new Set(ids.filter(Boolean))];
    if (!ids.length) return {};
    return this._hass.callWS({
      type: "history/history_during_period",
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
      entity_ids: ids,
      minimal_response: true,
      no_attributes: true,
      significant_changes_only: false,
    });
  }

  async _stats(ids, start, end, period) {
    ids = [...new Set(ids.filter(Boolean))];
    if (!ids.length || end <= start) return {};
    try {
      return await this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        statistic_ids: ids,
        period,
        types: ["mean", "change"],
        units: { power: "kW", energy: "kWh" },
      });
    } catch (e) {
      return {};
    }
  }

  async _fetch() {
    if (!this._hass || !this._config) return;
    const token = ++this._token;
    this._lastFetch = Date.now();
    try {
      const r = this._range();
      const bats = this._selected();
      const data = this._view === "day" ? await this._fetchDay(r, bats) : await this._fetchPeriod(r, bats);
      if (token !== this._token) return;
      this._data = data;
      this._error = null;
    } catch (e) {
      if (token !== this._token) return;
      this._error = e?.message || String(e);
    }
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

  _isEnergy(entity) {
    const m = this._config.unit_mode;
    if (m === "energy") return true;
    if (m === "power") return false;
    return /wh$/i.test(this._unit(entity));
  }

  _state(entity) {
    const v = parseFloat(this._hass?.states?.[entity]?.state);
    return Number.isFinite(v) ? v : null;
  }

  _valueAt(pts, t) {
    let v = null;
    for (const p of pts) {
      if (p.t > t) break;
      if (Number.isFinite(p.v)) v = p.v;
    }
    return v;
  }

  /** Leistung/Energie → Energie je Bucket, mittlere Leistung, Stundensummen, Spitze */
  _series(entity, pts, start, end, bucketMs, spanMs, sign = 1) {
    const nB = Math.round(spanMs / bucketMs);
    const energy = new Array(nB).fill(0);
    const unit = this._unit(entity);
    const isEnergy = this._isEnergy(entity);
    const toK = /^(w|wh)$/i.test(unit) ? 0.001 : /^m(w|wh)$/i.test(unit) ? 1000 : 1;
    let peak = { v: 0, t: null };

    if (isEnergy) {
      let prev = null;
      for (const p of pts) {
        if (!Number.isFinite(p.v)) continue;
        if (prev !== null && p.t > start) {
          let d = p.v - prev;
          if (d < 0) d = p.v; // Zähler-Reset
          const b = Math.floor((p.t - start) / bucketMs);
          if (b >= 0 && b < nB) energy[b] += Math.max(0, d) * toK;
        }
        prev = p.v;
      }
      energy.forEach((e, b) => {
        const kw = e / (bucketMs / HOUR_MS);
        if (kw > peak.v) peak = { v: kw, t: start + b * bucketMs + bucketMs / 2 };
      });
    } else {
      for (let i = 0; i < pts.length; i++) {
        const v = Number.isFinite(pts[i].v) ? Math.max(0, pts[i].v * toK * sign) : 0;
        const s = Math.max(pts[i].t, start);
        const e = Math.min(i + 1 < pts.length ? pts[i + 1].t : end, end);
        if (pts[i].t >= start && pts[i].t <= end && v > peak.v) peak = { v, t: pts[i].t };
        if (e <= s || v === 0) continue;
        let cur = s;
        while (cur < e) {
          const b = Math.floor((cur - start) / bucketMs);
          const segEnd = Math.min(start + (b + 1) * bucketMs, e);
          if (b >= 0 && b < nB) energy[b] += (v * (segEnd - cur)) / HOUR_MS;
          cur = segEnd;
        }
      }
    }
    const avg = energy.map((e, b) => {
      const span = Math.min(bucketMs, Math.max(0, end - (start + b * bucketMs)));
      return span > 0 ? e / (span / HOUR_MS) : null;
    });
    const nH = Math.max(1, Math.ceil(spanMs / HOUR_MS));
    const hourly = new Array(nH).fill(0);
    energy.forEach((e, b) => (hourly[Math.min(nH - 1, Math.floor((b * bucketMs) / HOUR_MS))] += e));
    return { avg, energy, hourly, total: sum(energy), peak };
  }

  /** Alle Serien eines Zeitfensters aus der History */
  _daySet(hist, bats, start, end, bucketMs, spanMs) {
    const c = this._config;
    const per = bats.map((b) => {
      if (b.mode === "combined") {
        const pts = this._points(hist[b.power_entity]);
        const s = b.invert ? -1 : 1;
        return {
          charge: this._series(b.power_entity, pts, start, end, bucketMs, spanMs, s),
          discharge: this._series(b.power_entity, pts, start, end, bucketMs, spanMs, -s),
        };
      }
      return {
        charge: this._series(b.charge_entity, this._points(hist[b.charge_entity]), start, end, bucketMs, spanMs),
        discharge: this._series(b.discharge_entity, this._points(hist[b.discharge_entity]), start, end, bucketMs, spanMs),
      };
    });
    const out = {
      start,
      end,
      spanMs,
      bucketMs,
      charge: sumSeries(per.map((p) => p.charge), start, bucketMs),
      discharge: sumSeries(per.map((p) => p.discharge), start, bucketMs),
      soc: null,
      pv: null,
      gridIn: null,
      gridOut: null,
    };
    if (bats.length === 1 && bats[0].soc_entity && c.show_soc) {
      out.soc = this._points(hist[bats[0].soc_entity])
        .filter((p) => Number.isFinite(p.v))
        .map((p) => ({ t: Math.max(p.t, start), v: Math.min(100, Math.max(0, p.v)) }))
        .filter((p) => p.t <= end);
    }
    if (c.pv_entity && c.show_pv) out.pv = this._series(c.pv_entity, this._points(hist[c.pv_entity]), start, end, bucketMs, spanMs);
    if (c.grid_entity && c.show_grid_power) {
      const pts = this._points(hist[c.grid_entity]);
      const s = c.grid_invert ? -1 : 1;
      out.gridIn = this._series(c.grid_entity, pts, start, end, bucketMs, spanMs, s);
      out.gridOut = this._series(c.grid_entity, pts, start, end, bucketMs, spanMs, -s);
    }
    return out;
  }

  _priceHourly(pts, start, end) {
    const acc = new Array(24).fill(0), w = new Array(24).fill(0);
    for (let i = 0; i < pts.length; i++) {
      if (!Number.isFinite(pts[i].v)) continue;
      let cur = Math.max(pts[i].t, start);
      const e = Math.min(i + 1 < pts.length ? pts[i + 1].t : end, end);
      while (cur < e) {
        const h = Math.floor((cur - start) / HOUR_MS);
        const segEnd = Math.min(start + (h + 1) * HOUR_MS, e);
        if (h >= 0 && h < 24) {
          acc[h] += pts[i].v * (segEnd - cur);
          w[h] += segEnd - cur;
        }
        cur = segEnd;
      }
    }
    return acc.map((a, h) => (w[h] ? a / w[h] : null));
  }

  _fallbackPrice() {
    const c = this._config;
    if (c.price > 0) return c.price;
    return c.price_entity ? this._state(c.price_entity) : null;
  }

  async _fetchDay(r, bats) {
    const c = this._config;
    const ids = [
      ...this._dataIds(bats),
      ...bats.flatMap((b) => [b.soc_entity, b.temp_entity]),
      c.show_pv ? c.pv_entity : "",
      c.show_grid_power ? c.grid_entity : "",
      c.price > 0 ? "" : c.price_entity,
    ];
    const [hist, compare] = await Promise.all([this._history(ids, r.start, r.end), this._fetchCompare(r, bats)]);
    const bucketMs = c.bucket_minutes * 60 * 1000;
    const set = this._daySet(hist, bats, r.start, r.end, bucketMs, DAY_MS);

    // Status je Batterie (Spannweite des Tages)
    const status = bats.map((b) => {
      const range = (id) => {
        if (!id) return null;
        const v = this._points(hist[id]).filter((p) => Number.isFinite(p.v) && p.t <= r.end).map((p) => p.v);
        return v.length ? { min: Math.min(...v), max: Math.max(...v) } : null;
      };
      return { soc: range(b.soc_entity), temp: range(b.temp_entity) };
    });

    // Kennzahlen
    const C = set.charge.total, D = set.discharge.total;
    const caps = bats.map((b) => b.capacity_kwh);
    const capTotal = caps.every((x) => x > 0) ? sum(caps) : 0;
    let dE = null;
    if (capTotal && bats.every((b) => b.soc_entity)) {
      dE = 0;
      for (const b of bats) {
        const pts = this._points(hist[b.soc_entity]).filter((p) => Number.isFinite(p.v));
        if (!pts.length) { dE = null; break; }
        const s0 = this._valueAt(pts, r.start) ?? pts[0].v;
        const s1 = pts[pts.length - 1].v;
        dE += ((s1 - s0) / 100) * b.capacity_kwh;
      }
    }
    // Wirkungsgrad: (Entladen + gespeicherte Energiezunahme) / Laden
    const eff = C > 0.3 ? (D + (dE ?? 0)) / C : null;
    const cycles = capTotal ? (C + D) / 2 / capTotal : null;
    let savings = null;
    if (c.price_entity || c.price > 0) {
      const fp = this._fallbackPrice() ?? 0;
      const ph = c.price > 0 ? null : this._priceHourly(this._points(hist[c.price_entity]), r.start, r.end);
      savings = sum(set.discharge.hourly.map((e, h) => e * ((ph && ph[h]) ?? fp)));
    }
    const forecast = r.isCurrent ? this._forecast(set, bats, capTotal) : null;
    return { kind: "day", r, hist, ...set, status, compare, insights: { eff, cycles, savings, forecast } };
  }

  _forecast(set, bats, capTotal) {
    if (!capTotal || !bats.every((b) => b.soc_entity)) return null;
    const socs = bats.map((b) => this._state(b.soc_entity));
    if (socs.some((s) => s === null)) return null;
    const now = Date.now();
    const win = 30 * 60 * 1000;
    let ec = 0, ed = 0;
    set.charge.energy.forEach((e, i) => {
      const bs = set.start + i * set.bucketMs;
      if (bs + set.bucketMs > now - win && bs < now) {
        ec += e;
        ed += set.discharge.energy[i];
      }
    });
    const hours = Math.min(win + set.bucketMs, now - set.start) / HOUR_MS;
    if (hours <= 0) return null;
    const rate = (ec - ed) / hours; // kW, positiv = laden
    if (rate < -0.05) {
      const avail = sum(bats.map((b, i) => (Math.max(0, socs[i] - b.min_soc) / 100) * b.capacity_kwh));
      const h = avail / -rate;
      return { kind: "discharge", text: h > 24 ? this._t("more_than_day") : this._t("lasts_until", { t: fmtTime(now + h * HOUR_MS) }) };
    }
    if (rate > 0.05) {
      if (socs.every((v) => v >= 99)) return { kind: "charge", text: this._t("full") };
      const need = sum(bats.map((b, i) => (Math.max(0, 100 - socs[i]) / 100) * b.capacity_kwh));
      const h = need / rate;
      if (h > 24) return { kind: "charge", text: this._t("idle") };
      return { kind: "charge", text: this._t("full_at", { t: fmtTime(now + h * HOUR_MS) }) };
    }
    return { kind: "idle", text: this._t("idle") };
  }

  /** Vergleichskurve (gestern / Ø 7 Tage) aus der Kurzzeitstatistik */
  async _fetchCompare(r, bats) {
    const c = this._config;
    if (c.compare === "none") return null;
    const nDays = c.compare === "avg7" ? 7 : 1;
    const from = addDays(r.start, -nDays);
    const ids = this._dataIds(bats);
    let period = 5 * 60 * 1000;
    let st = await this._stats(ids, from, r.start, "5minute");
    if (!ids.some((id) => st[id]?.length)) {
      st = await this._stats(ids, from, r.start, "hour");
      period = HOUR_MS;
    }
    if (!ids.some((id) => st[id]?.length)) return null;
    const bucketMs = c.bucket_minutes * 60 * 1000;
    const nB = Math.round(DAY_MS / bucketMs);
    const ch = new Array(nB).fill(0), di = new Array(nB).fill(0);
    const add = (arr, t, e) => {
      let cur = t;
      const end = t + period;
      while (cur < end) {
        const ds = dayStartOf(cur);
        const b = Math.floor((cur - ds) / bucketMs);
        const seg = Math.min(ds + (b + 1) * bucketMs, end);
        if (b >= 0 && b < nB) arr[b] += (e * (seg - cur)) / period;
        cur = seg;
      }
    };
    this._eachStat(st, bats, period, (t, ce, de) => {
      add(ch, t, ce);
      add(di, t, de);
    });
    const hrs = bucketMs / HOUR_MS;
    return {
      charge: ch.map((e) => e / nDays / hrs),
      discharge: di.map((e) => e / nDays / hrs),
      label: this._t(c.compare === "avg7" ? "compare_avg7" : "compare_yesterday"),
    };
  }

  /** ruft cb(t, kWh Laden, kWh Entladen) für jeden Statistik-Eintrag aller Batterien */
  _eachStat(st, bats, period, cb) {
    const ph = period / HOUR_MS;
    const energyOf = (id, s, sign) => {
      if (this._isEnergy(id)) return Math.max(0, s.change ?? 0);
      return Math.max(0, (s.mean ?? 0) * sign) * ph;
    };
    for (const b of bats) {
      if (b.mode === "combined") {
        const sg = b.invert ? -1 : 1;
        for (const s of st[b.power_entity] || []) cb(statTime(s.start), energyOf(b.power_entity, s, sg), energyOf(b.power_entity, s, -sg));
      } else {
        for (const s of st[b.charge_entity] || []) cb(statTime(s.start), energyOf(b.charge_entity, s, 1), 0);
        for (const s of st[b.discharge_entity] || []) cb(statTime(s.start), 0, energyOf(b.discharge_entity, s, 1));
      }
    }
  }

  async _fetchPeriod(r, bats) {
    const c = this._config;
    const ids = this._dataIds(bats);
    const st = await this._stats([...ids, c.price > 0 ? "" : c.price_entity], r.start, r.end, "hour");
    const nD = r.days.length;
    const mk = (v) => Array.from({ length: nD }, () => new Array(24).fill(v));
    const C = mk(0), D = mk(0), P = mk(null);
    const pos = (t) => [r.days.indexOf(dayStartOf(t)), new Date(t).getHours()];
    this._eachStat(st, bats, HOUR_MS, (t, ce, de) => {
      const [d, h] = pos(t);
      if (d < 0) return;
      C[d][h] += ce;
      D[d][h] += de;
    });
    if (c.price_entity && !(c.price > 0)) {
      for (const s of st[c.price_entity] || []) {
        const [d, h] = pos(statTime(s.start));
        if (d >= 0 && Number.isFinite(s.mean)) P[d][h] = s.mean;
      }
    }
    const hasData = ids.some((id) => st[id]?.length);
    const now = Date.now();
    const dayC = C.map(sum), dayD = D.map(sum);
    const elapsed = r.days.filter((d) => d <= now).length;
    const totalC = sum(dayC), totalD = sum(dayD);
    // Wochentag × Stunde (Mittelwert)
    const W = Array.from({ length: 7 }, () => ({ c: new Array(24).fill(0), d: new Array(24).fill(0), n: 0 }));
    r.days.forEach((ds, i) => {
      if (ds > now) return;
      const w = W[weekdayIdx(ds)];
      w.n++;
      for (let h = 0; h < 24; h++) {
        w.c[h] += C[i][h];
        w.d[h] += D[i][h];
      }
    });
    W.forEach((w) => {
      if (w.n) for (let h = 0; h < 24; h++) { w.c[h] /= w.n; w.d[h] /= w.n; }
    });
    const best = (arr) => {
      let i = -1, v = 0;
      arr.forEach((x, j) => { if (x > v) { v = x; i = j; } });
      return i >= 0 ? { v, t: r.days[i] } : { v: 0, t: null };
    };
    const caps = bats.map((b) => b.capacity_kwh);
    const capTotal = caps.every((x) => x > 0) ? sum(caps) : 0;
    let savings = null;
    if (c.price_entity || c.price > 0) {
      const fp = this._fallbackPrice() ?? 0;
      savings = 0;
      D.forEach((row, d) => row.forEach((e, h) => (savings += e * (c.price > 0 ? c.price : P[d][h] ?? fp))));
    }
    return {
      kind: "period",
      r,
      hasData,
      dayC,
      dayD,
      W,
      totalC,
      totalD,
      bestC: best(dayC),
      bestD: best(dayD),
      insights: {
        eff: totalC > 0.3 ? totalD / totalC : null,
        cycles: capTotal ? (totalC + totalD) / 2 / capTotal : null,
        savings,
        perDay: elapsed ? { c: totalC / elapsed, d: totalD / elapsed } : null,
      },
    };
  }

  /* ------------------------------------------------------------ Rendering */

  _render() {
    if (!this._config) return;
    const c = this._config;
    const d = this._data;
    let body;
    if (this._error) body = `<div class="msg">${this._t("error")}<br>${esc(this._error)}</div>`;
    else if (!d || !this._hass) body = `<div class="msg">${this._t("loading")}</div>`;
    else if (d.kind === "day") body = this._renderDay(d);
    else body = this._renderPeriod(d);
    this._geo = this._geo && d ? this._geo : null;
    this.shadowRoot.innerHTML = `<style>${this._css()}</style><ha-card class="${c.layout === "compact" ? "compact" : ""}">${this._header()}${body}</ha-card>`;
    this._bind();
  }

  _periodLabel() {
    const r = this._range();
    if (this._view === "week") {
      const f = (ms) => new Date(ms).toLocaleDateString(this._locale(), { day: "2-digit", month: "2-digit" });
      return `${this._t("cw")} ${isoWeek(r.start)} · ${f(r.start)}–${f(addDays(r.start, 6))}`;
    }
    if (this._view === "month") return new Date(r.start).toLocaleDateString(this._locale(), { month: "long", year: "numeric" });
    if (this._offset === 0) return this._t("today");
    if (this._offset === 1) return this._t("yesterday");
    return this._dateShort(r.start);
  }

  _header() {
    const c = this._config;
    if (!c.show_header) return "";
    const bats = this._batteries();
    const title = c.title || (bats.length === 1 && c.name ? c.name : this._t("battery"));
    const nav = c.show_navigation
      ? `<button class="nb" data-act="prev">‹</button><span class="date">${esc(this._periodLabel())}</span><button class="nb" data-act="next" ${this._offset === 0 ? "disabled" : ""}>›</button>`
      : `<span class="date">${esc(this._periodLabel())}</span>`;
    const views = c.show_view_switch
      ? `<div class="seg">${["day", "week", "month"].map((v) => `<button data-view="${v}" class="${this._view === v ? "on" : ""}">${this._t(v)}</button>`).join("")}</div>`
      : "";
    const tabs =
      bats.length > 1
        ? `<div class="seg">${bats.map((b, i) => `<button data-bat="${i}" class="${this._sel === i ? "on" : ""}">${esc(b.name)}</button>`).join("")}<button data-bat="-1" class="${this._sel === -1 ? "on" : ""}">${this._t("total")}</button></div>`
        : "";
    return `
      <div class="head">
        <div class="title">${c.icon ? `<ha-icon icon="${esc(c.icon)}"></ha-icon>` : ""}<span>${esc(title)}</span></div>
        <div class="nav">${nav}</div>
      </div>
      ${views || tabs ? `<div class="bar">${views}${tabs}</div>` : ""}`;
  }

  _renderDay(d) {
    const c = this._config;
    const bats = this._selected();
    const parts = [];
    const z = this._zoom;
    const shown = z ? this._daySet(d.hist, bats, z.start, Math.min(z.end, d.r.end), 60 * 1000, z.end - z.start) : d;
    const one = bats.length === 1 ? bats[0] : null;
    const ce = one ? (one.mode === "combined" ? one.power_entity : one.charge_entity) : "";
    const de = one ? (one.mode === "combined" ? one.power_entity : one.discharge_entity) : "";
    if (c.show_stats) {
      parts.push(`<div class="stats">
        ${this._stat(this._t("charged"), this._kwh(d.charge.total), "kWh", c.charge_color, "▲", "", ce)}
        ${this._stat(this._t("discharged"), this._kwh(d.discharge.total), "kWh", c.discharge_color, "▼", "", de)}
        ${this._stat(this._t("max_charge"), d.charge.peak.t ? this._kw(d.charge.peak.v) : "–", "kW", c.charge_color, "", d.charge.peak.t ? `${this._t("at")} ${fmtTime(d.charge.peak.t)}` : "", ce)}
        ${this._stat(this._t("max_discharge"), d.discharge.peak.t ? this._kw(d.discharge.peak.v) : "–", "kW", c.discharge_color, "", d.discharge.peak.t ? `${this._t("at")} ${fmtTime(d.discharge.peak.t)}` : "", de)}
      </div>`);
    }
    if (c.layout === "compact") {
      parts.push(this._insightsRow(d.insights, true));
      parts.push(this._heatNet(d));
      return parts.join("");
    }
    if (c.show_status) parts.push(this._statusRow(bats, d.status));
    if (c.show_insights) parts.push(this._insightsRow(d.insights));
    parts.push(`<div class="chart">${this._svgDay(shown, !!z, z ? null : d.compare)}
      ${z ? `<button class="zoomx" data-act="unzoom">✕ ${this._t("zoom_reset")}</button>` : ""}
      <div class="tip" id="tip"></div></div>`);
    parts.push(this._legend(shown, z ? null : d.compare));
    if (c.show_heatmap) parts.push(this._heat(d));
    if (c.show_top) {
      parts.push(`<div class="tops">
        ${this._topHours(this._t("top_charge_hours"), d.charge.hourly, c.charge_color)}
        ${this._topHours(this._t("top_discharge_hours"), d.discharge.hourly, c.discharge_color)}
      </div>`);
    }
    return parts.join("");
  }

  _renderPeriod(d) {
    const c = this._config;
    const bats = this._selected();
    if (!d.hasData) return `<div class="msg">${this._t("no_stats")}</div>`;
    const parts = [];
    const f = (b) => (b.t ? this._dateShort(b.t) : "");
    if (c.show_stats) {
      parts.push(`<div class="stats">
        ${this._stat(this._t("charged"), this._kwh(d.totalC), "kWh", c.charge_color, "▲")}
        ${this._stat(this._t("discharged"), this._kwh(d.totalD), "kWh", c.discharge_color, "▼")}
        ${this._stat(this._t("best_charge_day"), d.bestC.t ? this._kwh(d.bestC.v) : "–", "kWh", c.charge_color, "", f(d.bestC), "", d.bestC.t)}
        ${this._stat(this._t("best_discharge_day"), d.bestD.t ? this._kwh(d.bestD.v) : "–", "kWh", c.discharge_color, "", f(d.bestD), "", d.bestD.t)}
      </div>`);
    }
    if (c.layout === "compact") {
      parts.push(`<div class="chart">${this._svgPeriod(d, 100)}<div class="tip" id="tip"></div></div>`);
      return parts.join("");
    }
    if (c.show_status) parts.push(this._statusRow(bats, null));
    if (c.show_insights) parts.push(this._insightsRow(d.insights));
    parts.push(`<div class="chart">${this._svgPeriod(d, c.chart_height)}<div class="tip" id="tip"></div></div>`);
    if (c.show_heatmap) parts.push(this._heatWeek(d));
    if (c.show_top) {
      parts.push(`<div class="tops">
        ${this._topDays(this._t("top_charge_days"), d.dayC, d.r.days, c.charge_color)}
        ${this._topDays(this._t("top_discharge_days"), d.dayD, d.r.days, c.discharge_color)}
      </div>`);
    }
    return parts.join("");
  }

  _stat(label, value, unit, color, arrow, sub = "", entity = "", day = null) {
    const attr = entity ? `data-entity="${esc(entity)}"` : day ? `data-day="${day}"` : "";
    return `
      <div class="stat${attr ? " click" : ""}" style="--c:${color}" ${attr}>
        <div class="lbl">${arrow ? `<span class="arr">${arrow}</span>` : ""}${label}</div>
        <div class="val">${value}<small>${unit}</small></div>
        <div class="sub">${sub || "&nbsp;"}</div>
      </div>`;
  }

  _socIcon(v) {
    if (v >= 95) return "mdi:battery";
    if (v < 5) return "mdi:battery-outline";
    return `mdi:battery-${Math.max(10, Math.min(90, Math.round(v / 10) * 10))}`;
  }

  _statusRow(bats, status) {
    const c = this._config;
    const groups = [];
    bats.forEach((b, i) => {
      const st = status?.[i];
      const items = [];
      if (b.soc_entity) {
        const v = this._state(b.soc_entity);
        if (v !== null) {
          const col = v <= b.min_soc + 5 ? c.discharge_color : c.charge_color;
          items.push(`<div class="chipi click" data-entity="${esc(b.soc_entity)}" title="${this._t("soc")}">
            <ha-icon icon="${this._socIcon(v)}" style="color:${col}"></ha-icon>
            <div><b>${this._num(v, 0)} %</b><div class="socbar"><i style="width:${Math.max(0, Math.min(100, v))}%;background:${col}"></i></div>
            <small>${st?.soc ? this._t("range_today", { a: this._num(st.soc.min, 0), b: this._num(st.soc.max, 0) + " %" }) : this._t("soc")}</small></div></div>`);
        }
      }
      if (b.soh_entity) {
        const v = this._state(b.soh_entity);
        if (v !== null)
          items.push(`<div class="chipi click" data-entity="${esc(b.soh_entity)}" title="${this._t("soh")}"><ha-icon icon="mdi:battery-heart-variant"></ha-icon>
            <div><b>${this._num(v, 0)} %</b><small>${this._t("soh")}</small></div></div>`);
      }
      if (b.temp_entity) {
        const v = this._state(b.temp_entity);
        const u = esc(this._unit(b.temp_entity) || "°C");
        if (v !== null)
          items.push(`<div class="chipi click" data-entity="${esc(b.temp_entity)}" title="${this._t("temp")}"><ha-icon icon="mdi:thermometer"></ha-icon>
            <div><b>${this._num(v, 1)} ${u}</b><small>${st?.temp ? this._t("range_today", { a: this._num(st.temp.min, 1), b: this._num(st.temp.max, 1) + " " + u }) : this._t("temp")}</small></div></div>`);
      }
      if (items.length) groups.push(`<div class="sgroup">${bats.length > 1 ? `<span class="bn">${esc(b.name)}</span>` : ""}${items.join("")}</div>`);
    });
    return groups.length ? `<div class="status">${groups.join("")}</div>` : "";
  }

  _insightsRow(ins, onlyForecast = false) {
    if (!ins) return "";
    const items = [];
    const chip = (icon, label, value, cls = "") =>
      `<div class="ins ${cls}"><ha-icon icon="${icon}"></ha-icon><div><small>${label}</small><b>${value}</b></div></div>`;
    if (ins.forecast) {
      const k = ins.forecast.kind;
      const icon = k === "discharge" ? "mdi:battery-arrow-down" : k === "charge" ? "mdi:battery-arrow-up" : "mdi:battery-clock";
      items.push(chip(icon, this._t("forecast"), ins.forecast.text, k));
    }
    if (!onlyForecast) {
      if (ins.eff != null) items.push(chip("mdi:swap-vertical-circle-outline", this._t("efficiency"), `${this._num(Math.min(ins.eff, 1.5) * 100, 0)} %`));
      if (ins.cycles != null) items.push(chip("mdi:sync", this._t("cycles"), this._num(ins.cycles, 2)));
      if (ins.savings != null) items.push(chip("mdi:piggy-bank-outline", this._t("savings"), this._money(ins.savings), "money"));
      if (ins.perDay) items.push(chip("mdi:calendar-today", this._t("per_day"), `▲ ${this._kwh(ins.perDay.c)} · ▼ ${this._kwh(ins.perDay.d)} kWh`));
    }
    return items.length ? `<div class="insights">${items.join("")}</div>` : "";
  }

  _legend(s, compare) {
    const c = this._config;
    const it = [];
    if (s.pv) it.push(`<span><i class="ln" style="border-color:${c.pv_color}"></i>${this._t("pv")}</span>`);
    if (s.gridIn) it.push(`<span><i class="ln dash" style="border-color:${c.grid_color}"></i>${this._t("grid_in")} ▼ / ${this._t("grid_out")} ▲</span>`);
    if (compare) it.push(`<span><i class="ln dash" style="border-color:var(--secondary-text-color)"></i>${esc(compare.label)}</span>`);
    if (s.soc && s.soc.length) it.push(`<span><i class="ln dash" style="border-color:${c.soc_color}"></i>SoC</span>`);
    return it.length ? `<div class="legend">${it.join("")}</div>` : "";
  }

  /* ---------- Tagesdiagramm */

  _svgDay(s, zoomed, compare) {
    const c = this._config;
    const hasSoc = s.soc && s.soc.length;
    const W = 640, H = c.chart_height + 10, L = 38, R = hasSoc ? 34 : 12, T = 16, B = 22;
    const iw = W - L - R, ih = H - T - B, mid = T + ih / 2;
    const ca = s.charge.avg, da = s.discharge.avg, n = ca.length;
    this._geo = { W, L, iw, n, kind: "day", s, zoomed, compare };

    const vals = [...ca, ...da];
    if (compare) vals.push(...compare.charge, ...compare.discharge);
    if (s.pv) vals.push(...s.pv.avg);
    if (s.gridIn) vals.push(...s.gridIn.avg, ...s.gridOut.avg);
    const dataMax = Math.max(0.3, ...vals.map((v) => v || 0)) * 1.15;
    const maxV = c.y_max > 0 ? c.y_max : dataMax;
    const step = maxV > 16 ? 8 : maxV > 8 ? 4 : maxV > 4 ? 2 : maxV > 2 ? 1 : maxV > 1 ? 0.5 : 0.25;
    const top = c.y_max > 0 ? c.y_max : Math.ceil(maxV / step) * step;
    const x = (i) => L + ((i + 0.5) / n) * iw;
    const xt = (t) => L + ((t - s.start) / s.spanMs) * iw;
    const y = (v, sign) => mid - sign * (Math.min(v, top) / top) * (ih / 2);

    const linePath = (arr, sign, smooth) => {
      const idx = arr.map((v, i) => (v === null || v === undefined ? -1 : i)).filter((i) => i >= 0);
      if (!idx.length) return null;
      const pts = idx.map((i) => [x(i), y(arr[i], sign)]);
      const clamp = (v) => (sign > 0 ? Math.min(mid, v) : Math.max(mid, v));
      let p = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i], p2 = pts[i + 1];
        if (smooth) {
          const p0 = pts[i - 1] || p1, p3 = pts[i + 2] || p2;
          p += ` C${p1[0] + (p2[0] - p0[0]) / 6},${clamp(p1[1] + (p2[1] - p0[1]) / 6)} ${p2[0] - (p3[0] - p1[0]) / 6},${clamp(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]},${p2[1]}`;
        } else p += ` L${p2[0]},${p2[1]}`;
      }
      return { p, first: pts[0][0], last: pts[pts.length - 1][0] };
    };

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
      const lp = linePath(arr, sign, c.smooth);
      if (!lp) return "";
      return `<path d="${lp.p} L${lp.last},${mid} L${lp.first},${mid} Z" fill="url(#${grad})"/><path d="${lp.p}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    };
    const thin = (arr, sign, color, cls) => {
      const lp = arr && linePath(arr, sign, c.smooth);
      return lp ? `<path d="${lp.p}" class="${cls}" style="stroke:${color}"/>` : "";
    };

    let g = "";
    for (let v = step; v <= top + 1e-9; v += step) {
      for (const sg of [1, -1]) {
        if (c.show_grid) g += `<line x1="${L}" x2="${W - R}" y1="${y(v, sg)}" y2="${y(v, sg)}" class="g"/>`;
        g += `<text x="${L - 6}" y="${y(v, sg) + 3}" class="ax" text-anchor="end">${this._num(v, Number.isInteger(v) ? 0 : Number.isInteger(v * 2) ? 1 : 2)}</text>`;
      }
    }
    g += `<line x1="${L}" x2="${W - R}" y1="${mid}" y2="${mid}" class="zero"/><text x="${L - 6}" y="${mid + 3}" class="ax" text-anchor="end">0</text>`;
    const tickMs = zoomed ? 15 * 60 * 1000 : 3 * HOUR_MS;
    const t0 = zoomed ? Math.ceil(s.start / tickMs) * tickMs : s.start;
    for (let t = t0; t <= s.start + s.spanMs + 1; t += tickMs) {
      const tx = xt(t);
      if (c.show_grid) g += `<line x1="${tx}" x2="${tx}" y1="${T}" y2="${H - B}" class="g"/>`;
      g += `<text x="${tx}" y="${H - 6}" class="ax" text-anchor="middle">${zoomed ? fmtTime(t) : pad(Math.round((t - s.start) / HOUR_MS))}</text>`;
    }
    g += `<text x="${L - 6}" y="${T - 7}" class="ax unit" text-anchor="end">kW</text>`;

    let nowL = "";
    const now = Date.now();
    if (c.show_now_line && now >= s.start && now <= s.start + s.spanMs) {
      const nx = xt(now);
      nowL = `<line x1="${nx}" x2="${nx}" y1="${T}" y2="${H - B}" class="now"/><text x="${nx}" y="${T - 5}" class="ax nowt" text-anchor="middle">${this._t("now")}</text>`;
    }

    let soc = "";
    if (hasSoc) {
      const sy = (v) => T + ih - (v / 100) * ih;
      let p = "";
      s.soc.forEach((pt, i) => (p += i === 0 ? `M${xt(pt.t)},${sy(pt.v)}` : ` H${xt(pt.t)} V${sy(pt.v)}`));
      p += ` H${xt(s.end)}`;
      soc = `<path d="${p}" class="soc"/>`;
      for (const v of [0, 50, 100]) soc += `<text x="${W - R + 5}" y="${sy(v) + 3}" class="ax socax">${v}%</text>`;
    }

    const marker = (ser, arr, sign, color) => {
      if (!c.show_peaks || !ser.peak.t || ser.peak.v < 0.01) return "";
      const i = Math.max(0, Math.min(n - 1, Math.floor((ser.peak.t - s.start) / s.bucketMs)));
      const px = x(i), py = y(arr[i] || 0, sign);
      const lbl = `${this._kw(ser.peak.v)} kW · ${fmtTime(ser.peak.t)}`;
      const ty = sign > 0 ? Math.max(T + 10, py - 10) : Math.min(H - B - 4, py + 18);
      const anchor = px > W - R - 70 ? "end" : px < L + 70 ? "start" : "middle";
      return `${c.animate_peaks ? `<circle cx="${px}" cy="${py}" r="9" fill="${alpha(color, 0.3)}" class="pulse"/>` : ""}
        <circle cx="${px}" cy="${py}" r="4" fill="${color}" class="dot"/>
        <text x="${px}" y="${ty}" class="pk" text-anchor="${anchor}" style="fill:${color}">${lbl}</text>`;
    };

    return `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" id="svg" style="height:${c.chart_height}px" class="${!zoomed && c.zoom_on_click ? "zoomable" : ""}">
        <defs>
          <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.charge_color}" stop-opacity=".75"/><stop offset="1" stop-color="${c.charge_color}" stop-opacity=".05"/></linearGradient>
          <linearGradient id="gd" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c.discharge_color}" stop-opacity=".75"/><stop offset="1" stop-color="${c.discharge_color}" stop-opacity=".05"/></linearGradient>
        </defs>
        ${g}
        <text x="${L + 6}" y="${T + 10}" class="side" style="fill:${c.charge_color}">▲ ${this._t("charge")}</text>
        <text x="${L + 6}" y="${H - B - 5}" class="side" style="fill:${c.discharge_color}">▼ ${this._t("discharge")}</text>
        ${shape(ca, 1, "gc", c.charge_color)}
        ${shape(da, -1, "gd", c.discharge_color)}
        ${compare ? thin(compare.charge, 1, c.charge_color, "cmp") + thin(compare.discharge, -1, c.discharge_color, "cmp") : ""}
        ${s.pv ? thin(s.pv.avg, 1, c.pv_color, "pvl") : ""}
        ${s.gridIn ? thin(s.gridIn.avg, -1, c.grid_color, "grl") + thin(s.gridOut.avg, 1, c.grid_color, "grl out") : ""}
        ${soc}${nowL}
        ${marker(s.charge, ca, 1, c.charge_color)}
        ${marker(s.discharge, da, -1, c.discharge_color)}
        <line id="cursor" x1="0" x2="0" y1="${T}" y2="${H - B}" class="cursor"/>
        <rect id="hit" x="${L}" y="${T}" width="${iw}" height="${ih}" fill="transparent"/>
      </svg>`;
  }

  /* ---------- Wochen-/Monatsdiagramm */

  _svgPeriod(d, height) {
    const c = this._config;
    const W = 640, H = height + 10, L = 38, R = 12, T = 16, B = 22;
    const iw = W - L - R, ih = H - T - B, mid = T + ih / 2;
    const n = d.r.days.length;
    const now = Date.now();
    this._geo = { W, L, iw, n, kind: "period", d };
    const maxV = Math.max(0.5, ...d.dayC, ...d.dayD) * 1.12;
    const step = maxV > 40 ? 20 : maxV > 20 ? 10 : maxV > 10 ? 5 : maxV > 4 ? 2 : 1;
    const top = Math.ceil(maxV / step) * step;
    const y = (v, sg) => mid - sg * (v / top) * (ih / 2);
    const bw = (iw / n) * (n > 10 ? 0.7 : 0.55);
    let g = "";
    for (let v = step; v <= top + 1e-9; v += step) {
      for (const sg of [1, -1]) {
        if (c.show_grid) g += `<line x1="${L}" x2="${W - R}" y1="${y(v, sg)}" y2="${y(v, sg)}" class="g"/>`;
        g += `<text x="${L - 6}" y="${y(v, sg) + 3}" class="ax" text-anchor="end">${v}</text>`;
      }
    }
    g += `<line x1="${L}" x2="${W - R}" y1="${mid}" y2="${mid}" class="zero"/><text x="${L - 6}" y="${mid + 3}" class="ax" text-anchor="end">0</text>`;
    g += `<text x="${L - 6}" y="${T - 7}" class="ax unit" text-anchor="end">kWh</text>`;
    let bars = "";
    d.r.days.forEach((ds, i) => {
      const cx = L + ((i + 0.5) / n) * iw;
      const isToday = ds === dayStartOf(now);
      const label = this._view === "week" ? this._t("weekdays")[i] : [0, 4, 9, 14, 19, 24, 29].includes(i) ? String(i + 1) : "";
      if (label) g += `<text x="${cx}" y="${H - 6}" class="ax${isToday ? " nowt" : ""}" text-anchor="middle">${label}</text>`;
      if (ds > now) return;
      const hc = Math.abs(y(d.dayC[i], 1) - mid), hd = Math.abs(y(d.dayD[i], -1) - mid);
      if (hc > 0.3) bars += `<rect x="${cx - bw / 2}" y="${mid - hc}" width="${bw}" height="${hc}" rx="3" fill="${c.charge_color}" fill-opacity="${d.bestC.t === ds ? 1 : 0.65}"/>`;
      if (hd > 0.3) bars += `<rect x="${cx - bw / 2}" y="${mid}" width="${bw}" height="${hd}" rx="3" fill="${c.discharge_color}" fill-opacity="${d.bestD.t === ds ? 1 : 0.65}"/>`;
      if (isToday && c.show_now_line) bars += `<rect x="${cx - bw / 2 - 2}" y="${T}" width="${bw + 4}" height="${ih}" rx="4" class="todaybox"/>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" id="svg" style="height:${height}px" class="clickable">
      ${g}
      <text x="${L + 6}" y="${T + 10}" class="side" style="fill:${c.charge_color}">▲ ${this._t("charge")}</text>
      <text x="${L + 6}" y="${H - B - 5}" class="side" style="fill:${c.discharge_color}">▼ ${this._t("discharge")}</text>
      ${bars}
      <line id="cursor" x1="0" x2="0" y1="${T}" y2="${H - B}" class="cursor"/>
      <rect id="hit" x="${L}" y="${T}" width="${iw}" height="${ih}" fill="transparent"/>
    </svg>`;
  }

  /* ---------- Heatmaps */

  _heat(d) {
    const st = this._config.heatmap_style;
    if (st === "net") return this._heatNet(d);
    if (st === "clock") return this._heatClock(d);
    return this._heatRows(d);
  }

  _hourAxis(indent) {
    return `<div class="hax${indent ? " indent" : ""}">${Array.from({ length: 24 }, (_, h) => `<span>${h % 3 === 0 ? pad(h) : ""}</span>`).join("")}</div>`;
  }

  _hourTitle(h, ch, dis) {
    return `${this._hourRange(h)} · ▲ ${this._kwh(ch)} kWh · ▼ ${this._kwh(dis)} kWh`;
  }

  _heatRows(d) {
    const c = this._config;
    const ch = d.charge.hourly, dis = d.discharge.hourly;
    const row = (arr, color, label) => {
      const max = Math.max(...arr, 0.001);
      return `<div class="hrow"><span class="hl" style="color:${color}">${label}</span><div class="cells">${arr
        .map((e, h) => `<div class="cell" style="background:${alpha(color, e > 0.005 ? 0.12 + 0.88 * (e / max) : 0.05)}" title="${this._hourTitle(h, ch[h], dis[h])}"></div>`)
        .join("")}</div></div>`;
    };
    return `<div class="heat">${row(ch, c.charge_color, this._t("charge"))}${row(dis, c.discharge_color, this._t("dis_short"))}${this._hourAxis(true)}</div>`;
  }

  _heatNet(d) {
    const c = this._config;
    const ch = d.charge.hourly, dis = d.discharge.hourly;
    const max = Math.max(...ch.map((e, h) => Math.abs(e - dis[h])), 0.001);
    const cells = ch
      .map((e, h) => {
        const net = e - dis[h];
        const col = net >= 0 ? c.charge_color : c.discharge_color;
        const a = Math.abs(net) > 0.005 ? 0.15 + 0.85 * (Math.abs(net) / max) : 0.05;
        return `<div class="cell net" style="background:${alpha(col, a)}" title="${this._hourTitle(h, e, dis[h])} · ${this._t("net")} ${net >= 0 ? "+" : "−"}${this._kwh(Math.abs(net))} kWh"></div>`;
      })
      .join("");
    return `<div class="heat">
      <div class="netlegend"><span style="color:${c.charge_color}">■ ${this._t("more_charged")}</span><span style="color:${c.discharge_color}">■ ${this._t("more_discharged")}</span></div>
      <div class="cells">${cells}</div>${this._hourAxis(false)}</div>`;
  }

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
      const t = `<title>${this._hourTitle(h, ch[h], dis[h])}</title>`;
      s += `<path d="${arc(86, 114, a0, a1)}" fill="${alpha(c.charge_color, ch[h] > 0.005 ? 0.12 + 0.88 * (ch[h] / mc) : 0.06)}">${t}</path>`;
      s += `<path d="${arc(55, 83, a0, a1)}" fill="${alpha(c.discharge_color, dis[h] > 0.005 ? 0.12 + 0.88 * (dis[h] / md) : 0.06)}">${t}</path>`;
    }
    for (const h of [0, 6, 12, 18]) {
      const [x, y] = P(44, (h / 24) * 2 * Math.PI);
      s += `<text x="${x}" y="${y + 3}" class="ax" text-anchor="middle">${pad(h)}</text>`;
    }
    if (d.r.isCurrent) {
      const a = ((Date.now() - d.start) / DAY_MS) * 2 * Math.PI;
      const [x1, y1] = P(52, a), [x2, y2] = P(118, a);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="now"/>`;
    }
    s += `<text x="${cx}" y="${cy - 3}" text-anchor="middle" class="ctot" style="fill:${c.charge_color}">▲ ${this._kwh(d.charge.total)}</text>`;
    s += `<text x="${cx}" y="${cy + 16}" text-anchor="middle" class="ctot" style="fill:${c.discharge_color}">▼ ${this._kwh(d.discharge.total)}</text>`;
    return `<div class="heat clock"><svg viewBox="0 0 ${S} ${S}" class="clocksvg">${s}</svg>
      <div class="clocklegend"><span><i style="background:${c.charge_color}"></i>${this._t("outer_charge")}</span>
      <span><i style="background:${c.discharge_color}"></i>${this._t("inner_discharge")}</span><span class="muted">${this._t("center_sum")}</span></div></div>`;
  }

  /** Woche/Monat: Wochentag × Stunde, Farbe = Netto */
  _heatWeek(d) {
    const c = this._config;
    let max = 0.001;
    d.W.forEach((w) => w.c.forEach((v, h) => (max = Math.max(max, Math.abs(v - w.d[h])))));
    const rows = d.W.map((w, i) => {
      const cells = w.c
        .map((v, h) => {
          if (!w.n) return `<div class="cell" style="background:${alpha("var(--secondary-text-color)", 0.06)}"></div>`;
          const net = v - w.d[h];
          const col = net >= 0 ? c.charge_color : c.discharge_color;
          const a = Math.abs(net) > 0.005 ? 0.12 + 0.88 * (Math.abs(net) / max) : 0.05;
          return `<div class="cell" style="background:${alpha(col, a)}" title="${this._t("weekdays")[i]} ${this._hourRange(h)} · ${this._view === "month" ? this._t("avg_short") + " " : ""}▲ ${this._kwh(v)} · ▼ ${this._kwh(w.d[h])} kWh"></div>`;
        })
        .join("");
      return `<div class="hrow"><span class="hl wd">${this._t("weekdays")[i]}</span><div class="cells">${cells}</div></div>`;
    }).join("");
    return `<div class="heat week">
      <div class="netlegend"><span class="muted">${this._t("pattern")}</span><span style="color:${c.charge_color}">■ ${this._t("more_charged")}</span><span style="color:${c.discharge_color}">■ ${this._t("more_discharged")}</span></div>
      ${rows}${this._hourAxis(true)}</div>`;
  }

  _topHours(label, hourly, color) {
    const top = hourly
      .map((e, h) => ({ e, h }))
      .filter((x) => x.e > 0.005)
      .sort((a, b) => b.e - a.e)
      .slice(0, this._config.top_count);
    return this._topList(label, top.map((x) => ({ label: this._hourRange(x.h), e: x.e })), color);
  }

  _topDays(label, arr, days, color) {
    const top = arr
      .map((e, i) => ({ e, i }))
      .filter((x) => x.e > 0.005)
      .sort((a, b) => b.e - a.e)
      .slice(0, this._config.top_count);
    return this._topList(label, top.map((x) => ({ label: this._dateShort(days[x.i]), e: x.e, day: days[x.i] })), color);
  }

  _topList(label, items, color) {
    const chips = items.length
      ? items
          .map((x, i) => `<span class="chip${x.day ? " click" : ""}" style="--c:${color}" ${x.day ? `data-day="${x.day}"` : ""}><b>${i + 1}</b>${x.label}<em>${this._kwh(x.e)} kWh</em></span>`)
          .join("")
      : `<span class="none">${this._t("no_activity")}</span>`;
    return `<div class="top"><div class="tl">${label}</div><div class="chips">${chips}</div></div>`;
  }

  /* ------------------------------------------------------------ Interaktion */

  _bind() {
    const root = this.shadowRoot;
    root.querySelectorAll("[data-act]").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const a = b.dataset.act;
        if (a === "prev") this._shift(1);
        else if (a === "next") this._shift(-1);
        else if (a === "unzoom") {
          this._zoom = null;
          this._render();
        }
      })
    );
    root.querySelectorAll("[data-view]").forEach((b) =>
      b.addEventListener("click", () => {
        if (this._view === b.dataset.view) return;
        this._view = b.dataset.view;
        this._offset = 0;
        this._reload();
      })
    );
    root.querySelectorAll("[data-bat]").forEach((b) =>
      b.addEventListener("click", () => {
        this._sel = Number(b.dataset.bat);
        this._reload();
      })
    );
    root.querySelectorAll("[data-entity]").forEach((el) =>
      el.addEventListener("click", () => {
        this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: el.dataset.entity }, bubbles: true, composed: true }));
      })
    );
    root.querySelectorAll("[data-day]").forEach((el) => el.addEventListener("click", () => this._openDay(Number(el.dataset.day))));
    this._bindChart();
  }

  _openDay(ds) {
    this._view = "day";
    this._offset = Math.max(0, Math.round((dayStartOf(Date.now()) - ds) / DAY_MS));
    this._reload();
  }

  _reload() {
    this._data = null;
    this._zoom = null;
    this._render();
    this._fetch();
  }

  _shift(delta) {
    this._offset = Math.max(0, this._offset + delta);
    this._reload();
  }

  _bindChart() {
    const root = this.shadowRoot;
    const svg = root.getElementById("svg");
    const hit = root.getElementById("hit");
    const tip = root.getElementById("tip");
    const cur = root.getElementById("cursor");
    const geo = this._geo;
    if (!svg || !hit || !tip || !geo) return;
    const c = this._config;
    const idxAt = (ev) => {
      const r = svg.getBoundingClientRect();
      const pt = ev.touches?.[0] || ev.changedTouches?.[0] || ev;
      const px = (pt.clientX - r.left) * (geo.W / r.width);
      const frac = (px - geo.L) / geo.iw;
      return { i: Math.max(0, Math.min(geo.n - 1, Math.floor(frac * geo.n))), r, frac };
    };
    const leave = () => {
      tip.style.opacity = 0;
      cur.style.opacity = 0;
    };
    const dot = (col) => `<i style="background:${col}"></i>`;
    const move = (ev) => {
      const { i, r } = idxAt(ev);
      let html = "";
      if (geo.kind === "day") {
        const s = geo.s;
        const cv = s.charge.avg[i], dv = s.discharge.avg[i];
        if (cv === null && dv === null && !geo.compare) return leave();
        const t0 = s.start + i * s.bucketMs;
        html = `<div class="tt">${fmtTime(t0)}–${fmtTime(t0 + s.bucketMs)}</div>`;
        if (cv !== null || dv !== null) {
          html += `<div>${dot(c.charge_color)}${this._t("charge")} <b>${this._kw(cv || 0)} kW</b></div>
            <div>${dot(c.discharge_color)}${this._t("discharge")} <b>${this._kw(dv || 0)} kW</b></div>`;
        }
        if (s.pv && s.pv.avg[i] !== null) html += `<div>${dot(c.pv_color)}${this._t("pv")} <b>${this._kw(s.pv.avg[i])} kW</b></div>`;
        if (s.gridIn && s.gridIn.avg[i] !== null) {
          const gi = s.gridIn.avg[i], go = s.gridOut.avg[i];
          html += `<div>${dot(c.grid_color)}${gi >= go ? this._t("grid_in") : this._t("grid_out")} <b>${this._kw(Math.max(gi, go))} kW</b></div>`;
        }
        if (geo.compare) html += `<div class="muted">${esc(geo.compare.label)}: ▲ ${this._kw(geo.compare.charge[i])} · ▼ ${this._kw(geo.compare.discharge[i])} kW</div>`;
        if (s.soc && s.soc.length) {
          let sv = null;
          for (const p of s.soc) if (p.t <= t0 + s.bucketMs / 2) sv = p.v;
          if (sv !== null) html += `<div>${dot(c.soc_color)}SoC <b>${Math.round(sv)} %</b></div>`;
        }
      } else {
        const d = geo.d;
        const ds = d.r.days[i];
        if (ds > Date.now()) return leave();
        html = `<div class="tt">${this._dateShort(ds)}</div>
          <div>${dot(c.charge_color)}${this._t("charged")} <b>${this._kwh(d.dayC[i])} kWh</b></div>
          <div>${dot(c.discharge_color)}${this._t("discharged")} <b>${this._kwh(d.dayD[i])} kWh</b></div>`;
      }
      const cx = geo.L + ((i + 0.5) / geo.n) * geo.iw;
      cur.setAttribute("x1", cx);
      cur.setAttribute("x2", cx);
      cur.style.opacity = 1;
      tip.innerHTML = html;
      tip.style.opacity = 1;
      const rel = (cx / geo.W) * r.width;
      tip.style.left = `${Math.min(Math.max(rel, 90), r.width - 90)}px`;
    };
    hit.addEventListener("mousemove", move);
    hit.addEventListener("touchmove", move, { passive: true });
    hit.addEventListener("touchstart", move, { passive: true });
    hit.addEventListener("mouseleave", leave);
    hit.addEventListener("click", (ev) => {
      if (geo.kind === "period") {
        const { i } = idxAt(ev);
        const ds = geo.d.r.days[i];
        if (ds <= Date.now()) this._openDay(ds);
        return;
      }
      if (geo.zoomed || !c.zoom_on_click || !this._data) return;
      const { frac } = idxAt(ev);
      const r = this._data.r;
      const t = r.start + Math.max(0, Math.min(1, frac)) * DAY_MS;
      const span = 2 * HOUR_MS;
      const q = 15 * 60 * 1000;
      const start = Math.max(r.start, Math.min(r.start + DAY_MS - span, Math.round((t - span / 2) / q) * q));
      this._zoom = { start, end: start + span };
      this._render();
    });
  }

  /* ------------------------------------------------------------ Styles */

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
      ha-card { display:block; padding:16px 16px 14px; overflow:hidden; height:100%; box-sizing:border-box; container-type:inline-size; }
      .head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; gap:8px; }
      .title { display:flex; align-items:center; gap:8px; font-size:1.1rem; font-weight:600; color:var(--primary-text-color); min-width:0; }
      .title span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .title ha-icon { color:var(--bdc-charge); --mdc-icon-size:24px; flex:none; }
      .nav { display:flex; align-items:center; gap:4px; font-size:.85rem; color:var(--secondary-text-color); flex:none; }
      .nb { background:var(--secondary-background-color, rgba(127,127,127,.12)); border:none; color:var(--primary-text-color);
        width:26px; height:26px; border-radius:8px; cursor:pointer; font-size:1.1rem; line-height:1; }
      .nb:disabled { opacity:.3; cursor:default; }
      .date { min-width:72px; text-align:center; font-weight:500; white-space:nowrap; }
      .bar { display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
      .seg { display:inline-flex; background:var(--secondary-background-color, rgba(127,127,127,.12)); border-radius:9px; padding:2px; gap:2px; flex-wrap:wrap; }
      .seg button { border:none; background:none; color:var(--secondary-text-color); font:inherit; font-size:.78rem; font-weight:600;
        padding:4px 10px; border-radius:7px; cursor:pointer; }
      .seg button.on { background:var(--card-background-color, #fff); color:var(--primary-text-color); box-shadow:0 1px 3px rgba(0,0,0,.18); }
      .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:10px; }
      @container (max-width:480px){ .stats{ grid-template-columns:repeat(2,1fr);} .tops{ grid-template-columns:1fr; } }
      .stat { padding:9px 10px 8px; border-radius:12px; min-width:0;
        background:linear-gradient(135deg, color-mix(in srgb, var(--c) 16%, transparent), color-mix(in srgb, var(--c) 4%, transparent));
        border:1px solid color-mix(in srgb, var(--c) 25%, transparent); }
      .click { cursor:pointer; }
      .stat.click:hover { border-color:color-mix(in srgb, var(--c) 60%, transparent); }
      .lbl { font-size:.68rem; color:var(--secondary-text-color); text-transform:uppercase; letter-spacing:.02em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      @container (max-width:540px){ .lbl{ text-transform:none; letter-spacing:0; font-size:.72rem; } }
      .arr { color:var(--c); margin-right:4px; }
      .val { font-size:1.35rem; font-weight:700; color:var(--primary-text-color); font-variant-numeric:tabular-nums; }
      .val small { font-size:.75rem; font-weight:500; margin-left:3px; color:var(--secondary-text-color); }
      .sub { font-size:.72rem; color:var(--c); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .compact .stat { padding:6px 8px; } .compact .val { font-size:1.1rem; } .compact .stats { margin-bottom:8px; }
      .status, .insights { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
      .sgroup { display:flex; gap:6px; flex-wrap:wrap; align-items:stretch; }
      .bn { align-self:center; font-size:.72rem; font-weight:700; color:var(--secondary-text-color); margin-right:2px; }
      .chipi, .ins { display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:10px;
        background:var(--secondary-background-color, rgba(127,127,127,.1)); font-size:.8rem; color:var(--primary-text-color); min-width:0; }
      .chipi:hover { outline:1px solid var(--divider-color, rgba(127,127,127,.3)); }
      .chipi ha-icon, .ins ha-icon { --mdc-icon-size:20px; color:var(--secondary-text-color); flex:none; }
      .chipi b, .ins b { font-weight:700; font-variant-numeric:tabular-nums; display:block; white-space:nowrap; }
      .chipi small, .ins small { display:block; font-size:.68rem; color:var(--secondary-text-color); white-space:nowrap; }
      .ins.discharge ha-icon { color:var(--bdc-dis); } .ins.charge ha-icon { color:var(--bdc-charge); } .ins.money ha-icon { color:#e7b416; }
      .socbar { width:64px; height:5px; border-radius:3px; background:color-mix(in srgb, var(--secondary-text-color) 20%, transparent); margin:3px 0 2px; overflow:hidden; }
      .socbar i { display:block; height:100%; border-radius:3px; }
      .chart { position:relative; }
      svg#svg { width:100%; display:block; overflow:visible; }
      svg.zoomable #hit { cursor:zoom-in; } svg.clickable #hit { cursor:pointer; }
      .zoomx { position:absolute; right:40px; top:-6px; border:none; border-radius:8px; padding:3px 8px; font:inherit; font-size:.72rem; font-weight:600;
        background:var(--secondary-background-color, rgba(127,127,127,.15)); color:var(--primary-text-color); cursor:pointer; z-index:3; }
      .g { stroke:var(--divider-color, rgba(127,127,127,.2)); stroke-width:1; stroke-dasharray:2 4; vector-effect:non-scaling-stroke; }
      .zero { stroke:var(--secondary-text-color); stroke-opacity:.5; stroke-width:1; vector-effect:non-scaling-stroke; }
      .ax { font-size:10px; fill:var(--secondary-text-color); }
      .unit { font-weight:600; }
      .socax { fill:var(--bdc-soc); }
      .side { font-size:10px; font-weight:700; letter-spacing:.05em; opacity:.85; }
      .now { stroke:var(--bdc-now); stroke-width:1.5; stroke-dasharray:3 3; vector-effect:non-scaling-stroke; }
      .nowt { fill:var(--bdc-now); font-weight:600; }
      .todaybox { fill:none; stroke:var(--bdc-now); stroke-width:1; stroke-dasharray:3 3; vector-effect:non-scaling-stroke; }
      .soc { fill:none; stroke:var(--bdc-soc); stroke-width:1.5; stroke-dasharray:4 3; opacity:.9; vector-effect:non-scaling-stroke; }
      .cmp { fill:none; stroke-width:1.4; stroke-dasharray:5 4; opacity:.6; vector-effect:non-scaling-stroke; }
      .pvl { fill:none; stroke-width:1.6; opacity:.95; vector-effect:non-scaling-stroke; }
      .grl { fill:none; stroke-width:1.4; stroke-dasharray:6 3; opacity:.9; vector-effect:non-scaling-stroke; }
      .grl.out { stroke-dasharray:1 3; }
      .dot { stroke:var(--card-background-color, var(--ha-card-background,#fff)); stroke-width:1.5; }
      .pk { font-size:10.5px; font-weight:700; paint-order:stroke; stroke:var(--card-background-color, var(--ha-card-background,#fff)); stroke-width:3px; }
      .pulse { animation:pulse 2s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
      @keyframes pulse { 0%,100%{ transform:scale(.7); opacity:.9;} 50%{ transform:scale(1.4); opacity:.2;} }
      .cursor { stroke:var(--primary-text-color); stroke-opacity:.35; stroke-width:1; opacity:0; vector-effect:non-scaling-stroke; pointer-events:none; }
      .tip { position:absolute; top:4px; transform:translateX(-50%); pointer-events:none; opacity:0; transition:opacity .12s;
        background:var(--card-background-color, var(--ha-card-background,#fff)); color:var(--primary-text-color);
        border:1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius:10px; padding:6px 9px; font-size:.75rem;
        box-shadow:0 4px 14px rgba(0,0,0,.18); white-space:nowrap; z-index:2; }
      .tip .tt { font-weight:700; margin-bottom:2px; }
      .tip i { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:5px; }
      .muted { color:var(--secondary-text-color); }
      .legend { display:flex; flex-wrap:wrap; gap:12px; font-size:.7rem; color:var(--secondary-text-color); margin:2px 0 4px 38px; }
      .legend .ln { display:inline-block; width:16px; border-top:2px solid; margin-right:5px; vertical-align:middle; }
      .legend .ln.dash { border-top-style:dashed; }
      .heat { margin:8px 0 4px; display:flex; flex-direction:column; gap:3px; }
      .hrow { display:flex; align-items:center; gap:6px; }
      .hl { width:36px; font-size:.68rem; font-weight:700; text-align:right; flex:none; }
      .hl.wd { color:var(--secondary-text-color); }
      .cells { flex:1; display:grid; grid-template-columns:repeat(24,1fr); gap:2px; }
      .cell { height:12px; border-radius:3px; }
      .heat.week .cell { height:11px; }
      .cell.net { height:20px; border-radius:4px; }
      .hax { display:grid; grid-template-columns:repeat(24,1fr); font-size:9.5px; color:var(--secondary-text-color); margin-top:2px; }
      .hax span { text-align:left; transform:translateX(-30%); }
      .hax.indent { margin-left:42px; }
      .netlegend { display:flex; gap:14px; font-size:.7rem; font-weight:600; margin-bottom:4px; flex-wrap:wrap; }
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
      .chip.click:hover { background:color-mix(in srgb, var(--c) 18%, transparent); }
      .chip b { width:18px; height:18px; border-radius:50%; background:var(--c); color:#fff; font-size:.7rem; flex:none;
        display:inline-flex; align-items:center; justify-content:center; }
      .chip em { margin-left:auto; font-style:normal; font-weight:700; color:var(--c); font-variant-numeric:tabular-nums; }
      .none { font-size:.8rem; color:var(--secondary-text-color); }
      .msg { padding:40px 10px; text-align:center; color:var(--secondary-text-color); }
    `;
  }
}

/* ------------------------------------------------------------ Editor */

const ED = {
  de: {
    labels: {
      name: "Name der Batterie", mode: "Sensor-Art", charge_entity: "Sensor Laden", discharge_entity: "Sensor Entladen",
      power_entity: "Batterie-Leistung (mit Vorzeichen)", invert: "Vorzeichen umkehren", soc_entity: "Ladezustand (SoC)",
      soh_entity: "Gesundheit (SoH)", temp_entity: "Temperatur", capacity_kwh: "Nutzbare Kapazität", min_soc: "Entladegrenze (min. SoC)",
      unit_mode: "Sensor-Typ", pv_entity: "PV-Leistung", grid_entity: "Netz-Leistung", grid_invert: "Netz-Vorzeichen umkehren",
      price_entity: "Strompreis-Sensor", price: "Fester Strompreis", currency: "Währung",
      title: "Titel", icon: "Symbol", show_header: "Kopfzeile", show_navigation: "Blättern (‹ ›)", show_view_switch: "Tag/Woche/Monat-Umschalter",
      default_view: "Startansicht", language: "Sprache",
      chart_type: "Diagrammtyp", smooth: "Kurve glätten", chart_height: "Diagrammhöhe", bucket_minutes: "Auflösung", y_max: "Feste Skala (0 = auto)",
      compare: "Vergleichslinie", show_pv: "PV-Linie", show_grid_power: "Netz-Linie", show_peaks: "Spitzen markieren", animate_peaks: "Spitzen animieren",
      show_now_line: "„jetzt“-Linie", show_grid: "Gitterlinien", show_soc: "SoC-Linie", zoom_on_click: "Zoom per Klick",
      layout: "Layout", show_stats: "Kennzahlen", show_status: "Batterie-Status", show_insights: "Auswertung",
      show_heatmap: "Heatmap", heatmap_style: "Heatmap-Stil", show_top: "Top-Stunden/-Tage", top_count: "Anzahl Top-Einträge",
      theme: "Farbschema", charge_color: "Laden", discharge_color: "Entladen", soc_color: "SoC", now_color: "„jetzt“-Linie", pv_color: "PV", grid_color: "Netz",
      refresh_minutes: "Aktualisierung",
    },
    helpers: {
      capacity_kwh: "Für Zyklen, Wirkungsgrad mit SoC-Korrektur und Prognose.",
      min_soc: "Bis zu diesem SoC rechnet die Prognose „reicht bis“.",
      power_entity: "Positiv = Laden, negativ = Entladen (umkehrbar).",
      grid_entity: "Positiv = Netzbezug, negativ = Einspeisung (umkehrbar).",
      price_entity: "Wird stündlich gemittelt – ideal für dynamische Tarife.",
      price: "Pro kWh – hat Vorrang vor dem Preis-Sensor, wenn > 0.",
      compare: "Nutzt die Kurzzeit-Statistik von Home Assistant.",
      unit_mode: "Automatisch erkennt W/kW (Leistung) und Wh/kWh (Zähler).",
      theme: "Dunkel/Hell gilt nur für diese Karte.",
      show_status: "SoC, Gesundheit (SoH) und Temperatur.",
      show_insights: "Wirkungsgrad, Zyklen, Ersparnis, Prognose.",
    },
    sections: { sensors: "Batterie", battery2: "Zweite Batterie (optional)", extra: "PV, Netz & Preis", header: "Kopfzeile & Ansicht", chart: "Diagramm", sections: "Bereiche", colors: "Farben", advanced: "Erweitert" },
    opts: {
      separate: "Zwei Sensoren (Laden + Entladen)", combined: "Ein Sensor mit Vorzeichen (+/−)",
      auto: "Automatisch", power: "Leistung (W / kW)", energy: "Energiezähler (Wh / kWh)",
      day: "Tag", week: "Woche", month: "Monat", de: "Deutsch", en: "English",
      area: "Fläche", bars: "Balken", none: "Keine", yesterday: "Gestern", avg7: "Ø der letzten 7 Tage",
      full: "Vollständig", compact: "Kompakt", rows: "Zwei Kachelreihen", net: "Netto-Band", clock: "Tagesuhr (24-h-Ring)",
      dark: "Dunkel", light: "Hell", theme_auto: "Automatisch (HA-Theme)", lang_auto: "Automatisch (HA-Sprache)",
    },
  },
  en: {
    labels: {
      name: "Battery name", mode: "Sensor type", charge_entity: "Charge sensor", discharge_entity: "Discharge sensor",
      power_entity: "Battery power (signed)", invert: "Invert sign", soc_entity: "State of charge (SoC)",
      soh_entity: "State of health (SoH)", temp_entity: "Temperature", capacity_kwh: "Usable capacity", min_soc: "Discharge limit (min SoC)",
      unit_mode: "Measurement", pv_entity: "PV power", grid_entity: "Grid power", grid_invert: "Invert grid sign",
      price_entity: "Electricity price sensor", price: "Fixed electricity price", currency: "Currency",
      title: "Title", icon: "Icon", show_header: "Header", show_navigation: "Navigation (‹ ›)", show_view_switch: "Day/week/month switch",
      default_view: "Default view", language: "Language",
      chart_type: "Chart type", smooth: "Smooth curve", chart_height: "Chart height", bucket_minutes: "Resolution", y_max: "Fixed scale (0 = auto)",
      compare: "Comparison line", show_pv: "PV line", show_grid_power: "Grid line", show_peaks: "Mark peaks", animate_peaks: "Animate peaks",
      show_now_line: "\"now\" line", show_grid: "Grid lines", show_soc: "SoC line", zoom_on_click: "Click to zoom",
      layout: "Layout", show_stats: "Key figures", show_status: "Battery status", show_insights: "Insights",
      show_heatmap: "Heatmap", heatmap_style: "Heatmap style", show_top: "Top hours/days", top_count: "Number of top entries",
      theme: "Color scheme", charge_color: "Charge", discharge_color: "Discharge", soc_color: "SoC", now_color: "\"now\" line", pv_color: "PV", grid_color: "Grid",
      refresh_minutes: "Refresh interval",
    },
    helpers: {
      capacity_kwh: "Used for cycles, SoC-corrected efficiency and forecast.",
      min_soc: "The \"lasts until\" forecast counts down to this SoC.",
      power_entity: "Positive = charging, negative = discharging (invertible).",
      grid_entity: "Positive = import, negative = export (invertible).",
      price_entity: "Averaged per hour – great for dynamic tariffs.",
      price: "Per kWh – takes precedence over the price sensor if > 0.",
      compare: "Uses Home Assistant short-term statistics.",
      unit_mode: "Auto detects W/kW (power) and Wh/kWh (energy meter).",
      theme: "Dark/light only applies to this card.",
      show_status: "SoC, state of health (SoH) and temperature.",
      show_insights: "Efficiency, cycles, savings, forecast.",
    },
    sections: { sensors: "Battery", battery2: "Second battery (optional)", extra: "PV, grid & price", header: "Header & view", chart: "Chart", sections: "Sections", colors: "Colors", advanced: "Advanced" },
    opts: {
      separate: "Two sensors (charge + discharge)", combined: "One signed sensor (+/−)",
      auto: "Automatic", power: "Power (W / kW)", energy: "Energy meter (Wh / kWh)",
      day: "Day", week: "Week", month: "Month", de: "Deutsch", en: "English",
      area: "Area", bars: "Bars", none: "None", yesterday: "Yesterday", avg7: "Ø last 7 days",
      full: "Full", compact: "Compact", rows: "Two tile rows", net: "Net band", clock: "Day clock (24 h ring)",
      dark: "Dark", light: "Light", theme_auto: "Automatic (HA theme)", lang_auto: "Automatic (HA language)",
    },
  },
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

  _l() {
    const l = this._config?.language;
    if (l === "de" || l === "en") return ED[l];
    const h = (this._hass?.locale?.language || this._hass?.language || "de").toLowerCase();
    return h.startsWith("de") ? ED.de : ED.en;
  }

  _schema(cfg) {
    const L = this._l();
    const o = L.opts;
    const sel = (pairs) => ({ select: { mode: "dropdown", options: pairs.map(([value, label]) => ({ value, label })) } });
    const ent = { entity: { domain: "sensor" } };
    const bool = { boolean: {} };
    const grid = (schema) => ({ name: "", type: "grid", schema });
    const sec = (name, icon, schema, expanded = false) => ({ name, type: "expandable", flatten: true, expanded, title: L.sections[name], icon, schema });
    const batFields = (p, mode) => [
      { name: `${p}name`, selector: { text: {} } },
      { name: `${p}mode`, selector: sel([["separate", o.separate], ["combined", o.combined]]) },
      ...(mode === "combined"
        ? [{ name: `${p}power_entity`, required: !p, selector: ent }, { name: `${p}invert`, selector: bool }]
        : [
            { name: `${p}charge_entity`, required: !p, selector: ent },
            { name: `${p}discharge_entity`, required: !p, selector: ent },
          ]),
      { name: `${p}soc_entity`, selector: ent },
      grid([
        { name: `${p}soh_entity`, selector: ent },
        { name: `${p}temp_entity`, selector: ent },
      ]),
      grid([
        { name: `${p}capacity_kwh`, selector: { number: { min: 0, max: 200, step: 0.1, mode: "box", unit_of_measurement: "kWh" } } },
        { name: `${p}min_soc`, selector: { number: { min: 0, max: 50, step: 1, mode: "box", unit_of_measurement: "%" } } },
      ]),
    ];
    return [
      sec("sensors", "mdi:home-battery", [...batFields("", cfg.mode), { name: "unit_mode", selector: sel([["auto", o.auto], ["power", o.power], ["energy", o.energy]]) }], true),
      sec("battery2", "mdi:battery-plus-variant", batFields("b2_", cfg.b2_mode || "separate")),
      sec("extra", "mdi:solar-power-variant", [
        { name: "pv_entity", selector: ent },
        { name: "grid_entity", selector: ent },
        { name: "grid_invert", selector: bool },
        { name: "price_entity", selector: ent },
        grid([
          { name: "price", selector: { number: { min: 0, max: 5, step: 0.001, mode: "box" } } },
          { name: "currency", selector: { text: {} } },
        ]),
      ]),
      sec("header", "mdi:page-layout-header", [
        { name: "title", selector: { text: {} } },
        { name: "icon", selector: { icon: {} } },
        grid([
          { name: "default_view", selector: sel([["day", o.day], ["week", o.week], ["month", o.month]]) },
          { name: "language", selector: sel([["auto", o.lang_auto], ["de", o.de], ["en", o.en]]) },
        ]),
        grid([
          { name: "show_header", selector: bool },
          { name: "show_navigation", selector: bool },
          { name: "show_view_switch", selector: bool },
        ]),
      ]),
      sec("chart", "mdi:chart-areaspline", [
        grid([
          { name: "chart_type", selector: sel([["area", o.area], ["bars", o.bars]]) },
          { name: "bucket_minutes", selector: sel([["5", "5 min"], ["10", "10 min"], ["15", "15 min"], ["30", "30 min"], ["60", "60 min"]]) },
        ]),
        { name: "compare", selector: sel([["none", o.none], ["yesterday", o.yesterday], ["avg7", o.avg7]]) },
        { name: "chart_height", selector: { number: { min: 120, max: 450, step: 10, mode: "slider", unit_of_measurement: "px" } } },
        { name: "y_max", selector: { number: { min: 0, max: 50, step: 0.5, mode: "box", unit_of_measurement: "kW" } } },
        grid([
          { name: "smooth", selector: bool },
          { name: "show_grid", selector: bool },
          { name: "show_peaks", selector: bool },
          { name: "animate_peaks", selector: bool },
          { name: "show_now_line", selector: bool },
          { name: "show_soc", selector: bool },
          { name: "show_pv", selector: bool },
          { name: "show_grid_power", selector: bool },
          { name: "zoom_on_click", selector: bool },
        ]),
      ]),
      sec("sections", "mdi:view-dashboard-outline", [
        { name: "layout", selector: sel([["full", o.full], ["compact", o.compact]]) },
        grid([
          { name: "show_stats", selector: bool },
          { name: "show_status", selector: bool },
          { name: "show_insights", selector: bool },
          { name: "show_heatmap", selector: bool },
          { name: "show_top", selector: bool },
        ]),
        { name: "heatmap_style", selector: sel([["rows", o.rows], ["net", o.net], ["clock", o.clock]]) },
        { name: "top_count", selector: { number: { min: 1, max: 8, step: 1, mode: "slider" } } },
      ]),
      sec("colors", "mdi:palette", [
        { name: "theme", selector: sel([["auto", o.theme_auto], ["dark", o.dark], ["light", o.light]]) },
        grid(COLOR_KEYS.map((k) => ({ name: k, selector: { color_rgb: {} } }))),
      ]),
      sec("advanced", "mdi:cog", [{ name: "refresh_minutes", selector: { number: { min: 1, max: 60, step: 1, mode: "box", unit_of_measurement: "min" } } }]),
    ];
  }

  _formData() {
    const data = { ...DEFAULTS, ...this._config };
    data.bucket_minutes = String(data.bucket_minutes);
    for (const k of COLOR_KEYS) data[k] = hexToRgb(data[k]) ?? hexToRgb(DEFAULTS[k]);
    const b2 = (this._config.batteries || [])[0] || {};
    for (const k of BATTERY_KEYS) {
      const fallback = k === "mode" ? "separate" : k === "min_soc" ? 10 : k === "invert" ? false : undefined;
      const v = b2[k] ?? fallback;
      if (v !== undefined) data[`b2_${k}`] = v;
    }
    delete data.batteries;
    return data;
  }

  _render() {
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => this._l().labels[s.name.replace(/^b2_/, "")] ?? s.title ?? s.name;
      this._form.computeHelper = (s) => this._l().helpers[s.name.replace(/^b2_/, "")];
      this._form.addEventListener("value-changed", (ev) => this._changed(ev));
      this.appendChild(this._form);
    }
    const data = this._formData();
    this._form.hass = this._hass;
    this._form.data = data;
    this._form.schema = this._schema(data);
  }

  _changed(ev) {
    ev.stopPropagation();
    const v = { ...ev.detail.value };
    const out = { type: this._config.type || "custom:battery-day-card" };
    // zweite Batterie herauslösen
    const b2 = {};
    for (const k of BATTERY_KEYS) {
      const val = v[`b2_${k}`];
      delete v[`b2_${k}`];
      if (val === undefined || val === null || val === "") continue;
      b2[k] = val;
    }
    if (b2.mode === "combined") {
      delete b2.charge_entity;
      delete b2.discharge_entity;
    } else {
      delete b2.power_entity;
      delete b2.invert;
    }
    const keep = ["charge_entity", "discharge_entity", "power_entity"];
    for (const [k, val] of Object.entries(v)) {
      if (val === undefined || val === null || val === "" || k === "type") continue;
      let value = val;
      if (COLOR_KEYS.includes(k)) value = Array.isArray(val) ? rgbToHex(val) : val;
      if (k === "bucket_minutes") value = Number(val);
      if (value === DEFAULTS[k] && !keep.includes(k)) continue;
      out[k] = value;
    }
    if (out.mode === "combined") {
      delete out.charge_entity;
      delete out.discharge_entity;
    } else {
      delete out.power_entity;
      delete out.invert;
    }
    const rest = (this._config.batteries || []).slice(1);
    const hasB2 = b2.mode === "combined" ? !!b2.power_entity : !!(b2.charge_entity || b2.discharge_entity || b2.name);
    if (hasB2 || rest.length) {
      const clean = { ...b2 };
      if (clean.mode === "separate") delete clean.mode;
      if (clean.min_soc === 10) delete clean.min_soc;
      if (clean.invert === false) delete clean.invert;
      out.batteries = hasB2 ? [clean, ...rest] : rest;
    }
    this._config = out;
    this._render();
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: out }, bubbles: true, composed: true }));
  }
}

if (!customElements.get("battery-day-card")) {
  customElements.define("battery-day-card", BatteryDayCard);
  customElements.define("battery-day-card-editor", BatteryDayCardEditor);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "battery-day-card",
  name: "Battery Day Card",
  description: "Battery charge & discharge over day, week and month – peaks, heatmap, efficiency, cycles, savings and forecast.",
  preview: true,
  documentationURL: "https://github.com/muhkuh666/battery-day-card",
});

console.info(`%c BATTERY-DAY-CARD %c v${CARD_VERSION} `, "background:#2fd38a;color:#000;font-weight:700", "background:#ff8a3d;color:#000");
