// ===============================================================
// app.js – Genetik-Scoring (Variante 3)
// & Anzeige best-/worst-Note (screenshot-kompatibel)
// Mit Sortierauswahl (Beste Note / Kleinste Range / Bester Score)
// ===============================================================

let stuten = [];
let hengste = [];

// ======================= Daten laden =======================
async function ladeDaten() {
  const [stutenRes, hengsteRes] = await Promise.all([
    fetch("data/stuten.json"),
    fetch("data/hengste.json")
  ]);
  stuten = await stutenRes.json();
  hengste = await hengsteRes.json();
  fuelleDropdowns();
}

// ======================= Dropdowns füllen =======================
function fuelleDropdowns() {
  const stuteSelect = document.getElementById("stuteSelect");
  const besitzerSelect = document.getElementById("besitzerSelect");
  const besitzer = new Set();

  stuten.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.Name;
    opt.textContent = s.Name;
    stuteSelect.appendChild(opt);
    if (s.Besitzer) besitzer.add(s.Besitzer);
  });

  besitzer.forEach((b) => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    besitzerSelect.appendChild(opt);
  });
}

// ======================= Sortierung =======================
function sortiereErgebnisse(ergebnisse, sortOption) {
  switch (sortOption) {
    case "beste":
      return ergebnisse.sort((a, b) => a.besterWert.note - b.besterWert.note);
    case "range":
      return ergebnisse.sort(
        (a, b) =>
          (a.schlechtesterWert.note - a.besterWert.note) -
          (b.schlechtesterWert.note - b.besterWert.note)
      );
    case "score":
    default:
      return ergebnisse.sort((a, b) => b.score - a.score);
  }
}

// ======================= Anzeige =======================
function zeigeErgebnis(stute, ergebnisse, container = document.getElementById("ergebnis")) {
  const div = document.createElement("div");
  div.classList.add("match");

  let html = `<h3>${stute.Name}</h3>
  <p><small>Farbgenetik Stute: ${stute.Farbgenetik}</small></p>
  <p><small>Besitzer: ${stute.Besitzer || "unbekannt"}</small></p>`;

  ergebnisse.forEach((r, i) => {
    html += `
      <li>
        – <strong>${i + 1}. Wahl:</strong> ${r.hengst.Name}<br>
        <small>Farbgenetik: ${r.hengst.Farbgenetik || "-"}</small><br>
        <span>Bester Wert: ${r.besterWert.note.toFixed(2)} — ${r.besterWert.text} (${r.besterWert.prozent.toFixed(2)}%)</span>
        <span>Schlechtester Wert: ${r.schlechtesterWert.note.toFixed(2)} — ${r.schlechtesterWert.text} (${r.schlechtesterWert.prozent.toFixed(2)}%)</span>
      </li>`;
  });

  div.innerHTML = html;
  container.appendChild(div);
}

// ======================= Anzeige-Logik =======================
function zeigeVorschlaege() {
  const stutenName = document.getElementById("stuteSelect").value;
  const stute = stuten.find((s) => s.Name === stutenName);
  if (!stute) return;

  const sortOption = document.getElementById("sortOption").value;

  const ergebnisse = hengste.map((hengst) => {
    const scorePair = berechneGenetikScore(stute, hengst);
    return { ...scorePair, hengst };
  });

  const sortiert = sortiereErgebnisse(ergebnisse, sortOption);
  const top3 = sortiert.slice(0, 3);
  document.getElementById("ergebnis").innerHTML = "";
  zeigeErgebnis(stute, top3);
}

function zeigeAlle() {
  const besitzerName = document.getElementById("besitzerSelect").value;
  const ausgewaehlteStuten = besitzerName
    ? stuten.filter((s) => s.Besitzer === besitzerName)
    : stuten;

  const ergebnisDiv = document.getElementById("ergebnis");
  ergebnisDiv.innerHTML = "";

  ausgewaehlteStuten.forEach((stute) => {
    const ergebnisse = hengste.map((hengst) => {
      const scorePair = berechneGenetikScore(stute, hengst);
      return { ...scorePair, hengst };
    });

    const sortOption = document.getElementById("sortOption").value;
    const sortiert = sortiereErgebnisse(ergebnisse, sortOption);
    const top3 = sortiert.slice(0, 3);
    zeigeErgebnis(stute, top3, ergebnisDiv);
  });
}

// ======================= Berechnung =======================
function genWert(gen) {
  if (!gen) return 0;
  gen = gen.trim();
  if (gen.includes("HH")) return 3;
  if (gen.includes("Hh") || gen.includes("hH")) return 2;
  if (gen.includes("hh")) return 1;
  return 0;
}

function berechneGenetikScore(stute, hengst) {
  const merkmale = [
    "Kopf", "Gebiss", "Hals", "Halsansatz", "Widerrist",
    "Schulter", "Brust", "Rückenlinie", "Rückenlänge",
    "Kruppe", "Beinwinkelung", "Beinstellung", "Fesseln", "Hufe"
  ];

  let noten = [];

  merkmale.forEach((merkmal) => {
    const sGene = (stute[merkmal] || "").split(" ");
    const hGene = (hengst[merkmal] || "").split(" ");
    let summe = 0, count = 0;

    sGene.forEach((sg, i) => {
      const hg = hGene[i] || "";
      const diff = Math.abs(genWert(sg) - genWert(hg));
      const note = 1 + diff * 1.2;
      summe += note;
      count++;
    });

    const schnitt = count ? summe / count : 3;
    noten.push(schnitt);
  });

  const bester = Math.min(...noten);
  const schlechtester = Math.max(...noten);
  const durchschnitt = noten.reduce((a, b) => a + b, 0) / noten.length;
  const score = 100 - (durchschnitt - 1) * 15;

  return {
    score,
    besterWert: {
      note: bester,
      text: noteText(bester),
      prozent: 100 - (bester - 1) * 15
    },
    schlechtesterWert: {
      note: schlechtester,
      text: noteText(schlechtester),
      prozent: 100 - (schlechtester - 1) * 15
    }
  };
}

function noteText(note) {
  if (note <= 1.5) return "Exzellent";
  if (note <= 2.5) return "Sehr gut";
  if (note <= 3.5) return "Gut";
  if (note <= 4.5) return "Ausreichend";
  if (note <= 5.5) return "Mangelhaft";
  return "Schwach";
}

// ======================= Tabs =======================
function zeigeTab(tabId) {
  document.querySelectorAll(".tabButton").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tabContent").forEach(t => t.classList.remove("active"));
  document.querySelector(`[onclick="zeigeTab('${tabId}')"]`).classList.add("active");
  document.getElementById(tabId).classList.add("active");
}

// ======================= Start =======================
ladeDaten();
