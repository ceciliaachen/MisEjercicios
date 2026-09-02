// Código fuente de los shaders
const vertexShaderSource = `
	attribute vec3 pos;
	attribute vec4 clr;

	uniform mat4 trans;
	
	varying vec4 vcolor;

	void main()
	{
		gl_Position = trans * vec4(pos, 1);
		vcolor = clr;
	}
`;

const fragmentShaderSource = `
	precision mediump float;

	varying vec4 vcolor;

	void main()
	{
		gl_FragColor = vcolor;
	}
`;

window.onload = function()
{
	/******* 1.0 INICIALIZACIÓN DEL CANVAS *******/
	// Inicializamos el canvas y WebGL
	canvas = document.getElementById("mycanvas");
	gl     = canvas.getContext("webgl");

	// Seteamos la resolución del viewport y lo ajustamos a la del canvas
	const pixelRatio = window.devicePixelRatio || 1; 
	canvas.width  = canvas.clientWidth * pixelRatio;
	canvas.height = canvas.clientHeight * pixelRatio;
	gl.viewport(0, 0, canvas.width, canvas.height);


	// Inicializamos el color base (RGBA)
	gl.clearColor(1,1,1,1);
	

	/******* 2.0 INICIALIZACIÓN DE LA ESCENA *******/
	// Inicialización de los buffers para los objetos de mi escena.
	// Este contenido podríamos modificarnlo en cualquier momento
	// sin necesidad de volver a crear los buffers.

	// Posiciones de los vértices
	var positions = [
		 0.0,  0.8, 0,
		 0.8, -0.8, 0,
		-0.8, -0.8, 0];

	// Colores para cada vértice	
	var colors = [
		1, 0, 0, 1,
		0, 1, 0, 1,
		0, 0, 1, 1];
	
	// Creación y binding de los buffers:
	// Buffer para los vértices -> pedir memoria a la GPU y copiar los datos de posiciones
	var position_buffer = gl.createBuffer();
	gl.bindBuffer(
		gl.ARRAY_BUFFER, 
		position_buffer
	);
	gl.bufferData(
		gl.ARRAY_BUFFER, 
		new Float32Array(positions), 
		gl.STATIC_DRAW
	); // es un flag que me diga cuánto voy a modificar 


	// Buffer para los colores
	var color_buffer = gl.createBuffer();
	gl.bindBuffer(
		gl.ARRAY_BUFFER, 
		color_buffer
	);
	gl.bufferData(
		gl.ARRAY_BUFFER, 
		new Float32Array(colors), 
		gl.STATIC_DRAW
	); 

    /******* 3.0 COMPILAMOS LOS SHADERS *******/
 	// Compilación del vertex shader y del fragment shader.
	// En caso de que quisieramos cambiar el código de los shaders en algún
	// punto de mi aplicación, deberíamos volver a compilarlos. 
	// Una aplicación puede tener varios shader y vincular cada uno a 
	// diferentes objetos de la escena. 

	// Vertex shader
	const vs_source = vertexShaderSource;
	const vs = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vs, vs_source);
	gl.compileShader(vs);

	if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(vs));
		gl.deleteShader(vs);
	}

	// Fragment shader
	const fs_source = fragmentShaderSource;
	const fs = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fs, fs_source);
	gl.compileShader(fs);

	if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(fs));
		gl.deleteShader(fs);
	}

	// Creo mi "programa" con ambos shaders compilados
	prog = gl.createProgram();
	gl.attachShader(prog, vs);
	gl.attachShader(prog, fs);
	gl.linkProgram(prog);

	// Verifico que el programa se haya linkeado correctamente
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
		alert(gl.getProgramInfoLog(prog));
	}
	
    /******* 4.0 SETEAMOS LAS VARIABLES UNIFORMES  *******/
  	// Actualizamos las variables uniformes para los shaders. 
	// Antes de reenderizar la escena, es necesario setear las variables
	// uniformes. Estas variables las podemos actualizar todas las veces
	// que lo necesitemos. 
	var m = gl.getUniformLocation(prog, 'trans');

	var matrix = [
		1,0,0,0,
		0,1,0,0,
		0,0,1,0,
		0,0,0,1
	];

	gl.useProgram(prog);
	gl.uniformMatrix4fv(m, false, matrix);
	
    /******* 5.0 LINKEAMOS LOS BUFFERS DE LA ESCENA  *******/
	// Linkeamos los buffers que son necesarios para el rendering.
	// Antes de reenderizar, especificamos los buffers de vértices y 
	// de sus atributos. Es posible usar buffers diferentes para objetos
	// diferentes, cada uno con su propio set de atributos. 

	// Link atributo posición
	var p = gl.getAttribLocation(prog, 'pos');
	gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);
	gl.vertexAttribPointer(p, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(p);


	// Link atributo color
	var c = gl.getAttribLocation(prog, 'clr');
	gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
	gl.vertexAttribPointer(c, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(c);

    /******* 6.0 REENDERIZAMOS  *******/
	// Ahora que ya está todo seteado, renderizamos la escena. 
	// El primer paso es siempre limpiar la imagen. 
	// Cada vez que cambie la escena, tenemos que reenderizar nuevamente. 
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.useProgram(prog);
	gl.drawArrays(gl.TRIANGLES, 0, 3);
}