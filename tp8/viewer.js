/**
 * Toda la visualización e interacción 3D. Archivo provisto; no es parte del TP.
 * Los triángulos se envían a Three.js en orden de face.id: un clic se traduce
 * directamente de intersection.faceIndex a una Face de la estructura half-edge.
 */
class MeshViewer {
    constructor(container, onSelect, onHover) {
        this.container = container;
        this.onSelect = onSelect;
        this.onHover = onHover;
        this.region = new Set();
        this.seedId = null;
        this.hoverId = null;
        this.animation = null;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.domElement.setAttribute('aria-label', 'Malla 3D. Clic para seleccionar una cara; arrastrar para girar; rueda para acercar.');
        this.renderer.domElement.setAttribute('role', 'img');
        container.prepend(this.renderer.domElement);

        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 0.85));
        const light = new THREE.DirectionalLight(0xffffff, 0.85);
        light.position.set(-3, 5, 7);
        this.scene.add(light);
        const fill = new THREE.DirectionalLight(0xffffff, 0.3);
        fill.position.set(4, -1, -3);
        this.scene.add(fill);

        this.root = new THREE.Group();
        this.scene.add(this.root);
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.minDistance = 2.5;
        this.controls.maxDistance = 12;
        this.controls.enablePan = false;
        this.controls.addEventListener('change', () => this.render());
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.colors = {
            base: new THREE.Color('#bcbcbc').convertSRGBToLinear(),
            region: new THREE.Color('#638be5').convertSRGBToLinear(),
            seed: new THREE.Color('#f2a34b').convertSRGBToLinear(),
            hover: new THREE.Color('#e5e5e5').convertSRGBToLinear()
        };
        this.bindPointerEvents();
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
        this.resize();
    }

    setMesh(mesh) {
        cancelAnimationFrame(this.animation);
        this.clearGroup(this.root);
        this.topology = mesh;
        this.region = new Set();
        this.seedId = null;
        this.hoverId = null;
        const positions = [], normals = [];
        for (const face of mesh.faces) {
            for (const vertex of face.getVertices()) {
                const p = vertex.position, n = face.normal;
                positions.push(p.x, p.y, p.z);
                normals.push(n.x, n.y, n.z);
            }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(positions.length), 3));
        this.surface = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
            vertexColors: true, roughness: 0.85, metalness: 0,
            side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
        }));
        this.root.add(this.surface);

        // Dibujamos TODAS las aristas topológicas, incluidas las coplanares.
        const edgePositions = [];
        for (const h of mesh.halfEdges) {
            if (!h.twin || h.id < h.twin.id) this.appendEdge(edgePositions, h);
        }
        this.wireframe = this.makeLines(edgePositions, '#303030', 0.75);
        this.root.add(this.wireframe);
        this.boundary = this.makeLines([], '#d01919', 1);
        this.boundary.renderOrder = 1; // El contorno queda por encima de la triangulación.
        this.root.add(this.boundary);

        geometry.computeBoundingBox();
        const center = geometry.boundingBox.getCenter(new THREE.Vector3());
        const size = geometry.boundingBox.getSize(new THREE.Vector3());
        const scale = 3 / Math.max(size.x, size.y, size.z);
        this.root.scale.setScalar(scale);
        this.root.position.copy(center).multiplyScalar(-scale);
        this.paint();
        this.resetCamera();
    }

    setRegion(faceIds, seedId, animate = true) {
        cancelAnimationFrame(this.animation);
        this.seedId = seedId;
        const ids = [...faceIds];
        this.region = new Set();
        this.updateBoundary();
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!animate || reducedMotion || ids.length < 3) {
            this.region = new Set(ids);
            this.updateBoundary();
            this.paint();
            return;
        }
        // Revelado visual del resultado. El algoritmo ya terminó; no hay aquí
        // una segunda implementación del crecimiento ni una selección de respaldo.
        const start = performance.now();
        let shown = 0;
        const reveal = now => {
            const count = Math.min(ids.length, Math.ceil(ids.length * (now - start) / 650));
            while (shown < count) this.region.add(ids[shown++]);
            this.paint();
            if (shown < ids.length) this.animation = requestAnimationFrame(reveal);
            else { this.updateBoundary(); this.render(); }
        };
        this.animation = requestAnimationFrame(reveal);
    }

    paint() {
        if (!this.surface) return;
        const attribute = this.surface.geometry.attributes.color;
        for (const face of this.topology.faces) {
            let color = this.region.has(face.id) ? this.colors.region : this.colors.base;
            if (face.id === this.hoverId) color = this.colors.hover;
            if (face.id === this.seedId) color = this.colors.seed;
            for (let corner = 0; corner < 3; corner++) {
                attribute.setXYZ(face.id * 3 + corner, color.r, color.g, color.b);
            }
        }
        attribute.needsUpdate = true;
        this.render();
    }

    updateBoundary() {
        if (!this.boundary) return;
        const positions = [];
        for (const id of this.region) {
            for (const h of this.topology.faces[id].getHalfEdges()) {
                if (!h.twin || !this.region.has(h.twin.face.id)) this.appendEdge(positions, h);
            }
        }
        this.boundary.geometry.dispose();
        this.boundary.geometry = new THREE.BufferGeometry();
        this.boundary.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    }

    setWireframe(visible) { this.wireframe.visible = visible; this.render(); }
    setBoundary(visible) { this.boundary.visible = visible; this.render(); }

    resetCamera() {
        this.camera.position.set(0.65, 0.35, 6.3);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        this.render();
    }

    resize() {
        const width = this.container.clientWidth, height = this.container.clientHeight;
        if (!width || !height) return;
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.render();
    }

    render() { this.renderer.render(this.scene, this.camera); }

    pick(clientX, clientY) {
        if (!this.surface) return null;
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hit = this.raycaster.intersectObject(this.surface, false)[0];
        return hit ? this.topology.faces[hit.faceIndex] : null;
    }

    bindPointerEvents() {
        const canvas = this.renderer.domElement;
        const pointers = new Set();
        let clickStart = null;
        canvas.addEventListener('pointerdown', event => {
            pointers.add(event.pointerId);
            if (pointers.size === 1 && event.button === 0) {
                clickStart = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
            } else clickStart = null;
            this.hoverId = null;
            this.onHover(null);
            this.paint();
            canvas.setPointerCapture(event.pointerId);
        });
        canvas.addEventListener('pointermove', event => {
            if (clickStart && Math.hypot(event.clientX - clickStart.x, event.clientY - clickStart.y) > 5) clickStart.moved = true;
            if (pointers.size > 0) return;
            const face = this.pick(event.clientX, event.clientY);
            if (this.hoverId !== (face ? face.id : null)) {
                this.hoverId = face ? face.id : null;
                this.onHover(face);
                this.paint();
            }
            canvas.style.cursor = face ? 'crosshair' : 'grab';
        });
        canvas.addEventListener('pointerup', event => {
            if (clickStart && clickStart.id === event.pointerId && !clickStart.moved &&
                Math.hypot(event.clientX - clickStart.x, event.clientY - clickStart.y) <= 5) {
                const face = this.pick(event.clientX, event.clientY);
                if (face) this.onSelect(face);
            }
            pointers.delete(event.pointerId);
            clickStart = null;
        });
        canvas.addEventListener('pointercancel', event => { pointers.delete(event.pointerId); clickStart = null; });
        canvas.addEventListener('lostpointercapture', event => { pointers.delete(event.pointerId); });
        canvas.addEventListener('pointerleave', () => {
            this.hoverId = null;
            this.onHover(null);
            this.paint();
        });
    }

    appendEdge(positions, h) {
        for (const v of [h.vertex, h.next.vertex]) positions.push(v.position.x, v.position.y, v.position.z);
    }

    makeLines(positions, color, opacity) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
        material.color.convertSRGBToLinear();
        return new THREE.LineSegments(geometry, material);
    }

    clearGroup(group) {
        for (const object of [...group.children]) {
            object.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            group.remove(object);
        }
    }
}
