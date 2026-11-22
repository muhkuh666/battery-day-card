## Battery Day Card 2.1 ⚡

### New / Neu
- **Live status with animation** – the battery icon shows **charging** (flowing stripes, pulsing bolt) or **discharging** (energy flowing out), **standby** when idle · **Live-Status mit Animation**: Lädt gerade / Entlädt gerade / Bereitschaft
- **Time until full / time until empty** incl. clock time ("empty in 3 h 56 min · ~15:57 · down to 10 %") · **Zeit bis voll / leer** inkl. Uhrzeit
- Updates instantly with every sensor change – no waiting for the next refresh · aktualisiert sofort bei jeder Sensoränderung
- Works with multiple batteries (total view, capacity-weighted SoC) · funktioniert auch mit mehreren Batterien
- Respects "reduce motion"; animation can be switched off · Animation abschaltbar, respektiert „Bewegung reduzieren“

### Improved / Verbessert
- Efficiency falls back to discharged ÷ charged if the SoC correction is implausible (no more > 100 %) · Wirkungsgrad ohne unplausible Werte über 100 %

New options: `show_live`, `live_animation` (both in the visual editor).

**Install:** HACS → Custom repositories → `https://github.com/muhkuh666/battery-day-card` (type **Dashboard**)

☕ Like it? [Buy me a coffee](https://buymeacoffee.com/muhkuh666)
