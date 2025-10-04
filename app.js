// app.js - robust, flexible Feldnamen, Top3, Besitzer-Filter, alle anzeigen
let stuten = [];
let hengste = [];

// Mappings: mögliche Feldnamen in deinen JSONs
const NAME_KEYS = ["Name", "Stutenname", "Stute", "name"];
const OWNER_KEYS = ["Besitzer", "Owner", "besitzer", "owner"];
const COLOR_KEYS = ["Farbgenetik", "Farbe", "FarbGenetik", "color", "Genetik"];

// Liste der Exterieur-Merkmale (achte dass deine JSON diese Spalten enthält)
const MERKMALE = ["Kopf","Gebiss","Hals","Halsansatz","Widerrist","Schulter","Brust",
                  "Rückenlinie","Rückenlänge","Kruppe","Beinwinkelung","Beinstellung","Fesseln","Hufe"];

// Hilfsfunktionen zum sicheren Zugriff
function pickField(obj, keys){
  for(const k of keys) if(obj && Object.prototype.hasOwnProperty.call(obj,k) && obj[k] !== undefined && obj[k] !== "") return obj[k];
  return "";
}
function pickName(obj){ return pickField(obj, NAME_KEYS) || "(ohne Name)"; }
function pickOwner(obj){ return pickField(obj, OWNER_KEYS) || "(kein Besitzer)"; }
function pickColor(obj){ return pickField(obj, COLOR_KEYS) || ""; }

// Lädt JSONs
async function ladeDaten(){
  try{
    const s = await fetch('data/stuten.json').then(r => r.json());
    const h = await fetch('data/hengste.json').then(r => r.json());
    stuten = Array.isArray(s) ? s : [];
    hengste = Array.isArray(h) ? h : [];

    // Filter: ignorieren Hengste ohne jegliche Merkmale (optional)
    hengste = hengste.filter(hg => MERKMALE.some(m => (hg[m] !== undefined && String(hg[m]).trim() !== "")));

    fuelleDropdowns();
  }catch(e){
    console.error("Fehler beim Laden der Daten:", e);
    document.getElementById('ergebnis').innerHTML = '<p style="color:red">Fehler beim Laden der Daten. Prüfe data/stuten.json und data/hengste.json.</p>';
  }
}

// Dropdowns befüllen
function fuelleDropdowns(){
  const selStute = document.getElementById('stuteSelect');
  const selBesitzer = document.getElementById('besitzerSelect');
  selStute.innerHTML = '<option value="">-- bitte wählen --</option>';
  selBesitzer.innerHTML = '<option value="">-- bitte wählen --</option>';

  // Namen einfügen (Index als value)
  stuten.forEach((s, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = pickName(s);
    selStute.appendChild(opt);
  });

  // Besitzerliste (unique)
  const owners = [...new Set(stuten.map(s => pickOwner(s)))].filter(x => x && x !== "(kein Besitzer)");
  owners.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o;
    selBesitzer.appendChild(opt);
  });
}

// Scoring-Funktion (du kannst hier deine exakte genetische Logik einbauen)
// Diese simple Version bewertet Übereinstimmung pro Merkmal: identisch = besser.
function scorePair(stute, hengst){
  let score = 0;
  for(const m of MERKMALE){
    const sv = stute[m] !== undefined ? String(stute[m]).trim() : "";
    const hv = hengst[m] !== undefined ? String(hengst[m]).trim() : "";
    if(!sv || !hv) continue;
    score += (sv === hv) ? 2 : 0; // Matching gives 2 points, non-match 0
  }
  return score;
}

// Erzeuge Top3 HTML für eine Stute
function createTop3Html(stute){
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute) || "-";

  // compute scores
  const scored = hengste
    .map(h => ({...h, __score: scorePair(stute, h)}))
    .sort((a,b) => b.__score - a.__score)
    .slice(0,3);

  let html = `<div class="match"><h3>${escapeHtml(name)} — Besitzer: ${escapeHtml(owner)}</h3>`;
  html += `<p>Farbgenetik Stute: ${escapeHtml(color)}</p>`;
  if(scored.length === 0) html += `<p><em>Keine passenden Hengste gefunden.</em></p>`;
  else {
    html += `<ol>`;
    scored.forEach((h, i) => {
      html += `<li><strong>${i+1}. Wahl:</strong> ${escapeHtml(pickName(h))} — Farbe: ${escapeHtml(pickColor(h) || "-")} (Score: ${h.__score})</li>`;
    });
    html += `</ol>`;
  }
  html += `</div>`;
  return html;
}

// Zeige Vorschläge (je nach Auswahl)
function zeigeVorschlaege(){
  const selStute = document.getElementById('stuteSelect').value;
  const selBesitzer = document.getElementById('besitzerSelect').value;
  const out = document.getElementById('ergebnis');
  out.innerHTML = '';

  let toShow = [];

  if(selStute !== ""){
    // einzelne Stute (value ist Index)
    const idx = parseInt(selStute, 10);
    if(!Number.isNaN(idx) && stuten[idx]) toShow.push(stuten[idx]);
  } else if(selBesitzer !== ""){
    // alle Stuten dieses Besitzers
    toShow = stuten.filter(s => pickOwner(s) === selBesitzer);
  } else {
    // keine Auswahl -> alle Stuten
    toShow = stuten;
  }

  if(toShow.length === 0){
    out.innerHTML = '<p>Keine Stuten gefunden (prüfe JSON und Feldnamen).</p>';
    return;
  }

  // build html
  let html = '';
  toShow.forEach(s => html += createTop3Html(s));
  out.innerHTML = html;
}

// Zeige alle (Button)
function zeigeAlle(){
  document.getElementById('stuteSelect').value = '';
  document.getElementById('besitzerSelect').value = '';
  zeigeVorschlaege();
}

// einfache HTML-escape
function escapeHtml(s){ return String(s).replace(/[&<>"'\/]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;'}[c])); }

window.addEventListener('DOMContentLoaded', ladeDaten);
