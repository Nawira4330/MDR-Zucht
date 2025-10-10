// app.js – endgültige Version: Durchschnittsnoten (2 Dezimalstellen), Range, Score, sofortige Anzeige bei Auswahl

let stuten = [];
let hengste = [];

const NAME_KEYS = ["Name","Stutenname","Stute","name"];
const OWNER_KEYS = ["Besitzer","Owner","besitzer","owner"];
const COLOR_KEYS = ["Farbgenetik","Farbe","FarbGenetik","color","Genetik"];
const MERKMALE = [
  "Kopf","Gebiss","Hals","Halsansatz","Widerrist","Schulter","Brust",
  "Rückenlinie","Rückenlänge","Kruppe","Beinwinkelung","Beinstellung","Fesseln","Hufe"
];

// Hilfs-Zugriff: robust gegenüber Feldnamen
function pickField(obj, keys){
  for(const k of keys) if(obj && Object.prototype.hasOwnProperty.call(obj,k) && obj[k] !== undefined && obj[k] !== "") return obj[k];
  return "";
}
function pickName(obj){ return pickField(obj, NAME_KEYS) || "(ohne Name)"; }
function pickOwner(obj){ return pickField(obj, OWNER_KEYS) || "(kein Besitzer)"; }
function pickColor(obj){ return pickField(obj, COLOR_KEYS) || ""; }
function escapeHtml(s){ return String(s).replace(/[&<>"'\/]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;'}[c])); }

// Lade JSONs
async function ladeDaten(){
  try{
    const s = await fetch('data/stuten.json').then(r=>r.json());
    const h = await fetch('data/hengste.json').then(r=>r.json());
    stuten = Array.isArray(s)?s:[];
    hengste = Array.isArray(h)?h:[];
    // filter hengste ohne Merkmale
    hengste = hengste.filter(hg => MERKMALE.some(m => (hg[m] && String(hg[m]).trim() !== "")));
    fuelleDropdowns();
    // initial render (falls bereits Auswahl leer → zeigt alle)
    zeigeVorschlaege();
  }catch(e){
    console.error("Ladefehler:", e);
    document.getElementById('ergebnis').innerHTML = '<p style="color:red">Fehler beim Laden der Daten.</p>';
  }
}

// Dropdowns füllen
function fuelleDropdowns(){
  const sSel = document.getElementById('stuteSelect');
  const bSel = document.getElementById('besitzerSelect');
  sSel.innerHTML = '<option value="">– Alle Stuten –</option>';
  bSel.innerHTML = '<option value="">– Alle Besitzer –</option>';

  stuten.forEach((s, idx)=>{
    const opt = document.createElement('option'); opt.value = idx; opt.textContent = pickName(s);
    sSel.appendChild(opt);
  });

  const owners = [...new Set(stuten.map(s=>pickOwner(s)))].filter(x=>x && x!=="(kein Besitzer)");
  owners.forEach(o=>{
    const opt = document.createElement('option'); opt.value = o; opt.textContent = o;
    bSel.appendChild(opt);
  });

  // Listener: sofortige Anzeige bei Auswahl (Stute oder Besitzer)
  sSel.addEventListener('change', zeigeVorschlaege);
  bSel.addEventListener('change', zeigeVorschlaege);
}

// Genetik-Score (wie vorher) — unverändert
function scorePair(stute, hengst){
  let totalScore = 0, count = 0;
  for(const merk of MERKMALE){
    const sGenes = (stute[merk] || "").replace(/\|/g,"").trim().split(/\s+/);
    const hGenes = (hengst[merk] || "").replace(/\|/g,"").trim().split(/\s+/);
    if(sGenes.length < 8 || hGenes.length < 8) continue;
    let local=0;
    for(let i=0;i<8;i++){
      const S=sGenes[i], H=hGenes[i];
      const target = i < 4 ? "HH":"hh";
      let sc=0;
      if(target==="HH"){
        if(S==="hh"&&(H==="HH"||H==="Hh")) sc=1;
        else if(S==="Hh"&&(H==="HH"||H==="Hh")) sc=1;
        else if(S==="HH"&&(H==="HH"||H==="Hh")) sc=1;
        else if(S==="HH"&&H==="hh") sc=0;
        else sc=0.3;
      }else{
        if(S==="HH"&&(H==="hh"||H==="Hh")) sc=1;
        else if(S==="Hh"&&(H==="hh"||H==="Hh")) sc=1;
        else if(S==="hh"&&(H==="hh"||H==="Hh")) sc=1;
        else if(S==="hh"&&H==="HH") sc=0;
        else sc=0.3;
      }
      local += sc;
    }
    totalScore += local/8; count++;
  }
  return count>0 ? totalScore/count : 0;
}

// Fehler -> Note (deine Regeln): 0->1, 1->2, 2-3->3, >=4->5
function fehlerZuNote(fehler){
  if(fehler===0) return 1.0;
  if(fehler===1) return 2.0;
  if(fehler===2 || fehler===3) return 3.0;
  return 5.0;
}

// Durchschnittsnoten über alle MERKMALE berechnen (best & worst)
// best: durchschnitt der Best-Case-Noten (hier direkt aus fehler-Zählung)
// worst: simulate worst-case by doubling mismatches (or you can define other method)
// Rückgabe: { best: float, worst: float } mit ungerundeten Werten (runden beim Anzeigen)
function berechneNotenDurchschnitt(stute, hengst){
  const bestArr = [], worstArr = [];
  for(const merk of MERKMALE){
    // gene vor "|" und nach "|" können benutzt werden; wir nutzen gesamte Zeichenfolge
    const sRaw = (stute[merk] || "").replace(/\|/g," ").trim().split(/\s+/);
    const hRaw = (hengst[merk] || "").replace(/\|/g," ").trim().split(/\s+/);
    if(sRaw.length < 1 || hRaw.length < 1) continue;

    // vergleiche je Position (bis min length)
    let fehler = 0;
    for(let i=0;i<Math.min(sRaw.length,hRaw.length);i++){
      if(sRaw[i] !== hRaw[i]) fehler++;
    }
    const noteBest = fehlerZuNote(fehler);

    // Worst-case: z.B. doppelte Abweichungen (alternativ: andere Heuristik)
    const fehlerWorst = fehler * 2;
    const noteWorst = fehlerZuNote(fehlerWorst);

    bestArr.push(noteBest);
    worstArr.push(noteWorst);
  }

  const bestAvg = bestArr.length ? (bestArr.reduce((a,b)=>a+b,0) / bestArr.length) : 0;
  const worstAvg = worstArr.length ? (worstArr.reduce((a,b)=>a+b,0) / worstArr.length) : 0;
  return { best: bestAvg, worst: worstAvg };
}

// Notentext (interpretation)
function bewerteNoteText(n){
  if(n <= 1.5) return "Exzellent";
  if(n <= 2.5) return "Sehr gut";
  if(n <= 3.5) return "Gut";
  if(n <= 4.5) return "Befriedigend";
  return "Ausreichend";
}

// Erzeuge HTML für Top-3 (basierend auf Score) — zeigt Best/Worst als Durchschnitt (2 Dez)
function createTop3Html(stute){
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute) || "-";

  const scored = hengste
    .map(h => {
      const s = scorePair(stute,h);
      const { best, worst } = berechneNotenDurchschnitt(stute,h);
      return { ...h, __score: s, __best: best, __worst: worst, __range: (worst - best) };
    })
    .filter(h => h.__score > 0) // nur Hengste mit Score > 0
    .sort((a,b) => b.__score - a.__score) // primär Score für Top-3 Auswahl (wie vorher)
    .slice(0,3);

  let html = `<div class="match">
    <h3>${escapeHtml(name)}</h3>
    <div class="owner-name">${escapeHtml(owner)}</div>
    <p><b>Farbgenetik Stute:</b> ${escapeHtml(color)}</p>`;

  if(scored.length === 0){
    html += `<p><em>Keine passenden Hengste gefunden.</em></p>`;
  } else {
    html += `<div class="hengst-list">`;
    scored.forEach(h=>{
      const bestStr = h.__best.toFixed(2);
      const worstStr = h.__worst.toFixed(2);
      const rangeStr = (h.__range).toFixed(2);
      const scorePct = (h.__score * 100).toFixed(1);
      // data-attribute für Sortierung
      html += `<div class="hengst-card" data-best="${h.__best}" data-worst="${h.__worst}" data-range="${h.__range}" data-score="${h.__score}">
        • <strong>${escapeHtml(pickName(h))}</strong><br>
        <em>Farbgenetik:</em> ${escapeHtml(pickColor(h) || "-")}<br>
        <em>Beste Note:</em> ${bestStr} — ${bewerteNoteText(h.__best)}<br>
        <em>Schlechteste Note:</em> ${worstStr} — ${bewerteNoteText(h.__worst)}<br>
        <em>Range:</em> ${rangeStr} | <em>Score:</em> ${scorePct}%
      </div>`;
    });
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

// Anzeige je nach Auswahl (Stute Index oder Besitzer)
function zeigeVorschlaege(){
  const selStute = document.getElementById('stuteSelect').value;
  const selBesitzer = document.getElementById('besitzerSelect').value;
  const out = document.getElementById('ergebnis');
  out.innerHTML = '';

  let toShow = [];
  if(selStute !== ""){
    const idx = parseInt(selStute,10);
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

  // render each stute block
  out.innerHTML = toShow.map(s => createTop3Html(s)).join("");

  // direkt nach render: sortiere die drei Hengst-cards pro Stute nach Dropdown
  applySorting();
}

// Sorting Funktion: liest data-* und sortiert DOM
function applySorting(){
  const mode = document.getElementById('sortDropdown').value || 'best';
  document.querySelectorAll('.hengst-list').forEach(listWrap=>{
    // the .hengst-list in our HTML contains .hengst-card divs
    const cards = Array.from(listWrap.querySelectorAll('.hengst-card'));
    cards.sort((a,b)=>{
      const val = (el,attr)=>parseFloat(el.dataset[attr]) || 0;
      if(mode === 'score') return val(b,'score') - val(a,'score'); // desc
      if(mode === 'range') return val(a,'range') - val(b,'range'); // asc
      // default 'best' -> sort by best ascending
      return val(a,'best') - val(b,'best');
    });
    // re-append sorted
    cards.forEach(c => listWrap.appendChild(c));
  });
}

// Init + Eventlisteners
document.addEventListener('DOMContentLoaded', ()=>{
  ladeDaten();

  // Sort Dropdown listener + show on owner/stute already in fuelleDropdowns
  document.getElementById('sortDropdown').addEventListener('change', ()=>{
    // apply sorting to already rendered lists
    applySorting();
  });

  // Tabs (Infofenster)
  document.querySelectorAll('.tab-button').forEach(button=>{
    button.addEventListener('click', ()=>{
      document.querySelectorAll('.tab-button').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t=>t.classList.add('hidden'));
      button.classList.add('active');
      document.getElementById(button.dataset.tab).classList.remove('hidden');
    });
  });
});
