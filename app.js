// --- Globale Variablen ---
let stuten = [];
let hengste = [];

// Merkmale laut Tabelle
const MERKMALE = [
  "Kopf", "Gebiss", "Hals", "Halsansatz", "Widerrist",
  "Schulter", "Brust", "Rückenlinie", "Rückenlänge",
  "Kruppe", "Beinwinkelung", "Beinstellung", "Fesseln", "Hufe"
];

// Feldnamen-Erkennung
function getField(obj, names) {
  for (const n of names) {
    if (obj[n] !== undefined && obj[n] !== "") return obj[n];
  }
  return "";
}

function pickName(o) { return getField(o, ["Name", "Stutenname", "Stute", "Hengstname"]); }
function pickOwner(o) { return getField(o, ["Besitzer", "Owner", "besitzer"]); }
function pickColor(o) { return getField(o, ["Farbgenetik", "Farbe", "Genetik"]); }

// --- Daten laden ---
async function ladeDaten() {
  try {
    const stutenData = await fetch("data/stuten.json").then(r => r.json());
    const hengsteData = await fetch("data/hengste.json").then(r => r.json());

    stuten = Array.isArray(stutenData) ? stutenData : [];
    hengste = Array.isArray(hengsteData) ? hengsteData : [];

    fuelleDropdowns();
  } catch (err) {
    console.error("Fehler beim Laden:", err);
    document.getElementById("results").innerHTML =
      "<p style='color:red'>Fehler beim Laden der Daten.</p>";
  }
}

// --- Dropdowns ---
function fuelleDropdowns() {
  const mareSelect = document.getElementById("mareSelect");
  const ownerSelect = document.getElementById("ownerSelect");
  mareSelect.innerHTML = "<option value=''>-- bitte wählen --</option>";
  ownerSelect.innerHTML = "<option value=''>-- bitte wählen --</option>";

  stuten.forEach((s, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = pickName(s);
    mareSelect.appendChild(opt);
  });

  const owners = [...new Set(stuten.map(s => pickOwner(s)))].filter(x => x);
  owners.forEach(o => {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    ownerSelect.appendChild(opt);
  });
}

// --- Genetik-Parser ---
function parseGenetik(str) {
  if (!str) return [];
  // Leerzeichen entfernen, in Paare splitten, dann vorder/hinter Teil trennen
  str = str.replace(/\s+/g, "");
  const [front, back] = str.split("|").map(s => s.trim());
  const frontPairs = (front.match(/.{1,2}/g) || []).slice(0, 4);
  const backPairs = (back.match(/.{1,2}/g) || []).slice(0, 4);
  return { front: frontPairs, back: backPairs };
}

// --- Score-Berechnung ---
function scorePair(stuteGen, hengstGen) {
  const fStute = parseGenetik(stuteGen).front;
  const bStute = parseGenetik(stuteGen).back;
  const fHengst = parseGenetik(hengstGen).front;
  const bHengst = parseGenetik(hengstGen).back;
  let score = 0;

  // Bewertungslogik vorne
  for (let i = 0; i < 4; i++) {
    const s = (fStute[i] || "").toUpperCase();
    const h = (fHengst[i] || "").toUpperCase();
    score += frontScore(s, h);
  }
  // Bewertungslogik hinten
  for (let i = 0; i < 4; i++) {
    const s = (bStute[i] || "").toUpperCase();
    const h = (bHengst[i] || "").toUpperCase();
    score += backScore(s, h);
  }
  return score;
}

// Tabellenbasierte Punktvergabe
function frontScore(s, h) {
  const t = {
    "HH-HH": 4, "HH-HH": 4, "HH-HH": 4,
    "HH-Hh": 3, "HH-hh": 2,
    "Hh-HH": 3, "Hh-Hh": 2, "Hh-hh": 1,
    "hh-HH": 2, "hh-Hh": 1, "hh-hh": 0
  };
  return t[`${s}-${h}`] ?? 0;
}
function backScore(s, h) {
  const t = {
    "HH-HH": 0, "HH-Hh": 1, "HH-hh": 2,
    "Hh-HH": 1, "Hh-Hh": 2, "Hh-hh": 3,
    "hh-HH": 2, "hh-Hh": 3, "hh-hh": 4
  };
  return t[`${s}-${h}`] ?? 0;
}

// --- Score pro Stute/Hengst ---
function berechneScore(stute, hengst) {
  let total = 0;
  const debug = [];
  for (const m of MERKMALE) {
    const sVal = stute[m];
    const hVal = hengst[m];
    if (!sVal || !hVal) continue;
    const s = scorePair(sVal, hVal);
    debug.push(`${m}: ${sVal} × ${hVal} → ${s}`);
    total += s;
  }
  return { score: total, debug };
}

// --- Anzeige der Top-3 ---
function zeigeVorschlaege() {
  const mareVal = document.getElementById("mareSelect").value;
  const ownerVal = document.getElementById("ownerSelect").value;
  const out = document.getElementById("results");
  out.innerHTML = "";

  let stutenListe = [];

  if (mareVal) {
    const idx = parseInt(mareVal, 10);
    if (stuten[idx]) stutenListe.push(stuten[idx]);
  } else if (ownerVal) {
    stutenListe = stuten.filter(s => pickOwner(s) === ownerVal);
  } else {
    stutenListe = stuten;
  }

  stutenListe.forEach(stute => {
    const name = pickName(stute);
    const owner = pickOwner(stute);
    const color = pickColor(stute);

    // Scores berechnen
    const scored = hengste
      .map(h => {
        const { score, debug } = berechneScore(stute, h);
        return { ...h, __score: score, __debug: debug };
      })
      .sort((a, b) => b.__score - a.__score)
      .slice(0, 3);

    const card = document.createElement("div");
    card.className = "horse-card";
    card.innerHTML = `
      <div class="horse-header">
        <h3>${name}</h3>
        <span class="score">${owner}</span>
      </div>
      <p><strong>Farbgenetik Stute:</strong> ${color || "-"}</p>
      <ul class="horse-list">
        ${scored.map((h, i) => `
          <li>
            <strong>• ${pickName(h)}</strong> 
            – ${pickColor(h) || "-"} 
            <span class="score">(${h.__score})</span>
            <span class="info-icon" data-debug="${encodeURIComponent(h.__debug.join("\n"))}">ℹ️</span>
          </li>
        `).join("")}
      </ul>
    `;
    out.appendChild(card);
  });

  // Info-Icons aktivieren
  document.querySelectorAll(".info-icon").forEach(icon => {
    icon.addEventListener("click", e => {
      const msg = decodeURIComponent(e.target.getAttribute("data-debug"));
      alert("Score-Details:\n\n" + msg);
    });
  });
}

// --- Event-Listener ---
document.addEventListener("DOMContentLoaded", () => {
  ladeDaten();

  document.getElementById("mareSelect").addEventListener("change", zeigeVorschlaege);
  document.getElementById("ownerSelect").addEventListener("change", zeigeVorschlaege);
  document.getElementById("showAll").addEventListener("click", zeigeVorschlaege);

  const infoToggle = document.getElementById("infoToggle");
  const infoBox = document.getElementById("infoBox");
  infoToggle.addEventListener("click", () => {
    infoBox.classList.toggle("visible");
  });
});
