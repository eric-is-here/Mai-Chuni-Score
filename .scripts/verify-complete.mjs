import fs from "node:fs";

for (const [file, needle] of [
  ["index.html", `href="chunithm.html"`],
  ["chunithm.html", `href="index.html"`],
]) {
  const html = fs.readFileSync(file, "utf8");
  if (!html.includes(needle)) throw new Error(`${file} missing ${needle}`);
  console.log(`${file} switch link ok`);
}

const chunithm = fs.readFileSync("chunithm.html", "utf8");
const inline = chunithm.match(/<script>(const chunithmdata[\s\S]*?)<\/script>/);
new Function(inline[1]);
console.log("chunithm inline JavaScript syntax ok");

const standalone = fs.readFileSync("chunithmdata.js", "utf8");
const data = new Function(`${standalone}; return chunithmdata;`)();
const charts = data.songs.flatMap((song) => song.sheets);
if (data.songs.length !== 1665 || charts.length !== 6505) throw new Error("dataset count mismatch");
if (charts.some((chart) => chart.type !== "std" && chart.type !== "we")) throw new Error("invalid chart type");
console.log("dataset counts and chart types ok");