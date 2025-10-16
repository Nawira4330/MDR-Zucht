// app.js – Automatische Verbindung zu Google Sheets, individuelle Hengstberechnung, Score & Filter
let stuten = [];
let hengste = [];

// 🔗 DEINE GOOGLE SHEETS LINKS (als CSV veröffentlichen!)
const STUTEN_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-DEIN_STUTEN_LINK/pub?output=csv";
const HENGSTE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-DEIN_HENGSTE_LINK/pub?output=csv";

// Mögliche Feldnamen (um auch Varianten zu unterstützen)
const NAME_KEYS = ["Name", "Stutenname", "Stute", "name"];
const OWNER_KEYS = ["Besitzer", "Owner", "besitzer", "owner"];
const COLOR_KEYS = ["Farbgenetik", "Farbe", "Genetik", "color"];

// Liste der Exterieur-Merkmale
const MERKMALE = [
  "Kopf","Gebiss","Hals","Halsansatz","Widerrist","Schulter","Brust",
  "Rückenlinie","Rückenlänge","Kruppe","Beinwinkelung","Beinstellung","Fesseln","Hufe"
];

// -------------------- CSV → JSON Parser --------------------
function parseCSV(text) {
  const rows = text.trim().split("\n").map(r => r.split(","));
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const o = {};
    headers.forEach((h, i) => o[h] = (r[i] || "").trim());
    return o;
  });
}

// -------------------- Hilfsfunktionen --------------------
function pickField(obj, keys) {
  for (const k of keys)
    if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined && obj[k] !== "")
      return obj[k];
  return "";
}
function pickName(obj) { return pickField(obj, NAME_KEYS) || "(ohne Name)"; }
function pickOwner(obj) { return pickField(obj, OWNER_KEYS) || "(kein Besitzer)"; }
function pickColor(obj) { return pickField(obj, COLOR_KEYS) || "-"; }

function escapeHtml(s) {
  return String(s).replace(/[&<>"'\/]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#47;'
  }[c]));
}

// -------------------- Laden der Google Sheets --------------------
async function ladeDaten() {
  try {
    const stutenCSV = await fetch(STUTEN_CSV_URL).then(r => r.text());
    const hengsteCSV = await fetch(HENGSTE_CSV_URL).then(r => r.text());

    stuten = parseCSV(stutenCSV);
    hengste = parseCSV(hengsteCSV);

    fuelleDropdowns();
  } catch (e) {
    console.error("Fehler beim Laden der Daten:", e);
    document.getEleme
