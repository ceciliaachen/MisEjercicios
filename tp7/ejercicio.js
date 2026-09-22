// ============================================================================
//  TP7 - Curvas de Bézier racionales (solución de referencia).
//  Ejercicio del alumno: actualizar únicamente bezierVS, marcado con [TODO].
//  El envío de pesos, los overlays y la continuidad ya están resueltos.
//  Cada punto de control es {x, y, w}, con peso positivo (por defecto 1).
//  R(t) = N(t)/D(t) = sum(B_i(t) w_i P_i) / sum(B_i(t) w_i).
//  Para distribuir el ejercicio, reemplazar sólo la solución de bezierVS por
//  la evaluación polinómica anterior; conservar los uniforms w1 y w2.
// ============================================================================


// ----------------------------------------------------------------------------
// 1) BezierDrawer: dibuja la curva SUAVE con WebGL.
//    Evalúa f(t) en el VERTEX SHADER, un segmento cúbico por vez.
// ----------------------------------------------------------------------------
class BezierDrawer
{
	constructor()
	{
		this.prog = InitShaderProgram( bezierVS, bezierFS );

		this.mvp = gl.getUniformLocation( this.prog, 'mvp' );
		this.p = [
			gl.getUniformLocation( this.prog, 'p0' ),
			gl.getUniformLocation( this.prog, 'p1' ),
			gl.getUniformLocation( this.prog, 'p2' ),
			gl.getUniformLocation( this.prog, 'p3' )
		];
		this.w1 = gl.getUniformLocation( this.prog, 'w1' );
		this.w2 = gl.getUniformLocation( this.prog, 'w2' );
		this.tAttr = gl.getAttribLocation( this.prog, 't' );

		// El vertex shader corre UNA VEZ POR VÉRTICE, y acá cada "vértice" es
		// simplemente un valor de t. No mandamos posiciones (x,y): mandamos t y el
		// shader calcula f(t) para cada uno.
		// Muestreamos la curva en 'steps' valores de t: 0, 1/99, 2/99, ..., 1.
		// Cuantos más pasos, más lisa se ve la curva (más vértices).
		// El mismo buffer de t sirve para todos los segmentos (cambian p0..p3 y sus pesos).
		this.steps = 100;
		var tv = [];
		for ( var i = 0; i < this.steps; ++i ) tv.push( i / (this.steps - 1) );
		this.buffer = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(tv), gl.STATIC_DRAW );

		this.segments = [];
	}

	setViewport( width, height )
	{
		// Coordenadas de pantalla (píxeles), y hacia abajo. Column-major.
		var trans = [ 2/width,0,0,0,  0,-2/height,0,0, 0,0,1,0, -1,1,0,1 ];
		gl.useProgram( this.prog );
		gl.uniformMatrix4fv( this.mvp, false, trans );
	}

	// Recibe la lista de segmentos { p0, p1, p2, p3 } (cada uno {x,y,w})
	updatePath( segments )
	{
		this.segments = segments;
	}

	draw()
	{
		if ( !this.segments || this.segments.length === 0 ) return;

		gl.useProgram( this.prog );
		gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer );
		gl.vertexAttribPointer( this.tAttr, 1, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.tAttr );

		// Un segmento cúbico por vez: seteamos sus 4 puntos de control (uniforms) y
		// dibujamos sus 'steps' vértices. LINE_STRIP une esos puntos f(t) con
		// segmentos de recta, aproximando la curva suave.
		for ( const s of this.segments ) {
			gl.uniform2f( this.p[0], s.p0.x, s.p0.y );
			gl.uniform2f( this.p[1], s.p1.x, s.p1.y );
			gl.uniform2f( this.p[2], s.p2.x, s.p2.y );
			gl.uniform2f( this.p[3], s.p3.x, s.p3.y );
			gl.uniform1f( this.w1, s.p1.w );
			gl.uniform1f( this.w2, s.p2.w );
			gl.drawArrays( gl.LINE_STRIP, 0, this.steps );
		}
	}
}

// Vertex shader: cada vértice recibe su t y calcula su posición sobre la curva.
var bezierVS = `
	attribute float t;
	uniform mat4 mvp;
	uniform vec2 p0;
	uniform vec2 p1;
	uniform vec2 p2;
	uniform vec2 p3;
	uniform float w1; // peso del punto de control interno p1
	uniform float w2; // peso del punto de control interno p2
	// Los pesos de los extremos p0 y p3 están fijos en 1.
	void main()
	{
		// [TODO] Adaptá tu evaluación polinómica a una Bézier racional:
		// 1) multiplicá cada base de Bernstein por su peso;
		// 2) calculá el numerador vectorial y el denominador escalar;
		// 3) dividí ANTES de aplicar mvp. 

		// 1) Las cuatro bases de Bernstein para una curva cúbica.
		float u  = 1.0 - t;
		float B0 = u * u * u;
		float B1 = 3.0 * u * u * t;
		float B2 = 3.0 * u * t * t;
		float B3 = t * t * t;

		// 2) JavaScript envía w1 y w2 como uniforms escalares.
		// Los extremos tienen peso 1 y no necesitan uniforms adicionales.
		float c0 = B0;
		float c1 = B1 * w1;
		float c2 = B2 * w2;
		float c3 = B3;

		// 3) Cada punto aporta al numerador su posición multiplicada
		// por su base de Bernstein y su peso. Cada término es un vec2.

		// Numerador vectorial: sum(B_i(t) * w_i * P_i)
		vec2 numerador = c0 * p0 + c1 * p1 + c2 * p2 + c3 * p3;

		// 4) El denominador suma los mismos coeficientes, sin posiciones.
		// Si todos los pesos son 1, vale B0 + B1 + B2 + B3 = 1.
		
		// Denominador escalar: sum(B_i(t) * w_i)
		float denominador = c0 + c1 + c2 + c3;

		// 5) Normalizamos cada coordenada para obtener el punto R(t).
		vec2 R = numerador / denominador;
		
		// 6) Transformamos el punto de píxeles a coordenadas de pantalla.
		gl_Position = mvp * vec4(R.x, R.y, 0.0, 1.0);
	}
`;

var bezierFS = `
	precision mediump float;
	void main() { gl_FragColor = vec4(0.169, 0.424, 1.0, 1.0); }   // azul curva
`;


// ----------------------------------------------------------------------------
// 2) de Casteljau: construcción geométrica de f(t).
//    Devolvé el punto final y los niveles intermedios para poder DIBUJARLOS.
// ----------------------------------------------------------------------------
// Interpolación en coordenadas homogéneas: NO proyectar entre niveles.
function homogeneous(p) {
	const w = p.w === undefined ? 1 : p.w;
	return { x: p.x * w, y: p.y * w, w };
}
function lerp(a, b, t) {
	return {
		x: (1-t)*a.x + t*b.x,
		y: (1-t)*a.y + t*b.y,
		w: (1-t)*a.w + t*b.w
	};
}
function project(p) { return { x: p.x / p.w, y: p.y / p.w }; }

// norma = longitud (módulo) del vector (vx, vy). Lo escribimos explícito en vez
// de usar Math.hypot para que se vea la fórmula:  |v| = sqrt(vx^2 + vy^2)
function norma(vx, vy) {
	return Math.sqrt(vx * vx + vy * vy);
}

// Entra:  p0, p1, p2, p3 : puntos de control {x,y,w} del segmento
//         t              : parámetro en [0,1]
// Sale:   objeto con TRES campos (el framework los usa para dibujar):
//         {
//           point : {x,y},                    // f(t): el punto sobre la curva
//           l1    : [{x,y}, {x,y}, {x,y}],     // 3 puntos del 1er nivel (a,b,c)
//           l2    : [{x,y}, {x,y}]             // 2 puntos del 2do nivel (d,e)
//         }
function deCasteljau(p0, p1, p2, p3, t) {
	const h = [p0, p1, p2, p3].map(homogeneous);
	const a = lerp(h[0], h[1], t), b = lerp(h[1], h[2], t), c = lerp(h[2], h[3], t);
	const d = lerp(a, b, t), e = lerp(b, c, t);
	return {
		point: project(lerp(d, e, t)),
		l1: [a, b, c].map(project),
		l2: [d, e].map(project)
	};
}


// ----------------------------------------------------------------------------
// 3) Vector tangente: derivada f'(t).
// ----------------------------------------------------------------------------
// Entra:  p0, p1, p2, p3 : puntos de control {x,y,w} del segmento
//         t              : parámetro en [0,1]
// Sale:   {x,y} : el vector derivada f'(t) (NO normalizado; su largo importa)
// Derivamos N = D*R: R'=(N'-D'*R)/D,
// R''=(N''-D''*R-2*D'*R')/D. Código provisto por la cátedra.
function rationalDerivatives(p0, p1, p2, p3, t) {
	const h = [p0, p1, p2, p3].map(homogeneous);
	const u = 1 - t;
	const basis = [u*u*u, 3*u*u*t, 3*u*t*t, t*t*t];
	const first = [-3*u*u, 3*u*u-6*u*t, 6*u*t-3*t*t, 3*t*t];
	const second = [6*u, -12*u+6*t, 6*u-12*t, 6*t];
	const sum = (coeff, key) => coeff.reduce((v, c, i) => v + c*h[i][key], 0);
	const D = sum(basis, 'w'), D1 = sum(first, 'w'), D2 = sum(second, 'w');
	const d1 = {}, d2 = {};
	for (const key of ['x', 'y']) {
		const R = sum(basis, key) / D;
		d1[key] = (sum(first, key) - D1*R) / D;
		d2[key] = (sum(second, key) - D2*R - 2*D1*d1[key]) / D;
	}
	return { d1, d2 };
}
function bezierTangent(p0, p1, p2, p3, t) {
	return rationalDerivatives(p0, p1, p2, p3, t).d1;
}
function bezierSecondDerivative(p0, p1, p2, p3, t) {
	return rationalDerivatives(p0, p1, p2, p3, t).d2;
}

// ----------------------------------------------------------------------------
// 4) Curvatura y círculo osculador: misma fórmula, con derivadas racionales.
// ----------------------------------------------------------------------------
// Entra:  p0, p1, p2, p3 : puntos de control {x,y,w} del segmento
//         t              : parámetro en [0,1]
// Sale:   {
//           center : {x,y} | null,   // centro del círculo osculador (null si recta)
//           r      : Number,          // radio en px (Infinity si la curva es recta)
//           k      : Number           // curvatura con signo (1/r); 0 si recta
//         }
function bezierCurvature(p0, p1, p2, p3, t) {
	// Implementación provista:
	//   1) calcular f'(t) y f''(t)
	//   2) rapidez = |f'(t)|   y   giro = producto cruz (f' x f'') en 2D
	//   3) curvatura k = giro / rapidez^3   y   radio = 1 / |k|
	//   4) el centro está a 'radio' del punto, en la dirección PERPENDICULAR a
	//      f', del lado hacia donde la curva gira.
	const d1 = bezierTangent(p0, p1, p2, p3, t);          // f'(t)  (velocidad)
	const d2 = bezierSecondDerivative(p0, p1, p2, p3, t); // f''(t) (aceleración)

	const rapidez = norma(d1.x, d1.y);            // |f'(t)|
	const giro    = d1.x * d2.y - d1.y * d2.x;    // producto cruz en 2D (con signo)

	// Si la curva es localmente recta no hay círculo: radio infinito.
	if (rapidez < 1e-6 || Math.abs(giro) < 1e-6) {
		return { center: null, r: Infinity, k: 0 };
	}

	const k     = giro / (rapidez * rapidez * rapidez);  // rapidez^3
	const radio = 1 / Math.abs(k);

	// Dirección PERPENDICULAR a la tangente: girar f' 90° es (-f'.y, f'.x).
	// La normalizamos (dividiendo por su largo) para que tenga largo 1.
	let normalX = -d1.y / rapidez;
	let normalY =  d1.x / rapidez;

	// Esa perpendicular podría apuntar para cualquiera de los dos lados.
	// El signo del 'giro' nos dice hacia dónde está el centro: si es negativo,
	// damos vuelta la normal para que apunte hacia adentro de la curva.
	if (giro < 0) {
		normalX = -normalX;
		normalY = -normalY;
	}

	// El centro está sobre esa normal, a distancia 'radio' del punto f(t).
	const p = deCasteljau(p0, p1, p2, p3, t).point;
	const center = { x: p.x + normalX * radio, y: p.y + normalY * radio };

	return { center: center, r: radio, k: k };
}


// ----------------------------------------------------------------------------
// 5) Continuidad racional (provista). Ambos segmentos usan t en [0,1].
// En el ancla compartida A, su peso se cancela en la condición C1:
// inw * (A - in) = outw * (out - A).
// Se conserva la manija editada y se corrige la opuesta. También se llama al
// cambiar pesos y modo de continuidad. G1 conserva el largo de la opuesta.
// ----------------------------------------------------------------------------
function enforceContinuity(a, movedSide, mode) {

	// El ancla y la manija que se acaba de mover, como puntos {x,y}.
	const ancla = { x: a.x, y: a.y };
	let movida;
	if (movedSide === 'out') {
		movida = { x: a.outx, y: a.outy };
	} else {
		movida = { x: a.inx, y: a.iny };
	}

	// Acá vamos a guardar la nueva posición de la manija OPUESTA.
	let nuevaOpuesta;

	// ---- C0: manijas independientes -------------------------------------------
	if (mode === 'none') {
		// No hay que corregir nada: la unión puede quedar con "pico".
		return;
	}

	// ---- C1: reflejo escalado por la razón de pesos ---------------------------
	if (mode === 'C1') {
		const ratio = movedSide === 'out' ? a.outw / a.inw : a.inw / a.outw;
		nuevaOpuesta = {
			x: ancla.x - ratio * (movida.x - ancla.x),
			y: ancla.y - ratio * (movida.y - ancla.y)
		};
	}

	// ---- G1: misma dirección, se conserva el largo de la opuesta --------------
	if (mode === 'G1') {
		// Implementación provista.
		// 1) largo que YA tenía la manija opuesta (no lo queremos cambiar)
		let opuestaVieja;
		if (movedSide === 'out') {
			opuestaVieja = { x: a.inx,  y: a.iny  };
		} else {
			opuestaVieja = { x: a.outx, y: a.outy };
		}
		const largoOpuesta = norma(opuestaVieja.x - ancla.x, opuestaVieja.y - ancla.y);

		// 2) dirección desde el ancla hacia 'movida', como versor (largo 1)
		const dx = movida.x - ancla.x;
		const dy = movida.y - ancla.y;
		const largoMovida = norma(dx, dy) || 1;   // (|| 1 evita dividir por 0)
		const ux = dx / largoMovida;
		const uy = dy / largoMovida;

		// 3) la opuesta va para el LADO CONTRARIO (-versor) con su largo viejo
		nuevaOpuesta = {
			x: ancla.x - ux * largoOpuesta,
			y: ancla.y - uy * largoOpuesta
		};
	}

	// ---- Guardar la nueva opuesta (el lado contrario al que se movió) ----------
	if (movedSide === 'out') { a.inx  = nuevaOpuesta.x; a.iny  = nuevaOpuesta.y; }
	else                     { a.outx = nuevaOpuesta.x; a.outy = nuevaOpuesta.y; }
}

