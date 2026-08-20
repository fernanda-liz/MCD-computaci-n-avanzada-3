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
