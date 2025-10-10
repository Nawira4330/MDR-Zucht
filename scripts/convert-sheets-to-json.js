import fs from "fs";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

const stutenSheetId = process.env.STUTEN_SHEET_ID;
const hengsteSheetId = process.env.HENGSTE_SHEET_ID;

async function loadSheet(sheetId) {
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();

  return rows.map((r) => r.toObject());
}

async function main() {
  console.log("📥 Lade Stuten und Hengste aus Google Sheets...");

  const stuten = await loadSheet(stutenSheetId);
  const hengste = await loadSheet(hengsteSheetId);

  // Stelle sicher, dass data/ existiert
  if (!fs.existsSync("data")) fs.mkdirSync("data");

  fs.writeFileSync("data/stuten.json", JSON.stringify(stuten, null, 2), "utf8");
  fs.writeFileSync("data/hengste.json", JSON.stringify(hengste, null, 2), "utf8");

  console.log("✅ Daten erfolgreich in data/ gespeichert!");
}

main().catch((err) => {
  console.error("❌ Fehler beim Laden der Sheets:", err);
  process.exit(1);
});
