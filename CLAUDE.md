# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web-based projection mapping tool for real-time manipulation of p5.js sketches. Built with vanilla JavaScript and Vite, this tool enables VJ performances, interactive installations, and projection mapping by allowing users to transform, warp, and mask multiple p5.js sketches simultaneously.

## Development Commands

```bash
# Start development server (Vite on port 5176)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run all Playwright tests
npx playwright test

# Run specific test
npx playwright test --grep "test name"

# Run tests in headed mode (with browser UI)
npx playwright test --headed

# Run tests for specific file
npx playwright test tests/comprehensive-test.spec.js
```

## Architecture Overview

### Core Design Pattern

The application uses a **Manager Pattern** where three independent managers coordinate through a central `ProjectionMapper` class:

1. **SketchManager** (`src/core/SketchManager.js`) - Manages p5.js lifecycle
2. **TransformManager** (`src/core/TransformManager.js`) - Handles CSS transforms and perspective warping
3. **MaskManager** (`src/core/MaskManager.js`) - Manages bezier masks for blackout regions

### Critical Architecture Concepts

#### Sketch Rendering: iframe-based Isolation

Each p5.js sketch runs in an **isolated iframe** (not in instance mode directly in the DOM):

```
Container DIV (CSS transforms applied here)
  └── iframe (isolated p5.js context)
       └── p5.js canvas (scales to fill iframe)
```

**Why this matters:**
- **Canvas size** = The p5.js `createCanvas(w, h)` dimensions inside the iframe
- **iframe size** = CSS width/height of the container (set via properties panel)
- **CSS transforms** = Applied to container div (rotation, perspective warping)
- Canvas automatically scales to 100% of iframe via CSS: `width: 100% !important; height: 100% !important`

When modifying sketch dimensions in properties panel:
- Changing width/height updates the iframe container size
- The iframe is recreated with `srcdoc` containing the p5.js code
- Users must have matching `createCanvas()` dimensions in their code for proper rendering

#### Perspective Transform System

The quad warping uses **CSS 3D matrix transforms** (not simple clip-path):

- `TransformManager.calculatePerspectiveMatrix()` computes matrix3d from 4 corner points
- Uses Gaussian elimination to solve the linear system for perspective mapping
- Applied via `container.style.transform = matrix3d(...)`
- This provides true perspective distortion, not just masking

#### State Persistence

**localStorage Auto-Save**:
- Projects auto-save to localStorage every 5 seconds (`saveToLocalStorage()`)
- On page load, `loadFromLocalStorage()` restores state if available
- **Critical**: After loading, transforms must be explicitly applied:
  ```javascript
  this.transformManager.applyTransform(sketch);
  this.transformManager.applyCornerTransform(sketch);
  ```

#### Tool Mode System

The app has three tool modes (stored in `this.currentTool`):
- `'select'` - Move sketches, drag corners for warping, show transform handles
- `'mask'` - Create and edit bezier masks
- `'add-sketch'` - Triggered on-demand, shows prompt for new sketch code

Mouse events are routed differently based on current tool mode in `onMouseDown()`.

### Data Flow

#### Creating a Sketch
1. User provides p5.js code (or uses default)
2. `SketchManager.createSketch()` creates container div + iframe
3. iframe `srcdoc` is set with HTML template containing p5.js CDN + user code
4. Code executes when iframe loads
5. Sketch object stored with: `{ id, code, container, iframe, position, size, corners, transform }`

#### Applying Transforms
1. User drags corner handles or rotation slider
2. `TransformManager` updates sketch object's `transform` or `corners` properties
3. `applyTransform()` applies rotation/scale/skew via CSS transform
4. `applyCornerTransform()` calculates and applies perspective matrix3d
5. Both are applied to the **container div** (not the iframe or canvas directly)

#### Mask Rendering
1. Masks are drawn on a **single overlay canvas** (`#main-canvas`)
2. Canvas is positioned absolutely over all sketch containers
3. `MaskManager.drawMasks(hideEditingVisuals)` renders all masks each frame
4. Masks use canvas 2D API with bezier curves (`bezierCurveTo`)
5. Filled with solid black (`rgba(0, 0, 0, 1.0)`)
6. **Masks are independent layers** - they do NOT rotate or transform with sketches
   - Masks stay fixed in canvas coordinate system
   - They are meant to blackout fixed regions (borders, unwanted areas)
   - Red outlines/handles hidden when `hideEditingVisuals=true` (presentation mode)
7. To make masks follow sketches would require architectural change (making masks children of sketch containers)

## Common Tasks

### Adding New Properties to Sketches

When adding new properties that need to persist:

1. Add to sketch object in `SketchManager.createSketch()`
2. Include in `SketchManager.toJSON()` serialization
3. Restore in `SketchManager.fromJSON()`
4. Apply in `loadFromLocalStorage()` after reconstruction

### Modifying Transform Behavior

- Basic transforms (rotate, scale, skew): Edit `TransformManager.applyTransform()`
- Perspective warping: Modify `TransformManager.calculatePerspectiveMatrix()`
- Corner handle positioning: Update `TransformManager.drawHandles()`

### Working with p5.js Code Injection

The iframe receives code via `createIframeHTML(code, width, height)`:
- p5.js loaded from CDN (version 1.7.0)
- User code injected as script text directly in `<script id="sketch-code">${code}</script>`
- No preprocessing or wrapping of user code
- User code must use global mode p5.js syntax (`function setup()`, `function draw()`)

**Important**: Users referencing external DOM elements (e.g., `select("#myDiv")`) will fail because the iframe is isolated. Sliders/DOM elements must be created inside the p5.js code using p5's DOM functions.

### Testing Strategy

Tests are in `tests/` directory (configured in `playwright.config.js`):
- Tests run against dev server on `http://localhost:5176`
- Dev server auto-starts via `webServer` config
- Use `--headed` flag to see browser UI during test development
- Screenshots saved to `test-screenshots/` on each test run

## p5.js Sketch Constraints

Users writing sketches should know:
1. **No external DOM access** - Sketches run in isolated iframe
2. **Use p5 DOM functions** - `createSlider()`, `createButton()` etc. work within iframe
3. **Canvas size** - Must match iframe dimensions for proper display
4. **Global mode only** - Instance mode syntax won't work
5. **Libraries** - Must be loaded via CDN in iframe (currently only p5.js core is loaded)

## File Organization

```
src/
├── core/
│   ├── SketchManager.js      # iframe creation, p5.js lifecycle, serialization
│   ├── TransformManager.js   # CSS transforms, perspective math, corner handles
│   └── MaskManager.js         # Bezier path creation, mask rendering
├── main.js                    # ProjectionMapper class, event routing, UI panels
├── style.css                  # All styles including range slider customization
└── counter.js                 # (unused, can be removed)

tests/
└── comprehensive-test.spec.js # Full integration test suite

index.html                     # Entry point with #main-canvas and #main-container
playwright.config.js           # Test configuration
```

## Key Implementation Details

### Properties Panel
- Dynamically generated HTML in `showPropertiesPanel()`
- Rotation slider syncs with number input in real-time
- Canvas size applies via "Apply Canvas Size" button (recreates iframe)
- Width/height = iframe container dimensions (NOT CSS transform scale)

### Fullscreen Mode
- Press `F` to enter fullscreen
- Auto-hides UI after 3 seconds of no mouse movement
- Press `P` in fullscreen for presentation mode (completely hide UI)
- Uses native Fullscreen API + CSS classes for styling

### Keyboard Shortcuts
Handled in `onKeyDown()`:
- `E` - Edit code
- `F` - Fullscreen toggle
- `P` - Presentation mode (when in fullscreen)
- `Delete`/`Backspace` - Delete selected sketch
- `Escape` - Deselect/cancel
- `Enter` - Close mask shape

### Range Slider Styling
Custom CSS for `input[type="range"]` in `style.css`:
- Uses `-webkit-slider-thumb` and `-moz-range-thumb` pseudo-elements
- Blue accent color for thumb
- Hover effect scales thumb 1.2x
- Must have `pointer-events: auto` inline style for proper interaction
