// Audio-Reactive Reaction Diffusion
// Gray-Scott model with microphone input
// Click to add reaction seeds
// Press 'M' to toggle microphone

let grid;
let next;
let dA = 1.0;
let dB = 0.5;
let feed = 0.055;
let k = 0.062;

// Audio using Web Audio API
let audioContext;
let analyser;
let microphone;
let micActive = false;
let audioDataArray;
let audioLevel = 0;
let bassLevel = 0;
let midLevel = 0;
let highLevel = 0;

function setup() {
  createCanvas(400, 400); // Reduced from 800x800 for better performance
  pixelDensity(1);

  // Initialize grids
  grid = [];
  next = [];
  for (let x = 0; x < width; x++) {
    grid[x] = [];
    next[x] = [];
    for (let y = 0; y < height; y++) {
      grid[x][y] = { a: 1, b: 0 };
      next[x][y] = { a: 1, b: 0 };
    }
  }

  // Add multiple initial seeds for more interesting patterns
  for (let s = 0; s < 5; s++) {
    let cx = random(width * 0.2, width * 0.8);
    let cy = random(height * 0.2, height * 0.8);
    let size = random(5, 15);
    for (let i = -size; i <= size; i++) {
      for (let j = -size; j <= size; j++) {
        let x = int(cx + i);
        let y = int(cy + j);
        if (x >= 0 && x < width && y >= 0 && y < height) {
          if (dist(i, j, 0, 0) < size) {
            grid[x][y].b = 1;
          }
        }
      }
    }
  }

  noSmooth(); // Disable anti-aliasing for sharper rendering
}

function draw() {
  // Get audio levels if mic is active
  if (micActive && analyser && audioDataArray) {
    analyser.getByteFrequencyData(audioDataArray);

    // Calculate frequency bands
    let bassSum = 0;
    let midSum = 0;
    let highSum = 0;
    let bufferLength = analyser.frequencyBinCount;

    // Bass (20-250 Hz) - first ~10% of spectrum
    for (let i = 0; i < bufferLength * 0.1; i++) {
      bassSum += audioDataArray[i];
    }
    bassLevel = bassSum / (bufferLength * 0.1 * 255);

    // Mid (250-2000 Hz) - next 30% of spectrum
    for (let i = int(bufferLength * 0.1); i < bufferLength * 0.4; i++) {
      midSum += audioDataArray[i];
    }
    midLevel = midSum / (bufferLength * 0.3 * 255);

    // High (2000+ Hz) - rest of spectrum
    for (let i = int(bufferLength * 0.4); i < bufferLength; i++) {
      highSum += audioDataArray[i];
    }
    highLevel = highSum / (bufferLength * 0.6 * 255);

    // Overall level
    audioLevel = (bassLevel + midLevel + highLevel) / 3;

    // Modulate parameters based on audio
    feed = map(bassLevel, 0, 1, 0.01, 0.08);
    k = map(midLevel, 0, 1, 0.045, 0.07);

    // Add random seeds on high frequencies
    if (highLevel > 0.7 && random(1) < 0.3) {
      let rx = int(random(width));
      let ry = int(random(height));
      let size = int(map(highLevel, 0.7, 1, 5, 15));
      for (let i = -size; i <= size; i++) {
        for (let j = -size; j <= size; j++) {
          if (rx + i >= 0 && rx + i < width && ry + j >= 0 && ry + j < height) {
            grid[rx + i][ry + j].b = 1;
          }
        }
      }
    }
  }

  // Run multiple iterations per frame for faster evolution
  for (let n = 0; n < 15; n++) { // Increased from 10 to 15
    // Compute reaction-diffusion
    for (let x = 1; x < width - 1; x++) {
      for (let y = 1; y < height - 1; y++) {
        let a = grid[x][y].a;
        let b = grid[x][y].b;

        // Laplacian for A
        let laplaceA = 0;
        laplaceA += grid[x][y].a * -1;
        laplaceA += grid[x - 1][y].a * 0.2;
        laplaceA += grid[x + 1][y].a * 0.2;
        laplaceA += grid[x][y - 1].a * 0.2;
        laplaceA += grid[x][y + 1].a * 0.2;
        laplaceA += grid[x - 1][y - 1].a * 0.05;
        laplaceA += grid[x + 1][y - 1].a * 0.05;
        laplaceA += grid[x - 1][y + 1].a * 0.05;
        laplaceA += grid[x + 1][y + 1].a * 0.05;

        // Laplacian for B
        let laplaceB = 0;
        laplaceB += grid[x][y].b * -1;
        laplaceB += grid[x - 1][y].b * 0.2;
        laplaceB += grid[x + 1][y].b * 0.2;
        laplaceB += grid[x][y - 1].b * 0.2;
        laplaceB += grid[x][y + 1].b * 0.2;
        laplaceB += grid[x - 1][y - 1].b * 0.05;
        laplaceB += grid[x + 1][y - 1].b * 0.05;
        laplaceB += grid[x - 1][y + 1].b * 0.05;
        laplaceB += grid[x + 1][y + 1].b * 0.05;

        // Gray-Scott equations
        next[x][y].a = a + (dA * laplaceA - a * b * b + feed * (1 - a));
        next[x][y].b = b + (dB * laplaceB + a * b * b - (k + feed) * b);

        // Clamp values
        next[x][y].a = constrain(next[x][y].a, 0, 1);
        next[x][y].b = constrain(next[x][y].b, 0, 1);
      }
    }

    // Swap grids
    let temp = grid;
    grid = next;
    next = temp;
  }

  // Render with better contrast and coloring
  loadPixels();
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let a = grid[x][y].a;
      let b = grid[x][y].b;

      // Enhanced visualization - show chemical B with high contrast
      let c = b; // Just show chemical B
      c = constrain(c * 3, 0, 1); // Amplify for better visibility

      // Apply gamma correction for better visual contrast
      c = pow(c, 0.7);

      // Audio-reactive color shift
      let r, g, bl;
      if (micActive && audioLevel > 0.01) {
        // Colorful audio-reactive mode
        r = c * 255 * (1 + bassLevel * 2);
        g = c * 255 * (0.5 + midLevel * 1.5);
        bl = c * 255 * (1 + highLevel * 2);
      } else {
        // High contrast white on black
        r = c * 255;
        g = c * 255;
        bl = c * 255;
      }

      let index = (x + y * width) * 4;
      pixels[index] = r;
      pixels[index + 1] = g;
      pixels[index + 2] = bl;
      pixels[index + 3] = 255;
    }
  }
  updatePixels();

  // Display audio info if active
  if (micActive) {
    fill(255);
    noStroke();
    textSize(12);
    text('MIC ON - Bass: ' + nf(bassLevel, 1, 2) + ' Mid: ' + nf(midLevel, 1, 2) + ' High: ' + nf(highLevel, 1, 2), 10, 20);
    text('Feed: ' + nf(feed, 1, 3) + ' k: ' + nf(k, 1, 3), 10, 40);
  }
}

function mousePressed() {
  // Add reaction seed where clicked
  let size = 15;
  for (let i = -size; i <= size; i++) {
    for (let j = -size; j <= size; j++) {
      let x = int(mouseX + i);
      let y = int(mouseY + j);
      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (dist(i, j, 0, 0) < size) {
          grid[x][y].b = 1;
        }
      }
    }
  }
}

async function startMicrophone() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    microphone = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    microphone.connect(analyser);
    audioDataArray = new Uint8Array(analyser.frequencyBinCount);
    micActive = true;
  } catch (err) {
    console.error('Microphone access denied:', err);
    micActive = false;
  }
}

function stopMicrophone() {
  if (microphone && microphone.mediaStream) {
    microphone.mediaStream.getTracks().forEach(track => track.stop());
  }
  if (audioContext) {
    audioContext.close();
  }
  micActive = false;
}

function keyPressed() {
  if (key === 'm' || key === 'M') {
    if (micActive) {
      stopMicrophone();
    } else {
      startMicrophone();
    }
  }

  // Preset patterns
  if (key === '1') {
    feed = 0.055;
    k = 0.062;
  }
  if (key === '2') {
    feed = 0.035;
    k = 0.065;
  }
  if (key === '3') {
    feed = 0.012;
    k = 0.050;
  }
  if (key === '4') {
    feed = 0.090;
    k = 0.059;
  }

  // Clear
  if (key === 'c' || key === 'C') {
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        grid[x][y] = { a: 1, b: 0 };
      }
    }
    // Re-add center seed
    let cx = width / 2;
    let cy = height / 2;
    for (let i = -10; i <= 10; i++) {
      for (let j = -10; j <= 10; j++) {
        if (cx + i >= 0 && cx + i < width && cy + j >= 0 && cy + j < height) {
          grid[int(cx + i)][int(cy + j)].b = 1;
        }
      }
    }
  }
}
