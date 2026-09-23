# TP 8 · Crecimiento de regiones

Computación Gráfica · UTDT · 2026 

En este práctico vas a recorrer una malla usando su estructura **half-edge**.
A partir de una cara semilla, vamos a construir una región de caras conectadas cuyo
cambio de orientación no supere un ángulo dado. La estructura y el visor ya
están implementados: solo tenés que completar el algoritmo de crecimiento.

## Uso

Abrí `index.html` en un navegador con WebGL. Funciona sin servidor ni internet.

- **Clic** sobre una cara: elegir la semilla. **Arrastrar**: girar. **Rueda o pellizco**: zoom.
- **Ángulo máximo**: ajustar el criterio de crecimiento desde la misma semilla.
- **Limpiar selección / Escape**: empezar de nuevo.

La semilla se muestra en naranja, la región en azul y su contorno en rojo.

## Consigna

Implementá **`crecerRegion(caraInicial, anguloMaximo)`** en [`ejercicio.js`](ejercicio.js).

- **Entrada:** una `Face` (o `null`) y un ángulo finito entre 0 y 180 **grados**.
- **Salida:** un `Set<number>` nuevo con los IDs de las caras de la región,
  incluida la semilla. Con semilla `null`, devolver un conjunto vacío.
- No modifiques la malla. 

Incluí todas las caras alcanzables cruzando aristas compartidas cuyo ángulo
entre normales sea menor o igual al umbral. **Compará cada cara con su vecina**,
no siempre con la semilla. La función `angleBetweenFaces(a, b)` ya devuelve
ese ángulo en grados.

Partí de `cara.halfEdge`, recorré su contorno con `h.next` y accedé a la vecina
mediante `h.twin.face`. Comprobá antes que `h.twin` no sea `null`: eso indica un
borde. Evitá procesar repetidamente las caras ya incorporadas. 


