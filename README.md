# Tesla Light Show

A web application for generating custom Tesla light show files from audio.

## Quick start (local dev)

### Prerequisites

- Node.js 20+, pnpm 9+ (`npm install -g pnpm`)
- Python 3.11+
- FFmpeg on PATH

### Install & run

```bash
# Install all JS workspace dependencies
pnpm install

# Start frontend → http://localhost:3000
pnpm dev

# Start backend → http://localhost:8000  (new terminal)
cd services/api
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload
```

### Docker Compose (alternative)

```bash
docker compose up
```

## Run tests

```bash
# Backend
cd services/api && pytest

# Frontend linting + typecheck
pnpm lint && pnpm typecheck
```

## Architecture

See [docs/architecture.md](docs/architecture.md).

## Agent instructions

See [AGENTS.md](AGENTS.md).

---

## Demo shows (LightShow/)

The `LightShow/` directory contains example `.fseq` files for reference.

styles.css
app.js
```

Appen kan uploade en `.mp3` eller `.wav`, importere lyd fra en YouTube URL, analysere lydens energi og transienter, generere en Tesla-kompatibel `.fseq` med 48 kanaler og 20 ms frame interval, samt simulere showet på en 2D Tesla-model med korrekt placerede front-, bag-, side- og charge-port-lys. Brug knappen `Hent LightShow` for at downloade en ZIP med `LightShow/`-mappen, `.fseq`, lydfilen og en kort USB-vejledning.

YouTube-import kræver `yt-dlp` til Python:

```powershell
python -m pip install --user yt-dlp
```

Start appen lokalt med:

```powershell
npm start
```

Åbn derefter:

```text
http://localhost:5173
```

## Samlet Prompt

Jeg har rettighederne til sangen. Hent lyden fra https://www.youtube.com/watch?v=cesKPvyKeDk som `En stemme.mp3`, lav en Tesla Light Show-pakke ud fra den, validér den, og lav en kort README med prompten og USB/Tesla-vejledning.

## Filer

Den færdige Tesla-pakke ligger i:

```text
LightShow/
  en_stemme.fseq
  en_stemme.wav
```

Original lydfil ligger i projektmappen:

```text
En stemme.mp3
```

## Validering

Pakken er valideret med Tesla Light Show-checker:

```text
OK: en_stemme.fseq: 17961 frames, 20 ms step, 0:05:59.220000 duration, 48 channels.
OK: LightShow is structurally ready for a Tesla LightShow USB package.
```

## Sådan Lægger Du Showet På USB

1. Brug en USB-stick.
2. Formater USB-sticken som `exFAT` eller `FAT32`.
3. Sørg for at USB-roden ikke indeholder en `TeslaCam`-mappe.
4. Kopier hele mappen `LightShow` direkte til roden af USB-sticken.
5. USB-sticken skal ende med denne struktur:

```text
USB-ROD/
  LightShow/
    en_stemme.fseq
    en_stemme.wav
```

Vigtigt: Mappen skal hedde præcis `LightShow` med stort `L` og stort `S`.

## Sådan Starter Du Showet I Teslaen

1. Sæt USB-sticken i bilen.
2. Vent et par sekunder, så bilen kan læse drevet.
3. Åbn `Toybox`.
4. Vælg `Light Show`.
5. Tryk `Schedule Show`.
6. Vælg custom showet fra listen, hvis bilen viser en dropdown med brugerdefinerede shows.
7. Start eller planlæg showet.

Hvis bilen kun viser standardtitlen `Light Show` og ikke `Custom Light Show`, accepterer bilen typisk ikke USB-pakken. Tjek da:

- USB-sticken er formateret som `exFAT` eller `FAT32`.
- `LightShow` ligger i roden af USB-sticken.
- Mappen hedder præcis `LightShow`.
- `en_stemme.fseq` og `en_stemme.wav` har samme basenavn.
- USB-roden indeholder ikke `TeslaCam`.
- USB-roden indeholder ikke firmware-, map update- eller andre update-filer.

## Bemærkninger

Showet er automatisk genereret ud fra lydens energi og transienter. Det er et lysbaseret show uden bevægelige closures, så bilen åbner/lukker ikke vinduer, døre, spejle, liftgate eller charge port under afspilning.

Tesla Custom Light Show-krav er baseret på Teslas officielle `teslamotors/light-show`-projekt:

```text
https://github.com/teslamotors/light-show
```
