// scripts/convert-sheets-to-json.js
import fs from "fs";
import fetch from "node-fetch";
import Papa from "papaparse";

console.log("📥 Lade Stuten und Hengste aus Google Sheets...");

const sheets = {
  stuten: "https://docs.google.com/spreadsheets/d/1Q3Kh2XjiMoIfU_rTSZqLzCzHQ50hQuFS/export?format=csv",
  hengste: "https://docs.google.com/spreadsheets/d/1q3nkqzm67vOKxfeOX8hjaZaPBEzh2REI/export?format=csv"
};

async function fetchSheet(name, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fehler beim Abrufen der ${name}: ${res.statusText}`);
  const csv = await res.text();
  const parsed = Papa.parse(csv, { header: true });
  const json = parsed.data.filter(r => Object.values(r).some(v => v !== ""));
  fs.writeFileSync(`data/${name}.json`, JSON.stringify(json, null, 2));
  console.log(`✅ ${name}.json erfolgreich gespeichert (${json.length} Einträge)`);
}

(async () => {
  try {
    await fetchSheet("stuten", sheets.stuten);
    await fetchSheet("hengste", sheets.hengste);
  } catch (err) {
    console.error("❌ Fehler beim Laden der Sheets:", err);
    process.exit(1);
  }
})();
