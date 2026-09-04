const deck = document.getElementById("deck");
const slides = [...document.querySelectorAll(".slide")];
const progreso = document.getElementById("progreso");
const contador = document.getElementById("contador");
let actual = 0;
let saliendo = null;

// contenedores cuyos hijos entran uno a uno en vez de aparecer en bloque
const CONTENEDORES = ".ref-grid, .cols-2, .cols-3, .taller, .cierre-grid, .siguientes-items, .guion, .split-codigo";

// Marca cada bloque con su turno de entrada. Se hace desde JS para no
// ensuciar el HTML con atributos de animación repetidos en cada diapositiva.
function prepararTurnos() {
  slides.forEach((slide) => {
    let i = 0;
    [...slide.children].forEach((hijo) => {
      if (hijo.classList.contains("lapis-fondo") || hijo.classList.contains("notas")) return;
      hijo.style.setProperty("--i", i++);
    });

    slide.querySelectorAll(CONTENEDORES).forEach((cont) => {
      cont.classList.add("contenedor-anim");
      [...cont.children].forEach((item, j) => {
        item.classList.add("anim-item");
        item.style.setProperty("--j", j);
        // hereda el turno del contenedor para encadenar con el resto de la página
        item.style.setProperty("--i", cont.style.getPropertyValue("--i") || 0);
      });
    });

    // el diagrama de arquitectura se arma columna por columna
    slide.querySelectorAll(".diagrama .d-caja, .diagrama .d-cap").forEach((el, k) => {
      el.style.setProperty("--k", k);
    });
    slide.querySelectorAll(".diagrama .d-flecha").forEach((el, k) => {
      el.style.setProperty("--k", k);
    });
  });
}

function mostrar(indice, direccion) {
  const destino = Math.max(0, Math.min(indice, slides.length - 1));
  if (destino === actual && slides[actual].classList.contains("activa")) return;

  deck.dataset.dir = direccion || (destino > actual ? "adelante" : "atras");

  // la diapositiva anterior se marca como saliente para que tenga su propia salida
  if (saliendo) saliendo.classList.remove("saliendo");
  const previa = slides[actual];
  if (previa && destino !== actual) {
    previa.classList.remove("activa");
    previa.classList.add("saliendo");
    saliendo = previa;
    setTimeout(() => previa.classList.remove("saliendo"), 500);
  }

  actual = destino;
  const nueva = slides[actual];

  // reiniciar las animaciones de entrada: quitar la clase, forzar reflow y volver a ponerla
  nueva.classList.remove("activa");
  void nueva.offsetWidth;
  nueva.classList.add("activa");

  progreso.style.width = ((actual + 1) / slides.length) * 100 + "%";
  contador.textContent = `${actual + 1} / ${slides.length}`;
  if (location.hash !== "#" + (actual + 1)) {
    history.replaceState(null, "", "#" + (actual + 1));
  }
}

function siguiente() { if (actual < slides.length - 1) mostrar(actual + 1, "adelante"); }
function anterior() { if (actual > 0) mostrar(actual - 1, "atras"); }

document.addEventListener("keydown", (ev) => {
  if (["ArrowRight", "PageDown", " "].includes(ev.key)) { ev.preventDefault(); siguiente(); }
  else if (["ArrowLeft", "PageUp"].includes(ev.key)) { ev.preventDefault(); anterior(); }
  else if (ev.key === "Home") { ev.preventDefault(); mostrar(0, "atras"); }
  else if (ev.key === "End") { ev.preventDefault(); mostrar(slides.length - 1, "adelante"); }
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

// deslizar en pantallas táctiles
let tocoX = null;
document.addEventListener("touchstart", (ev) => { tocoX = ev.changedTouches[0].clientX; }, { passive: true });
document.addEventListener("touchend", (ev) => {
  if (tocoX === null) return;
  const salto = ev.changedTouches[0].clientX - tocoX;
  if (Math.abs(salto) > 55) { salto < 0 ? siguiente() : anterior(); }
  tocoX = null;
}, { passive: true });

prepararTurnos();
const desdeHash = parseInt((location.hash || "").replace("#", ""), 10);
const inicial = Number.isFinite(desdeHash) && desdeHash > 0 ? desdeHash - 1 : 0;
actual = inicial === 0 ? 0 : inicial;
slides[actual].classList.add("activa");
progreso.style.width = ((actual + 1) / slides.length) * 100 + "%";
contador.textContent = `${actual + 1} / ${slides.length}`;
