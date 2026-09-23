// Verificación del material provisto y de la solución. Ejecutar: node --test test.js
// No se carga en el navegador y no requiere instalar paquetes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
for (const file of ['halfedge.js', 'assets/head.js', 'models.js', 'ejercicio.js']) {
    vm.runInThisContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), { filename: file });
}

test('Un triángulo tiene 3 aristas, 3 half-edges y 3 bordes', () => {
    const mesh = new HalfEdgeMesh([[0, 0, 0], [1, 0, 0], [0, 1, 0]], [[0, 1, 2]]);
    assert.deepEqual(mesh.getStats(), { vertices: 3, faces: 1, halfEdges: 3, edges: 3, boundaryEdges: 3 });
    assert.deepEqual([...crecerRegion(mesh.faces[0], 180)], [0]);
});

test('Un abanico abierto recorre TODAS las caras y los vecinos de un vértice', () => {
    const mesh = new HalfEdgeMesh(
        [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [-1, 1, 0]],
        [[0, 1, 2], [0, 2, 3], [0, 3, 4]]
    );
    const v = mesh.vertices[0];
    assert.equal(v.getOutgoingHalfEdges().length, 3);
    assert.deepEqual(v.getIncidentFaces().map(f => f.id).sort(), [0, 1, 2]);
    assert.deepEqual(v.getAdjacentVertices().map(n => n.id).sort(), [1, 2, 3, 4]);
    assert.equal(v.isBoundary(), true);
    assert.equal(crecerRegion(mesh.faces[1], 0).size, 3);
});

for (const [key, model] of Object.entries(MODELS)) {
    test(`${key}: enlaces, normales unitarias y recorrido completo consistentes`, () => {
        const mesh = model.create();
        for (const h of mesh.halfEdges) {
            assert.equal(h.next.prev, h);
            assert.equal(h.prev.next, h);
            assert.equal(h.next.next.next, h);
            assert.equal(h.face, h.next.face);
            if (h.twin) {
                assert.equal(h.twin.twin, h);
                assert.equal(h.vertex, h.twin.next.vertex);
                assert.equal(h.next.vertex, h.twin.vertex);
            }
        }
        for (const face of mesh.faces) {
            assert.ok(Math.abs(Math.hypot(face.normal.x, face.normal.y, face.normal.z) - 1) < 1e-12);
        }
        assert.equal(crecerRegion(mesh.faces[0], 180).size, mesh.faces.length);
    });
}

test('El cubo selecciona un lado a 0°/20° y todo el cubo a 90° (umbral inclusivo)', () => {
    const mesh = createCube();
    for (const seed of mesh.faces) {
        assert.equal(crecerRegion(seed, 0).size, 2);
        assert.equal(crecerRegion(seed, 20).size, 2);
        assert.equal(crecerRegion(seed, 89).size, 2);
        assert.equal(crecerRegion(seed, 90).size, 12);
    }
    assert.equal(mesh.vertices[0].isBoundary(), false);
    assert.equal(mesh.vertices[0].getIncidentFaces().length, mesh.faces.filter(f => f.getVertices().includes(mesh.vertices[0])).length);
});

test('La lámina abierta cruza los pliegues al alcanzar 35° y 70°', () => {
    const mesh = createFoldedSheet();
    assert.equal(crecerRegion(mesh.faces[0], 34).size, 12);
    assert.equal(crecerRegion(mesh.faces[0], 35).size, 24);
    assert.equal(crecerRegion(mesh.faces[0], 69).size, 24);
    assert.equal(crecerRegion(mesh.faces[0], 70).size, 36);
});

test('A 0° también se conectan caras coplanares inclinadas (redondeo numérico)', () => {
    const mesh = new HalfEdgeMesh(
        [[0, 0, 0], [1, 0, -1], [0, 1, 0], [1, 1, -1]],
        [[0, 1, 2], [1, 3, 2]]
    );
    assert.equal(crecerRegion(mesh.faces[0], 0).size, 2);
});

test('La comparación es local: tres paneles con normales a 0°, 20° y 40° se conectan a 20°', () => {
    const positions = [[0, 0, 0], [0, 1, 0]], triangles = [];
    let x = 0, z = 0;
    for (const [i, angle] of [0, 20, 40].entries()) {
        x += Math.cos(angle * Math.PI / 180);
        z += Math.sin(angle * Math.PI / 180);
        positions.push([x, 0, z], [x, 1, z]);
        const a = 2 * i, b = a + 2;
        triangles.push([a, b, a + 1], [b, b + 1, a + 1]);
    }
    const mesh = new HalfEdgeMesh(positions, triangles);
    assert.ok(angleBetweenFaces(mesh.faces[0], mesh.faces[5]) > 39.9);
    assert.equal(crecerRegion(mesh.faces[0], 20).size, 6);
    assert.equal(crecerRegion(mesh.faces[0], 19).size, 2);
});

test('No salta entre componentes desconectadas, aunque ocupen la misma posición', () => {
    const mesh = new HalfEdgeMesh(
        [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 0], [1, 0, 0], [0, 1, 0]],
        [[0, 1, 2], [3, 4, 5]]
    );
    assert.deepEqual([...crecerRegion(mesh.faces[0], 180)], [0]);
    assert.deepEqual([...crecerRegion(mesh.faces[1], 180)], [1]);
});

test('El resultado es un Set nuevo, contiene la semilla y no modifica la malla', () => {
    const mesh = createBean();
    const before = mesh.faces.map(f => [f.halfEdge, { ...f.normal }]);
    const seed = mesh.faces[400];
    const first = crecerRegion(seed, 8), second = crecerRegion(seed, 8);
    assert.ok(first instanceof Set);
    assert.notEqual(first, second);
    assert.ok(first.has(seed.id));
    assert.deepEqual(first, second);
    mesh.faces.forEach((f, i) => {
        assert.equal(f.halfEdge, before[i][0]);
        assert.deepEqual(f.normal, before[i][1]);
    });
});

test('Subir el umbral nunca quita caras de la región del bean', () => {
    const mesh = createBean();
    for (const seedId of [0, 400, 827, 1200]) {
        let previous = new Set();
        for (const angle of [0, 4, 8, 12, 20, 180]) {
            const current = crecerRegion(mesh.faces[seedId], angle);
            for (const id of previous) assert.ok(current.has(id));
            previous = current;
        }
    }
});

test('Sin semilla devuelve vacío; los ángulos inválidos se rechazan', () => {
    assert.deepEqual(crecerRegion(null, 20), new Set());
    for (const angle of [-1, 181, NaN, Infinity, '20']) {
        assert.throws(() => crecerRegion(null, angle), RangeError);
    }
});

test('Se rechazan caras degeneradas, índices inválidos y orientación inconsistente', () => {
    assert.throws(() => new HalfEdgeMesh([[0, 0, 0], [1, 0, 0], [2, 0, 0]], [[0, 1, 2]]), /degenerado/);
    assert.throws(() => new HalfEdgeMesh([[0, 0, 0]], [[0, 1, 2]]), /índices/);
    assert.throws(() => new HalfEdgeMesh([[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, -1, 0]], [[0, 1, 2], [0, 1, 3]]), /orientadas/);
});

test('Se rechaza un vértice compartido por dos abanicos desconectados', () => {
    assert.throws(() => new HalfEdgeMesh(
        [[0, 0, 0], [1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, -1, 0]],
        [[0, 1, 2], [0, 3, 4]]
    ), /no manifold/);
});
