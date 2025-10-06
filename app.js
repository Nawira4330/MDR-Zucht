document.addEventListener("DOMContentLoaded", () => {
  const MERKMALE = [
    "Kopf","Gebiss","Hals","Halsansatz","Widerrist","Schulter","Brust",
    "Rückenlinie","Rückenlänge","Kruppe","Beinwinkelung","Beinstellung","Fesseln","Hufe"
  ];

  const stuteSelect = document.getElementById("stuteSelect");
  const besitzerSelect = document.getElementById("besitzerSelect");
  const sortDropdown = document.getElementById("sortDropdown");
  const ergebnis = document.getElementById("ergebnis");

  let stuten = [];
  let hengste = [];

  // --- Daten laden ---
  async function ladeDaten() {
    try {
      stuten = await fetch("data/stuten.json").then(r => r.json());
      hengste = await fetch("data/hengste.json").then(r => r.json());
      fuelleDropdowns();
    } catch (err) {
      console.error("Fehler beim Laden:", err);
    }
  }

  function pick(obj, key) {
    return obj[key] || obj[key.toLowerCase()] || obj[key.toUpperCase()] || "";
  }

  function fuelleDropdowns() {
    stuteSelect.innerHTML = '<option value="">– Alle Stuten –</option>';
    besitzerSelect.innerHTML = '<option value="">– Alle Besitzer –</option>';

    stuten.forEach((s, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = pick(s, "Name");
      stuteSelect.appendChild(opt);
    });

    const besitzer = [...new Set(stuten.map(s => pick(s, "Besitzer")))].filter(x => x);
    besitzer.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      besitzerSelect.appendChild(opt);
    });
  }

  // --- Notenlogik ---
  function noteAusFehlern(fehler) {
    if (fehler === 0) return 1;
    if (fehler === 1) return 2;
    if (fehler <= 3) return 3;
    return 5;
  }

  function berechneDurchschnitt(stute, hengst) {
    const noten = [];
    for (const merk of MERKMALE) {
      const s = (stute[merk] || "").split(/\s+/);
      const h = (hengst[merk] || "").split(/\s+/);
      if (s.length < 8 || h.length < 8) continue;
      let fehler = 0;
      for (let i = 0; i < 8; i++) if (s[i] !== h[i]) fehler++;
      noten.push(noteAusFehlern(fehler));
    }
    if (!noten.length) return 0;
    return noten.reduce((a,b)=>a+b,0)/noten.length;
  }

  function bewerteNote(wert) {
    if (wert <= 1.5) return "Exzellent";
    if (wert <= 2.5) return "Sehr gut";
    if (wert <= 3.5) return "Gut";
    if (wert <= 4.5) return "Befriedigend";
    return "Ausreichend";
  }

  function scorePair(stute, hengst) {
    let total = 0, count = 0;
    for (const merk of MERKMALE) {
      const s = (stute[merk] || "").split(/\s+/);
      const h = (hengst[merk] || "").split(/\s+/);
      if (s.length < 8 || h.length < 8) continue;
      let treffer = 0;
      for (let i = 0; i < 8; i++) if (s[i] === h[i]) treffer++;
      total += treffer / 8;
      count++;
    }
    return count ? total / count : 0;
  }

  // --- Ausgabe ---
  function zeigeVorschlaege() {
    const selStute = stuteSelect.value;
    const selBesitzer = besitzerSelect.value;
    ergebnis.innerHTML = "";

    let stutenListe = [];
    if (selStute) {
      stutenListe.push(stuten[parseInt(selStute)]);
    } else if (selBesitzer) {
      stutenListe = stuten.filter(s => pick(s,"Besitzer") === selBesitzer);
    } else {
      stutenListe = stuten;
    }

    stutenListe.forEach(stute => {
      const kombis = hengste.map(h => {
        const avg = berechneDurchschnitt(stute, h);
        const score = scorePair(stute, h);
        return {...h, avg, score};
      }).sort((a,b)=>a.avg-b.avg).slice(0,3);

      let html = `<div class="match">
        <h3>${pick(stute,"Name")}</h3>
        <div class="owner-name">${pick(stute,"Besitzer")}</div>
        <p><b>Farbgenetik Stute:</b> ${pick(stute,"Farbgenetik") || "-"}</p>
        <ul class="hengst-list">`;

      kombis.forEach(k => {
        html += `<li class="hengst-card">
          • <b>${pick(k,"Name")}</b><br>
          <i>Farbgenetik:</i> ${pick(k,"Farbgenetik") || "-"}<br>
          <i>Durchschnittsnote:</i> ${k.avg.toFixed(2)} — ${bewerteNote(k.avg)}
        </li>`;
      });
      html += `</ul></div>`;
      ergebnis.innerHTML += html;
    });
  }

  stuteSelect.addEventListener("change", zeigeVorschlaege);
  besitzerSelect.addEventListener("change", zeigeVorschlaege);
  sortDropdown.addEventListener("change", zeigeVorschlaege);

  document.querySelectorAll(".tab-button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.remove("hidden");
    });
  });

  ladeDaten();
});
