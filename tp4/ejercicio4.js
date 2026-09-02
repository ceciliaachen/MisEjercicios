/*
ejercicio4.js — Rasterización de triángulos con coordenadas baricéntricas.
Recordar que usaremos las siguientes convenciones para matrices: un arreglo 1D 
con 9 valores en orden "column-major". Es decir, para un arreglo A[] de 0 a 8, 
cada posición corresponderá a la siguiente matriz:

| A[0] A[3] A[6] |      ==>     [ A[0], A[1], A[2], 
| A[1] A[4] A[7] |                A[3], A[4], A[5], 
| A[2] A[5] A[8] |                A[6], A[7], A[8] ]

En este ejercicio implementás solo el rasterizador de triángulos: la función
drawTriangle (buscá el comentario "TODO"). Toda la etapa de transformaciones 3D
(cámara, vista y proyecciones), el álgebra (Vec, mat4Mul, mat4Vec4) y los
helpers de rasterización (edge, homogeneousToNDC) ya vienen dados (marcados
como "PROVISTA" y no hace falta modificar).
*/

// ===================== FUNCIONES PROVISTAS — Álgebra ===================== //
// (Ya implementadas: no hace falta modificarlas.)

// PROVISTA: operaciones básicas con vectores 3D representados como [x, y, z].
const Vec = {
  add:(a,b)=>[a[0]+b[0], a[1]+b[1], a[2]+b[2]],
  sub:(a,b)=>[a[0]-b[0], a[1]-b[1], a[2]-b[2]],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]],
  norm:(a)=>Math.hypot(a[0],a[1],a[2]),
  normalize:(a)=>{ const n = Vec.norm(a) || 1; return [a[0]/n, a[1]/n, a[2]/n]; },
  scale:(a,s)=>[a[0]*s, a[1]*s, a[2]*s],
};

// PROVISTA: multiplicación de matrices 4x4 (column-major). mat4Mul(A, B) = A·B.
function mat4Mul(a,b){
  const r = new Array(16).fill(0);
  for(let i=0;i<4;i++){
    for(let j=0;j<4;j++){
      for(let k=0;k<4;k++) r[j*4+i] += a[k*4+i]*b[j*4+k];
    }
  }
  return r;
}

// PROVISTA: multiplica una matriz 4x4 (column-major) por un vector [x, y, z, w].
function mat4Vec4(m, v){
  const r=[0,0,0,0];
  for(let i=0;i<4;i++) for(let k=0;k<4;k++) r[i]+=m[k*4+i]*v[k];
  return r;
}

// ===================== I. CÁMARA Y VISTA — PROVISTAS ==================== //
// (Ya implementadas: no hace falta modificarlas.)
//   setupCamera → DÓNDE está la cámara: vectores (eye, center, up) en el mundo.
//   lookAt      → CÓMO se ve el mundo desde ahí: la matriz de vista (mundo → cámara).

/* PROVISTA: función setupCamera(ui).
DÓNDE está la cámara. Traduce los parámetros de la UI (ángulos) a la UBICACIÓN
de la cámara en el mundo. OJO: no devuelve una matriz, devuelve tres vectores.
  - ui.az : ángulo de acimut (azimuth).
  - ui.el : ángulo de elevación.
Asumimos:
  - radius = 3, distancia fija de la cámara al centro de la escena.
  - center = (0,0,0), punto al que la cámara siempre mira.
  - up = (0,1,0), vertical del mundo.
Devuelve { eye, center, up } (la ubicación), que luego alimenta a lookAt.
Es la "política" de cámara de esta app (orbitar con los sliders); se podría
cambiar por otra sin tocar lookAt.
*/
function setupCamera(ui) {
  const azimuth   = ui.az;
  const elevation = ui.el;
  const radius = 3.0;
  const center = [0, 0, 0];
  const eye = [
    radius * Math.cos(elevation) * Math.cos(azimuth),
    radius * Math.sin(elevation),
    radius * Math.cos(elevation) * Math.sin(azimuth)
  ];
  const up = [0, 1, 0];
  return { eye, center, up };
}

/* PROVISTA: matriz de vista (lookAt).
Recibe la ubicación YA calculada (eye, center, up) y construye la matriz de
vista V, que transforma cualquier punto del mundo a coordenadas de la cámara
(eye en el origen, mirando hacia -Z). lookAt NO decide dónde está la cámara.

Es la "Transformación de cámara": V = R · T, con

  R = | xu yu zu 0 |        T = | 1 0 0 -xe |
      | xv yv zv 0 |            | 0 1 0 -ye |
      | xw yw zw 0 |            | 0 0 1 -ze |
      |  0  0  0 1 |            | 0 0 0  1  |

Primero T lleva 'eye' (e) al origen; luego R rota alineando los ejes {u, v, w}.
La base ortonormal de la cámara:
  - e   = eye (posición de la cámara).
  - -w  = dirección de visión = normalize(center - eye)   [en el código: minus_w].
  - v   = dirección vertical (arriba real de la cámara).
  - u   = lateral (derecha). {u, v, w} es una base ortonormal derecha.

Notar:
  - En R, la 3ra fila es w = -minus_w (por eso aparece con signo cambiado).
  - Column-major: los arreglos se almacenan por columnas.
*/
function lookAt(eye, center, up){
  const minus_w = Vec.normalize(Vec.sub(center, eye));
  const u       = Vec.normalize(Vec.cross(minus_w, up));
  const v       = Vec.cross(u, minus_w);
  // Construyo matriz de rotación y translacion por separado
  const rotation = [ u[0],  v[0], -minus_w[0],  0,
                     u[1],  v[1], -minus_w[1],  0,
                     u[2],  v[2], -minus_w[2],  0,
                     0,     0,     0,     1 ];
  const translation = [ 1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        - eye[0], - eye[1], - eye[2], 1 ];
  return mat4Mul(rotation, translation);
}

// ==================== II. PROYECCIONES — PROVISTAS ===================== //
// (Ya implementadas: no hace falta modificarlas.)

/* PROVISTA: matriz de proyección ortográfica.
Mapea la caja de visión [l,r] × [b,t] × [n,f] al volumen canónico (NDC: Normalized Device Coordinates) [-1,1]³.
En column-major equivale a la matriz vista en clase:

  | 2/(r-l)     0        0      -(r+l)/(r-l) |
  |   0      2/(t-b)     0      -(t+b)/(t-b) |
  |   0         0     2/(n-f)   -(n+f)/(n-f) |
  |   0         0        0            1      |

Nota: n y f son las coordenadas z de los planos near/far (negativas, porque la
cámara mira hacia -Z), por eso n-f > 0.
*/
function orthographic(left, right, bottom, top, znear, zfar){
  const w = right - left;
  const h = top - bottom;
  const d = znear - zfar;
  const orthoMat =  [ 2/w, 0, 0, 0,
           0, 2/h, 0, 0,
           0, 0, 2/d, 0,
           -(right+left)/w, -(top+bottom)/h, -(znear+zfar)/d, 1 ];
  return orthoMat;
}

/* PROVISTA: matriz proyectiva (la que "aplasta" el frustum).
Es la primera parte de la perspectiva vista en clase. En column-major equivale a:

  | n   0     0      0  |
  | 0   n     0      0  |
  | 0   0   n+f   -f·n  |
  | 0   0     1      0  |

n y f son las coordenadas z de los planos near y far. La fila inferior [0 0 1 0]
hace que w' = z: al dividir por w (perspective divide) aparece la perspectiva.
*/
function projective(znear, zfar){
  const n = znear, f = zfar;
  return [ n, 0, 0,    0,
           0, n, 0,    0,
           0, 0, n + f, 1,
           0, 0, -f * n, 0 ];
}
/* PROVISTA: matriz de perspectiva como COMPOSICIÓN.
Tal como se ve en clase, la perspectiva se arma en dos pasos:
  1. projective(n, f): "aplasta" el frustum en una caja.
  2. orthographic(l, r, b, t, n, f): lleva esa caja al volumen canónico (NDC).
Es decir:  perspective = orthographic · projective.
Recordá que mat4Mul(A, B) devuelve A·B.
Parámetros: l, r, b, t definen la ventana en el plano near; n, f son los
planos near/far (coordenadas z, negativas).
*/
function perspective(left, right, bottom, top, znear, zfar){
  return mat4Mul(
    orthographic(left, right, bottom, top, znear, zfar),
    projective(znear, zfar)
  );
}

/* PROVISTA: conversión de NDC a coordenadas de pantalla (viewport).
Lleva el volumen canónico (x, y ∈ [-1, 1]) a píxeles, siguiendo la matriz de
ventana vista en clase:

  | w/2    0    (w-1)/2 |
  |  0    h/2   (h-1)/2 |
  |  0     0       1    |

Ojo: en pantalla el eje Y crece hacia ABAJO, por eso invertimos el signo de Y.
La coordenada z se conserva para el z-buffer.
Ejemplo: ndcToScreen([-1, 1, 0], 800, 600) => [-0.5, -0.5, 0]
*/
function ndcToScreen(ndc, width, height){
  const x = (ndc[0]*0.5*(width)+0.5*(width-1));
  const y = ((-ndc[1]*0.5*(height)+0.5*(height-1)));
  return [x,y,ndc[2]]; // coord z lo mantengo
}

// ============= FUNCIONES PROVISTAS — Helpers de rasterización ============ //
// (Ya implementadas: no hace falta modificarlas.)

/* PROVISTA: homogeneousToNDC (perspective divide).
Pasa de coordenadas CLIP (homogéneas [x, y, z, w]) a NDC dividiendo por w.
En perspectiva, esta división es la que produce el efecto de "lejanía".
*/
function homogeneousToNDC(coords) {
  const w = coords[3];
  return [
    coords[0] / w,  // x
    coords[1] / w,  // y
    coords[2] / w   // z
  ];
}
// ------------------------------ II. Rasterización ------------------------- //

/* PROVISTA: función de borde edge(p0, p1, p2).
Dado el segmento orientado p0->p1 y un punto p2, devuelve un valor con signo:
  > 0 si p2 queda a un lado de la recta, < 0 del otro lado, 0 si está sobre ella.
Su valor equivale al doble del área (con signo) del triángulo (p0, p1, p2),
por eso sirve para calcular coordenadas baricéntricas.
  p0, p1, p2: puntos 2D [x, y] en coordenadas de pantalla.
*/
function edge(p0, p1, p2){
  return (p1[0]-p0[0])*(p2[1]-p0[1]) - (p1[1]-p0[1])*(p2[0]-p0[0]);
}

// =============== III. RASTERIZACIÓN — A IMPLEMENTAR ==================== //

/* TODO: Implementar el rasterizador drawTriangle.
CONTEXTO: esta función es el ÚLTIMO paso del pipeline. El pipeline (en tp4.js) la
llama UNA VEZ POR CADA TRIÁNGULO de la escena, y ya le pasa sus vértices
PROYECTADOS A COORDENADAS DE PANTALLA (píxeles): las transformaciones de cámara,
proyección y el paso a pantalla (ndcToScreen) ya ocurrieron antes. Acá no hay más
3D: sólo tenemos los tres vértices 2D (con su z para profundidad) y hay que
decidir, píxel por píxel, qué se pinta.

Pinta el triángulo (v0, v1, v2) dado en coordenadas de pantalla con el color rgb.
Usamos coordenadas baricéntricas para decidir qué píxeles caen dentro del
triángulo e interpolar su profundidad. Idea (como se vio en clase):

  1. Recorrer sólo los píxeles del bounding box del triángulo (no toda la
     pantalla): entre el mínimo y el máximo de las x y de las y de los vértices,
     recortado a los límites [0, w-1] × [0, h-1].
  2. Calcular el área con signo del triángulo con edge(v0, v1, v2). Si es 0, el
     triángulo es degenerado y no ocupa píxeles: return.
  3. Para cada píxel, tomar su centro p = [x + 0.5, y + 0.5] y calcular las tres
     coordenadas baricéntricas dividiendo por el área:
        w0 = edge(v1, v2, p) / area
        w1 = edge(v2, v0, p) / area
        w2 = edge(v0, v1, p) / area
     El píxel está DENTRO del triángulo si las tres son >= 0 (si alguna es
     negativa, se descarta con continue).
  4. Interpolar la profundidad z del píxel con las baricéntricas:
        z = w0*v0[2] + w1*v1[2] + w2*v2[2]

Z-BUFFER (profundidad): como en la escena hay caras que se tapan entre sí,
no alcanza con pintar; hay que quedarse con la más CERCANA en cada píxel. Para
eso usamos un buffer 'depth' con una z por píxel (inicializado en -Infinity):
antes de pintar un píxel comparamos su z con la guardada y sólo lo pintamos si
está más cerca (en esta convención, z mayor = más cerca). Así, sin importar el
orden en que llegan los triángulos, gana el más próximo a la cámara.

Al pintar (z gana): guardar depth[idx] = z y escribir el color RGBA en img.data
(4 bytes por píxel: r, g, b y alpha = 255), con idx = y*w + x.

Parámetros:
  - img      : {data, w, h} buffer de la imagen (RGBA).
  - depth    : Float32Array con la profundidad guardada por píxel.
  - v0,v1,v2 : vértices [x, y, z] en pantalla.
  - rgb      : color [r, g, b].
*/
function drawTriangle(img, depth, v0, v1, v2, rgb){
  const w = img.w, h = img.h;

  // Bounding box del triangulo
  const minX = Math.max(0, Math.floor(Math.min(v0[0],v1[0],v2[0])))
  const maxX = Math.min(w-1, Math.floor(Math.max(v0[0],v1[0],v2[0])))
  const minY = Math.max(0, Math.floor(Math.min(v0[1],v1[1],v2[1])))
  const maxY = Math.min(w-1, Math.floor(Math.max(v0[1],v1[1],v2[1])))

  // area 
  const area = edge(v0,v1,v2)

  for(let y = minY; y <= maxY; y++) {
    for(let x = minX; x <= maxX; x++) {
      const p = [x + 0.5,y + 0.5];

      // Calcular coordenadas baricentricas
      const a = edge(v1,v2,p) / area
      const b = edge(v2,v0,p) / area
      const g = edge(v0,v1,p) / area

      // Si el pixel esta dentro del triangulo
      if (a < 0 || b < 0 || g < 0) continue;
      if (a > 1 || b > 1 || g > 1) continue;

      const z = a*v0[2] + b*v1[2] + g*v2[2];

      const pix_index = y * w + x; 
      if (z  > depth[pix_index]) {
        depth[pix_index] = z;

        img.data[pix_index*4 + 0] = 255;
        img.data[pix_index*4 + 1] = 0;
        img.data[pix_index*4 + 2] = 0;
        img.data[pix_index*4 + 3] = 255;
      }

    }  
  }

}