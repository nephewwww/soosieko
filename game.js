const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
        gameWins: 0
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

function updateCPU() {
    const cpu = players.right;

    if (currentGameState !== GAME_STATES.PLAYING_CPU) {
        return;
    }

    if (ball.x < canvas.width / 2) {
        // Ball is on player's side - move randomly
        if (Math.random() < 0.02) { // 2% chance to change direction each frame
            cpu.speedX = (Math.random() - 0.5) * MOVE_SPEED * 2; // Random direction
        }

        // Keep CPU within reasonable bounds on their side
        if (cpu.x < canvas.width / 2 + 50) {
            cpu.speedX = MOVE_SPEED; // Move right if too close to net
        } else if (cpu.x > canvas.width - cpu.width - 50) {
            cpu.speedX = -MOVE_SPEED; // Move left if too close to wall
        }

        return;
    }

    // Original CPU logic when ball is on their side
    const ballFutureX = ball.x + ball.speedX * 3;
    const ballFutureY = ball.y + ball.speedY * 3;

    // Move towards the ball
    if (ballFutureX < cpu.x + cpu.width / 2 - 10) {
        cpu.speedX = -MOVE_SPEED;
    } else if (ballFutureX > cpu.x + cpu.width / 2 + 10) {
        cpu.speedX = MOVE_SPEED;
    } else {
        cpu.speedX = 0;
    }

    // Jump logic
    const shouldJump = !cpu.isJumping &&
        ball.y < canvas.height - 150 && // Ball is high enough
        Math.abs(ball.x - cpu.x) < 150; // Ball is close enough horizontally

    if (shouldJump) {
        cpu.speedY = JUMP_FORCE;
        cpu.isJumping = true;
    }
}

function movePlayer() {
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

    // Right player controls (only in PVP mode)
    if (currentGameState === GAME_STATES.PLAYING_PVP) {
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
        // Apply gravity
        player.speedY += GRAVITY;

        // Update position
        player.x += player.speedX;
        player.y += player.speedY;

        // Ground collision
        if (player.y > GROUND_Y) {
            player.y = GROUND_Y;
            player.speedY = 0;
            player.isJumping = false;
            player.isSpike1 = false;
            player.isSpike2 = false;
        }

        // Left and right boundaries
        if (player.x < 0) {
            player.x = 0;
        }
        if (player.x > canvas.width - player.width) {
            player.x = canvas.width - player.width;
        }

        // Net collision
        if (player === players.left && player.x + player.width > net.x - net.width / 2) {
            player.x = net.x - net.width / 2 - player.width;
        }
        if (player === players.right && player.x < net.x + net.width / 2) {
            player.x = net.x + net.width / 2;
        }
    });

    // Update animations
    updatePlayerAnimation(players.left);
    updatePlayerAnimation(players.right);
}

function updateBall() {
    // Apply gravity
    ball.speedY += ball.gravity;

    // Apply movement
    ball.x += ball.speedX;
    ball.y += ball.speedY;

    // Apply friction
    ball.speedX *= ball.friction;
    ball.speedY *= ball.friction;

    // Bounce off walls
    if (ball.x + ball.radius > canvas.width) {
        ball.x = canvas.width - ball.radius;
        ball.speedX *= -ball.bounce;
        players.left.score++;
        checkGameWin();
        resetBall();
    }
    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.speedX *= -ball.bounce;
        players.right.score++;
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
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speedX = 0;
    ball.speedY = 0;
    // Reset touches for both players
    players.left.touches = 0;
    players.right.touches = 0;
}

function drawMenu() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = 'black';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Volleyball Game', canvas.width / 2, 100);

    // Menu options
    ctx.font = '24px Arial';

    // Draw buttons
    const buttons = [
        { text: 'Player vs Player', y: 200 },
        { text: 'Player vs CPU', y: 250 }
    ];

    buttons.forEach(button => {
        ctx.fillStyle = 'blue';
        const buttonWidth = 200;
        const buttonHeight = 40;
        const buttonX = canvas.width / 2 - buttonWidth / 2;
        const buttonY = button.y - 30;

        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

        ctx.fillStyle = 'white';
        ctx.fillText(button.text, canvas.width / 2, button.y);
    });
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
    switch (currentGameState) {
        case GAME_STATES.LOADING:
            drawLoadingScreen();
            break;
        case GAME_STATES.MENU:
            drawMenu();
            break;
        case GAME_STATES.PLAYING_PVP:
        case GAME_STATES.PLAYING_CPU:
            movePlayer();
            if (currentGameState === GAME_STATES.PLAYING_CPU) {
                updateCPU();
            }
            updateBall();
            updateScreenShake();
            explosion.update();
            draw();
            break;
    }
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('click', (e) => {
    if (currentGameState === GAME_STATES.MENU) {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Check PvP button
        if (clickX >= 300 && clickX <= 500 && clickY >= 170 && clickY <= 210) {
            currentGameState = GAME_STATES.PLAYING_PVP;
            resetGame();
        }
        // Check PvCPU button
        else if (clickX >= 300 && clickX <= 500 && clickY >= 220 && clickY <= 260) {
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

        // Push players to walls
        players.left.x = 0;
        players.right.x = canvas.width - players.right.width;

        // Add extreme screen shake
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

        // Draw explosion circle
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 100 * this.scale, 0, Math.PI * 2);
        ctx.fill();

        // Draw text
        ctx.font = '48px "Press Start 2P"';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('BOMBAAACLATTTT', canvas.width / 2, canvas.height / 2);

        ctx.restore();
    }
}

const explosion = new ExplosionEffect();

gameLoop(); 