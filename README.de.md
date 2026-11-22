# Battery Day Card

🇬🇧 [English README](README.md) · [![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/muhkuh666)

Lovelace-Karte für Home Assistant, die zeigt, **wann und wie stark deine Hausbatterie geladen und entladen wurde** – pro Tag, Woche und Monat – mit Spitzen, Heatmaps, Wirkungsgrad, Zyklen, Ersparnis und „reicht bis“-Prognose.

![Demo](https://raw.githubusercontent.com/muhkuh666/battery-day-card/main/images/demo.gif)

## Funktionen

**Live-Status** – animierte Batterie zeigt **Lädt gerade / Entlädt gerade / Bereitschaft** mit aktueller Leistung und SoC, dazu **Zeit bis voll** bzw. **Zeit bis leer** (bis zur Entladegrenze) inkl. Uhrzeit. Aktualisiert sich sofort bei jeder Sensoränderung.

![Live](https://raw.githubusercontent.com/muhkuh666/battery-day-card/main/images/live.gif)


**Tagesansicht**
- Gespiegeltes Diagramm: Laden nach oben, Entladen nach unten – Fläche oder Balken, mit „jetzt“-Linie und markierten Spitzen
- **Vergleichslinie**: gestern oder Ø der letzten 7 Tage (gestrichelt, zeigt auch den erwarteten Rest des Tages)
- Optional **PV**- und **Netzbezug/Einspeisung**-Linien – damit siehst du, *warum* die Batterie lädt oder entlädt
- **Zoom per Klick**: 2 Stunden in Minutenauflösung
- Heatmap in drei Stilen: **Kachelreihen**, **Netto-Band** oder **Tagesuhr** (24-h-Ring)
- Stärkste Lade- und Entladestunden

**Woche & Monat**
- Tagesbalken, bester Lade-/Entladetag, Top-Tage – Klick auf einen Tag öffnet ihn
- **Muster-Heatmap** Wochentag × Stunde (wie bei GitHub)

**Batterie-Status & Auswertung**
- Ladezustand (SoC) mit Tagesspanne, **Gesundheit (SoH)**, **Temperatur** mit Tagesspanne
- **Wirkungsgrad** (SoC-korrigiert), **Vollzyklen**, **Ersparnis** (fester Preis oder Preissensor, z. B. Tibber), **Prognose** („reicht bis ca. 23:40“ / „voll um ca. 14:50“)

**Außerdem**
- **Mehrere Batterien** mit Tabs und **Gesamt**-Ansicht
- Zwei Sensoren **oder** ein Leistungssensor mit Vorzeichen; Leistung (W/kW) oder Energie (Wh/kWh) – automatisch erkannt
- **Kompakt-Layout** für Handy und Seitenleisten
- **Deutsch & Englisch**, folgt der HA-Sprache
- Farbschema **Dunkel / Hell / Automatisch**, alle Farben wählbar
- **Alles im grafischen Editor einstellbar** – Antippen von Kennzahlen oder Status-Chips öffnet die Detailansicht des Sensors

![Ansichten](https://raw.githubusercontent.com/muhkuh666/battery-day-card/main/images/views.png)
![Weitere](https://raw.githubusercontent.com/muhkuh666/battery-day-card/main/images/more.png)

## Installation

### HACS
1. HACS → ⋮ → *Benutzerdefinierte Repositories*
2. `https://github.com/muhkuh666/battery-day-card` mit Typ **Dashboard** hinzufügen
3. **Battery Day Card** installieren und Browser neu laden

### Manuell
1. `battery-day-card.js` nach `/config/www/` kopieren
2. Einstellungen → Dashboards → Ressourcen → `/local/battery-day-card.js` als **JavaScript-Modul**

## Konfiguration

Am einfachsten über den grafischen Editor: *Karte hinzufügen → Battery Day Card*. Passende Batterie-Sensoren werden automatisch gefunden.

```yaml
type: custom:battery-day-card
title: Batterie H3 6kW
charge_entity: sensor.h3_6kw_battery_charge
discharge_entity: sensor.h3_6kw_battery_discharge
soc_entity: sensor.h3_6kw_battery_soc
soh_entity: sensor.h3_6kw_battery_soh
temp_entity: sensor.h3_6kw_battery_temp
capacity_kwh: 10.4
min_soc: 10
pv_entity: sensor.pv_leistung
grid_entity: sensor.netz_leistung
price: 0.32
compare: avg7
heatmap_style: net
theme: dark
# zweite Batterie (optional)
batteries:
  - name: BKW
    mode: combined
    power_entity: sensor.bkw_batterie_leistung
    soc_entity: sensor.bkw_batterie_soc
    capacity_kwh: 2.2
```

Alle Optionen mit Standardwerten stehen in der [englischen README](README.md#options) – die Namen sind identisch, im Editor sind sie deutsch beschriftet.

## So wird gerechnet

- **Tagesansicht**: aus der Recorder-Historie; die Kurve zeigt die mittlere Leistung je Zeitabschnitt, „Max.“ den höchsten Einzelwert.
- **Woche/Monat und Vergleichslinie**: aus der Lang-/Kurzzeitstatistik von Home Assistant. Die Sensoren brauchen dafür eine `state_class` (`measurement` oder `total_increasing`) – das liefern praktisch alle Wechselrichter-Integrationen.
- **Wirkungsgrad** = (Entladen + Zunahme der gespeicherten Energie laut SoC) ÷ Geladen. Ohne Kapazität/SoC: Entladen ÷ Geladen.
- **Zyklen** = (Geladen + Entladen) ÷ 2 ÷ Kapazität.
- **Ersparnis** = entladene Energie × Strompreis der jeweiligen Stunde.
- **Zeit bis voll / leer**: aktuelle Batterieleistung, geglättet mit dem Mittel der letzten 15 Minuten, aktueller SoC und nutzbare Kapazität (bis zur Entladegrenze `min_soc`). Neue Optionen: `show_live`, `live_animation`.

## Unterstützung

Wenn dir die Karte gefällt, gib dem Repository einen ⭐ – Fehler und Ideen gerne in den [Issues](https://github.com/muhkuh666/battery-day-card/issues).

Wenn dir die Karte Geld spart, kannst du mir gern einen Kaffee spendieren ☕:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/muhkuh666)

☕ [Muhkuh666](https://buymeacoffee.com/muhkuh666)

## Lizenz

[MIT](https://raw.githubusercontent.com/muhkuh666/helios-compass-card/v1.12.0/LICENSE) © muhkuh666
