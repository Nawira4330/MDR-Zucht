async function loadJSON(file) {
    const response = await fetch(file);
    return await response.json();
}

let stuten = [];
let hengste = [];

async function init() {
    stuten = await loadJSON("./data/stuten.json");
    hengste = await loadJSON("./data/hengste.json");
    populateStutenDropdown();
    updateResults();
}

function populateStutenDropdown() {
    const select = document.getElementById("stuteSelect");
    select.innerHTML = "";
    stuten.forEach(stute => {
        const option = document.createElement("option");
        option.value = stute.name;
        option.textContent = stute.name;
        select.appendChild(option);
    });
    select.addEventListener("change", updateResults);
    document.getElementById("sortSelect").addEventListener("change", updateResults);
}

function calculateExterieurScore(stute, hengst) {
    // Simulierte Genvergleiche (vereinfachte Logik)
    // Score = wie gut Hengst die "H/h"-Kette der Stute optimiert
    let score = 0;
    const stuteGene = stute.exterieur || "";
    const hengstGene = hengst.exterieur || "";

    for (let i = 0; i < Math.min(stuteGene.length, hengstGene.length); i++) {
        if (stuteGene[i] === "h" && hengstGene[i] === "H") score += 2;
        else if (stuteGene[i] === "H" && hengstGene[i] === "h") score += 1;
        else score += 0.5;
    }

    return Math.round((score / stuteGene.length) * 100);
}

function calculateDurchschnitt(noteArray) {
    if (!noteArray || noteArray.length === 0) return 0;
    const sum = noteArray.reduce((a, b) => a + b, 0);
    return (sum / noteArray.length).toFixed(2);
}

function updateResults() {
    const stuteName = document.getElementById("stuteSelect").value;
    const sortType = document.getElementById("sortSelect").value;
    const stute = stuten.find(s => s.name === stuteName);

    const bewertungen = hengste.map(h => {
        const score = calculateExterieurScore(stute, h);
        const durchschnitt = calculateDurchschnitt(h.noten);
        const range = (Math.max(...h.noten) - Math.min(...h.noten)).toFixed(2);
        return { ...h, score, durchschnitt, range };
    });

    // Sortieren
    bewertungen.sort((a, b) => {
        if (sortType === "note") return a.durchschnitt - b.durchschnitt;
        if (sortType === "range") return a.range - b.range;
        return b.score - a.score;
    });

    // Nur Top 3 anzeigen
    const top3 = bewertungen.slice(0, 3);
    renderResults(top3);
}

function renderResults(list) {
    const container = document.getElementById("hengstList");
    container.innerHTML = "";

    list.forEach(h => {
        const card = document.createElement("div");
        card.classList.add("hengst-card");
        card.innerHTML = `
            <h3>${h.name}</h3>
            <p><b>Score:</b> ${h.score}%</p>
            <p><b>Beste Note:</b> ${Math.min(...h.noten).toFixed(2)}</p>
            <p><b>Schlechteste Note:</b> ${Math.max(...h.noten).toFixed(2)}</p>
            <p><b>Durchschnitt:</b> ${h.durchschnitt}</p>
            <p><b>Range:</b> ${h.range}</p>
        `;
        container.appendChild(card);
    });
}

init();
