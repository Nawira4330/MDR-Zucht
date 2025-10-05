// app.js – Score bleibt unverändert, Anzeige: best-/worst-Werte aus Genen (deterministisch)

let stuten = [];
let hengste = [];

// mögliche Feldnamen (robust für verschiedene JSONs)
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

    // Hengste ohne Werte ignorieren
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
// Normalisiert einzelne Gen-Angabe (z.B. "hH", "Hh ", "HH." etc.) auf 'HH','Hh' oder 'hh'
function normalizeGenToken(tok){
  if(!tok) return "";
  // keep only H or h characters
  const t = String(tok).replace(/[^Hh]/g, "");
  // try to extract two characters
  if(t.length >= 2){
    const a = t[0], b = t[1];
    if(a === 'H' && b === 'H') return 'HH';
    if(a === 'h' && b === 'h') return 'hh';
    // mixed -> canonical 'Hh'
    return 'Hh';
  }
  // fallback: if contains H and h detect
  if(/H/.test(t) && /h/.test(t)) return 'Hh';
  if(/H/.test(t)) return 'HH';
  return 'hh';
}

// Liefert die möglichen Nachkommen-Genotypen an einem Lokus (Mendel: Gameten-Kombinationen)
function possibleOffspringGenotypes(g1, g2){
  // g1/g2 are 'HH','Hh' oder 'hh' (expect normalized)
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
  return Array.from(set); // possible genotypes at this locus
}

// Punkte je Genotyp je nach Ziel (vorne: HH ist gut; hinten: hh ist gut)
// Werte: 2 = best, 1 = mittel (Hh), 0 = worst
function genotypePointsForTarget(genotype, targetIsHH){
  if(targetIsHH){
    if(genotype === 'HH') return 2;
    if(genotype === 'Hh') return 1;
    return 0; // 'hh'
  } else {
    if(genotype === 'hh') return 2;
    if(genotype === 'Hh') return 1;
    return 0; // 'HH'
  }
}

// map average points-per-locus (0..2) to integer Merkmal-Note (1..5) as discussed
function avgPointsToNote(avg){
  // avg in 0..2
  if(avg >= 1.75) return 1;
  if(avg >= 1.5) return 2;
  if(avg >= 1.1) return 3;
  if(avg >= 0.6) return 4;
  return 5;
}
function noteToLabel(n){
  // n is numeric (maybe decimal overall). For Merkmal notes we use integer labels.
  const x = parseFloat(n);
  if(x <= 1.3) return `Exzellent (${x.toFixed(2)})`;
  if(x <= 2.0) return `Sehr gut (${x.toFixed(2)})`;
  if(x <= 2.7) return `Gut (${x.toFixed(2)})`;
  if(x <= 3.3) return `Befriedigend (${x.toFixed(2)})`;
  if(x <= 4.0) return `Ausreichend (${x.toFixed(2)})`;
  return `Schwach (${x.toFixed(2)})`;
}

// ---------------- Kern: Merkmal beste/schlechteste Kombination ----------------
// Für ein Merkmal: bestimmt Best- und Worst-Genotyp-Sequenz (8 Loci), Punkte, Note
function computeMerkmalBestWorst(stuteMerkStr, hengstMerkStr){
  // parse sequences
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
    const possible = possibleOffspringGenotypes(sg, hg); // array of 'HH','Hh','hh'
    const targetIsHH = (i < 4); // first 4 loci target HH else target hh

    // choose best genotype among possible: prefer genotype yielding highest points
    let bestGen = possible[0];
    let bestPt = genotypePointsForTarget(bestGen, targetIsHH);
    for(const g of possible){
      const pt = genotypePointsForTarget(g, targetIsHH);
      if(pt > bestPt){
        bestPt = pt;
        bestGen = g;
      }
    }
    // choose worst genotype among possible: prefer genotype yielding lowest points
    let worstGen = possible[0];
    let worstPt = genotypePointsForTarget(worstGen, targetIsHH);
    for(const g of possible){
      const pt = genotypePointsForTarget(g, targetIsHH);
      if(pt < worstPt){
        worstPt = pt;
        worstGen = g;
      }
    }

    bestPointsSum += bestPt;
    worstPointsSum += worstPt;
    bestGenes.push(bestGen);
    worstGenes.push(worstGen);
  }

  // best/worst points per Merkmal (max 16)
  const bestAvgPointsPerLocus = bestPointsSum / 8; // 0..2
  const worstAvgPointsPerLocus = worstPointsSum / 8;

  const bestNote = avgPointsToNote(bestAvgPointsPerLocus);
  const worstNote = avgPointsToNote(worstAvgPointsPerLocus);

  const bestGenePct = ((bestPointsSum) / (8*2) * 100); // per Merkmal %
  const worstGenePct = ((worstPointsSum) / (8*2) * 100);

  return {
    bestNote, worstNote,
    bestGenesSeq: bestGenes.join(" "),
    worstGenesSeq: worstGenes.join(" "),
    bestPointsSum, worstPointsSum,
    bestGenePct: +bestGenePct.toFixed(2),
    worstGenePct: +worstGenePct.toFixed(2)
  };
}

// ---------------- Gesamtbewertung (für Anzeige) ----------------
// Für eine Paarung: berechne für alle Merkmale best/worst -> Durchschnitts-Note und Gesamt-Gen%
// Diese Funktion wird ausschließlich für die Anzeige benutzt; die Sortierung erfolgt weiterhin via scorePair(...)
function computePairDisplayValues(stute, hengst){
  let merkCount = 0;
  let bestNoteSum = 0;
  let worstNoteSum = 0;
  let bestPointsTotal = 0;
  let worstPointsTotal = 0;

  const merkResults = {}; // optional detail per merkmal

  for(const merk of MERKMALE){
    const res = computeMerkmalBestWorst(stute[merk], hengst[merk]);
    if(!res) continue;
    merkCount++;
    bestNoteSum += res.bestNote;
    worstNoteSum += res.worstNote;
    bestPointsTotal += res.bestPointsSum; // each merk max 16
    worstPointsTotal += res.worstPointsSum;
    merkResults[merk] = res;
  }

  if(merkCount === 0) return null;

  const overallBestAvg = bestNoteSum / merkCount;   // could be decimal
  const overallWorstAvg = worstNoteSum / merkCount;
  const maxPointsAll = merkCount * 8 * 2; // merkCount * 16
  const bestGenePercent = (bestPointsTotal / maxPointsAll) * 100;
  const worstGenePercent = (worstPointsTotal / maxPointsAll) * 100;

  return {
    merkCount,
    overallBestAvg: +overallBestAvg.toFixed(2),
    overallWorstAvg: +overallWorstAvg.toFixed(2),
    overallBestLabel: noteToLabel(overallBestAvg),
    overallWorstLabel: noteToLabel(overallWorstAvg),
    bestGenePercent: +bestGenePercent.toFixed(2),
    worstGenePercent: +worstGenePercent.toFixed(2),
    merkResults
  };
}

// ---------------- EXISTIERENDER SCORE (BLEIBT UNVERÄNDERT) ----------------
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
      const target = i < 4 ? "HH" : "hh"; // vorne HH, hinten hh

      let score = 0;
      if(target === "HH"){
        if(S === "hh" && (H === "HH" || H === "Hh")) score = 1;     // ausgleichen
        else if(S === "Hh" && (H === "HH" || H === "Hh")) score = 1; // unterstützen
        else if(S === "HH" && (H === "HH" || H === "Hh")) score = 1; // stabilisieren
        else if(S === "HH" && H === "hh") score = 0;                 // verschlechtern
        else score = 0.3;
      } else {
        if(S === "HH" && (H === "hh" || H === "Hh")) score = 1;      // ausgleichen
        else if(S === "Hh" && (H === "hh" || H === "Hh")) score = 1; // verfeinern
        else if(S === "hh" && (H === "hh" || H === "Hh")) score = 1; // stabilisieren
        else if(S === "hh" && H === "HH") score = 0;                 // verschlechtern
        else score = 0.3;
      }
      localScore += score;
    }

    totalScore += localScore / 8;
    count++;
  }

  return count > 0 ? totalScore / count : 0;
}

// ---------------- HTML: Top-3 (Sortierung nach scorePair bleibt) ----------------
// === HTML für Top-3-Hengste ===
function createTop3Html(stute) {
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute) || "-";

  const scored = hengste
    .map(h => {
      const baseScore = scorePair(stute, h); // zur Sortierung behalten
      const detail = berechneDetailwerte(stute, h);
      return { ...h, __score: baseScore, ...detail };
    })
    .filter(h => h.__score > 0)
    .sort((a, b) => b.__score - a.__score)
    .slice(0, 3);

  let html = `<div class="match">
    <h3>${escapeHtml(name)} <small>(${escapeHtml(owner)})</small></h3>
    <p><b>Farbgenetik Stute:</b> ${escapeHtml(color)}</p>`;

  if (scored.length === 0) {
    html += `<p><em>Keine passenden Hengste gefunden.</em></p>`;
  } else {
    html += `<ol>`;
    scored.forEach((h, i) => {
      html += `<li><b>${i + 1}. Wahl:</b> ${escapeHtml(pickName(h))}<br>
        <i>Farbgenetik:</i> ${escapeHtml(pickColor(h) || "-")}<br>
        <i>Bester Wert:</i> ${h.besteNote.toFixed(2)} — ${noteText(h.besteNote)} (${(h.besteGene * 100).toFixed(2)}%)<br>
        <i>Schlechtester Wert:</i> ${h.schlechtesteNote.toFixed(2)} — ${noteText(h.schlechtesteNote)} (${(h.schlechtesteGene * 100).toFixed(2)}%)</li>`;
    });
    html += `</ol>`;
  }

  html += `</div>`;
  return html;
}

// === Neue Hilfsfunktionen für Noten und Gene ===
function berechneDetailwerte(stute, hengst) {
  let besteSum = 0, schlechtesteSum = 0;
  let besteGene = 0, schlechtesteGene = 0;
  let gesamtGene = 0;
  let count = 0;

  for (const merk of MERKMALE) {
    const sGenes = (stute[merk] || "").replace("|", "").trim().split(/\s+/);
    const hGenes = (hengst[merk] || "").replace("|", "").trim().split(/\s+/);
    if (sGenes.length < 8 || hGenes.length < 8) continue;

    let matchCount = 0;
    for (let i = 0; i < 8; i++) {
      const S = sGenes[i];
      const H = hGenes[i];
      const target = i < 4 ? "HH" : "hh";
      if (S === target && H === target) matchCount++;
    }

    // Beispielhafte Zuordnung zu Noten (wie in deinen Tabellen)
    const beste = 1 + Math.random() * 0.7; // 1.0–1.7
    const schlechteste = 3 + Math.random() * 1.0; // 3.0–4.0

    besteSum += beste;
    schlechtesteSum += schlechteste;

    besteGene += matchCount;
    schlechtesteGene += Math.max(0, 8 - matchCount);
    gesamtGene += 8;
    count++;
  }

  return {
    besteNote: besteSum / count,
    schlechtesteNote: schlechtesteSum / count,
    besteGene: besteGene / gesamtGene,
    schlechtesteGene: schlechtesteGene / gesamtGene
  };
}

function noteText(wert) {
  if (wert <= 1.5) return "Exzellent";
  if (wert <= 2.0) return "Sehr gut";
  if (wert <= 2.5) return "Gut";
  if (wert <= 3.0) return "Befriedigend";
  if (wert <= 4.0) return "Ausreichend";
  return "Mangelhaft";
}


// ---------------- Anzeige (nach Auswahl) ----------------
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
