// 3D Action Game
let scene, camera, renderer;
let player, bullets = [], enemies = [], powerups = [], allies = [];
let keys = {}, mouse = { x: 0, y: 0 };
let gameRunning = false;
let health = 100, maxHealth = 100, ammo = 30, maxAmmo = 30, score = 0, wave = 1;
let enemySpawnTimer = 0, powerupSpawnTimer = 0;
let enemiesKilledThisWave = 0, enemiesNeededForWave = 10;
let mouseHeld = false, shootTimer = 0;
let currentCharacter = 0;

// Obby-style movement variables
let velocity = { x: 0, y: 0, z: 0 };
let onGround = false;
let jumpHeld = false;
let isWalking = false;
let walkTime = 0;
let speedMultiplier = 1;

// Camera controls
let yaw = 0, pitch = 0;
const sensitivity = 0.002;
let zoom = 75; // Default FOV
const minZoom = 30; // Max zoom in (narrow FOV)
const maxZoom = 120; // Max zoom out (wide FOV)
const zoomSpeed = 5;
let crosshair;

// Game objects
let arena, playerMesh;
let muzzleFlash = null;

const characters = [
    { name: 'Soldier', color: 0x00FF00, speed: 8, health: 100, fireRate: 8, damage: 25 },
    { name: 'Tank', color: 0x0088FF, speed: 5, health: 150, fireRate: 12, damage: 40 },
    { name: 'Scout', color: 0xFFFF00, speed: 12, health: 75, fireRate: 6, damage: 20 },
    { name: 'Sniper', color: 0xFF6600, speed: 6, health: 80, fireRate: 20, damage: 60 },
    { name: 'Medic', color: 0xFF69B4, speed: 7, health: 90, fireRate: 10, damage: 15 }
];

function startAction() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('ui').style.display = 'block';
    document.getElementById('gameCanvas').style.display = 'block';

    initGame();
    animate();
}

function goHome() {
    window.location.href = 'index.html';
}

function initGame() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 50, 200);

    camera = new THREE.PerspectiveCamera(zoom, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('gameCanvas').appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Arena setup
    createArena();
    createPlayer();

    // Reset game state
    bullets = [];
    enemies = [];
    powerups = [];
    allies = [];
    health = characters[currentCharacter].health;
    maxHealth = health;
    ammo = 999; // Give unlimited ammo for now
    maxAmmo = 999;
    score = 0;
    wave = 1;
    enemiesKilledThisWave = 0;
    enemiesNeededForWave = 10;
    gameRunning = true;

    // Reset movement variables
    velocity = { x: 0, y: 0, z: 0 };
    onGround = false;
    jumpHeld = false;
    isWalking = false;
    walkTime = 0;
    speedMultiplier = 1;

    setupControls();
    updateUI();

    // Spawn a test enemy immediately for testing
    setTimeout(() => {
        spawnEnemy();
    }, 1000);

    // Show wave notification
    showWaveNotification(`Wave ${wave} - Survive!`);
}

function createArena() {
    // Main floor
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshLambertMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.8
    });
    arena = new THREE.Mesh(floorGeometry, floorMaterial);
    arena.rotation.x = -Math.PI / 2;
    arena.receiveShadow = true;
    scene.add(arena);

    // Arena walls
    const wallHeight = 10;
    const wallGeometry = new THREE.BoxGeometry(2, wallHeight, 100);
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });

    // Create 4 walls
    const walls = [
        { x: 51, z: 0 },   // Right wall
        { x: -51, z: 0 },  // Left wall
        { x: 0, z: 51 },   // Back wall
        { x: 0, z: -51 }   // Front wall
    ];

    walls.forEach((pos, index) => {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(pos.x, wallHeight / 2, pos.z);
        if (index >= 2) wall.rotation.y = Math.PI / 2; // Rotate front/back walls
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
    });

    // Add some cover objects
    for (let i = 0; i < 8; i++) {
        const coverGeometry = new THREE.BoxGeometry(3, 4, 3);
        const coverMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const cover = new THREE.Mesh(coverGeometry, coverMaterial);

        const angle = (i / 8) * Math.PI * 2;
        const radius = 20 + Math.random() * 15;
        cover.position.set(
            Math.cos(angle) * radius,
            2,
            Math.sin(angle) * radius
        );
        cover.castShadow = true;
        cover.receiveShadow = true;
        scene.add(cover);
    }
}

function createPlayer() {
    const char = characters[currentCharacter];

    // Player body
    const bodyGeometry = new THREE.BoxGeometry(1, 2, 1);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: char.color });
    playerMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    playerMesh.position.set(0, 1, 0);
    playerMesh.castShadow = true;
    scene.add(playerMesh);

    // Player head
    const headGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 2.5, 0);
    head.castShadow = true;
    playerMesh.add(head);

    // Weapon (make it more visible for first-person)
    const weaponGeometry = new THREE.BoxGeometry(0.3, 0.3, 2);
    const weaponMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    weapon.position.set(0.8, 0.5, -1); // Position relative to camera
    weapon.castShadow = true;

    // Add weapon directly to camera for first-person view
    camera.add(weapon);

    player = {
        mesh: playerMesh,
        speed: char.speed,
        health: char.health,
        fireRate: char.fireRate,
        damage: char.damage
    };

    // Position camera at player eye level (first-person)
    camera.position.set(0, 2.6, 0);
    camera.lookAt(0, 2.6, -1);
}

function setupControls() {
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;

        if (e.code === 'KeyF') {
            spawnAlly();
        } else if (e.code === 'KeyC') {
            changeCharacter();
        } else if (e.code === 'KeyR') {
            reload();
        }

        // Speed boost
        if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
            speedMultiplier = 2;
            updateUI(); // Update speed indicator
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;

        // Reset speed boost
        if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
            speedMultiplier = 1;
            updateUI(); // Update speed indicator
        }
    });

    // Mouse controls - attach to document for better compatibility
    document.addEventListener('click', (e) => {
        if (gameRunning && e.target === renderer.domElement) {
            // First click locks pointer, subsequent clicks shoot
            if (!document.pointerLockElement) {
                document.body.requestPointerLock();
            }
            mouseHeld = true;
            shoot();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement && gameRunning) {
            yaw -= e.movementX * sensitivity;
            pitch -= e.movementY * sensitivity;
            pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

            // Update camera rotation
            camera.rotation.order = 'YXZ';
            camera.rotation.y = yaw;
            camera.rotation.x = pitch;
        } else {
            // Update crosshair position when not locked
            crosshair.style.left = e.clientX + 'px';
            crosshair.style.top = e.clientY + 'px';
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (gameRunning && e.target === renderer.domElement) {
            mouseHeld = true;
            shoot();
        }
    });

    document.addEventListener('mouseup', (e) => {
        mouseHeld = false;
    });

    // Also add keyboard shooting as backup
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && gameRunning) {
            shoot();
        }
    });

    // Scroll wheel zoom
    document.addEventListener('wheel', (e) => {
        if (gameRunning && e.target === renderer.domElement) {
            e.preventDefault();

            // Zoom in/out based on scroll direction
            if (e.deltaY > 0) {
                // Scroll down - zoom out (increase FOV)
                zoom = Math.min(maxZoom, zoom + zoomSpeed);
            } else {
                // Scroll up - zoom in (decrease FOV)
                zoom = Math.max(minZoom, zoom - zoomSpeed);
            }

            // Update camera FOV
            camera.fov = zoom;
            camera.updateProjectionMatrix();

            // Update crosshair size based on zoom
            const crosshairSize = Math.max(10, Math.min(30, zoom / 3));
            crosshair.style.width = crosshairSize + 'px';
            crosshair.style.height = crosshairSize + 'px';

            // Update UI
            updateUI();

            console.log('Zoom level:', zoom);
        }
    }, { passive: false });

    // Create crosshair
    crosshair = document.getElementById('crosshair');
}

function updatePlayer() {
    if (!player || !gameRunning) return;

    const char = characters[currentCharacter];
    const speed = 0.05 * speedMultiplier * char.speed;

    // Calculate movement vectors based on camera direction (where you're looking)
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);

    // Apply camera rotation to get the actual forward and right directions
    forward.applyQuaternion(camera.quaternion);
    right.applyQuaternion(camera.quaternion);

    // Keep movement horizontal (ignore Y component for ground-based movement)
    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();

    // Movement input handling
    isWalking = false;
    if (keys['KeyW']) {
        velocity.x += forward.x * speed;
        velocity.z += forward.z * speed;
        isWalking = true;
        console.log('W pressed - moving forward', { forward: forward });
    }
    if (keys['KeyS']) {
        velocity.x -= forward.x * speed;
        velocity.z -= forward.z * speed;
        isWalking = true;
        console.log('S pressed - moving backward', { forward: forward });
    }
    if (keys['KeyA']) {
        velocity.x -= right.x * speed;
        velocity.z -= right.z * speed;
        isWalking = true;
        console.log('A pressed - moving left', { right: right });
    }
    if (keys['KeyD']) {
        velocity.x += right.x * speed;
        velocity.z += right.z * speed;
        isWalking = true;
        console.log('D pressed - moving right', { right: right });
    }

    // Jumping mechanics
    if (keys['Space'] && onGround && !jumpHeld) {
        velocity.y = 0.25; // Fixed jump power
        jumpHeld = true;
        onGround = false;
    }
    if (keys['Space'] && jumpHeld && velocity.y > 0) {
        velocity.y += 0.01; // Hold for higher jump
    }
    if (!keys['Space']) {
        jumpHeld = false;
    }

    // Walking animations
    if (isWalking && onGround) {
        walkTime += 0.15;
        // Subtle walking animation
        player.mesh.rotation.z = Math.sin(walkTime) * 0.03;
    } else {
        player.mesh.rotation.z = 0;
    }

    // Apply physics
    velocity.x *= 0.88; // Friction (less aggressive)
    velocity.z *= 0.88; // Friction (less aggressive)
    velocity.y -= 0.012; // Gravity (slightly less)

    // Calculate new position
    const newPos = {
        x: player.mesh.position.x + velocity.x,
        y: player.mesh.position.y + velocity.y,
        z: player.mesh.position.z + velocity.z
    };

    // Ground collision detection
    onGround = false;
    if (newPos.y <= 1) { // Ground level
        newPos.y = 1;
        velocity.y = 0;
        onGround = true;
    }

    // Arena bounds
    newPos.x = Math.max(-45, Math.min(45, newPos.x));
    newPos.z = Math.max(-45, Math.min(45, newPos.z));

    // Apply position
    player.mesh.position.set(newPos.x, newPos.y, newPos.z);

    // Debug movement (remove this later)
    if (isWalking) {
        console.log('Player moving:', {
            position: { x: newPos.x, y: newPos.y, z: newPos.z },
            velocity: velocity,
            onGround: onGround
        });
    }

    // Update camera position (first-person)
    camera.position.copy(player.mesh.position);
    camera.position.y += 1.6; // Eye level height

    // Optional: Add slight camera bob when walking
    if (isWalking && onGround) {
        camera.position.y += Math.sin(walkTime * 2) * 0.02;
    }
}

function shoot() {
    console.log('Shoot function called', { gameRunning, ammo, player });
    if (!gameRunning) {
        console.log('Game not running, cannot shoot');
        return;
    }
    if (!player || !player.mesh) {
        console.log('Player not initialized, cannot shoot');
        return;
    }

    const char = characters[currentCharacter];
    console.log('Shooting with character:', char.name);

    // Create bullet (make it bigger and brighter for visibility)
    const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.3
    });
    const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);

    // Position bullet at weapon
    bulletMesh.position.copy(player.mesh.position);
    bulletMesh.position.y += 1.5;

    // Calculate direction from camera
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    direction.normalize();

    const bullet = {
        mesh: bulletMesh,
        velocity: direction.multiplyScalar(2),
        damage: char.damage,
        life: 100
    };

    scene.add(bulletMesh);
    bullets.push(bullet);

    // Muzzle flash
    createMuzzleFlash();

    // Reduce ammo
    ammo = Math.max(0, ammo - 1);
    updateUI();
}

function createMuzzleFlash() {
    if (muzzleFlash) {
        scene.remove(muzzleFlash);
    }

    const flashGeometry = new THREE.SphereGeometry(0.5, 6, 6);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.8
    });
    muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);

    const weaponPos = player.mesh.position.clone();
    weaponPos.y += 1.5;
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    weaponPos.add(forward.multiplyScalar(1));

    muzzleFlash.position.copy(weaponPos);
    scene.add(muzzleFlash);

    setTimeout(() => {
        if (muzzleFlash) {
            scene.remove(muzzleFlash);
            muzzleFlash = null;
        }
    }, 100);
}

function spawnEnemy() {
    const enemyGeometry = new THREE.BoxGeometry(1, 2, 1);
    const enemyMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial);

    // Spawn at random position on arena edge
    const angle = Math.random() * Math.PI * 2;
    const radius = 40;
    enemyMesh.position.set(
        Math.cos(angle) * radius,
        1,
        Math.sin(angle) * radius
    );
    enemyMesh.castShadow = true;

    const enemy = {
        mesh: enemyMesh,
        health: 50 + wave * 10,
        maxHealth: 50 + wave * 10,
        speed: 0.05 + wave * 0.01,
        shootTimer: 0
    };

    scene.add(enemyMesh);
    enemies.push(enemy);
}

function spawnAlly() {
    if (allies.length >= 5) return; // Max 5 allies

    const allyGeometry = new THREE.BoxGeometry(1, 2, 1);
    const allyMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    const allyMesh = new THREE.Mesh(allyGeometry, allyMaterial);

    // Spawn near player
    const angle = Math.random() * Math.PI * 2;
    const distance = 3 + Math.random() * 3;
    allyMesh.position.set(
        player.mesh.position.x + Math.cos(angle) * distance,
        1,
        player.mesh.position.z + Math.sin(angle) * distance
    );
    allyMesh.castShadow = true;

    const ally = {
        mesh: allyMesh,
        health: 75,
        shootTimer: 0,
        target: null
    };

    scene.add(allyMesh);
    allies.push(ally);
    updateUI();
}

function changeCharacter() {
    currentCharacter = (currentCharacter + 1) % characters.length;
    const char = characters[currentCharacter];

    // Update player appearance
    player.mesh.material.color.setHex(char.color);
    player.speed = char.speed;
    player.fireRate = char.fireRate;
    player.damage = char.damage;

    // Update health if new character has more
    if (char.health > maxHealth) {
        const healthDiff = char.health - maxHealth;
        health += healthDiff;
        maxHealth = char.health;
    }

    updateUI();
}

function reload() {
    ammo = maxAmmo;
    updateUI();
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.mesh.position.add(bullet.velocity);
        bullet.life--;

        // Remove bullets that are too old or out of bounds
        if (bullet.life <= 0 ||
            Math.abs(bullet.mesh.position.x) > 60 ||
            Math.abs(bullet.mesh.position.z) > 60 ||
            bullet.mesh.position.y < -5) {
            scene.remove(bullet.mesh);
            bullets.splice(i, 1);
            continue;
        }

        // Check collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const distance = bullet.mesh.position.distanceTo(enemy.mesh.position);

            if (distance < 1) {
                // Hit enemy
                enemy.health -= bullet.damage;
                scene.remove(bullet.mesh);
                bullets.splice(i, 1);

                // Create hit effect
                createHitEffect(enemy.mesh.position);

                if (enemy.health <= 0) {
                    scene.remove(enemy.mesh);
                    enemies.splice(j, 1);
                    score += 10 + wave * 5;
                    enemiesKilledThisWave++;
                    updateUI();
                }
                break;
            }
        }
    }
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // Move towards player
        const direction = new THREE.Vector3();
        direction.subVectors(player.mesh.position, enemy.mesh.position);
        direction.y = 0;
        direction.normalize();
        direction.multiplyScalar(enemy.speed);

        enemy.mesh.position.add(direction);

        // Check collision with player
        const distance = enemy.mesh.position.distanceTo(player.mesh.position);
        if (distance < 2) {
            health -= 10;
            scene.remove(enemy.mesh);
            enemies.splice(i, 1);
            updateUI();

            if (health <= 0) {
                gameOver();
                return;
            }
        }

        // Enemy shooting
        enemy.shootTimer++;
        if (enemy.shootTimer > 60 && distance < 20) {
            enemyShoot(enemy);
            enemy.shootTimer = 0;
        }
    }
}

function enemyShoot(enemy) {
    const bulletGeometry = new THREE.SphereGeometry(0.08, 4, 4);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);

    bulletMesh.position.copy(enemy.mesh.position);
    bulletMesh.position.y += 1;

    const direction = new THREE.Vector3();
    direction.subVectors(player.mesh.position, enemy.mesh.position);
    direction.normalize();

    const bullet = {
        mesh: bulletMesh,
        velocity: direction.multiplyScalar(1),
        damage: 5,
        life: 100,
        isEnemy: true
    };

    scene.add(bulletMesh);
    bullets.push(bullet);
}

function updateAllies() {
    for (let ally of allies) {
        // Find nearest enemy
        let nearestEnemy = null;
        let nearestDistance = Infinity;

        for (let enemy of enemies) {
            const distance = ally.mesh.position.distanceTo(enemy.mesh.position);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = enemy;
            }
        }

        if (nearestEnemy && nearestDistance < 25) {
            ally.target = nearestEnemy;

            // Move towards enemy
            const direction = new THREE.Vector3();
            direction.subVectors(nearestEnemy.mesh.position, ally.mesh.position);
            direction.y = 0;
            direction.normalize();
            direction.multiplyScalar(0.03);

            ally.mesh.position.add(direction);

            // Shoot at enemy
            ally.shootTimer++;
            if (ally.shootTimer > 30) {
                allyShoot(ally, nearestEnemy);
                ally.shootTimer = 0;
            }
        }
    }
}

function allyShoot(ally, target) {
    const bulletGeometry = new THREE.SphereGeometry(0.08, 4, 4);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
    const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);

    bulletMesh.position.copy(ally.mesh.position);
    bulletMesh.position.y += 1;

    const direction = new THREE.Vector3();
    direction.subVectors(target.mesh.position, ally.mesh.position);
    direction.normalize();

    const bullet = {
        mesh: bulletMesh,
        velocity: direction.multiplyScalar(1.5),
        damage: 20,
        life: 100,
        isAlly: true
    };

    scene.add(bulletMesh);
    bullets.push(bullet);
}

function createHitEffect(position) {
    const particles = [];
    for (let i = 0; i < 5; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);

        particle.position.copy(position);
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            Math.random() * 0.2,
            (Math.random() - 0.5) * 0.2
        );
        particle.life = 30;

        scene.add(particle);
        particles.push(particle);
    }

    // Remove particles after animation
    setTimeout(() => {
        particles.forEach(particle => scene.remove(particle));
    }, 1000);
}

function updateUI() {
    document.getElementById('health').textContent = Math.max(0, health);
    document.getElementById('ammo').textContent = ammo === Infinity ? '∞' : ammo;
    document.getElementById('score').textContent = score;
    document.getElementById('wave').textContent = wave;
    document.getElementById('character').textContent = characters[currentCharacter].name;
    document.getElementById('allies').textContent = allies.length;

    // Update zoom level display
    const zoomMultiplier = (120 - zoom) / (120 - 30); // Convert FOV to zoom multiplier
    document.getElementById('zoomLevel').textContent = `${zoomMultiplier.toFixed(1)}x`;

    // Update speed status
    document.getElementById('speedStatus').textContent = speedMultiplier === 1 ? 'Normal' : 'FAST!';

    // Update health bar
    const healthPercent = Math.max(0, health / maxHealth * 100);
    document.getElementById('healthBar').style.width = healthPercent + '%';

    // Update ammo bar
    const ammoPercent = ammo / maxAmmo * 100;
    document.getElementById('ammoBar').style.width = ammoPercent + '%';
}

function showWaveNotification(text) {
    const notification = document.createElement('div');
    notification.className = 'wave-notification';
    notification.textContent = text;
    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function gameOver() {
    gameRunning = false;

    setTimeout(() => {
        alert(`Game Over!\nFinal Score: ${score}\nWave Reached: ${wave}\nClick OK to return to menu.`);
        goHome();
    }, 1000);
}

function animate() {
    if (!gameRunning) return;

    requestAnimationFrame(animate);

    updatePlayer();

    // Auto-shoot when holding mouse
    if (mouseHeld) {
        shootTimer++;
        if (shootTimer > characters[currentCharacter].fireRate) {
            shoot();
            shootTimer = 0;
        }
    }

    updateBullets();
    updateEnemies();
    updateAllies();

    // Spawn enemies
    enemySpawnTimer++;
    const spawnRate = Math.max(60 - wave * 5, 20);
    if (enemySpawnTimer > spawnRate) {
        spawnEnemy();
        enemySpawnTimer = 0;
    }

    // Auto-reload when ammo is empty
    if (ammo <= 0) {
        setTimeout(() => reload(), 1000);
    }

    // Check wave progression
    if (enemiesKilledThisWave >= enemiesNeededForWave) {
        wave++;
        enemiesKilledThisWave = 0;
        enemiesNeededForWave += 5;

        // Wave bonus
        score += wave * 100;
        health = Math.min(maxHealth, health + 25); // Heal on wave complete

        showWaveNotification(`Wave ${wave} - Incoming!`);
        updateUI();
    }

    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});