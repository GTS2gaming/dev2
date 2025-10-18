// 2D Action Game
let canvas, ctx;
let player, bullets = [], enemies = [], powerups = [], allies = [];
let keys = {}, mouse = { x: 0, y: 0 };
let gameRunning = false;
let health = 100, ammo = 30, score = 0, wave = 1;
let enemySpawnTimer = 0, powerupSpawnTimer = 0;
let enemiesKilledThisWave = 0, enemiesNeededForWave = 10;
let mouseHeld = false, shootTimer = 0;
let currentCharacter = 0;

const characters = [
    { name: 'Soldier', color: '#00FF00', speed: 5, health: 100, fireRate: 8 },
    { name: 'Tank', color: '#0088FF', speed: 3, health: 150, fireRate: 12 },
    { name: 'Scout', color: '#FFFF00', speed: 7, health: 75, fireRate: 6 },
    { name: 'Sniper', color: '#FF6600', speed: 4, health: 80, fireRate: 20 },
    { name: 'Medic', color: '#FF69B4', speed: 5, health: 90, fireRate: 10 }
];

function startAction() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('ui').style.display = 'block';
    document.getElementById('gameCanvas').style.display = 'block';
    
    initGame();
    gameLoop();
}

function goHome() {
    window.location.href = 'index.html';
}

function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Initialize player
    const char = characters[currentCharacter];
    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        width: 30,
        height: 30,
        speed: char.speed,
        angle: 0,
        maxHealth: char.health,
        fireRate: char.fireRate
    };
    
    health = char.health;
    
    // Reset game state
    bullets = [];
    enemies = [];
    powerups = [];
    health = 100;
    ammo = 30;
    score = 0;
    wave = 1;
    gameRunning = true;
    
    setupControls();
    updateUI();
}

function setupControls() {
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyF') {
            spawnAlly();
        } else if (e.code === 'KeyC') {
            changeCharacter();
        }
    });
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });
    
    canvas.addEventListener('mousedown', (e) => {
        if (gameRunning) {
            mouseHeld = true;
            shoot(); // Shoot immediately on click
        }
    });
    
    canvas.addEventListener('mouseup', (e) => {
        mouseHeld = false;
    });
    
    // Also handle mouse leaving canvas
    canvas.addEventListener('mouseleave', (e) => {
        mouseHeld = false;
    });
}

function shoot(targetX = mouse.x, targetY = mouse.y) {
    const angle = Math.atan2(targetY - player.y, targetX - player.x);
    
    bullets.push({
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        vx: Math.cos(angle) * 10,
        vy: Math.sin(angle) * 10,
        width: 5,
        height: 5
    });
}

function spawnAlly() {
    const angle = Math.random() * Math.PI * 2;
    const distance = 60;
    
    const ally = {
        x: player.x + Math.cos(angle) * distance,
        y: player.y + Math.sin(angle) * distance,
        width: 25,
        height: 25,
        speed: 3,
        angle: 0,
        shootTimer: 0,
        followDistance: 50 + Math.random() * 30
    };
    
    // Keep ally in bounds
    ally.x = Math.max(ally.width, Math.min(canvas.width - ally.width, ally.x));
    ally.y = Math.max(ally.height, Math.min(canvas.height - ally.height, ally.y));
    
    allies.push(ally);
    showMessage(`Ally spawned! (${allies.length} total)`);
}

function updateAllies() {
    allies.forEach(ally => {
        // Follow player
        const dx = player.x - ally.x;
        const dy = player.y - ally.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > ally.followDistance) {
            ally.x += (dx / distance) * ally.speed;
            ally.y += (dy / distance) * ally.speed;
        }
        
        // Auto-shoot at enemies
        ally.shootTimer++;
        if (ally.shootTimer > 15 && enemies.length > 0) {
            // Find nearest enemy to ally
            let nearestEnemy = null;
            let nearestDistance = Infinity;
            
            enemies.forEach(enemy => {
                const edx = enemy.x - ally.x;
                const edy = enemy.y - ally.y;
                const edist = Math.sqrt(edx * edx + edy * edy);
                
                if (edist < nearestDistance && edist < 200) { // 200px range
                    nearestDistance = edist;
                    nearestEnemy = enemy;
                }
            });
            
            if (nearestEnemy) {
                const targetX = nearestEnemy.x + nearestEnemy.width / 2;
                const targetY = nearestEnemy.y + nearestEnemy.height / 2;
                ally.angle = Math.atan2(targetY - ally.y, targetX - ally.x);
                
                // Ally shoots
                bullets.push({
                    x: ally.x + ally.width / 2,
                    y: ally.y + ally.height / 2,
                    vx: Math.cos(ally.angle) * 8,
                    vy: Math.sin(ally.angle) * 8,
                    width: 4,
                    height: 4,
                    isAlly: true
                });
                
                ally.shootTimer = 0;
            }
        }
    });
}

function drawAllies() {
    allies.forEach(ally => {
        ctx.save();
        ctx.translate(ally.x + ally.width / 2, ally.y + ally.height / 2);
        ctx.rotate(ally.angle);
        
        // Ally body (purple)
        ctx.fillStyle = '#9C27B0';
        ctx.fillRect(-ally.width / 2, -ally.height / 2, ally.width, ally.height);
        
        // Gun barrel
        ctx.fillStyle = '#666666';
        ctx.fillRect(ally.width / 2 - 5, -2, 12, 4);
        
        ctx.restore();
        
        // Ally indicator
        ctx.fillStyle = '#FFFF00';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ALLY', ally.x + ally.width / 2, ally.y - 8);
    });
}

function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(side) {
        case 0: x = Math.random() * canvas.width; y = -30; break;
        case 1: x = canvas.width + 30; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height + 30; break;
        case 3: x = -30; y = Math.random() * canvas.height; break;
    }
    
    enemies.push({
        x: x,
        y: y,
        width: 25,
        height: 25,
        speed: 1 + wave * 0.5,
        health: 2 + Math.floor(wave / 3),
        maxHealth: 2 + Math.floor(wave / 3),
        type: Math.random() > 0.8 ? 'fast' : 'normal'
    });
}

function spawnPowerup() {
    const types = ['health', 'ammo', 'speed'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    powerups.push({
        x: Math.random() * (canvas.width - 60) + 30,
        y: Math.random() * (canvas.height - 60) + 30,
        width: 30,
        height: 30,
        type: type,
        timer: 600 // 10 seconds at 60fps
    });
}

function updatePlayer() {
    // Movement
    if (keys['KeyW'] && player.y > 0) player.y -= player.speed;
    if (keys['KeyS'] && player.y < canvas.height - player.height) player.y += player.speed;
    if (keys['KeyA'] && player.x > 0) player.x -= player.speed;
    if (keys['KeyD'] && player.x < canvas.width - player.width) player.x += player.speed;
    
    // Rotation towards mouse
    player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        
        // Remove bullets that go off screen
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(i, 1);
        }
    }
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Move towards player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const speed = enemy.type === 'fast' ? enemy.speed * 2 : enemy.speed;
            enemy.x += (dx / distance) * speed;
            enemy.y += (dy / distance) * speed;
        }
        
        // Check collision with player
        if (checkCollision(enemy, player)) {
            health -= 10;
            enemies.splice(i, 1);
            updateUI();
            
            if (health <= 0) {
                gameOver();
                return;
            }
            
            // Medic auto-heal
            if (characters[currentCharacter].name === 'Medic' && health < player.maxHealth) {
                if (Math.random() < 0.01) { // 1% chance per frame
                    health = Math.min(player.maxHealth, health + 1);
                    updateUI();
                }
            }
        }
        
        // Check collision with bullets
        for (let j = bullets.length - 1; j >= 0; j--) {
            if (checkCollision(bullets[j], enemy)) {
                enemy.health--;
                bullets.splice(j, 1);
                
                if (enemy.health <= 0) {
                    score += enemy.type === 'fast' ? 15 : 10;
                    enemies.splice(i, 1);
                    enemiesKilledThisWave++;
                    updateUI();
                }
                break;
            }
        }
    }
}

function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        powerup.timer--;
        
        // Remove expired powerups
        if (powerup.timer <= 0) {
            powerups.splice(i, 1);
            continue;
        }
        
        // Check collision with player
        if (checkCollision(powerup, player)) {
            switch(powerup.type) {
                case 'health':
                    health = Math.min(player.maxHealth, health + 25);
                    break;
                case 'ammo':
                    // Ammo is unlimited, give score bonus instead
                    score += 50;
                    break;
                case 'speed':
                    player.speed = Math.min(8, player.speed + 1);
                    break;
            }
            powerups.splice(i, 1);
            updateUI();
        }
    }
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    
    // Manual aim
    player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    ctx.rotate(player.angle);
    
    // Player body (character color)
    const char = characters[currentCharacter];
    ctx.fillStyle = char.color;
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
    
    // Gun barrel (different sizes for different characters)
    ctx.fillStyle = '#666666';
    if (char.name === 'Tank') {
        ctx.fillRect(player.width / 2 - 5, -4, 18, 8); // Bigger gun
    } else if (char.name === 'Sniper') {
        ctx.fillRect(player.width / 2 - 5, -2, 20, 4); // Long gun
    } else {
        ctx.fillRect(player.width / 2 - 5, -3, 15, 6); // Normal gun
    }
    
    ctx.restore();
    
    // Character name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(char.name, player.x + player.width / 2, player.y - 10);
    
    // Health bar
    const healthPercent = health / player.maxHealth;
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(player.x, player.y - 25, player.width, 4);
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(player.x, player.y - 25, player.width * healthPercent, 4);
}

function drawBullets() {
    ctx.fillStyle = '#FFFF00';
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function drawEnemies() {
    enemies.forEach(enemy => {
        // Enemy body
        ctx.fillStyle = enemy.type === 'fast' ? '#FF6600' : '#FF0000';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // Health bar
        const healthPercent = enemy.health / enemy.maxHealth;
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(enemy.x, enemy.y - 8, enemy.width, 4);
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(enemy.x, enemy.y - 8, enemy.width * healthPercent, 4);
    });
}

function drawPowerups() {
    powerups.forEach(powerup => {
        const colors = { health: '#FF69B4', ammo: '#FFD700', speed: '#00BFFF' };
        
        // Draw powerup box
        ctx.fillStyle = colors[powerup.type];
        ctx.fillRect(powerup.x, powerup.y, powerup.width, powerup.height);
        
        // Draw border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(powerup.x, powerup.y, powerup.width, powerup.height);
        
        // Draw symbol based on type
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        
        if (powerup.type === 'health') {
            ctx.fillText('HP', powerup.x + powerup.width / 2, powerup.y + powerup.height / 2 + 4);
        } else if (powerup.type === 'ammo') {
            ctx.fillText('AMO', powerup.x + powerup.width / 2, powerup.y + powerup.height / 2 + 4);
        } else if (powerup.type === 'speed') {
            ctx.fillText('SPD', powerup.x + powerup.width / 2, powerup.y + powerup.height / 2 + 4);
        }
    });
}

function drawBackground() {
    // Grid pattern
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function changeCharacter() {
    currentCharacter = (currentCharacter + 1) % characters.length;
    const char = characters[currentCharacter];
    
    // Update player stats
    player.speed = char.speed;
    player.maxHealth = char.health;
    player.fireRate = char.fireRate;
    health = char.health;
    
    showMessage(`Character: ${char.name}`);
    updateUI();
}

function updateUI() {
    const char = characters[currentCharacter];
    document.getElementById('health').textContent = `${health}/${player.maxHealth}`;
    document.getElementById('ammo').textContent = `∞ (${allies.length} allies)`;
    document.getElementById('score').textContent = score;
    document.getElementById('wave').textContent = `${wave} (${enemiesKilledThisWave}/${enemiesNeededForWave})`;
}

function showWaveMessage(text) {
    // Create wave complete message
    const messageDiv = document.createElement('div');
    messageDiv.style.position = 'absolute';
    messageDiv.style.top = '30%';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translate(-50%, -50%)';
    messageDiv.style.background = 'rgba(0, 255, 0, 0.9)';
    messageDiv.style.color = 'white';
    messageDiv.style.padding = '20px 40px';
    messageDiv.style.borderRadius = '10px';
    messageDiv.style.zIndex = '2000';
    messageDiv.style.fontSize = '24px';
    messageDiv.style.fontWeight = 'bold';
    messageDiv.textContent = text;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) messageDiv.parentNode.removeChild(messageDiv);
    }, 3000);
}

function gameOver() {
    gameRunning = false;
    
    // Draw game over screen
    setTimeout(() => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
        
        ctx.font = '24px Arial';
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2);
        ctx.fillText(`Wave Reached: ${wave}`, canvas.width / 2, canvas.height / 2 + 30);
        ctx.fillText('Click to restart', canvas.width / 2, canvas.height / 2 + 80);
        
        canvas.addEventListener('click', restartGame, { once: true });
    }, 100);
}

function restartGame() {
    canvas.removeEventListener('click', restartGame);
    
    // Reset all game variables
    bullets = [];
    enemies = [];
    powerups = [];
    allies = [];
    health = 100;
    ammo = 30;
    score = 0;
    wave = 1;
    enemySpawnTimer = 0;
    powerupSpawnTimer = 0;
    enemiesKilledThisWave = 0;
    enemiesNeededForWave = 10;
    mouseHeld = false;
    shootTimer = 0;
    gameRunning = true;
    
    // Reset player position
    const char = characters[currentCharacter];
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.speed = char.speed;
    player.maxHealth = char.health;
    player.fireRate = char.fireRate;
    health = char.health;
    
    updateUI();
    gameLoop();
}

function gameLoop() {
    if (!gameRunning) return;
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawBackground();
    
    // Update game objects
    updatePlayer();
    updateBullets();
    updateEnemies();
    updatePowerups();
    
    // Update allies
    updateAllies();
    
    // Hold-to-shoot mode
    if (mouseHeld) {
        shootTimer++;
        if (shootTimer > player.fireRate) {
            shoot();
            shootTimer = 0;
        }
    }
    
    // Spawn enemies
    enemySpawnTimer++;
    if (enemySpawnTimer > Math.max(60 - wave * 5, 20)) {
        spawnEnemy();
        enemySpawnTimer = 0;
    }
    
    // Spawn powerups
    powerupSpawnTimer++;
    if (powerupSpawnTimer > 300) { // Every 5 seconds
        spawnPowerup();
        powerupSpawnTimer = 0;
    }
    
    // Check wave progression
    if (enemiesKilledThisWave >= enemiesNeededForWave) {
        wave++;
        enemiesKilledThisWave = 0;
        enemiesNeededForWave += 5; // Need 5 more enemies each wave
        
        // Clear remaining enemies and give wave bonus
        enemies.length = 0;
        score += wave * 100;
        
        // Show wave complete message
        showWaveMessage(`Wave ${wave - 1} Complete! Bonus: ${(wave - 1) * 100}`);
        
        updateUI();
    }
    
    // Draw everything
    drawPlayer();
    drawAllies();
    drawBullets();
    drawEnemies();
    drawPowerups();
    
    if (gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});