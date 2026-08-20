# AI Usage Log

Documenta de manera breve cuándo y para qué utilizaste asistentes de IA. El objetivo no es registrar cada mensaje, sino mantener trazabilidad sobre decisiones importantes.

## Declaración de uso de IA

Este repositorio fue desarrollado con apoyo de **Claude (Claude Code)**, un asistente de inteligencia artificial de Anthropic, como copiloto de programación durante el curso Computación Avanzada (MCD, UAI, 2026).

El uso de IA en este proyecto es **exclusivamente con fines educativos**, dentro del marco explícitamente autorizado por el profesor del curso. La IA se utilizó para acelerar la lectura, localización y escritura de código a partir de instrucciones específicas dadas por la autora (prompts documentados abajo). Las decisiones de diseño — qué regla modificar, qué comportamiento explorar y por qué — fueron tomadas por la autora; la IA actuó como herramienta de implementación, no como reemplazo del criterio de diseño.

Cada intervención relevante queda registrada a continuación con el prompt exacto utilizado, para mantener trazabilidad completa y transparente del proceso.

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

### 2026-08-14 - LAB02: fijar el visor 3D al hacer scroll en pantallas angostas

**Herramienta / agente:** Claude (Claude Code)

**Qué pedí (prompt usado):**
"Desde los parámetros, ¿se puede agregar una barra de scroll para que cuando bajo no pierda la visibilidad del campo generativo, pero que este scroll propio de los parámetros no baje por completo la página hasta que haga scroll con el scroll general del navegador?"

**Qué cambió en el proyecto:**
En `lab-02/style.css`, dentro de la media query `@media (max-width:900px)` (la que aplica en pantallas angostas/móvil), se cambió de un layout de una sola columna con scroll de página completa, a un layout de dos filas: el visor 3D (`.viewport-shell`) queda fijo en el 45% superior de la pantalla (`position: sticky; height: 45vh`), y el panel de parámetros (`.controls-panel`) ocupa el resto con su propio scroll interno (`overflow-y: auto`). Se cambió `body { overflow: auto }` por `body { overflow: hidden }` para que la página en sí ya no se pueda desplazar. En pantallas anchas (desktop) no se modificó nada, porque ese comportamiento ya existía.

**Qué revisé o corregí manualmente:**
Probé en un tamaño de ventana angosto (420×800) que: 1) la página completa no se moviera (`window.scrollY` se mantiene en 0), 2) el panel de parámetros sí se desplazara internamente al hacer scroll sobre él, y 3) el campo generativo permaneciera visible en todo momento. Tuve que reiniciar el servidor local porque el navegador estaba sirviendo una versión en caché del CSS y el cambio no se reflejaba.

**Qué aprendí / qué error apareció:**
No es un cambio a una regla generativa, sino a la interfaz: separé el scroll de la página del scroll del panel de parámetros usando `overflow-y: auto` en el panel y `overflow: hidden` en el body, con el visor en `position: sticky`. El único inconveniente fue de caché del navegador durante las pruebas, no del código en sí.
