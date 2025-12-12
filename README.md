# Projection Mapper Tool

A web-based projection mapping tool that allows you to create, transform, and mask p5.js sketches in real-time. Perfect for VJ performances, interactive installations, and projection mapping projects.

## Features

### Core Functionality
- **p5.js Instance Mode**: Run multiple independent p5.js sketches simultaneously
- **Corner-Pin Warping**: Transform sketches with quad warping for projection mapping
- **Bezier Masking**: Create blackout masks with linear and curved segments
- **Live Code Editor**: Edit sketch code and see changes in real-time
- **Save/Load Projects**: Export and import your projects as JSON files
- **Fullscreen & Presentation Mode**: Clean output for projectors

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5175` in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Usage

### Toolbar

The toolbar at the top provides access to all tools:

1. **Select Tool** (Arrow icon) - Select and transform sketches
2. **Mask Tool** (Circle icon) - Create blackout masks
3. **Add Sketch** (Plus icon) - Add new p5.js sketches
4. **Fullscreen** (Expand icon) - Toggle fullscreen mode
5. **Save** (Disk icon) - Save project as JSON
6. **Load** (Folder icon) - Load project from JSON

### Working with Sketches

#### Adding a Sketch
1. Click the **Add Sketch** button (+)
2. Enter your p5.js code or leave empty for the default example
3. The sketch will appear on the canvas

#### Selecting and Moving
1. Click the **Select Tool** (arrow icon)
2. Click on a sketch to select it
3. Drag to move the entire sketch
4. Drag the corner handles to warp/distort the sketch

#### Editing Code
1. Select a sketch
2. Press `E` or click "Edit Code" in the properties panel
3. Modify the code in the editor
4. Click "Apply" to see changes

#### Deleting a Sketch
1. Select a sketch
2. Press `Delete` or `Backspace`
3. Or click "Delete" in the properties panel

### Creating Masks

Masks allow you to blackout areas of the canvas:

1. Click the **Mask Tool** (circle icon)
2. Click to add points:
   - **Normal click**: Add a straight line point
   - **Shift + click on line**: Add a bezier curve point
3. Click on existing points to drag them
4. Green handles appear on bezier points for curve control
5. Press `Enter` to close the mask shape
6. Press `Escape` to finish the mask

### Keyboard Shortcuts

- `E` - Edit selected sketch code
- `F` - Toggle fullscreen
- `P` - Toggle presentation mode (hide UI in fullscreen)
- `Delete`/`Backspace` - Delete selected sketch
- `Escape` - Deselect / Finish mask
- `Enter` - Close mask shape

### Fullscreen & Presentation Mode

1. Press `F` or click the fullscreen button
2. Once in fullscreen, press `P` to hide the toolbar and panels
3. This gives you a clean output for projection
4. Press `F` again to exit fullscreen

### Saving and Loading Projects

#### Save Project
1. Click the **Save** button
2. A JSON file will download with all your sketches and masks

#### Load Project
1. Click the **Load** button
2. Select a previously saved JSON file
3. All sketches and masks will be restored

## p5.js Sketch Format

Sketches should be written in p5.js global mode format:

```javascript
function setup() {
  createCanvas(720, 400);
  background(220);
}

function draw() {
  // Your animation code
  fill(255, 0, 0);
  circle(mouseX, mouseY, 50);
}
```

### Supported Features
- All p5.js drawing functions
- 2D and 3D (WebGL) rendering
- Video and image loading
- Sound (with p5.sound library)
- User interaction (mouse, keyboard)
- External libraries

### Example Sketches

**Simple Animation:**
```javascript
let x = 0;

function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);
  fill(255, 0, 0);
  circle(x, 200, 50);
  x = (x + 2) % width;
}
```

**3D Sketch:**
```javascript
function setup() {
  createCanvas(400, 400, WEBGL);
}

function draw() {
  background(200);
  rotateX(frameCount * 0.01);
  rotateY(frameCount * 0.01);
  box(100);
}
```

**Interactive:**
```javascript
function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);
  fill(0, 100, 200);
  circle(mouseX, mouseY, 50);
}

function mousePressed() {
  fill(255, 0, 0);
  circle(mouseX, mouseY, 30);
}
```

## Architecture

### Project Structure

```
src/
├── core/
│   ├── SketchManager.js      # Manages p5.js instances
│   ├── TransformManager.js   # Handles transformations
│   └── MaskManager.js         # Manages blackout masks
├── main.js                    # Main application logic
└── style.css                  # Styles
```

### Key Components

#### SketchManager
- Creates and manages p5.js instances in instance mode
- Handles sketch lifecycle (create, update, destroy)
- Maintains sketch state (position, corners, transforms)
- Serializes/deserializes to JSON

#### TransformManager
- Handles corner-pin warping with 4-point control
- Provides hit testing for handles and sketches
- Manages drag operations
- Applies CSS and canvas transforms

#### MaskManager
- Creates bezier paths for blackout masks
- Supports linear and curved segments
- Point and control point editing
- Renders masks as filled shapes

## Testing

Run Playwright tests:

```bash
npm test
```

Tests cover:
- Sketch loading and rendering
- Tool switching
- Selection and properties
- Mask creation
- Code editor

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari

Requires modern JavaScript features (ES6+, Proxy, Canvas API).

## Performance Tips

1. **Multiple Sketches**: Each sketch runs independently. For best performance, limit to 3-5 complex sketches
2. **WebGL**: Use `createCanvas(w, h, WEBGL)` for 3D and complex effects
3. **Frame Rate**: Use `frameRate(30)` in setup() to limit update rate
4. **Optimization**: Use `noLoop()` for static sketches

## Known Issues

- Very complex p5.js sketches may have minor compatibility issues with instance mode
- Quad warping uses CSS transforms (true perspective mapping coming in future version)
- Multiple sketches accessing global window properties may conflict

## Future Enhancements

- [ ] True perspective quad warping with WebGL
- [ ] Sketch library/gallery
- [ ] OSC/MIDI control
- [ ] Multiple output displays
- [ ] Sketch blending modes
- [ ] Timeline/sequencing
- [ ] Advanced mask types (gradient, feathering)

## Contributing

This project uses:
- Vite for build tooling
- p5.js for creative coding
- Playwright for testing
- Vanilla JavaScript (no framework)

## License

MIT License - feel free to use in your projects!

## Credits

Built with:
- [p5.js](https://p5js.org/) - Creative coding library
- [Vite](https://vitejs.dev/) - Build tool
- [Playwright](https://playwright.dev/) - Testing framework
