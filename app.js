// === App.js – Kombination: Genetik-Scoring + Anzeige & Infofenster ===

let stuten = [];
let hengste = [];

// mögliche Feldnamen (robust für verschiedene JSONs)
const NAME_KEYS = ["Name", "Stutenname", "Stute", "name"];
const OWNER_KEYS = ["Besitzer", "Owner", "besitzer", "owner"];
const COLOR_KEYS = ["Farbgenetik", "Farbe", "FarbGenetik", "color", "Genetik"];

// Exterieur-Merkmale
const MERKMALE = [
  "Kopf",
  "Gebiss",
  "Hals",
  "Halsansatz",
  "Widerrist",
  "Schulter",
  "Brust",
  "Rückenlinie",
  "Rückenlänge",
  "Kruppe",
  "Beinwinkelung",
  "Beinstellung",
  "Fesseln",
  "Hufe",
];

// === Hilfsfunktionen ===
function pickField(obj, keys) {
  for (const k of keys)
    if (
      obj &&
      Object.prototype.hasOwnProperty.call(obj, k) &&
      obj[k] !== undefined &&
      obj[k] !== ""
    )
      return obj[k];
  return "";
}
function pickName(obj) {
  return pickField(obj, NAME_KEYS) || "(ohne Name)";
}
function pickOwner(obj) {
  return pickField(obj, OWNER_KEYS) || "(kein Besitzer)";
}
function pickColor(obj) {
  return pickField(obj, COLOR_KEYS) || "";
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"'\/]/g, (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "/": "&#47;",
    }[c])
  );
}

// === JSON-Daten laden ===
async function ladeDaten() {
  try {
    const s = await fetch("data/stuten.json").then((r) => r.json());
    const h = await fetch("data/hengste.json").then((r) => r.json());
    stuten = Array.isArray(s) ? s : [];
    hengste = Array.isArray(h) ? h : [];

    hengste = hengste.filter((hg) =>
      MERKMALE.some((m) => hg[m] && String(hg[m]).trim() !== "")
    );

    fuelleDropdowns();
    zeigeVorschlaege();
  } catch (e) {
    console.error("Fehler beim Laden:", e);
    document.getElementById("ergebnis").innerHTML =
      '<p style="color:red">Fehler beim Laden der Daten. Prüfe data/*.json.</p>';
  }
}

// === Dropdowns befüllen ===
function fuelleDropdowns() {
  const selStute = document.getElementById("stuteSelect");
  const selBesitzer = document.getElementById("besitzerSelect");
  selStute.innerHTML = '<option value="">– Alle Stuten –</option>';
  selBesitzer.innerHTML = '<option value="">– Alle Besitzer –</option>';

  stuten.forEach((s, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = pickName(s);
    selStute.appendChild(opt);
  });

  const owners = [
    ...new Set(
      stuten.map((s) => pickOwner(s)).filter((x) => x && x !== "(kein Besitzer)")
    ),
  ];
  owners.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    selBesitzer.appendChild(opt);
  });
}

// === Genetisches Scoring (Variante 3 mit Überkorrektur erlaubt) ===
function scorePair(stute, hengst) {
  let totalScore = 0;
  let count = 0;

  for (const merk of MERKMALE) {
    const sGenes = (stute[merk] || "").replace("|", "").trim().split(/\s+/);
    const hGenes = (hengst[merk] || "").replace("|", "").trim().split(/\s+/);
    if (sGenes.length < 8 || hGenes.length < 8) continue;

    let localScore = 0;

    for (let i = 0; i < 8; i++) {
      const S = sGenes[i];
      const H = hGenes[i];
      const target = i < 4 ? "HH" : "hh";
      let score = 0;

      if (target === "HH") {
        if (S === "hh" && (H === "HH" || H === "Hh")) score = 1;
        else if (S === "Hh" && (H === "HH" || H === "Hh")) score = 1;
        else if (S === "HH" && (H === "HH" || H === "Hh")) score = 1;
        else if (S === "HH" && H === "hh") score = 0;
        else score = 0.3;
      } else {
        if (S === "HH" && (H === "hh" || H === "Hh")) score = 1;
        else if (S === "Hh" && (H === "hh" || H === "Hh")) score = 1;
        else if (S === "hh" && (H === "hh" || H === "Hh")) score = 1;
        else if (S === "hh" && H === "HH") score = 0;
        else score = 0.3;
      }
      localScore += score;
    }

    totalScore += localScore / 8;
    count++;
  }
  return count > 0 ? totalScore / count : 0;
}

// === HTML für Top 3 ===
function createTop3Html(stute) {
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute) || "-";

  const scored = hengste
    .map((h) => ({ ...h, __score: scorePair(stute, h) }))
    .filter((h) => h.__score > 0)
    .sort((a, b) => b.__score - a.__score)
    .slice(0, 3);

  let html = `<div class="match"><h3>${escapeHtml(
    name
  )} <small>(${escapeHtml(owner)})</small></h3>`;
  html += `<p><b>Farbgenetik Stute:</b> ${escapeHtml(color)}</p>`;
  if (scored.length === 0)
    html += `<p><em>Keine passenden Hengste gefunden.</em></p>`;
  else {
    html += `<ol>`;
    scored.forEach((h, i) => {
      html += `<li><b>${i + 1}. Wahl:</b> ${escapeHtml(
        pickName(h)
      )}<br><i>Farbgenetik:</i> ${escapeHtml(
        pickColor(h) || "-"
      )}<br><i>Score:</i> ${(h.__score * 100).toFixed(1)}%</li>`;
    });
    html += `</ol>`;
  }
  html += `</div>`;
  return html;
}

// === Anzeige aktualisieren ===
function zeigeVorschlaege() {
  const selStute = document.getElementById("stuteSelect").value;
  const selBesitzer = document.getElementById("besitzerSelect").value;
  const out = document.getElementById("ergebnis");
  out.innerHTML = "";

  let toShow = [];
  if (selStute !== "") {
    const idx = parseInt(selStute, 10);
    if (!Number.isNaN(idx) && stuten[idx]) toShow.push(stuten[idx]);
  } else if (selBesitzer !== "") {
    toShow = stuten.filter((s) => pickOwner(s) === selBesitzer);
  } else {
    toShow = stuten;
  }

  if (toShow.length === 0) {
    out.innerHTML = "<p>Keine Stuten gefunden.</p>";
    return;
  }

  out.innerHTML = toShow.map((s) => createTop3Html(s)).join("");
}

function zeigeAlle() {
  document.getElementById("stuteSelect").value = "";
  document.getElementById("besitzerSelect").value = "";
  zeigeVorschlaege();
}

// === Initialisierung ===
window.addEventListener("DOMContentLoaded", () => {
  ladeDaten();
  document
    .getElementById("stuteSelect")
    .addEventListener("change", zeigeVorschlaege);
  document
    .getElementById("besitzerSelect")
    .addEventListener("change", zeigeVorschlaege);
  document.getElementById("alleBtn").addEventListener("click", zeigeAlle);
});
