# TP7 — Curvas de Bézier racionales

Adaptá tu implementación de Bézier cúbica a una **Bézier racional**, modificando
únicamente el vertex shader **`bezierVS` en [`ejercicio.js`](ejercicio.js)**.
La interfaz, el envío de pesos y las visualizaciones ya están resueltos.

## Datos que recibe el shader

- `t`: parámetro de la curva, entre 0 y 1, distinto para cada vértice.
- `p0`, `p1`, `p2`, `p3`: puntos de control (`vec2`).
- `w1`, `w2`: pesos positivos de los puntos internos, enviados como uniforms.
  Los pesos de los extremos `p0` y `p3` están fijos en 1.
- `mvp`: matriz para transformar el punto calculado a coordenadas de clip.
