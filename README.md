# SXSW 2026 Event Picker

A browser-based tool to resolve scheduling conflicts in your SXSW calendar and export a clean, personalized schedule.

**Live app:** https://thinklikeadesigner.github.io/sxsw-event-picker/


[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/thinklikeadesigner)

---

## How to Use

### Step 1 — Get the events .ics file

The unofficial SXSW tech events spreadsheet is maintained by [Entre](https://joinentre.com). To generate the `.ics`:

1. Download the CSV from the Entre SXSW spreadsheet
2. Use the included parser script (or Claude) to convert it to `SXSW_2026_Events.ics`

### Step 2 — Load your events

Open the app and drag your `.ics` file onto the drop zone, or click to browse to it.

All events will load and be selected by default.

### Step 3 — Resolve conflicts

Events that overlap in time are grouped together under an **⚡ Conflicting events** banner. Click any event to deselect it (it will dim). Click again to re-select.

- Green border = keeping this event
- Dimmed = skipping this event
- Orange left border = this event has at least one conflict

### Step 4 — Filter and review

Use the filter bar to focus your view:

| Filter | Shows |
|--------|-------|
| All Days | Everything |
| Conflicts Only | Only time slots with overlapping events |
| Selected Only | Your current picks |
| Mar 12–18 | Events on that specific day |

### Step 5 — Export

Click **Export .ics** to download `SXSW_2026_MySchedule.ics` containing only your selected events.

Import it into any calendar app:
- **Apple Calendar:** double-click the file
- **Google Calendar:** Settings → Import
- **Outlook:** File → Open & Export → Import/Export

---

## Tips

- Start by switching to **Conflicts Only** to quickly work through the hard decisions first
- The conflict badge in the day header shows how many conflicting events remain for that day
- The stats in the top bar update live — watch the conflict count drop to 0 as you resolve them
- You can export multiple times as you change your mind — just re-import to replace

---

## Running Locally

No build step needed. Just open `index.html` in any browser.

```bash
git clone git@github.com:thinklikeadesigner/sxsw-event-picker.git
cd sxsw-event-picker
open index.html
```
