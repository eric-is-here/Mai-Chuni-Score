import fs from "node:fs";

for (const file of ["index.html", "chunithm.html"]) {
  const html = fs.readFileSync(file, "utf8");
  const title = /<title>(.*?)<\/title>/.exec(html)?.[1];
  console.log(file, {
    title,
    gameSwitch: html.split(`class="game-switch"`).length - 1,
    chunithmLinks: html.split("chunithm.html").length - 1,
    maiLinks: html.split("index.html").length - 1,
    scripts: html.split("</script>").length - 1,
    endsWithHtml: html.trim().endsWith("</html>"),
  });
}