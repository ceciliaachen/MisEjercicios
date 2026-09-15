// ============================================================================
//  TP6 - Editor de curvas de Bézier
//  Sólo tenés que completar los bloques marcados con [TODO].
//  Todo lo demás (interacción, UI, pipeline) ya está resuelto en el framework.
//  Rationale de la app y modelo de datos: ver README.md
//
//  Cómo se guarda una curva: cada segmento cúbico se define con 4 puntos de
//  control p0,p1,p2,p3 (cada uno es un {x,y} en píxeles de pantalla). p0 y p3
//  son los extremos por donde PASA la curva; p1 y p2 la "tiran" sin tocarla.
//
//  ORDEN SUGERIDO (cada paso se puede verificar visualmente antes de seguir):
//    1) bezierVS         -> fórmula de Bernstein en el shader (aparece la curva)
//    2) deCasteljau      -> construcción geométrica de f(t)
//    3) bezierTangent    -> derivada f'(t) (vector tangente)
//    4) bezierCurvature  -> curvatura y círculo osculador
//    5) enforceContinuity-> empalme C1 / G1 al mover una manija
//
//  Teoría (ver clase "6.0 Curvas"):
//    Bézier cúbica:  f(t) = (1-t)^3 p0 + 3(1-t)^2 t p1 + 3(1-t) t^2 p2 + t^3 p3
//    Derivada:       f'(t) = 3(1-t)^2 (p1-p0) + 6(1-t)t (p2-p1) + 3t^2 (p3-p2)
//    de Casteljau:   interpolaciones lineales anidadas hasta llegar a f(t)
//    Curvatura:      k = |f' x f''| / |f'|^3 ,  radio r = 1/k
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
		this.tAttr = gl.getAttribLocation( this.prog, 't' );

		// El vertex shader corre UNA VEZ POR VÉRTICE, y acá cada "vértice" es
		// simplemente un valor de t. No mandamos posiciones (x,y): mandamos t y el
		// shader calcula f(t) para cada uno.
		// Muestreamos la curva en 'steps' valores de t: 0, 1/99, 2/99, ..., 1.
		// Cuantos más pasos, más lisa se ve la curva (más vértices).
		// El mismo buffer de t sirve para todos los segmentos (sólo cambian p0..p3).
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

	// Recibe la lista de segmentos { p0, p1, p2, p3 } (cada uno {x,y})
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
	void main()
	{
		// Entra: t (attribute, propio de este vértice) ; p0..p3 y mvp (uniforms)
		// Sale:  gl_Position = mvp * vec4(f(t), 0.0, 1.0)
		// [TODO] Evaluá la Bézier cúbica con la base de Bernstein.
		//        Recordá: las constantes flotantes se escriben como 3.0, 1.0, etc.

		float u = 1.0 - t;
		vec2 f = u*u*u*p0 
				+ 3.0*u*u*t*p1 
				+ 3.0*u*t*t*p2 
				+ t*t*t*p3;
		gl_Position = mvp * vec4(f, 0.0, 1.0);
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
// lerp = interpolación lineal: devuelve el punto que está a una fracción t del
// camino entre a y b.  t=0 -> a,  t=1 -> b,  t=0.5 -> punto medio.
// Es el ladrillo básico de de Casteljau (todo se arma repitiendo lerp).
function lerp(a, b, t) {
	return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// norma = longitud (módulo) del vector (vx, vy). Lo escribimos explícito en vez
// de usar Math.hypot para que se vea la fórmula:  |v| = sqrt(vx^2 + vy^2)
function norma(vx, vy) {
	return Math.sqrt(vx * vx + vy * vy);
}

// Entra:  p0, p1, p2, p3 : puntos de control {x,y} del segmento
//         t              : parámetro en [0,1]
// Sale:   objeto con TRES campos (el framework los usa para dibujar):
//         {
//           point : {x,y},                    // f(t): el punto sobre la curva
//           l1    : [{x,y}, {x,y}, {x,y}],     // 3 puntos del 1er nivel (a,b,c)
//           l2    : [{x,y}, {x,y}]             // 2 puntos del 2do nivel (d,e)
//         }
function deCasteljau(p0, p1, p2, p3, t) {
	// [TODO] Calculá las interpolaciones lineales anidadas:
	//   nivel 1: a = lerp(p0,p1), b = lerp(p1,p2), c = lerp(p2,p3)
	//   nivel 2: d = lerp(a,b),   e = lerp(b,c)
	//   punto  : f = lerp(d,e)  == f(t)

	const a = lerp(p0, p1, t);
	const b = lerp(p1, p2, t);
	const c = lerp(p2, p3, t);

	const d = lerp(a, b, t);
	const e = lerp(b, c, t);

	const point = lerp(d, e, t);

	return { point: point, l1: [a, b, c], l2: [d, e] };
}

// ----------------------------------------------------------------------------
// 3) Vector tangente: derivada f'(t).
// ----------------------------------------------------------------------------
// Entra:  p0, p1, p2, p3 : puntos de control {x,y} del segmento
//         t              : parámetro en [0,1]
// Sale:   {x,y} : el vector derivada f'(t) (NO normalizado; su largo importa)
function bezierTangent(p0, p1, p2, p3, t) {
	// [TODO] Implementá f'(t) = 3(1-t)^2 (p1-p0) + 6(1-t)t (p2-p1) + 3 t^2 (p3-p2)
	const u = 1 - t;

	// Coeficiente que multiplica a cada término
	const c0 = 3 * u * u;
	const c1 = 6 * u * t;
	const c2 = 3 * t * t;

	// Diferencias entre puntos de control
	const dif01 = { x: p1.x - p0.x, y: p1.y - p0.y };
	const dif12 = { x: p2.x - p1.x, y: p2.y - p1.y };
	const dif23 = { x: p3.x - p2.x, y: p3.y - p2.y };

	// f'(t) = c0 * dif01 + c1 * dif12 + c2 * dif23
	return {
		x: c0 * dif01.x + c1 * dif12.x + c2 * dif23.x,
		y: c0 * dif01.y + c1 * dif12.y + c2 * dif23.y
	};
}


// ----------------------------------------------------------------------------
// 4) Curvatura y círculo osculador.
//    Devolvé { center, r, k }. Si la curva es (casi) recta, r = Infinity.
// ----------------------------------------------------------------------------
function bezierSecondDerivative(p0, p1, p2, p3, t) {
	// f''(t) = 6(1-t)(p2 - 2 p1 + p0) + 6 t (p3 - 2 p2 + p1)
	const u = 1 - t;
	return {
		x: 6 * u * (p2.x - 2 * p1.x + p0.x) + 6 * t * (p3.x - 2 * p2.x + p1.x),
		y: 6 * u * (p2.y - 2 * p1.y + p0.y) + 6 * t * (p3.y - 2 * p2.y + p1.y)
	};
}

// Entra:  p0, p1, p2, p3 : puntos de control {x,y} del segmento
//         t              : parámetro en [0,1]
// Sale:   {
//           center : {x,y} | null,   // centro del círculo osculador (null si recta)
//           r      : Number,          // radio en px (Infinity si la curva es recta)
//           k      : Number           // curvatura con signo (1/r); 0 si recta
//         }
function bezierCurvature(p0, p1, p2, p3, t) {
	// [TODO] Pasos:
	//   1) calcular f'(t) y f''(t)
	//   2) rapidez = |f'(t)|   y   giro = producto cruz (f' x f'') en 2D
	//   3) curvatura k = giro / rapidez^3   y   radio = 1 / |k|
	//   4) el centro está a 'radio' del punto, en la dirección PERPENDICULAR a
	//      f', del lado hacia donde la curva gira.
	
	// Paso 1: calcular f'(t) y f''(t)
    const fp = bezierTangent(p0, p1, p2, p3, t);
	const fpp = bezierSecondDerivative(p0, p1, p2, p3, t);

	// Paso 2: rapidez y giro
	const rapidez = norma(fp.x, fp.y);
	const giro = fp.x * fpp.y - fp.y * fpp.x;

	// Paso 3: curvatura y radio
	const k = giro / (rapidez * rapidez * rapidez);
	const radio = 1 / Math.abs(k);

	// perpendicular a f' (normalizado), rotado 90° hacia donde gira la curva
	const perp = { x: -fp.y / rapidez, y: fp.x / rapidez };
	const signo = k > 0 ? 1 : -1;

	const point = deCasteljau(p0, p1, p2, p3, t).point;
	const center = {
		x: point.x + signo * radio * perp.x,
		y: point.y + signo * radio * perp.y
	};
    
	return { center: center, r: radio, k: k };
}


// ----------------------------------------------------------------------------
// 5) Continuidad al mover una manija.
//
//    Rationale: un ancla es compartida por DOS segmentos (el que termina en ella
//    y el que arranca en ella). Cómo se empalman depende de la relación entre sus
//    dos manijas (in y out):
//      C0 : sólo comparten la posición del ancla. Manijas libres (esquina).
//      C1 : manijas OPUESTAS y de IGUAL longitud  -> tangente idéntica (suave).
//      G1 : manijas OPUESTAS, pero pueden tener DISTINTA longitud -> misma
//           dirección de tangente, distinta magnitud.
//
//    Cuando el usuario arrastra una manija, corregimos la del OTRO lado del mismo
//    ancla para mantener la condición elegida.
//
//    ¿QUIÉN la llama y CUÁNDO? La llama el framework (editor.js) en CADA
//    movimiento del mouse mientras arrastrás UNA manija. Antes de llamarla, el
//    framework ya movió esa manija a donde está el mouse; esta función sólo
//    recalcula la manija OPUESTA del MISMO ancla. NO se llama al crear anclas ni
//    al mover el cuerpo del ancla. El 'mode' se lee del panel en ese instante.
//
//    OJO: la "unión" entre dos segmentos ES el ancla. Un ancla tiene DOS manijas
//    (in y out); acá NO se toca ninguna manija de otro ancla.
//
//    Entra:
//      a         = ancla { x, y, inx, iny, outx, outy }  (in/out absolutos, en px)
//      movedSide = 'in' | 'out'   (la manija que se acaba de mover)
//      mode      = 'none' | 'C1' | 'G1'
//    Sale: NADA. Modifica 'a' in-place: reescribe la manija OPUESTA a movedSide.
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
		return;
	}

	// ---- C1: reflejo exacto ---------------------------------------------------
	if (mode === 'C1') {
		// [TODO] La opuesta es el espejo de 'movida' respecto del ancla.
		//        Espejar un punto p respecto de A es:  2*A - p
		nuevaOpuesta = {
			x: 2 * ancla.x - movida.x,
			y: 2 * ancla.y - movida.y
		};
	}

	// ---- G1: misma dirección, se conserva el largo de la opuesta --------------
	if (mode === 'G1') {
		const opuesta = (movedSide === 'out') ? { x: a.inx, y: a.iny } : { x: a.outx, y: a.outy };
		const largoOpuesta = norma(opuesta.x - ancla.x, opuesta.y - ancla.y);

		const dx = movida.x - ancla.x;
		const dy = movida.y - ancla.y;
		const largoMovida = norma(dx, dy);
		const versor = { x: dx / largoMovida, y: dy / largoMovida };

		// 3) la opuesta va para el LADO CONTRARIO (-versor) con su largo viejo
		nuevaOpuesta = {
			x: ancla.x - versor.x * largoOpuesta,
			y: ancla.y - versor.y * largoOpuesta
		};
	}

	// ---- Guardar la nueva opuesta (el lado contrario al que se movió) ----------
	if (movedSide === 'out') { a.inx  = nuevaOpuesta.x; a.iny  = nuevaOpuesta.y; }
	else                     { a.outx = nuevaOpuesta.x; a.outy = nuevaOpuesta.y; }
}

