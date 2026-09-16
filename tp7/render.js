// ********** Framework: pipeline WebGL y utilidades de shaders **********
// Este archivo YA está resuelto. El alumno no necesita modificarlo.
// La curva suave se dibuja con WebGL evaluando f(t) en el vertex shader
// (lo implementa el alumno en ejercicio.js). Todo lo interactivo/didáctico
// vive en el overlay SVG (editor.js).

var gl;
var curveDrawer;   // instancia de BezierDrawer (definida en ejercicio.js)

function InitWebGL()
{
	const canvas = document.getElementById("canvas");
	canvas.oncontextmenu = function() { return false; };

	// alpha:true -> el canvas es transparente y deja ver la grilla del fondo (CSS)
	gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: false });
	if (!gl) { alert("No se pudo inicializar WebGL. Tu navegador podría no soportarlo."); return; }

	gl.clearColor(0.0, 0.0, 0.0, 0.0);   // transparente
	gl.lineWidth(1.0);

	curveDrawer = new BezierDrawer();

	UpdateCanvasSize();
}

function UpdateCanvasSize()
{
	const canvas = document.getElementById("canvas");
	const pixelRatio = window.devicePixelRatio || 1;

	canvas.width  = Math.floor(pixelRatio * window.innerWidth);
	canvas.height = Math.floor(pixelRatio * window.innerHeight);
	canvas.style.width  = window.innerWidth  + 'px';
	canvas.style.height = window.innerHeight + 'px';

	gl.viewport(0, 0, canvas.width, canvas.height);
	// Trabajamos en coordenadas de pantalla (píxeles), igual que el SVG:
	// origen arriba-izquierda, y hacia abajo.
	curveDrawer.setViewport(window.innerWidth, window.innerHeight);
}

// Redibuja la curva suave. El overlay SVG se refresca aparte en editor.js.
function DrawScene()
{
	gl.clear(gl.COLOR_BUFFER_BIT);
	curveDrawer.draw();
}

function InitShaderProgram( vsSource, fsSource )
{
	const vs = CompileShader( gl.VERTEX_SHADER,   vsSource );
	const fs = CompileShader( gl.FRAGMENT_SHADER, fsSource );
	const prog = gl.createProgram();
	gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
		alert('No se pudo inicializar el programa: ' + gl.getProgramInfoLog(prog));
		return null;
	}
	return prog;
}

function CompileShader( type, source )
{
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source); gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert('Error compilando el shader:\n' + gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

