// ===============================================================
// app.js – Version mit Genetik-Scoring (Variante 3)
// & Anzeige der besten/schlechtesten Werte + Sortierauswahl
// ===============================================================

let stuten = [];
let hengste = [];
let sortierModus = "score"; // "score", "besteNote", "range"

const NAME_KEYS = ["Name", "Stutenname", "Stute", "name"];
const OWNER_KEYS = ["Besitzer", "Owner", "besitzer", "owner"];
const COLOR_KEYS = ["Farbgenetik", "Farbe", "FarbGenetik", "color", "Genetik"];

const MERKMALE = [
  "Kopf", "Gebiss", "Hals", "Halsansatz", "Widerrist",
  "Schulter", "Brust", "Rückenlinie", "Rückenlänge",
  "Kruppe", "Beinwinkelung", "Beinstellung", "Fesseln", "Hufe"
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

// === Genetik-Scoring (Variante 3) ===
function scorePair(stute, hengst){
  let totalScore = 0;
  let count = 0;

  for(const merk of MERKMALE){
    const sGenes = (stute[merk] || "").replace("|","").trim().split(/\s+/);
    const hGenes = (hengst[merk] || "").replace("|","").trim().split(/\s+/);
    if(sGenes.length < 8 || hGenes.length < 8) continue;

    let localScore = 0;
    for(let i=0;i<8;i++){
      const S=sGenes[i], H=hGenes[i];
      const target=i<4?"HH":"hh"; 
      let score=0;
      if(target==="HH"){
        if(S==="hh"&&(H==="HH"||H==="Hh"))score=1;
        else if(S==="Hh"&&(H==="HH"||H==="Hh"))score=1;
        else if(S==="HH"&&(H==="HH"||H==="Hh"))score=1;
        else if(S==="HH"&&H==="hh")score=0;
        else score=0.3;
      }else{
        if(S==="HH"&&(H==="hh"||H==="Hh"))score=1;
        else if(S==="Hh"&&(H==="hh"||H==="Hh"))score=1;
        else if(S==="hh"&&(H==="hh"||H==="Hh"))score=1;
        else if(S==="hh"&&H==="HH")score=0;
        else score=0.3;
      }
      localScore+=score;
    }
    totalScore+=localScore/8;
    count++;
  }
  return count>0?totalScore/count:0;
}

// === Beste/schlechteste Note (exakt nach Screenshot-System) ===
function berechneNoten(stute, hengst){
  let merkmalNoten = [];

  for (const merk of MERKMALE) {
    const s = (stute[merk] || "").replace("|", "").trim().split(/\s+/);
    const h = (hengst[merk] || "").replace("|", "").trim().split(/\s+/);
    if (s.length < 8 || h.length < 8) continue;

    let teilNoten = [];

    // Jede der 8 Genpositionen bewerten
    for (let i = 0; i < 8; i++) {
      const S = s[i];
      const H = h[i];
      let note = 4.0;

      // realistischere Bewertungsskala nach deinem Excel
      if (S === "HH" && H === "HH") note = 1.0;
      else if ((S === "HH" && H === "Hh") || (S === "Hh" && H === "HH")) note = 1.3;
      else if (S === "Hh" && H === "Hh") note = 1.7;
      else if ((S === "HH" && H === "hh") || (S === "hh" && H === "HH")) note = 3.5;
      else if ((S === "Hh" && H === "hh") || (S === "hh" && H === "Hh")) note = 2.3;
      else if (S === "hh" && H === "hh") note = 3.0;
      else note = 4.5;

      teilNoten.push(note);
    }

    // Durchschnittsnote pro Merkmal (Kopf, Hals, ...)
    const merkAvg = teilNoten.reduce((a, b) => a + b, 0) / teilNoten.length;
    merkmalNoten.push(merkAvg);
  }

  if (merkmalNoten.length === 0) return { beste: 0, schlechteste: 0 };

  // Beste = niedrigste Durchschnittsnote, Schlechteste = höchste Durchschnittsnote
  const beste = Math.min(...merkmalNoten);
  const schlechteste = Math.max(...merkmalNoten);

  return { beste, schlechteste };
}


// === Schulnotenbeschreibung ===
function noteText(note){
  if(note<=1.49)return "Exzellent";
  if(note<=2.49)return "Sehr gut";
  if(note<=3.49)return "Gut";
  if(note<=4.49)return "Befriedigend";
  if(note<=5.49)return "Ausreichend";
  return "Schwach";
}

// === Prozent aus Note ===
function noteZuProzent(note){
  return Math.max(0, Math.min(100, (6 - note) * 20));
}

// === Sortierung ===
function sortiereHengste(liste){
  if(sortierModus==="besteNote") return liste.sort((a,b)=>a.best-b.best);
  if(sortierModus==="range") return liste.sort((a,b)=>(a.worst-a.best)-(b.worst-b.best));
  return liste.sort((a,b)=>b.__score-a.__score);
}

// === HTML-Ausgabe ===
function createTop3Html(stute){
  const name=pickName(stute);
  const owner=pickOwner(stute);
  const color=pickColor(stute)||"-";

  let scored=hengste.map(h=>{
    const score=scorePair(stute,h);
    const n=berechneNoten(stute,h);
    return {...h,__score:score,best:n.beste,worst:n.schlechteste};
  }).filter(h=>h.__score>0);

  scored=sortiereHengste(scored).slice(0,3);

  let html=`<div class="match"><h3>${escapeHtml(name)}</h3>
  <p><b>Farbgenetik Stute:</b> ${escapeHtml(color)}</p>
  <p><b>Besitzer:</b> ${escapeHtml(owner)}</p>`;

  if(scored.length===0){
    html+=`<p><em>Keine passenden Hengste gefunden.</em></p>`;
  }else{
    html+=`<ul>`;
    scored.forEach((h,i)=>{
      const bText=noteText(h.best), sText=noteText(h.worst);
      const bP=noteZuProzent(h.best).toFixed(2), sP=noteZuProzent(h.worst).toFixed(2);
      html+=`<li>– ${i+1}. Wahl: <b>${escapeHtml(pickName(h))}</b><br>
      <i>Farbgenetik:</i> ${escapeHtml(pickColor(h)||"-")}<br>
      Bester Wert: ${h.best.toFixed(2)} — ${bText} (${bP}%)<br>
      Schlechtester Wert: ${h.worst.toFixed(2)} — ${sText} (${sP}%)</li>`;
    });
    html+=`</ul>`;
  }
  html+=`</div>`;
  return html;
}

// === Anzeige ===
function zeigeVorschlaege(){
  const selStute=document.getElementById('stuteSelect').value;
  const selBesitzer=document.getElementById('besitzerSelect').value;
  const out=document.getElementById('ergebnis');
  out.innerHTML='';

  let toShow=[];
  if(selStute!==""){
    const idx=parseInt(selStute,10);
    if(!Number.isNaN(idx)&&stuten[idx])toShow.push(stuten[idx]);
  }else if(selBesitzer!==""){
    toShow=stuten.filter(s=>pickOwner(s)===selBesitzer);
  }else{
    toShow=stuten;
  }

  if(toShow.length===0){
    out.innerHTML='<p>Keine Stuten gefunden.</p>';
    return;
  }

  out.innerHTML=toShow.map(s=>createTop3Html(s)).join("");
}

// === Initialisierung ===
window.addEventListener('DOMContentLoaded',()=>{
  ladeDaten();
  document.getElementById('stuteSelect').addEventListener('change',zeigeVorschlaege);
  document.getElementById('besitzerSelect').addEventListener('change',zeigeVorschlaege);

  document.getElementById('sortScore').addEventListener('click',()=>{sortierModus="score";zeigeVorschlaege();});
  document.getElementById('sortBeste').addEventListener('click',()=>{sortierModus="besteNote";zeigeVorschlaege();});
  document.getElementById('sortRange').addEventListener('click',()=>{sortierModus="range";zeigeVorschlaege();});
});
