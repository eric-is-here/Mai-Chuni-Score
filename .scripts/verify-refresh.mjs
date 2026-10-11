import fs from "node:fs";

const datasets = [
  {
    file: "maidata.js",
    variable: "maidata",
    html: "index.html",
    source: "https://arcade-songs.zetaraku.dev/maimai/",
    chartTypes: ["std", "dx", "utage"],
    logic: "const diffNames",
  },
];

for (const dataset of datasets) {
  const standalone = fs.readFileSync(dataset.file, "utf8");
  const data = new Function(`${standalone}; return ${dataset.variable};`)();

  if (data.source !== dataset.source || data.region !== "International") {
    throw new Error(`${dataset.file}: invalid metadata`);
  }
  if (!Array.isArray(data.songs) || data.songs.length === 0) throw new Error(`${dataset.file}: empty song list`);
  if (!data.updateTime || Number.isNaN(Date.parse(data.updateTime))) throw new Error(`${dataset.file}: invalid update time`);

  const charts = data.songs.flatMap((song) => song.sheets);
  if (charts.length === 0) throw new Error(`${dataset.file}: empty chart list`);
  if (charts.some((chart) => !dataset.chartTypes.includes(chart.type))) throw new Error(`${dataset.file}: invalid chart type`);
  if (data.songs.some((song) => !song.title || !song.imageName)) throw new Error(`${dataset.file}: song missing required fields`);

  const html = fs.readFileSync(dataset.html, "utf8");
  const marker = `const ${dataset.variable} = `;
  const start = html.indexOf(marker);
  const logicStart = html.indexOf(dataset.logic, start);
  const end = html.lastIndexOf(";", logicStart);
  if (start < 0 || end < 0) throw new Error(`${dataset.html}: embedded dataset not found`);

  const embedded = html.slice(start + marker.length, end + 1).trim();
  const expected = `${JSON.stringify(data).replaceAll("</script", "<\\/script")};`;
  if (embedded !== expected) throw new Error(`${dataset.html}: embedded dataset does not match standalone dataset`);

  const inline = html.slice(html.lastIndexOf("<script>", start) + "<script>".length, html.indexOf("</script>", end + 1));
  new Function(inline);
  if (!/function render\(|render\(\)/.test(inline)) throw new Error(`${dataset.html}: application logic missing`);
  console.log(`${dataset.file} and ${dataset.html}: ${data.songs.length} songs, ${charts.length} charts`);
}
