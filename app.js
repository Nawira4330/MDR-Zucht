let stuten = [];
let hengste = [];

async function loadData() {
  try {
    stuten = await fetch('data/stuten.json').then(r => r.json());
    hengste = await fetch('data/hengste.json').then(r => r.json());

    const relevantFields = ["Kopf","Gebiss","Hals","Halsansatz","Widerrist","Schulter",
                            "Brust","Rückenlinie","Rückenlänge","Kruppe",
                            "Beinwinkelung","Beinstellung","Fesseln","Hufe"];

    // Hengste ohne Werte ignorieren
    hengste = hengste.filter(h => relevantFields.some(f => h[f] && h[f].trim() !== ""));

    populateDropdowns();
  } catch (err) {
    console.error("Fehler beim Laden der Daten:", err);
  }
}

function populateDropdowns() {
  const selectStute = document.getElementById("stuteSelect");
  const selectBesitzer = document.getElementById("besitzerSelect");

  selectStute.innerHTML = "<option value=''>-- Stute wählen --</option>";
  selectBesitzer.innerHTML = "<option value=''>-- Besitzer wählen --</option>";

  stuten.forEach((s, i) => {
    // Sicherstellen, dass die Keys stimmen (ggf. anpassen auf deine JSON-Felder!)
    const name = s.Name || s.Stutenname || s["Stute"] || `Stute${i+1}`;
    const besitzer = s.Besitzer || s.Owner || s["Besitzer/in"] || "Unbekannt";

    // Dropdown für Stuten
    const opt1 = document.createElement("option");
    opt1.value = i;
    opt1.textContent = name;
    selectStute.appendChild(opt1);

    // Dropdown für Besitzer (ohne Duplikate)
    if (![...selectBesitzer.options].some(o => o.textContent === besitzer)) {
      const opt2 = document.createElement("option");
      opt2.value = besitzer;
      opt2.textContent = besitzer;
      selectBesitzer.appendChild(opt2);
    }
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
    if (sWert < 5 && hWert > 5) score += (5 - sWert);
    if (sWert > 5 && hWert < 5) score += (sWert - 5);
  });

  return score;
}

function zeigeVorschlaege() {
  const stuteIndex = document.getElementById("stuteSelect").value;
  const besitzerName = document.getElementById("besitzerSelect").value;

  let stute;
  if (stuteIndex !== "") {
    stute = stuten[stuteIndex];
  } else if (besitzerName !== "") {
    stute = stuten.find(s => (s.Besitzer || s.Owner || s["Besitzer/in"]) === besitzerName);
  }

  if (!stute) {
    document.getElementById("ergebnis").innerHTML = "<p>Bitte Stute oder Besitzer auswählen.</p>";
    return;
  }

  // Scores berechnen
  let resultate = hengste.map(h => ({
    ...h,
    score: berechneMatching(stute, h)
  }));

  resultate.sort((a, b) => b.score - a.score);
  const top3 = resultate.slice(0, 3);

  const stuteName = stute.Name || stute.Stutenname || "Unbekannt";
  const besitzer = stute.Besitzer || stute.Owner || "Unbekannt";
  const farbe = stute.Farbgenetik || stute.Farbe || "k.A.";

  const out = document.getElementById("ergebnis");
  out.innerHTML = `
    <h3>${stuteName} (${besitzer}) [${farbe}]</h3>
    <ol>
      ${top3.map((h,i) => `
        <li>
          <strong>${i+1}. Wahl:</strong> ${h.Name || "Unbekannt"} [${h.Farbgenetik || "k.A."}] 
          (Score: ${h.score})
        </li>
      `).join("")}
    </ol>
  `;
}

document.addEventListener("DOMContentLoaded", loadData);
