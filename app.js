let stuten = [];
let hengste = [];

const NAME_KEYS = ["Name", "Stutenname", "Stute", "name"];
const OWNER_KEYS = ["Besitzer", "Owner", "besitzer", "owner"];
const COLOR_KEYS = ["Farbgenetik", "Farbe", "FarbGenetik", "color", "Genetik"];

const MERKMALE = [
  "Kopf","Gebiss","Hals","Halsansatz",
  "Widerrist","Schulter","Brust","Rückenlinie",
  "Rückenlänge","Kruppe","Beinwinkelung","Beinstellung","Fesseln","Hufe"
];

function pickField(obj, keys){
  for(const k of keys) if(obj && k in obj && obj[k] !== "") return obj[k];
  return "";
}
function pickName(obj){ return pickField(obj, NAME_KEYS) || "(ohne Name)"; }
function pickOwner(obj){ return pickField(obj, OWNER_KEYS) || "(kein Besitzer)"; }
function pickColor(obj){ return pickField(obj, COLOR_KEYS) || ""; }

async function ladeDaten(){
  try {
    const s = await fetch('data/stuten.json').then(r => r.json());
    const h = await fetch('data/hengste.json').then(r => r.json());
    stuten = Array.isArray(s) ? s : [];
    hengste = Array.isArray(h) ? h : [];
    fuelleDropdowns();
  } catch(e){
    console.error("Fehler beim Laden:", e);
    document.getElementById('ergebnis').innerHTML = `<p style="color:red">Fehler beim Laden der Daten.</p>`;
  }
}

function fuelleDropdowns(){
  const stuteSel = document.getElementById('stuteSelect');
  const besitzerSel = document.getElementById('besitzerSelect');
  stuteSel.innerHTML = '<option value="">-- bitte wählen --</option>';
  besitzerSel.innerHTML = '<option value="">-- bitte wählen --</option>';

  stuten.forEach((s, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = pickName(s);
    stuteSel.appendChild(opt);
  });

  const owners = [...new Set(stuten.map(s => pickOwner(s)))].filter(o => o && o !== "(kein Besitzer)");
  owners.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o;
    besitzerSel.appendChild(opt);
  });
}

// ------------------------------------------------------
// 🧬 Berechnet den genetischen Score für eine Stute/Hengst-Kombination
// ------------------------------------------------------
function scorePair(stute, hengst) {
  let totalScore = 0;

  for (const merkmal of MERKMALE) {
    const sGen = (stute[merkmal] || "").trim();
    const hGen = (hengst[merkmal] || "").trim();
    if (!sGen || !hGen) continue;

    const [sVorneStr, sHintenStr] = sGen.split('|').map(x => x.trim());
    const [hVorneStr, hHintenStr] = hGen.split('|').map(x => x.trim());

    const sVorne = sVorneStr ? sVorneStr.split(/\s+/) : [];
    const sHinten = sHintenStr ? sHintenStr.split(/\s+/) : [];
    const hVorne = hVorneStr ? hVorneStr.split(/\s+/) : [];
    const hHinten = hHintenStr ? hHintenStr.split(/\s+/) : [];

    // Für jede Position vorne (HH-Ziel)
    for (let i = 0; i < sVorne.length; i++) {
      totalScore += getFrontScore(cleanGenValue(sVorne[i]), cleanGenValue(hVorne[i]));
    }

    // Für jede Position hinten (hh-Ziel)
    for (let i = 0; i < sHinten.length; i++) {
      totalScore += getBackScore(cleanGenValue(sHinten[i]), cleanGenValue(hHinten[i]));
    }
  }

  return totalScore;
}

// ------------------------------------------------------
// Scoring-Regeln laut deiner Tabelle
// ------------------------------------------------------
function getFrontScore(s, h) {
  const combos = {
    "HHHH": 4, "HHHh": 3, "HHhh": 2,
    "HhHH": 3, "HhHh": 2, "Hhhh": 1,
    "hhHH": 2, "hhHh": 1, "hhhh": 0
  };
  return combos[s + h] ?? 0;
}

function getBackScore(s, h) {
  const combos = {
    "HHHH": 0, "HHHh": 1, "HHhh": 2,
    "HhHH": 1, "HhHh": 2, "Hhhh": 3,
    "hhHH": 2, "hhHh": 3, "hhhh": 4
  };
  return combos[s + h] ?? 0;
}

// Hilfsfunktion: Normalisiert Schreibweise (Hh, hH → Hh)
function cleanGenValue(v) {
  if (!v) return "";
  const sorted = v.split("").sort().join("");
  if (sorted === "HH") return "HH";
  if (sorted === "Hh") return "Hh";
  if (sorted === "hh") return "hh";
  return v;
}


function createTop3Html(stute){
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute) || "-";

  const scored = hengste
    .map(h => ({...h, __score: scorePair(stute, h)}))
    .sort((a,b) => b.__score - a.__score)
    .slice(0,3);

  let html = `<div class="match"><h3>${escapeHtml(name)} — Besitzer: ${escapeHtml(owner)}</h3>`;
  html += `<p class="farbe">Farbgenetik: ${escapeHtml(color)}</p>`;
  html += `<ol>`;
  scored.forEach((h, i) => {
    html += `<li><span class="wahl">•${i+1}. Wahl:</span> ${escapeHtml(pickName(h))} 
             — <span class="hengstFarbe">${escapeHtml(pickColor(h) || "-")}</span> 
             <span class="score">(Score: ${h.__score})</span></li>`;
  });
  html += `</ol></div>`;
  return html;
}

function zeigeVorschlaege(){
  const sVal = document.getElementById('stuteSelect').value;
  const bVal = document.getElementById('besitzerSelect').value;
  const out = document.getElementById('ergebnis');
  out.innerHTML = '';

  let zuZeigen = [];
  if(sVal) zuZeigen = [stuten[parseInt(sVal)]];
  else if(bVal) zuZeigen = stuten.filter(s => pickOwner(s) === bVal);
  else zuZeigen = stuten;

  if(zuZeigen.length === 0){
    out.innerHTML = '<p>Keine Stuten gefunden.</p>';
    return;
  }
  out.innerHTML = zuZeigen.map(createTop3Html).join('');
}

function zeigeAlle(){
  document.getElementById('stuteSelect').value = '';
  document.getElementById('besitzerSelect').value = '';
  zeigeVorschlaege();
}

function escapeHtml(s){
  return String(s).replace(/[&<>"'\/]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;'
  }[c]));
}

window.addEventListener('DOMContentLoaded', ladeDaten);
