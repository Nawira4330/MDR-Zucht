// === app.js – Genetik-Scoring + Durchschnittsnoten mit Nachkommastellen ===

let stuten = [];
let hengste = [];
let sortierModus = "score";

const MERKMALE = ["Kopf", "Hufe", "Beine", "Rücken", "Farbe"];

function fehlerZuNote(fehler) {
  if (fehler === 0) return 1.0;
  if (fehler === 1) return 2.0;
  if (fehler === 2 || fehler === 3) return 3.0;
  if (fehler >= 4) return 5.0;
  return 4.0;
}

function bewerteNote(note) {
  if (note <= 1.5) return "Exzellent";
  if (note <= 2.5) return "Sehr gut";
  if (note <= 3.5) return "Gut";
  if (note <= 4.5) return "Befriedigend";
  return "Ausreichend";
}

function berechneNotenDurchschnitt(stute, hengst) {
  const notenBest = [];
  const notenWorst = [];

  for (const merk of MERKMALE) {
    const sGene = (stute[merk] || "").split("|")[0]?.trim().split(/\s+/);
    const hGene = (hengst[merk] || "").split("|")[1]?.trim().split(/\s+/);
    if (!sGene || !hGene) continue;

    let fehlerBest = 0;
    let fehlerWorst = 0;

    for (let i = 0; i < Math.min(sGene.length, hGene.length); i++) {
      if (sGene[i] !== hGene[i]) {
        fehlerBest++;
        fehlerWorst += 2;
      }
    }

    notenBest.push(fehlerZuNote(fehlerBest));
    notenWorst.push(fehlerZuNote(fehlerWorst));
  }

  const avgBest = notenBest.length ? (notenBest.reduce((a,b)=>a+b,0)/notenBest.length) : 0;
  const avgWorst = notenWorst.length ? (notenWorst.reduce((a,b)=>a+b,0)/notenWorst.length) : 0;
  return { best: avgBest, worst: avgWorst };
}

function scorePair(stute, hengst) {
  return Math.random() * 0.6 + 0.3;
}

function pickName(tier) { return tier.name || "Unbekannt"; }
function pickOwner(tier) { return tier.owner || ""; }
function pickColor(tier) { return tier.genetik || "-"; }
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
}

function createTop3Html(stute) {
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute);

  const scored = hengste.map(h => {
    const s = scorePair(stute, h);
    const {best, worst} = berechneNotenDurchschnitt(stute, h);
    return {...h, __score: s, __best: best, __worst: worst};
  });

  scored.sort((a,b)=>{
    if (sortierModus==="beste") return a.__best - b.__best;
    if (sortierModus==="range") return (a.__worst - a.__best) - (b.__worst - b.__best);
    return b.__score - a.__score;
  });

  const top3 = scored.slice(0,3);

  let html = `<div class="match">
    <h3>${escapeHtml(name)}</h3>
    <span class="owner-name">${escapeHtml(owner)}</span>
    <p><b>Farbgenetik Stute:</b> ${escapeHtml(color)}</p>`;

  if (top3.length === 0) {
    html += `<p><em>Keine passenden Hengste gefunden.</em></p>`;
  } else {
    html += `<ul class="hengst-list">`;
    top3.forEach(h => {
      const range = (h.__worst - h.__best).toFixed(2);
      const bestStr = h.__best.toFixed(2);
      const worstStr = h.__worst.toFixed(2);
      const scorePct = (h.__score * 100).toFixed(1);
      html += `
      <li class="hengst-card">
        • <b>${escapeHtml(pickName(h))}</b><br>
        <i>Farbgenetik:</i> ${escapeHtml(pickColor(h) || "-")}<br>
        <i>Beste Note:</i> ${bestStr} — ${bewerteNote(h.__best)}<br>
        <i>Schlechteste Note:</i> ${worstStr} — ${bewerteNote(h.__worst)}<br>
        <i>Range:</i> ${range} | <i>Score:</i> ${scorePct}%
      </li>`;
    });
    html += `</ul>`;
  }
  html += `</div>`;
  return html;
}

document.getElementById("sortSelect").addEventListener("change", e => {
  sortierModus = e.target.value;
  renderAlleStuten();
});

function renderAlleStuten() {
  const out = document.getElementById("output");
  out.innerHTML = stuten.map(s => createTop3Html(s)).join("");
}

// Beispiel-Daten
stuten = [
  { name: "(E) Kaya von Sora", owner: "Nawira13", genetik: "E AtA1 D Cr SBSB O Spl" }
];

hengste = [
  { name: "(E) Horizon Bear von Sora", genetik: "-" },
  { name: "Dallas °16.4° ~VL~", genetik: "EE D Cr Rn" },
  { name: "~B.H~ Old Bernsteinmeerengel", genetik: "Ch pl SBTO O" }
];

// Tabs aktivieren
document.addEventListener("DOMContentLoaded", () => {
  renderAlleStuten();

  document.querySelectorAll(".tab-button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(tab => tab.classList.add("hidden"));
      button.classList.add("active");
      document.getElementById(button.dataset.tab).classList.remove("hidden");
    });
  });
});
