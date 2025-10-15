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
//     und liefert zusätzlich eine Debug-Ausgabe pro Merkmal.
// ------------------------------------------------------
function scorePair(stute, hengst) {
  let totalScore = 0;
  let debug = [];

  for (const merkmal of MERKMALE) {
    const sGen = (stute[merkmal] || "").trim();
    const hGen = (hengst[merkmal] || "").trim();
    if (!sGen || !hGen) continue;

    const [sVorneStr, sHintenStr] = sGen.split('|').map(x => x.trim());
    const [hVorneStr, hHintenStr] = hGen.split('|').map(x => x.trim());

    // vordere vier Gen-Paare
    const sVorne = sVorneStr ? sVorneStr.split(/\s+/).slice(0,4) : [];
    const hVorne = hVorneStr ? hVorneStr.split(/\s+/).slice(0,4) : [];

    // hintere vier Gen-Paare
    const sHinten = sHintenStr ? sHintenStr.split(/\s+/).slice(0,4) : [];
    const hHinten = hHintenStr ? hHintenStr.split(/\s+/).slice(0,4) : [];

    let merkmalScore = 0;
    let details = [];

    // vorne bewerten (HH-Ziel)
    for (let i = 0; i < 4; i++) {
      const sVal = cleanGenValue(sVorne[i]);
      const hVal = cleanGenValue(hVorne[i]);
      const sc = getFrontScore(sVal, hVal);
      merkmalScore += sc;
      details.push(`V${i+1}:${sVal}-${hVal}(${sc})`);
    }

    // hinten bewerten (hh-Ziel)
    for (let i = 0; i < 4; i++) {
      const sVal = cleanGenValue(sHinten[i]);
      const hVal = cleanGenValue(hHinten[i]);
      const sc = getBackScore(sVal, hVal);
      merkmalScore += sc;
      details.push(`H${i+1}:${sVal}-${hVal}(${sc})`);
    }

    debug.push({
      merkmal,
      details: details.join(', '),
      score: merkmalScore
    });

    totalScore += merkmalScore;
  }

  return { totalScore, debug };
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

  const scored = hengste.map(h => {
    const { totalScore, debug } = scorePair(stute, h);
    return { ...h, __score: totalScore, __debug: debug };
  }).sort((a,b) => b.__score - a.__score).slice(0,3);

  let html = `<div class="match">
    <h3>${escapeHtml(name)} — Besitzer: ${escapeHtml(owner)}</h3>
    <p>Farbgenetik Stute: ${escapeHtml(color)}</p>`;

  if(scored.length === 0){
    html += `<p><em>Keine passenden Hengste gefunden.</em></p>`;
  } else {
    html += `<ol>`;
    scored.forEach((h, i) => {
      html += `<li><strong>.${i+1} Wahl:</strong> ${escapeHtml(pickName(h))} — Farbe: ${escapeHtml(pickColor(h) || "-")} (Score: ${h.__score})</li>`;
      // Debug-Fenster
      html += `<details><summary>Debug: ${escapeHtml(pickName(h))}</summary><ul>`;
      h.__debug.forEach(d => {
        html += `<li><strong>${d.merkmal}:</strong> ${escapeHtml(d.details)} = ${d.score}</li>`;
      });
      html += `</ul></details>`;
    });
    html += `</ol>`;
  }
  html += `</div>`;
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
