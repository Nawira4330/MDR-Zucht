async function loadData() {
  const [stutenRes, hengsteRes] = await Promise.all([
    fetch("data/stuten.json"),
    fetch("data/hengste.json")
  ]);
  const stuten = await stutenRes.json();
  const hengste = await hengsteRes.json();
  return { stuten, hengste };
}

function calcDurchschnitt(noten) {
  const werte = noten.map(parseFloat).filter(n => !isNaN(n));
  if (werte.length === 0) return 0;
  const sum = werte.reduce((a, b) => a + b, 0);
  return (sum / werte.length).toFixed(2);
}

function calcRange(noten) {
  const werte = noten.map(parseFloat).filter(n => !isNaN(n));
  if (werte.length === 0) return 0;
  return (Math.max(...werte) - Math.min(...werte)).toFixed(2);
}

function calcScore(noten) {
  const avg = parseFloat(calcDurchschnitt(noten));
  return (100 - ((avg - 1) / 4) * 100).toFixed(1);
}

function getBewertungText(note) {
  if (note <= 1.5) return "Exzellent";
  if (note <= 2.5) return "Sehr gut";
  if (note <= 3.5) return "Gut";
  if (note <= 4.5) return "Befriedigend";
  return "Ausreichend";
}

function renderInfoBox(stute, resultData) {
  const infoBox = document.getElementById("infoBox");
  const stuteNoten = Object.values(stute)
    .map(parseFloat)
    .filter(v => !isNaN(v));

  const stuteAvg = calcDurchschnitt(stuteNoten);
  const bestHengst = resultData[0];
  const worstHengst = resultData[resultData.length - 1];

  infoBox.innerHTML = `
    <h3>Informationen zur Stute</h3>
    <p><strong>Name:</strong> ${stute.Name}</p>
    <p><strong>Farbgenetik:</strong> ${stute.Farbgenetik || "-"}</p>
    <p><strong>Durchschnittsnote:</strong> ${stuteAvg}</p>
    <hr>
    <p><strong>Bester Hengst:</strong> ${bestHengst.name} (${bestHengst.durchschnitt.toFixed(2)})</p>
    <p><strong>Schlechtester Hengst:</strong> ${worstHengst.name} (${worstHengst.durchschnitt.toFixed(2)})</p>
  `;
}

function renderResults(stute, hengste, sortType) {
  const container = document.getElementById("results");
  container.innerHTML = "";

  let resultData = hengste.map(h => {
    const noten = Object.values(h)
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v));

    const avg = parseFloat(calcDurchschnitt(noten));
    const range = parseFloat(calcRange(noten));
    const score = parseFloat(calcScore(noten));

    return {
      name: h.Name || "Unbekannter Hengst",
      farbgenetik: h.Farbgenetik || "-",
      durchschnitt: avg,
      range,
      score
    };
  });

  if (sortType === "note") resultData.sort((a, b) => a.durchschnitt - b.durchschnitt);
  else if (sortType === "range") resultData.sort((a, b) => a.range - b.range);
  else if (sortType === "score") resultData.sort((a, b) => b.score - a.score);

  renderInfoBox(stute, resultData);

  resultData.forEach(h => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h3>${h.name}</h3>
      <p>Farbgenetik: ${h.farbgenetik}</p>
      <p>Durchschnittsnote: ${h.durchschnitt.toFixed(2)} — ${getBewertungText(h.durchschnitt)}</p>
      <p>Range: ${h.range.toFixed(2)}</p>
      <p>Score: ${h.score.toFixed(1)}%</p>
    `;
    container.appendChild(div);
  });
}

async function init() {
  const { stuten, hengste } = await loadData();
  const stuteSelect = document.getElementById("stuteSelect");
  const besitzerSelect = document.getElementById("besitzerSelect");
  const sortSelect = document.getElementById("sortSelect");

  const besitzerList = [...new Set(stuten.map(s => s.Besitzer))];
  besitzerList.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    besitzerSelect.appendChild(opt);
  });

  function updateStuten() {
    const selectedBesitzer = besitzerSelect.value;
    const filtered = stuten.filter(s => s.Besitzer === selectedBesitzer);
    stuteSelect.innerHTML = "";
    filtered.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.Name;
      opt.textContent = s.Name;
      stuteSelect.appendChild(opt);
    });
  }

  function updateResults() {
    const selectedStute = stuten.find(s => s.Name === stuteSelect.value);
    if (selectedStute) renderResults(selectedStute, hengste, sortSelect.value);
  }

  besitzerSelect.addEventListener("change", () => {
    updateStuten();
    updateResults();
  });
  stuteSelect.addEventListener("change", updateResults);
  sortSelect.addEventListener("change", updateResults);

  updateStuten();
  updateResults();
}

init();
