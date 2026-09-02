// Código fuente de los shaders
const vertexShaderSource = `
	atribute vec3 pos;
	atribute vec4 clr;

	uniform mat4 trans;
	
	varying vec4 vcolor;

	void main()
	{
		gl_Positions = trans * vec4(pos, 1.0);
		vcolor = clr;
	}
`;

const fragmentShaderSource = `
	precision mediump float;

	varyiing vec4 vcolor;

	void main()
	{
		gl_FragColor = vcolor;
	}
`;
	void main()
	{
		// TODO <-----------
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
	// TODO <-----------

	// Fragment shader
	const fs_source = fragmentShaderSource;
	// TODO <-----------

	
	// Creo mi "programa" con ambos shaders compilados
	// TODO <-----------
	
	
    /******* 4.0 SETEAMOS LAS VARIABLES UNIFORMES  *******/
  	// Actualizamos las variables uniformes para los shaders. 
	// Antes de reenderizar la escena, es necesario setear las variables
	// uniformes. Estas variables las podemos actualizar todas las veces
	// que lo necesitemos. 
	// TODO <-----------

	
    /******* 5.0 LINKEAMOS LOS BUFFERS DE LA ESCENA  *******/
	// Linkeamos los buffers que son necesarios para el rendering.
	// Antes de reenderizar, especificamos los buffers de vértices y 
	// de sus atributos. Es posible usar buffers diferentes para objetos
	// diferentes, cada uno con su propio set de atributos. 

	// Link atributo posición
	// TODO <-----------


	// Link atributo color
	// TODO <-----------


    /******* 6.0 REENDERIZAMOS  *******/
	// Ahora que ya está todo seteado, renderizamos la escena. 
	// El primer paso es siempre limpiar la imagen. 
	// Cada vez que cambie la escena, tenemos que reenderizar nuevamente. 
	// TODO <-----------


}