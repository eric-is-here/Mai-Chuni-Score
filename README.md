# Mai Score

[繁體中文](README.md) · [English](README.en.md)

Mai Score 是一個完全靜態網站，用於搜尋 **maimai 國際版**歌曲與精確譜面定數，並支援連續鏡頭 OCR 辨識歌名。

**線上網站：** <https://eric-is-here.github.io/Mai-Score/>

## 功能

- 依歌名、藝術家、分類或版本搜尋歌曲
- 依分類、版本、譜面類型、難度與精確定數篩選
- 顯示所有 Standard／DX 譜面的精確內部定數
- 顯示譜面版本與音符數
- 搜尋結果卡片使用官方封面作為整卡背景
- 連續鏡頭 OCR 掃描，並即時顯示符合歌曲的卡片
- 支援圖片上傳辨識
- 完全靜態部署；不需後端、資料庫或帳戶

## 目前資料集

- 來源：[ArcadeSongs maimai](https://arcade-songs.zetaraku.dev/maimai/)
- 地區：國際版
- 資料更新時間（香港時間）：`2026-10-09 09:57:42`
- 歌曲數：`1,491`
- 譜面數：`6,128`
- 分類數：`7`
- 版本數：`28`
- 精確定數種類：`87`，範圍 `1.0` 至 `15.0`

分類保留官方英文／日文名稱：

- `maimai`
- `POPS＆アニメ`
- `ゲーム＆バラエティ`
- `niconico＆ボーカロイド`
- `東方Project`
- `オンゲキ＆CHUNITHM`
- `宴会場`

## 檔案

| 檔案 | 用途 |
|---|---|
| `index.html` | 完整單檔應用程式：HTML、CSS、JavaScript 與內嵌資料集 |
| `maidata.js` | 獨立 JavaScript 資料集，作為內嵌資料來源 |
| `.scripts/refresh-data.mjs` | 下載並重新產生 ArcadeSongs maimai 資料集 |
| `.scripts/verify-refresh.mjs` | 驗證產生的資料集與內嵌 HTML 版本 |
| `.github/workflows/refresh-data.yml` | 每日自動更新資料集的 GitHub Actions 工作流程 |
| `README.md` | 繁體中文主要技術與使用說明文件 |
| `README.en.md` | 英文技術與使用說明文件 |

部署網站只需要 `index.html`。`maidata.js` 保留在儲存庫中，方便重複使用資料集。

## 架構

應用程式在執行階段刻意保持低相依性：

- 不使用前端框架
- 沒有建置步驟
- 沒有後端
- 沒有資料庫
- 沒有伺服器端處理
- 只有一個外部 JavaScript 執行階段函式庫：Tesseract.js
- 官方封面圖直接從 ArcadeSongs 公開 CDN 載入

完整應用程式內嵌在 `index.html` 中，可避免 HTML、CSS、JavaScript 與資料更新之間的快取一致性問題。

## 歌曲資料結構

每首歌曲包含：

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

每張譜面包含：

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

## 精確譜面定數

Mai Score 顯示**精確內部定數**，而不是名義等級對應值。

優先順序為：

```js
function exactLevel(chart) {
  return chart.internalLevelValue != null
    ? Number(chart.internalLevelValue)
    : Number(chart.levelValue);
}
```

這點很重要，因為名義 `+` 等級不一定是 `.6`，非 `+` 等級也不一定是 `.0`。

範例：

| 名義等級 | 精確定數 |
|---:|---:|
| `6` | `7.5` |
| `9+` | `9.8` |
| `10+` | `10.7` |
| `12` | `12.4` |
| `14+` | `14.8` |

等級篩選使用 `internalLevelValue` 建立，包含 `7.1`、`9.8`、`13.8`、`14.1` 等精確數值。

## 版本排序

版本依每個版本中最早的歌曲 `releaseDate` 排序：

```js
const firstDate = version => maidata.songs
  .filter(song => song.version === version)
  .map(song => song.releaseDate || "9999-12-31")
  .sort()[0];
```

只有在前述日期相同時，才使用字母順序作為次要排序條件。

## 搜尋與篩選

搜尋不區分大小寫，並以空白分隔的多個關鍵字為單位。每個關鍵字都必須符合以下合併後的搜尋文字：

- 歌名
- 藝術家
- 分類
- 版本

譜面篩選要求至少一張譜面同時符合所有選定條件：

- 分類
- 版本
- 譜面類型（`Standard` 或 `DX`）
- 難度
- 精確定數

## 封面圖

封面圖會依需從以下位置載入：

```text
https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover/{imageName}
```

卡片使用：

- 整卡背景圖
- `object-fit: cover`
- 深色漸層遮罩，確保文字可讀
- `loading="lazy"`
- `decoding="async"`

本儲存庫不會打包任何封面檔案。

## OCR 實作

### 即時鏡頭模式

即時 OCR 使用：

```js
navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: "environment",
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
});
```

掃描器會：

1. 優先開啟後置／環境鏡頭
2. 持續將視訊畫面擷取到離屏 canvas
3. 不關閉鏡頭，重複執行 OCR
4. 分析兩個聚焦歌名的淺色寬裁切區域
5. 將辨識文字與歌曲資料庫比對
6. 在鏡頭下方顯示最佳符合結果
7. 先顯示 Standard 譜面等級，再顯示 DX 譜面等級
8. 辨識到其他歌曲時自動更新
9. 在辨識到不同歌曲之前，保留上一個結果卡片
10. 使用中央的 **關閉** 按鈕結束

### 圖片上傳模式

圖片上傳模式適合即時鏡頭 OCR 不穩定時使用。

它會：

1. 接受拍攝照片或螢幕截圖
2. 建立 `ImageBitmap`
3. 執行相同的兩個歌名裁切 OCR 流程
4. 顯示最多五個候選歌曲
5. 讓使用者選擇正確結果

### OCR 引擎

OCR 使用 Tesseract.js：

```html
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"></script>
```

辨識語言：

```text
jpn+eng
```

即時掃描會在掃描期間保留一個持續存在的 Tesseract worker，並在掃描器關閉時終止它。畫面以 `960×540` 擷取，OCR 前先裁切至歌名區域；若已得到高信心歌名符合，辨識會提前結束。

### 文字正規化

辨識文字會先經過正規化再比對：

```js
function normalizeText(value) {
  return Array.from(String(value || "").toLowerCase())
    .filter(character => /[\p{L}\p{N}]/u.test(character))
    .join("");
}
```

這會保留 Unicode 字母與數字，並移除空白、標點與符號。
正規化也會將常見 OCR 混淆字元轉換，例如 `ø` 轉為 `o`、`æ` 轉為 `ae`、`œ` 轉為 `oe`、`ß` 轉為 `ss`。

### 歌曲比對

比對支援：

- 正規化歌名完全相同
- 歌名子字串符合
- 歌名字首符合
- 有上限的 Levenshtein 距離

僅針對歌名的距離上限為：

```js
Math.max(1, Math.floor(title.length * 0.15))
```

只有正規化分數至少 `0.75` 的結果會被接受。

圖片上傳模式會顯示前五個可接受候選。即時模式使用信心度最高的候選。

## 瀏覽器需求

Mai Score 需要支援以下功能的現代瀏覽器：

- ES2017+
- `dialog`
- `fetch`
- `ImageBitmap`
- `MediaDevices.getUserMedia`
- `AsyncFunction`

鏡頭 OCR 另外需要：

- 安全的 HTTPS 環境或 localhost
- 瀏覽器鏡頭權限
- 可用鏡頭裝置

## 本機開發

因為網站是單一靜態 HTML 檔案，可直接開啟；但為了完整功能，建議使用本機伺服器：

```powershell
python -m http.server 8000
```

然後開啟：

```text
http://localhost:8000
```

## GitHub Pages 部署

網站部署於：

```text
https://eric-is-here.github.io/Mai-Score/
```

目前 Pages 設定：

- 儲存庫：`eric-is-here/Mai-Score`
- 分支：`main`
- 來源路徑：`/ (root)`
- 提交檔案：`index.html`

任何推送到 `main` 的更新都會觸發新的 GitHub Pages 部署。

## 自動資料更新

資料集透過 `Refresh song data` GitHub Actions 工作流程更新：

1. 每天香港時間 `10:00`（`02:00 UTC`）執行
2. 下載最新的 ArcadeSongs maimai 國際版資料集
3. 篩選國際版歌曲與譜面
4. 重新產生 `index.html` 內嵌資料集，以及 `maidata.js` 獨立副本
5. 驗證資料集 metadata、譜面類型、內嵌／獨立資料一致性與內嵌 JavaScript 語法
6. 只有資料變更時，才提交並推送 `index.html` 與 `maidata.js`
7. 推送到 `main` 後觸發新的 GitHub Pages 部署

你也可以在儲存庫的 **Actions** 頁面，使用 `workflow_dispatch` 手動執行工作流程。

若要在本機更新資料集，請執行：

```powershell
node .scripts/refresh-data.mjs
node .scripts/verify-refresh.mjs
```

## 已知限制

- OCR 準確度受光線、對焦、字體與螢幕反光影響。
- 封面圖需要網路連線，且依賴 ArcadeSongs CDN 的可用性。
- 即時 OCR 在低效能裝置上可能較慢，因為辨識需要大量 CPU 運算。
- 資料集每天透過排程 GitHub Actions 工作流程自動更新。
- 部分官方來源資料可能包含空的譜面版本或音符數。

## 資料與出處

- 歌曲、譜面、封面與定數資料：[ArcadeSongs maimai](https://arcade-songs.zetaraku.dev/maimai/)
- OCR 執行階段：[Tesseract.js](https://tesseract.projectnaptha.com/)
- 資料集與封面圖屬於各自來源與權利人。
- 本專案僅供個人參考與教育用途。
