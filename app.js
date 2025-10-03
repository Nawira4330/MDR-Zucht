let stuten = [];
let hengste = [];

async function ladeDaten() {
  const stutenResp = await fetch("data/stuten.json");
  stuten = await stutenResp.json();

  const hengsteResp = await fetch("data/hengste.json");
  hengste = await hengsteResp.json();

  fuelleDropdowns();
}

function fuelleDropdowns() {
  const stuteSelect = document.getElementById("stuteSelect");
  const besitzerSelect = document.getElementById("besitzerSelect");

  // Stuten Dropdown
  stuten.forEach(stute => {
    const opt = document.createElement("option");
    opt.value = stute.Name;
    opt.textContent = stute.Name;
    stuteSelect.appendChild(opt);
  });

  // Besitzer Dropdown (einzigartige Namen)
  const besitzerListe = [...new Set(stuten.map(s => s.Besitzer))];
  besitzerListe.forEach(bes => {
    const opt = document.createElement("option");
    opt.value = bes;
    opt.textContent = bes;
    besitzerSelect.appendChild(opt);
  });
}

// Bewertungsfunktion: Wie gut gleicht der Hengst die Schwächen der Stute aus?
function berechneScore(stute, hengst) {
  // Vereinfachung: Je weniger Abweichungen, desto besser
  let score = 0;
  const merkmale = Object.keys(stute).filter(
    k => !["Name", "Besitzer", "Farbgenetik"].includes(k)
  );

  merkmale.forEach(m => {
    const stutenWert = stute[m];
    const hengstWert = hengst[m];
    if (!stutenWert || !hengstWert) return;
    // Beispiel: identische Werte = besser
    score += stutenWert === hengstWert ? 2 : 1;
  });

  return score;
}

function zeigeVorschlaege() {
  const stutenName = document.getElementById("stuteSelect").value;
  const besitzerName = document.getElementById("besitzerSelect").value;

  let stute = null;

  if (stutenName) {
    stute = stuten.find(s => s.Name === stutenName);
  } else if (besitzerName) {
    stute = stuten.find(s => s.Besitzer === besitzerName);
  }

  const ergebnisDiv = document.getElementById("ergebnis");
  ergebnisDiv.innerHTML = "";

  if (!stute) {
    ergebnisDiv.textContent = "Bitte Stute oder Besitzer auswählen.";
    return;
  }

  // Score für jeden Hengst berechnen
  const scored = hengste
    .filter(h => h.Name && h.Farbgenetik) // nur vollständige Hengste
    .map(h => ({
      ...h,
      score: berechneScore(stute, h)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // Top 3

  // Anzeige
  let html = `<h3>${stute.Name} — Besitzer: ${stute.Besitzer}</h3>`;
  html += `<p>Farbgenetik: ${stute.Farbgenetik || "-"}</p>`;
  html += "<ol>";
  scored.forEach((h, idx) => {
    html += `<li>${h.Name} — Farbe: ${h.Farbgenetik || "-"} (Score: ${h.score})</li>`;
  });
  html += "</ol>";

  ergebnisDiv.innerHTML = html;
}

function zeigeAlle() {
  const ergebnisDiv = document.getElementById("ergebnis");
  ergebnisDiv.innerHTML = "";

  stuten.forEach(stute => {
    const scored = hengste
      .filter(h => h.Name && h.Farbgenetik)
      .map(h => ({
        ...h,
        score: berechneScore(stute, h)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    let html = `<h3>${stute.Name} — Besitzer: ${stute.Besitzer}</h3>`;
    html += `<p>Farbgenetik: ${stute.Farbgenetik || "-"}</p>`;
    html += "<ol>";
    scored.forEach(h => {
      html += `<li>${h.Name} — Farbe: ${h.Farbgenetik || "-"} (Score: ${h.score})</li>`;
    });
    html += "</ol><hr/>`;

    ergebnisDiv.innerHTML += html;
  });
}

ladeDaten();
