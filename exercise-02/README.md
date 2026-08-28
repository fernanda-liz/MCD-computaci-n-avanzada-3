# Ejercicio 02 · Radar de materiales FDM

## Las seis líneas (antes de programar)

Quiero hacer visible qué tan comparables son, en rendimiento mecánico real, los distintos filamentos de impresión 3D FDM que uso en mi trabajo.

Mi fuente de datos es un dataset propio: fichas técnicas oficiales de fabricante (Ultimaker, BASF Forward AM, igus, Kimya, DSM) y un informe de ensayo de laboratorio acreditado (igus iglidur i190), todas para filamento 2,85 mm.

- Dato 01: resistencia tensil (MPa) → normalizar por rango del dataset → posición en el eje "tensil" del radar
- Dato 02: elongación a rotura (%) → normalizar por rango del dataset → posición en el eje "elongación"
- Dato 03: módulo / rigidez (MPa) → normalizar por rango del dataset → posición en el eje "módulo"
- Dato 04: resistencia flexural (MPa) → normalizar por rango del dataset → posición en el eje "flexural"
- Dato 05: resistencia al calor (HDT/Vicat/°C máx. aplicación, °C) → normalizar por rango del dataset → posición en el eje "calor"
- Dato 06: tenacidad al impacto (Izod/Charpy, kJ/m²) → normalizar por rango del dataset → posición en el eje "tenacidad"
- Dato 07: resistencia a la humedad (% de absorción, invertido: menor absorción = más cerca del borde) → normalizar y luego invertir → posición en el eje "humedad"

Espero que al explorarlo podamos comparar de un vistazo qué materiales son rígidos vs. flexibles, resistentes vs. frágiles, y detectar cuáles se parecen entre sí aunque tengan nombres comerciales distintos.

## Fuente de datos

Camino B de la clase (dataset propio, no API en vivo): 15 materiales de mi librería de filamentos de trabajo, con propiedades mecánicas extraídas de fichas técnicas oficiales del fabricante o de informes de ensayo de laboratorio. Ningún valor fue inventado ni estimado — donde el fabricante no publica una propiedad, el dato queda como `null` y no se dibuja ese vértice del radar.

Detalle completo de fuente por material en [`materiales.json`](materiales.json), campo `fuente`.

## Mappings

1. Resistencia tensil → posición en el eje "tensil"
2. Elongación a rotura → posición en el eje "elongación"
3. Módulo (rigidez) → posición en el eje "módulo"
4. Resistencia flexural → posición en el eje "flexural"
5. Resistencia al calor → posición en el eje "calor"
6. Tenacidad al impacto → posición en el eje "tenacidad"
7. Resistencia a la humedad → posición en el eje "humedad" (eje invertido)
8. Material seleccionado → color del polígono (hasta 4 simultáneos)

Nota sobre "calor" y "tenacidad": los fabricantes no siempre reportan la misma norma de ensayo (HDT vs. Vicat vs. temperatura máxima de aplicación; Izod con entalla vs. Charpy sin entalla). Cada valor está documentado con su método exacto en `materiales.json`, campo `fuente`. Se comparan como "orden de magnitud", no como cifra perfectamente equivalente entre fabricantes.

## Variación / interacción

El usuario selecciona hasta 4 materiales de una lista de 15; el radar se redibuja superponiendo sus polígonos para comparar directamente. No es polling en vivo (no existe una API pública de propiedades mecánicas de filamentos — ver conversación de diseño), es variación por selección, forma explícitamente válida según la Clase 03.

## Nota de normalización

Los ejes usan escala visual propia por eje (0 a 1, calculada del rango real del dataset), no una conversión directa de MPa/% a píxeles — igual que la clase advierte: "0–60 bicicletas no tiene por qué convertirse en 0–60 metros".

## Uso de IA

Documentado con prompts exactos en [`AI_USAGE.md`](../AI_USAGE.md) del repositorio.
