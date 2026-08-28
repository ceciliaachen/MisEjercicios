/*
zbuffer-view.js — Mini-vista flotante que muestra el estado del Z-BUFFER.
Cada frame toma el arreglo depth (una profundidad por píxel) y lo dibuja en
escala de grises: más claro = más cerca de la cámara, casi negro = píxel sin
geometría. Sirve para "ver" lo que resuelve drawTriangle además del color.
*/

let zbufCanvas, zbufCtx, zbufFull;
const zbufViewport = { width: 250, height: 156 }; // ~ proporción del canvas 960×600

function initZBufferView() {
  const mainCanvas = document.getElementById('cv');
  if (!mainCanvas) return;

  zbufCanvas = document.createElement('canvas');
  zbufCanvas.style.position = 'fixed';
  zbufCanvas.style.border = '2px solid #333';
  zbufCanvas.style.backgroundColor = '#000';
  zbufCanvas.style.zIndex = '10';
  zbufCanvas.style.borderRadius = '4px';
  zbufCanvas.style.left = '20px';
  zbufCanvas.style.bottom = '20px';
  zbufCanvas.width = zbufViewport.width;
  zbufCanvas.height = zbufViewport.height;
  zbufCanvas.style.width = zbufViewport.width + 'px';
  zbufCanvas.style.height = zbufViewport.height + 'px';

  zbufCtx = zbufCanvas.getContext('2d');
  document.body.appendChild(zbufCanvas);

  // Canvas offscreen a resolución completa (W×H) para volcar el depth y luego escalar.
  zbufFull = document.createElement('canvas');

  if (typeof render === 'function') render();
}

// Dibuja el z-buffer normalizado a [0,1] sobre las profundidades finitas.
function drawZBufferView(depth, width, height) {
  if (!zbufCtx) return;

  // Rango de profundidad presente en la escena (ignora -Infinity = píxel vacío).
  let zmin = Infinity, zmax = -Infinity;
  for (let i = 0; i < depth.length; i++) {
    const z = depth[i];
    if (!Number.isFinite(z)) continue;
    if (z < zmin) zmin = z;
    if (z > zmax) zmax = z;
  }
  const rng = (zmax - zmin) || 1;

  // Vuelco el depth a una imagen en escala de grises a resolución completa.
  if (zbufFull.width !== width || zbufFull.height !== height) {
    zbufFull.width = width;
    zbufFull.height = height;
  }
  const fctx = zbufFull.getContext('2d');
  const img = fctx.createImageData(width, height);
  for (let i = 0; i < depth.length; i++) {
    const idx = i * 4;
    const z = depth[i];
    const g = Number.isFinite(z)
      ? Math.round(255 * ((z - zmin) / rng)) // más cerca (z mayor) = más claro
      : 20;                                  // sin geometría = casi negro
    img.data[idx + 0] = g;
    img.data[idx + 1] = g;
    img.data[idx + 2] = g;
    img.data[idx + 3] = 255;
  }
  fctx.putImageData(img, 0, 0);

  // Escalo la imagen completa al tamaño del panel.
  zbufCtx.clearRect(0, 0, zbufViewport.width, zbufViewport.height);
  zbufCtx.imageSmoothingEnabled = false;
  zbufCtx.drawImage(zbufFull, 0, 0, zbufViewport.width, zbufViewport.height);

  // Etiqueta.
  zbufCtx.fillStyle = '#fff';
  zbufCtx.font = '12px monospace';
  zbufCtx.fillText('Z-buffer', 6, 15);
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(initZBufferView, 100);
});
