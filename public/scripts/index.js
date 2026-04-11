let filteredTrekking = [];
var J = 0
var url = "https://viaggiditony.it"
var src = []
var pages

document.addEventListener("DOMContentLoaded", function () {

  // ─────────────────────────────────────────────
  // FIX: Event listeners al posto degli onclick inline
  // ─────────────────────────────────────────────
// inizializzazione — esegui una volta al caricamento pagina
const tooltipEl = document.getElementById('tooltipDifficultyWrapper');
new bootstrap.Tooltip(tooltipEl);
const difficultyInput = document.getElementById('difficulty');
const ulDifficulty = document.getElementById('ulDifficulty');
let dropdownInstance = null;

// apri/chiudi il dropdown al click sull'input quando è abilitato
difficultyInput.addEventListener('click', function () {
  if (this.classList.contains('input-disabled')) return;
  if (!dropdownInstance) {
    dropdownInstance = new bootstrap.Dropdown(ulDifficulty, {
      reference: difficultyInput
    });
  }
  dropdownInstance.toggle();
});

ulDifficulty.addEventListener('click', function (e) {
   dropdownInstance.hide();
  
});


// chiudi cliccando fuori
document.addEventListener('click', function (e) {
  if (!difficultyInput.contains(e.target) && !ulDifficulty.contains(e.target)) {
    if (dropdownInstance) dropdownInstance.hide();
  }
});
  // onclick="show()" sul bottone Filtra
  document.getElementById("formS")
    .querySelector("button[aria-label='filtra']")
    ?.addEventListener("click", function (e) {
      e.preventDefault();
      show();
    });

  // Alternativa più robusta: cerca il bottone direttamente
  document.querySelectorAll("button").forEach(btn => {
    if (btn.textContent.trim() === "Filtra") {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        show();
      });
    }
  });

  // onclick="filterTrekking()" sulla barra di ricerca (keydown)
  document.getElementById("search")
    ?.addEventListener("keydown", function () {
      filterTrekking();
    });

  // onclick="zona(...)" — dropdown zona (event delegation)
  document.querySelectorAll("#filtri .dropdown-menu").forEach(menu => {
    menu.addEventListener("click", function (e) {
      const item = e.target.closest(".dropdown-item");
      if (!item) return;
      e.preventDefault();

      const text = item.textContent.trim();

      // Capisce a quale dropdown appartiene in base al placeholder del parent
      const inputGroup = menu.closest(".input-group");
      const input = inputGroup?.querySelector("input");
      if (!input) return;

      const placeholder = input.placeholder;

      if (placeholder === "Zona") {
        zona(text);
      } else if (placeholder === "Tipologia") {
        tipo(text);
      } else if (placeholder === "Stagione") {
        season(text);
      } else if (placeholder === "Difficoltà") {
        difficulty(text);
      }
    });
  });

  // ─────────────────────────────────────────────
  // Submit filtri
  // ─────────────────────────────────────────────
  document.getElementById("formFilter").addEventListener("submit", async function (e) {
    e.preventDefault();
    const data = {
      location: document.getElementById("location").value,
      tipo: document.getElementById("tipo").value,
      difficulty: document.getElementById("difficulty").value,
      season: document.getElementById("season").value,
      minDistance: document.getElementById("minDistance").value,
      maxDistance: document.getElementById("maxDistance").value,
      minElevation: document.getElementById("minElevation").value,
      maxElevation: document.getElementById("maxElevation").value,
    };
    const res = await fetch("/filter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const filtrati = await res.json();
    const col = document.querySelectorAll(".col-sm-4");
    col.forEach(c => {
      c.innerHTML = "";
      c.style.display = "none";
    });
    const row = document.getElementById("row-1");
    filtrati.forEach(trekking => {
      const card = `<div class="col-sm-4 col-lg-2 col-6 mb-3" style="display: block">
        <a href="/trekking/${trekking.name}" style="all: unset">
          <div class="card h-100" style="width: auto">
            <img loading="lazy" srcset="
              /${trekking.name}-${trekking.date}/copertina-400.jpg 400w,
              /${trekking.name}-${trekking.date}/copertina-800.jpg 800w,
              /${trekking.name}-${trekking.date}/copertina-1200.jpg 1200w
            " sizes="(min-width: 992px) 16.66vw, (min-width: 576px) 33.33vw, 50vw"
            fetchpriority="high"
            src="https://res.cloudinary.com/dieh3kepz/image/upload/${trekking.name}-${trekking.date}/copertina-400.jpg"
            class="card-img-top" name="${trekking.name}" alt="Foto copertina ${trekking.name}">
            <div class="card-body bottom-0">
              <h5 class="card-title">${trekking.name}</h5>
              <p class="card-text">${trekking.date}</p>
            </div>
          </div>
        </a>
      </div>`;
      row.innerHTML += card;
    });
  });

});

// ─────────────────────────────────────────────
// FUNZIONI
// ─────────────────────────────────────────────

function filterTrekking() {
  const elems = Array.from(document.querySelectorAll(".col-sm-4"));
  const cols = elems.filter(el => el.textContent.trim() !== "");
  const search = document.getElementById("search").value.toLowerCase();
  cols.forEach(col => {
    if ((col.childNodes[1].childNodes[1].childNodes[3].childNodes[1].innerText).toLowerCase().includes(search)) {
      col.style.display = "block";
    } else {
      col.style.display = "none";
    }
  });
}

function show() {
  var x = document.getElementById("filtri");
  x.style.display = x.style.display === "none" ? "block" : "none";
}

function hideLogo() {
  document.getElementById("newLogo").style.opacity = 0;
}

function showLogo() {
  document.getElementById("newLogo").style.opacity = 0.8;
}

// FIX: season() era inline nell'HTML — ora è qui
function season(stagione) {
  document.getElementById("season").value = stagione;
}

function zona(zona) {
  document.getElementById("location").value = zona;
}

function tipo(tipo) {
const wrapper = document.getElementById('tooltipDifficultyWrapper');
  const tooltipInstance = bootstrap.Tooltip.getInstance(wrapper);
  if (tooltipInstance) tooltipInstance.dispose();
  wrapper.removeAttribute('data-bs-toggle');
  wrapper.removeAttribute('title');

  const input = document.getElementById('difficulty');
  input.classList.remove('input-disabled');
  input.classList.add('white');

  // resetta dropdown
  dropdownInstance = null;
  document.getElementById("difficulty").value = "";
  document.getElementById("tipo").value = tipo;

  var ul = document.getElementById("ulDifficulty");
  Array.from(ul.getElementsByTagName("li")).forEach(el => el.remove());

  const makeItem = (label, value) => {
    let li = document.createElement("li");
    let a = document.createElement("a");
    a.classList = "dropdown-item";
    a.innerText = label;
    // FIX: addEventListener invece di a.onclick
    a.addEventListener("click", function (e) {
      e.preventDefault();
      difficulty(value);
    });
    li.appendChild(a);
    ul.appendChild(li);
  };

  if (tipo === "Ferrata") {
    [["EEA - F", "EEA - F"], ["EEA - PD", "EEA - PD"],["EEA - AD", "EEA - AD"], ["EEA - D", "EEA - D"], ["EEA - TD", "EEA - TD"],]
      .forEach(([label, val]) => makeItem(label, val));

  } else if (tipo === "Escursionismo") {
    ["T", "E", "EE", "EEA", "EAI"]
      .forEach(val => makeItem(val, val));

  } else if (tipo === "Alpinismo") {
    ["F", "PD", "AD", "D", "TD", "ED", "ABO"]
      .forEach(val => makeItem(val, val));

  } else if (tipo === "Multipitch") {
    ulSize();
    window.addEventListener("resize", ulSize);

    let li = document.createElement("li");
    var slider = document.createElement("input");
    slider.type = "range";
    slider.min = 0;
    slider.max = grades.length - 1;
    slider.value = 0;
    slider.id = "gradeSlider";
    slider.style.width = "96%";
    slider.style.marginLeft = "2%";
    // FIX: addEventListener invece di slider.oninput
    slider.addEventListener("input", function () {
      document.getElementById("difficulty").value = grades[this.value];
    });
    li.appendChild(slider);
    ul.appendChild(li);

  } else {
    document.getElementById("divDifficulty").style.display = "none";
  }

  
}

function difficulty(difficoltà) {
  document.getElementById("difficulty").value = difficoltà;
}

function ulSize() {
  var ul = document.getElementById("ulDifficulty");
  var targetElement = document.getElementsByClassName("input-group-text")[6];
  var spamPX = targetElement.getBoundingClientRect().width;
  var parent = ul.parentElement;
  var parentWidth = parent.getBoundingClientRect().width;
  ul.style.width = (parentWidth - spamPX) + "px";
}

var dataNewest;

function next() {
  var items = (
    document.getElementById("distance").value !== "" ||
    document.getElementById("elevation").value !== "" ||
    document.getElementById("season").value !== "" ||
    document.getElementById("difficulty").value !== "" ||
    document.getElementById("date")?.value !== ""
  ) ? filteredTrekking : trekkingData;

  var pagesEl = document.getElementById("pages");
  var actualPage = parseInt(pagesEl.innerText);
  if (pages > 1 && actualPage !== pages) {
    actualPage++;
    pagesEl.innerText = actualPage;
    renderTrekkingList(items, actualPage);
  }
}

function prev() {
  var items = (
    document.getElementById("distance").value !== "" ||
    document.getElementById("elevation").value !== "" ||
    document.getElementById("season").value !== "" ||
    document.getElementById("difficulty").value !== ""
  ) ? filteredTrekking : trekkingData;

  var pagesEl = document.getElementById("pages");
  var actualPage = parseInt(pagesEl.innerText);
  if (actualPage !== 1) {
    actualPage--;
    pagesEl.innerText = actualPage;
    renderTrekkingList(items, actualPage);
  }
}

const grades = [
  "4a", "4b", "4c",
  "5a", "5b", "5c",
  "6a", "6a+", "6b", "6b+", "6c", "6c+",
  "7a", "7a+", "7b", "7b+", "7c", "7c+",
  "8a", "8a+", "8b", "8b+", "8c", "8c+",
  "9a", "9a+", "9b", "9b+", "9c"
];