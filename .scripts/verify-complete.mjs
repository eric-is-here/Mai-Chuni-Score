import fs from "node:fs";
import "./verify-refresh.mjs";

for (const [file, needle] of [
  ["index.html", `href="chunithm.html"`],
  ["chunithm.html", `href="index.html"`],
]) {
  const html = fs.readFileSync(file, "utf8");
  if (!html.includes(needle)) throw new Error(`${file} missing ${needle}`);
  console.log(`${file} switch link ok`);
}
