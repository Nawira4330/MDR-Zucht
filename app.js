// app.js – Version mit Genetik-Scoring + beste/schlechteste Werteanzeige

let stuten = [];
let hengste = [];

const NAME_KEYS = ["Name", "Stutenname", "Stute", "name"];
const OWNER_KEYS = ["Besitzer", "Owner", "besitzer", "owner"];
const COLOR_KEYS = ["Farbgenetik", "Farbe", "FarbGenetik", "color", "Genetik"];

const MERKMALE = [
  "Kopf","Gebiss","Hals","Halsansatz","Widerrist","Schulter","Brust",
  "Rückenlinie","Rückenlänge","Kruppe","Beinwinkelung","Beinstellung","Fesseln","Hufe"
];

// === Hilfsfunktionen ===
function pickField(obj, keys){
  for(const k of keys)
    if(obj && Object.prototype.hasOwnProperty.call(obj,k) && obj[k] !== undefined && obj[k] !== "")
      return obj[k];
  return "";
}
function pickName(obj){ return pickField(obj, NAME_KEYS) || "(ohne Name)"; }
function pickOwner(obj){ return pickField(obj, OWNER_KEYS) || "(kein Besitzer)"; }
function pickColor(obj){ return pickField(obj, COLOR_KEYS) || ""; }
function escapeHtml(s){ return String(s).replace(/[&<>"'\/]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;'}[c])); }

// === JSON-Daten laden ===
async function ladeDaten(){
  try{
    const s = await fetch('data/stuten.json').then(r => r.json());
    const h = await fetch('data/hengste.json').then(r => r.json());
    stuten = Array.isArray(s) ? s : [];
    hengste = Array.isArray(h) ? h : [];

    hengste = hengste.filter(hg => MERKMALE.some(m => (hg[m] && String(hg[m]).trim() !== "")));

    fuelleDropdowns();
  }catch(e){
    console.error("Fehler beim Laden:", e);
    document.getElementById('ergebnis').innerHTML =
      '<p style="color:red">Fehler beim Laden der Daten. Prüfe data/*.json.</p>';
  }
}

// === Dropdowns befüllen ===
function fuelleDropdowns(){
  const selStute = document.getElementById('stuteSelect');
  const selBesitzer = document.getElementById('besitzerSelect');
  selStute.innerHTML = '<option value="">– Alle Stuten –</option>';
  selBesitzer.innerHTML = '<option value="">– Alle Besitzer –</option>';

  stuten.forEach((s, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = pickName(s);
    selStute.appendChild(opt);
  });

  const owners = [...new Set(stuten.map(s => pickOwner(s)))].filter(x => x && x !== "(kein Besitzer)");
  owners.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o;
    selBesitzer.appendChild(opt);
  });
}

// === GENETIK- & WERT-LOGIK ===
function berechneWerte(stute, hengst){
  let besteSumme = 0, schlechtesteSumme = 0, count = 0;
  let besteGene = 0, schlechtesteGene = 0, gesamtGene = 0;

  for(const merk of MERKMALE){
    const sGene = (stute[merk] || "").replace("|","").trim().split(/\s+/);
    const hGene = (hengst[merk] || "").replace("|","").trim().split(/\s+/);
    if(sGene.length < 8 || hGene.length < 8) continue;

    // simulierte Bewertungsskala (1=sehr gut, 5=schlecht)
    const bestNote = Math.random() * 0.4 + 1.0;   // z.B. 1.00–1.40
    const worstNote = Math.random() * 0.4 + 4.0;  // z.B. 4.00–4.40
    besteSumme += bestNote;
    schlechtesteSumme += worstNote;

    // genetische Bewertung (%)
    let geneScore = 0;
    for(let i=0;i<8;i++){
      const S = sGene[i], H = hGene[i];
      const target = i < 4 ? "HH" : "hh";
      if(target === "HH"){
        if((S==="HH"||S==="Hh") && (H==="HH"||H==="Hh")) geneScore++;
      } else {
        if((S==="hh"||S==="Hh") && (H==="hh"||H==="Hh")) geneScore++;
      }
    }
    besteGene += geneScore;
    schlechtesteGene += 8 - geneScore;
    gesamtGene += 8;
    count++;
  }

  const besteNote = count ? (besteSumme / count).toFixed(2) : "-";
  const schlechtesteNote = count ? (schlechtesteSumme / count).toFixed(2) : "-";
  const besteGenProzent = gesamtGene ? ((besteGene / gesamtGene) * 100).toFixed(2) : "-";
  const schlechtesteGenProzent = gesamtGene ? ((schlechtesteGene / gesamtGene) * 100).toFixed(2) : "-";

  return {besteNote, schlechtesteNote, besteGenProzent, schlechtesteGenProzent};
}

// === HTML für Top-3-Hengste ===
function createTop3Html(stute){
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute) || "-";

  const scored = hengste
    .map(h => ({...h, __werte: berechneWerte(stute, h)}))
    .slice(0,3);

  let html = `<div class="match"><h3>${escapeHtml(name)} <small>(${escapeHtml(owner)})</small></h3>`;
  html += `<p><b>Farbgenetik Stute:</b> ${escapeHtml(color)}</p>`;

  if(scored.length === 0){
    html += `<p><em>Keine passenden Hengste gefunden.</em></p>`;
  } else {
    html += `<ol>`;
    scored.forEach((h,i)=>{
      const w = h.__werte;
      html += `<li><b>${i+1}. Wahl:</b> ${escapeHtml(pickName(h))} 
               <br><i>Farbgenetik:</i> ${escapeHtml(pickColor(h) || "-")} 
               <br><b>Bester Wert:</b> ${w.besteNote} (${w.besteGenProzent}%)
               <br><b>Schlechtester Wert:</b> ${w.schlechtesteNote} (${w.schlechtesteGenProzent}%)</li>`;
    });
    html += `</ol>`;
  }
  html += `</div>`;
  return html;
}

// === Anzeige (nach Auswahl) ===
function zeigeVorschlaege(){
  const selStute = document.getElementById('stuteSelect').value;
  const selBesitzer = document.getElementById('besitzerSelect').value;
  const out = document.getElementById('ergebnis');
  out.innerHTML = '';

  let toShow = [];
  if(selStute !== ""){
    const idx = parseInt(selStute, 10);
    if(!Number.isNaN(idx) && stuten[idx]) toShow.push(stuten[idx]);
  } else if(selBesitzer !== ""){
    toShow = stuten.filter(s => pickOwner(s) === selBesitzer);
  } else {
    toShow = stuten;
  }

  if(toShow.length === 0){
    out.innerHTML = '<p>Keine Stuten gefunden.</p>';
    return;
  }

  out.innerHTML = toShow.map(s => createTop3Html(s)).join("");
}

function zeigeAlle(){
  document.getElementById('stuteSelect').value = '';
  document.getElementById('besitzerSelect').value = '';
  zeigeVorschlaege();
}

window.addEventListener('DOMContentLoaded', () => {
  ladeDaten();
  document.getElementById('stuteSelect').addEventListener('change', zeigeVorschlaege);
  document.getElementById('besitzerSelect').addEventListener('change', zeigeVorschlaege);
});
