/**
 * Half-edge para mallas de triángulos. Este archivo ya está resuelto.
 * No depende de Three.js ni de la interfaz.
 *
 * Convenciones:
 *   h.vertex    = vértice de ORIGEN; h.next.vertex = destino.
 *   h.next/prev = siguiente/anterior dentro de la misma cara.
 *   h.twin      = half-edge opuesta, o null en el borde de la malla.
 *   h.face      = cara a la que pertenece h.
 * Las caras tienen orientación consistente. Los IDs empiezan en 0.
 */
class Vertex {
    constructor(id, position) {
        this.id = id;
        this.position = { x: position[0], y: position[1], z: position[2] };
        this.halfEdge = null;
    }

    // Recorre todas las half-edges salientes, también en vértices de borde.
    getOutgoingHalfEdges() {
        if (!this.halfEdge) return [];
        const result = [];
        let h = this.halfEdge;
        do {
            result.push(h);
            h = h.twin ? h.twin.next : null;
        } while (h && h !== this.halfEdge);

        // En un abanico abierto también hay que recorrer la otra dirección.
        if (!h) {
            h = this.halfEdge.prev.twin;
            while (h) {
                result.push(h);
                h = h.prev.twin;
            }
        }
        return result;
    }

    getAdjacentVertices() {
        const neighbors = new Set();
        for (const h of this.getOutgoingHalfEdges()) {
            neighbors.add(h.next.vertex);
            // La arista entrante del borde no tiene una opuesta saliente.
            if (!h.prev.twin) neighbors.add(h.prev.vertex);
        }
        return [...neighbors];
    }

    getIncidentFaces() {
        return this.getOutgoingHalfEdges().map(h => h.face);
    }

    isBoundary() {
        return this.getOutgoingHalfEdges().some(h => !h.twin || !h.prev.twin);
    }
}

class HalfEdge {
    constructor(id, vertex, face) {
        this.id = id;
        this.vertex = vertex;
        this.face = face;
        this.next = null;
        this.prev = null;
        this.twin = null;
    }
}

class Face {
    constructor(id) {
        this.id = id;
        this.halfEdge = null;
        this.normal = null; // Normal unitaria, calculada al construir la malla.
    }

    getHalfEdges() {
        const h = this.halfEdge;
        return [h, h.next, h.next.next];
    }

    getVertices() {
        return this.getHalfEdges().map(h => h.vertex);
    }
}

class HalfEdgeMesh {
    /**
     * @param {number[][]} positions - Posiciones [x, y, z].
     * @param {number[][]} triangles - Tripletas de índices, en orden CCW.
     * Acepta componentes desconectadas y bordes. Rechaza triángulos degenerados,
     * orientaciones inconsistentes y conectividad no manifold.
     */
    constructor(positions, triangles) {
        this.vertices = positions.map((p, id) => {
            if (p.length !== 3 || !p.every(Number.isFinite)) {
                throw new Error(`Posición inválida en el vértice ${id}.`);
            }
            return new Vertex(id, p);
        });
        this.faces = [];
        this.halfEdges = [];
        const directedEdges = new Map();
        const outgoingCount = new Array(positions.length).fill(0);

        for (const indices of triangles) {
            if (indices.length !== 3 || new Set(indices).size !== 3 ||
                !indices.every(i => Number.isInteger(i) && i >= 0 && i < positions.length)) {
                throw new Error('Cada cara debe tener tres índices de vértices distintos y válidos.');
            }
            const face = new Face(this.faces.length);
            const edges = indices.map(index => {
                const h = new HalfEdge(this.halfEdges.length, this.vertices[index], face);
                this.halfEdges.push(h);
                outgoingCount[index]++;
                return h;
            });
            for (let i = 0; i < 3; i++) {
                const h = edges[i];
                h.next = edges[(i + 1) % 3];
                h.prev = edges[(i + 2) % 3];
                h.vertex.halfEdge = h.vertex.halfEdge || h;
                const key = `${h.vertex.id},${h.next.vertex.id}`;
                if (directedEdges.has(key)) {
                    throw new Error('La malla tiene una arista no manifold o caras mal orientadas.');
                }
                directedEdges.set(key, h);
            }
            face.halfEdge = edges[0];
            face.normal = computeFaceNormal(face);
            this.faces.push(face);
        }

        // Una arista interior aparece dos veces, con orientaciones opuestas.
        for (const h of this.halfEdges) {
            h.twin = directedEdges.get(`${h.next.vertex.id},${h.vertex.id}`) || null;
        }
        for (const vertex of this.vertices) {
            if (vertex.getOutgoingHalfEdges().length !== outgoingCount[vertex.id]) {
                throw new Error(`El vértice ${vertex.id} no tiene un único abanico de caras (no manifold).`);
            }
        }
    }

    getStats() {
        const boundaryEdges = this.halfEdges.filter(h => !h.twin).length;
        return {
            vertices: this.vertices.length,
            faces: this.faces.length,
            halfEdges: this.halfEdges.length,
            // Las aristas interiores tienen dos half-edges; las de borde, una.
            edges: (this.halfEdges.length + boundaryEdges) / 2,
            boundaryEdges
        };
    }
}

function computeFaceNormal(face) {
    const [a, b, c] = face.getVertices().map(v => v.position);
    const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
    const n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
    const length = Math.hypot(n.x, n.y, n.z);
    if (!Number.isFinite(length) || length === 0) {
        throw new Error(`El triángulo ${face.id} es degenerado.`);
    }
    return { x: n.x / length, y: n.y / length, z: n.z / length };
}

/** Ángulo entre las normales de dos caras, en grados [0, 180]. Ya resuelto. */
function angleBetweenFaces(a, b) {
    const u = a.normal, v = b.normal;
    const dot = u.x * v.x + u.y * v.y + u.z * v.z;
    const crossLength = Math.hypot(u.y * v.z - u.z * v.y, u.z * v.x - u.x * v.z, u.x * v.y - u.y * v.x);
    // atan2(|u × v|, u · v) es más estable que acos(u · v) cerca de 0° y 180°.
    return Math.atan2(crossLength, dot) * 180 / Math.PI;
}
