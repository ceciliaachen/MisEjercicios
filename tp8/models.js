/** Mallas precargadas. El rostro está en assets/head.js; las demás se generan aquí. */
const MODELS = {
    bean: {
        name: 'Bean',
        description: 'Una superficie curva y continua. Explorá cómo cambia la región al variar el ángulo.',
        create: createBean
    },
    head: {
        name: 'Rostro',
        description: 'Cabeza escaneada: explorá los cambios de orientación en la nariz, los ojos y la boca.',
        create: createHead
    },
    cube: {
        name: 'Cubo triangulado',
        description: 'Probá 20° y 90°: un lado del cubo contiene 2 triángulos; el cubo completo, 12.',
        create: createCube
    },
    folded: {
        name: 'Lámina plegada',
        description: 'Una malla abierta con pliegues de 35° y 70°. El crecimiento también se detiene en sus bordes.',
        create: createFoldedSheet
    }
};

function createHead() {
    return new HalfEdgeMesh(HEAD_MESH_DATA.positions, HEAD_MESH_DATA.triangles);
}

function createBean() {
    // Una icosfera ofrece triángulos de tamaños parecidos, sin un abanico de
    // triángulos diminutos en los polos. Luego deformamos sus posiciones.
    const t = (1 + Math.sqrt(5)) / 2;
    const normalize = p => p.map(value => value / Math.hypot(...p));
    const positions = [
        [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
    ].map(normalize);
    let triangles = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];
    for (let level = 0; level < 3; level++) {
        const midpoints = new Map();
        const midpoint = (a, b) => {
            const key = a < b ? `${a},${b}` : `${b},${a}`;
            if (!midpoints.has(key)) {
                midpoints.set(key, positions.length);
                positions.push(normalize(positions[a].map((value, i) => (value + positions[b][i]) / 2)));
            }
            return midpoints.get(key);
        };
        triangles = triangles.flatMap(([a, b, c]) => {
            const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
            return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]];
        });
    }
    const angle = -0.32;
    for (const p of positions) {
        const t = p[1];
        const x = 0.82 * (1 - t * t) + 0.08 * t + 0.88 * p[0] * (1 + 0.16 * t);
        const y = 1.30 * t;
        p[0] = x * Math.cos(angle) - y * Math.sin(angle);
        p[1] = x * Math.sin(angle) + y * Math.cos(angle);
        p[2] *= 0.70 * (1 + 0.12 * t);
    }
    return new HalfEdgeMesh(positions, triangles);
}

function createCube() {
    const positions = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ];
    const quads = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4],
        [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]];
    const triangles = quads.flatMap(([a, b, c, d]) => [[a, b, c], [a, c, d]]);
    return new HalfEdgeMesh(positions, triangles);
}

function createFoldedSheet() {
    const positions = [];
    const triangles = [];
    let x = -1.4, z = 0;
    // Direcciones 0°, 35°, -35°: cambios entre paneles de 35° y 70°.
    const directions = [0, 35, -35];
    for (let panel = 0; panel <= directions.length; panel++) {
        for (let row = 0; row <= 6; row++) positions.push([x, -1 + row / 3, z]);
        if (panel < directions.length) {
            x += Math.cos(directions[panel] * Math.PI / 180);
            z += Math.sin(directions[panel] * Math.PI / 180);
        }
    }
    for (let panel = 0; panel < 3; panel++) {
        for (let row = 0; row < 6; row++) {
            const a = panel * 7 + row, b = (panel + 1) * 7 + row;
            triangles.push([a, b, a + 1], [b, b + 1, a + 1]);
        }
    }
    return new HalfEdgeMesh(positions, triangles);
}
