// app.js – Genetik-Scoring (Variante 3) & Anzeige best-/worst-Note (screenshot-kompatibel)
// Sortierung bleibt unverändert (scorePair unverändert), Anzeige angepasst.

let stuten = [];
let hengste = [];

// mögliche Feldnamen
const NAME_KEYS = ["Name", "Stutenname", "Stute", "name"];
const OWNER_KEYS = ["Besitzer", "Owner", "besitzer", "owner"];
const COLOR_KEYS = ["Farbgenetik", "Farbe", "FarbGenetik", "color", "Genetik"];

// Exterieur-Merkmale
const MERKMALE = [
  "Kopf","Gebiss","Hals","Halsansatz","Widerrist","Schulter","Brust",
  "Rückenlinie","Rückenlänge","Kruppe","Beinwinkelung","Beinstellung","Fesseln","Hufe"
];

// ---------------- Hilfsfunktionen ----------------
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

// ---------------- Daten laden ----------------
async function ladeDaten(){
  try{
    const s = await fetch('data/stuten.json').then(r => r.json());
    const h = await fetch('data/hengste.json').then(r => r.json());
    stuten = Array.isArray(s) ? s : [];
    hengste = Array.isArray(h) ? h : [];

    // Hengste ohne Exterieurwerte ignorieren
    hengste = hengste.filter(hg => MERKMALE.some(m => (hg[m] && String(hg[m]).trim() !== "")));

    fuelleDropdowns();
  }catch(e){
    console.error("Fehler beim Laden:", e);
    const el = document.getElementById('ergebnis');
    if(el) el.innerHTML = '<p style="color:red">Fehler beim Laden der Daten. Prüfe data/*.json.</p>';
  }
}

// ---------------- Dropdowns ----------------
function fuelleDropdowns(){
  const selStute = document.getElementById('stuteSelect');
  const selBesitzer = document.getElementById('besitzerSelect');
  if(!selStute || !selBesitzer) return;
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

// ---------------- Gen-Utilities ----------------
// Normalisiert Token wie "hH","Hh","HH","hh" -> 'HH'/'Hh'/'hh'
function normalizeGenToken(tok){
  if(!tok) return "";
  const t = String(tok).replace(/[^Hh]/g,"");
  if(t.length >= 2){
    const a = t[0], b = t[1];
    if(a === 'H' && b === 'H') return 'HH';
    if(a === 'h' && b === 'h') return 'hh';
    return 'Hh';
  }
  if(/H/.test(t) && /h/.test(t)) return 'Hh';
  if(/H/.test(t)) return 'HH';
  return 'hh';
}

// mögliche Offspring-Genotypen für zwei Elterngen an einem Lokus
function possibleOffspringGenotypes(g1, g2){
  const gam1 = (g1 === 'HH') ? ['H'] : (g1 === 'hh') ? ['h'] : ['H','h'];
  const gam2 = (g2 === 'HH') ? ['H'] : (g2 === 'hh') ? ['h'] : ['H','h'];
  const set = new Set();
  for(const a of gam1){
    for(const b of gam2){
      if(a === 'H' && b === 'H') set.add('HH');
      else if(a === 'h' && b === 'h') set.add('hh');
      else set.add('Hh');
    }
  }
  return Array.from(set);
}

// Punktebewertung pro Genotyp nach Ziel: vorne targetIsHH=true
// Punktsystem: beste Genotyp -> 2, Hh -> 1, schlechteste -> 0
function genotypePointsForTarget(genotype, targetIsHH){
  if(targetIsHH){
    if(genotype === 'HH') return 2;
    if(genotype === 'Hh') return 1;
    return 0;
  } else {
    if(genotype === 'hh') return 2;
    if(genotype === 'Hh') return 1;
    return 0;
  }
}

// ---------------- Merkmal: best/worst per Merkmal ----------------
function computeMerkmalBestWorst(stuteMerkStr, hengstMerkStr){
  const sTokens = (stuteMerkStr || "").replace(/\|/g," ").trim().split(/\s+/).map(normalizeGenToken).filter(Boolean);
  const hTokens = (hengstMerkStr || "").replace(/\|/g," ").trim().split(/\s+/).map(normalizeGenToken).filter(Boolean);
  if(sTokens.length < 8 || hTokens.length < 8) return null;

  let bestPointsSum = 0;
  let worstPointsSum = 0;
  const bestGenes = [];
  const worstGenes = [];

  for(let i=0;i<8;i++){
    const sg = sTokens[i];
    const hg = hTokens[i];
    const possible = possibleOffspringGenotypes(sg, hg); // ['HH','Hh','hh']
    const targetIsHH = (i < 4);

    // best genotype = one with max points; worst genotype = min points
    let bestGen = possible[0], bestPt = genotypePointsForTarget(bestGen, targetIsHH);
    let worstGen = possible[0], worstPt = bestPt;

    for(const g of possible){
      const pt = genotypePointsForTarget(g, targetIsHH);
      if(pt > bestPt){ bestPt = pt; bestGen = g; }
      if(pt < worstPt){ worstPt = pt; worstGen = g; }
    }

    bestPointsSum += bestPt;   // bestPt in {0,1,2}
    worstPointsSum += worstPt; // worstPt in {0,1,2}
    bestGenes.push(bestGen);
    worstGenes.push(worstGen);
  }

  return {
    bestPointsSum,           // 0..16 (per Merkmal)
    worstPointsSum,          // 0..16
    bestGenesSeq: bestGenes.join(" "),
    worstGenesSeq: worstGenes.join(" ")
  };
}

// ---------------- Anzeige-Berechnung für Paarung ----------------
function computePairDisplayValues(stute, hengst){
  let merkCount = 0;
  let bestPointsTotal = 0;
  let worstPointsTotal = 0;
  const merkDetails = {};

  for(const merk of MERKMALE){
    const res = computeMerkmalBestWorst(stute[merk], hengst[merk]);
    if(!res) continue;
    merkCount++;
    bestPointsTotal += res.bestPointsSum;   // sum of points (per merk max 16)
    worstPointsTotal += res.worstPointsSum;
    merkDetails[merk] = res;
  }

  if(merkCount === 0) return null;

  // avg points per locus (0..2)
  const avgBestPerLocus = bestPointsTotal / (merkCount * 8);
  const avgWorstPerLocus = worstPointsTotal / (merkCount * 8);

  // Legacy linear mapping (fit an die Screenshot-Skala -> reproduziert 1.36 / 4.36 bei deinen Daten)
  function pointsToNote_legacy(avgPerLocus){
    const A = 7.1435051546391755;
    const B = -3.4639175257731956;
    return +(A + B * avgPerLocus).toFixed(2);
  }

  const bestNote = pointsToNote_legacy(avgBestPerLocus);
  const worstNote = pointsToNote_legacy(avgWorstPerLocus);

  // Gen%-Werte (gesamt): bestPointsTotal / maxPossiblePoints
  const maxPointsAll = merkCount * 8 * 2; // merkCount * 16
  const bestGenePercent = +(bestPointsTotal / maxPointsAll * 100).toFixed(2);
  const worstGenePercent = +(worstPointsTotal / maxPointsAll * 100).toFixed(2);

  // label für Note (für Textanzeige)
  function noteLabel(n){
    if(n <= 1.5) return "Exzellent";
    if(n <= 2.5) return "Sehr gut";
    if(n <= 3.5) return "Gut";
    if(n <= 4.5) return "Ausreichend";
    return "Schwach";
  }

  return {
    merkCount,
    bestNote,
    worstNote,
    bestLabel: noteLabel(bestNote),
    worstLabel: noteLabel(worstNote),
    bestGenePercent,
    worstGenePercent,
    merkDetails
  };
}

// ---------------- EXISTIERENDE Ranglogik (BLEIBT) ----------------
function scorePair(stute, hengst){
  let totalScore = 0;
  let count = 0;

  for(const merk of MERKMALE){
    const sGenes = (stute[merk] || "").replace("|", "").trim().split(/\s+/);
    const hGenes = (hengst[merk] || "").replace("|", "").trim().split(/\s+/);
    if(sGenes.length < 8 || hGenes.length < 8) continue;

    let localScore = 0;

    for(let i=0; i<8; i++){
      const S = sGenes[i];
      const H = hGenes[i];
      const target = i < 4 ? "HH" : "hh";

      let score = 0;
      if(target === "HH"){
        if(S === "hh" && (H === "HH" || H === "Hh")) score = 1;
        else if(S === "Hh" && (H === "HH" || H === "Hh")) score = 1;
        else if(S === "HH" && (H === "HH" || H === "Hh")) score = 1;
        else if(S === "HH" && H === "hh") score = 0;
        else score = 0.3;
      } else {
        if(S === "HH" && (H === "hh" || H === "Hh")) score = 1;
        else if(S === "Hh" && (H === "hh" || H === "Hh")) score = 1;
        else if(S === "hh" && (H === "hh" || H === "Hh")) score = 1;
        else if(S === "hh" && H === "HH") score = 0;
        else score = 0.3;
      }
      localScore += score;
    }

    totalScore += localScore / 8;
    count++;
  }

  return count > 0 ? totalScore / count : 0;
}

// ---------------- HTML: Top-3 anzeigen (Sortierung nach scorePair bleibt) ----------------
function createTop3Html(stute){
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute) || "-";

  const scored = hengste
    .map(h => ({...h, __score: scorePair(stute, h)}))
    .filter(h => h.__score > 0)
    .sort((a,b) => b.__score - a.__score)
    .slice(0,3);

  let html = `<div class="match"><h3>${escapeHtml(name)} <small>(${escapeHtml(owner)})</small></h3>`;
  html += `<p><b>Farbgenetik Stute:</b> ${escapeHtml(color)}</p>`;

  if(scored.length === 0) {
    html += `<p><em>Keine passenden Hengste gefunden.</em></p>`;
  } else {
    html += `<ul>`;
    scored.forEach((h,i)=>{
      const disp = computePairDisplayValues(stute, h);
      if(!disp) return;
      html += `<li>
        <b>${i+1}. Wahl:</b> ${escapeHtml(pickName(h))}<br>
        <i>Farbgenetik:</i> ${escapeHtml(pickColor(h) || "-")}<br>
        <b>Bester Wert:</b> ${disp.bestNote.toFixed(2)} — ${escapeHtml(disp.bestLabel)} (${disp.bestGenePercent}% )<br>
        <b>Schlechtester Wert:</b> ${disp.worstNote.toFixed(2)} — ${escapeHtml(disp.worstLabel)} (${disp.worstGenePercent}% )
      </li>`;
    });
    html += `</ul>`;
  }

  html += `</div>`;
  return html;
}

// ---------------- Anzeige-Steuerung ----------------
function zeigeVorschlaege(){
  const selStute = document.getElementById('stuteSelect').value;
  const selBesitzer = document.getElementById('besitzerSelect').value;
  const out = document.getElementById('ergebnis');
  if(!out) return;
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

// ---------------- Init ----------------
window.addEventListener('DOMContentLoaded', () => {
  ladeDaten();
  const stSel = document.getElementById('stuteSelect');
  const bSel  = document.getElementById('besitzerSelect');
  if(stSel) stSel.addEventListener('change', zeigeVorschlaege);
  if(bSel)  bSel.addEventListener('change', zeigeVorschlaege);
});
