import fs from "node:fs";

const datasets = [
  {
    url: "https://dp4p6x0xfi5o9.cloudfront.net/maimai/data.json",
    variable: "maidata",
    html: "index.html",
    standalone: "maidata.js",
    source: "https://arcade-songs.zetaraku.dev/maimai/",
  },
];

function filterInternational(raw) {
  return raw.songs
    .map((song) => ({
      title: song.title,
      artist: song.artist,
      category: song.category,
      imageName: song.imageName,
      version: song.version,
      releaseDate: song.releaseDate,
      bpm: song.bpm,
      sheets: (song.sheets || [])
        .filter((sheet) => sheet.regions?.intl)
        .map((sheet) => ({
          type: sheet.type,
          difficulty: sheet.difficulty,
          level: sheet.level,
          levelValue: sheet.levelValue,
          internalLevel: sheet.internalLevel,
          internalLevelValue: sheet.internalLevelValue,
          version: sheet.version,
          noteDesigner: sheet.noteDesigner,
          noteCounts: sheet.noteCounts,
        })),
    }))
    .filter((song) => song.sheets.length > 0);
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  return await response.json();
}

function replaceEmbeddedDataset(source, variable, datasetJson) {
  const escapedJson = datasetJson.replaceAll("</script", "<\\/script");
  const marker = `const ${variable} = `;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Could not find embedded ${variable} dataset`);
  const valueStart = start + marker.length;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let index = valueStart; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === String.fromCharCode(92)) escaped = true;
      else if (char === String.fromCharCode(34)) inString = false;
    } else if (char === String.fromCharCode(34)) {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }

  while (end + 1 < source.length && /[\r\n]/.test(source[end + 1])) end += 1;
  if (end < 0 || source[end + 1] !== ";") {
    throw new Error(`Could not find the end of embedded ${variable} dataset`);
  }

  return source.slice(0, start) + `${marker}${escapedJson};` + source.slice(end + 2);
}

for (const dataset of datasets) {
  console.log(`Refreshing ${dataset.variable} from ${dataset.url}`);
  const raw = await fetchJson(dataset.url);
  if (!Array.isArray(raw.songs)) throw new Error(`${dataset.url} returned no song array`);

  const songs = filterInternational(raw);
  if (songs.length === 0) throw new Error(`${dataset.url} returned no international songs`);
  const filtered = {
    source: dataset.source,
    region: "International",
    updateTime: raw.updateTime,
    songs,
  };
  const datasetJson = JSON.stringify(filtered);

  fs.writeFileSync(dataset.standalone, `const ${dataset.variable} = ${datasetJson};\n`, "utf8");
  const source = fs.readFileSync(dataset.html, "utf8");
  fs.writeFileSync(dataset.html, replaceEmbeddedDataset(source, dataset.variable, datasetJson), "utf8");

  const charts = songs.reduce((total, song) => total + song.sheets.length, 0);
  console.log(`${dataset.variable}: ${songs.length} songs, ${charts} charts`);
}
