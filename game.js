// Configuración del Canvas
const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

// Establecer el tamaño real del canvas
canvas.width = 800;
canvas.height = 500;

// Elementos del DOM
const playerScoreElement = document.getElementById('playerScore');
const computerScoreElement = document.getElementById('computerScore');
const startButton = document.getElementById('startButton');
const resetButton = document.getElementById('resetButton');
const gameOverModal = document.getElementById('gameOverModal');
const gameOverText = document.getElementById('gameOverText');
const winnerText = document.getElementById('winnerText');
const playAgainButton = document.getElementById('playAgainButton');
const musicToggle = document.getElementById('musicToggle');
const soundToggle = document.getElementById('soundToggle');

// Variables del juego
let gameRunning = false;
let animationId;
let mouseY = canvas.height / 2;

// Sistema de Audio
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let musicEnabled = true;
let soundEnabled = true;
let backgroundMusic = null;
let musicGainNode = null;

// Puntuaciones
let playerScore = 0;
let computerScore = 0;
const winningScore = 10;

// Paleta del jugador
const player = {
    x: 10,
    y: canvas.height / 2 - 35,
    width: 10,
    height: 70,
    speed: 8,
    dy: 0
};

// Paleta de la computadora
const computer = {
    x: canvas.width - 20,
    y: canvas.height / 2 - 35,
    width: 10,
    height: 70,
    speed: 5
};

// Pelota
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 8,
    speed: 5,
    dx: 5,
    dy: 5
};

// Funciones de Audio
function playSound(frequency, duration, type = 'sine') {
    if (!soundEnabled) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function playPaddleHit() {
    playSound(440, 0.1, 'square');
}

function playWallHit() {
    playSound(220, 0.1, 'sine');
}

function playScore() {
    playSound(330, 0.2, 'triangle');
}

function playWin() {
    playSound(523, 0.3, 'sine');
    setTimeout(() => playSound(659, 0.3, 'sine'), 150);
    setTimeout(() => playSound(784, 0.4, 'sine'), 300);
}

function playLose() {
    playSound(392, 0.3, 'sawtooth');
    setTimeout(() => playSound(330, 0.3, 'sawtooth'), 150);
    setTimeout(() => playSound(262, 0.4, 'sawtooth'), 300);
}

function startBackgroundMusic() {
    if (!musicEnabled || backgroundMusic) return;
    
    musicGainNode = audioContext.createGain();
    musicGainNode.gain.value = 0.1;
    musicGainNode.connect(audioContext.destination);
    
    // Crear una melodía de fondo simple
    const notes = [262, 294, 330, 349, 392, 440, 494, 523]; // Do, Re, Mi, Fa, Sol, La, Si, Do
    let noteIndex = 0;
    
    function playNextNote() {
        if (!musicEnabled) return;
        
        const oscillator = audioContext.createOscillator();
        oscillator.connect(musicGainNode);
        oscillator.frequency.value = notes[noteIndex % notes.length];
        oscillator.type = 'triangle';
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        noteIndex++;
        backgroundMusic = setTimeout(playNextNote, 400);
    }
    
    playNextNote();
}

function stopBackgroundMusic() {
    if (backgroundMusic) {
        clearTimeout(backgroundMusic);
        backgroundMusic = null;
    }
    if (musicGainNode) {
        musicGainNode.disconnect();
        musicGainNode = null;
    }
}

// Dibujar rectángulo con bordes redondeados
function drawRoundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// Dibujar la paleta del jugador
function drawPlayer() {
    ctx.fillStyle = '#00ff88';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ff88';
    drawRoundedRect(player.x, player.y, player.width, player.height, 5);
    ctx.shadowBlur = 0;
}

// Dibujar la paleta de la computadora
function drawComputer() {
    ctx.fillStyle = '#ff4757';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff4757';
    drawRoundedRect(computer.x, computer.y, computer.width, computer.height, 5);
    ctx.shadowBlur = 0;
}

// Dibujar la pelota
function drawBall() {
    ctx.fillStyle = '#ffa502';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffa502';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
}

// Dibujar la línea central
function drawCenterLine() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
}

// Dibujar todo
function draw() {
    // Limpiar canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar elementos
    drawCenterLine();
    drawPlayer();
    drawComputer();
    drawBall();
}

// Mover la paleta del jugador
function movePlayer() {
    player.y += player.dy;
    
    // Límites de la pantalla
    if (player.y < 0) {
        player.y = 0;
    }
    if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
    }
}

// IA de la computadora
function moveComputer() {
    // La computadora sigue la pelota
    const computerCenter = computer.y + computer.height / 2;
    
    if (computerCenter < ball.y - 35) {
        computer.y += computer.speed;
    } else if (computerCenter > ball.y + 35) {
        computer.y -= computer.speed;
    }
    
    // Límites de la pantalla
    if (computer.y < 0) {
        computer.y = 0;
    }
    if (computer.y + computer.height > canvas.height) {
        computer.y = canvas.height - computer.height;
    }
}

// Mover la pelota
function moveBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    // Rebote en paredes superior e inferior
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
        ball.dy *= -1;
        playWallHit();
    }
    
    // Colisión con la paleta del jugador
    if (ball.x - ball.radius < player.x + player.width &&
        ball.y > player.y &&
        ball.y < player.y + player.height) {
        
        // Calcular ángulo de rebote basado en dónde golpeó la paleta
        const hitPos = (ball.y - player.y) / player.height;
        const angle = (hitPos - 0.5) * Math.PI / 3; // Máximo 60 grados
        
        ball.dx = Math.abs(ball.dx);
        ball.dy = ball.speed * Math.sin(angle);
        
        // Aumentar ligeramente la velocidad
        ball.speed *= 1.05;
        ball.dx = ball.speed * Math.cos(angle);
        
        playPaddleHit();
    }
    
    // Colisión con la paleta de la computadora
    if (ball.x + ball.radius > computer.x &&
        ball.y > computer.y &&
        ball.y < computer.y + computer.height) {
        
        // Calcular ángulo de rebote
        const hitPos = (ball.y - computer.y) / computer.height;
        const angle = (hitPos - 0.5) * Math.PI / 3;
        
        ball.dx = -Math.abs(ball.dx);
        ball.dy = ball.speed * Math.sin(angle);
        
        // Aumentar ligeramente la velocidad
        ball.speed *= 1.05;
        ball.dx = -ball.speed * Math.cos(angle);
        
        playPaddleHit();
    }
    
    // Punto para la computadora
    if (ball.x - ball.radius < 0) {
        computerScore++;
        updateScore();
        resetBall();
        playScore();
        checkWinner();
    }
    
    // Punto para el jugador
    if (ball.x + ball.radius > canvas.width) {
        playerScore++;
        updateScore();
        resetBall();
        playScore();
        checkWinner();
    }
}

// Reiniciar la pelota
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speed = 5;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * ball.speed;
    ball.dy = (Math.random() - 0.5) * ball.speed;
}

// Actualizar puntuación
function updateScore() {
    playerScoreElement.textContent = playerScore;
    computerScoreElement.textContent = computerScore;
}

// Verificar ganador
function checkWinner() {
    if (playerScore >= winningScore) {
        playWin();
        endGame('¡Felicidades! ¡Has ganado!', '🎉 Eres el campeón del Pong 🎉');
    } else if (computerScore >= winningScore) {
        playLose();
        endGame('¡Juego Terminado!', '😔 La computadora ha ganado. ¡Inténtalo de nuevo!');
    }
}

// Finalizar juego
function endGame(title, message) {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    stopBackgroundMusic();
    gameOverText.textContent = title;
    winnerText.textContent = message;
    gameOverModal.classList.add('active');
}

// Loop principal del juego
function gameLoop() {
    if (!gameRunning) return;
    
    movePlayer();
    moveComputer();
    moveBall();
    draw();
    
    animationId = requestAnimationFrame(gameLoop);
}

// Iniciar juego
function startGame() {
    if (gameRunning) return;
    
    // Reanudar el contexto de audio si está suspendido
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    gameRunning = true;
    startButton.textContent = 'Pausar';
    startBackgroundMusic();
    gameLoop();
}

// Pausar juego
function pauseGame() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    startButton.textContent = 'Reanudar';
    stopBackgroundMusic();
}

// Reiniciar juego
function resetGame() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    stopBackgroundMusic();
    
    playerScore = 0;
    computerScore = 0;
    updateScore();
    
    player.y = canvas.height / 2 - 35;
    computer.y = canvas.height / 2 - 35;
    resetBall();
    
    startButton.textContent = 'Iniciar Juego';
    draw();
}

// Control con el mouse desactivado - usar solo teclado
// canvas.addEventListener('mousemove', (e) => {
//     const rect = canvas.getBoundingClientRect();
//     mouseY = e.clientY - rect.top;
//     
//     if (gameRunning) {
//         player.y = mouseY - player.height / 2;
//     }
// });

// Control con teclado
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
        e.preventDefault(); // Prevenir el scroll de la página
        player.dy = -player.speed;
    } else if (e.key === 'ArrowDown') {
        e.preventDefault(); // Prevenir el scroll de la página
        player.dy = player.speed;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault(); // Prevenir el scroll de la página
        player.dy = 0;
    }
});

// Control táctil para dispositivos móviles
canvas.addEventListener('touchstart', handleTouch, { passive: false });
canvas.addEventListener('touchmove', handleTouch, { passive: false });
canvas.addEventListener('touchend', () => {
    player.dy = 0;
}, { passive: false });

function handleTouch(e) {
    e.preventDefault();
    if (!gameRunning) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchY = touch.clientY - rect.top;
    
    // Mover la paleta hacia la posición del toque
    const targetY = touchY - player.height / 2;
    
    if (targetY < player.y - 10) {
        player.dy = -player.speed;
    } else if (targetY > player.y + 10) {
        player.dy = player.speed;
    } else {
        player.dy = 0;
    }
}

// Botones
startButton.addEventListener('click', () => {
    if (gameRunning) {
        pauseGame();
    } else {
        startGame();
    }
});

resetButton.addEventListener('click', resetGame);

playAgainButton.addEventListener('click', () => {
    gameOverModal.classList.remove('active');
    resetGame();
    startGame();
});

// Controles de audio
musicToggle.addEventListener('click', () => {
    musicEnabled = !musicEnabled;
    musicToggle.textContent = musicEnabled ? '🎵' : '🔇';
    musicToggle.setAttribute('title', musicEnabled ? 'Desactivar música' : 'Activar música');
    
    if (!musicEnabled) {
        stopBackgroundMusic();
    } else if (gameRunning) {
        startBackgroundMusic();
    }
});

soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
    soundToggle.setAttribute('title', soundEnabled ? 'Desactivar efectos' : 'Activar efectos');
});

// Dibujar estado inicial
draw();

