// Código fuente de los shaders
const vertexShaderSource = `
	// TODO <-----------
	void main()
	{
		// TODO <-----------
	}
`;

const fragmentShaderSource = `
	// TODO <-----------
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
	// TODO <-----------


	// Inicializamos el color base (RGBA)
	// TODO <-----------
	

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
	// Buffer para los vértices
	// TODO <-----------


	// Buffer para los colores
	// TODO <-----------

	
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