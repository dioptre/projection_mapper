// Animated Stars Pattern Generator
// Click to regenerate new star pattern
// Use number keys 1-9 to change stroke width
// Press SPACE to toggle animation

let strokeWidth = 1;
let starColor;

let currentStars = [];
let targetStars = [];
let animationProgress = 0; // 0 to 1 - start at 0 to begin animating immediately
let animationSpeed = 1 / (30 * 60); // 30 second transitions at 60fps = 0.000556 per frame
let isAnimating = true;
let fadeDuration = 3 * 60; // 3 seconds in frames at 60fps

function setup() {
  createCanvas(800, 800);
  starColor = color(255, 0, 0); // Red
  noFill();

  // Generate initial star patterns
  currentStars = generateStarPattern();
  targetStars = generateStarPattern();
}

function draw() {
  background(0, 0); // Transparent background
  clear();

  stroke(starColor);
  strokeWeight(strokeWidth);

  // Animate towards target if animating
  if (isAnimating && animationProgress < 1) {
    animationProgress += animationSpeed;
    if (animationProgress >= 1) {
      animationProgress = 1;
      currentStars = targetStars;
      targetStars = generateStarPattern();
      animationProgress = 0;
    }
  }

  // Draw interpolated stars
  drawInterpolatedStars();

  // Calculate fade opacity based on animation progress
  // Fade out in first 3 seconds, fade in during last 3 seconds
  let totalFrames = 1 / animationSpeed; // Total frames for full animation
  let currentFrame = animationProgress * totalFrames;
  let fadeOpacity = 0;

  if (currentFrame < fadeDuration) {
    // Fading out (0 to 1) in first 3 seconds
    fadeOpacity = 1 - (currentFrame / fadeDuration);
  } else if (currentFrame > totalFrames - fadeDuration) {
    // Fading in (1 to 0) in last 3 seconds
    fadeOpacity = (totalFrames - currentFrame) / fadeDuration;
  }

  // Apply fade overlay
  if (fadeOpacity > 0) {
    fill(0, fadeOpacity * 255);
    noStroke();
    rect(0, 0, width, height);
  }
}

function generateStarPattern() {
  let pattern = {
    size: pow(2, int(random(7, 9))), // Increased from (6, 8) to (7, 9) - gives 128, 256, or 512
    vert: int(random(1, 3)) * 4, // Reduced from (1, 4) to (1, 3) - gives 4 or 8 vertices only
    m1: random(0.5, 3),
    stars: []
  };
  pattern.m2 = -pattern.m1 + random(-0.5, 0.5);

  for (let x = 0; x < width; x += pattern.size) {
    for (let y = 0; y < height; y += pattern.size) {
      let star = {
        x: x + pattern.size / 2,
        y: y + pattern.size / 2,
        size: pattern.size,
        vert: pattern.vert,
        m1: pattern.m1,
        m2: pattern.m2,
        rotation: random(TWO_PI)
      };
      pattern.stars.push(star);
    }
  }

  return pattern;
}

function drawInterpolatedStars() {
  let t = easeInOutCubic(animationProgress);

  // Draw each star with interpolated values
  let maxStars = max(currentStars.stars.length, targetStars.stars.length);

  for (let i = 0; i < maxStars; i++) {
    let current = currentStars.stars[i] || targetStars.stars[i];
    let target = targetStars.stars[i] || currentStars.stars[i];

    // Interpolate star properties
    let x = lerp(current.x, target.x, t);
    let y = lerp(current.y, target.y, t);
    let size = lerp(current.size, target.size, t);
    let m1 = lerp(current.m1, target.m1, t);
    let m2 = lerp(current.m2, target.m2, t);
    let rotation = lerp(current.rotation, target.rotation, t);
    let vert = current.vert; // Don't interpolate vertex count

    push();
    translate(x, y);
    rotate(rotation * t);

    beginShape();
    let a = TWO_PI / vert;
    for (let v = 0; v < vert; v++) {
      vertex(cos(a * v) * m1 * size, sin(a * v) * m1 * size);
      vertex(cos(a * (v + 0.5)) * m2 * size, sin(a * (v + 0.5)) * m2 * size);
    }
    endShape(CLOSE);
    pop();
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2;
}

function mousePressed() {
  // Force transition to next pattern immediately
  currentStars = targetStars;
  targetStars = generateStarPattern();
  animationProgress = 0;
}

function keyPressed() {
  // Toggle animation with SPACE
  if (key === ' ') {
    isAnimating = !isAnimating;
  }

  // Change stroke width with number keys 1-9
  if (key >= '1' && key <= '9') {
    strokeWidth = int(key);
  }

  // Change animation speed with +/-
  if (key === '+' || key === '=') {
    animationSpeed = min(animationSpeed + 0.005, 0.1);
  }
  if (key === '-' || key === '_') {
    animationSpeed = max(animationSpeed - 0.005, 0.001);
  }

  // Change color with letter keys
  if (key === 'r' || key === 'R') {
    starColor = color(255, 0, 0); // Red
  }
  if (key === 'g' || key === 'G') {
    starColor = color(0, 255, 0); // Green
  }
  if (key === 'b' || key === 'B') {
    starColor = color(0, 0, 255); // Blue
  }
  if (key === 'w' || key === 'W') {
    starColor = color(255, 255, 255); // White
  }
  if (key === 'y' || key === 'Y') {
    starColor = color(255, 255, 0); // Yellow
  }
  if (key === 'c' || key === 'C') {
    starColor = color(0, 255, 255); // Cyan
  }
  if (key === 'm' || key === 'M') {
    starColor = color(255, 0, 255); // Magenta
  }
}
