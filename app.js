let stuten = [];
let hengste = [];

async function loadData() {
  try {
    stuten = await fetch('data/stuten.json').then(r => r.json());
    hengste = await fetch('data/hengste.json').then(r => r.json());

    // Filtere Hengste ohne Werte (alle Exterieur-Spalten leer)
    const relevantFields = ["Kopf","Gebiss","Hals","Halsansatz","Widerrist","Schulter",
                            "Brust","Rückenlinie","Rückenlänge","Kruppe",
                            "Beinwinkelung","Beinstellung","Fesseln","Hufe"];

    hengste = hengste.filter(h => relevantFields.some(f => h[f] && h[f].trim() !== ""));

    populateStutenDropdown();
  } catch (err) {
    console.error("Fehler beim Laden der Daten:", err);
  }
}

function populateStutenDropdown() {
  const select = document.getElementById("stuteSelect");
  select.innerHTML = "";

  stuten.forEach((s, i) => {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `${s.Name} (${s.Besitzer}) [${s.Farbgenetik}]`;
    select.appendChild(option);
  });
}

function berechneMatching(stute, hengst) {
  let score = 0;
  const relevantFields = ["Kopf","Gebiss","Hals","Halsansatz","Widerrist","Schulter",
                          "Brust","Rückenlinie","Rückenlänge","Kruppe",
                          "Beinwinkelung","Beinstellung","Fesseln","Hufe"];

  relevantFields.forEach(f => {
    const sWert = parseInt(stute[f]) || 0;
    const hWert = parseInt(hengst[f]) || 0;
    if (sWert < 5 && hWert > 5) score += (5 - sWert); // Hengst gleicht Schwäche aus
    if (sWert > 5 && hWert < 5) score += (sWert - 5); // Hengst gleicht Überstärke aus
  });

  return score;
}

function zeigeVorschlaege() {
  const index = document.getElementById("stuteSelect").value;
  if (index === "") return;

  const stute = stuten[index];

  // Scores für alle Hengste berechnen
  let resultate = hengste.map(h => ({
    ...h,
    score: berechneMatching(stute, h)
  }));

  // Sortieren nach bestem Score (absteigend)
  resultate.sort((a, b) => b.score - a.score);

  // Top 3 auswählen
  const top3 = resultate.slice(0, 3);

  // Ergebnisbereich leeren
  const out = document.getElementById("ergebnis");
  out.innerHTML = `
    <h3>Stute: ${stute.Name} (${stute.Besitzer}) [${stute.Farbgenetik}]</h3>
    <ol>
      ${top3.map((h,i) => `
        <li>
          <strong>${i+1}. Wahl:</strong> ${h.Name} [${h.Farbgenetik}] 
          (Score: ${h.score})
        </li>
      `).join("")}
    </ol>
  `;
}

// Initial laden
document.addEventListener("DOMContentLoaded", loadData);
