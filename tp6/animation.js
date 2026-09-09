/********** Animación **********/

class Animation 
{
    constructor()
    {
        // Estados
        this.isPlaying = false;
        this.currentFrame = 0;
        this.totalFrames = 30;
        this.baseFrameRate = 30; // fps
        this.speedMultiplier = 1.0; // 1.0 = normal, 0.5 = slow, 2.0 = fast
        
        // Pelota
        this.ballRadius = 30;
        this.ballPosition = { x: 0, y: 0 };

        // Tiempos de animación
        this.lastTime = 0;
        this.frameInterval = 1000 / this.baseFrameRate; // millisegundos por frame
        this.animationId = null;
        
        this.animationCanvas = null;
        this.ctx = null;
        
        this.initializeCanvas();
        this.createControls();
        this.ensureFrameLine();
        
        this.updateBallPosition();
        this.updateOverlayFrameLine();
        this.draw();
    }
    
    initializeCanvas()
    {
        this.animationCanvas = document.createElement('canvas');
        this.animationCanvas.id = 'animation-canvas';
        this.animationCanvas.style.position = 'fixed';
        this.animationCanvas.style.top = '0';
        this.animationCanvas.style.left = '0';
        this.animationCanvas.style.width = '100%';
        this.animationCanvas.style.height = '50%';
        this.animationCanvas.style.pointerEvents = 'none';
        this.animationCanvas.style.zIndex = '5';
        
        document.body.appendChild(this.animationCanvas);
        this.ctx = this.animationCanvas.getContext('2d');
        
        this.updateCanvasSize();
    }
    
    createControls()
    {
        // Creamos un panel de control adentro del body
        const controlPanel = document.createElement('div');
        controlPanel.id = 'animation-controls';
        controlPanel.innerHTML = `
            <button id="play-button">Play</button>
            <div class="speed-control">
                <label for="speed-slider">Speed:</label>
                <input type="range" id="speed-slider" min="0.25" max="3" step="0.25" value="1">
                <span id="speed-value">1x</span>
            </div>
            <div class="speed-control">
                <label for="frame-slider">Frame:</label>
                <input type="range" id="frame-slider" min="0" max="30" step="1" value="0">
            </div>
            <div class="frame-info">
                <span>Frame: <span id="current-frame">0</span> / 30</span>
            </div>
        `;
        
        document.body.appendChild(controlPanel);
        
        document.getElementById('play-button').addEventListener('click', () => this.togglePlayback());
        document.getElementById('speed-slider').addEventListener('input', (e) => this.setSpeed(parseFloat(e.target.value)));
        document.getElementById('frame-slider').addEventListener('input', (e) => this.setFrame(parseInt(e.target.value, 10)));
    }

    ensureFrameLine()
    {
        // linea para el frame actual 
        const overlay = document.getElementById('overlay');
        if (!overlay) return;
        let line = document.getElementById('current-frame-line');
        if (!line) {
            line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('id', 'current-frame-line');
            line.style.stroke = '#007bff';
            line.style.strokeWidth = '2px';
            line.style.strokeDasharray = '4,4';
            line.style.pointerEvents = 'none';
            overlay.appendChild(line);
        } else {
            line.style.stroke = '#007bff';
            line.style.strokeWidth = '2px';
            line.style.strokeDasharray = '4,4';
            line.style.pointerEvents = 'none';
        }
        this.updateOverlayFrameLine();
    }

    updateOverlayFrameLine()
    {
        const overlay = document.getElementById('overlay');
        if (!overlay) return;
        const h = overlay.clientHeight || 0;
        const x = (typeof TimeToX === 'function') ? TimeToX(this.currentFrame) : 0;
        const line = document.getElementById('current-frame-line');
        if (line) {
            line.setAttribute('x1', x);
            line.setAttribute('x2', x);
            line.setAttribute('y1', 0);
            line.setAttribute('y2', h);
        }
    }
    
    updateCanvasSize()
    {
        const pixelRatio = window.devicePixelRatio || 1;
        if (this.ctx) this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.animationCanvas.width = Math.max(1, Math.floor(pixelRatio * this.animationCanvas.clientWidth));
        this.animationCanvas.height = Math.max(1, Math.floor(pixelRatio * this.animationCanvas.clientHeight));
        
        this.ctx.scale(pixelRatio, pixelRatio);
        
        this.updateBallPosition();
        this.draw();
    }
    
    setViewport(width, height)
    {
        this.updateCanvasSize();
        this.updateOverlayFrameLine();
    }
    
    togglePlayback()
    {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.play();
        }
    }
    
    play()
    {
        this.isPlaying = true;
        document.getElementById('play-button').textContent = 'Pause';
        this.lastTime = performance.now();
        this.animate();
    }
    
    stop()
    {
        this.isPlaying = false;
        document.getElementById('play-button').textContent = 'Play';
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    setSpeed(speed)
    {
        this.speedMultiplier = speed;
        document.getElementById('speed-value').textContent = speed + 'x';
    }
    
    setFrame(frame)
    {
        const clamped = Math.max(0, Math.min(this.totalFrames, isNaN(frame) ? 0 : frame));
        this.currentFrame = clamped;
        this.updateBallPosition();
        this.updateUI();
        this.updateOverlayFrameLine();
        this.draw();
    }
    
    animate()
    {
        if (!this.isPlaying) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        const adjustedFrameInterval = this.frameInterval / this.speedMultiplier;
        
        if (deltaTime >= adjustedFrameInterval) {
            this.currentFrame++;
            
            if (this.currentFrame > this.totalFrames) {
                this.currentFrame = 0; 
            }
            
            this.updateBallPosition();
            this.updateUI();
            this.draw();
            this.updateOverlayFrameLine();
            this.lastTime = currentTime;
        }
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    updateBallPosition()
    {
        const centerX = this.animationCanvas.clientWidth / 2;

        // Usamos valores precomputados de Y normalizado por frame desde el editor (tp6.js)
        const frameIndex = Math.max(0, Math.min(this.totalFrames, this.currentFrame));
        let normalizedY = 0;
        if (typeof window !== 'undefined' && typeof window.frameYNorm !== 'undefined') {
            const v = window.frameYNorm[frameIndex];
            if (typeof v === 'number' && isFinite(v)) normalizedY = Math.max(0, Math.min(1, v));
        }
        const y = normalizedY * this.animationCanvas.clientHeight;

        this.ballPosition = { x: centerX, y: y };
    }
    
    
    updateUI()
    {
        const cf = Math.max(0, Math.min(this.totalFrames, this.currentFrame));
        const lbl = document.getElementById('current-frame');
        if (lbl) lbl.textContent = cf;
        const slider = document.getElementById('frame-slider');
        if (slider) slider.value = String(cf);
    }
    
    draw()
    {
        if (!this.ballPosition || !this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.animationCanvas.clientWidth, this.animationCanvas.clientHeight);
        
        this.ctx.fillStyle = '#FF8000'; // Orange color
        this.ctx.strokeStyle = '#FF8000'; // Orange border
        this.ctx.lineWidth = 1;
        
        this.ctx.beginPath();
        this.ctx.arc(this.ballPosition.x, this.ballPosition.y, this.ballRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        
        // this.ctx.fillStyle = 'red'; // para debugear
        this.ctx.beginPath();
        this.ctx.arc(this.ballPosition.x, this.ballPosition.y, 2, 0, Math.PI * 2);
        this.ctx.fill();
    }
}
