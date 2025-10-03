// app.js
const traits = ["Kopf","Gebiss","Hals","Halsansatz","Widerrist","Schulter","Brust","Rückenlinie","Rückenlänge","Kruppe","Beinwinkelung","Beinstellung","Fesseln","Hufe"];

let stuten = [], hengste = [];

// Hilfsfunktionen zur Genanalyse
function normalizeToken(t){
  if(!t) return "hh";
  const only = (""+t).replace(/[^Hh]/g,'');
  const countH = (only.match(/H/g)||[]).length;
  if(countH===2) return "HH";
  if(countH===1) return "Hh";
  return "hh";
}
function parseGenCode(s){
  if(!s) return Array(8).fill("hh");
  const cleaned = s.replace(/\|/g,' ').trim();
  const parts = cleaned.split(/\s+/).filter(x=>x.length>0);
  const res = [];
  for(let i=0;i<8;i++){
    res.push(normalizeToken(parts[i] || "hh"));
  }
  return res;
}
function gameteDist(gen){
  if(gen==="HH") return {H:1};
  if(gen==="hh") return {h:1};
  return {H:0.5,h:0.5};
}
function childGenProbs(gen1,gen2){
  const g1 = gameteDist(gen1), g2 = gameteDist(gen2);
  const probs = {HH:0, Hh:0, hh:0};
  for(const a of Object.keys(g1)){
    for(const b of Object.keys(g2)){
      const p = g1[a]*g2[b];
      const child = (a==='H' && b==='H') ? 'HH' : (a==='h' && b==='h') ? 'hh' : 'Hh';
      probs[child] += p;
    }
  }
  return probs;
}
function scoreGenotype(gen, isFront){
  const ideal = isFront ? 'HH' : 'hh';
  if(gen===ideal) return 0;
  if(gen==='Hh') return 1;
  return 2;
}
function expectedLocusScore(parent1Gen, parent2Gen, locusIndex){
  const isFront = locusIndex < 4;
  const probs = childGenProbs(parent1Gen, parent2Gen);
  let exp = 0;
  for(const g of ['HH','Hh','hh']){
    exp += probs[g] * scoreGenotype(g, isFront);
  }
  return exp;
}
function expectedTraitScore(stuteTraitStr, hengstTraitStr){
  const sParts = parseGenCode(stuteTraitStr);
  const hParts = parseGenCode(hengstTraitStr);
  let sum = 0;
  for(let i=0;i<8;i++){
    sum += expectedLocusScore(sParts[i], hParts[i], i);
  }
  return sum;
}
function totalScoreForPair(stuteObj, hengstObj){
  let s = 0;
  for(const t of traits){
    s += expectedTraitScore(stuteObj[t]||"", hengstObj[t]||"");
  }
  return s;
}

// UI helpers
const sel = document.getElementById('stuteSelect');
const resultDiv = document.getElementById('result');
const hengsteTableBody = document.querySelector('#hengsteTable tbody');

async function loadData(){
  try{
    stuten = await fetch('data/stuten.json').then(r=>r.json());
    hengste = await fetch('data/hengste.json').then(r=>r.json());
  }catch(e){
    console.error("Fehler beim Laden der JSONs:", e);
    resultDiv.innerHTML = "<p style='color:red'>Fehler beim Laden der JSON-Daten. Prüfe data/stuten.json und data/hengste.json im Repo.</p>";
    return;
  }
  populateStuteSelect();
}
function populateStuteSelect(){
  sel.innerHTML = '<option value="">-- bitte wählen --</option>';
  stuten.forEach(s => {
    const name = s.Name || s.name || s.Name_of_Stute || "";
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name + (s.Besitzer ? ` — ${s.Besitzer}` : '');
    sel.appendChild(opt);
  });
}

function computeRankedForStute(stute){
  const rows = hengste
    .filter(h => {
      // ignore hengste ohne traitwerte (nur Name vorhanden)
      return traits.some(t => (h[t] && (""+h[t]).trim().length>0));
    })
    .map(h => ({...h, score: totalScoreForPair(stute, h)}))
    .sort((a,b)=>a.score - b.score);
  return rows;
}

function showTopForSelected(){
  const name = sel.value;
  if(!name){ resultDiv.innerHTML = "<p>Bitte Stute auswählen.</p>"; return; }
  const st = stuten.find(s => (s.Name||s.name||"")===name);
  if(!st){ resultDiv.innerHTML = "<p>Stute nicht gefunden.</p>"; return; }

  const ranked = computeRankedForStute(st);
  const top3 = ranked.slice(0,3);
  // Ergebnis darstellen (Stute mit Besitzer + Farbgenetik, Top3 Hengste mit Farbgenetik)
  let html = `<h2>${st.Name} ${st.Besitzer ? " — Besitzer: "+st.Besitzer : ""}</h2>`;
  html += `<p>Farbgenetik Stute: ${st.Farbgenetik || st.Farbe || ""}</p>`;
  if(top3.length===0) html += "<p>Keine gültigen Hengste gefunden.</p>";
  else {
    html += "<ol>";
    top3.forEach((h,i)=>{
      html += `<li><strong>${i+1}. Wahl:</strong> ${h.Name} — Farbgenetik: ${h.Farbgenetik || h.Farbe || ""} (Score: ${h.score.toFixed(3)})</li>`;
    });
    html += "</ol>";
  }
  resultDiv.innerHTML = html;

  // Tabelle mit allen Hengsten füllen (sortiert)
  hengsteTableBody.innerHTML = "";
  ranked.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.Name}</td><td>${r.Farbgenetik || r.Farbe || ""}</td><td>${r.score.toFixed(3)}</td>`;
    hengsteTableBody.appendChild(tr);
  });
}

function showAllMatches(){
  let html = "";
  stuten.forEach(st => {
    html += `<div class="match"><h3>${st.Name} ${st.Besitzer ? "— "+st.Besitzer : ""}</h3>`;
    html += `<p>Farbgenetik: ${st.Farbgenetik || st.Farbe || ""}</p>`;
    const ranked = computeRankedForStute(st).slice(0,3);
    if(ranked.length===0) html += "<p>Keine gültigen Hengste.</p>";
    else {
      html += "<ol>";
      ranked.forEach((h,i)=> html += `<li>${i+1}. ${h.Name} — Farbe: ${h.Farbgenetik || ""} (Score: ${h.score.toFixed(3)})</li>`);
      html += "</ol>";
    }
    html += "</div><hr/>";
  });
  resultDiv.innerHTML = html;
  hengsteTableBody.innerHTML = "";
}

// Events
document.getElementById('btnShowSelected').addEventListener('click', showTopForSelected);
document.getElementById('btnShowAll').addEventListener('click', showAllMatches);
loadData();
