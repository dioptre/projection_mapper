import './style.css';
import { SketchManager } from './core/SketchManager.js';
import { TransformManager } from './core/TransformManager.js';
import { MaskManager } from './core/MaskManager.js';

class ProjectionMapper {
  constructor() {
    this.canvas = document.getElementById('main-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.container = document.getElementById('main-container');

    // Initialize managers
    this.sketchManager = new SketchManager();
    this.transformManager = new TransformManager(this.canvas, this.sketchManager);
    this.maskManager = new MaskManager(this.canvas);

    // State
    this.currentTool = 'select'; // 'select', 'mask', 'add-sketch'
    this.isFullscreen = false;
    this.isPresentationMode = false;
    this.mouseIdleTimeout = null;
    this.lastMouseMove = Date.now();

    // Setup
    this.setupCanvas();
    this.setupEventListeners();
    this.setupToolbar();
    this.setupEditor();

    // Animation loop
    this.animate();

    // Try to load from localStorage (don't add default sketch if empty)
    this.loadFromLocalStorage();

    // Auto-save to localStorage every 5 seconds
    setInterval(() => this.saveToLocalStorage(), 5000);
  }

  setupCanvas() {
    const resize = () => {
      this.canvas.width = this.container.clientWidth;
      this.canvas.height = this.container.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);
  }

  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

    // Global mouse move for idle detection
    document.addEventListener('mousemove', (e) => this.onGlobalMouseMove(e));

    // Keyboard events
    document.addEventListener('keydown', (e) => this.onKeyDown(e));

    // Prevent properties panel and editor from triggering canvas events
    const propertiesPanel = document.getElementById('properties-panel');
    const editorPanel = document.getElementById('editor-panel');

    [propertiesPanel, editorPanel].forEach(panel => {
      panel.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      panel.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });
  }

  onGlobalMouseMove(e) {
    this.lastMouseMove = Date.now();

    if (this.isFullscreen) {
      const app = document.getElementById('app');
      app.classList.remove('hide-ui');
      app.classList.remove('hide-cursor');

      // Clear existing timeout
      if (this.mouseIdleTimeout) {
        clearTimeout(this.mouseIdleTimeout);
      }

      // Set new timeout for 3 seconds
      this.mouseIdleTimeout = setTimeout(() => {
        if (this.isFullscreen) {
          app.classList.add('hide-ui');
          app.classList.add('hide-cursor');
        }
      }, 3000);
    }
  }

  setupToolbar() {
    // Tool buttons
    document.getElementById('tool-select').addEventListener('click', () => {
      this.setTool('select');
    });

    document.getElementById('tool-interact').addEventListener('click', () => {
      this.setTool('interact');
    });

    document.getElementById('tool-mask').addEventListener('click', () => {
      this.setTool('mask');
    });

    document.getElementById('tool-add-sketch').addEventListener('click', () => {
      this.showSketchDialog();
    });

    // Utility buttons
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      this.toggleFullscreen();
    });

    document.getElementById('btn-save').addEventListener('click', () => {
      this.saveProject();
    });

    document.getElementById('btn-load').addEventListener('click', () => {
      this.loadProject();
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      this.resetProject();
    });
  }

  setupEditor() {
    const editorPanel = document.getElementById('editor-panel');
    const codeEditor = document.getElementById('code-editor');
    const applyBtn = document.getElementById('editor-apply');
    const closeBtn = document.getElementById('editor-close');

    applyBtn.addEventListener('click', () => {
      const code = codeEditor.value;
      const selectedSketch = this.sketchManager.getSelectedSketch();

      if (selectedSketch) {
        this.sketchManager.updateSketch(selectedSketch.id, code);
      }
    });

    closeBtn.addEventListener('click', () => {
      editorPanel.classList.add('hidden');
    });
  }

  setTool(tool) {
    // Auto-close any open mask before switching tools
    if (this.currentTool === 'mask' && tool !== 'mask') {
      this.maskManager.closeMask();
    }

    this.currentTool = tool;

    // Update toolbar buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    const toolBtn = document.getElementById(`tool-${tool}`);
    if (toolBtn) {
      toolBtn.classList.add('active');
    }

    // In interact mode, disable canvas pointer events and enable sketch container pointer events
    if (tool === 'interact') {
      this.canvas.style.pointerEvents = 'none';
      // Enable pointer events on all sketch containers so they can receive clicks
      const sketches = this.sketchManager.getAllSketches();
      sketches.forEach(sketch => {
        sketch.container.style.pointerEvents = 'auto';
      });
    } else {
      this.canvas.style.pointerEvents = 'auto';
      // Disable pointer events on sketch containers in other modes
      const sketches = this.sketchManager.getAllSketches();
      sketches.forEach(sketch => {
        sketch.container.style.pointerEvents = 'none';
      });
    }
  }

  onMouseDown(e) {
    // Skip event handling in interact mode - let events pass to iframes
    if (this.currentTool === 'interact') {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.currentTool === 'select') {
      this.handleSelectMouseDown(x, y);
    } else if (this.currentTool === 'mask') {
      this.handleMaskMouseDown(x, y, e);
    }
  }

  handleSelectMouseDown(x, y) {
    const selectedSketch = this.sketchManager.getSelectedSketch();

    // Check if clicking on a handle
    if (selectedSketch) {
      const handleIndex = this.transformManager.hitTestHandle(x, y, selectedSketch);

      if (handleIndex !== null) {
        this.transformManager.startDrag(x, y, handleIndex, selectedSketch);
        return;
      }

      // Check if clicking inside the selected sketch
      if (this.transformManager.isInsideSketch(x, y, selectedSketch)) {
        this.transformManager.startDrag(x, y, null, selectedSketch);
        return;
      }
    }

    // Check if clicking on a mask
    const maskIndex = this.maskManager.hitTestMask(x, y);
    if (maskIndex !== null) {
      this.maskManager.startMaskDrag(x, y, maskIndex);
      this.sketchManager.selectSketch(null); // Deselect sketches
      this.hidePropertiesPanel();
      return;
    }

    // Check if clicking on any sketch
    const sketches = this.sketchManager.getAllSketches();
    for (let i = sketches.length - 1; i >= 0; i--) {
      const sketch = sketches[i];
      if (this.transformManager.isInsideSketch(x, y, sketch)) {
        this.sketchManager.selectSketch(sketch.id);
        this.transformManager.startDrag(x, y, null, sketch);
        this.showPropertiesPanel(sketch);
        return;
      }
    }

    // Clicked on empty space - deselect
    this.sketchManager.selectSketch(null);
    this.maskManager.selectMaskByIndex(null);
    this.hidePropertiesPanel();
  }

  handleMaskMouseDown(x, y, e) {
    // Check if clicking on existing point or control point
    const hit = this.maskManager.hitTestPoint(x, y);

    if (hit) {
      this.maskManager.startDrag(hit);
      return;
    }

    // Check if clicking on segment (middle of line)
    const segmentHit = this.maskManager.hitTestSegment(x, y);

    if (segmentHit) {
      // Add bezier point on segment
      this.maskManager.insertPointOnSegment(x, y, segmentHit.segmentIndex);
      return;
    }

    // Add new point - shift key for bezier, otherwise linear
    const isBezier = e.shiftKey;
    this.maskManager.addPoint(x, y, isBezier);
  }

  onMouseMove(e) {
    // Skip event handling in interact mode - let events pass to iframes
    if (this.currentTool === 'interact') {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.currentTool === 'select') {
      this.transformManager.drag(x, y);
      this.maskManager.drag(x, y); // Also handle mask dragging in select mode
    } else if (this.currentTool === 'mask') {
      this.maskManager.drag(x, y);
    }
  }

  onMouseUp(e) {
    // Skip event handling in interact mode - let events pass to iframes
    if (this.currentTool === 'interact') {
      return;
    }

    if (this.currentTool === 'select') {
      this.transformManager.endDrag();
      this.maskManager.endDrag(); // Also end mask dragging in select mode
    } else if (this.currentTool === 'mask') {
      this.maskManager.endDrag();
    }
  }

  onDoubleClick(e) {
    // Double-click closes mask in mask mode
    if (this.currentTool === 'mask') {
      this.maskManager.closeMask();
    }
  }

  onKeyDown(e) {
    // Delete key - remove selected point, sketch, or mask
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.currentTool === 'select') {
        const selectedSketch = this.sketchManager.getSelectedSketch();
        const selectedMask = this.maskManager.selectedMask;

        if (selectedSketch) {
          this.sketchManager.removeSketch(selectedSketch.id);
          this.hidePropertiesPanel();
        } else if (selectedMask) {
          this.maskManager.deleteMask(selectedMask.id);
          this.maskManager.selectMaskByIndex(null);
        }
      }
    }

    // Escape - close and finish mask, or deselect
    if (e.key === 'Escape') {
      if (this.currentTool === 'mask') {
        this.maskManager.closeMask(); // Close the mask
        this.maskManager.finishMask(); // Then finish editing
      } else if (this.currentTool === 'select') {
        this.sketchManager.selectSketch(null);
        this.maskManager.selectMaskByIndex(null);
        this.hidePropertiesPanel();
      }
    }

    // Enter - close mask
    if (e.key === 'Enter' && this.currentTool === 'mask') {
      this.maskManager.closeMask();
    }

    // E key - edit selected sketch
    if (e.key === 'e' || e.key === 'E') {
      const selectedSketch = this.sketchManager.getSelectedSketch();
      if (selectedSketch) {
        this.showEditor(selectedSketch);
      }
    }

    // F key - toggle fullscreen
    if (e.key === 'f' || e.key === 'F') {
      this.toggleFullscreen();
    }

    // P key - toggle presentation mode (when in fullscreen)
    if (e.key === 'p' || e.key === 'P') {
      if (this.isFullscreen) {
        this.togglePresentationMode();
      }
    }
  }

  animate() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Check if we should hide editing visuals (in presentation mode or when UI is hidden)
    const app = document.getElementById('app');
    const hideEditingVisuals = app.classList.contains('hide-ui') || this.isPresentationMode;

    // Draw masks (hide red outlines in presentation/hide-ui mode, pass current tool)
    this.maskManager.drawMasks(hideEditingVisuals, this.currentTool);

    // Draw transform handles for selected sketch (only if not hiding UI)
    const selectedSketch = this.sketchManager.getSelectedSketch();
    if (selectedSketch && this.currentTool === 'select' && !hideEditingVisuals) {
      this.transformManager.drawHandles(selectedSketch);
    }

    requestAnimationFrame(() => this.animate());
  }

  showPropertiesPanel(sketch) {
    const panel = document.getElementById('properties-panel');
    const content = document.getElementById('properties-content');

    content.innerHTML = `
      <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border);">
        <div style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 4px;">Sketch ID</div>
        <div style="font-size: 16px; font-weight: 600;">${sketch.id}</div>
      </div>

      <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border);">
        <div style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 4px;">Position</div>
        <div style="font-size: 14px;">X: ${Math.round(sketch.position.x)}, Y: ${Math.round(sketch.position.y)}</div>
      </div>

      <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border);">
        <div style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Canvas Size</div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <div style="flex: 1;">
            <label style="display: block; font-size: 10px; color: var(--text-secondary); margin-bottom: 4px;">Width</label>
            <input type="number" id="sketch-width" value="${sketch.size.width}" min="1" max="4000"
                   style="width: 100%; padding: 6px; background: var(--bg-dark); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px; text-align: center; font-size: 14px;">
          </div>
          <span style="color: var(--text-secondary); padding-top: 16px;">×</span>
          <div style="flex: 1;">
            <label style="display: block; font-size: 10px; color: var(--text-secondary); margin-bottom: 4px;">Height</label>
            <input type="number" id="sketch-height" value="${sketch.size.height}" min="1" max="4000"
                   style="width: 100%; padding: 6px; background: var(--bg-dark); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px; text-align: center; font-size: 14px;">
          </div>
        </div>
        <button id="apply-size-btn" class="btn-primary" style="width: 100%; margin-top: 8px; padding: 6px; font-size: 11px;">
          Apply Canvas Size
        </button>
      </div>

      <div style="margin-bottom: 20px;">
        <label style="display: block; font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Rotation</label>
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="range" id="sketch-rotation-slider" min="-180" max="180" value="${Math.round(sketch.transform.rotation)}"
                 style="flex: 1; pointer-events: auto;">
          <input type="number" id="sketch-rotation" value="${Math.round(sketch.transform.rotation)}"
                 style="width: 60px; padding: 6px; background: var(--bg-dark); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px; text-align: center; font-size: 14px;">
          <span style="font-size: 12px; color: var(--text-secondary);">°</span>
        </div>
      </div>

      <button id="edit-sketch-btn" class="btn-primary" style="width: 100%; margin-bottom: 8px; padding: 10px;">
        Edit Code
      </button>
      <button id="delete-sketch-btn" class="btn-secondary" style="width: 100%; padding: 10px;">
        Delete
      </button>
    `;

    panel.classList.remove('hidden');

    // Sync slider and number input
    const slider = document.getElementById('sketch-rotation-slider');
    const input = document.getElementById('sketch-rotation');

    const updateRotation = (value) => {
      const rotation = parseFloat(value);
      sketch.transform.rotation = rotation;
      this.transformManager.applyTransform(sketch);
      slider.value = rotation;
      input.value = Math.round(rotation);
    };

    slider.addEventListener('input', (e) => {
      e.stopPropagation();
      updateRotation(e.target.value);
    });

    slider.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    slider.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    input.addEventListener('input', (e) => {
      e.stopPropagation();
      updateRotation(e.target.value);
    });

    input.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    input.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Apply canvas size button
    document.getElementById('apply-size-btn').addEventListener('click', () => {
      const newWidth = parseInt(document.getElementById('sketch-width').value);
      const newHeight = parseInt(document.getElementById('sketch-height').value);

      if (newWidth > 0 && newHeight > 0) {
        // Update size
        sketch.size.width = newWidth;
        sketch.size.height = newHeight;

        // Update container size
        sketch.container.style.width = `${newWidth}px`;
        sketch.container.style.height = `${newHeight}px`;

        // Update corners proportionally
        sketch.corners = [
          { x: 0, y: 0 },
          { x: newWidth, y: 0 },
          { x: newWidth, y: newHeight },
          { x: 0, y: newHeight }
        ];

        // Recreate the iframe with new canvas dimensions
        sketch.iframe.srcdoc = this.sketchManager.createIframeHTML(sketch.code, newWidth, newHeight);

        // Apply transforms
        this.transformManager.applyTransform(sketch);
        this.transformManager.applyCornerTransform(sketch);

        // Refresh properties panel
        this.showPropertiesPanel(sketch);
      }
    });

    document.getElementById('edit-sketch-btn').addEventListener('click', () => {
      this.showEditor(sketch);
    });

    document.getElementById('delete-sketch-btn').addEventListener('click', () => {
      this.sketchManager.removeSketch(sketch.id);
      this.hidePropertiesPanel();
    });
  }

  hidePropertiesPanel() {
    document.getElementById('properties-panel').classList.add('hidden');
  }

  showEditor(sketch) {
    const editorPanel = document.getElementById('editor-panel');
    const codeEditor = document.getElementById('code-editor');

    codeEditor.value = sketch.code;
    editorPanel.classList.remove('hidden');
  }

  showSketchDialog() {
    // Just add sketch with default code, no prompt
    const sketchCode = this.getDefaultSketchCode();
    const sketch = this.sketchManager.createSketch(sketchCode, 100, 100, 400, 400);
    if (sketch) {
      this.container.appendChild(sketch.container);
    }
  }

  addDefaultSketch() {
    const code = this.getDefaultSketchCode();
    const sketch = this.sketchManager.createSketch(code, 50, 50, 720, 400);
    if (sketch) {
      this.container.appendChild(sketch.container);
    }
  }

  getDefaultSketchCode() {
    return `let gravity;
let drops = [];
let gravitySlider;
let sizeSlider;
let tensionSlider;
let frictionSlider;
let dropSize = 20;
let repulsionForce = 0.5;
let friction = 0.9;

function setup() {
  createCanvas(400, 400);

  // Create sliders positioned at the top
  gravitySlider = createSlider(0, 1, 0.25, 0.05);
  gravitySlider.position(10, 10);
  gravitySlider.style('width', '80px');

  sizeSlider = createSlider(1, 50, 20, 1);
  sizeSlider.position(10, 30);
  sizeSlider.style('width', '80px');

  tensionSlider = createSlider(0, 2, 0.5, 0.05);
  tensionSlider.position(10, 50);
  tensionSlider.style('width', '80px');

  frictionSlider = createSlider(0, 1, 0.9, 0.05);
  frictionSlider.position(10, 70);
  frictionSlider.style('width', '80px');

  for (let i = 0; i < 250; i++) {
    drops.push(new Drop());
  }

  noStroke();
}

function draw() {
  background(0);

  gravity = createVector(0, gravitySlider.value());
  dropSize = sizeSlider.value();
  repulsionForce = tensionSlider.value();
  friction = frictionSlider.value();

  drops.forEach(drop => {
    drop.applyForce(gravity);
    drops.forEach(otherDrop => {
      drop.applyForce(drop.interaction(otherDrop));
    });

    drop.show();
    drop.update();
  });
}

class Drop {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
  }

  applyForce(force) {
    this.acc.add(force);
  }

  interaction(other) {
    let force = p5.Vector.sub(this.pos, other.pos);
    let distance = force.mag();
    distance = constrain(distance, 1, 50);

    let strength = repulsionForce / (distance * distance);
    force.setMag(strength);

    return force;
  }

  update() {
    this.vel.add(this.acc);
    this.vel.mult(friction);
    this.pos.add(this.vel);
    this.acc.mult(0);

    // Wrap around edges
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.y < 0) this.pos.y = height;
    if (this.pos.y > height) this.pos.y = 0;
  }

  show() {
    fill(255);
    circle(this.pos.x, this.pos.y, dropSize);
  }
}`;
  }

  toggleFullscreen() {
    const app = document.getElementById('app');

    if (!this.isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
      app.classList.add('fullscreen');
      this.isFullscreen = true;

      // Start the auto-hide timer immediately
      this.mouseIdleTimeout = setTimeout(() => {
        if (this.isFullscreen) {
          app.classList.add('hide-ui');
          app.classList.add('hide-cursor');
        }
      }, 3000);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      app.classList.remove('fullscreen', 'presentation-mode', 'hide-ui', 'hide-cursor');
      this.isFullscreen = false;
      this.isPresentationMode = false;

      // Clear the timeout
      if (this.mouseIdleTimeout) {
        clearTimeout(this.mouseIdleTimeout);
        this.mouseIdleTimeout = null;
      }
    }
  }

  togglePresentationMode() {
    const app = document.getElementById('app');

    if (!this.isPresentationMode) {
      app.classList.add('presentation-mode');
      this.isPresentationMode = true;
    } else {
      app.classList.remove('presentation-mode');
      this.isPresentationMode = false;
    }
  }

  saveProject() {
    const project = {
      version: '1.0',
      sketches: this.sketchManager.toJSON(),
      masks: this.maskManager.toJSON()
    };

    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'projection-map-project.json';
    a.click();

    URL.revokeObjectURL(url);
  }

  loadProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const project = JSON.parse(event.target.result);
          this.sketchManager.fromJSON(project.sketches);
          this.maskManager.fromJSON(project.masks);

          // Append sketch containers to DOM
          this.sketchManager.getAllSketches().forEach(sketch => {
            this.container.appendChild(sketch.container);
          });
        } catch (error) {
          alert('Error loading project: ' + error.message);
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }

  saveToLocalStorage() {
    try {
      const project = {
        version: '1.0',
        sketches: this.sketchManager.toJSON(),
        masks: this.maskManager.toJSON()
      };
      localStorage.setItem('projection-map-project', JSON.stringify(project));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('projection-map-project');
      if (!saved) return false;

      const project = JSON.parse(saved);
      this.sketchManager.fromJSON(project.sketches);
      this.maskManager.fromJSON(project.masks);

      // Append sketch containers to DOM and apply transforms
      this.sketchManager.getAllSketches().forEach(sketch => {
        this.container.appendChild(sketch.container);
        // Apply the saved transforms
        this.transformManager.applyTransform(sketch);
        this.transformManager.applyCornerTransform(sketch);
      });

      return true;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return false;
    }
  }

  resetProject() {
    // Confirm with user
    if (!confirm('Reset project? This will delete all sketches and masks. This cannot be undone.')) {
      return;
    }

    // Remove all sketches
    const sketches = this.sketchManager.getAllSketches();
    sketches.forEach(sketch => {
      this.sketchManager.removeSketch(sketch.id);
    });

    // Clear all masks
    this.maskManager.masks = [];
    this.maskManager.currentMask = null;
    this.maskManager.selectedMask = null;

    // Clear localStorage
    localStorage.removeItem('projection-map-project');

    // Hide panels
    this.hidePropertiesPanel();
    document.getElementById('editor-panel').classList.add('hidden');

    // Reset tool to select
    this.setTool('select');
  }
}

// Initialize the app
new ProjectionMapper();
