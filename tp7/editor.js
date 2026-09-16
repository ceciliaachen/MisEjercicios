// ********** Framework: interacción, modelo de datos y overlays didácticos **********
// Este archivo YA está resuelto. El alumno NO necesita tocarlo.
//
// Modelo: una "polilínea Bézier" (path tipo pen tool). Cada ancla tiene dos
// manijas (in/out). Entre dos anclas consecutivas hay UN segmento Bézier cúbico:
//
//     p0 = ancla[i]         (posición)
//     p1 = ancla[i].out     (manija saliente)
//     p2 = ancla[i+1].in    (manija entrante)
//     p3 = ancla[i+1]       (posición)
//
// El framework llama a las funciones de ejercicio.js (ejercicio.js) para:
//   - dibujar la curva suave  -> curveDrawer.updatePath()  (vertex shader)
//   - de Casteljau            -> deCasteljau()
//   - vector tangente         -> bezierTangent()
//   - curvatura               -> bezierCurvature()
//   - continuidad de manijas  -> enforceContinuity()

const SVGNS = "http://www.w3.org/2000/svg";
const HANDLE_LEN = 70;

// Estado
var anchors = [];       // [{ x, y, inx, iny, outx, outy, inw, outw }]
var selected = 0;       // índice del ancla / segmento "activo"
var drag = null;        // { i, part:'anchor'|'in'|'out' }
var tParam = 0.5;

// ---------- utilidades ----------

function svg(tag, attrs) {
	const el = document.createElementNS(SVGNS, tag);
	for (const k in attrs) el.setAttribute(k, attrs[k]);
	return el;
}

function G(id) { return document.getElementById(id); }

// Segmento cúbico i (entre ancla i e i+1) como 4 puntos de control
function segment(i) {
	const a = anchors[i], b = anchors[i + 1];
	return {
		p0: { x: a.x,    y: a.y,    w: 1    },
		p1: { x: a.outx, y: a.outy, w: a.outw },
		p2: { x: b.inx,  y: b.iny,  w: b.inw  },
		p3: { x: b.x,    y: b.y,    w: 1    }
	};
}

// Índice del segmento "activo" (el que muestra las visualizaciones)
function activeSegment() {
	if (anchors.length < 2) return -1;
	if (selected < anchors.length - 1) return selected;
	return anchors.length - 2;
}

// Cada control modifica el peso almacenado en el ancla/manija real.
function weightTargets(i) {
	return [[anchors[i], 'outw'], [anchors[i + 1], 'inw']];
}
function syncWeightControls() {
	const i = activeSegment();
	G('weightsPanel').disabled = i < 0;
	G('segmentLabel').textContent = i < 0 ? 'Sin segmento activo' : `Segmento ${i + 1}`;
	const targets = i < 0 ? [] : weightTargets(i);
	for (let j = 1; j <= 2; j++) {
		const value = i < 0 ? 1 : targets[j - 1][0][targets[j - 1][1]];
		G(`weight${j}`).value = value;
		G(`weightValue${j}`).textContent = value.toFixed(2);
	}
}
function setSegmentWeight(j, value) {
	const i = activeSegment();
	if (i < 0 || (j !== 1 && j !== 2) || !Number.isFinite(value) || value < 0.1 || value > 5) {
		syncWeightControls();
		return;
	}
	const [a, key] = weightTargets(i)[j - 1];
	a[key] = value;
	enforceContinuity(a, key === 'inw' ? 'in' : 'out', G('continuity').value);
	redraw();
}

// ---------- creación / borrado de anclas ----------

function addAnchor(x, y) {
	// Manijas por defecto: alineadas con la dirección al ancla anterior,
	// simétricas (arranca con continuidad C1 "linda").
	let dx = 1, dy = 0;
	if (anchors.length >= 1) {
		const prev = anchors[anchors.length - 1];
		dx = x - prev.x; dy = y - prev.y;
		const len = Math.hypot(dx, dy) || 1;
		dx /= len; dy /= len;
	}
	anchors.push({
		x, y, inw: 1, outw: 1,
		inx:  x - dx * HANDLE_LEN, iny:  y - dy * HANDLE_LEN,
		outx: x + dx * HANDLE_LEN, outy: y + dy * HANDLE_LEN
	});
	selected = anchors.length - 1;
	redraw();
}

function deleteAnchor(i) {
	anchors.splice(i, 1);
	selected = Math.max(0, Math.min(selected, anchors.length - 1));
	redraw();
}

// ---------- render del overlay SVG ----------

function clearGroup(id) { const g = G(id); while (g.firstChild) g.removeChild(g.firstChild); }

function redraw() {
	syncWeightControls();
	// 1) Curva suave (WebGL): armamos la lista de segmentos y la mandamos al shader
	const segs = [];
	for (let i = 0; i < anchors.length - 1; i++) segs.push(segment(i));
	curveDrawer.updatePath(segs);
	DrawScene();

	// 2) Overlay SVG
	["g-polygon", "g-casteljau", "g-tangent", "g-osculating", "g-handles", "g-anchors", "g-labels"]
		.forEach(clearGroup);

	const showPolygon    = G("showPolygon").checked;
	const showCasteljau  = G("showCasteljau").checked;
	const showTangent    = G("showTangent").checked;
	const showOsculating = G("showOsculating").checked;
	const seg = activeSegment();

	// Polígono de control (líneas ancla ↔ manija) de TODOS los segmentos
	if (showPolygon) {
		const gp = G("g-polygon");
		for (let i = 0; i < anchors.length; i++) {
			const a = anchors[i];
			gp.appendChild(svg("line", { class: "polyline", x1: a.x, y1: a.y, x2: a.outx, y2: a.outy }));
			gp.appendChild(svg("line", { class: "polyline", x1: a.x, y1: a.y, x2: a.inx,  y2: a.iny  }));
		}
	}

	// Visualizaciones sobre el segmento activo
	if (seg >= 0) {
		const s = segment(seg);
		[s.p0, s.p1, s.p2, s.p3].forEach((p, j) => {
			const label = svg('text', { class: 'pt-label', x: p.x, y: p.y - 14 });
			label.textContent = (j === 1 || j === 2) ? `p${j} · w${j}=${p.w.toFixed(2)}` : `p${j}`;
			G('g-labels').appendChild(label);
		});
		if (showCasteljau)  drawCasteljau(s, tParam);
		if (showTangent)    drawTangent(s, tParam);
		if (showOsculating) drawOsculating(s, tParam);
	}

	// Manijas (círculos chicos) y anclas (círculos grandes)
	const gh = G("g-handles"), ga = G("g-anchors");
	for (let i = 0; i < anchors.length; i++) {
		const a = anchors[i];
		gh.appendChild(handleCircle(i, "in",  a.inx,  a.iny));
		gh.appendChild(handleCircle(i, "out", a.outx, a.outy));
		ga.appendChild(anchorCircle(i, a.x, a.y));
	}
}

function anchorCircle(i, x, y) {
	const c = svg("circle", {
		class: "anchor" + (i === selected ? " selected" : ""),
		cx: x, cy: y, r: 7
	});
	c.addEventListener("mousedown", (e) => {
		e.stopPropagation();
		if (e.button === 0) { selected = i; drag = { i, part: "anchor" }; redraw(); }
	});
	c.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); deleteAnchor(i); });
	return c;
}

function handleCircle(i, part, x, y) {
	const c = svg("circle", { class: "handle", cx: x, cy: y, r: 5.5 });
	c.addEventListener("mousedown", (e) => {
		e.stopPropagation();
		if (e.button === 0) { selected = part === "in" ? Math.max(0, i - 1) : i; drag = { i, part }; redraw(); }
	});
	return c;
}

// ---------- overlays didácticos (usan las funciones de ejercicio.js) ----------

function drawCasteljau(s, t) {
	const g = G("g-casteljau");
	const r = deCasteljau(s.p0, s.p1, s.p2, s.p3, t);
	if (!r || !r.l1 || !r.l2 || !r.point) return;

	// Nivel 1: 3 puntos, polilínea verde
	const l1 = r.l1;
	g.appendChild(polyline("casteljau-l1", l1));
	l1.forEach(p => g.appendChild(svg("circle", { class: "casteljau-dot-l1", cx: p.x, cy: p.y, r: 4 })));

	// Nivel 2: 2 puntos, polilínea violeta
	const l2 = r.l2;
	g.appendChild(polyline("casteljau-l2", l2));
	l2.forEach(p => g.appendChild(svg("circle", { class: "casteljau-dot-l2", cx: p.x, cy: p.y, r: 4 })));

	// Punto final sobre la curva f(t)
	g.appendChild(svg("circle", { class: "casteljau-point", cx: r.point.x, cy: r.point.y, r: 6 }));
}

function drawTangent(s, t) {
	const g = G("g-tangent");
	const d = bezierTangent(s.p0, s.p1, s.p2, s.p3, t);
	const c = deCasteljau(s.p0, s.p1, s.p2, s.p3, t);
	if (!d || !c || !c.point) return;

	const p = c.point;
	// Dibujamos el vector tangente escalado para que se vea (dirección/magnitud reales)
	const scale = 0.25;
	const tip = { x: p.x + d.x * scale, y: p.y + d.y * scale };
	g.appendChild(svg("line", { class: "tangent", x1: p.x, y1: p.y, x2: tip.x, y2: tip.y }));
	drawArrowHead(g, p, tip);
}

function drawOsculating(s, t) {
	const g = G("g-osculating");
	const cur = bezierCurvature(s.p0, s.p1, s.p2, s.p3, t);
	const c = deCasteljau(s.p0, s.p1, s.p2, s.p3, t);
	if (!cur || !c || !c.point) return;
	if (!isFinite(cur.r) || cur.r > 100000) return; // recta ⇒ radio infinito, no dibujamos

	const p = c.point;
	g.appendChild(svg("circle", { class: "osculating-circle", cx: cur.center.x, cy: cur.center.y, r: cur.r }));
	g.appendChild(svg("line", { class: "osculating-radius", x1: p.x, y1: p.y, x2: cur.center.x, y2: cur.center.y }));
}

function polyline(cls, pts) {
	const d = pts.map((p, i) => (i === 0 ? "M" : "L") + p.x + "," + p.y).join(" ");
	return svg("path", { class: cls, d });
}

function drawArrowHead(g, from, to) {
	const ang = Math.atan2(to.y - from.y, to.x - from.x);
	const size = 12;
	for (const s of [Math.PI - 0.4, Math.PI + 0.4]) {
		g.appendChild(svg("line", {
			class: "tangent",
			x1: to.x, y1: to.y,
			x2: to.x + size * Math.cos(ang + s),
			y2: to.y + size * Math.sin(ang + s)
		}));
	}
}

// ---------- eventos globales ----------

function initEvents() {
	const overlay = G("overlay");

	// Click en vacío -> agregar ancla
	overlay.addEventListener("mousedown", (e) => {
		if (e.button !== 0) return;
		addAnchor(e.clientX, e.clientY);
	});
	overlay.addEventListener("contextmenu", (e) => e.preventDefault());

	window.addEventListener("mousemove", (e) => {
		if (!drag) return;
		const a = anchors[drag.i];
		if (drag.part === "anchor") {
			const dx = e.clientX - a.x, dy = e.clientY - a.y;
			a.x += dx; a.y += dy;
			a.inx += dx; a.iny += dy;
			a.outx += dx; a.outy += dy;
		} else if (drag.part === "out") {
			a.outx = e.clientX; a.outy = e.clientY;
			enforceContinuity(a, "out", G("continuity").value);
		} else if (drag.part === "in") {
			a.inx = e.clientX; a.iny = e.clientY;
			enforceContinuity(a, "in", G("continuity").value);
		}
		redraw();
	});

	window.addEventListener("mouseup", () => { drag = null; });

	// Panel
	["showPolygon", "showCasteljau", "showTangent", "showOsculating"]
		.forEach(id => G(id).addEventListener("change", redraw));

	G('continuity').addEventListener('change', () => {
		anchors.forEach(a => enforceContinuity(a, 'out', G('continuity').value));
		redraw();
	});
	for (let j = 1; j <= 2; j++) {
		G(`weight${j}`).addEventListener('input', e => setSegmentWeight(j, Number(e.target.value)));
	}
	G('resetWeights').addEventListener('click', () => {
		const i = activeSegment();
		if (i < 0) return;
		weightTargets(i).forEach(([a, key]) => { a[key] = 1; });
		// Conservar las dos manijas del segmento activo al corregir los empalmes.
		enforceContinuity(anchors[i], 'out', G('continuity').value);
		enforceContinuity(anchors[i + 1], 'in', G('continuity').value);
		redraw();
	});

	G("tparam").addEventListener("input", (e) => {
		tParam = parseFloat(e.target.value);
		G("tval").textContent = tParam.toFixed(2);
		redraw();
	});

	G("clear").addEventListener("click", () => { anchors = []; selected = 0; redraw(); });

	window.addEventListener("resize", () => { UpdateCanvasSize(); redraw(); });
}

// ---------- arranque ----------

window.addEventListener("load", () => {
	InitWebGL();
	initEvents();

	// Semilla: dos anclas para que se vea una curva de entrada
	const w = window.innerWidth, h = window.innerHeight;
	addAnchor(w * 0.30, h * 0.60);
	addAnchor(w * 0.60, h * 0.40);
	selected = 0;
	redraw();
});
