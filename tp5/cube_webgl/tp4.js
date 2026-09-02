/*
tp4.js — Funciones PROVISTAS para el ejercicio del cubo (no hace falta modificarlas).

Reúne los helpers que sostienen el pipeline y que ya vieron en TP4 / ejemplos previos:
  - canvas y viewport,
  - álgebra de matrices 4x4 (column-major) y proyección en perspectiva,
  - carga de la geometría desde un archivo PLY.
La parte a completar por el alumno está en ejercicio.js (buscá "TODO").

Convención de matrices: arreglo de 16 valores en orden column-major.
*/

// ===================== PROVISTA — Canvas y viewport ===================== //

// PROVISTA: ajusta la resolución del canvas a su tamaño en pantalla (teniendo en
// cuenta pantallas HiDPI) y actualiza el viewport de WebGL.
function UpdateCanvasSize(canvas) {
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = pixelRatio * canvas.clientWidth;
    canvas.height = pixelRatio * canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}

// PROVISTA: arma la matriz de cámara final a partir de los controles del mouse.
// Combina la proyección en perspectiva con la Model-View-Projection (que completa
// el alumno en ejercicio.js). Pasa los ángulos de grados a radianes.
function UpdateProjectionMatrix(canvas, rotX, rotY, transZ) {
    const aspect = canvas.width / canvas.height;
    const projMatrix = perspective(30, aspect, 0.01, 100);
    const rotXRad = rotX * Math.PI / 180;
    const rotYRad = rotY * Math.PI / 180;
    return GetModelViewProjection(projMatrix, 0, 0, transZ, rotXRad, rotYRad);
}

// ===================== PROVISTA — Álgebra de matrices ==================== //

// PROVISTA: multiplicación de matrices 4x4 (column-major). MatrixMult(A, B) = A·B.
function MatrixMult(A,B){
    const r = new Array(16).fill(0);
    for(let i=0;i<4;i++){
        for(let j=0;j<4;j++){
            for(let k=0;k<4;k++) r[j*4+i] += A[k*4+i]*B[j*4+k];
        }
    }
    return r;
}

// PROVISTA: matriz de proyección en perspectiva (frustum → volumen canónico).
// La fila con -1 hace que w' = -z: al dividir por w (perspective divide) los
// objetos lejanos se ven más chicos.
//   fov       : ángulo de apertura vertical de la cámara, en grados.
//   aspect    : relación ancho/alto del canvas.
//   near, far : distancias de los planos cercano y lejano.
//   s = 1/tan(fov/2) controla la apertura; z0 y z1 mapean [near, far] a [-1, 1].
function perspective(fov, aspect, near, far) {
    const fovRad = fov * Math.PI / 180;
    const s = 1 / Math.tan(fovRad / 2);
    const z0 = (far + near) / (near - far);
    const z1 = (-2 * far * near) / (far - near);
    return [
        s / aspect, 0,  0,   0,
        0,          s,  0,   0,
        0,          0, z0,  -1,
        0,          0, z1,   0
    ];
}

// ======================= PROVISTA — Carga de geometría ======================= //

// PROVISTA: carga un modelo PLY (ASCII) con vértices (x, y, z, r, g, b) y caras
// triangulares. Devuelve los arreglos ya expandidos por triángulo, listos para
// los buffers de WebGL. El PLY es un formato 3D de texto que, a diferencia de STL
// u OBJ, guarda color por vértice de forma nativa.
// Nota: requiere servir la página por HTTP (ej. Live Server); con file:// fetch falla.
async function loadPLY(url) {
    const text = await (await fetch(url)).text();
    const lines = text.trim().split('\n').map(l => l.trim());

    // Cabecera: cuántos vértices y caras hay.
    let numVertices = 0, numFaces = 0, i = 0;
    for (; i < lines.length; i++) {
        const t = lines[i].split(/\s+/);
        if (lines[i].startsWith('element vertex')) numVertices = parseInt(t[2]);
        else if (lines[i].startsWith('element face')) numFaces = parseInt(t[2]);
        else if (lines[i] === 'end_header') { i++; break; }
    }

    // Vértices: guardamos posición y color (color pasa de 0..255 a 0..1).
    const verts = [];
    for (let v = 0; v < numVertices; v++, i++) {
        const p = lines[i].split(/\s+/).map(Number);
        verts.push({ pos: [p[0], p[1], p[2]], col: [p[3]/255, p[4]/255, p[5]/255] });
    }

    // Caras: cada línea es "3 iA iB iC"; repetimos los datos de sus 3 vértices.
    const positions = [], colors = [];
    for (let f = 0; f < numFaces; f++, i++) {
        const idx = lines[i].split(/\s+/).map(Number);
        for (let k = 1; k <= 3; k++) {
            positions.push(...verts[idx[k]].pos);
            colors.push(...verts[idx[k]].col);
        }
    }
    return { positions: new Float32Array(positions), colors: new Float32Array(colors) };
}
