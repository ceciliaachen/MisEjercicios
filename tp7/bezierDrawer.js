
// Clase de referencia para dibujar curvas de Bezier cubicas (tp5)

class BezierDrawer 
{

	// Inicialización de los shaders y buffers
	constructor()
	{
		// Creamos el programa webgl con los shaders para los segmentos de recta
		this.prog   = InitShaderProgram( curvesVS, curvesFS );
		
		// Obtenemos la ubicación de las varibles uniformes en los shaders,
		// en este caso, la matriz de transformación 'mvp'
		this.mvp = gl.getUniformLocation( this.prog, 'mvp' );
		
		// y las coordenadas de los puntos de control p
		this.p    = []
		this.p[0] = gl.getUniformLocation( this.prog, 'p0' );
		this.p[1] = gl.getUniformLocation( this.prog, 'p1' );
		this.p[2] = gl.getUniformLocation( this.prog, 'p2' );
		this.p[3] = gl.getUniformLocation( this.prog, 'p3' );

		// Obtenemos la ubicación de los atributos de los vértices
		// en este caso, el valor de t
		this.tparam = gl.getAttribLocation( this.prog, 't' );

		// Initialize the attribute buffer
		this.steps = 100;
		var tv = [];
		for ( var i=0; i<this.steps; ++i ) {
			tv.push( i / (this.steps-1) );
		}
		

		// Creamos el buffer para t.
		this.buffer = gl.createBuffer();

		// Enviamos al buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tv), gl.STATIC_DRAW);
	}


	setViewport( width, height )
	{
		var trans = [ 2/width,0,0,0,  0,-2/height,0,0, 0,0,1,0, -1,1,0,1 ];
		//var trans = [ 2/5000,0,0,0,  0,-2/5000,0,0, 0,0,1,0, -1,1,0,1 ];

		// Seteamos la matriz en la variable unforme del shader
		gl.useProgram( this.prog );
		gl.uniformMatrix4fv( this.mvp, false, trans );
	}

	updatePoints( pt )
	{
	
		for ( var i=0; i<4; ++i ) 
		{
			var x = pt[i].getAttribute("cx");
			var y = pt[i].getAttribute("cy");

			gl.useProgram( this.prog );
	    	gl.uniform2fv( this.p[i], [x, y] );
		}
	}

	draw()
	{

		// Seleccionamos el shader
		gl.useProgram( this.prog );

		// Binding del buffer de posiciones
		gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer );

		// Habilitamos el atributo 
		gl.vertexAttribPointer( this.tparam, 1, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.tparam );

		// Dibujamos lineas utilizando primitivas gl.LINE_STRIP 
		// https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawArrays
		gl.drawArrays( gl.LINE_STRIP, 0, this.steps );
	}
}

// Vertex Shader
// Si declaras las variables pero no las usas es como que no las declaraste y va a tirar error. Siempre va punto y coma al finalizar la sentencia. 
// Las constantes en punto flotante necesitan ser expresadas como x.y, incluso si son enteros: ejemplo, para 4 escribimos 4.0
var curvesVS = `
	attribute float t;
	uniform mat4 mvp;
	uniform vec2 p0;
	uniform vec2 p1;
	uniform vec2 p2;
	uniform vec2 p3;
	void main()
	{ 
		float oneminus = 1.0-t;

		vec2 term0 = pow(oneminus, 3.0) * p0;
		vec2 term1 = 3.0 * t * pow(oneminus,2.0)  * p1;
		vec2 term2 = 3.0 * pow(t,2.0) * (oneminus) * p2;
		vec2 term3 = pow(t,3.0) * p3;
		vec2 full  = term0 + term1 + term2 + term3;

		//vec2 full  = p0 + (p3 - p0) * t;			
		gl_Position = mvp * vec4(full,0,1);
	}
`;

// Fragment Shader
var curvesFS = `
	precision mediump float;
	void main()
	{
		gl_FragColor = vec4(0,0,1,1);
	}
`;