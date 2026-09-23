/** Conecta los controles HTML, el ejercicio y el visor. Archivo ya resuelto. */
(() => {
    const $ = id => document.getElementById(id);
    let mesh, viewer, seed = null;
    const format = value => value.toLocaleString('es-AR');

    function showError(error) {
        $('error-message').textContent = error.message;
        $('error-message').hidden = false;
        console.error(error);
    }

    function selectFace(face) {
        seed = face;
        updateRegion(true);
    }

    function updateRegion(animate = false) {
        $('error-message').hidden = true;
        const angle = Number($('angle').value);
        $('angle-value').value = angle;
        try {
            // Único punto de conexión con el código que implementa el estudiante.
            const result = crecerRegion(seed, angle);
            if (!(result instanceof Set) || [...result].some(id => !Number.isInteger(id) || !mesh.faces[id])) {
                throw new Error('crecerRegion debe devolver un Set de IDs de caras válidos. Revisá ejercicio.js.');
            }
            viewer.setRegion(result, seed ? seed.id : null, animate);
            const count = result.size;
            $('selected-count').textContent = format(count);
            $('seed-label').textContent = seed ? `f${seed.id}` : '—';
            $('clear-selection').disabled = !seed;
            $('empty-hint').hidden = !!seed;
            $('selection-status').textContent = !seed ? 'Elegí una cara para empezar.' :
                count === 0 ? 'La función devolvió una región vacía. Revisá su implementación.' :
                count === mesh.faces.length ? 'La región alcanzó toda la malla. Probá bajar el ángulo.' :
                `${format(count)} caras conectadas desde la semilla f${seed.id}.`;
        } catch (error) {
            // Un error del ejercicio se muestra en la página, sin congelar el visor
            // ni conservar una región anterior que podría confundirse con la nueva.
            viewer.setRegion(new Set(), seed ? seed.id : null, false);
            $('selected-count').textContent = '—';
            $('seed-label').textContent = seed ? `f${seed.id}` : '—';
            $('clear-selection').disabled = !seed;
            $('empty-hint').hidden = !!seed;
            $('selection-status').textContent = 'Revisá el mensaje de error del ejercicio.';
            showError(error);
        }
    }

    function loadModel() {
        const model = MODELS[$('model').value];
        mesh = model.create();
        seed = null;
        viewer.setMesh(mesh);
        viewer.setWireframe($('show-edges').checked);
        viewer.setBoundary($('show-boundary').checked);
        const stats = mesh.getStats();
        $('mesh-stats').textContent = `${format(stats.vertices)} vértices · ${format(stats.edges)} aristas · ${format(stats.faces)} caras`;
        $('total-count').textContent = format(stats.faces);
        $('hover-label').textContent = '';
        updateRegion();
    }

    try {
        viewer = new MeshViewer($('viewport'), selectFace, face => {
            $('hover-label').textContent = face ? `Cara f${face.id}` : '';
        });
        $('model').addEventListener('change', loadModel);
        $('angle').addEventListener('input', () => updateRegion());
        $('angle-value').addEventListener('change', event => {
            if (event.target.value === '' || !event.target.checkValidity()) {
                event.target.value = $('angle').value;
                return;
            }
            $('angle').value = event.target.value;
            updateRegion();
        });
        $('clear-selection').addEventListener('click', () => {
            seed = null;
            updateRegion();
        });
        $('reset-camera').addEventListener('click', () => viewer.resetCamera());
        $('show-edges').addEventListener('change', event => viewer.setWireframe(event.target.checked));
        $('show-boundary').addEventListener('change', event => viewer.setBoundary(event.target.checked));
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') $('clear-selection').click();
        });
        loadModel();
    } catch (error) {
        showError(new Error(`No se pudo iniciar el visor 3D. ${error.message}`));
    }
})();
