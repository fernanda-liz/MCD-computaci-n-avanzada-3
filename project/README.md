# Proyecto Final · Bitácora de probetas

Artefacto computacional para registrar y explorar las probetas del biocompuesto de merma de lapislázuli
(tesis, Magíster en Ciencias del Diseño UAI).

**Fernanda Liz Cabezas G.** · Computación Avanzada · MCD UAI · 2026

## Pregunta

¿Qué combinación de carga mineral, matriz y parámetros de proceso conviene ensayar a continuación,
dado lo que ya se ha medido — propio y publicado?

## Arquitectura

```
INPUT                    REGLAS                  ESTADO            OUTPUT
─────                    ──────                  ──────            ──────
materia prima      →  normalización de     →  probetas.json  →  galería
fabricación pieza  →  campos ausentes         (dataset)         plano cartesiano
banco de pruebas   →  ponderación IDW                           explorador
```

Cada probeta es una ficha con tres bloques, uno por etapa del proceso real:

| Bloque | Qué guarda |
|---|---|
| `materia_prima` | matriz, filler, carga wt%, densidad, granulometría, método de mezcla, temperatura, consistencia del filamento |
| `fabricacion_pieza` | proceso, temperatura de impresión, velocidad, posición, norma de la probeta |
| `banco_pruebas` | tracción, flexión, módulos, compresión, norma del ensayo, observación |

El esquema es **aditivo**: un campo ausente o en `null` significa "no medido todavía", nunca cero.
Agregar una probeta con parámetros nuevos no rompe las anteriores.

## Reglas principales

1. **Ausencia ≠ cero.** Las probetas propias (PA, PB, PC) existen en el sistema con sus parámetros
   de fabricación completos y sus campos de ensayo vacíos. En el plano aparecen en una banda inferior,
   en su carga real sobre el eje X, esperando su valor de resistencia. El vacío es visible, no se disimula.

2. **Origen visible.** Cada ficha declara si es `propio` o `literatura` y se distingue por color y badge.
   Ningún dato bibliográfico se confunde con un ensayo propio.

3. **Estimación por distancia inversa (IDW).** El explorador estima la resistencia flexural esperada
   para una carga arbitraria ponderando las probetas ensayadas por `1 / distancia²` en carga de filler.
   No es un modelo entrenado: es una regla explícita que muestra qué probetas la sustentan y con
   qué porcentaje cada una. Si la carga pedida sale del rango medido, avisa que está extrapolando.

4. **Derivación explícita.** Cuando un paper reporta un porcentaje de mejora en vez del valor absoluto,
   el valor se calcula desde la línea base y la ficha muestra el cálculo en el campo `derivacion`.

## Datos

Ningún valor es inventado.

- **Propias** — Cabezas, F. y López S., V. (2026). *LAZULform — Evaluación 3*. Inteligencia Material, MCD UAI.
  Tres pruebas FDM con sustitutos minerales por matching de densidad (cemento Portland, esmalte vitrificable).
  Sin caracterización mecánica todavía.
- **Literatura** — Khan, I. et al. (2023), *J. Mater. Res. Technol.* 24, 703–714 (PLA + polvo de pizarra,
  0/5/10/15 wt%); Al-Mazrouei, N. et al. (2026), *Green Technologies and Sustainability* (PLA + piedra
  volcánica); Coppola, B. et al. (2018), *Materials* 11(10), 1947 (PLA + arcilla, parámetros FDM).

## Siguientes pasos

- Cargar las probetas reales de lapislázuli a medida que se fabriquen y ensayen.
- Control de consistencia del filamento (grumos, variación de diámetro) con cámara + Arduino y un
  modelo de visión: su salida entra como campo `consistencia_filamento` dentro de `materia_prima`,
  sin que el artefacto publicado dependa de hardware local.
- Sumar granulometría (25 / 50 / 100 µm) como segundo eje de exploración una vez haya molienda calibrada.

## Ejecutar localmente

El artefacto lee `probetas.json` con `fetch`, así que necesita un servidor:

```bash
python3 -m http.server 4173
```

Luego abrir `http://localhost:4173/project/`.
