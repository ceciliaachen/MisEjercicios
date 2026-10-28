/**
 * TP 9 · De superficies implícitas a mallas
 * Completá las tres funciones siguiendo la consigna del README.md.
 * El muestreo, las tablas y compactarMalla están provistos.
 */

/**
 * 1. Identificar la configuración de un cubo.
 * valores: arreglo con los ocho valores del campo, en el orden de ESQUINAS.
 * nivel: valor que define la superficie buscada, es decir, f(x,y,z) = nivel.
 * Devolvé el índice del caso (0 a 255) para consultar las tablas.
 *
 * Construí un patrón de ocho caracteres, uno por vértice, del 0 al 7:
 * '1' si su valor está por debajo del nivel; '0' si es mayor o igual.
 * Ejemplo: solo los vértices 0 y 3 están por debajo -> "10010000".
 * Buscalo con indexOf en CONFIGURACIONES, provista en tablas.js.
 * Su posición es el índice del caso: CONFIGURACIONES[9] = "10010000".
 */
function indiceCaso(valores, nivel) {
    let patron = '';

    for (let i = 0; i < 8; i++) {
        if (valores[i] < nivel) {
            patron += '1';
        } else {
            patron += '0';  
        }
    }

    // indexOf devuelve la posición donde aparece este patrón en la lista.
    return CONFIGURACIONES.indexOf(patron);
}

/**
 * 2. Buscar el punto de una arista donde el campo alcanza el nivel.
 * p0, p1: posiciones [x,y,z] de los extremos de la arista.
 * v0, v1: números obtenidos al evaluar el campo en esos extremos.
 * nivel: valor del campo que queremos encontrar entre v0 y v1.
 * Devolvé un nuevo punto [x,y,z] mediante interpolación lineal:
 * t = (nivel - v0) / (v1 - v0); aplicá p0 + t * (p1 - p0) a cada coordenada.
 *
 * La tabla ya eligió una arista que cruza el nivel: un extremo tiene un valor
 * menor y el otro mayor o igual. Por eso v0 y v1 son distintos.
 * Usá esos valores para ubicar el cruce, sin volver a clasificar la arista.
 */
function interpolarArista(p0, p1, v0, v1, nivel) {
    
    const t = (nivel - v0) / (v1 - v0);
    const x = p0[0] + t * (p1[0] - p0[0]);
    const y = p0[1] + t * (p1[1] - p0[1]);
    const z = p0[2] + t * (p1[2] - p0[2]);

    // Devolver un punto nuevo, sin modificar p0 ni p1.
    return [x, y, z];
}

/**
 * 3. Aproximar la superficie f(x,y,z) = nivel con una malla de triángulos.
 *
 * grilla: división del espacio en cubos, provista por campo.js,
 * con el campo ya evaluado en sus vértices.
 * Cada cubo tiene ocho vértices; los cubos vecinos comparten algunos de ellos.
 * No hay que construir la grilla ni volver a evaluar el campo en esta función.
 *
 *   grilla.resolucion   cantidad N de cubos por eje, numerados de 0 a N-1.
 *   grilla.cubo(i,j,k)  devuelve el cubo de esa posición, listo para usar:
 *     cubo.vertices    ocho posiciones [x,y,z], numeradas de 0 a 7.
 *     cubo.valores     ocho valores del campo, en el mismo orden.
 *
 * Por ejemplo, cubo.valores[3] es el campo evaluado en cubo.vertices[3].
 * La numeración local coincide con el dibujo del README.
 *
 * nivel: valor buscado del campo; por ejemplo, 0.35 busca f(x,y,z) = 0.35.
 * Usá el mismo nivel para clasificar los cubos e interpolar sus aristas.
 *
 * Para cada caso, ARISTAS_POR_CASO indica pares de vértices del cubo.
 * Interpolalos en orden para obtener puntos; TRIANGULOS indica cómo unirlos.
 * Al terminar, compactarMalla(vertices, caras) unifica posiciones repetidas
 * y quita caras de área cero. Agregá celdasActivas al resultado.
 *
 * Devolvé { vertices, caras, celdasActivas }:
 *   vertices: posiciones [x,y,z] de los vértices de la malla.
 *   caras: ternas de índices de vertices, empezando en cero.
 *   celdasActivas: cantidad de cubos con caso distinto de 0 y 255.
 * La grilla de entrada no se modifica.
 */
function marchingCubes(grilla, nivel) {
    if (!Number.isFinite(nivel)) throw new RangeError('El nivel debe ser finito.');
    const vertices = [];
    const caras = [];
    let celdasActivas = 0;
    const n = grilla.resolucion;

    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - 1; j++) {
            for (let k = 0; k < n - 1; k++) {
                const cubo = grilla.cubo(i, j, k);
                const indice = indiceCaso(cubo.valores, nivel);
                const aristas = ARISTAS_POR_CASO[indice];

                for (const a of aristas) {
                    const v0 = a[0];
                    const v1 = a[1];
                    const p0 = cubo.vertices[v0];
                    const p1 = cubo.vertices[v1];
                    const val0 = cubo.valores[v0];
                    const val1 = cubo.valores[v1];

                    const puntoInterpolado = interpolarArista(p0, p1, val0, val1, nivel);
                    vertices.push(puntoInterpolado);
                }

                if (indice !== 0 && indice !== 255) {
                    celdasActivas++;
                }

                const triangulos = TRIANGULOS[indice];
                for (const t of triangulos) {
                    caras.push(t.map(idx => vertices.length - aristas.length + idx));
                }
            }  
        }
    }
    // E. Utilidad provista: compartir vértices coincidentes y quitar caras de
    // área cero. Durante el recorrido se puede construir cada triángulo aparte.
    const malla = compactarMalla(vertices, caras);
    malla.celdasActivas = celdasActivas;
    return malla;
}
