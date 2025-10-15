// Configuración del Canvas
const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

// Variables de orientación
let isPortrait = false;
let canvasBaseWidth = 800;
let canvasBaseHeight = 500;

// Detectar orientación de pantalla
function detectOrientation() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    return height > width; // true = vertical, false = horizontal
}

// Ajustar tamaño del canvas según orientación y tamaño de pantalla
function adjustCanvasSize() {
    isPortrait = detectOrientation();
    
    if (isTouchDevice()) {
        const maxWidth = window.innerWidth * 0.95;
        const maxHeight = window.innerHeight * 0.6; // Dejar espacio para controles
        
        if (isPortrait) {
            // En modo vertical: canvas más estrecho y alto
            canvasBaseWidth = Math.min(maxWidth, 600);
            canvasBaseHeight = Math.min(maxHeight, 400);
            console.log('📱 Modo Vertical detectado');
        } else {
            // En modo horizontal: canvas más ancho
            canvasBaseWidth = Math.min(maxWidth, 800);
            canvasBaseHeight = Math.min(maxHeight, 500);
            console.log('📱 Modo Horizontal detectado');
        }
    } else {
        // Desktop: tamaño fijo
        canvasBaseWidth = 800;
        canvasBaseHeight = 500;
    }
    
    // Aplicar nuevo tamaño
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    canvas.width = canvasBaseWidth;
    canvas.height = canvasBaseHeight;
    
    // Ajustar posiciones de elementos proporcionalmente
    if (oldWidth !== canvasBaseWidth || oldHeight !== canvasBaseHeight) {
        const widthRatio = canvasBaseWidth / oldWidth;
        const heightRatio = canvasBaseHeight / oldHeight;
        
        player.x = canvasBaseWidth - 20;
        player.y = (player.y * heightRatio);
        computer.y = (computer.y * heightRatio);
        ball.x = (ball.x * widthRatio);
        ball.y = (ball.y * heightRatio);
    }
    
    draw();
}

// Establecer el tamaño inicial del canvas
canvas.width = 800;
canvas.height = 500;

// Ajustar al cargar
setTimeout(() => adjustCanvasSize(), 100);

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
const touchSlider = document.getElementById('touchSlider');
const sliderKnob = document.getElementById('sliderKnob');
const levelNumber = document.getElementById('levelNumber');

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

// Variables del control táctil
let isTouching = false;
let touchStartY = 0;
let playerStartY = 0;
const touchSensitivity = 2; // Multiplicador de sensibilidad (mayor = más sensible)

// Variables del slider
let isSliderActive = false;

// Puntuaciones
let playerScore = 0;
let computerScore = 0;
const winningScore = 5;

// Sistema de niveles
let currentLevel = 1;
let computerBaseSpeed = 3; // Velocidad inicial más lenta

// Detectar si es dispositivo táctil (smartphone/tablet)
const isTouchDevice = () => {
    return (('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0) ||
           (navigator.msMaxTouchPoints > 0));
};

// Variables para errores de la computadora en móviles
let computerErrorChance = 0.3; // 30% de probabilidad de error inicial en móviles
let computerReactionDelay = 0;

// Función para obtener posición inicial vertical centrada
function getCenterY() {
    return canvas.height / 2 - 35;
}

// Paleta del jugador (ahora a la derecha)
const player = {
    x: canvas.width - 20,
    y: getCenterY(),
    width: 10,
    height: 70,
    speed: 8,
    dy: 0
};

// Paleta de la computadora (ahora a la izquierda)
const computer = {
    x: 10,
    y: getCenterY(),
    width: 10,
    height: 70,
    speed: 3 // Velocidad inicial baja
};

// Pelota
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 8,
    speed: 5,
    dx: 5,
    dy: 5,
    paused: false // Control de pausa entre puntos
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
    
    // Actualizar posición del slider knob
    updateSliderPosition();
}

// Actualizar posición visual del slider knob
function updateSliderPosition() {
    if (!touchSlider) return;
    
    const sliderHeight = touchSlider.offsetHeight;
    const knobHeight = sliderKnob.offsetHeight;
    const maxY = sliderHeight - knobHeight;
    
    // Calcular posición del knob basada en la posición del jugador
    const playerPercent = player.y / (canvas.height - player.height);
    const knobY = playerPercent * maxY;
    
    sliderKnob.style.top = knobY + 'px';
}

// IA de la computadora
function moveComputer() {
    const computerCenter = computer.y + computer.height / 2;
    
    // En móviles, agregar errores y retrasos según el nivel
    if (isTouchDevice()) {
        // Calcular probabilidad de error basada en el nivel (disminuye al subir)
        computerErrorChance = Math.max(0.05, 0.3 - (currentLevel - 1) * 0.05);
        
        // Agregar un margen de error aleatorio
        const errorMargin = Math.random() < computerErrorChance ? 
            (Math.random() - 0.5) * 100 : 0; // Error de hasta ±50 píxeles
        
        // Zona muerta más grande en niveles bajos (la computadora reacciona peor)
        const deadZone = Math.max(20, 50 - (currentLevel - 1) * 5);
        
        // A veces la computadora "se distrae" y no sigue la pelota
        if (Math.random() < computerErrorChance / 2) {
            // No mover (error/distracción)
            return;
        }
        
        // Seguir la pelota con el error y zona muerta
        const targetY = ball.y + errorMargin;
        
        if (computerCenter < targetY - deadZone) {
            computer.y += computer.speed;
        } else if (computerCenter > targetY + deadZone) {
            computer.y -= computer.speed;
        }
    } else {
        // En desktop, juego normal sin errores
        if (computerCenter < ball.y - 35) {
            computer.y += computer.speed;
        } else if (computerCenter > ball.y + 35) {
            computer.y -= computer.speed;
        }
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
    // No mover la pelota si está pausada
    if (ball.paused) return;
    
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    // Rebote en paredes superior e inferior
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
        ball.dy *= -1;
        playWallHit();
    }
    
    // Colisión con la paleta del jugador (ahora a la derecha)
    if (ball.x + ball.radius > player.x &&
        ball.y > player.y &&
        ball.y < player.y + player.height) {
        
        // Calcular ángulo de rebote basado en dónde golpeó la paleta
        const hitPos = (ball.y - player.y) / player.height;
        const angle = (hitPos - 0.5) * Math.PI / 3; // Máximo 60 grados
        
        ball.dx = -Math.abs(ball.dx);
        ball.dy = ball.speed * Math.sin(angle);
        
        // Aumentar ligeramente la velocidad (menos en móviles)
        const speedIncrease = isTouchDevice() ? 1.02 : 1.05;
        ball.speed *= speedIncrease;
        ball.dx = -ball.speed * Math.cos(angle);
        
        playPaddleHit();
    }
    
    // Colisión con la paleta de la computadora (ahora a la izquierda)
    if (ball.x - ball.radius < computer.x + computer.width &&
        ball.y > computer.y &&
        ball.y < computer.y + computer.height) {
        
        // Calcular ángulo de rebote
        const hitPos = (ball.y - computer.y) / computer.height;
        const angle = (hitPos - 0.5) * Math.PI / 3;
        
        ball.dx = Math.abs(ball.dx);
        ball.dy = ball.speed * Math.sin(angle);
        
        // Aumentar ligeramente la velocidad (menos en móviles)
        const speedIncrease = isTouchDevice() ? 1.02 : 1.05;
        ball.speed *= speedIncrease;
        ball.dx = ball.speed * Math.cos(angle);
        
        playPaddleHit();
    }
    
    // Punto para el jugador (la pelota salió por la izquierda)
    if (ball.x - ball.radius < 0) {
        playerScore++;
        updateScore();
        playScore();
        resetBall(); // Resetear inmediatamente al centro
        ball.paused = true; // Pero mantenerla pausada
        setTimeout(() => {
            ball.paused = false; // Después de 250ms, permitir que se mueva
        }, 250);
        checkWinner();
    }
    
    // Punto para la computadora (la pelota salió por la derecha)
    if (ball.x + ball.radius > canvas.width) {
        computerScore++;
        updateScore();
        playScore();
        resetBall(); // Resetear inmediatamente al centro
        ball.paused = true; // Pero mantenerla pausada
        setTimeout(() => {
            ball.paused = false; // Después de 250ms, permitir que se mueva
        }, 250);
        checkWinner();
    }
}

// Reiniciar la pelota
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    // Velocidad más lenta en dispositivos móviles
    ball.speed = isTouchDevice() ? 3.5 : 5;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * ball.speed;
    ball.dy = (Math.random() - 0.5) * ball.speed;
    // La pelota se coloca en el centro con dirección, pero ball.paused controla si se mueve
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
        currentLevel++;
        levelNumber.textContent = currentLevel;
        const newSpeed = Math.min(computerBaseSpeed + (currentLevel - 1) * 0.5, 7);
        computer.speed = newSpeed;
        
        let message = `🎉 ¡Pasas al Nivel ${currentLevel}! `;
        if (isTouchDevice()) {
            message += 'La computadora será más rápida y cometerá menos errores 🚀';
        } else {
            message += 'La computadora será más rápida 🚀';
        }
        
        endGame(
            `¡Nivel ${currentLevel - 1} Completado!`, 
            message
        );
    } else if (computerScore >= winningScore) {
        playLose();
        endGame('¡Juego Terminado!', `😔 Perdiste en el Nivel ${currentLevel}. ¡Inténtalo de nuevo!`);
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

// Reiniciar juego (reinicia todo, incluyendo nivel)
function resetGame() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    stopBackgroundMusic();
    
    playerScore = 0;
    computerScore = 0;
    currentLevel = 1;
    levelNumber.textContent = currentLevel;
    computer.speed = computerBaseSpeed;
    
    // Reiniciar errores de la computadora en móviles
    if (isTouchDevice()) {
        computerErrorChance = 0.3; // Volver a 30% de error inicial
    }
    
    updateScore();
    
    player.x = canvas.width - 20;
    player.y = getCenterY();
    computer.y = getCenterY();
    resetBall();
    ball.paused = false; // Asegurar que no esté pausada
    
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

// Control táctil directo sobre el canvas (toda la pantalla con sensibilidad amplificada)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameRunning) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchY = touch.clientY - rect.top;
    
    isTouching = true;
    touchStartY = touchY;
    playerStartY = player.y;
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isTouching || !gameRunning) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchY = touch.clientY - rect.top;
    
    // Calcular el movimiento del dedo
    const deltaY = touchY - touchStartY;
    
    // Aplicar sensibilidad amplificada
    const amplifiedDelta = deltaY * touchSensitivity;
    
    // Mover la barra con el delta amplificado
    player.y = playerStartY + amplifiedDelta;
    
    // Limitar a los bordes del canvas
    if (player.y < 0) {
        player.y = 0;
    }
    if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    isTouching = false;
    player.dy = 0;
}, { passive: false });

// Control del slider táctil
sliderKnob.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!gameRunning) return;
    
    isSliderActive = true;
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (!isSliderActive || !gameRunning) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const sliderRect = touchSlider.getBoundingClientRect();
    const touchY = touch.clientY - sliderRect.top;
    
    // Calcular posición del jugador basada en la posición del toque en el slider
    const sliderHeight = touchSlider.offsetHeight;
    const knobHeight = sliderKnob.offsetHeight;
    const maxY = sliderHeight - knobHeight;
    
    // Limitar touchY dentro del slider
    const clampedY = Math.max(0, Math.min(touchY - knobHeight / 2, maxY));
    
    // Calcular posición del jugador
    const percent = clampedY / maxY;
    player.y = percent * (canvas.height - player.height);
    
    // Limitar al canvas
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
    }
    
    updateSliderPosition();
}, { passive: false });

document.addEventListener('touchend', () => {
    isSliderActive = false;
});

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
    // Solo reiniciar puntos, mantener nivel
    playerScore = 0;
    computerScore = 0;
    updateScore();
    player.x = canvas.width - 20;
    player.y = getCenterY();
    computer.y = getCenterY();
    resetBall();
    ball.paused = false; // Asegurar que no esté pausada
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

// Event listeners para cambio de orientación
window.addEventListener('orientationchange', () => {
    console.log('🔄 Cambio de orientación detectado');
    setTimeout(() => {
        adjustCanvasSize();
        updateSliderPosition();
    }, 100);
});

window.addEventListener('resize', () => {
    if (isTouchDevice()) {
        adjustCanvasSize();
        updateSliderPosition();
    }
});

// Dibujar estado inicial
draw();
updateSliderPosition();

