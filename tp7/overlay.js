// ********** UI (SVG inferior), puntos de control y eventos **********

// Puntos de control y estado de interacción
var pt = [];
var selPt = null;
var nextPointId = 0;
var isDraggingPoint = false;
var didDrag = false;
var dragStart = { x: 0, y: 0 };

// Timeline (X) y posiciones normalizadas (Y)
var ptTime = [];
var ptYNorm = [];

// Muestras del path de la curva para interacción y tabla Y por frame
var curvePathSamples = [];
var frameYNorm = new Array(31).fill(0);

// ------------------------ Utils ------------------------

function Overlay() { return document.getElementById("overlay"); }

function RelCoords(ev)
{
    var ov = Overlay();
    var r = ov.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top, h: ov.clientHeight };
}

function XBounds()
{
    var overlay = Overlay();
    var w = overlay ? overlay.clientWidth : document.documentElement.clientWidth;
    return [0.1*w, 0.8*w];
}

function TimeToX(t)
{
    var bounds = XBounds();
    var L = bounds[0], R = bounds[1];
    return L + (t/30.0) * (R - L);
}

function ClampInt01_30(v)
{
    var r = Math.round(v);
    if (r < 1) r = 1;
    if (r > 30) r = 30;
    return r;
}

function FindNearestFreeTimeInt(desired)
{
    var used = {};
    for (var i = 0; i < ptTime.length; i++) used[ptTime[i]] = true;
    var best = null;
    for (var d = 0; d <= 29; d++) {
        var a = desired - d; if (a >= 1 && a <= 29 && !used[a]) { best = a; break; }
        var b = desired + d; if (b >= 1 && b <= 29 && !used[b]) { best = b; break; }
    }
    return best;
}

function RefreshAfterPointsChange(rebuildGrid)
{
    if (rebuildGrid) { CreateGrid(); CreateFrameLabels(); }
    EnforceXPositions();
    EnforceYPositions();
    UpdateLines();
    UpdateCurvePath();
    PrecomputeFrameY();
    UpdatePoints();
    DrawScene();
}

// ------------------------ Path de curva y muestreo ------------------------

function PrecomputeFrameY()
{
    if (!pt || pt.length < 2) { for (var i = 0; i <= 30; i++) frameYNorm[i] = 0; return; }

    if (currentDrawingMode === "curve" && pt.length >= 2) {
        var n = ptYNorm.length;
        for (var f = 0; f <= 30; f++) {
            var j = 0;
            for (var i = 0; i < ptTime.length - 1; i++) { if (f >= ptTime[i] && f <= ptTime[i+1]) { j = i; break; } j = i; }
            var j0 = Math.max(0, j-1), j1 = j, j2 = Math.min(n-1, j+1), j3 = Math.min(n-1, j+2);
            var t1 = ptTime[j1], t2 = ptTime[Math.min(j1+1, ptTime.length-1)];
            var denom = (t2 - t1);
            var s = denom !== 0 ? (f - t1) / denom : 0.0; if (s < 0) s = 0; if (s > 1) s = 1;
            var P0 = ptYNorm[j0], P1 = ptYNorm[j1], P2 = ptYNorm[j2], P3 = ptYNorm[j3];
            var s2 = s*s, s3 = s2*s;
            frameYNorm[f] = 0.5 * ((2*P1) + (-P0 + P2)*s + (2*P0 - 5*P1 + 4*P2 - P3)*s2 + (-P0 + 3*P1 - 3*P2 + P3)*s3);
            if (frameYNorm[f] < 0) frameYNorm[f] = 0; if (frameYNorm[f] > 1) frameYNorm[f] = 1;
        }
    } else {
        for (var f = 0; f <= 30; f++) {
            var j = 0;
            for (var i = 0; i < ptTime.length - 1; i++) { if (f >= ptTime[i] && f <= ptTime[i+1]) { j = i; break; } j = i; }
            var t1 = ptTime[j], t2 = ptTime[Math.min(j+1, ptTime.length-1)];
            var y1 = ptYNorm[j], y2 = ptYNorm[Math.min(j+1, ptYNorm.length-1)];
            var denom = (t2 - t1);
            var lt = denom !== 0 ? (f - t1) / denom : 0.0; if (lt < 0) lt = 0; if (lt > 1) lt = 1;
            frameYNorm[f] = y1 + lt * (y2 - y1);
        }
    }
}

function UpdateCurvePath()
{
    var pathEl = document.getElementById("curve"); if (!pathEl) return;
    if (currentDrawingMode !== "curve" || pt.length < 2) { pathEl.setAttribute("d", ""); curvePathSamples = []; return; }

    var points = [];
    for (var i = 0; i < pt.length; i++) points.push({ x: parseFloat(pt[i].getAttribute("cx")), y: parseFloat(pt[i].getAttribute("cy")) });
    if (points.length >= 2) points = [points[0]].concat(points).concat([points[points.length - 1]]);
    if (points.length < 4) { pathEl.setAttribute("d", ""); curvePathSamples = []; return; }

    function knot(ti, pi, pj) { var dx = pj.x - pi.x, dy = pj.y - pi.y; var d = Math.sqrt(dx*dx + dy*dy); var eps = 1e-4; return ti + Math.max(Math.sqrt(d), eps); }

    var steps = 40, dstr = ""; curvePathSamples = [];
    for (var s = 0; s < points.length - 3; s++) {
        var p0 = points[s], p1 = points[s+1], p2 = points[s+2], p3 = points[s+3];
        var t0 = 0.0, t1 = knot(t0, p0, p1), t2 = knot(t1, p1, p2), t3 = knot(t2, p2, p3);
        for (var k = 0; k < steps; k++) {
            var u = k / (steps - 1), t = t1 + u * (t2 - t1);
            var A1x = (t1 - t)/(t1 - t0) * p0.x + (t - t0)/(t1 - t0) * p1.x;
            var A1y = (t1 - t)/(t1 - t0) * p0.y + (t - t0)/(t1 - t0) * p1.y;
            var A2x = (t2 - t)/(t2 - t1) * p1.x + (t - t1)/(t2 - t1) * p2.x;
            var A2y = (t2 - t)/(t2 - t1) * p1.y + (t - t1)/(t2 - t1) * p2.y;
            var A3x = (t3 - t)/(t3 - t2) * p2.x + (t - t2)/(t3 - t2) * p3.x;
            var A3y = (t3 - t)/(t3 - t2) * p2.y + (t - t2)/(t3 - t2) * p3.y;
            var B1x = (t2 - t)/(t2 - t0) * A1x + (t - t0)/(t2 - t0) * A2x;
            var B1y = (t2 - t)/(t2 - t0) * A1y + (t - t0)/(t2 - t0) * A2y;
            var B2x = (t3 - t)/(t3 - t1) * A2x + (t - t1)/(t3 - t1) * A3x;
            var B2y = (t3 - t)/(t3 - t1) * A2y + (t - t1)/(t3 - t1) * A3y;
            var Cx  = (t2 - t)/(t2 - t1) * B1x + (t - t1)/(t2 - t1) * B2x;
            var Cy  = (t2 - t)/(t2 - t1) * B1y + (t - t1)/(t2 - t1) * B2y;
            if (s === 0 && k === 0) dstr += "M" + Cx + "," + Cy; else dstr += " L" + Cx + "," + Cy;
            curvePathSamples.push({x: Cx, y: Cy});
        }
    }
    // Puedo cambiar aquí el estilo de la curva para poder debuggear
    pathEl.setAttribute("d", dstr);
    pathEl.style.pointerEvents = 'all';
    pathEl.style.stroke = 'transparent';       // puedo cambiar a 'blue' para debugear
    pathEl.style.strokeWidth = '8px';
    pathEl.style.strokeLinecap = 'round';
    pathEl.style.strokeLinejoin = 'round';
    pathEl.style.fill = 'none';
    pathEl.style.cursor = 'pointer';
}
// función para evaluar Y en la curva dada una X relativa (en pixeles)
function EvaluateYAtX(xRel) {
    var overlay = Overlay();
    var h = overlay ? overlay.clientHeight : 400;
    
    var bounds = XBounds();
    var L = bounds[0], R = bounds[1];
    if (xRel < L) xRel = L;
    if (xRel > R) xRel = R;
    
    // Convierto xRel a tiempo (0 a 30)
    var timeFloat = 30.0 * (xRel - L) / (R - L);
    
    if (currentDrawingMode === "curve") {
        return getInterpolatedFrameY(timeFloat) * h;
    } else {
        return getLinearInterpolatedY(timeFloat) * h;
    }
}

function getInterpolatedFrameY(timeFloat) {
    // Busco los frames entre los cuales está timeFloat
    var frameBelow = Math.floor(timeFloat);
    var frameAbove = Math.ceil(timeFloat);
    
    // Clamp entre 0 y 30
    if (frameBelow < 0) frameBelow = 0;
    if (frameAbove > 30) frameAbove = 30;
    
    if (frameBelow === frameAbove) {
        return frameYNorm[frameBelow];
    }
    
    // Interpolación lineal entre frameBelow y frameAbove
    var t = timeFloat - frameBelow;
    var yBelow = frameYNorm[frameBelow];
    var yAbove = frameYNorm[frameAbove];
    
    return yBelow + t * (yAbove - yBelow);
}

function getLinearInterpolatedY(timeFloat) {
    var segmentIndex = 0;
    for (var i = 0; i < ptTime.length - 1; i++) {
        if (timeFloat >= ptTime[i] && timeFloat <= ptTime[i + 1]) {
            segmentIndex = i;
            break;
        }
        segmentIndex = i;
    }
    
    var t1 = ptTime[segmentIndex];
    var t2 = ptTime[Math.min(segmentIndex + 1, ptTime.length - 1)];
    var y1 = ptYNorm[segmentIndex];
    var y2 = ptYNorm[Math.min(segmentIndex + 1, ptYNorm.length - 1)];
    
    var timeDiff = t2 - t1;
    if (timeDiff === 0) return y1; 
    
    var t = (timeFloat - t1) / timeDiff;
    t = Math.max(0, Math.min(1, t)); 
    
    return y1 + t * (y2 - y1);
}

// ------------------------ Creación/actualización de SVG ------------------------

function CreateControlPoint(time, yNorm)
{
    var overlay = Overlay();
    var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("id", "p" + nextPointId);
    circle.setAttribute("r", "5");
    nextPointId++;
    overlay.appendChild(circle);
    return circle;
}

function AddSimpleControlPoint(time, yNorm)
{
    var insertIndex = ptTime.length;
    for (var i = 0; i < ptTime.length; i++) { if (time < ptTime[i]) { insertIndex = i; break; } }

    var minT = (insertIndex === 0) ? 1 : (ptTime[insertIndex - 1] + 1);
    var maxT = (insertIndex >= ptTime.length) ? 29 : (ptTime[insertIndex] - 1);
    if (minT > maxT) { var freeT = FindNearestFreeTimeInt(time); if (freeT !== null && typeof freeT !== 'undefined') time = freeT; }
    else { if (time < minT) time = minT; if (time > maxT) time = maxT; }

    var overlay = Overlay(); var h = overlay ? overlay.clientHeight : 400; var r = 5;
    var minN = h > 0 ? (r / h) : 0, maxN = h > 0 ? (1 - r / h) : 1;
    if (yNorm < minN) yNorm = minN; if (yNorm > maxN) yNorm = maxN;

    var newPoint = CreateControlPoint(time, yNorm);
    pt.splice(insertIndex, 0, newPoint);
    ptTime.splice(insertIndex, 0, time);
    ptYNorm.splice(insertIndex, 0, yNorm);

    newPoint.setAttribute("cx", TimeToX(time));
    newPoint.setAttribute("cy", yNorm * h);

    return insertIndex;
}

function RemoveControlPoint(index)
{
    if (pt.length <= 2) return false;
    var overlay = Overlay(); overlay.removeChild(pt[index]);
    pt.splice(index, 1); ptTime.splice(index, 1); ptYNorm.splice(index, 1);
    return true;
}

function CheckCollisions()
{
    var collisionThreshold = 20;
    for (var i = 0; i < pt.length - 1; i++) {
        for (var j = i + 1; j < pt.length; j++) {
            var x1 = parseFloat(pt[i].getAttribute("cx")), y1 = parseFloat(pt[i].getAttribute("cy"));
            var x2 = parseFloat(pt[j].getAttribute("cx")), y2 = parseFloat(pt[j].getAttribute("cy"));
            var distance = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
            if (distance < collisionThreshold) {
                var avgTime = (ptTime[i] + ptTime[j]) / 2, avgYNorm = (ptYNorm[i] + ptYNorm[j]) / 2;
                ptTime[i] = Math.round(avgTime);
                var overlay = Overlay(), h = overlay ? overlay.clientHeight : 400, r = 5;
                var minN = h > 0 ? (r / h) : 0, maxN = h > 0 ? (1 - r / h) : 1;
                if (avgYNorm < minN) avgYNorm = minN; if (avgYNorm > maxN) avgYNorm = maxN;
                ptYNorm[i] = avgYNorm;
                RemoveControlPoint(j);
                return true;
            }
        }
    }
    return false;
}

function InitTimesFromCurrentX()
{
    var bounds = XBounds(), L = bounds[0], R = bounds[1];
    if (pt.length > 0) { ptTime[0] = 0; if (pt.length > 1) ptTime[pt.length - 1] = 30; }
    for (var i = 1; i < pt.length - 1; ++i) { var x = parseFloat(pt[i].getAttribute("cx")); var t = 30.0 * (x - L) / (R - L); ptTime[i] = ClampInt01_30(t); }
    for (var i = 1; i < pt.length - 1; ++i) { var minT = ptTime[i-1] + 1; if (ptTime[i] < minT) ptTime[i] = minT; if (ptTime[i] > 29) ptTime[i] = 29; }
    for (var i = pt.length - 2; i >= 1; --i) { var maxT = ptTime[i+1] - 1; if (ptTime[i] > maxT) ptTime[i] = maxT; if (ptTime[i] < 1) ptTime[i] = 1; }
    EnforceXPositions();
}

function EnforceXPositions() { for (var i = 0; i < pt.length; ++i) pt[i].setAttribute("cx", TimeToX(ptTime[i])); }

function InitYNormFromCurrent()
{
    var overlay = Overlay(); var h = overlay ? overlay.clientHeight : document.documentElement.clientHeight/2;
    for (var i = 0; i < pt.length; ++i) { var y = parseFloat(pt[i].getAttribute("cy")); ptYNorm[i] = (h > 0) ? (y / h) : ptYNorm[i]; }
}

function EnforceYPositions()
{
    var overlay = Overlay(); var h = overlay ? overlay.clientHeight : document.documentElement.clientHeight/2; var r = 5;
    for (var i = 0; i < pt.length; ++i) { var y = ptYNorm[i] * h; if (y < r) y = r; if (y > h - r) y = h - r; pt[i].setAttribute("cy", y); ptYNorm[i] = (h > 0) ? (y / h) : ptYNorm[i]; }
}

function CreateGrid()
{
    var gridGroup = document.getElementById("grid-lines");
    var overlay = Overlay(); var w = overlay ? overlay.clientWidth : 800; var h = overlay ? overlay.clientHeight : 400;
    gridGroup.innerHTML = "";
    var bounds = XBounds(), L = bounds[0], R = bounds[1];
    for (var frame = 1; frame <= 30; frame++) {
        var x = TimeToX(frame); var ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
        ln.setAttribute("x1", x); ln.setAttribute("y1", 0); ln.setAttribute("x2", x); ln.setAttribute("y2", h); ln.setAttribute("class", "grid-line"); gridGroup.appendChild(ln);
    }
    for (var i = 0; i <= 10; i++) {
        var y = (i / 10.0) * h; var ln2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        ln2.setAttribute("x1", L); ln2.setAttribute("y1", y); ln2.setAttribute("x2", R); ln2.setAttribute("y2", y); ln2.setAttribute("class", "grid-line"); gridGroup.appendChild(ln2);
    }
}

function CreateFrameLabels()
{
    var labelsGroup = document.getElementById("frame-labels"); var overlay = Overlay(); var h = overlay ? overlay.clientHeight : document.documentElement.clientHeight/2;
    labelsGroup.innerHTML = "";
    for (var frame = 1; frame <= 30; frame++) { var x = TimeToX(frame); var y = h - 10; var t = document.createElementNS("http://www.w3.org/2000/svg", "text"); t.setAttribute("x", x); t.setAttribute("y", y); t.textContent = frame.toString(); labelsGroup.appendChild(t); }
}

function UpdateLines()
{
    var linesGroup = document.getElementById("lines"); linesGroup.innerHTML = "";
    for (var i = 0; i < pt.length - 1; i++) {
        var x1 = pt[i].getAttribute("cx"), y1 = pt[i].getAttribute("cy"), x2 = pt[i+1].getAttribute("cx"), y2 = pt[i+1].getAttribute("cy");
        var ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
        ln.setAttribute("x1", x1); ln.setAttribute("y1", y1); ln.setAttribute("x2", x2); ln.setAttribute("y2", y2); ln.setAttribute("id", "line" + i);
        linesGroup.appendChild(ln);
    }
}

// ------------------------ Eventos ------------------------

$(document).ready(function() 
{
    var overlay = Overlay(); var w = overlay.clientWidth, h = overlay.clientHeight;
    pt = []; ptTime = [0, 10, 20, 30]; ptYNorm = [0.1, 0.6, 0.3, 0.9];
    pt[0] = CreateControlPoint(0, 0.1); pt[0].setAttribute("cx", 0.1*w); pt[0].setAttribute("cy", 0.1*h);
    pt[1] = CreateControlPoint(10, 0.6); pt[1].setAttribute("cx", 0.35*w); pt[1].setAttribute("cy", 0.6*h);
    pt[2] = CreateControlPoint(20, 0.3); pt[2].setAttribute("cx", 0.55*w); pt[2].setAttribute("cy", 0.3*h);
    pt[3] = CreateControlPoint(30, 0.9); pt[3].setAttribute("cx", 0.8*w); pt[3].setAttribute("cy", 0.9*h);

    InitTimesFromCurrentX(); InitYNormFromCurrent(); EnforceXPositions(); EnforceYPositions();
    CreateGrid(); CreateFrameLabels();

    $(document).on( "mousedown", "circle", function( event )
    {
        event.preventDefault(); event.stopPropagation(); selPt = event.target; isDraggingPoint = true; didDrag = false; dragStart.x = event.clientX; dragStart.y = event.clientY;
    });

    $(document).on( "click", "line, #curve", function( event )
    {
        if (event.target.classList.contains('grid-line')) return; if (event.target.id === 'current-frame-line') return; if (didDrag) { didDrag = false; return; }
        event.stopPropagation(); event.preventDefault();
        var p = RelCoords(event), bounds = XBounds(), L = bounds[0], R = bounds[1], xRel = p.x, yRel = p.y;
        var t = ClampInt01_30( 30.0 * (xRel - L) / (R - L) ); var freeT = FindNearestFreeTimeInt(t); if (freeT !== null && typeof freeT !== 'undefined') t = freeT;
        if (currentDrawingMode === "curve") { var yOnCurve = EvaluateYAtX(xRel); if (typeof yOnCurve === 'number') yRel = yOnCurve; }
        var yNorm = (p.h > 0) ? (yRel / p.h) : 0.5; document.getElementById("preview-point").style.display = "none"; AddSimpleControlPoint(t, yNorm); RefreshAfterPointsChange(false);
    });

    $(document).on( "mouseenter", "#overlay", function() {
        $(document).on("mousemove.overlayPreview", function(moveEvent) {
            var p = RelCoords(moveEvent), xRel = p.x, bounds = XBounds(), L = bounds[0], R = bounds[1], previewPoint = document.getElementById("preview-point");
            if (selPt) { previewPoint.style.display = "none"; return; }
            if (xRel < L || xRel > R) { previewPoint.style.display = "none"; return; }
            var yRel = EvaluateYAtX(xRel); if (typeof yRel !== 'number') return; previewPoint.setAttribute("cx", xRel); previewPoint.setAttribute("cy", yRel); previewPoint.style.display = "block";
        });
    });
    $(document).on( "mouseleave", "#overlay", function() { document.getElementById("preview-point").style.display = "none"; $(document).off("mousemove.overlayPreview"); });

    $(document).on('click', '#frame-labels text', function() { var f = parseInt(this.textContent, 10); if (!isNaN(f) && typeof animation !== 'undefined' && animation && typeof animation.setFrame === 'function') { animation.setFrame(f); } });

    $('input[name="drawingMode"]').on('change', function() { currentDrawingMode = this.value; PrecomputeFrameY(); UpdateCurvePath(); DrawScene(); });

    $(document).on( "mouseup", function() { selPt = null; isDraggingPoint = false; });
    $(document).on( "mouseleave", function() { selPt = null; isDraggingPoint = false; });

    $(document).on( "mousemove", function( event )
    {
        if (!selPt) return;
        if (isDraggingPoint) { var dx = Math.abs(event.clientX - dragStart.x), dy = Math.abs(event.clientY - dragStart.y); if (dx + dy > 3) didDrag = true; }
        var idx = null; for (var i = 0; i < pt.length; ++i) { if (pt[i] === selPt) { idx = i; break; } } if (idx === null) return;
        var ov = Overlay(), rc = ov.getBoundingClientRect();
        var xRel = Math.max(0, Math.min(ov.clientWidth, event.clientX - rc.left)); var r = 5; var yRel = Math.max(r, Math.min(ov.clientHeight - r, event.clientY - rc.top));
        if (idx === 0 || idx === pt.length - 1) { selPt.setAttribute("cy", yRel); ptYNorm[idx] = ov.clientHeight > 0 ? (yRel / ov.clientHeight) : ptYNorm[idx]; EnforceXPositions(); }
        else { var L = XBounds()[0], R = XBounds()[1]; var tInt = ClampInt01_30( 30.0 * (xRel - L) / (R - L) ); var prevT = ptTime[idx-1], nextT = ptTime[idx+1]; if (tInt <= prevT || tInt >= nextT) { RemoveControlPoint(idx); selPt = null; } else { ptTime[idx] = tInt; selPt.setAttribute("cy", yRel); ptYNorm[idx] = ov.clientHeight > 0 ? (yRel / ov.clientHeight) : ptYNorm[idx]; EnforceXPositions(); } }
        if (currentDrawingMode === "lines") { while (CheckCollisions()) {} }
        RefreshAfterPointsChange(false);
    });

    $(window).on( "resize", function() { UpdateCanvasSize(); EnforceXPositions(); EnforceYPositions(); CreateGrid(); CreateFrameLabels(); UpdateLines(); UpdateCurvePath(); PrecomputeFrameY(); UpdatePoints(); DrawScene(); });

    // Inicialización
    UpdateLines(); PrecomputeFrameY(); UpdateCurvePath();
    InitWebGL(); UpdatePoints(); DrawScene();
});

