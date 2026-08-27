/*
test-ejercicio4.js — Test unitario para la rasterización de triángulos del TP4.
Verifica la función drawTriangle: relleno con coordenadas baricéntricas y z-buffer.
*/

// Utils
function assertArraysEqual(actual, expected, tolerance = 1e-6, message = '') {
  if (actual.length !== expected.length) {
    throw new Error(`${message}: Array lengths differ. Expected ${expected.length}, got ${actual.length}`);
  }
  for (let i = 0; i < actual.length; i++) {
    if (Math.abs(actual[i] - expected[i]) > tolerance) {
      throw new Error(`${message}: Arrays differ at index ${i}. Expected ${expected[i]}, got ${actual[i]}`);
    }
  }
}

function assertEqual(actual, expected, tolerance = 1e-6, message = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}: Expected ${expected}, got ${actual}`);
  }
}

// Helpers para armar un buffer de imagen (RGBA) y su z-buffer, como los usa el pipeline.
function makeImg(w, h) {
  return { data: new Uint8ClampedArray(w * h * 4), w, h };
}

function makeDepth(w, h) {
  const d = new Float32Array(w * h);
  d.fill(Number.NEGATIVE_INFINITY); // -Infinity: "nada dibujado todavía"
  return d;
}

// Devuelve el color [r, g, b, a] del píxel (x, y).
function getPixel(img, x, y) {
  const idx = (y * img.w + x) * 4;
  return [img.data[idx], img.data[idx + 1], img.data[idx + 2], img.data[idx + 3]];
}

// ======================= Test: función edge =======================

function testEdge() {
  console.log('Testing edge...');

  // edge = doble del área con signo del triángulo (p0, p1, p2).
  // Orientación CCW → positivo.
  assertEqual(edge([0, 0], [1, 0], [0, 1]), 1, 1e-6, 'edge CCW positive');

  // Orientación CW → negativo (signo opuesto).
  assertEqual(edge([0, 0], [0, 1], [1, 0]), -1, 1e-6, 'edge CW negative');

  // Puntos colineales → 0.
  assertEqual(edge([0, 0], [2, 0], [1, 0]), 0, 1e-6, 'edge collinear = 0');

  // Vale el doble del área: triángulo (0,0),(4,0),(0,3) tiene área 6 → edge = 12.
  assertEqual(edge([0, 0], [4, 0], [0, 3]), 12, 1e-6, 'edge = 2·área');

  console.log('✓ edge tests passed');
}

// ======================= Test: relleno básico =======================

function testDrawTriangleFill() {
  console.log('Testing drawTriangle (relleno)...');

  const img = makeImg(10, 10);
  const depth = makeDepth(10, 10);

  // Triángulo rectángulo: vértices arriba-izquierda del canvas.
  const v0 = [1, 1, 0];
  const v1 = [8, 1, 0];
  const v2 = [1, 8, 0];
  const color = [200, 100, 50];

  drawTriangle(img, depth, v0, v1, v2, color);

  // Un píxel claramente DENTRO del triángulo debe quedar pintado con el color.
  assertArraysEqual(getPixel(img, 2, 2), [200, 100, 50, 255], 0, 'drawTriangle pinta interior');

  // Un píxel claramente FUERA (esquina opuesta) NO debe tocarse (alpha = 0).
  assertArraysEqual(getPixel(img, 7, 7), [0, 0, 0, 0], 0, 'drawTriangle no pinta exterior');

  console.log('✓ drawTriangle (relleno) tests passed');
}

// ======================= Test: z-buffer (profundidad) =======================

function testDrawTriangleZBuffer() {
  console.log('Testing drawTriangle (z-buffer)...');

  // Dos triángulos que cubren exactamente los mismos píxeles, a distinta z.
  // Convención: z mayor = MÁS CERCA. El cercano debe ganar sin importar el orden.
  const v0 = [1, 1], v1 = [8, 1], v2 = [1, 8];
  const near = (z) => [[...v0, z], [...v1, z], [...v2, z]];
  const nearColor = [255, 0, 0]; // z = 0.8 (cerca)
  const farColor  = [0, 0, 255]; // z = 0.2 (lejos)

  // Orden 1: primero el lejano, después el cercano → gana el cercano.
  {
    const img = makeImg(10, 10);
    const depth = makeDepth(10, 10);
    const f = near(0.2), n = near(0.8);
    drawTriangle(img, depth, f[0], f[1], f[2], farColor);
    drawTriangle(img, depth, n[0], n[1], n[2], nearColor);
    assertArraysEqual(getPixel(img, 2, 2), [255, 0, 0, 255], 0, 'z-buffer: cercano gana (lejos→cerca)');
  }

  // Orden 2: primero el cercano, después el lejano → el lejano NO lo tapa.
  {
    const img = makeImg(10, 10);
    const depth = makeDepth(10, 10);
    const f = near(0.2), n = near(0.8);
    drawTriangle(img, depth, n[0], n[1], n[2], nearColor);
    drawTriangle(img, depth, f[0], f[1], f[2], farColor);
    assertArraysEqual(getPixel(img, 2, 2), [255, 0, 0, 255], 0, 'z-buffer: cercano gana (cerca→lejos)');
  }

  console.log('✓ drawTriangle (z-buffer) tests passed');
}

// ======================= Test: interpolación baricéntrica de z =======================

function testDrawTriangleBarycentric() {
  console.log('Testing drawTriangle (interpolación de z)...');

  const img = makeImg(10, 10);
  const depth = makeDepth(10, 10);

  // Cada vértice tiene una z distinta: la z de cada píxel se interpola.
  const v0 = [1, 1, 0.0];
  const v1 = [8, 1, 1.0];
  const v2 = [1, 8, 0.4];
  drawTriangle(img, depth, v0, v1, v2, [10, 20, 30]);

  // z esperada en el centro del píxel (3, 3), calculada con baricéntricas.
  const p = [3.5, 3.5];
  const area = edge([1, 1], [8, 1], [1, 8]);
  const w0 = edge([8, 1], [1, 8], p) / area;
  const w1 = edge([1, 8], [1, 1], p) / area;
  const w2 = edge([1, 1], [8, 1], p) / area;
  const expZ = w0 * 0.0 + w1 * 1.0 + w2 * 0.4;

  assertEqual(depth[3 * img.w + 3], expZ, 1e-6, 'drawTriangle interpola z con baricéntricas');

  console.log('✓ drawTriangle (interpolación de z) tests passed');
}

// ======================= Test: bordes y casos degenerados =======================

function testDrawTriangleBounds() {
  console.log('Testing drawTriangle (bordes y degenerados)...');

  // Triángulo degenerado (área 0): no debe pintar ningún píxel.
  {
    const img = makeImg(10, 10);
    const depth = makeDepth(10, 10);
    drawTriangle(img, depth, [1, 1, 0], [3, 1, 0], [5, 1, 0], [255, 255, 255]);
    let painted = 0;
    for (let i = 3; i < img.data.length; i += 4) if (img.data[i] !== 0) painted++;
    assertEqual(painted, 0, 0, 'drawTriangle degenerado no pinta nada');
  }

  // Triángulo que se sale del canvas: recorta al bounding box sin desbordar.
  {
    const img = makeImg(10, 10);
    const depth = makeDepth(10, 10);
    // Parte de sus vértices están fuera (coordenadas negativas).
    drawTriangle(img, depth, [-2, -2, 0], [6, -2, 0], [-2, 6, 0], [0, 255, 0]);

    // El píxel (0,0) cae dentro de la parte visible → pintado.
    assertArraysEqual(getPixel(img, 0, 0), [0, 255, 0, 255], 0, 'drawTriangle recorta y pinta parte visible');

    // El píxel (5,5) queda fuera del triángulo → sin tocar.
    assertArraysEqual(getPixel(img, 5, 5), [0, 0, 0, 0], 0, 'drawTriangle no pinta fuera del triángulo');
  }

  console.log('✓ drawTriangle (bordes y degenerados) tests passed');
}

// ======================= Test Runner =======================

function runAllTests() {
  console.log('='.repeat(50));
  console.log('Running TP4 Rasterization Tests');
  console.log('='.repeat(50));

  let passedTests = 0;
  let totalTests = 0;
  let failedTests = [];

  const testGroups = [
    {
      name: 'Helpers de rasterización',
      condition: () => typeof edge !== 'undefined',
      tests: [
        { name: 'testEdge', fn: testEdge, condition: () => typeof edge !== 'undefined' }
      ]
    },
    {
      name: 'drawTriangle',
      condition: () => typeof drawTriangle !== 'undefined',
      tests: [
        { name: 'testDrawTriangleFill', fn: testDrawTriangleFill, condition: () => typeof drawTriangle !== 'undefined' },
        { name: 'testDrawTriangleZBuffer', fn: testDrawTriangleZBuffer, condition: () => typeof drawTriangle !== 'undefined' },
        { name: 'testDrawTriangleBarycentric', fn: testDrawTriangleBarycentric, condition: () => typeof drawTriangle !== 'undefined' },
        { name: 'testDrawTriangleBounds', fn: testDrawTriangleBounds, condition: () => typeof drawTriangle !== 'undefined' }
      ]
    }
  ];

  testGroups.forEach(group => {
    if (group.condition()) {
      console.log(`\n📂 ${group.name}`);

      group.tests.forEach(test => {
        totalTests++;

        if (test.condition && !test.condition()) {
          console.log(`  ${test.name} - SKIPPED (function not implemented)`);
          return;
        }

        try {
          test.fn();
          passedTests++;
        } catch (error) {
          failedTests.push({ name: test.name, error: error.message });
          console.error(` ${test.name} - FAILED: ${error.message}`);
        }
      });
    } else {
      console.log(`\n📂 ${group.name} - SKIPPED (required functions not implemented)`);
      totalTests += group.tests.length;
    }
  });

  // Resumen
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${failedTests.length}`);
  console.log(`⏭️  Skipped: ${totalTests - passedTests - failedTests.length}`);

  if (failedTests.length > 0) {
    console.log('\n🚨 Failed Tests:');
    failedTests.forEach(test => {
      console.log(`   - ${test.name}: ${test.error}`);
    });
  }

  const percentage = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉');
  } else if (passedTests > 0) {
    console.log(`\n⚡ ${percentage}% TESTS PASSED - Keep implementing!`);
  } else {
    console.log('\n🔴 NO TESTS PASSED - Start implementing drawTriangle!');
  }

  console.log('='.repeat(50));

  return passedTests > 0;
}


if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    console.log('TP4 Test Suite loaded. Run runAllTests() to execute tests.');
  });
}
