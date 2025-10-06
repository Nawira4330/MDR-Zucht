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
function pickField(obj, keys) {
  for (const k of keys)
    if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined && obj[k] !== "")
      return obj[k];
  return "";
}
function pickName(obj) { return pickField(obj, NAME_KEYS) || "(ohne Name)"; }
function pickOwner(obj) { return pickField(obj, OWNER_KEYS) || "(kein Besitzer)"; }
function pickColor(obj) { return pickField(obj, COLOR_KEYS) || ""; }
function escapeHtml(s) {
  return String(s).replace(/[&<>"'\/]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;'
  }[c]));
}

// === JSON-Daten laden ===
async function ladeDaten() {
  try {
    const s = await fetch('data/stuten.json').then(r => r.json());
    const h = await fetch('data/hengste.json').then(r => r.json());
    stuten = Array.isArray(s) ? s : [];
    hengste = Array.isArray(h) ? h : [];
    hengste = hengste.filter(hg => MERKMALE.some(m => (hg[m] && String(hg[m]).trim() !== "")));
    fuelleDropdowns();
  } catch (e) {
    console.error("Fehler beim Laden:", e);
    document.getElementById('ergebnis').innerHTML =
      '<p style="color:red">Fehler beim Laden der Daten. Prüfe data/*.json.</p>';
  }
}

// === Dropdowns ===
function fuelleDropdowns() {
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

// === Notenberechnung nach Fehlern ===
function noteAusFehlern(fehler) {
  if (fehler === 0) return 1;
  if (fehler === 1) return 2;
  if (fehler <= 3) return 3;
  return 5;
}

// === Durchschnittsnote pro Paarung ===
function berechneDurchschnitt(stute, hengst) {
  let noten = [];
  for (const merk of MERKMALE) {
    const sGenes = (stute[merk] || "").replace("|", "").trim().split(/\s+/);
    const hGenes = (hengst[merk] || "").replace("|", "").trim().split(/\s+/);
    if (sGenes.length < 8 || hGenes.length < 8) continue;

    let fehler = 0;
    for (let i = 0; i < 8; i++) {
      if (sGenes[i] !== hGenes[i]) fehler++;
    }
    noten.push(noteAusFehlern(fehler));
  }
  if (noten.length === 0) return 0;
  const avg = noten.reduce((a, b) => a + b, 0) / noten.length;
  return avg;
}

// === Genetik-Score beibehalten ===
function scorePair(stute, hengst) {
  let totalScore = 0, count = 0;
  for (const merk of MERKMALE) {
    const sGenes = (stute[merk] || "").replace("|", "").trim().split(/\s+/);
    const hGenes = (hengst[merk] || "").replace("|", "").trim().split(/\s+/);
    if (sGenes.length < 8 || hGenes.length < 8) continue;
    let localScore = 0;
    for (let i = 0; i < 8; i++) {
      if (sGenes[i] === hGenes[i]) localScore += 1;
    }
    totalScore += localScore / 8;
    count++;
  }
  return count > 0 ? totalScore / count : 0;
}

// === HTML-Ausgabe ===
function createTop3Html(stute) {
  const name = pickName(stute);
  const owner = pickOwner(stute);
  const color = pickColor(stute) || "-";

  const scored = hengste
    .map(h => {
      const avg = berechneDurchschnitt(stute, h);
      const score = scorePair(stute, h);
      return { ...h, __avg: avg, __score: score };
    })
    .filter(h => h.__score > 0)
    .sort((a, b) => a.__avg - b.__avg)
    .slice(0, 3);

  let html = `<div class="match">
    <h3>${escapeHtml(name)}</h3>
    <div class="owner-name">${escapeHtml(owner)}</div>
    <p><b>Farbgenetik Stute:</b> ${escapeHtml(color)}</p>`;

  if (scored.length === 0) {
    html += `<p><em>Keine passenden Hengste gefunden.</em></p>`;
  } else {
    html += `<ul class="hengst-list">`;
    scored.forEach((h) => {
      html += `
        <li class="hengst-card" data-avg="${h.__avg.toFixed(2)}" data-score="${h.__score}">
          • <b>${escapeHtml(pickName(h))}</b><br>
          <i>Farbgenetik:</i> ${escapeHtml(pickColor(h) || "-")}<br>
          <i>Durchschnittsnote:</i> ${h.__avg.toFixed(2)} (${bewerteNote(h.__avg)})
        </li>`;
    });
    html += `</ul>`;
  }

  html += `</div>`;
  return html;
}

function bewerteNote(wert) {
  if (wert <= 1.5) return "Exzellent";
  if (wert <= 2.5) return "Sehr gut";
  if (wert <= 3.5) return "Gut";
  if (wert <= 4.5) return "Befriedigend";
  return "Ausreichend";
}

// === Anzeige aktualisieren ===
function zeigeVorschlaege() {
  const selStute = document.getElementById('stuteSelect').value;
  const selBesitzer = document.getElementById('besitzerSelect').value;
  const out = document.getElementById('ergebnis');
  out.innerHTML = '';

  let toShow = [];
  if (selStute !== "") {
    const idx = parseInt(selStute, 10);
    if (!Number.isNaN(idx) && stuten[idx]) toShow.push(stuten[idx]);
  } else if (selBesitzer !== "") {
    toShow = stuten.filter(s => pickOwner(s) === selBesitzer);
  } else {
    toShow = stuten;
  }

  if (toShow.length === 0) {
    out.innerHTML = '<p>Keine Stuten gefunden.</p>';
    return;
  }

  out.innerHTML = toShow.map(s => createTop3Html(s)).join("");
}

// === Sortierung und Tabs ===
document.addEventListener('DOMContentLoaded', () => {
  ladeDaten();
  document.getElementById('stuteSelect').addEventListener('change', zeigeVorschlaege);
  document.getElementById('besitzerSelect').addEventListener('change', zeigeVorschlaege);

  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
      button.classList.add('active');
      document.getElementById(button.dataset.tab).classList.remove('hidden');
    });
  });

  const sortDropdown = document.getElementById('sortDropdown');
  sortDropdown.addEventListener('change', () => {
    const selected = sortDropdown.value;
    const lists = document.querySelectorAll('.hengst-list');
    lists.forEach(list => {
      const cards = Array.from(list.children);
      cards.sort((a, b) => {
        const avgA = parseFloat(a.dataset.avg);
        const avgB = parseFloat(b.dataset.avg);
        const scoreA = parseFloat(a.dataset.score);
        const scoreB = parseFloat(b.dataset.score);
        if (selected === 'score') return scoreB - scoreA;
        return avgA - avgB;
      });
      list.innerHTML = '';
      cards.forEach(card => list.appendChild(card));
    });
  });
});
