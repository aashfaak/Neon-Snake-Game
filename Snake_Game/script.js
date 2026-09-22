// Game Setup & Canvas Context
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

// Constants
const GRID_SIZE = 20; // 30x30 tiles on 600x600 canvas
const TILE_COUNT = canvas.width / GRID_SIZE;

// Game State Variables
let snake = [];
let food = { x: 0, y: 0, isSpecial: false };
let velocity = { x: 0, y: 0 };
let nextVelocity = { x: 0, y: 0 };
let score = 0;
let highScore = localStorage.getItem("snake_high_score") || 0;
let gameSpeed = 90; // Default Medium
let gameInterval = null;
let isPaused = false;
let isGameOver = false;
let particles = [];

// Audio Context (Synthesizer)
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
}

function playSound(freq, type = "sine", duration = 0.1, gainVal = 0.1) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Ignore audio errors if blocked
  }
}

// UI Elements
const scoreEl = document.getElementById("score-val");
const highScoreEl = document.getElementById("high-score-val");
const startOverlay = document.getElementById("start-overlay");
const pauseOverlay = document.getElementById("pause-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const finalScoreEl = document.getElementById("final-score");

highScoreEl.textContent = highScore;

// Initialize Game
function resetGame() {
  snake = [
    { x: 10, y: 15 },
    { x: 9, y: 15 },
    { x: 8, y: 15 }
  ];
  velocity = { x: 1, y: 0 };
  nextVelocity = { x: 1, y: 0 };
  score = 0;
  scoreEl.textContent = score;
  particles = [];
  spawnFood();
  isGameOver = false;
  isPaused = false;
}

function spawnFood() {
  let validPosition = false;
  while (!validPosition) {
    food.x = Math.floor(Math.random() * TILE_COUNT);
    food.y = Math.floor(Math.random() * TILE_COUNT);
    validPosition = !snake.some(segment => segment.x === food.x && segment.y === food.y);
  }
  food.isSpecial = Math.random() < 0.2; // 20% chance for bonus food
}

function startGame() {
  initAudio();
  resetGame();
  startOverlay.classList.remove("active");
  gameoverOverlay.classList.remove("active");
  pauseOverlay.classList.remove("active");
  
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(gameLoop, gameSpeed);
}

function togglePause() {
  if (isGameOver) return;
  isPaused = !isPaused;
  if (isPaused) {
    pauseOverlay.classList.add("active");
  } else {
    pauseOverlay.classList.remove("active");
  }
}

// Particle System
function createParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x * GRID_SIZE + GRID_SIZE / 2,
      y: y * GRID_SIZE + GRID_SIZE / 2,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 1.0,
      color: color
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.05;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// Game Loop
function gameLoop() {
  if (isPaused) return;

  // Update Direction
  velocity = { ...nextVelocity };

  // Calculate New Head Position
  const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };

  // Wall Collision Check
  if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
    handleGameOver();
    return;
  }

  // Self Collision Check
  if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
    handleGameOver();
    return;
  }

  snake.unshift(head);

  // Check Food Collision
  if (head.x === food.x && head.y === food.y) {
    const points = food.isSpecial ? 30 : 10;
    score += points;
    scoreEl.textContent = score;

    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = highScore;
      localStorage.setItem("snake_high_score", highScore);
    }

    createParticles(food.x, food.y, food.isSpecial ? "#ffe600" : "#ff0055", 15);
    playSound(food.isSpecial ? 600 : 440, "square", 0.15);
    spawnFood();
  } else {
    snake.pop(); // Remove tail if no food eaten
  }

  draw();
}

function handleGameOver() {
  clearInterval(gameInterval);
  isGameOver = true;
  playSound(150, "sawtooth", 0.4);
  createParticles(snake[0].x, snake[0].y, "#00f3ff", 30);
  finalScoreEl.textContent = `FINAL SCORE: ${score}`;
  gameoverOverlay.classList.add("active");
}

// Render Functions
function draw() {
  // Clear Canvas
  ctx.fillStyle = "#050608";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Subtle Grid Lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 1;
  for (let i = 0; i < TILE_COUNT; i++) {
    ctx.beginPath();
    ctx.moveTo(i * GRID_SIZE, 0);
    ctx.lineTo(i * GRID_SIZE, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * GRID_SIZE);
    ctx.lineTo(canvas.width, i * GRID_SIZE);
    ctx.stroke();
  }

  // Draw Food
  ctx.save();
  ctx.fillStyle = food.isSpecial ? "#ffe600" : "#ff0055";
  ctx.shadowColor = food.isSpecial ? "#ffe600" : "#ff0055";
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(
    food.x * GRID_SIZE + GRID_SIZE / 2,
    food.y * GRID_SIZE + GRID_SIZE / 2,
    GRID_SIZE / 2 - 2,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();

  // Draw Snake
  snake.forEach((segment, index) => {
    ctx.save();
    const isHead = index === 0;
    ctx.fillStyle = isHead ? "#ffffff" : "#00f3ff";
    ctx.shadowColor = "#00f3ff";
    ctx.shadowBlur = isHead ? 15 : 8;

    ctx.fillRect(
      segment.x * GRID_SIZE + 1,
      segment.y * GRID_SIZE + 1,
      GRID_SIZE - 2,
      GRID_SIZE - 2
    );
    ctx.restore();
  });

  // Render Explosion Particles
  updateParticles();
  drawParticles();
}

// Controls & Event Listeners
function handleDirectionChange(dx, dy) {
  // Prevent 180-degree reverse turns
  if (dx !== 0 && velocity.x === -dx) return;
  if (dy !== 0 && velocity.y === -dy) return;
  nextVelocity = { x: dx, y: dy };
}

window.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      handleDirectionChange(0, -1);
      break;
    case "ArrowDown":
    case "s":
    case "S":
      handleDirectionChange(0, 1);
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      handleDirectionChange(-1, 0);
      break;
    case "ArrowRight":
    case "d":
    case "D":
      handleDirectionChange(1, 0);
      break;
    case "p":
    case "P":
    case " ":
      togglePause();
      break;
  }
});

// UI Buttons
document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("restart-btn").addEventListener("click", startGame);
document.getElementById("resume-btn").addEventListener("click", togglePause);

// Difficulty Selection
document.querySelectorAll(".diff-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    gameSpeed = parseInt(e.target.dataset.speed);
  });
});

// Mobile Controls
document.getElementById("btn-up").addEventListener("click", () => handleDirectionChange(0, -1));
document.getElementById("btn-down").addEventListener("click", () => handleDirectionChange(0, 1));
document.getElementById("btn-left").addEventListener("click", () => handleDirectionChange(-1, 0));
document.getElementById("btn-right").addEventListener("click", () => handleDirectionChange(1, 0));
document.getElementById("btn-pause").addEventListener("click", togglePause);