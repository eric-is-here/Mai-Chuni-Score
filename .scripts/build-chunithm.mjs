import fs from "node:fs";

const rawPath = process.argv[2];
if (!rawPath) {
  console.error("Usage: node .scripts/build-chunithm.mjs <chunithm-data.json>");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
const songs = raw.songs
  .map((song) => ({
    title: song.title,
    artist: song.artist,
    category: song.category,
    imageName: song.imageName,
    version: song.version,
    releaseDate: song.releaseDate,
    bpm: song.bpm,
    sheets: song.sheets
      .filter((sheet) => sheet.regions?.intl)
      .map((sheet) => ({
        type: sheet.type,
        difficulty: sheet.difficulty,
        level: sheet.level,
        levelValue: sheet.levelValue,
        internalLevel: sheet.internalLevel,
        internalLevelValue: sheet.internalLevelValue,
        noteDesigner: sheet.noteDesigner,
        noteCounts: sheet.noteCounts,
      })),
  }))
  .filter((song) => song.sheets.length > 0);

const dataset = {
  source: "https://arcade-songs.zetaraku.dev/chunithm/",
  region: "International",
  updateTime: raw.updateTime,
  songs,
};

const datasetJson = JSON.stringify(dataset).replaceAll("</script", "<\\/script");
fs.writeFileSync("chunithmdata.js", `const chunithmdata = ${datasetJson};\n`, "utf8");

const source = fs.readFileSync("index.html", "utf8");
const lines = source.split(/\r?\n/);
let head = lines.slice(0, 11).join("\n") + "\n" + lines.slice(15, 36).join("\n");
const switchStyle = `header{position:relative}
.game-switch{position:absolute;top:0;right:0;display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 14px;border:1px solid rgba(243,166,7,.45);border-radius:999px;background:rgba(243,166,7,.12);color:#fbd38d;font:inherit;font-size:13px;font-weight:800;text-decoration:none;cursor:pointer}
.game-switch:hover{background:rgba(243,166,7,.22);color:#fff}
@media(max-width:560px){.game-switch{position:static;margin-top:12px}}`;
let body = lines.slice(37, 47).join("\n");
const logicStart = source.indexOf("const diffNames=");
const scriptEnd = source.indexOf("</script>", logicStart);
let logic = source.slice(logicStart, scriptEnd);

head = head
  .replace(
    "<title>Mai Score · maimai 國際版譜面搜尋</title>",
    "<title>Chunithm Score · CHUNITHM 國際版譜面搜尋</title>"
  )
  .replace(
    ".panel{position:sticky",
    `${switchStyle}\n.panel{position:sticky`
  )
  .replace(
    "h1{margin:0;font-size:36px;background:linear-gradient(100deg,#fbbf24,#f472b6,#22d3ee)",
    "h1{margin:0;font-size:36px;background:linear-gradient(100deg,#fde047,#f3a607,#fb7185)"
  )
  .replace(
    ".master{color:#fbbf24}.remaster{color:#d8b4fe}.dx{color:#f472b6}",
    ".master{color:#fbbf24}.ultima{color:#fb7185}.we{color:#22d3ee}"
  )
  .replace(
    ".ocr-level-row.dx .ocr-level-label{color:#f472b6}",
    ".ocr-level-row.we .ocr-level-label{color:#22d3ee}"
  );

body = body
  .replace(
    `<header><h1>Mai Score</h1><p class="subtitle">maimai 國際版譜面搜尋</p><a class="game-switch" href="chunithm.html" title="切換至 CHUNITHM">⇄ CHUNITHM</a></header>`,
    `<header><h1>Chunithm Score</h1><p class="subtitle">CHUNITHM 國際版譜面搜尋</p><a class="game-switch" href="index.html" title="切換至 maimai">⇄ maimai</a></header>`
  )
  .replace(
    `<option value="std">Standard</option><option value="dx">DX</option>`,
    `<option value="std">STANDARD</option><option value="we">WORLD'S END</option>`
  )
  .replace(
    `<option value="master">MASTER</option><option value="remaster">Re:MASTER</option>`,
    `<option value="master">MASTER</option><option value="ultima">ULTIMA</option><option value="we">WORLD'S END</option>`
  );

logic = logic
  .replaceAll("maidata", "chunithmdata")
  .replaceAll("https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover/", "https://dp4p6x0xfi5o9.cloudfront.net/chunithm/img/cover/")
  .replace(
    `const diffNames={basic:"BASIC",advanced:"ADVANCED",expert:"EXPERT",master:"MASTER",remaster:"Re:MASTER"},typeNames={std:"Standard",dx:"DX",utage:"Utage"};`,
    `const diffNames={basic:"BASIC",advanced:"ADVANCED",expert:"EXPERT",master:"MASTER",ultima:"ULTIMA"},typeNames={std:"STANDARD",we:"WORLD'S END"};`
  )
  .replace(
    `function exactLevel(c){return c.internalLevelValue!=null?Number(c.internalLevelValue):Number(c.levelValue)};`,
    `function exactLevel(c){if(c.type==="we")return Number(c.levelValue);return c.internalLevelValue!=null?Number(c.internalLevelValue):Number(c.levelValue)};function displayLevel(c){return c.type==="we"?c.level:exactLevel(c).toFixed(1)}`
  )
  .replace(
    `function opt(chart){return (typeNames[chart.type]||chart.type)+" · "+diffNames[chart.difficulty]+" · "+exactLevel(chart).toFixed(1)}`,
    `function opt(chart){return (typeNames[chart.type]||chart.type)+" · "+diffNames[chart.difficulty]+" · "+displayLevel(chart)}`
  )
  .replace(
    `(!els.difficulty.value||c.difficulty===els.difficulty.value)`,
    `(!els.difficulty.value||(els.difficulty.value==="we"?c.type==="we":c.difficulty===els.difficulty.value))`
  )
  .replace(
    `x.className="badge "+c.type+(c.difficulty==="master"?" master":c.difficulty==="remaster"?" remaster":"");x.textContent=diffNames[c.difficulty]+" "+exactLevel(c).toFixed(1)`,
    `x.className="badge "+c.type+(c.difficulty==="master"?" master":c.difficulty==="ultima"?" ultima":"");x.textContent=diffNames[c.difficulty]+" "+displayLevel(c)`
  )
  .replace(
    `row.querySelector("span").textContent=[c.version?"Version: "+c.version:null,n.total?"Notes: "+n.total:null].filter(Boolean).join(" · ")`,
    `row.querySelector("span").textContent=chartDetails(c)`
  )
  .replace(
    `function openModal(song){`,
    `function chartDetails(c){const n=c.noteCounts||{};const parts=[c.version?"Version: "+c.version:null,c.noteDesigner&&c.noteDesigner!=="-"?"Designer: "+c.noteDesigner:null,n.total!=null?"Notes: "+n.total:null];if(n.total!=null)parts.push("Tap "+(n.tap??0)+" · Hold "+(n.hold??0)+" · Slide "+(n.slide??0)+" · Air "+(n.air??0)+" · Flick "+(n.flick??0));return parts.filter(Boolean).join(" · ")}function openModal(song){`
  )
  .replace(
    `const groups=[["Standard","std"],["DX","dx"]]`,
    `const groups=[["STANDARD","std"],["WORLD'S END","we"]]`
  )
  .replace(
    `value.textContent=diffNames[chart.difficulty]+" "+exactLevel(chart).toFixed(1)`,
    `value.textContent=diffNames[chart.difficulty]+" "+displayLevel(chart)`
  );

const html = `${head}\n</head>\n${body}\n<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"></script><script>const chunithmdata = ${datasetJson};\n${logic}</script></body></html>\n`;
fs.writeFileSync("chunithm.html", html, "utf8");

console.log(`songs=${songs.length}`);
console.log(`charts=${songs.reduce((total, song) => total + song.sheets.length, 0)}`);
