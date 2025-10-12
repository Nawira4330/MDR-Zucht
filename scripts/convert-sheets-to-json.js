/**
 * Lädt öffentliche Google Sheets (Stuten + Hengste)
 * und speichert sie als JSON-Dateien in /data.
 *
 * Dieses Skript wird automatisch über den GitHub Action Workflow
 * "google-sheets-to-json.yml" alle 3 Stunden ausgeführt.
 */

import fs from "fs";
import fetch from "node-fetch";

// === Sheet-URLs (CSV-Export) ===
const STUTEN_URL =
  "https://docs.google.com/spreadsheets/d/1Q3Kh2XjiMoIfU_rTSZqLzCzHQ50hQuFS/export?format=csv";
const HENGSTE_URL =
  "https://docs.google.com/spreadsheets/d/1q3nkqzm67vOKxfeOX8hjaZaPBEzh2REI/export?format=csv";

// === CSV → JSON Konvertierung ===
function csvToJson(csv) {
  const lines = csv.split("\n").filter((l) => l.trim() !== "");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] ? values[i].trim() : "";
    });
    return obj;
  });
}

// === Hauptfunktion ===
async function main() {
  const outDir = "./data";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  console.log("🚀 Lade öffentliche Google Sheets...");

  try {
    const [stutenCsv, hengsteCsv] = await Promise.all([
      fetch(STUTEN_URL).then((r) => r.text()),
      fetch(HENGSTE_URL).then((r) => r.text()),
    ]);

    console.log("✅ Sheets erfolgreich geladen");

    const stuten = csvToJson(stutenCsv);
    const hengste = csvToJson(hengsteCsv);

    fs.writeFileSync(`${outDir}/stuten.json`, JSON.stringify(stuten, null, 2));
    fs.writeFileSync(`${outDir}/hengste.json`, JSON.stringify(hengste, null, 2));

    console.log("💾 JSON-Dateien gespeichert:");
    console.log(" - data/stuten.json");
    console.log(" - data/hengste.json");
  } catch (err) {
    console.error("❌ Fehler beim Konvertieren:", err);
    process.exit(1);
  }
}

main();
