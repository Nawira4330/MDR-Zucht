let stuten = [];
let hengste = [];

async function ladeDaten() {
  try {
    const resp1 = await fetch('./data/stuten.json');
    if (!resp1.ok) throw new Error("stuten.json konnte nicht geladen werden: " + resp1.status);

    stuten = (await resp1.json()).map(s => ({
      ...s,
      Name: (s.Name || "").replace(/\r?\n/g, " ").trim(),
      Besitzer: (s.Besitzer || "").replace(/\r?\n/g, " ").trim(),
      Farbgenetik: (s.Farbgenetik || "").replace(/\r?\n/g, " ").trim()
    }));

    const resp2 = await fetch('./data/hengste.json');
    if (!resp2.ok) throw new Error("hengste.json konnte nicht geladen werden: " + resp2.status);

    hengste = (await resp2.json()).map(h => ({
      ...h,
      Name: (h.Name || "").replace(/\r?\n/g, " ").trim(),
      Farbgenetik: (h.Farbgenetik || "").replace(/\r?\n/g, " ").trim()
    }));

    console.log("Stuten geladen:", stuten);
    console.log("Hengste geladen:", hengste);

    fuelleDropdowns();
  } catch (err) {
    console.error("Fehler in ladeDaten():", err);
    document.getElementById("ergebnis").innerText = "Fehler beim Laden der Daten: " + err.message;
  }
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
  let score = 0;
  const merkmale = Object.keys(stute).filter(
    k => !["Name", "Besitzer", "Farbgenetik"].includes(k)
  );

  merkmale.forEach(m => {
    const stutenWert = stute[m];
    const hengstWert = hengst[m];
    if (!stutenWert || !hengstWert) return;
    score += stutenWert === hengstWert ? 2 : 1;
  });

  return score;
}

function zeigeVorschlaege() {
  const stutenName = document.getElementById("stuteSelect").value;
  const besitzerName = document.getElementById("besitzerSelect").value;

  let stutenListe = [];

  if (stutenName) {
    stutenListe = stuten.filter(s => s.Name === stutenName);
  } else if (besitzerName) {
    stutenListe = stuten.filter(s => s.Besitzer === besitzerName);
  } else {
    stutenListe = stuten; // Alle anzeigen
  }

  const ergebnisDiv = document.getElementById("ergebnis");
  ergebnisDiv.innerHTML = "";

  if (stutenListe.length === 0) {
    ergebnisDiv.textContent = "Keine passenden Stuten gefunden.";
    return;
  }

  stutenListe.forEach(stute => {
    const scored = hengste
      .filter(h => h.Name && h.Farbgenetik) // nur vollständige Hengste
      .map(h => ({
        ...h,
        score: berechneScore(stute, h)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3); // Top 3

    let html = `<h3>${stute.Name} — Besitzer: ${stute.Besitzer}</h3>`;
    html += `<p>Farbgenetik: ${stute.Farbgenetik || "-"}</p>`;
    html += "<ol>";
    scored.forEach((h, idx) => {
      html += `<li>${h.Name} — Farbe: ${h.Farbgenetik || "-"} (Score: ${h.score})</li>`;
    });
    html += "</ol><hr/>`;

    ergebnisDiv.innerHTML += html;
  });
}

ladeDaten();
