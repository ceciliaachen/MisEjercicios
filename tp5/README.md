# TP5 — Introducción a WebGL

Este trabajo práctico tiene dos ejercicios que se resuelven de forma incremental:
primero se dibuja un triángulo 2D y luego un cubo 3D cargado desde un archivo `.ply`.
En ambos casos hay que completar las partes marcadas con `TODO` en el archivo `.js`.

## Cómo ejecutar

Los ejercicios cargan recursos (por ejemplo `cube.ply`) con `fetch`, así que
**no alcanza con abrir el HTML directamente**: hay que servir la carpeta con un
servidor local. Desde la carpeta del ejercicio:

```bash
python3 -m http.server 8000
```

Luego abrir en el navegador `http://localhost:8000/main.html`.

---

## 1. `triangle_webgl/` — Triángulo 2D

Ejercicio introductorio para entender el pipeline básico de WebGL. Se dibuja un
triángulo con un color por vértice (rojo, verde, azul) interpolado en la cara.

> **Nota:** acá **no hay nada 3D**. No se usan matrices de rotación, traslación ni
> proyección: las posiciones de los vértices se pasan tal cual al shader (es
> equivalente a usar una matriz de proyección identidad). El objetivo es solo
> entender el flujo mínimo de WebGL antes de agregar transformaciones en el cubo.

Completar los `TODO` en [triangle_webgl/ejemplo_webgl.js](triangle_webgl/ejemplo_webgl.js):

1. **Shaders** (`vertexShaderSource` / `fragmentShaderSource`): escribir el código
   GLSL. El vertex shader recibe `position` y `color` y setea `gl_Position`; el
   fragment shader pinta con el color interpolado (`gl_FragColor`).
2. **Canvas y estado**: ajustar el viewport a la resolución del canvas y setear el
   color de fondo (`gl.clearColor`).
3. **Buffers**: crear y llenar los buffers de vértices y de colores.
4. **Compilar y linkear** los shaders en un programa y activarlo.
5. **Uniformes y atributos**: linkear los atributos `position` y `color` a sus buffers.
6. **Render**: limpiar la pantalla y dibujar el triángulo con `gl.drawArrays`.

---

## 2. `cube_webgl/` — Cubo 3D

Ejercicio principal. Se dibuja un cubo 3D interactivo (rotación y zoom con el mouse)
cuya geometría y colores se leen desde `cube.ply`. Reutiliza las matrices de
transformación del TP4 ([cube_webgl/tp4.js](cube_webgl/tp4.js), provisto).

Completar los `TODO` en [cube_webgl/ejercicio.js](cube_webgl/ejercicio.js):

1. **`linkAttribute`**: conectar los datos de un atributo del shader con su buffer.
2. **`vshader` / `fshader`**: los shaders GLSL. El vertex shader proyecta cada
   vértice con la matriz uniforme `camera` y pasa el color al fragment shader.
3. **`CompileShader` / `InitShaderProgram`**: compilar cada shader y linkearlos en
   un programa, verificando errores de compilación y de link.
4. **`createBuffer`**: subir datos de vértices a la GPU (`gl.STATIC_DRAW`).
5. **`DrawScene`**: armar la matriz de cámara, cargarla en el uniform `camera`,
   limpiar color y profundidad, y dibujar los triángulos.
6. **`window.onload` (pasos 3 a 5)**: compilar/activar el programa, subir la
   geometría y linkear los atributos, y configurar el estado de render
   (color de fondo, `DEPTH_TEST`, ubicación del uniform `camera`).

### Controles del mouse

Los eventos del mouse solo modifican tres variables globales (`rotX`, `rotY`,
`transZ`) y vuelven a llamar a `DrawScene()`, que reconstruye la matriz de cámara
con esos valores. El cubo en sí no se toca: lo que cambia es cómo lo mira la cámara.

- **Arrastrar**: rota la cámara. El desplazamiento horizontal del mouse acumula
  ángulo en `rotY` (giro alrededor del eje Y, izquierda/derecha) y el vertical en
  `rotX` (giro alrededor del eje X, arriba/abajo). El movimiento se normaliza por
  el tamaño del canvas para que la sensibilidad sea independiente de la resolución.
- **Rueda del mouse** (o arrastrar + `Ctrl`): modifica `transZ`, la distancia de la
  cámara al cubo, produciendo el efecto de acercar / alejar (zoom).
