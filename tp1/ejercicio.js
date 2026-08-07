// La imagen que tienen que modificar viene en el parámetro image y contiene inicialmente los datos originales
// es objeto del tipo ImageData ( más info acá https://mzl.la/3rETTC6  )
// Factor indica la cantidad de intensidades permitidas (sin contar el 0)
function dither(image, factor, algorithm)
{
    console.log(image);
    var y;
    for (y=0; y<image.height-1; y++)
    {
        var x; 
        for (y = 0; y < height; y++)
        {
            var x;
            for (x = 0; x < width; x++)
            {
                // Pixel RGBA
                var oldColorIndices = indexar(x, y, width);
    
                // Guardamos el valor original de cada canal (R,G,B) ANTES de cuantizar
                var oldpixel = [
                    data[oldColorIndices[0]],
                    data[oldColorIndices[1]],
                    data[oldColorIndices[2]],
                ];
    
                var newcolor = colorMasCercano(oldColorIndices, data, factor);
    
                // Escribimos el nuevo color cuantizado en la imagen
                data[oldColorIndices[0]] = newcolor[0];
                data[oldColorIndices[1]] = newcolor[1];
                data[oldColorIndices[2]] = newcolor[2];
    
                // Calculamos el error de cuantización por canal (oldpixel - newpixel)
                var error = [
                    oldpixel[0] - newcolor[0],
                    oldpixel[1] - newcolor[1],
                    oldpixel[2] - newcolor[2]
                ];
    
                // Distribuimos el error a los vecinos según el algoritmo elegido
                // (los values deben coincidir con las <option> del <select> en el HTML)
                if (algorithm == "floyd-steinberg")
                {
                    difundirError(data, width, height, x, y,  1, 0, error, 7 / 16);
                    difundirError(data, width, height, x, y, -1, 1, error, 3 / 16);
                    difundirError(data, width, height, x, y,  0, 1, error, 5 / 16);
                    difundirError(data, width, height, x, y,  1, 1, error, 1 / 16);
                }
                else if (algorithm == "jarvis-judice")
                {
                    difundirError(data, width, height, x,     y,     1, 0, error, 7 / 48);
                    difundirError(data, width, height, x,     y,     2, 0, error, 5 / 48);
                    difundirError(data, width, height, x,     y,    -2, 1, error, 3 / 48);
                    difundirError(data, width, height, x,     y,    -1, 1, error, 5 / 48);
                    difundirError(data, width, height, x,     y,     0, 1, error, 7 / 48);
                    difundirError(data, width, height, x,     y,     1, 1, error, 5 / 48);
                    difundirError(data, width, height, x,     y,     2, 1, error, 3 / 48);
    
                    difundirError(data, width, height, x,     y,    -2, 2, error, 1 / 48);
                    difundirError(data, width, height, x,     y,    -1, 2, error, 3 / 48);
                    difundirError(data, width, height, x,     y,     0, 2, error, 5 / 48);
                    difundirError(data, width, height, x,     y,     1, 2, error, 3 / 48);
                    difundirError(data, width, height, x,     y,     2, 2, error, 1 / 48);
                }
            }
        }
    }
}

function colorMasCercano(oldColorIndices, data, factor)
{
    var newcolor = [];
    var c;
    for (c = 0; c < 3; c++) // solo R, G, B
    {
        newcolor[c] = cuantizarCanal(data[oldColorIndices[c]], factor);
    }
    newcolor[3] = data[oldColorIndices[3]]; // alpha sin tocar
    return newcolor;
}

function clamp(value, min, max)
{
    return Math.max(min, Math.min(max, value));
}

function difundirError(data, width, height, x, y, dx, dy, quantError, weight)
{
    var nx = x + dx;
    var ny = y + dy;
 
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) return;
 
    var neighborIndices = indexar(nx, ny, width);
    var c;
    for (c = 0; c < 3; c++) // solo R, G, B
    {
        var idx = neighborIndices[c];
        data[idx] = clamp(data[idx] + quantError[c] * weight, 0, 255);
    }
}

function cuantizarCanal(value, factor)
{
    var step  = 255 / factor;
    var level = Math.round(value / step);
    return Math.round(level * step);
}

// Imágenes a restar (imageA y imageB) y el retorno en result
function substraction(imageA,imageB,result) 
{
    var i;
    for (i = 0; i < imageA.data.length; i += 4)
    {
        result.data[i]     = Math.abs(imageA.data[i]     - imageB.data[i]);     // R
        result.data[i + 1] = Math.abs(imageA.data[i + 1] - imageB.data[i + 1]); // G
        result.data[i + 2] = Math.abs(imageA.data[i + 2] - imageB.data[i + 2]); // B
        result.data[i + 3] = 255; // alpha opaco para poder visualizar el resultado
    }
}

function indexar(x, y, width)
{
    var red = y * (width * 4) + x * 4;
    return [red, red + 1, red + 2, red + 3];
}
