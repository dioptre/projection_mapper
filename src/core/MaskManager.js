export class MaskManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.masks = [];
    this.currentMask = null;
    this.selectedMask = null;
    this.selectedPoint = null;
    this.selectedSegment = null;
    this.isDragging = false;
    this.isDraggingMask = false;
    this.dragOffset = { x: 0, y: 0 };
    this.nextId = 1;
  }

  startNewMask() {
    this.currentMask = {
      id: this.nextId++,
      points: [],
      closed: false
    };
    this.masks.push(this.currentMask);
    return this.currentMask;
  }

  addPoint(x, y, isBezier = false) {
    if (!this.currentMask) {
      this.startNewMask();
    }

    const point = {
      x,
      y,
      type: isBezier ? 'bezier' : 'linear',
      controlPoints: isBezier ? [
        { x: x - 30, y },  // control point 1
        { x: x + 30, y }   // control point 2
      ] : null
    };

    this.currentMask.points.push(point);
    return point;
  }

  insertPointOnSegment(x, y, segmentIndex) {
    if (!this.currentMask) return null;

    const points = this.currentMask.points;
    if (segmentIndex < 0 || segmentIndex >= points.length) return null;

    const point = {
      x,
      y,
      type: 'bezier',
      controlPoints: [
        { x: x - 30, y },
        { x: x + 30, y }
      ]
    };

    // Insert point after the segment index
    points.splice(segmentIndex + 1, 0, point);
    return point;
  }

  removePoint(pointIndex) {
    if (!this.currentMask) return false;

    if (pointIndex >= 0 && pointIndex < this.currentMask.points.length) {
      this.currentMask.points.splice(pointIndex, 1);
      return true;
    }
    return false;
  }

  closeMask() {
    if (this.currentMask && this.currentMask.points.length >= 3) {
      this.currentMask.closed = true;
      return true;
    }
    return false;
  }

  finishMask() {
    if (this.currentMask && this.currentMask.points.length >= 2) {
      this.currentMask = null;
      return true;
    }
    return false;
  }

  hitTestPoint(x, y) {
    const hitRadius = 10;

    for (let maskIndex = this.masks.length - 1; maskIndex >= 0; maskIndex--) {
      const mask = this.masks[maskIndex];

      // Test main points
      for (let i = 0; i < mask.points.length; i++) {
        const point = mask.points[i];
        const dist = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);

        if (dist <= hitRadius) {
          return { maskIndex, pointIndex: i, type: 'point' };
        }

        // Test control points if this is a bezier point
        if (point.type === 'bezier' && point.controlPoints) {
          for (let cpIndex = 0; cpIndex < point.controlPoints.length; cpIndex++) {
            const cp = point.controlPoints[cpIndex];
            const cpDist = Math.sqrt((x - cp.x) ** 2 + (y - cp.y) ** 2);

            if (cpDist <= hitRadius) {
              return {
                maskIndex,
                pointIndex: i,
                controlPointIndex: cpIndex,
                type: 'control'
              };
            }
          }
        }
      }
    }

    return null;
  }

  hitTestSegment(x, y) {
    const hitDistance = 8;

    for (let maskIndex = this.masks.length - 1; maskIndex >= 0; maskIndex--) {
      const mask = this.masks[maskIndex];
      const points = mask.points;

      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];

        if (!mask.closed && i === points.length - 1) continue;

        const dist = this.distanceToSegment(x, y, p1, p2);
        if (dist <= hitDistance) {
          return { maskIndex, segmentIndex: i };
        }
      }
    }

    return null;
  }

  distanceToSegment(px, py, p1, p2) {
    // Calculate distance from point to line segment
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) {
      return Math.sqrt((px - p1.x) ** 2 + (py - p1.y) ** 2);
    }

    const t = Math.max(0, Math.min(1, ((px - p1.x) * dx + (py - p1.y) * dy) / (length * length)));
    const projX = p1.x + t * dx;
    const projY = p1.y + t * dy;

    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }

  startDrag(hit) {
    this.selectedPoint = hit;
    this.isDragging = true;
  }

  drag(x, y) {
    // Handle mask dragging
    if (this.isDraggingMask) {
      this.dragMask(x, y);
      return;
    }

    // Handle point dragging
    if (!this.isDragging || !this.selectedPoint) return;

    const mask = this.masks[this.selectedPoint.maskIndex];
    if (!mask) return;

    if (this.selectedPoint.type === 'point') {
      const point = mask.points[this.selectedPoint.pointIndex];
      const dx = x - point.x;
      const dy = y - point.y;

      point.x = x;
      point.y = y;

      // Move control points with the main point
      if (point.controlPoints) {
        point.controlPoints.forEach(cp => {
          cp.x += dx;
          cp.y += dy;
        });
      }
    } else if (this.selectedPoint.type === 'control') {
      const point = mask.points[this.selectedPoint.pointIndex];
      const cp = point.controlPoints[this.selectedPoint.controlPointIndex];
      cp.x = x;
      cp.y = y;
    }
  }

  endDrag() {
    this.selectedPoint = null;
    this.isDragging = false;
    this.isDraggingMask = false;
  }

  // Check if a point is inside a closed mask polygon
  isPointInsideMask(x, y, mask) {
    if (!mask || !mask.closed || mask.points.length < 3) return false;

    const points = mask.points;
    let inside = false;

    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;

      const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }

    return inside;
  }

  // Find which mask contains the point
  hitTestMask(x, y) {
    for (let i = this.masks.length - 1; i >= 0; i--) {
      if (this.isPointInsideMask(x, y, this.masks[i])) {
        return i;
      }
    }
    return null;
  }

  // Select a mask
  selectMaskByIndex(index) {
    if (index !== null && index >= 0 && index < this.masks.length) {
      this.selectedMask = this.masks[index];
      return this.selectedMask;
    }
    this.selectedMask = null;
    return null;
  }

  // Start dragging entire mask
  startMaskDrag(x, y, maskIndex) {
    this.isDraggingMask = true;
    this.selectedMask = this.masks[maskIndex];

    // Calculate offset from first point
    if (this.selectedMask && this.selectedMask.points.length > 0) {
      const firstPoint = this.selectedMask.points[0];
      this.dragOffset.x = x - firstPoint.x;
      this.dragOffset.y = y - firstPoint.y;
    }
  }

  // Drag entire mask
  dragMask(x, y) {
    if (!this.isDraggingMask || !this.selectedMask) return;

    // Calculate the delta from the reference point
    const firstPoint = this.selectedMask.points[0];
    const newX = x - this.dragOffset.x;
    const newY = y - this.dragOffset.y;
    const dx = newX - firstPoint.x;
    const dy = newY - firstPoint.y;

    // Move all points
    this.selectedMask.points.forEach(point => {
      point.x += dx;
      point.y += dy;

      // Move control points too
      if (point.controlPoints) {
        point.controlPoints.forEach(cp => {
          cp.x += dx;
          cp.y += dy;
        });
      }
    });
  }

  drawMasks(hideEditingVisuals = false) {
    const ctx = this.ctx;

    this.masks.forEach(mask => {
      if (mask.points.length === 0) return;

      ctx.save();

      // Draw the filled mask
      ctx.beginPath();
      this.drawMaskPath(ctx, mask);

      ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
      ctx.fill();

      // Only draw outline and editing visuals if not hidden
      if (!hideEditingVisuals) {
        // Highlight selected mask with different color
        const isSelected = this.selectedMask && this.selectedMask.id === mask.id;
        ctx.strokeStyle = isSelected ? '#4a9eff' : '#ff4444';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke();

        // Draw points and handles only for selected mask in select mode
        if (isSelected) {
          this.drawMaskPoints(ctx, mask);
        }
      }

      ctx.restore();
    });
  }

  drawMaskPath(ctx, mask) {
    const points = mask.points;
    if (points.length === 0) return;

    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];

      if (!mask.closed && i === points.length - 1) break;

      if (current.type === 'bezier' && current.controlPoints) {
        // Draw bezier curve using control points
        const cp1 = current.controlPoints[1]; // exit control point
        const cp2 = next.controlPoints ? next.controlPoints[0] : { x: next.x, y: next.y }; // entry control point

        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, next.x, next.y);
      } else {
        // Draw straight line
        ctx.lineTo(next.x, next.y);
      }
    }

    if (mask.closed) {
      ctx.closePath();
    }
  }

  drawMaskPoints(ctx, mask) {
    mask.points.forEach((point, index) => {
      // Draw main point
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4444';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw control points and handles for bezier
      if (point.type === 'bezier' && point.controlPoints) {
        point.controlPoints.forEach(cp => {
          // Draw line from main point to control point
          ctx.beginPath();
          ctx.moveTo(point.x, point.y);
          ctx.lineTo(cp.x, cp.y);
          ctx.strokeStyle = '#44ff44';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Draw control point
          ctx.beginPath();
          ctx.arc(cp.x, cp.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#44ff44';
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }
    });
  }

  selectMask(maskId) {
    this.currentMask = this.masks.find(m => m.id === maskId);
    return this.currentMask;
  }

  deleteMask(maskId) {
    const index = this.masks.findIndex(m => m.id === maskId);
    if (index !== -1) {
      this.masks.splice(index, 1);
      if (this.currentMask && this.currentMask.id === maskId) {
        this.currentMask = null;
      }
      return true;
    }
    return false;
  }

  getAllMasks() {
    return this.masks;
  }

  toJSON() {
    return this.masks.map(mask => ({
      id: mask.id,
      points: mask.points,
      closed: mask.closed
    }));
  }

  fromJSON(data) {
    this.masks = data.map(maskData => ({
      id: maskData.id,
      points: maskData.points,
      closed: maskData.closed
    }));

    if (data.length > 0) {
      this.nextId = Math.max(...data.map(m => m.id)) + 1;
    }

    this.currentMask = null;
  }
}
