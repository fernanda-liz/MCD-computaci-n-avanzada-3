import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Convención: X = composición (carga de filler), Y (profundidad) = densidad del filler
// (gobierna sedimentación por Ley de Stokes, ver informe LAZULform), Z (altura, "hacia arriba"
// en la escena) = resistencia flexural — igual que en un slicer, Z es la dirección de acumulación,
// aquí acumulación de desempeño mecánico en vez de capas.

const COLOR_ESTADO = {
  completa: 0x92b39c,
  pendiente: 0x6c6f74,
  incompleta: 0xc9695f,
  fallida: 0xc9695f
};

const X_HALF = 5.5;
const Y_HALF = 3.2;
const DENS_MIN = 2.0, DENS_MAX = 5.5; // rango físico: lazurita (2,38) a pirita (5,01), Tabla 1 LAZULform

function crearEtiqueta(texto, tamano, color) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const escala = 64;
  ctx.font = `${escala * 0.62}px -apple-system, sans-serif`;
  const ancho = Math.ceil(ctx.measureText(texto).width) + escala * 0.6;
  canvas.width = ancho;
  canvas.height = escala;
  ctx.font = `${escala * 0.62}px -apple-system, sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(texto, escala * 0.3, escala / 2);

  const textura = new THREE.CanvasTexture(canvas);
  textura.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: textura, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set((ancho / escala) * tamano, tamano, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function geometriaPorRuta(ruta) {
  if (ruta === "SLA") return new THREE.BoxGeometry(0.42, 0.42, 0.42);
  if (ruta === "otro") return new THREE.OctahedronGeometry(0.3, 0);
  return new THREE.SphereGeometry(0.26, 20, 20); // FDM, default
}

let inicializado = false;
let escena, camara, renderer, controles, raycaster, reloj;
let grupoPuntos = [];
let fondoParticulas;
let contenedor, tooltip;
let hoverActual = null;
const mouseNDC = new THREE.Vector2(-10, -10);

function normalizar(probetas) {
  const conFlexural = probetas.filter(p => p.banco_pruebas.flexural_mpa !== null);
  const valoresF = conFlexural.map(p => p.banco_pruebas.flexural_mpa);
  const minF = Math.min(...valoresF);
  const maxF = Math.max(...valoresF);
  const maxFiller = Math.max(...probetas.map(p => p.materia_prima.filler_wt));

  const puntos = probetas.map(p => {
    const x = (p.materia_prima.filler_wt / maxFiller) * (X_HALF * 2) - X_HALF;

    let profundidadY, sinDensidad;
    if (p.materia_prima.densidad_filler_g_cm3 !== null) {
      const td = (p.materia_prima.densidad_filler_g_cm3 - DENS_MIN) / (DENS_MAX - DENS_MIN);
      profundidadY = -Y_HALF + td * (Y_HALF * 2);
      sinDensidad = false;
    } else {
      profundidadY = Y_HALF + 1.1; // carril aparte, fuera del rango físico normal
      sinDensidad = true;
    }

    let alturaZ, sinEnsayo;
    if (p.banco_pruebas.flexural_mpa !== null) {
      const tf = maxF > minF ? (p.banco_pruebas.flexural_mpa - minF) / (maxF - minF) : 0.5;
      alturaZ = 1.2 + tf * 4.2;
      sinEnsayo = false;
    } else {
      alturaZ = 0.3;
      sinEnsayo = true;
    }

    return { probeta: p, x, profundidadY, alturaZ, sinDensidad, sinEnsayo };
  });

  return { puntos, minF, maxF, maxFiller };
}

function construirTooltip(p) {
  const mp = p.materia_prima;
  const bp = p.banco_pruebas;
  const partes = [
    `<strong>${p.nombre}</strong>`,
    `${p.ruta} · ${p.estado}`,
    `X — filler: ${mp.filler_wt} wt% (${mp.filler || "—"})`,
    `Y — densidad: ${mp.densidad_filler_g_cm3 !== null ? mp.densidad_filler_g_cm3 + " g/cm³" : "sin dato"}`,
    `Z — flexión: ${bp.flexural_mpa !== null ? bp.flexural_mpa + " MPa" : "sin ensayo"}`,
    p.incidencias && p.incidencias[0] ? `⚠ ${p.incidencias[0].tipo}` : ""
  ].filter(Boolean);
  return partes.join("<br>");
}

function construirEscena(probetas) {
  contenedor = document.getElementById("visor3d");
  tooltip = document.getElementById("tooltip3d");

  escena = new THREE.Scene();
  escena.background = new THREE.Color(0x0a0e1c);
  escena.fog = new THREE.Fog(0x0a0e1c, 14, 34);

  camara = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camara.position.set(9, 7, 12);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  contenedor.appendChild(renderer.domElement);

  controles = new OrbitControls(camara, renderer.domElement);
  controles.enableDamping = true;
  controles.dampingFactor = 0.08;
  controles.target.set(0, 2, 0);
  controles.maxDistance = 26;
  controles.minDistance = 5;

  const luzHemi = new THREE.HemisphereLight(0xf3efe5, 0x15161a, 1.5);
  escena.add(luzHemi);
  const luzDir = new THREE.DirectionalLight(0xffffff, 2.2);
  luzDir.position.set(6, 10, 6);
  escena.add(luzDir);

  const grilla = new THREE.GridHelper(14, 14, 0x263156, 0x161d38);
  escena.add(grilla);

  const { puntos, minF, maxF, maxFiller } = normalizar(probetas);

  // ---- ejes con etiquetas ----
  const matEje = new THREE.LineBasicMaterial({ color: 0x3d4870 });

  // eje X: composición (carga de filler)
  escena.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-X_HALF, 0.01, 0), new THREE.Vector3(X_HALF, 0.01, 0)
  ]), matEje));

  // eje Y: densidad del filler (profundidad)
  escena.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-X_HALF, 0.01, -Y_HALF), new THREE.Vector3(-X_HALF, 0.01, Y_HALF)
  ]), matEje));

  // eje Z: resistencia flexural (altura)
  escena.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-X_HALF, 0, -Y_HALF), new THREE.Vector3(-X_HALF, 6, -Y_HALF)
  ]), matEje));

  const etX = crearEtiqueta("eje X — carga de filler (wt%)", 0.55, "#d9b25a");
  etX.position.set(0, -0.5, Y_HALF + 1.3);
  escena.add(etX);

  const etY = crearEtiqueta("eje Y — densidad del filler (g/cm³)", 0.5, "#d9b25a");
  etY.position.set(-X_HALF - 2.6, -0.5, 0);
  escena.add(etY);

  const etZ = crearEtiqueta("eje Z — resistencia flexural (MPa)", 0.5, "#d9b25a");
  etZ.position.set(-X_HALF - 0.3, 6.5, -Y_HALF);
  escena.add(etZ);

  // ticks eje X
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    const x = t * (X_HALF * 2) - X_HALF;
    const et = crearEtiqueta(String(Math.round(t * maxFiller)), 0.4, "#7c86a8");
    et.position.set(x, 0.02, Y_HALF + 0.55);
    escena.add(et);
  });

  // ticks eje Y (densidad, g/cm3)
  [2, 3, 4, 5].forEach(v => {
    const t = (v - DENS_MIN) / (DENS_MAX - DENS_MIN);
    const y = -Y_HALF + t * (Y_HALF * 2);
    const et = crearEtiqueta(String(v), 0.35, "#7c86a8");
    et.position.set(-X_HALF - 0.5, 0.02, y);
    escena.add(et);
  });
  const etSinDensidad = crearEtiqueta("sin dato de densidad", 0.35, "#7c86a8");
  etSinDensidad.position.set(-X_HALF - 0.5, 0.02, Y_HALF + 1.1);
  escena.add(etSinDensidad);

  // ticks eje Z (resistencia, MPa)
  [0, 0.5, 1].forEach(t => {
    const z = 1.2 + t * 4.2;
    const valor = Math.round(minF + t * (maxF - minF));
    const et = crearEtiqueta(String(valor), 0.4, "#7c86a8");
    et.position.set(-X_HALF - 0.5, z, -Y_HALF);
    escena.add(et);
  });
  const etSuelo = crearEtiqueta("sin ensayo mecánico", 0.35, "#7c86a8");
  etSuelo.position.set(-X_HALF - 0.7, 0.3, -Y_HALF);
  escena.add(etSuelo);

  // fondo animado: nube de puntos tenues, lejos de los datos
  const nPart = 500;
  const posiciones = new Float32Array(nPart * 3);
  for (let i = 0; i < nPart; i++) {
    const r = 16 + Math.random() * 14;
    const a = Math.random() * Math.PI * 2;
    const alt = (Math.random() - 0.5) * 20;
    posiciones[i * 3] = Math.cos(a) * r;
    posiciones[i * 3 + 1] = alt + 6;
    posiciones[i * 3 + 2] = Math.sin(a) * r;
  }
  const geomPart = new THREE.BufferGeometry();
  geomPart.setAttribute("position", new THREE.BufferAttribute(posiciones, 3));
  const matPart = new THREE.PointsMaterial({ color: 0x2d3760, size: 0.05, transparent: true, opacity: 0.6 });
  fondoParticulas = new THREE.Points(geomPart, matPart);
  escena.add(fondoParticulas);

  const matTallo = new THREE.LineBasicMaterial({ color: 0xeef0f5, transparent: true, opacity: 0.55 });
  grupoPuntos = puntos.map((d, i) => {
    const color = COLOR_ESTADO[d.probeta.estado] || 0x9a9892;
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1, emissive: 0x000000 });
    const marcador = new THREE.Mesh(geometriaPorRuta(d.probeta.ruta), material);
    marcador.position.set(d.x, d.alturaZ, d.profundidadY);
    marcador.userData.probeta = d.probeta;
    marcador.userData.baseAltura = d.alturaZ;
    marcador.userData.fase = i * 0.7;
    escena.add(marcador);

    // tallo al piso: distingue "nuestras pruebas" (propio) de la literatura
    if (d.probeta.origen === "propio") {
      const tallo = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(d.x, 0.01, d.profundidadY), new THREE.Vector3(d.x, d.alturaZ, d.profundidadY)
      ]), matTallo);
      escena.add(tallo);
    }

    return marcador;
  });

  raycaster = new THREE.Raycaster();
  reloj = new THREE.Clock();

  contenedor.addEventListener("mousemove", (ev) => {
    const rect = contenedor.getBoundingClientRect();
    mouseNDC.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    tooltip.style.left = (ev.clientX - rect.left + 14) + "px";
    tooltip.style.top = (ev.clientY - rect.top + 14) + "px";
  });
  contenedor.addEventListener("mouseleave", () => { mouseNDC.set(-10, -10); });

  animar();
}

function animar() {
  requestAnimationFrame(animar);
  const t = reloj.getElapsedTime();

  fondoParticulas.rotation.y = t * 0.02;

  grupoPuntos.forEach(marcador => {
    marcador.position.y = marcador.userData.baseAltura + Math.sin(t * 0.8 + marcador.userData.fase) * 0.08;
  });

  raycaster.setFromCamera(mouseNDC, camara);
  const interseccion = raycaster.intersectObjects(grupoPuntos);
  const nuevoHover = interseccion.length > 0 ? interseccion[0].object : null;

  if (nuevoHover !== hoverActual) {
    if (hoverActual) { hoverActual.material.emissive.setHex(0x000000); hoverActual.scale.setScalar(1); }
    hoverActual = nuevoHover;
    if (hoverActual) {
      hoverActual.material.emissive.setHex(0x2a2318);
      hoverActual.scale.setScalar(1.35);
      tooltip.innerHTML = construirTooltip(hoverActual.userData.probeta);
      tooltip.classList.remove("oculta");
    } else {
      tooltip.classList.add("oculta");
    }
  }

  controles.update();
  renderer.render(escena, camara);
}

function ajustarTamano() {
  if (!contenedor || !renderer) return;
  const w = contenedor.clientWidth;
  const h = contenedor.clientHeight;
  if (w === 0 || h === 0) return;
  camara.aspect = w / h;
  camara.updateProjectionMatrix();
  renderer.setSize(w, h);
}

window.addEventListener("resize", ajustarTamano);

document.querySelector('[data-vista="vista3d"]').addEventListener("click", async () => {
  if (inicializado) {
    requestAnimationFrame(ajustarTamano);
    return;
  }
  inicializado = true;
  const respuesta = await fetch("probetas.json");
  const datos = await respuesta.json();
  construirEscena(datos.probetas);
  requestAnimationFrame(ajustarTamano);
});
