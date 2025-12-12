export class TransformManager {
  constructor(canvas, sketchManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sketchManager = sketchManager;
    this.selectedHandle = null;
    this.dragOffset = { x: 0, y: 0 };
    this.isDraggingSketch = false;
    this.draggedSketch = null;
  }

  drawHandles(sketch) {
    if (!sketch || !sketch.selected) return;

    const ctx = this.ctx;
    const pos = sketch.position;
    const rotation = sketch.transform.rotation * (Math.PI / 180); // Convert to radians

    // Calculate center point for rotation
    const centerX = pos.x + sketch.size.width / 2;
    const centerY = pos.y + sketch.size.height / 2;

    // Helper function to rotate a point around center
    const rotatePoint = (x, y) => {
      const dx = x - centerX;
      const dy = y - centerY;
      return {
        x: centerX + dx * Math.cos(rotation) - dy * Math.sin(rotation),
        y: centerY + dx * Math.sin(rotation) + dy * Math.cos(rotation)
      };
    };

    // Transform corner positions by rotation
    const transformedCorners = sketch.corners.map(corner => {
      return rotatePoint(pos.x + corner.x, pos.y + corner.y);
    });

    // Draw corner handles
    transformedCorners.forEach((corner, index) => {
      ctx.beginPath();
      ctx.arc(
        corner.x,
        corner.y,
        6,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = '#4a9eff';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw lines connecting corners
    ctx.beginPath();
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    transformedCorners.forEach((corner, index) => {
      if (index === 0) {
        ctx.moveTo(corner.x, corner.y);
      } else {
        ctx.lineTo(corner.x, corner.y);
      }
    });
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  hitTestHandle(x, y, sketch) {
    if (!sketch) return null;

    const pos = sketch.position;
    const rotation = sketch.transform.rotation * (Math.PI / 180);
    const hitRadius = 10;

    // Calculate center point for rotation
    const centerX = pos.x + sketch.size.width / 2;
    const centerY = pos.y + sketch.size.height / 2;

    // Helper function to rotate a point around center
    const rotatePoint = (px, py) => {
      const dx = px - centerX;
      const dy = py - centerY;
      return {
        x: centerX + dx * Math.cos(rotation) - dy * Math.sin(rotation),
        y: centerY + dx * Math.sin(rotation) + dy * Math.cos(rotation)
      };
    };

    for (let i = 0; i < sketch.corners.length; i++) {
      const corner = sketch.corners[i];
      const rotated = rotatePoint(pos.x + corner.x, pos.y + corner.y);
      const dx = x - rotated.x;
      const dy = y - rotated.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= hitRadius) {
        return i;
      }
    }

    return null;
  }

  isInsideSketch(x, y, sketch) {
    if (!sketch) return false;

    const pos = sketch.position;
    const corners = sketch.corners.map(c => ({
      x: pos.x + c.x,
      y: pos.y + c.y
    }));

    // Use ray casting algorithm to test if point is inside polygon
    let inside = false;
    for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
      const xi = corners[i].x, yi = corners[i].y;
      const xj = corners[j].x, yj = corners[j].y;

      const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }

    return inside;
  }

  startDrag(x, y, handleIndex, sketch) {
    this.selectedHandle = handleIndex;
    this.draggedSketch = sketch;

    if (handleIndex === null) {
      // Dragging the whole sketch
      this.isDraggingSketch = true;
      this.dragOffset.x = x - sketch.position.x;
      this.dragOffset.y = y - sketch.position.y;
    }
  }

  drag(x, y) {
    if (!this.draggedSketch) return;

    if (this.isDraggingSketch) {
      // Move entire sketch
      const newX = x - this.dragOffset.x;
      const newY = y - this.dragOffset.y;
      this.sketchManager.updateSketchPosition(this.draggedSketch.id, newX, newY);
    } else if (this.selectedHandle !== null) {
      // Move corner handle
      const pos = this.draggedSketch.position;
      const newCorners = [...this.draggedSketch.corners];
      newCorners[this.selectedHandle] = {
        x: x - pos.x,
        y: y - pos.y
      };
      this.sketchManager.updateSketchCorners(this.draggedSketch.id, newCorners);

      // Apply the visual transform
      this.applyCornerTransform(this.draggedSketch);
    }
  }

  applyCornerTransform(sketch) {
    if (!sketch) return;

    const container = sketch.container;
    if (!container) return;

    const corners = sketch.corners;
    const size = sketch.size;
    const pos = sketch.position;

    // Calculate the perspective transform matrix from the 4 corner points
    const matrix = this.calculatePerspectiveMatrix(
      // Source rectangle (original)
      [0, 0, size.width, 0, size.width, size.height, 0, size.height],
      // Destination quad (warped corners)
      [
        corners[0].x, corners[0].y,
        corners[1].x, corners[1].y,
        corners[2].x, corners[2].y,
        corners[3].x, corners[3].y
      ]
    );

    // Apply the transform matrix
    if (matrix) {
      container.style.transform = `matrix3d(${matrix.join(',')})`;
      container.style.transformOrigin = '0 0';

      // Update container position
      container.style.left = `${pos.x}px`;
      container.style.top = `${pos.y}px`;
      container.style.width = `${size.width}px`;
      container.style.height = `${size.height}px`;
    }
  }

  calculatePerspectiveMatrix(src, dst) {
    // Calculate a 3D perspective transformation matrix
    // This maps a rectangle to an arbitrary quadrilateral
    // Based on the algorithm from: https://franklinta.com/2014/09/08/computing-css-matrix3d-transforms/

    // Source points
    const x0s = src[0], y0s = src[1];
    const x1s = src[2], y1s = src[3];
    const x2s = src[4], y2s = src[5];
    const x3s = src[6], y3s = src[7];

    // Destination points
    const x0d = dst[0], y0d = dst[1];
    const x1d = dst[2], y1d = dst[3];
    const x2d = dst[4], y2d = dst[5];
    const x3d = dst[6], y3d = dst[7];

    // Compute the matrix coefficients
    const a = [
      [x0s, y0s, 1, 0, 0, 0, -x0d * x0s, -x0d * y0s],
      [0, 0, 0, x0s, y0s, 1, -y0d * x0s, -y0d * y0s],
      [x1s, y1s, 1, 0, 0, 0, -x1d * x1s, -x1d * y1s],
      [0, 0, 0, x1s, y1s, 1, -y1d * x1s, -y1d * y1s],
      [x2s, y2s, 1, 0, 0, 0, -x2d * x2s, -x2d * y2s],
      [0, 0, 0, x2s, y2s, 1, -y2d * x2s, -y2d * y2s],
      [x3s, y3s, 1, 0, 0, 0, -x3d * x3s, -x3d * y3s],
      [0, 0, 0, x3s, y3s, 1, -y3d * x3s, -y3d * y3s]
    ];

    const b = [x0d, y0d, x1d, y1d, x2d, y2d, x3d, y3d];

    // Solve the linear system using Gaussian elimination
    const h = this.solveLinearSystem(a, b);

    if (!h) return null;

    // Construct the matrix3d
    return [
      h[0], h[3], 0, h[6],
      h[1], h[4], 0, h[7],
      0, 0, 1, 0,
      h[2], h[5], 0, 1
    ];
  }

  solveLinearSystem(A, b) {
    // Gaussian elimination with partial pivoting
    const n = b.length;
    const Ab = A.map((row, i) => [...row, b[i]]);

    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(Ab[k][i]) > Math.abs(Ab[maxRow][i])) {
          maxRow = k;
        }
      }
      [Ab[i], Ab[maxRow]] = [Ab[maxRow], Ab[i]];

      // Make all rows below this one 0 in current column
      for (let k = i + 1; k < n; k++) {
        const c = Ab[k][i] / Ab[i][i];
        for (let j = i; j <= n; j++) {
          if (i === j) {
            Ab[k][j] = 0;
          } else {
            Ab[k][j] -= c * Ab[i][j];
          }
        }
      }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = Ab[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= Ab[i][j] * x[j];
      }
      x[i] /= Ab[i][i];
    }

    return x;
  }

  endDrag() {
    this.selectedHandle = null;
    this.isDraggingSketch = false;
    this.draggedSketch = null;
  }

  applyTransform(sketch) {
    if (!sketch) return;

    const container = sketch.container;
    if (!container) return;

    // Apply CSS transform directly to the container (which contains the iframe)
    const t = sketch.transform;
    const transform = `
      rotate(${t.rotation}deg)
      scale(${t.scaleX}, ${t.scaleY})
      skew(${t.skewX}deg, ${t.skewY}deg)
    `;
    container.style.transform = transform;

    // For quad warping, we need to use a different approach
    // We'll render to an off-screen canvas and apply perspective transform
    this.applyPerspectiveTransform(sketch);
  }

  applyPerspectiveTransform(sketch) {
    // This is a simplified version - for true quad warping,
    // you'd need to use WebGL or a matrix transformation library
    // For now, we'll use CSS transforms as an approximation

    const corners = sketch.corners;
    const pos = sketch.position;

    // Calculate if the quad is significantly warped
    const isWarped = this.isQuadWarped(corners, sketch.size);

    if (isWarped) {
      // For warped quads, we'd ideally use WebGL or canvas transform
      // For now, we'll just position it based on the top-left corner
      // and let CSS handle basic transforms
      const container = sketch.container;
      container.style.left = `${pos.x + corners[0].x}px`;
      container.style.top = `${pos.y + corners[0].y}px`;
    }
  }

  isQuadWarped(corners, originalSize) {
    // Check if corners form a perfect rectangle
    const tolerance = 2;

    const expectedCorners = [
      { x: 0, y: 0 },
      { x: originalSize.width, y: 0 },
      { x: originalSize.width, y: originalSize.height },
      { x: 0, y: originalSize.height }
    ];

    for (let i = 0; i < corners.length; i++) {
      const dx = Math.abs(corners[i].x - expectedCorners[i].x);
      const dy = Math.abs(corners[i].y - expectedCorners[i].y);

      if (dx > tolerance || dy > tolerance) {
        return true;
      }
    }

    return false;
  }

  resetTransform(sketch) {
    if (!sketch) return;

    sketch.transform = {
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0
    };

    sketch.corners = [
      { x: 0, y: 0 },
      { x: sketch.size.width, y: 0 },
      { x: sketch.size.width, y: sketch.size.height },
      { x: 0, y: sketch.size.height }
    ];

    this.applyTransform(sketch);
  }

  // Utility functions for traditional transforms
  rotateSketch(sketch, angle) {
    sketch.transform.rotation = angle;
    this.applyTransform(sketch);
  }

  scaleSketch(sketch, scaleX, scaleY) {
    sketch.transform.scaleX = scaleX;
    sketch.transform.scaleY = scaleY;
    this.applyTransform(sketch);
  }

  skewSketch(sketch, skewX, skewY) {
    sketch.transform.skewX = skewX;
    sketch.transform.skewY = skewY;
    this.applyTransform(sketch);
  }
}
