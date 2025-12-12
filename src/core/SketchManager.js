export class SketchManager {
  constructor() {
    this.sketches = [];
    this.nextId = 1;
  }

  createSketch(code, x = 100, y = 100, width = 400, height = 300) {
    const id = this.nextId++;

    // Create a container div for this sketch
    const container = document.createElement('div');
    container.id = `sketch-${id}`;
    container.style.position = 'absolute';
    container.style.left = `${x}px`;
    container.style.top = `${y}px`;
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    container.style.pointerEvents = 'none';
    container.style.transformOrigin = 'center center';

    // Create iframe for isolated p5 sketch
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.display = 'block';
    iframe.style.backgroundColor = 'transparent';

    container.appendChild(iframe);

    // Wait for iframe to load and inject p5 sketch
    iframe.onload = () => {
      this.injectSketchIntoIframe(iframe, code, width, height);
    };

    // Set iframe content with the code already embedded
    iframe.srcdoc = this.createIframeHTML(code, width, height);

    const sketch = {
      id,
      code,
      container,
      iframe,
      position: { x, y },
      size: { width, height },
      // Corner points for quad warping (initially a rectangle)
      corners: [
        { x: 0, y: 0 },           // top-left
        { x: width, y: 0 },       // top-right
        { x: width, y: height },  // bottom-right
        { x: 0, y: height }       // bottom-left
      ],
      selected: false,
      transform: {
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0
      }
    };

    this.sketches.push(sketch);
    return sketch;
  }

  createIframeHTML(code, width, height) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              margin: 0;
              padding: 0;
              overflow: hidden;
              background: transparent;
            }
            canvas {
              display: block;
            }
          </style>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js"></script>
        </head>
        <body>
          <script id="sketch-code">
            ${code}
          </script>
        </body>
      </html>
    `;
  }

  injectSketchIntoIframe(iframe, code, width, height) {
    try {
      const waitForP5 = () => {
        const win = iframe.contentWindow;
        if (!win) return;

        if (win.p5Ready) {
          const doc = iframe.contentDocument || win.document;

          // Remove old script if it exists
          const oldScript = doc.getElementById('sketch-code');
          if (oldScript) {
            oldScript.remove();
          }

          // Create new script element with the code
          const scriptElement = doc.createElement('script');
          scriptElement.id = 'sketch-code';
          scriptElement.textContent = code;
          doc.body.appendChild(scriptElement);
        } else {
          // Wait a bit more and try again
          setTimeout(waitForP5, 50);
        }
      };

      waitForP5();
    } catch (error) {
      console.error('Error injecting sketch into iframe:', error);
    }
  }

  updateSketch(sketchId, newCode) {
    const sketch = this.sketches.find(s => s.id === sketchId);
    if (!sketch) return false;

    // Update code and reload iframe with new code
    sketch.code = newCode;
    sketch.iframe.srcdoc = this.createIframeHTML(newCode, sketch.size.width, sketch.size.height);
    return true;
  }

  removeSketch(sketchId) {
    const index = this.sketches.findIndex(s => s.id === sketchId);
    if (index === -1) return false;

    const sketch = this.sketches[index];
    sketch.container.remove();
    this.sketches.splice(index, 1);
    return true;
  }

  getSketch(sketchId) {
    return this.sketches.find(s => s.id === sketchId);
  }

  updateSketchPosition(sketchId, x, y) {
    const sketch = this.getSketch(sketchId);
    if (!sketch) return false;

    sketch.position.x = x;
    sketch.position.y = y;
    sketch.container.style.left = `${x}px`;
    sketch.container.style.top = `${y}px`;
    return true;
  }

  updateSketchCorners(sketchId, corners) {
    const sketch = this.getSketch(sketchId);
    if (!sketch) return false;

    sketch.corners = corners;
    return true;
  }

  selectSketch(sketchId) {
    this.sketches.forEach(s => s.selected = false);
    const sketch = this.getSketch(sketchId);
    if (sketch) {
      sketch.selected = true;
      return sketch;
    }
    return null;
  }

  getSelectedSketch() {
    return this.sketches.find(s => s.selected);
  }

  hitTest(x, y) {
    // Test from top to bottom (reverse order for proper z-index)
    for (let i = this.sketches.length - 1; i >= 0; i--) {
      const sketch = this.sketches[i];
      const rect = sketch.container.getBoundingClientRect();

      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return sketch;
      }
    }
    return null;
  }

  getAllSketches() {
    return this.sketches;
  }

  toJSON() {
    return this.sketches.map(s => ({
      id: s.id,
      code: s.code,
      position: s.position,
      size: s.size,
      corners: s.corners,
      transform: s.transform
    }));
  }

  fromJSON(data) {
    // Clear existing sketches
    this.sketches.forEach(s => {
      s.p5Instance.remove();
      s.container.remove();
    });
    this.sketches = [];

    // Recreate sketches from data
    data.forEach(sketchData => {
      const sketch = this.createSketch(
        sketchData.code,
        sketchData.position.x,
        sketchData.position.y,
        sketchData.size.width,
        sketchData.size.height
      );

      if (sketch) {
        sketch.corners = sketchData.corners;
        sketch.transform = sketchData.transform;
      }
    });

    // Update nextId to be higher than any loaded id
    if (data.length > 0) {
      this.nextId = Math.max(...data.map(s => s.id)) + 1;
    }
  }
}
