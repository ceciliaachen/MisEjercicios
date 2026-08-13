// Esta función construye una matriz de transfromación de 3x3 en coordenadas homogéneas 
// utilizando los parámetros de posición, rotación y escala. La estructura de datos a 
// devolver es un arreglo 1D con 9 valores en orden "column-major". Es decir, para un 
// arreglo A[] de 0 a 8, cada posición corresponderá a la siguiente matriz:
//
// | A[0] A[3] A[6] |
// | A[1] A[4] A[7] |
// | A[2] A[5] A[8] |
// 
// Se deberá aplicar primero la escala, luego la rotación y finalmente la traslación. 
// Las rotaciones vienen expresadas en grados. 
function BuildTransform(positionX, positionY, rotation, scale )
{
	// Matriz de escalado
	var scale_mat = new Array(
		scale, 0, 0,
		0, scale, 0,
		0, 0, 1
	);
	
	// Matriz de rotación
	var tita = rotation * (Math.PI / 180.0); 	// Calculamos tita
	var rotation_mat = new Array( 
		Math.cos(tita), Math.sin(tita), 0,
		-(Math.sin(tita)), Math.cos(tita), 0,
		0, 0, 1	
	);

	// Matriz de traslación
	var translation_mat = new Array(
		1, 0, 0,
		0, 1, 0,
		positionX, positionY, 1
	);

	var trans1 = ComposeTransforms(scale_mat, rotation_mat);
	var trans2 = ComposeTransforms(trans1, translation_mat);

	return trans2;
}

// Esta función retorna una matriz que resula de la composición de trasn1 y trans2. Ambas 
// matrices vienen como un arreglo 1D expresado en orden "column-major", y se deberá 
// retornar también una matriz en orden "column-major". La composición debe aplicar 
// primero trans1 y luego trans2. 
function ComposeTransforms( trans1, trans2 )
{
	var res = new Array(0, 0, 0, 0, 0, 0, 0, 0, 0);
	res[0] = trans2[0]*trans1[0] + trans2[3]*trans1[1] + trans2[6]*trans1[2];
	res[1] = trans2[1]*trans1[0] + trans2[4]*trans1[1] + trans2[7]*trans1[2];
	res[2] = trans2[2]*trans1[0] + trans2[5]*trans1[1] + trans2[8]*trans1[2];
	res[3] = trans2[0]*trans1[3] + trans2[3]*trans1[4] + trans2[6]*trans1[5];
	res[4] = trans2[1]*trans1[3] + trans2[4]*trans1[4] + trans2[7]*trans1[5];
	res[5] = trans2[2]*trans1[3] + trans2[5]*trans1[4] + trans2[8]*trans1[5];
	res[6] = trans2[0]*trans1[6] + trans2[3]*trans1[7] + trans2[6]*trans1[8];
	res[7] = trans2[1]*trans1[6] + trans2[4]*trans1[7] + trans2[7]*trans1[8];
	res[8] = trans2[2]*trans1[6] + trans2[5]*trans1[7] + trans2[8]*trans1[8];
	return res;
}



