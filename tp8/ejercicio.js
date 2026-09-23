/*
 * TP 8 · Crecimiento de regiones sobre una malla de triángulos
 * ========================================================
 * Esta es la ÚNICA función que deben implementar.
 * La construcción half-edge, las normales y toda la interacción ya están dadas.
 *
 * ENTRADA
 *   caraInicial: Face de una HalfEdgeMesh válida, o null si no hay selección.
 *   anguloMaximo: número finito entre 0 y 180, expresado en GRADOS.
 *
 * SALIDA
 *   Un conjunto (Set) nuevo con los IDs de las caras de la región, sin repetidos.
 *   Incluye la cara inicial. Si caraInicial es null, devuelve un Set vacío.
 *   No modifica la malla ni las caras.
 *
 * REGLA
 *   Dos caras se conectan si comparten ARISTA y el ángulo entre sus normales
 *   es <= anguloMaximo. Se devuelve toda la componente alcanzable desde la
 *   semilla por esas conexiones. La comparación es LOCAL: cara actual vs.
 *   vecina, NO cara inicial vs. vecina. No hay distancia ni tamaño máximo.
 *
 * ESTRUCTURA DE DATOS DISPONIBLE
 *   cara.halfEdge           una half-edge de la cara
 *   h.next                  siguiente half-edge de la misma cara
 *   h.twin                  opuesta; null en el borde de la malla
 *   h.twin.face             cara vecina (solo cuando h.twin existe)
 *   cara.id                 identificador entero, empieza en 0
 *   angleBetweenFaces(a, b) ángulo en grados; ya implementado en halfedge.js
 */

function crecerRegion(caraInicial, anguloMaximo) {
    if (!Number.isFinite(anguloMaximo) || anguloMaximo < 0 || anguloMaximo > 180) {
        throw new RangeError('El ángulo debe estar entre 0 y 180 grados.');
    }

    const region = new Set();
    if (caraInicial === null) {
        return region;
    }

    // TODO

    return region;
}
