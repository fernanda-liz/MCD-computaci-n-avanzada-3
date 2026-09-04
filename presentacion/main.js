const slides = [...document.querySelectorAll(".slide")];
const progreso = document.getElementById("progreso");
const contador = document.getElementById("contador");
let actual = 0;

function mostrar(indice) {
  actual = Math.max(0, Math.min(indice, slides.length - 1));
  slides.forEach((s, i) => s.classList.toggle("activa", i === actual));
  progreso.style.width = ((actual + 1) / slides.length) * 100 + "%";
  contador.textContent = `${actual + 1} / ${slides.length}`;
  if (location.hash !== "#" + (actual + 1)) {
    history.replaceState(null, "", "#" + (actual + 1));
  }
}

function siguiente() { mostrar(actual + 1); }
function anterior() { mostrar(actual - 1); }

document.addEventListener("keydown", (ev) => {
  if (["ArrowRight", "PageDown", " "].includes(ev.key)) { ev.preventDefault(); siguiente(); }
  else if (["ArrowLeft", "PageUp"].includes(ev.key)) { ev.preventDefault(); anterior(); }
  else if (ev.key === "Home") { ev.preventDefault(); mostrar(0); }
  else if (ev.key === "End") { ev.preventDefault(); mostrar(slides.length - 1); }
  else if (ev.key === "n" || ev.key === "N") { document.body.classList.toggle("con-notas"); }
});

document.getElementById("siguiente").addEventListener("click", siguiente);
document.getElementById("anterior").addEventListener("click", anterior);

// avanzar tocando la mitad derecha de la pantalla, retroceder en la izquierda
// (sin capturar clics sobre enlaces ni botones de la barra de control)
document.addEventListener("click", (ev) => {
  if (ev.target.closest("a, button")) return;
  if (ev.clientX > window.innerWidth * 0.5) siguiente();
  else anterior();
});

const desdeHash = parseInt((location.hash || "").replace("#", ""), 10);
mostrar(Number.isFinite(desdeHash) && desdeHash > 0 ? desdeHash - 1 : 0);
