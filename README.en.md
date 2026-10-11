# Mai Chuni Score

[繁體中文](README.md) · [English](README.en.md)

Mai Score is a fully static website for searching **maimai International** songs and exact chart constants. It also supports continuous live-camera OCR for recognizing song titles.

**Live site:** <https://eric-is-here.github.io/Mai-Score/>

## Features

- Search songs by title, artist, genre, or version
- Filter by genre, version, chart type, difficulty, and exact constant
- Show all Standard/DX charts with exact internal constants
- Show chart version and note counts
- Search-result cards use official cover art as full-card backgrounds
- Live-camera OCR with continuous scanning and an inline matched-song card
- Optional image upload for offline OCR recognition
- Fully static deployment; no backend, database, or account required

## Current Dataset

- Source: [ArcadeSongs maimai](https://arcade-songs.zetaraku.dev/maimai/)
- Region: International
- Dataset update time in Hong Kong time: `2026-10-09 09:57:42` (`Asia/Hong_Kong`)
- Songs: `1,491`
- Charts: `6,128`
- Genres: `7`
- Versions: `28`
- Distinct exact constants: `87`, from `1.0` to `15.0`

Genres are kept in their official English/Japanese form:

- `maimai`
- `POPS＆アニメ`
- `ゲーム＆バラエティ`
- `niconico＆ボーカロイド`
- `東方Project`
- `オンゲキ＆CHUNITHM`
- `宴会場`

## Files

| File | Purpose |
|---|---|
| `index.html` | Complete single-file application: HTML, CSS, JavaScript, and embedded dataset |
| `maidata.js` | Standalone JavaScript dataset used as the source for the embedded data |
| `.scripts/refresh-data.mjs` | Downloads and regenerates the ArcadeSongs maimai dataset |
| `.scripts/verify-refresh.mjs` | Validates the generated dataset and embedded HTML copy |
| `.github/workflows/refresh-data.yml` | Scheduled GitHub Actions workflow for automatic dataset updates |
| `README.md` | Primary Traditional Chinese technical and usage documentation |
| `README.en.md` | English technical and usage documentation |

The deployed site only requires `index.html`. `maidata.js` remains in the repository as a convenient, reusable copy of the dataset.

## Architecture

The application is intentionally dependency-light at runtime:

- No frontend framework
- No build step
- No backend
- No database
- No server-side processing
- One external JavaScript runtime library: Tesseract.js
- Official cover images are loaded directly from ArcadeSongs' public CDN

The complete application is embedded in `index.html`, which removes cache-coherence issues between HTML, CSS, JavaScript, and data updates.

## Song Data Schema

Each song contains:

```json
{
  "title": "string",
  "artist": "string",
  "category": "official genre",
  "imageName": "cover file name",
  "version": "release version",
  "releaseDate": "YYYY-MM-DD",
  "bpm": 120,
  "sheets": []
}
```

Each sheet/chart contains:

```json
{
  "type": "std | dx | utage",
  "difficulty": "basic | advanced | expert | master | remaster",
  "level": "nominal level such as 14+",
  "levelValue": "nominal numeric mapping",
  "internalLevel": "exact constant string",
  "internalLevelValue": 14.8,
  "version": "chart version",
  "noteCounts": {
    "tap": 0,
    "hold": 0,
    "slide": 0,
    "touch": 0,
    "break": 0,
    "total": 0
  }
}
```

## Exact Chart Constants

Mai Score displays **exact internal constants**, not nominal level mappings.

The precedence is:

```js
function exactLevel(chart) {
  return chart.internalLevelValue != null
    ? Number(chart.internalLevelValue)
    : Number(chart.levelValue);
}
```

This matters because nominal `+` levels are not always `.6`, and non-plus levels are not always `.0`.

Examples:

| Nominal level | Exact constant |
|---:|---:|
| `6` | `7.5` |
| `9+` | `9.8` |
| `10+` | `10.7` |
| `12` | `12.4` |
| `14+` | `14.8` |

The level filter is built from `internalLevelValue` and includes exact values such as `7.1`, `9.8`, `13.8`, and `14.1`.

## Version Ordering

Versions are sorted by the earliest `releaseDate` among songs in each version:

```js
const firstDate = version => maidata.songs
  .filter(song => song.version === version)
  .map(song => song.releaseDate || "9999-12-31")
  .sort()[0];
```

Alphabetical order is used only as a tie-breaker.

## Search and Filtering

Search is case-insensitive and token-based. Every whitespace-separated query token must match the combined searchable text:

- Song title
- Artist
- Genre/category
- Version

Chart filters require at least one chart to satisfy all selected conditions:

- Genre
- Version
- Chart type (`Standard` or `DX`)
- Difficulty
- Exact constant

## Cover Art

Cover images are loaded on demand from:

```text
https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover/{imageName}
```

Cards use:

- Full-card background image
- `object-fit: cover`
- Dark gradient overlay for readable text
- `loading="lazy"`
- `decoding="async"`

No cover files are bundled in this repository.

## OCR Implementation

### Live Camera Mode

Live OCR uses:

```js
navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: "environment",
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
});
```

The scanner:

1. Opens a rear/environment camera when available
2. Continuously captures video frames to an offscreen canvas
3. Runs OCR repeatedly without closing the camera
4. Analyzes two shallow, wide crop regions focused on song titles
5. Matches recognized text against the song database
6. Shows the best match as an inline card under the camera
7. Shows Standard chart levels first and DX chart levels beneath them
8. Automatically updates when another song is recognized
9. Keeps the last recognized result card until a different song is recognized
10. Closes with the centered **關閉** button

### Image Upload Mode

Image upload mode is useful when live-camera OCR is unreliable.

It:

1. Accepts a captured photo or screenshot
2. Creates an `ImageBitmap`
3. Runs the same two-crop title-focused OCR pipeline
4. Shows up to five candidate songs
5. Lets the user select the intended match

### OCR Engine

OCR uses Tesseract.js:

```html
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"></script>
```

Recognition languages:

```text
jpn+eng
```

The live scanner keeps one persistent Tesseract worker while scanning and terminates it when the scanner closes. Frames are captured at `960×540`, cropped to title regions before OCR, and recognition exits early after a high-confidence title match.

### Text Normalization

Recognized text is normalized before matching:

```js
function normalizeText(value) {
  return Array.from(String(value || "").toLowerCase())
    .filter(character => /[\p{L}\p{N}]/u.test(character))
    .join("");
}
```

This preserves Unicode letters and numbers while removing spaces, punctuation, and symbols.
The normalizer also maps common OCR-confused characters such as `ø` to `o`, `æ` to `ae`, `œ` to `oe`, and `ß` to `ss`.

### Song Matching

Matching supports:

- Exact normalized song title match
- Song title substring match
- Song title prefix match
- Bounded Levenshtein distance

The title-only bounded threshold is:

```js
Math.max(1, Math.floor(title.length * 0.15))
```

A result is accepted only when its normalized score is at least `0.75`.

For image upload mode, the top five accepted candidates are shown. Live mode uses the highest-confidence candidate.

## Browser Requirements

Mai Score requires a modern browser supporting:

- ES2017+
- `dialog`
- `fetch`
- `ImageBitmap`
- `MediaDevices.getUserMedia`
- `AsyncFunction`

Camera OCR additionally requires:

- A secure HTTPS context or localhost
- Browser camera permission
- A camera device

## Local Development

Because the site is a static single HTML file, it can be opened directly, but a local server is recommended for full functionality:

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## GitHub Pages Deployment

The site is deployed at:

```text
https://eric-is-here.github.io/Mai-Score/
```

Current Pages configuration:

- Repository: `eric-is-here/Mai-Score`
- Branch: `main`
- Source path: `/ (root)`
- Commit file: `index.html`

Any push to `main` triggers a new GitHub Pages deployment.

## Automatic Data Refresh

The dataset refreshes through the `Refresh song data` GitHub Actions workflow:

1. Runs daily at 10:00 Hong Kong time (`02:00 UTC`)
2. Downloads the current ArcadeSongs maimai International dataset
3. Filters to International songs and charts
4. Regenerates the embedded dataset in `index.html` and the standalone copy in `maidata.js`
5. Validates the dataset metadata, chart types, embedded/standalone consistency, and inline JavaScript syntax
6. Commits and pushes `index.html` and `maidata.js` only when the data has changed
7. Triggers a new GitHub Pages deployment through the push to `main`

The workflow can also be run manually from the repository Actions tab using the `workflow_dispatch` trigger.

To refresh the dataset locally, run:

```powershell
node .scripts/refresh-data.mjs
node .scripts/verify-refresh.mjs
```

## Known Limitations

- OCR accuracy depends on lighting, camera focus, font, and screen glare.
- Song covers require internet access and availability of the ArcadeSongs CDN.
- Live OCR may be slow on low-power devices because recognition is CPU-intensive.
- The dataset refreshes automatically once per day through the scheduled GitHub Actions workflow.
- Some official source data may include null chart versions or note counts.

## Data and Attribution

- Song, chart, cover, and constant data: [ArcadeSongs maimai](https://arcade-songs.zetaraku.dev/maimai/)
- OCR runtime: [Tesseract.js](https://tesseract.projectnaptha.com/)
- The dataset and cover images belong to their respective sources and rights holders.
- This project is intended for personal reference and educational use.
