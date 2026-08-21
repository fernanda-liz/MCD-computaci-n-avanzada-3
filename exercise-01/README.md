# Ejercicio 01

## Qué cambié en el Campo Generativo (Fernanda Liz Cabezas G.)

Partiendo de la guía original de `lab-02/`, modifiqué y agregué las siguientes reglas:

1. **Altura en espiral.** Cambié la altura para que dependa también del ángulo respecto al centro (`Math.atan2(z, x)`), no solo de la distancia. Antes el patrón eran anillos concéntricos parejos; ahora se tuerce en espiral. Es ajustable con el slider **Espiral** (en 0 vuelve a ser anillos normales).

2. **Color automático por altura (Regla C, nueva).** Agregué una regla de color para que dependa de la altura de cada torre, no de un slider manual: las torres más bajas son azules, las más altas doradas. El color se recalcula solo cada vez que cambian los parámetros.

3. **Retroceso interactivo por cursor (Regla D, nueva).** Agregué una relación entre la posición del cursor y la altura: las torres cercanas al mouse bajan suavemente, como si se "alejaran", y vuelven solas a su altura original al alejar el cursor. Usa un raycaster que proyecta el mouse sobre el plano del campo.

4. **Nombre de la autora** visible en el encabezado de la página.

El proyecto vive en [`lab-02/`](../lab-02/), y el detalle completo de cada cambio, con el prompt exacto usado para pedirlo, está documentado en [`AI_USAGE.md`](../AI_USAGE.md) del repositorio.
