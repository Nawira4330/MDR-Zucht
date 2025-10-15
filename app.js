// app.js — vollständige Logik mit Parsing, Scoring und Debug-Details

let stuten = [];
let hengste = [];

const NAME_KEYS = ["Name","Stutenname","Stute","name"];
const OWNER_KEYS = ["Besitzer","Owner","besitzer","owner"];
const COLOR_KEYS = ["Farbgenetik","Farbe","FarbGenetik","color","Genetik"];

// Exterieur-Merkmale (Spaltennamen in deinen JSONs)
const MERKMALE = [
  "Kopf","Gebiss","Hals","Halsansatz",
  "Widerrist","Schulter","Brust","Rückenlinie",
  "Rückenlänge","Kruppe","Beinwinkelung","Beinstellung","Fesseln","Hufe"
];

// ----------------- Hilfsfunktionen -----------------
function pickField(obj, keys){
  for(const k of keys) if(obj && Object.prototype.hasOwnProperty.call(obj,k) && obj[k] !== undefined && obj[k] !== "") return obj[k];
  return "";
}
function pickName(obj){ return pickField(obj, NAME_KEYS) || "(ohne Name)"; }
function pickOwner(obj){ return pickField(obj, OWNER_KEYS) || "(kein Besitzer)"; }
function pickColor(obj){ return pickField(obj, COLOR_KEYS) || ""; }

// Normalisiert einen Einzelwert wie "hH", "H/h", " hh " -> "Hh" / "HH" / "hh"
function cleanGenValue(val){
  if(!val && val !== 0) return "";
  let s = String(val).trim();
  // entferne Slashes/extra spaces, setze Groß-/Kleinschreibung beibehalten
  s = s.replace(/\//g, "").replace(/\s+/g, "");
  // falls e.g. "hH" oder "Hh" -> normiere zu "Hh"
  if(/^hH$/.test(s)) s = "Hh";
  if(/^Hh$/.test(s)) s = "Hh";
  if(/^HH$/.test(s)) s = "HH";
  if(/^hh$/.test(s)) s = "hh";
  // if unknown, return trimmed original for fallback
  return s;
}

// Säubert einen Merkmal-String wie "hh hh hH hh | hh Hh hh HH"
// und gibt es standardisiert zurück: "HH Hh Hh hh | hh Hh hh HH"
function cleanGenString(str){
  if(!str) return "";
  // split front/back
  const parts = String(str).split("|").map(p => p.trim());
  const frontTokens = parts[0] ? parts[0].split(/\s+/).map(t => cleanGenValue(t)).filter(Boolean) : [];
  const backTokens = parts[1] ? parts[1].split(/\s+/).map(t => cleanGenValue(t)).filter(Boolean) : [];
  // ensure exactly 4 each if possible (we will not pad, but slice to 4)
  const f4 = frontTokens.slice(0,4);
  const b4 = backTokens.slice(0,4);
  return (f4.join(" ") || "") + (b4.length ? " | " + b4.join(" ") : "");
}

// ----------------- Daten laden -----------------
async function ladeDaten(){
  try {
    const [sRes, hRes] = await Promise.all([
      fetch("data/stuten.json"),
      fetch("data/hengste.json")
    ]);
    const s = await sRes.json();
    const h = await hRes.json();
    stuten = Array.isArray(s) ? s : [];
    hengste = Array.isArray(h) ? h : [];

    // Sauber machen: für jedes Merkmal in jeder Stute/Hengst den String normalisieren
    stuten.forEach(st => {
      MERKMALE.forEach(m => {
        if (st[m]) st[m] = cleanGenString(st[m]);
      });
    });
    hengste.forEach(hg => {
      MERKMALE.forEach(m => {
        if (hg[m]) hg[m] = cleanGenString(hg[m]);
      });
    });

    // Dropdowns füllen
    fuelleDropdowns();

  } catch (err) {
    console.error("Fehler beim Laden der Daten:", err);
    const out = document.getElementById("ergebnis");
    if(out) out.innerHTML = `<p style="color:red">Fehler beim Laden der Daten. Prüfe data/*.json</p>`;
  }
}

// ----------------- Dropdowns -----------------
function fuelleDropdowns(){
  const stSel = document.getElementById("stuteSelect");
  const bSel = document.getElementById("besitzerSelect");
  stSel.innerHTML = '<option value="">-- bitte wählen --</option>';
  bSel.innerHTML = '<option value="">-- bitte wählen --</option>';

  stuten.forEach((s, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = pickName(s);
    stSel.appendChild(opt);
  });

  const owners = [...new Set(stuten.map(s => pickOwner(s)))].filter(Boolean);
  owners.forEach(o => {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    bSel.appendChild(opt);
  });
}

// ----------------- Scoring (front/back, debug) -----------------
function getFrontScore(s, h){
  const combos = {
    "HHHH":4, "HHHh":3, "HHhh":2,
    "HhHH":3, "HhHh":2, "Hhhh":1,
    "hhHH":2, "hhHh":1, "hhhh":0
  };
  return combos[(s||"") + (h||"")] ?? 0;
}
function getBackScore(s, h){
  const combos = {
    "HHHH":0, "HHHh":1, "HHhh":2,
    "HhHH":1, "HhHh":2, "Hhhh":3,
    "hhHH":2, "hhHh":3, "hhhh":4
  };
  return combos[(s||"") + (h||"")] ?? 0;
}

// scorePair liefert nun { totalScore, debug } für eine Stute+Hengst-Kombi
function scorePair(stute, hengst){
  let totalScore = 0;
  const debug = []; // array of { merkmal, detailsStr, merkmalScore }

  for(const merk of MERKMALE){
    const sStr = (stute[merk] || "").trim();
    const hStr = (hengst[merk] || "").trim();
    if(!sStr || !hStr) {
      // push debug that merkmal missing
      debug.push({ merkmal: merk, details: "fehlende Werte", score: 0 });
      continue;
    }

    const [sFrontRaw="", sBackRaw=""] = sStr.split("|").map(p => p.trim());
    const [hFrontRaw="", hBackRaw=""] = hStr.split("|").map(p => p.trim());

    const sFront = sFrontRaw ? sFrontRaw.split(/\s+/).map(cleanGenValue).slice(0,4) : [];
    const hFront = hFrontRaw ? hFrontRaw.split(/\s+/).map(cleanGenValue).slice(0,4) : [];
    const sBack = sBackRaw ? sBackRaw.split(/\s+/).map(cleanGenValue).slice(0,4) : [];
    const hBack = hBackRaw ? hBackRaw.split(/\s+/).map(cleanGenValue).slice(0,4) : [];

    let merkScore = 0;
    const details = [];

    // vorne (4 positions)
    for(let i=0;i<4;i++){
      const sV = sFront[i] || "";
      const hV = hFront[i] || "";
      const sc = getFrontScore(sV, hV);
      merkScore += sc;
      details.push(`V${i+1}:${sV || "-"}-${hV || "-"}(${sc})`);
    }

    // hinten (4 positions)
    for(let i=0;i<4;i++){
      const sV = sBack[i] || "";
      const hV = hBack[i] || "";
      const sc = getBackScore(sV, hV);
      merkScore += sc;
      details.push(`H${i+1}:${sV || "-"}-${hV || "-"}(${sc})`);
    }

    debug.push({ merkmal: merk, details: details.join(", "), score: merkScore });
    totalScore += merkScore;
  }

  return { totalScore, debug };
}

// ----------------- UI: Erzeugen Top3 + Debug -----------------
function createTop3Html(stute){
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute) || "-";

  // berechne score + debug für alle hengste
  const scored = hengste.map(h => {
    const res = scorePair(stute, h);
    return { ...h, __score: res.totalScore, __debug: res.debug };
  }).sort((a,b) => b.__score - a.__score);

  // nur Top 3
  const top = scored.slice(0,3);

  let html = `<div class="match"><h3>${escapeHtml(name)} <small>— ${escapeHtml(owner)}</small></h3>`;
  html += `<p class="farbe">Farbgenetik: ${escapeHtml(color)}</p>`;

  if(top.length === 0){
    html += `<p><em>Keine Hengste bzw. Daten vorhanden.</em></p>`;
  } else {
    html += `<ol>`;
    top.forEach((h, idx) => {
      html += `<li>
        <span class="wahl">•${idx+1}</span>
        <strong>${escapeHtml(pickName(h))}</strong>
        <span class="score">Score: ${h.__score}</span>
        <div>Farbgenetik: <em>${escapeHtml(pickColor(h) || "-")}</em></div>
        <details>
          <summary>Debug: Punkteaufstellung pro Merkmal (anklicken)</summary>
          <ul class="debug-list">`;
      h.__debug.forEach(d => {
        html += `<li><strong>${escapeHtml(d.merkmal)}:</strong> ${escapeHtml(d.details)} — <strong>${d.score}</strong></li>`;
      });
      html += `  </ul>
        </details>
      </li>`;
    });
    html += `</ol>`;
  }

  html += `</div>`;
  return html;
}

// ----------------- Anzeige / Filter -----------------
function zeigeVorschlaege(){
  const sVal = document.getElementById("stuteSelect").value;
  const bVal = document.getElementById("besitzerSelect").value;
  const out = document.getElementById("ergebnis");
  out.innerHTML = "";

  let toShow = [];
  if(sVal !== ""){
    const idx = parseInt(sVal, 10);
    if(!Number.isNaN(idx) && stuten[idx]) toShow = [stuten[idx]];
  } else if(bVal !== ""){
    toShow = stuten.filter(s => pickOwner(s) === bVal);
  } else {
    toShow = stuten;
  }

  if(toShow.length === 0){
    out.innerHTML = `<p>Keine Stuten gefunden.</p>`;
    return;
  }

  out.innerHTML = toShow.map(s => createTop3Html(s)).join("");
}

function zeigeAlle(){
  document.getElementById("stuteSelect").value = "";
  document.getElementById("besitzerSelect").value = "";
  zeigeVorschlaege();
}

function escapeHtml(s){
  return String(s).replace(/[&<>"'\/]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;'
  }[c]));
}

// ----------------- Start -----------------
window.addEventListener("DOMContentLoaded", () => {
  ladeDaten();
  // event listener for filters
  document.getElementById("stuteSelect").addEventListener("change", zeigeVorschlaege);
  document.getElementById("besitzerSelect").addEventListener("change", zeigeVorschlaege);
});
