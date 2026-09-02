/*
ejercicio.js — Dibujar un cubo 3D con WebGL.

Reutilizamos lo que ya vimos:
  - TP4: matrices de rotación / traslación / proyección (acá las componemos).
  - Ejemplo WebGL: compilar shaders, cargar buffers y linkear atributos.

Completás todas las partes marcadas con "TODO" (repartidas por el archivo):
  - linkAttribute          : conectar los datos de los vértices con el shader.
  - vshader / fshader      : el código GLSL de los shaders.
  - CompileShader / InitShaderProgram : compilar y linkear los shaders.
  - createBuffer           : subir datos a la GPU.
  - DrawScene              : dibujar la escena.
  - Pasos 3 a 5 de window.onload.
El archivo se lee de arriba hacia abajo: primero lo que tenés que completar,
luego los bloques auxiliares, y al final el programa principal (window.onload).

Convención de matrices: arreglo de 16 valores en orden column-major.
MatrixMult(A, B) = A·B está definida en tp4.js.
*/

// ==================== PROVISTA — Matriz Model-View-Projection ==================== //
/* Construye la matriz que lleva cada vértice del cubo desde el mundo hasta la
pantalla. Se compone (de derecha a izquierda): rotación en X, rotación en Y,
traslación y, por último, la proyección (ya viene lista en projectionMatrix).

Matrices vistas en TP4 (column-major):
  Rx = [ 1,     0,      0,   0,    0, cosX,  sinX, 0,   0, -sinX, cosX, 0,    0,  0,  0, 1 ]
  Ry = [ cosY,  0,  -sinY,   0,    0,    1,     0, 0,   sinY, 0, cosY, 0,     0,  0,  0, 1 ]
  T  = [ 1,     0,      0,   0,    0,    1,     0, 0,   0,    0,    1,  0,    tx, ty, tz, 1 ]

Componemos  model = T · Ry · Rx  y luego  mvp = projectionMatrix · model,
usando MatrixMult(A, B) (= A·B).
*/
function GetModelViewProjection(projectionMatrix, tx, ty, tz, rotationX, rotationY) {
    const cosX = Math.cos(rotationX);
    const sinX = Math.sin(rotationX);
    const cosY = Math.cos(rotationY);
    const sinY = Math.sin(rotationY);

    const rotX = [ 1,    0,     0,    0,
                   0,  cosX,  sinX,  0,
                   0, -sinX,  cosX,  0,
                   0,    0,     0,    1 ];

    const rotY = [ cosY, 0, -sinY, 0,
                    0,   1,   0,   0,
                   sinY, 0,  cosY, 0,
                    0,   0,   0,   1 ];

    const trans = [ 1,  0,  0,  0,
                    0,  1,  0,  0,
                    0,  0,  1,  0,
                    tx, ty, tz, 1 ];

    const model = MatrixMult(trans, MatrixMult(rotY, rotX));
    return MatrixMult(projectionMatrix, model);
}

// ======================== TODO — Linkear un atributo ======================== //
/* Un "atributo" es una entrada por vértice del vertex shader (position, color).
Para alimentarlo hay que seleccionar el buffer con los datos y decirle a WebGL
cómo leerlo. Completá los 4 pasos (igual que en el ejemplo de WebGL).
  gl      : contexto WebGL
  program : programa con los shaders compilados
  name    : nombre del atributo en el shader (ej. 'position')
  buffer  : buffer con los datos de ese atributo
  size    : cuántos números por vértice (3 para xyz, 3 para rgb)
*/
function linkAttribute(gl, program, name, buffer, size) {
    // TODO <-----------
}

// ======================= PROVISTA — Estado global de la app ======================= //
// Estas variables se completan dentro de window.onload y las usan DrawScene y los
// controles de mouse. Las declaramos acá para que esas funciones no necesiten
// vivir "dentro" de window.onload.
let canvas;       // el elemento <canvas>
let gl;           // el contexto WebGL (lo usa también tp4.js)
let uCam;         // ubicación del uniform 'camera' en el shader
let vertexCount;  // cantidad de vértices del modelo cargado

// Parámetros de la cámara que modifican los eventos de mouse.
let transZ = -15;
let rotX = 0;
let rotY = 0;

// ============================= TODO — Shaders ============================= //
/* Escribí el código GLSL de los dos shaders (como en el ejemplo de WebGL):
  - vshader (vertex shader): recibe los atributos 'position' y 'color', proyecta
    la posición con la matriz uniforme 'camera' (gl_Position) y le pasa el color
    al fragment shader mediante una variable 'varying'.
  - fshader (fragment shader): pinta cada pixel con el color interpolado (gl_FragColor).
*/
// Vertex shader: proyecta cada vértice con la matriz 'camera' y pasa el color.
const vshader = `
    // TODO <-----------
    `;

// Fragment shader: pinta con el color interpolado.
const fshader = `
    // TODO <-----------
    `;

// ===================== TODO — Compilar y linkear shaders ==================== //
/* Implementá dos funciones (como en el ejemplo de WebGL):
  - CompileShader(gl, type, source): crea un shader del tipo dado (gl.VERTEX_SHADER
    o gl.FRAGMENT_SHADER), le carga el código fuente, lo compila y verifica que la
    compilación haya sido exitosa (gl.getShaderParameter con gl.COMPILE_STATUS).
  - InitShaderProgram(gl, vsSource, fsSource): compila ambos shaders con
    CompileShader, los adjunta a un programa (gl.attachShader), lo linkea
    (gl.linkProgram) y verifica el link (gl.getProgramParameter con gl.LINK_STATUS).
*/
// Compila un shader (vertex o fragment) a partir de su código fuente.
function CompileShader(gl, type, source) {
    // TODO <-----------
}

// Compila y linkea el vertex y el fragment shader en un único programa.
function InitShaderProgram(gl, vsSource, fsSource) {
    // TODO <-----------
}

// ============================= TODO — Buffers ============================= //
/* Implementá createBuffer(gl, data): creá un buffer (gl.createBuffer),
   seleccionalo como ARRAY_BUFFER (gl.bindBuffer) y cargale los datos
   (Float32Array) con gl.bufferData usando gl.STATIC_DRAW. Devolvé el buffer.
*/
// Crea un buffer en la GPU y lo llena con los datos (Float32Array).
function createBuffer(gl, data) {
    // TODO <-----------
}

// ============================== TODO — Dibujar ============================== //
/* Implementá DrawScene(): dibuja la escena.
   1) Pedí la matriz de cámara con UpdateProjectionMatrix(canvas, rotX, rotY, transZ)
      (definida en tp4.js) y cargala en el uniform 'camera' con gl.uniformMatrix4fv.
   2) Limpiá color y profundidad con gl.clear(COLOR_BUFFER_BIT | DEPTH_BUFFER_BIT).
   3) Dibujá los triángulos con gl.drawArrays(gl.TRIANGLES, 0, vertexCount).
*/
// Dibuja la escena: arma la matriz de cámara con los parámetros actuales
// (rotX, rotY, transZ), limpia la pantalla y dibuja los triángulos del cubo.
function DrawScene() {
    // TODO <-----------
}

// ======================== PROVISTA — Controles de cámara ======================== //
// Acerca o aleja la cámara modificando transZ, y redibuja.
function ZoomCamera(amount) {
    transZ = transZ * (amount / canvas.height + 1);
    DrawScene();
}

// Conecta los eventos del mouse para controlar la cámara:
//   - rueda           -> zoom
//   - arrastrar       -> rotar
//   - arrastrar+Ctrl  -> zoom
// Cada evento solo cambia rotX/rotY/transZ y vuelve a dibujar con DrawScene().
function setupMouseControls(canvas) {
    // Zoom con la rueda del mouse.
    canvas.onwheel = function(event) {
        event.preventDefault();
        ZoomCamera(0.3 * event.deltaY);
    };

    // Al apretar el botón, empezamos a seguir el movimiento del mouse.
    canvas.onmousedown = function(event) {
        event.preventDefault();
        let lastX = event.clientX;
        let lastY = event.clientY;

        canvas.onmousemove = function(event) {
            if (event.ctrlKey) {
                ZoomCamera(5 * (event.clientY - lastY));
            } else {
                rotY = rotY - (lastX - event.clientX) / canvas.width * 500;
                rotX = rotX - (lastY - event.clientY) / canvas.height * 500;
                DrawScene();
            }
            lastX = event.clientX;
            lastY = event.clientY;
        };
    };

    // Al soltar (o salir del canvas), dejamos de seguir el movimiento.
    canvas.onmouseup = function() {
        canvas.onmousemove = null;
    };
    canvas.onmouseleave = function() {
        canvas.onmousemove = null;
    };
}

// ======================= PROVISTA — Programa principal ======================= //
// Se ejecuta al cargar la página. Se lee como una receta, paso a paso.
window.onload = async function() {
    // 1) Canvas y contexto WebGL.
    canvas = document.getElementById('mycanvas');
    gl = canvas.getContext('webgl');
    if (!gl) { alert('WebGL no soportado'); return; }
    UpdateCanvasSize(canvas);

    // 2) Geometría del cubo desde cube.ply (posiciones + color por vértice).
    const model = await loadPLY('cube.ply');
    vertexCount = model.positions.length / 3;

    // 3) TODO: compilar y activar los shaders. Necesitás InitShaderProgram
    //    y después activarlos con gl.useProgram.
    // TODO <-----------


    // 4) TODO: subir la geometría a la GPU y conectarla con los atributos del
    //    shader. Necesitás createBuffer (uno para posiciones y otro para colores)
    //    y linkAttribute para cada atributo ('position' y 'color').
    // TODO <-----------


    // 5) TODO: configurar el estado de render (gl.clearColor y gl.enable(DEPTH_TEST))
    //    y guardar la ubicación del uniform 'camera' con gl.getUniformLocation.
    // TODO <-----------
    

    // 6) Conectar el mouse y dibujar la primera imagen.
    // TODO <-----------


    // 7) Redibujar cuando cambia el tamaño de la ventana.
    window.addEventListener('resize', function() {
        UpdateCanvasSize(canvas);
        DrawScene();
    });
};
