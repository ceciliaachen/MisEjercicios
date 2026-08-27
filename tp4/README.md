# TP4 — Rasterización de triángulos con baricéntricas

Implementás **una sola función**: `drawTriangle` en `ejercicio4.js` (marcada con `TODO`).
Rellena un triángulo pintando los píxeles de adentro y resuelve la visibilidad con un
**z-buffer**. Cámara, proyecciones y álgebra ya vienen dadas.

## Cómo correrlo

```bash
# desde tp4/
python3 -m http.server 8000   # http://localhost:8000/index.html
```

- `index.html` — app interactiva. Hasta que implementes `drawTriangle`, el cubo se ve vacío.
- `test.html` — tests (se ponen en verde a medida que lo completás).

## Qué implementar: `drawTriangle(img, depth, v0, v1, v2, rgb)`

Es el **último paso** del pipeline. El pipeline la llama **una vez por cada triángulo**
de la escena, y los vértices `v0, v1, v2` llegan **ya proyectados a coordenadas de
pantalla** (`[x, y, z]`, píxeles): la cámara, la proyección y el paso a pantalla ya
ocurrieron antes. Acá no queda 3D: solo hay que decidir, píxel por píxel, qué se pinta.

1. **Bounding box.** Recorré solo los píxeles entre el mín/máx de las `x` y de las `y`
   de los vértices, recortado a `[0, w-1] × [0, h-1]`.
2. **Área.** `area = edge(v0, v1, v2)`. Si es `0`, el triángulo es degenerado → salí.
3. **Baricéntricas.** Para el centro de cada píxel `p = [x + 0.5, y + 0.5]`:
   ```
   w0 = edge(v1, v2, p) / area
   w1 = edge(v2, v0, p) / area
   w2 = edge(v0, v1, p) / area
   ```
   El píxel está **dentro** si `w0, w1, w2 >= 0` (si alguna es negativa, se descarta).
4. **Profundidad.** `z = w0*v0[2] + w1*v1[2] + w2*v2[2]`.
5. **Z-buffer.** Con `idx = y*w + x`, pintá **solo si el píxel está más cerca**
   (`z > depth[idx]`): actualizá `depth[idx] = z` y escribí el color.

## Datos que necesitás

- `edge(a, b, c)` (provista) = producto cruz 2D de `(b-a)` y `(c-a)` = **doble del área
  con signo**. Sirve para las baricéntricas y da su signo.
- **Z-buffer** (`depth`): un valor de profundidad por píxel, arranca en `-Infinity`.
  Convención de este TP: **`z` mayor = más cerca**. Sin él, el último triángulo dibujado
  taparía a los demás aunque esté detrás.
- **Imagen** `img = { data, w, h }`: `data` es RGBA, **4 bytes por píxel**. El píxel
  `(x, y)` empieza en `idx*4`; poné `alpha = 255` al pintar.

Todo lo demás está marcado como `PROVISTA` y no hay que tocarlo.

## Archivos

| Archivo | Rol |
| --- | --- |
| `ejercicio4.js` | **Acá trabajás vos** (`drawTriangle`) + funciones provistas. |
| `tp4.js` | Pipeline (`render`), datos del cubo y UI. |
| `zbuffer-view.js` | Mini-vista del z-buffer en escala de grises. |
| `index.html` / `style.css` | Interfaz. |
| `test.html` / `test-ejercicio4.js` | Tests. |
