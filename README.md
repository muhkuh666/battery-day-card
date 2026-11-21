# Battery Day Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/docs/faq/custom_repositories)
[![Validate](https://github.com/muhkuh666/battery-day-card/actions/workflows/validate.yml/badge.svg)](https://github.com/muhkuh666/battery-day-card/actions/workflows/validate.yml)

Lovelace-Karte für Home Assistant, die zeigt, **wann und wie stark deine Hausbatterie über den Tag geladen und entladen wurde**.

![Vorschau](images/preview.png)

## Funktionen

- Gespiegeltes Tagesdiagramm: Laden nach oben, Entladen nach unten, mit „jetzt“-Linie
- Tagessummen (kWh) und Spitzenleistung mit Uhrzeit für Laden und Entladen
- Markierte Spitzen direkt im Diagramm, Tooltip beim Darüberfahren
- Stunden-Heatmap und Top-3-Stunden für Laden und Entladen
- Tage zurückblättern (‹ ›)
- Optional Ladezustand (SoC) als Linie
- Funktioniert mit Leistungs- (W/kW) und Energiesensoren (Wh/kWh)
- Komplett im grafischen Karten-Editor konfigurierbar, passt sich dem HA-Theme an

## Installation

### HACS (benutzerdefiniertes Repository)
1. HACS → ⋮ → *Benutzerdefinierte Repositories*
2. URL `https://github.com/muhkuh666/battery-day-card`, Typ **Dashboard**
3. „Battery Day Card“ installieren und den Browser neu laden

### Manuell
1. `battery-day-card.js` nach `/config/www/` kopieren
2. Einstellungen → Dashboards → Ressourcen → `/local/battery-day-card.js` als **JavaScript-Modul**

## Konfiguration

```yaml
type: custom:battery-day-card
title: Batterie H3 6kW
charge_entity: sensor.h3_6kw_battery_charge
discharge_entity: sensor.h3_6kw_battery_discharge
soc_entity: sensor.h3_6kw_battery_soc
bucket_minutes: 15
```

| Option | Standard | Beschreibung |
|---|---|---|
| `charge_entity` | – | Sensor Ladeleistung oder Ladeenergie (**Pflicht**) |
| `discharge_entity` | – | Sensor Entladeleistung oder Entladeenergie (**Pflicht**) |
| `soc_entity` | – | Ladezustand in % (optional) |
| `title` | `Batterie heute` | Titel |
| `bucket_minutes` | `15` | Auflösung des Diagramms (5/10/15/30/60) |
| `charge_color` | `#2fd38a` | Farbe Laden |
| `discharge_color` | `#ff8a3d` | Farbe Entladen |
| `soc_color` | `#7aa7ff` | Farbe SoC-Linie |
| `refresh_minutes` | `5` | Aktualisierungsintervall für den heutigen Tag |

**Hinweis:** Die Kurve zeigt die mittlere Leistung je Zeitabschnitt, die „Spitze“ ist der höchste Einzelmesswert und liegt daher meist etwas höher.

## Lizenz

MIT
