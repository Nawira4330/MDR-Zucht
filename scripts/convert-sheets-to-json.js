// scripts/convert-sheets-to-json.js
import fs from "fs";
import fetch from "node-fetch";

console.log("📥 Lade Stuten und Hengste aus Google Sheets...");

const SHEETS = {
  stuten: "1Q3Kh2XjiMoIfU_rTSZqLzCzHQ50hQuFS",
  hengste: "1q3nkqzm67vOKxfeOX8hjaZaPBEzh2REI"
};

async function sheetToJson(sheetId) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fehler beim Laden des Sheets: ${res.statusText}`);
  const csv = await res.text();

  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());
  const rows = lines.slice(1);

  return rows.map(line => {
    const cols = line.split(",").map(c => c.trim());
    const obj = {};
    headers.forEach((h, i) => (obj[h] = cols[i] ?? ""));
    return obj;
  });
}

async function main() {
  try {
    const stuten = await sheetToJson(SHEETS.stuten);
    const hengste = await sheetToJson(SHEETS.hengste);

    fs.mkdirSync("data", { recursive: true });
    fs.writeFileSync("data/stuten.json", JSON.stringify(stuten, null, 2));
    fs.writeFileSync("data/hengste.json", JSON.stringify(hengste, null, 2));

    console.log("✅ JSON-Dateien erfolgreich aktualisiert.");
  } catch (err) {
    console.error("❌ Fehler beim Laden der Sheets:", err);
    process.exit(1);
  }
}

main();
