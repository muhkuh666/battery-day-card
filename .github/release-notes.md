## Battery Day Card 2.4 🕘🪫

### New / Neu
- **Day clock shows when the battery was empty** · **Tagesuhr zeigt, wann die Batterie leer war**
  - innermost ring: grid import per hour while the battery was empty · innerer Ring: Netzbezug je Stunde bei leerer Batterie
  - outer arc marks the empty period(s), e.g. "empty 21:40–06:15" (or "–now") · Bogen außen markiert die Leer-Zeiten, z. B. „leer 21:40–06:15“
  - centre adds ⚡ kWh from the grid; legend shows kWh and cost · Mitte zusätzlich ⚡ kWh aus dem Netz, Legende mit kWh und Kosten
- Only appears on days the battery was actually empty – otherwise the clock stays as before · erscheint nur an Tagen, an denen die Batterie leer war

Use `heatmap_style: clock` (needs `grid_entity` + `soc_entity`). · Mit `heatmap_style: clock`.

**Install:** HACS → Custom repositories → `https://github.com/muhkuh666/battery-day-card` (type **Dashboard**)

☕ Like it? [Buy me a coffee](https://buymeacoffee.com/muhkuh666)
