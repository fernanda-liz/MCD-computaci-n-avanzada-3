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
  ajustarFondos();
}

function siguiente() { if (actual < slides.length - 1) mostrar(actual + 1, "adelante"); }
function anterior() { if (actual > 0) mostrar(actual - 1, "atras"); }

// El fondo de motas doradas (.lapis-fondo) es position:absolute dentro de
// .slide, que en pantallas angostas gana overflow-y:auto. inset:0 por sí
// solo lo deja del alto del viewport (clientHeight), no del contenido
// completo (scrollHeight) — por eso se veía cortado apenas la diapositiva
// necesitaba scroll. Se iguala a mano en cada cambio de diapositiva y resize.
function ajustarFondos() {
  slides.forEach((slide) => {
    const fondo = slide.querySelector(".lapis-fondo");
    if (fondo) fondo.style.height = Math.max(slide.scrollHeight, slide.clientHeight) + "px";
  });
}

// ── Puntero presentador inalámbrico ──
// Los punteros (HP SS10, Logitech, genéricos) se presentan al sistema como un
// teclado USB. No hay driver ni emparejamiento que programar: basta con atender
// las teclas que emiten. Se aceptan varias por función porque cada marca elige
// las suyas, y así el mismo deck responde a cualquier puntero prestado.
const TECLAS_SIGUIENTE = ["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"];
const TECLAS_ANTERIOR  = ["ArrowLeft", "ArrowUp", "PageUp", "Backspace"];
const TECLAS_NEGRA     = [".", "b", "B"];   // botón de pantalla negra
const TECLAS_BLANCA    = [",", "w", "W"];   // algunos mandos usan blanco

function velar(modo) {
  document.body.classList.toggle("pantalla-negra", modo === "negra");
  document.body.classList.toggle("pantalla-blanca", modo === "blanca");
}

function velado() {
  return document.body.classList.contains("pantalla-negra") ||
         document.body.classList.contains("pantalla-blanca");
}

function pantallaCompleta() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.();
  }
}

document.addEventListener("keydown", (ev) => {
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return;

  // con la pantalla velada, la primera tecla solo devuelve la imagen:
  // así un clic accidental del puntero no salta de diapositiva a ciegas
  if (velado()) {
    ev.preventDefault();
    velar(null);
    return;
  }

  if (TECLAS_SIGUIENTE.includes(ev.key))      { ev.preventDefault(); siguiente(); }
  else if (TECLAS_ANTERIOR.includes(ev.key))  { ev.preventDefault(); anterior(); }
  else if (TECLAS_NEGRA.includes(ev.key))     { ev.preventDefault(); velar("negra"); }
  else if (TECLAS_BLANCA.includes(ev.key))    { ev.preventDefault(); velar("blanca"); }
  else if (ev.key === "Home")                 { ev.preventDefault(); mostrar(0, "atras"); }
  else if (ev.key === "End")                  { ev.preventDefault(); mostrar(slides.length - 1, "adelante"); }
  // F5 es el botón "reproducir" del puntero: entra y sale de pantalla completa.
  // A propósito NO vuelve a la diapositiva 1, para que pulsarlo a mitad de la
  // charla no arruine la presentación.
  else if (ev.key === "F5" || ev.key === "f" || ev.key === "F") { ev.preventDefault(); pantallaCompleta(); }
  else if (ev.key === "Escape")               { velar(null); }
  else if (ev.key === "n" || ev.key === "N")  { document.body.classList.toggle("con-notas"); }
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
actual = Math.max(0, Math.min(inicial, slides.length - 1));
// la portada trae "activa" fija en el HTML — si se abre directo en otra
// diapositiva (hash, o al refrescar a mitad de charla), hay que sacarla
// de encima o queda montada debajo de la que sí corresponde.
slides.forEach((s) => s.classList.remove("activa"));
slides[actual].classList.add("activa");
progreso.style.width = ((actual + 1) / slides.length) * 100 + "%";
contador.textContent = `${actual + 1} / ${slides.length}`;
ajustarFondos();
window.addEventListener("resize", ajustarFondos);

// ── Vista previa 4:3 ──
// Simulación real, no un CSS transform del deck ya renderizado: se carga
// index.html otra vez dentro de un iframe con viewport fijo 1024x768 (XGA,
// la resolución 4:3 más común en proyectores viejos) y se escala visualmente
// para caber en pantalla. Como el iframe tiene su propio viewport, todo lo
// que adentro está en vw/vh/clamp() calcula exactamente como lo haría un
// proyector real de esa resolución — no es una aproximación.
const esEmbebido = new URLSearchParams(location.search).get("embed") === "1";
const conmutadorFormato = document.getElementById("formato-conmutador");

if (esEmbebido) {
  // el deck de adentro del iframe no necesita su propio interruptor
  conmutadorFormato?.remove();
} else {
  const btn169 = document.getElementById("btn-formato-169");
  const btn43 = document.getElementById("btn-formato-43");
  const simulador = document.getElementById("simulador-4-3");
  const iframe4x3 = document.getElementById("iframe-4-3");
  const btnCerrarSimulador = document.getElementById("btn-cerrar-simulador");

  function ajustarEscalaSimulador() {
    const margen = 0.92;
    const escala = Math.min(
      (window.innerWidth * margen) / 1024,
      (window.innerHeight * margen) / 768
    );
    iframe4x3.style.transform = `scale(${escala})`;
  }

  function mostrarSimulador4x3() {
    iframe4x3.src = `index.html?embed=1#${actual + 1}`;
    simulador.classList.remove("oculto");
    ajustarEscalaSimulador();
    btn43.classList.add("formato-activo");
    btn43.setAttribute("aria-pressed", "true");
    btn169.classList.remove("formato-activo");
    btn169.setAttribute("aria-pressed", "false");
  }

  function ocultarSimulador4x3() {
    simulador.classList.add("oculto");
    iframe4x3.src = "about:blank";
    btn169.classList.add("formato-activo");
    btn169.setAttribute("aria-pressed", "true");
    btn43.classList.remove("formato-activo");
    btn43.setAttribute("aria-pressed", "false");
  }

  btn43?.addEventListener("click", mostrarSimulador4x3);
  btn169?.addEventListener("click", ocultarSimulador4x3);
  btnCerrarSimulador?.addEventListener("click", ocultarSimulador4x3);
  window.addEventListener("resize", () => {
    if (!simulador.classList.contains("oculto")) ajustarEscalaSimulador();
  });
}
