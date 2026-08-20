# AI Usage Log

Documenta de manera breve cuándo y para qué utilizaste asistentes de IA. El objetivo no es registrar cada mensaje, sino mantener trazabilidad sobre decisiones importantes.

## Registro

### 2026-08-14 - LAB02: modificar una regla del Campo Generativo

**Herramienta / agente:** Claude (Claude Code)

**Qué pedí (prompt usado):**
"En `lab-02/main.js`, dentro de `calcularAlturaModulo(x, z)`, además de `distancia`, calcula `angulo = Math.atan2(z, x)` y súmalo (multiplicado por un factor fijo pequeño, ej. 2) al argumento del `Math.sin` antes de multiplicar por `frecuencia`, para que la onda de altura forme una espiral en vez de anillos concéntricos. Mantén `amplitud`, `ruido` y el resto de la función intactos."

**Qué cambió en el proyecto:**
En `calcularAlturaModulo(x, z)` se agregó el cálculo de `angulo = Math.atan2(z, x)` y se incorporó al argumento del `Math.sin`: antes era `Math.sin(distancia * parametros.frecuencia)`, ahora es `Math.sin(distancia * parametros.frecuencia + angulo * 2)`. El resto de la función (ruido, amplitud, el mínimo de 0.25) no se tocó.

**Qué revisé o corregí manualmente:**
Verifiqué que el sistema siguiera funcionando en el navegador (sin errores de consola) y que el patrón visual cambiara de anillos concéntricos parejos a un patrón torcido tipo espiral. Comparé antes/después moviendo los mismos sliders.

**Qué aprendí / qué error apareció:**
Cambié la altura de cada módulo para que dependa también del ángulo respecto al centro (no solo de la distancia), así el patrón de ondas se tuerce en vez de formar círculos perfectos. No apareció ningún error; el cambio fue mínimo y localizado en una sola línea dentro de una sola función.

### 2026-08-14 - LAB02: agregar regla de color (Desafío D)

**Herramienta / agente:** Claude (Claude Code)

**Qué pedí (prompt usado):**
"Agrega una nueva regla generativa a `lab-02/main.js`: el color de cada módulo debe depender de su distancia al centro, con una caída gaussiana (no lineal) desde un color dorado en el centro hasta un color azul en el borde. Cada módulo necesita su propio material porque el color varía individualmente. Libera los materiales viejos en `limpiarCampo()` para evitar fugas de memoria al regenerar el campo con los sliders. No toques las reglas de altura ni de rotación existentes."

**Qué cambió en el proyecto:**
Se agregaron dos colores base (`colorCentro` dorado, `colorBorde` azul) y una función nueva `calcularColorModulo(distancia, sigma)` que usa `Math.exp(-(distancia²)/(2·sigma²))` (caída gaussiana) para mezclar ambos colores con `THREE.Color.lerp`. En `generarCampo()`, cada módulo ahora clona el material base y le asigna su color calculado según su distancia al centro. `sigma` se calcula automáticamente a partir del tamaño del campo (columnas/filas/separación) para que el degradado se vea proporcional sin importar cuántos módulos haya. También se actualizó `limpiarCampo()` para hacer `dispose()` del material de cada módulo antes de removerlo.

**Qué revisé o corregí manualmente:**
Verifiqué en el navegador que no hubiera errores de consola y que el degradado se viera dorado en el centro, transicionando suavemente a azul hacia los bordes, en vez de un cambio brusco. Confirmé visualmente con captura de pantalla.

**Qué aprendí / qué error apareció:**
Agregué el color como un parámetro nuevo del sistema, conectado a la distancia al centro (la misma variable que ya usa la altura), pero con su propia regla (gaussiana en vez de onda). No apareció ningún error; fue necesario recordar liberar memoria (`dispose()`) porque antes todos los módulos compartían un único material y ahora cada uno tiene el suyo.
