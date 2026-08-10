// La imagen que tienen que modificar viene en el parámetro image y contiene inicialmente los datos originales
// es objeto del tipo ImageData ( más info acá https://mzl.la/3rETTC6  )
// Factor indica la cantidad de intensidades permitidas (sin contar el 0)
function dither(image, factor, algorithm)
{
    console.log(image);

    var y;
    for (y = 0; y < image.height; y++)
    {
        var x;
        for (x = 0; x < image.width; x++)
        {
            // Pixel RGBA
            var oldcolor = indexar(x, y, image.width, image);
            var newcolor = colorMasCercano(oldcolor, factor);

            // Actualizamos el pixel con el nuevo color
            var index = (y * image.width + x) * 4;
            for (var i = 0; i < 3; i++)
            {
                image.data[index + i] = newcolor[i];
            }
            image.data[index + 3] = oldcolor[3]; // Mantiene el canal alpha igual

            // Calculamos el error
            var error = [];
            for (var i = 0; i < 3; i++)
            {
                error[i] = oldcolor[i] - newcolor[i];
            }
            
            // Distribuimos el error según el algoritmo de dithering seleccionado
            var right = index + 4;
            var right2 = index + 8;
            var bottom = index + image.width * 4;
            var bottomLeft = bottom - 4;
            var bottomRight = bottom + 4;
            var bottom2 = index + image.width * 8;
            var bottomLeft2 = bottom2 - 4;
            var bottomRight2 = bottom2 + 4;
            
            if (algorithm === "floyd-steinberg")
            {   
                for (var i = 0; i < 3; i++)
                { 
                    image.data[right + i] += error[i] * 7/16;
                    image.data[bottom + i] += error[i] * 5/16;
                    image.data[bottomLeft + i] += error[i] * 3/16;
                    image.data[bottomRight + i] += error[i] * 1/16;
                }
            }
            else if (algorithm === "jarvis-judice")
            {
                for (var i = 0; i < 3; i++)
                { 
                    image.data[right + i] += error[i] * 7/48;
                    image.data[right2 + i] += error[i] * 5/48; // pixel a la derecha de right

                    image.data[bottom + i] += error[i] * 7/48;
                    image.data[bottomLeft + i] += error[i] * 5/48;
                    image.data[bottomRight + i] += error[i] * 5/48;
                    image.data[bottomLeft - 4 + i] += error[i] * 3/48; // pixel a la izquierda de bottomLeft
                    image.data[bottomRight + 4 + i] += error[i] * 3/48; // pixel a la derecha de bottomRight

                    image.data[bottom2 + i] += error[i] * 5/48; // pixel debajo de bottom
                    image.data[bottomLeft2 + i] += error[i] * 3/48; 
                    image.data[bottomRight2 + i] += error[i] * 3/48;
                    image.data[bottomLeft2 - 4 + i] += error[i] * 1/48; 
                    image.data[bottomRight2 + 4 + i] += error[i] * 1/48; 
                }
            }
        }
    }
}
 
// Imágenes a restar (imageA y imageB) y el retorno en result
function substraction(imageA, imageB, result)
{
    for (var i = 0; i < imageA.data.length; i += 4)
    {
        result.data[i] = Math.abs(imageA.data[i] - imageB.data[i]);         // R
        result.data[i + 1] = Math.abs(imageA.data[i + 1] - imageB.data[i + 1]); // G
        result.data[i + 2] = Math.abs(imageA.data[i + 2] - imageB.data[i + 2]); // B
        result.data[i + 3] = 255; // A 
    }
    return result;
}

function colorMasCercano(oldcolor, factor)
{
    var newcolor = [];
    for (var i = 0; i < 3; i++)
    {
        var step = Math.round(255 / factor);
        newcolor[i] = Math.round(oldcolor[i] / step) * step;
    }
    newcolor[3] = oldcolor[3]; // Mantener el canal alpha igual
    return newcolor;
}
 
function indexar(x, y, width,image)
{
    var index = (y * width + x) * 4;
    return [
        image.data[index],     // R
        image.data[index + 1], // G
        image.data[index + 2], // B
        image.data[index + 3]  // A
    ];
}
