const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Create Audio objects for the hit and reset sounds
const hitSound = new Audio('hit.mp3');
const resetSound = new Audio('reset.mp3');
const explosionSound = new Audio('bigexplosion.wav');

// Game objects
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    speedX: 0,
    speedY: 0,
    gravity: 0.3,
    bounce: 0.8,
    friction: 0.98,
    rotation: 0,
    rotationSpeed: 0
};

const net = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 5,
    height: 100
};

const sprites = {
    left: {
        run: [
            new Image(),
            new Image(),
            new Image(),
            new Image()
        ],
        spike: [
            new Image(),
            new Image()
        ],
        hit: [
            new Image(),
            new Image(),
            new Image(),
            new Image()
        ]
    },
    right: {
        run: [
            new Image(),
            new Image(),
            new Image()
        ],
        spike: [
            new Image(),
            new Image()
        ],
        hit: [
            new Image(),
            new Image(),
            new Image(),
            new Image()
        ]
    }
};

// Load left player sprites with new filenames
sprites.left.run[0].src = 'run-1.png';
sprites.left.run[1].src = 'run-2.png';
sprites.left.run[2].src = 'run-3.png';
sprites.left.run[3].src = 'run-4.png';
sprites.left.spike[0].src = 'spike-1.png';
sprites.left.spike[1].src = 'spike-2.png';

// Load right player sprites (assuming they're the same but need to be flipped)
sprites.right.run[0].src = 'run1.png';
sprites.right.run[1].src = 'run2.png';
sprites.right.run[2].src = 'run3.png';
sprites.right.spike[0].src = 'spike.png';
sprites.right.spike[1].src = 'spike2.png';

// Add these after the existing sprite loading
sprites.left.hit[0].src = 'hit1.png';
sprites.left.hit[1].src = 'hit2.png';
sprites.left.hit[2].src = 'hit3.png';
sprites.left.hit[3].src = 'hit4.png';

sprites.right.hit[0].src = 'hit1.png';
sprites.right.hit[1].src = 'hit2.png';
sprites.right.hit[2].src = 'hit3.png';
sprites.right.hit[3].src = 'hit4.png';

const players = {
    left: {
        x: canvas.width / 4,
        y: canvas.height - 50,
        width: 40,
        height: 60,
        speedX: 0,
        speedY: 0,
        isJumping: false,
        isSpike1: false,
        isSpike2: false,
        score: 0,
        touches: 0,
        maxTouches: 2,
        animationFrame: 0,
        animationTimer: 0,
        isHitting: false,
        hitTimer: 0,
        gameWins: 0
    },
    right: {
        x: (canvas.width / 4) * 3,
        y: canvas.height - 50,
        width: 40,
        height: 60,
        speedX: 0,
        speedY: 0,
        isJumping: false,
        isSpike1: false,
        isSpike2: false,
        score: 0,
        touches: 0,
        maxTouches: 2,
        animationFrame: 0,
        animationTimer: 0,
        isHitting: false,
        hitTimer: 0,
        gameWins: 0,
        lastSpinScore: 0
    }
};

// Input handling
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

// Physics constants
const GRAVITY = 0.5;
const JUMP_FORCE = -15;
const MOVE_SPEED = 5;
const GROUND_Y = canvas.height - 50; // Ground level for players

const GAME_STATES = {
    LOADING: 'loading',
    MENU: 'menu',
    CHARACTER_SELECT: 'character_select',
    PLAYING_PVP: 'playing_pvp',
    PLAYING_CPU: 'playing_cpu'
};

// Set initial state to loading
let currentGameState = GAME_STATES.LOADING;

let imagesLoaded = 0;
const totalImages = 19; // 7 run frames (4 left + 3 right) + 4 spike frames + 8 hit frames

function handleImageLoad() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        // All images loaded, switch to menu
        currentGameState = GAME_STATES.MENU;
    }
}

function handleImageError(e) {
    console.error('Error loading image:', e.target.src);
    // Still count failed loads to prevent infinite loading
    handleImageLoad();
}

// Add load and error handlers to all sprites
Object.values(sprites).forEach(side => {
    side.run.forEach(img => {
        img.onload = handleImageLoad;
        img.onerror = handleImageError;
    });
    side.spike.forEach(img => {
        img.onload = handleImageLoad;
        img.onerror = handleImageError;
    });
    side.hit.forEach(img => {
        img.onload = handleImageLoad;
        img.onerror = handleImageError;
    });
});

// Add this after setting up image loading
setTimeout(() => {
    if (currentGameState === GAME_STATES.LOADING) {
        console.warn('Loading took too long, forcing menu display');
        currentGameState = GAME_STATES.MENU;
    }
}, 5000); // 5 second timeout

// Global variable to hold the selected character side in CPU mode
// It can be either 'left' (human is left and CPU is right) 
// or 'right' (human is right and CPU is left)
let selectedCharacter = 'left';

// Global variables to manage the love letter pause.
let lovePause = {
    active: false,
    timer: 0,
    message: ""
};

// Decide randomly (in frames) when the next love pause should occur.
let nextLovePause = Math.floor(Math.random() * 1200) + 600;

// Global variable for the spinning wheel pause.
let spinningWheel = {
    active: false,
    timer: 0,
    angle: 0,
    prize: "",
    ready: false,
    angularVelocity: 0 // New property to control fluid rotation
};

let prizeMessage = {
    text: "",
    color: "",
    alpha: 0,        // fully transparent by default
    duration: 0      // number of frames remaining before complete disappearance
};

function movePlayer() {
    if (currentGameState === GAME_STATES.PLAYING_CPU) {
        // If human is playing as "left"
        if (selectedCharacter === 'left') {
            // Human controls left player using A, D, W
            if (keys['a']) {
                players.left.speedX = -MOVE_SPEED;
            } else if (keys['d']) {
                players.left.speedX = MOVE_SPEED;
            } else {
                players.left.speedX = 0;
            }
            if (keys['w'] && !players.left.isJumping) {
                players.left.speedY = JUMP_FORCE;
                players.left.isJumping = true;
                players.left.isSpike1 = true;
                players.left.isSpike2 = false;
            }
        }
        // If human is playing as "right"
        else if (selectedCharacter === 'right') {
            // Human controls right player using arrow keys
            if (keys['ArrowLeft']) {
                players.right.speedX = -MOVE_SPEED;
            } else if (keys['ArrowRight']) {
                players.right.speedX = MOVE_SPEED;
            } else {
                players.right.speedX = 0;
            }
            if (keys['ArrowUp'] && !players.right.isJumping) {
                players.right.speedY = JUMP_FORCE;
                players.right.isJumping = true;
                players.right.isSpike1 = true;
                players.right.isSpike2 = false;
            }
        }
    } else if (currentGameState === GAME_STATES.PLAYING_PVP) {
        // Left player controls (A, D, W)
        if (keys['a']) {
            players.left.speedX = -MOVE_SPEED;
        } else if (keys['d']) {
            players.left.speedX = MOVE_SPEED;
        } else {
            players.left.speedX = 0;
        }
        if (keys['w'] && !players.left.isJumping) {
            players.left.speedY = JUMP_FORCE;
            players.left.isJumping = true;
            players.left.isSpike1 = true;
            players.left.isSpike2 = false;
        }
        // Right player controls (Arrow keys)
        if (keys['ArrowLeft']) {
            players.right.speedX = -MOVE_SPEED;
        } else if (keys['ArrowRight']) {
            players.right.speedX = MOVE_SPEED;
        } else {
            players.right.speedX = 0;
        }
        if (keys['ArrowUp'] && !players.right.isJumping) {
            players.right.speedY = JUMP_FORCE;
            players.right.isJumping = true;
            players.right.isSpike1 = true;
            players.right.isSpike2 = false;
        }
    }

    // Apply physics to both players
    [players.left, players.right].forEach(player => {
        player.speedY += GRAVITY;
        player.x += player.speedX;
        player.y += player.speedY;

        if (player.y > GROUND_Y) {
            player.y = GROUND_Y;
            player.speedY = 0;
            player.isJumping = false;
            player.isSpike1 = false;
            player.isSpike2 = false;
        }

        // Boundary checks
        if (player.x < 0) player.x = 0;
        if (player.x > canvas.width - player.width)
            player.x = canvas.width - player.width;

        // Net collision
        if (player === players.left && player.x + player.width > net.x - net.width / 2)
            player.x = net.x - net.width / 2 - player.width;
        if (player === players.right && player.x < net.x + net.width / 2)
            player.x = net.x + net.width / 2;
    });

    // Update animations for each player
    updatePlayerAnimation(players.left);
    updatePlayerAnimation(players.right);
}

function updateCPU() {
    if (currentGameState !== GAME_STATES.PLAYING_CPU) return;

    let cpu, human;
    // Setup based on the human's selection
    if (selectedCharacter === 'left') {
        // Human controls left, so CPU controls right.
        human = players.left;
        cpu = players.right;
    } else { // selectedCharacter === 'right'
        // Human controls right, so CPU controls left.
        human = players.right;
        cpu = players.left;
    }

    let cpuCenter = cpu.x + cpu.width / 2;

    if (selectedCharacter === 'left') {
        // Human is left—CPU is on the right side.
        if (ball.x > canvas.width / 2) {
            // When the ball is on the CPU's side, move directly toward the ball.
            const ballFutureX = ball.x + ball.speedX * 3;
            if (ballFutureX < cpuCenter - 10)
                cpu.speedX = -MOVE_SPEED;
            else if (ballFutureX > cpuCenter + 10)
                cpu.speedX = MOVE_SPEED;
            else
                cpu.speedX = 0;
        } else {
            // When the ball is on the human's side, do random movement.
            if (Math.random() < 0.02)
                cpu.speedX = (Math.random() - 0.5) * MOVE_SPEED * 2;
        }
    } else {
        // selectedCharacter === 'right'
        // Human is right, so CPU (players.left) is on the left side.
        if (ball.x < canvas.width / 2) {
            // When the ball is on its side, move toward it.
            const ballFutureX = ball.x + ball.speedX * 3;
            if (ballFutureX < cpuCenter - 10)
                cpu.speedX = -MOVE_SPEED;
            else if (ballFutureX > cpuCenter + 10)
                cpu.speedX = MOVE_SPEED;
            else
                cpu.speedX = 0;
        } else {
            // When the ball is on the human's side, do random movement.
            if (Math.random() < 0.02)
                cpu.speedX = (Math.random() - 0.5) * MOVE_SPEED * 2;
        }
    }

    // CPU jump (same for both sides)
    if (!cpu.isJumping && ball.y < canvas.height - 150 && Math.abs(ball.x - cpu.x) < 150) {
        cpu.speedY = JUMP_FORCE;
        cpu.isJumping = true;
    }
}

function updateBall() {
    // Apply gravity
    ball.speedY += ball.gravity;
    ball.x += ball.speedX;
    ball.y += ball.speedY;

    // Apply friction
    ball.speedX *= ball.friction;
    ball.speedY *= ball.friction;

    // Bounce off right wall
    if (ball.x + ball.radius > canvas.width) {
        ball.x = canvas.width - ball.radius;
        ball.speedX *= -ball.bounce;
        players.left.score++;
        checkGameWin();
        resetBall();
    }

    // Bounce off left wall
    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.speedX *= -ball.bounce;
        players.right.score++;

        // Every 5 points for player 2 triggers the prize wheel
        if (players.right.score % 5 === 0 && players.right.score !== players.right.lastSpinScore) {
            players.right.lastSpinScore = players.right.score;
            triggerSpinningWheel();
        }

        checkGameWin();
        resetBall();
    }

    // Bounce off floor
    if (ball.y + ball.radius > canvas.height) {
        ball.y = canvas.height - ball.radius;
        ball.speedY *= -ball.bounce;

        // Add a minimum vertical speed to keep the ball bouncing
        if (Math.abs(ball.speedY) < 4) {
            ball.speedY = -4;
        }

        // Reduce horizontal speed more on floor contact
        ball.speedX *= 0.95;
    }
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.speedY *= -ball.bounce;
    }

    // Collision with net
    if (ball.x + ball.radius > net.x - net.width / 2 &&
        ball.x - ball.radius < net.x + net.width / 2 &&
        ball.y + ball.radius > net.y) {
        ball.speedX *= -ball.bounce;
        if (ball.x < net.x) {
            ball.x = net.x - net.width / 2 - ball.radius;
        } else {
            ball.x = net.x + net.width / 2 + ball.radius;
        }
    }

    // Track last hit time for each player
    let lastHitTime = { left: 0, right: 0 };
    const CLASH_THRESHOLD = 5; // frames

    // Collision with players
    [players.left, players.right].forEach(player => {
        if (ball.x + ball.radius > player.x &&
            ball.x - ball.radius < player.x + player.width &&
            ball.y + ball.radius > player.y &&
            ball.y - ball.radius < player.y + player.height) {

            // Play hit sound
            hitSound.play();

            // Reset opponent's touches when this player hits the ball
            if (player === players.left) {
                players.right.touches = 0;
            } else {
                players.left.touches = 0;
            }

            // Increment this player's touches
            player.touches++;

            // Check if exceeded max touches
            if (player.touches > player.maxTouches) {
                if (player === players.left) {
                    players.right.score++;
                } else {
                    players.left.score++;
                }
                checkGameWin();
                resetBall();
                return;
            }

            // Calculate collision angle
            const collisionPoint = (ball.y - (player.y + player.height / 2)) / (player.height / 2);
            const angleRad = (Math.PI / 4) * collisionPoint;

            // Calculate new velocities
            const speed = Math.sqrt(ball.speedX * ball.speedX + ball.speedY * ball.speedY);
            let newSpeed = Math.max(speed, 8);

            // Add extra power if player is in the air
            const isInAir = player.y < GROUND_Y;
            if (isInAir) {
                newSpeed *= 1.5;
                ball.speedY = -18;
                ball.rotationSpeed = newSpeed * 0.03;
                const horizontalBoost = 1.3;
                ball.speedX *= horizontalBoost;
            } else {
                ball.speedY = -12;
                ball.rotationSpeed = newSpeed * 0.02;
            }

            // Increase power for the second touch
            if (player.touches === 2) {
                newSpeed *= 1.5; // Increase speed by 50%
                ball.speedY *= 1.5; // Increase vertical speed
                ball.rotationSpeed *= 1.5; // Increase rotation speed
            }

            // Direction depends on which player hit the ball
            const direction = (player === players.left) ? 1 : -1;
            ball.speedX = direction * newSpeed * Math.cos(angleRad);

            // Move ball outside of player to prevent multiple collisions
            if (direction === 1) {
                ball.x = player.x + player.width + ball.radius;
            } else {
                ball.x = player.x - ball.radius;
            }

            // Update player state
            player.isSpike1 = false;
            player.isSpike2 = true;
            player.isHitting = true;
            player.hitTimer = 0;

            // Add screen shake
            screenShake.intensity = 10;
            screenShake.duration = 10;

            // Add hit effect
            hitEffects.push(new HitEffect(ball.x, ball.y - 30));

            if (player === players.left) {
                lastHitTime.left = Date.now();
                if (Date.now() - lastHitTime.right < CLASH_THRESHOLD * (1000 / 60)) {
                    // CLASH!
                    explosion.start();
                    ball.speedX = 0;
                    ball.speedY = -20;
                    ball.y = canvas.height / 2;
                }
            } else {
                lastHitTime.right = Date.now();
                if (Date.now() - lastHitTime.left < CLASH_THRESHOLD * (1000 / 60)) {
                    // CLASH!
                    explosion.start();
                    ball.speedX = 0;
                    ball.speedY = -20;
                    ball.y = canvas.height / 2;
                }
            }
        }
    });

    // Update rotation
    ball.rotation += ball.rotationSpeed;

    if (spinningWheel.active) {
        spinningWheel.timer--;
        spinningWheel.angle += spinningWheel.angularVelocity;
        spinningWheel.angularVelocity *= 0.98; // Gradually decelerate for a fluid effect
        if (spinningWheel.timer <= 0) {
            applySpinningWheelPrize();
            spinningWheel.active = false;
        }
    }
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speedX = 0;
    ball.speedY = 0;
    // Reset touches for both players
    players.left.touches = 0;
    players.right.touches = 0;
    // Play reset sound
    resetSound.play();
}

function drawMenu() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Updated title with a Valentine's twist
    ctx.fillStyle = 'pink';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("THE ULTIMATE TEST OF TEZAK", canvas.width / 2, 100);

    // Define button size and positioning
    const buttonWidth = 200;
    const buttonHeight = 40;
    const buttonX = (canvas.width - buttonWidth) / 2;
    const startY = 200;

    // Button 1: "Player vs Player" – using a hot pink background and a heart icon in the text
    ctx.fillStyle = '#FF69B4';
    ctx.fillRect(buttonX, startY, buttonWidth, buttonHeight);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('Player vs Player', canvas.width / 2, startY + 28);

    // Button 2: "Player vs CPU" – similar styling with a different heart icon
    ctx.fillStyle = '#FF69B4';
    ctx.fillRect(buttonX, startY + 60, buttonWidth, buttonHeight);
    ctx.fillStyle = 'white';
    ctx.fillText('Player vs CPU', canvas.width / 2, startY + 60 + 28);
}

function drawCharacterSelect() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = 'black';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Select Your Character', canvas.width / 2, 80);

    // Left Character Option (using left.spike[1] which is spike-2.png)
    const leftX = canvas.width / 4 - 40;
    const leftY = 150;
    if (sprites.left.spike[1] && sprites.left.spike[1].complete) {
        ctx.drawImage(sprites.left.spike[1], leftX, leftY, 80, 120);
    } else {
        ctx.fillStyle = 'blue';
        ctx.fillRect(leftX, leftY, 80, 120);
    }
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText('Player 1', canvas.width / 4, leftY + 140);

    // Right Character Option (using right.spike[1] which is spike2.png)
    const rightWidth = 90;
    const rightX = canvas.width * 3 / 4 - rightWidth / 2;
    const rightY = 150;
    if (sprites.right.spike[1] && sprites.right.spike[1].complete) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(sprites.right.spike[1], -(canvas.width * 3 / 4 + rightWidth / 2), rightY, rightWidth, 120);
        ctx.restore();
    } else {
        ctx.fillStyle = 'red';
        ctx.fillRect(rightX, rightY, rightWidth, 120);
    }
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText('Player 2', canvas.width * 3 / 4, rightY + 140);
}

function drawPixelHeart(x, y, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Scale for pixel art effect
    const scale = 2;
    ctx.scale(scale, scale);

    // Draw pixel heart
    ctx.fillStyle = '#FF0000';
    const pixels = [
        [-2, -3], [-1, -3], [1, -3], [2, -3],
        [-3, -2], [-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [3, -2],
        [-3, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1],
        [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0],
        [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1],
        [-1, 2], [0, 2], [1, 2],
        [0, 3]
    ];

    pixels.forEach(([px, py]) => {
        ctx.fillRect(px, py, 1, 1);
    });

    ctx.restore();
}

function drawPlayer(player, isRight) {
    ctx.save();

    // Position for drawing
    const x = player.x;
    const y = player.y;

    // Flip context if it's the right player
    if (isRight) {
        ctx.scale(-1, 1);
        ctx.translate(-x - player.width, y);
    } else {
        ctx.translate(x, y);
    }

    let sprite;
    if (player.isSpike2) {
        sprite = sprites[isRight ? 'right' : 'left'].spike[1]; // spike2.png
    } else if (player.isSpike1) {
        sprite = sprites[isRight ? 'right' : 'left'].spike[0]; // spike.png
    } else if (player.speedX !== 0) {
        sprite = sprites[isRight ? 'right' : 'left'].run[player.animationFrame];
    } else {
        sprite = sprites[isRight ? 'right' : 'left'].run[0];
    }

    // Draw fallback rectangle if sprite isn't loaded or is broken
    if (!sprite || !sprite.complete || sprite.naturalHeight === 0) {
        ctx.fillStyle = isRight ? 'red' : 'blue';
        ctx.fillRect(-player.width / 2, 0, player.width, player.height);
    } else {
        // Draw the sprite with stretched width
        const stretchedWidth = player.width * 2; // Double the width
        ctx.drawImage(sprite, -stretchedWidth / 2, 0, stretchedWidth, player.height);
    }

    ctx.restore();
}

function drawLoadingScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw loading text
    ctx.fillStyle = 'black';
    ctx.font = '48px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('LOADING...', canvas.width / 2, canvas.height / 2);

    // Draw loading bar
    const barWidth = 300;
    const barHeight = 20;
    const barX = (canvas.width - barWidth) / 2;
    const barY = canvas.height / 2 + 40;

    // Border
    ctx.strokeStyle = 'black';
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Fill
    const fillWidth = (imagesLoaded / totalImages) * barWidth;
    ctx.fillStyle = 'blue';
    ctx.fillRect(barX, barY, fillWidth, barHeight);

    // Loading percentage
    ctx.font = '24px "Press Start 2P"';
    ctx.fillStyle = 'black';
    ctx.fillText(Math.round((imagesLoaded / totalImages) * 100) + '%',
        canvas.width / 2, barY + 60);
}

function draw() {
    // Apply screen shake
    ctx.save();
    ctx.translate(screenShake.offsetX, screenShake.offsetY);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw touch counters first (behind everything)
    ctx.font = '48px "Press Start 2P", monospace';
    ctx.globalAlpha = 0.3;

    // Left player touches
    ctx.fillStyle = 'blue';
    ctx.textAlign = 'left';
    ctx.fillText(players.left.touches + '/' + players.left.maxTouches,
        20, canvas.height - 20);

    // Right player touches
    ctx.fillStyle = 'red';
    ctx.textAlign = 'right';
    ctx.fillText(players.right.touches + '/' + players.right.maxTouches,
        canvas.width - 20, canvas.height - 20);

    // Draw game wins counter (in middle, small and transparent)
    ctx.font = '20px "Press Start 2P"';
    ctx.globalAlpha = 0.4;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'black';
    ctx.fillText(players.left.gameWins + ' GAMES ' + players.right.gameWins,
        canvas.width / 2, 30);

    ctx.globalAlpha = 1.0;

    // Draw net
    ctx.fillStyle = 'white';
    ctx.fillRect(net.x - net.width / 2, net.y, net.width, net.height);

    // Draw players
    drawPlayer(players.left, false);
    drawPlayer(players.right, true);

    // Draw ball
    drawPixelHeart(ball.x, ball.y, ball.rotation);

    // Draw scores (current game)
    ctx.font = '24px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText(players.left.score, canvas.width / 4, 50);
    ctx.fillText(players.right.score, (canvas.width / 4) * 3, 50);

    // Draw hit effects
    hitEffects.forEach((effect, index) => {
        if (!effect.update()) {
            hitEffects.splice(index, 1);
        } else {
            effect.draw(ctx);
        }
    });

    // Draw explosion effect on top of everything
    explosion.draw(ctx);

    ctx.restore();
}

function gameLoop() {
    if (currentGameState === GAME_STATES.MENU) {
        drawMenu();
    } else if (currentGameState === GAME_STATES.CHARACTER_SELECT) {
        drawCharacterSelect();
    } else if (currentGameState === GAME_STATES.PLAYING_PVP || currentGameState === GAME_STATES.PLAYING_CPU) {
        movePlayer();
        if (currentGameState === GAME_STATES.PLAYING_CPU) {
            updateCPU();
        }
        updateBall();
        updateScreenShake();
        explosion.update();

        // Love pause update...
        if (lovePause.active) {
            lovePause.timer--;
            if (lovePause.timer <= 0) {
                lovePause.active = false;
                nextLovePause = Math.floor(Math.random() * 1200) + 600;
            }
        } else {
            nextLovePause--;
            if (nextLovePause <= 0) {
                startLovePause();
            }
        }

        // Update spinning wheel if active...
        if (spinningWheel.active) {
            spinningWheel.timer--;
            spinningWheel.angle += spinningWheel.angularVelocity;
            if (spinningWheel.timer <= 0) {
                applySpinningWheelPrize();
                spinningWheel.active = false;
            }
        }

        draw();

        if (lovePause.active) {
            drawLoveMessageWatermark();
        }
        drawPrizeWheelUI();

        // Update and draw the prize message overlay with fade effect
        updatePrizeMessage();
        drawPrizeMessage();
    }
    requestAnimationFrame(gameLoop);
}

// ----- CLICK HANDLER -----
// This click handler covers both the MENU and CHARACTER_SELECT states.
// No swapping of player objects now occurs—instead, selectedCharacter is used later
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Define the prize wheel area (an 80×80 square with a 10px margin)
    const margin = 10;
    const wheelRadius = 40;
    const boxX = canvas.width - margin - 2 * wheelRadius;
    const boxY = margin;
    const boxSize = 2 * wheelRadius;

    if ((currentGameState === GAME_STATES.PLAYING_PVP || currentGameState === GAME_STATES.PLAYING_CPU) &&
        clickX >= boxX && clickX <= boxX + boxSize &&
        clickY >= boxY && clickY <= boxY + boxSize) {
        if (spinningWheel.ready) {
            startSpinningWheelSpin();
        }
        return; // Prevent further click processing.
    }

    if (currentGameState === GAME_STATES.MENU) {
        const buttonWidth = 200;
        const buttonHeight = 40;
        const buttonX = (canvas.width - buttonWidth) / 2;
        const startY = 200;

        // "Player vs Player" button
        if (clickX >= buttonX && clickX <= buttonX + buttonWidth &&
            clickY >= startY && clickY <= startY + buttonHeight) {
            currentGameState = GAME_STATES.PLAYING_PVP;
            resetGame();
        }
        // "Player vs CPU" button
        else if (clickX >= buttonX && clickX <= buttonX + buttonWidth &&
            clickY >= startY + 60 && clickY <= startY + 60 + buttonHeight) {
            currentGameState = GAME_STATES.CHARACTER_SELECT;
        }

    } else if (currentGameState === GAME_STATES.CHARACTER_SELECT) {
        // Define character selection hit areas
        const leftAreaX = canvas.width / 4 - 40;
        const leftAreaY = 150;
        const leftAreaWidth = 80;
        const leftAreaHeight = 120;

        const rightAreaX = canvas.width * 3 / 4 - 40;
        const rightAreaY = 150;
        const rightAreaWidth = 80;
        const rightAreaHeight = 120;

        if (clickX >= leftAreaX && clickX <= leftAreaX + leftAreaWidth &&
            clickY >= leftAreaY && clickY <= leftAreaY + leftAreaHeight) {
            selectedCharacter = 'left';
            currentGameState = GAME_STATES.PLAYING_CPU;
            resetGame();
        } else if (clickX >= rightAreaX && clickX <= rightAreaX + rightAreaWidth &&
            clickY >= rightAreaY && clickY <= rightAreaY + rightAreaHeight) {
            selectedCharacter = 'right';
            currentGameState = GAME_STATES.PLAYING_CPU;
            resetGame();
        }
    }
});

function resetGame() {
    // Reset scores but keep game wins
    players.left.score = 0;
    players.right.score = 0;

    // Reset positions
    players.left.x = canvas.width / 4;
    players.right.x = (canvas.width / 4) * 3;
    players.left.y = players.right.y = GROUND_Y;

    // Reset ball
    resetBall();
}

function updatePlayerAnimation(player) {
    if (player.speedX !== 0) {
        player.animationTimer++;
        if (player.animationTimer > 5) {
            player.animationTimer = 0;
            // Use 4 frames for left player, 3 frames for right player
            const maxFrames = (player === players.left) ? 4 : 3;
            player.animationFrame = (player.animationFrame + 1) % maxFrames;
        }
    } else {
        player.animationFrame = 0;
        player.animationTimer = 0;
    }

    if (player.isHitting) {
        player.hitTimer++;
        if (player.hitTimer > 10) {
            player.isHitting = false;
            player.hitTimer = 0;
        }
    }
}

function checkGameWin() {
    if (players.left.score >= 10) {
        players.left.gameWins++;
        resetGame();
    } else if (players.right.score >= 10) {
        players.right.gameWins++;
        resetGame();
    }
}

const screenShake = {
    intensity: 0,
    duration: 0,
    offsetX: 0,
    offsetY: 0
};

const hitEffects = [];

class HitEffect {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.frame = 0;
        this.frameTimer = 0;
        this.frameSpeed = 3; // Adjust this to control animation speed
    }

    update() {
        this.frameTimer++;
        if (this.frameTimer >= this.frameSpeed) {
            this.frame++;
            this.frameTimer = 0;
        }
        return this.frame < 4; // Return false when animation is complete
    }

    draw(ctx) {
        const sprite = sprites.left.hit[this.frame];
        if (sprite && sprite.complete && sprite.naturalHeight !== 0) {
            ctx.drawImage(sprite, this.x - 25, this.y - 25, 50, 50); // Adjust size as needed
        }
    }
}

function updateScreenShake() {
    if (screenShake.duration > 0) {
        screenShake.duration--;
        screenShake.offsetX = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.offsetY = (Math.random() - 0.5) * screenShake.intensity;
    } else {
        screenShake.offsetX = 0;
        screenShake.offsetY = 0;
    }
}

class ExplosionEffect {
    constructor() {
        this.active = false;
        this.duration = 60; // frames
        this.currentFrame = 0;
        this.scale = 1;
        this.opacity = 1;
    }

    start() {
        this.active = true;
        this.currentFrame = 0;
        this.scale = 1;
        this.opacity = 1;

        // Play the explosion sound
        explosionSound.play();

        // Push players to walls – dramatic love burst!
        players.left.x = 0;
        players.right.x = canvas.width - players.right.width;

        // Add an intense screen shake for extra impact
        screenShake.intensity = 30;
        screenShake.duration = 30;
    }

    update() {
        if (!this.active) return;
        this.currentFrame++;
        this.scale += 0.1;
        this.opacity = 1 - (this.currentFrame / this.duration);
        if (this.currentFrame >= this.duration) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.globalAlpha = this.opacity;

        // Use a hot pink color for the explosion circle
        ctx.fillStyle = '#FF69B4';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 100 * this.scale, 0, Math.PI * 2);
        ctx.fill();

        // Draw a Valentine's themed message near the explosion center
        ctx.font = '48px "Press Start 2P"';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('BOMBAAACLATTTT', canvas.width / 2, canvas.height / 2);
        ctx.restore();
    }
}

const explosion = new ExplosionEffect();

// ===== NEW FUNCTIONS FOR THE SPINNING WHEEL =====
// When triggered from the score event, make the prize wheel visible and ready.
function triggerSpinningWheel() {
    spinningWheel.ready = true;
    spinningWheel.active = false; // not spinning yet
    spinningWheel.angle = 0;
    spinningWheel.timer = 0;
    spinningWheel.prize = "";
}

// Called when the player clicks on the prize wheel area.
function startSpinningWheelSpin() {
    spinningWheel.ready = false;
    spinningWheel.active = true;
    spinningWheel.timer = 180; // Approximately 3 seconds for the spin animation
    spinningWheel.angle = 0;
    spinningWheel.angularVelocity = 1; // Set an initial angular velocity for smoother animation
    // Determine the outcome: 3.14% chance for "Mystery", else "Lose"
    if (Math.random() < 0.0314) {
        spinningWheel.prize = "Mystery";
    } else {
        spinningWheel.prize = "Lose";
    }
}

function applySpinningWheelPrize() {
    console.log("Prize Wheel Outcome: " + spinningWheel.prize);
    if (spinningWheel.prize === "Mystery") {
        prizeMessage.text = "YOU WON!";
        prizeMessage.color = '#00FF00';
    } else {
        prizeMessage.text = "TRY AGAIN LATER";
        prizeMessage.color = '#FF0000';
    }
    prizeMessage.alpha = 1;  // fully visible
    prizeMessage.duration = 240; // keep the message for 180 frames (~3 seconds) then fade over the last 60 frames
}

// ===== NEW FUNCTIONS FOR THE LOVE PAUSE =====
function startLovePause() {
    lovePause.active = true;
    lovePause.timer = 180; // Pause for 180 frames (~3 seconds)
    const messages = [
        "Dear SooSoo, you make my heart skip a beat!",
        "Roses are red, violets are blue, my love blossoms when I see you!",
        "You are the spark that ignites my passion.",
        "Every moment with you is a beautiful dream.",
        "You are the reason behind my smiles!",
        "I love you more than words can say!",
        "You are the sunshine of my life!",
        "I cherish every moment we spend together!",
        "You make my heart skip a beat every time I see you!",
        "I'm so lucky to have you in my life!",
        "You are the apple of my eye!",
        "I'm so happy to be with you!",
        "You are the best thing that ever happened to me!",
        "I'm so grateful for our friendship!",
        "You are the light of my life!",
        "I'm so thankful for your love!",
        "You are the joy of my life!"
    ];
    lovePause.message = messages[Math.floor(Math.random() * messages.length)];
}

// ===== NEW OVERLAY DRAW FUNCTIONS =====
function drawLoveMessageWatermark() {
    ctx.save();
    ctx.font = '24px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 105, 180, 0.3)';
    ctx.fillText(lovePause.message, canvas.width / 2, canvas.height / 2);
    ctx.restore();
}

function drawPrizeWheelUI() {
    // Only draw if the wheel is displayed (ready or actively spinning)
    if (!spinningWheel.ready && !spinningWheel.active) return;
    ctx.save();
    const margin = 10;
    const wheelRadius = 50; // Increase the prize wheel size
    const wheelCenterX = canvas.width - margin - wheelRadius;
    const wheelCenterY = margin + wheelRadius;
    ctx.translate(wheelCenterX, wheelCenterY);

    // Use the current spinning angle if active; otherwise—a ready wheel remains static.
    const currentAngle = spinningWheel.active ? spinningWheel.angle : 0;
    ctx.rotate(currentAngle);

    // Draw Mystery segment (tiny wedge)
    const mysteryAngle = 2 * Math.PI * 0.0314; // ~0.197 radians (~11.3°)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, wheelRadius, 0, mysteryAngle, false);
    ctx.closePath();
    ctx.fillStyle = "#FF1493";
    ctx.fill();

    // Draw Lose segment (the rest of the circle)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, wheelRadius, mysteryAngle, 2 * Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = "#FFC0CB";
    ctx.fill();

    // Draw the outer outline.
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, wheelRadius, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw a divider line between segments.
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(wheelRadius * Math.cos(mysteryAngle), wheelRadius * Math.sin(mysteryAngle));
    ctx.stroke();

    // Draw text labels for each segment.
    ctx.fillStyle = "white";
    ctx.font = "8px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // "MYSTERY" label placed approximately in the middle of its wedge.
    const midAngleMyst = mysteryAngle / 2;
    const textX = (wheelRadius / 2) * Math.cos(midAngleMyst);
    const textY = (wheelRadius / 2) * Math.sin(midAngleMyst);
    ctx.fillText("MYSTERY", textX, textY);

    // "LOSE" label placed in the middle of the lose segment.
    const midAngleLose = mysteryAngle + (2 * Math.PI - mysteryAngle) / 2;
    const textX2 = (wheelRadius / 2) * Math.cos(midAngleLose);
    const textY2 = (wheelRadius / 2) * Math.sin(midAngleLose);
    ctx.fillText("LOSE", textX2, textY2);

    ctx.restore();
}

function updatePrizeMessage() {
    if (prizeMessage.text !== "") {
        // Decrease the duration each frame
        if (prizeMessage.duration > 0) {
            prizeMessage.duration--;
            // If in the fading-out phase (say the last 60 frames), update alpha
            if (prizeMessage.duration < 60) {
                prizeMessage.alpha = prizeMessage.duration / 60;
            }
        } else {
            // Once complete, reset the prize message
            prizeMessage.text = "";
            prizeMessage.alpha = 0;
        }
    }
}

function drawPrizeMessage() {
    if (prizeMessage.text !== "") {
        ctx.save();
        ctx.globalAlpha = prizeMessage.alpha;
        ctx.font = '52px "Press Start 2P"';
        ctx.fillStyle = prizeMessage.color;
        ctx.textAlign = 'center';
        ctx.fillText(prizeMessage.text, canvas.width / 2, canvas.height / 2);
        ctx.restore();
    }
}

gameLoop();