// Game state
let gameMode = null;
let scene, camera, renderer;
let player, platforms = [], obstacles = [], checkpoints = [], killParts = [];
let velocity = { x: 0, y: 0, z: 0 };
let onGround = false, currentCheckpoint = 0, jumpHeld = false;
let walkTime = 0, isWalking = false, isJumping = false;
let mouseX = 0, mouseY = 0, pitch = 0, yaw = 0;
const sensitivity = 0.002;
let speedMultiplier = 1;
let ctrlPressed = false;
let currentCharacter = 0;
let deaths = 0;
let gameStartTime = 0;
let gameTime = 0;
let lastCheckpointPos = { x: 0, y: 5, z: 0 };
let totalCheckpoints = 0;
let currentStage = "Starting Area";
let leaderboardVisible = false;
let isEmoting = false;
let isCrouching = false;
let particles = [];
let sounds = {
    checkpoint: null,
    death: null,
    victory: null,
    jump: null
};

// Player parts for animations
let head, torso, leftArm, rightArm, leftLeg, rightLeg;
let leftEye, rightEye, mouth;

// Authentic Roblox character types
const obbyCharacters = [
    { name: 'Noob', headColor: 0xffdbac, torsoColor: 0x0066ff, armColor: 0xffdbac, legColor: 0x00aa00, speed: 1, jumpPower: 1, hat: null },
    { name: 'Bacon Hair', headColor: 0xffdbac, torsoColor: 0x654321, armColor: 0xffdbac, legColor: 0x654321, speed: 0.9, jumpPower: 0.9, hat: 'bacon' },
    { name: 'Pro Player', headColor: 0xffdbac, torsoColor: 0x000000, armColor: 0xffdbac, legColor: 0x000000, speed: 1.2, jumpPower: 1.1, hat: 'cap' },
    { name: 'Speedrunner', headColor: 0xffdbac, torsoColor: 0xffff00, armColor: 0xffdbac, legColor: 0xffff00, speed: 1.5, jumpPower: 0.9, hat: 'headphones' },
    { name: 'Obby Master', headColor: 0xffdbac, torsoColor: 0x00ff00, armColor: 0xffdbac, legColor: 0x00ff00, speed: 0.9, jumpPower: 1.6, hat: 'crown' },
    { name: 'Exploiter', headColor: 0xffdbac, torsoColor: 0xff0000, armColor: 0xffdbac, legColor: 0xff0000, speed: 2, jumpPower: 2, hat: 'fedora' },
    { name: 'Guest_12345', headColor: 0xffdbac, torsoColor: 0x808080, armColor: 0xffdbac, legColor: 0x808080, speed: 0.8, jumpPower: 0.8, hat: null },
    { name: 'Robux Rich', headColor: 0xffdbac, torsoColor: 0xffd700, armColor: 0xffdbac, legColor: 0xffd700, speed: 1.1, jumpPower: 1.2, hat: 'diamond' }
];

// User system integration
function loadUserData() {
    const userData = JSON.parse(localStorage.getItem('robloxObbyUser') || '{}');
    return {
        username: userData.username || 'Guest',
        unlockedCharacters: userData.unlockedCharacters || [0],
        completedObbies: userData.completedObbies || [],
        bestTimes: userData.bestTimes || {},
        selectedCharacter: userData.selectedCharacter || 0,
        totalDeaths: userData.totalDeaths || 0,
        totalPlayTime: userData.totalPlayTime || 0
    };
}

function saveUserData(userData) {
    localStorage.setItem('robloxObbyUser', JSON.stringify(userData));
}

function startGame(difficulty) {
    // Load user data and set selected character
    const userData = loadUserData();
    currentCharacter = userData.selectedCharacter;

    gameMode = difficulty;
    document.getElementById('menu').style.display = 'none';
    document.getElementById('ui').style.display = 'block';
    document.getElementById('leaderboard').style.display = 'block';
    document.getElementById('gameCanvas').style.display = 'block';

    let difficultyText = '';
    if (difficulty === 'easy') difficultyText = '🟢 EASY OBBY (Beginner)';
    else if (difficulty === 'hard') difficultyText = '🔴 MEGA HARD OBBY (Expert)';
    else if (difficulty === 'impossible') difficultyText = '💀 IMPOSSIBLE OBBY (Pro Only)';

    document.getElementById('difficulty').textContent = `🎮 ${difficultyText}`;

    // Reset game stats
    deaths = 0;
    currentCheckpoint = 0;
    gameStartTime = Date.now();
    lastCheckpointPos = { x: 0, y: 5, z: 0 };
    currentStage = "Starting Area";
    particles = [];

    initGame();

    // Adjust fog based on difficulty
    if (difficulty === 'impossible') {
        scene.fog = new THREE.Fog(0x87CEEB, 100, 500); // Less fog for impossible obby
        totalCheckpoints = 10;
        createImpossibleObby();
    } else if (difficulty === 'hard') {
        scene.fog = new THREE.Fog(0x87CEEB, 75, 300);
        totalCheckpoints = 6;
        createHardObby();
    } else {
        totalCheckpoints = 4;
        createEasyObby();
    }
    updateUI();
    animate();
}

function playAnotherGame() {
    window.location.href = 'bloxfruits.html';
}

function playAction2D() {
    window.location.href = 'action2d.html';
}

function goHome() {
    document.getElementById('menu').style.display = 'block';
    document.getElementById('ui').style.display = 'none';
    document.getElementById('leaderboard').style.display = 'none';
    document.getElementById('gameCanvas').style.display = 'none';

    // Remove victory screen if it exists
    if (window.currentVictoryDiv && window.currentVictoryDiv.parentNode) {
        window.currentVictoryDiv.parentNode.removeChild(window.currentVictoryDiv);
        window.currentVictoryDiv = null;
    }

    if (renderer) {
        document.getElementById('gameCanvas').removeChild(renderer.domElement);
        renderer.dispose();
    }

    // Reset game state
    platforms = [];
    obstacles = [];
    checkpoints = [];
    killParts = [];
    currentCheckpoint = 0;
    deaths = 0;
    velocity = { x: 0, y: 0, z: 0 };
    pitch = 0;
    yaw = 0;
    gameMode = null;
}

function initGame() {
    // Game setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('gameCanvas').appendChild(renderer.domElement);

    // Roblox-style lighting
    scene.background = new THREE.Color(0x87CEEB); // Sky blue like Roblox

    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(10, 20, 10);
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 100;
    light.shadow.camera.left = -50;
    light.shadow.camera.right = 50;
    light.shadow.camera.top = 50;
    light.shadow.camera.bottom = -50;
    scene.add(light);

    // Bright ambient light like Roblox
    scene.add(new THREE.AmbientLight(0x404040, 1.0));

    // Add fog for depth
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

    createPlayer();
    setupControls();
}

function createPlayer() {
    player = new THREE.Group();
    player.position.set(0, 1, 0);

    updatePlayerAppearance();
    scene.add(player);
}

function updatePlayerAppearance() {
    // Remove existing parts
    if (head) player.remove(head);
    if (torso) player.remove(torso);
    if (leftArm) player.remove(leftArm);
    if (rightArm) player.remove(rightArm);
    if (leftLeg) player.remove(leftLeg);
    if (rightLeg) player.remove(rightLeg);
    if (leftEye) player.remove(leftEye);
    if (rightEye) player.remove(rightEye);
    if (mouth) player.remove(mouth);

    const char = obbyCharacters[currentCharacter];

    // Head
    head = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshLambertMaterial({ color: char.headColor })
    );
    head.position.set(0, 1.4, 0);
    head.castShadow = true;
    player.add(head);

    // Face
    leftEye = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshLambertMaterial({ color: 0x000000 })
    );
    leftEye.position.set(-0.15, 1.5, 0.41);
    player.add(leftEye);

    rightEye = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshLambertMaterial({ color: 0x000000 })
    );
    rightEye.position.set(0.15, 1.5, 0.41);
    player.add(rightEye);

    mouth = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.05, 0.05),
        new THREE.MeshLambertMaterial({ color: 0x000000 })
    );
    mouth.position.set(0, 1.25, 0.41);
    player.add(mouth);

    // Torso
    torso = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1.2, 0.5),
        new THREE.MeshLambertMaterial({ color: char.torsoColor })
    );
    torso.position.set(0, 0.6, 0);
    torso.castShadow = true;
    player.add(torso);

    // Arms
    leftArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 1, 0.4),
        new THREE.MeshLambertMaterial({ color: char.armColor })
    );
    leftArm.position.set(-0.7, 0.6, 0);
    leftArm.castShadow = true;
    player.add(leftArm);

    rightArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 1, 0.4),
        new THREE.MeshLambertMaterial({ color: char.armColor })
    );
    rightArm.position.set(0.7, 0.6, 0);
    rightArm.castShadow = true;
    player.add(rightArm);

    // Legs
    leftLeg = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 1, 0.4),
        new THREE.MeshLambertMaterial({ color: char.legColor })
    );
    leftLeg.position.set(-0.3, -0.5, 0);
    leftLeg.castShadow = true;
    player.add(leftLeg);

    rightLeg = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 1, 0.4),
        new THREE.MeshLambertMaterial({ color: char.legColor })
    );
    rightLeg.position.set(0.3, -0.5, 0);
    rightLeg.castShadow = true;
    player.add(rightLeg);
}

function changeCharacter() {
    const userData = loadUserData();

    // Find next unlocked character
    let nextCharacter = (currentCharacter + 1) % obbyCharacters.length;
    let attempts = 0;

    while (!userData.unlockedCharacters.includes(nextCharacter) && attempts < obbyCharacters.length) {
        nextCharacter = (nextCharacter + 1) % obbyCharacters.length;
        attempts++;
    }

    if (userData.unlockedCharacters.includes(nextCharacter)) {
        currentCharacter = nextCharacter;
        const char = obbyCharacters[currentCharacter];
        updatePlayerAppearance();
        document.getElementById('character').textContent = `👤 Character: ${char.name}`;

        // Save selected character
        userData.selectedCharacter = currentCharacter;
        saveUserData(userData);

        // Show character change effect
        createParticleEffect(player.position, 0x00ff00, 'character');
    } else {
        // Show message about locked characters
        showMessage("🔒 No more unlocked characters! Complete obbies to unlock more!");
    }
}

function showMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.style.position = 'absolute';
    messageDiv.style.top = '20%';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translate(-50%, -50%)';
    messageDiv.style.background = 'rgba(0, 0, 0, 0.9)';
    messageDiv.style.color = 'white';
    messageDiv.style.padding = '20px 30px';
    messageDiv.style.borderRadius = '10px';
    messageDiv.style.zIndex = '2000';
    messageDiv.style.fontSize = '18px';
    messageDiv.style.fontWeight = 'bold';
    messageDiv.style.border = '2px solid #00ff00';
    messageDiv.textContent = text;
    document.body.appendChild(messageDiv);

    setTimeout(() => {
        if (messageDiv.parentNode) messageDiv.parentNode.removeChild(messageDiv);
    }, 3000);
}

function toggleLeaderboard() {
    leaderboardVisible = !leaderboardVisible;
    const leaderboard = document.getElementById('leaderboard');
    leaderboard.style.display = leaderboardVisible ? 'block' : 'none';
}

function doEmote() {
    if (isEmoting) return;
    isEmoting = true;

    // Random emote animation
    const emotes = ['wave', 'dance', 'cheer', 'point'];
    const emote = emotes[Math.floor(Math.random() * emotes.length)];

    // Simple emote animation
    const originalRotation = { x: leftArm.rotation.x, z: leftArm.rotation.z };

    if (emote === 'wave') {
        leftArm.rotation.x = -Math.PI / 2;
        leftArm.rotation.z = Math.PI / 4;
        setTimeout(() => {
            leftArm.rotation.x = originalRotation.x;
            leftArm.rotation.z = originalRotation.z;
            isEmoting = false;
        }, 2000);
    }
}

function createParticleEffect(position, color, type) {
    for (let i = 0; i < 10; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 4, 4),
            new THREE.MeshBasicMaterial({ color: color })
        );
        particle.position.copy(position);
        particle.position.add(new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 2,
            (Math.random() - 0.5) * 2
        ));
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.3,
                (Math.random() - 0.5) * 0.2
            ),
            life: 60,
            type: type
        };
        scene.add(particle);
        particles.push(particle);
    }
}

function respawnAtCheckpoint() {
    deaths++;
    player.position.set(lastCheckpointPos.x, lastCheckpointPos.y, lastCheckpointPos.z);
    velocity = { x: 0, y: 0, z: 0 };

    // Death effect
    createParticleEffect(player.position, 0xff0000, 'death');

    // Screen flash effect
    if (renderer) {
        renderer.domElement.style.filter = 'brightness(2) hue-rotate(0deg)';
        setTimeout(() => {
            renderer.domElement.style.filter = 'brightness(1.5) hue-rotate(180deg)';
        }, 100);
        setTimeout(() => {
            if (renderer) renderer.domElement.style.filter = 'brightness(1) hue-rotate(0deg)';
        }, 300);
    }

    updateUI();
}

function createCheckpoint(x, y, z, checkpointNum, stageName) {
    // Checkpoint platform (bright green like Roblox)
    createPlatform(x, y, z, 8, 1, 8, 0x00ff00);

    // Checkpoint beacon with Roblox-style glow
    const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 6, 8),
        new THREE.MeshLambertMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            emissive: 0x004444
        })
    );
    beacon.position.set(x, y + 4, z);
    beacon.userData = { type: 'checkpoint', number: checkpointNum, stage: stageName };
    scene.add(beacon);
    checkpoints.push(beacon);

    // Multiple spinning rings for more Roblox feel
    for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(2 + i * 0.5, 2.5 + i * 0.5, 16),
            new THREE.MeshLambertMaterial({
                color: i === 0 ? 0xffff00 : i === 1 ? 0x00ff00 : 0x0088ff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.7
            })
        );
        ring.position.set(x, y + 6 + i * 0.5, z);
        ring.rotation.x = Math.PI / 2;
        ring.userData = { type: 'checkpointRing', parent: beacon, ringIndex: i };
        scene.add(ring);
        checkpoints.push(ring);
    }

    // Checkpoint number display
    const numberBox = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 0.1),
        new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    numberBox.position.set(x, y + 8, z);
    numberBox.userData = { type: 'checkpointNumber' };
    scene.add(numberBox);
    checkpoints.push(numberBox);
    
    // Add progress indicator for impossible obby
    if (gameMode === 'impossible') {
        const progressText = new THREE.Mesh(
            new THREE.BoxGeometry(3, 0.5, 0.1),
            new THREE.MeshLambertMaterial({ color: 0xffd700 })
        );
        progressText.position.set(x, y + 9, z);
        progressText.userData = { type: 'progressIndicator' };
        scene.add(progressText);
        checkpoints.push(progressText);
    }
}

function createKillPart(x, y, z, w, h, d) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const material = new THREE.MeshLambertMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.8
    });
    const killPart = new THREE.Mesh(geometry, material);
    killPart.position.set(x, y, z);
    killPart.userData = { type: 'kill' };
    scene.add(killPart);
    killParts.push(killPart);
}

function createEasyObby() {
    // Starting platform with checkpoint
    createCheckpoint(0, 0, 0, 0, "Starting Area");

    // Easy jumps section 1
    createPlatform(12, 2, 0, 6, 1, 6, 0x0066ff);
    createPlatform(20, 4, 0, 6, 1, 6, 0x0066ff);
    createPlatform(28, 6, 0, 6, 1, 6, 0x0066ff);

    // Checkpoint 1
    createCheckpoint(36, 8, 0, 1, "Jump Training");

    // Staircase section with kill parts
    createPlatform(44, 10, 0, 4, 1, 4, 0xff6600);
    createKillPart(46, 9, 0, 2, 1, 2); // Lava in middle
    createPlatform(50, 12, 0, 4, 1, 4, 0xff6600);
    createKillPart(52, 11, 0, 2, 1, 2);
    createPlatform(56, 14, 0, 4, 1, 4, 0xff6600);
    createPlatform(62, 16, 0, 4, 1, 4, 0xff6600);

    // Checkpoint 2
    createCheckpoint(68, 18, 0, 2, "Lava Stairs");

    // Zigzag section with kill parts below
    createPlatform(76, 20, -5, 4, 1, 4, 0xffff00);
    createKillPart(76, 15, -5, 4, 1, 4);
    createPlatform(82, 22, 5, 4, 1, 4, 0xffff00);
    createKillPart(82, 17, 5, 4, 1, 4);
    createPlatform(88, 24, -5, 4, 1, 4, 0xffff00);
    createKillPart(88, 19, -5, 4, 1, 4);
    createPlatform(94, 26, 5, 4, 1, 4, 0xffff00);

    // Checkpoint 3
    createCheckpoint(100, 28, 0, 3, "Zigzag Zone");

    // Final challenge - disappearing platforms
    createPlatform(108, 30, 0, 3, 1, 3, 0x9900ff);
    createPlatform(114, 32, 0, 3, 1, 3, 0x9900ff);
    createPlatform(120, 34, 0, 3, 1, 3, 0x9900ff);

    // Victory platform
    createCheckpoint(126, 36, 0, 4, "Victory!");
    createVictoryArea(126, 46, 0);
}

function createHardObby() {
    // Starting platform with checkpoint
    createCheckpoint(0, 0, 0, 0, "Starting Area");

    // Tiny gap jumps section 1
    createPlatform(8, 0, 0, 2, 1, 2, 0x0066ff);
    createKillPart(10, -5, 0, 2, 1, 2);
    createPlatform(12, 0, 0, 2, 1, 2, 0x0066ff);
    createPlatform(16, 2, 0, 2, 1, 2, 0x0066ff);
    createKillPart(18, -3, 0, 2, 1, 2);
    createPlatform(20, 4, 0, 2, 1, 2, 0x0066ff);

    // Checkpoint 1
    createCheckpoint(25, 6, 0, 1, "Precision Jumps");

    // Moving kill parts section
    createPlatform(35, 8, 10, 6, 1, 6, 0xff6600);
    createMovingObstacle(35, 10, 10, 2, 2, 2);
    createKillPart(35, 7, 10, 6, 1, 6);
    createPlatform(45, 10, 20, 6, 1, 6, 0xff6600);
    createMovingObstacle(45, 12, 20, 2, 2, 2);
    createMovingObstacle(45, 12, 25, 2, 2, 2);
    createKillPart(45, 9, 20, 6, 1, 6);

    // Checkpoint 2
    createCheckpoint(55, 12, 30, 2, "Moving Crushers");

    // Spinning death traps
    createPlatform(65, 14, 40, 8, 1, 8, 0xffff00);
    createSpinningObstacle(65, 17, 40, 1, 8, 1);
    createKillPart(65, 13, 40, 8, 1, 8);
    createPlatform(75, 16, 50, 8, 1, 8, 0xffff00);
    createSpinningObstacle(75, 19, 50, 1, 8, 1);
    createSpinningObstacle(75, 19, 55, 1, 8, 1);
    createKillPart(75, 15, 50, 8, 1, 8);

    // Checkpoint 3
    createCheckpoint(85, 18, 60, 3, "Spinner Hell");

    // Ultra narrow bridges with kill parts
    createPlatform(95, 20, 70, 1, 1, 4, 0xff8800);
    createKillPart(95, 15, 70, 1, 1, 4);
    createPlatform(100, 22, 75, 1, 1, 4, 0xff8800);
    createKillPart(100, 17, 75, 1, 1, 4);
    createPlatform(105, 24, 80, 1, 1, 4, 0xff8800);
    createKillPart(105, 19, 80, 1, 1, 4);
    createPlatform(110, 26, 85, 1, 1, 4, 0xff8800);

    // Checkpoint 4
    createCheckpoint(115, 28, 90, 4, "Tightrope Walk");

    // Insane obstacle course
    createPlatform(125, 30, 100, 6, 1, 6, 0xff0000);
    createMovingObstacle(125, 32, 100, 2, 2, 2);
    createSpinningObstacle(125, 33, 105, 1, 6, 1);
    createKillPart(125, 29, 100, 6, 1, 6);

    // Checkpoint 5
    createCheckpoint(135, 32, 110, 5, "Final Gauntlet");

    // Final challenge - disappearing tiny platforms
    createPlatform(145, 34, 115, 1.5, 1, 1.5, 0xff0000);
    createPlatform(150, 36, 120, 1.5, 1, 1.5, 0xff0000);
    createPlatform(155, 38, 125, 1.5, 1, 1.5, 0xff0000);

    // Victory platform
    createCheckpoint(160, 40, 130, 6, "Victory!");
    createVictoryArea(160, 50, 130);
}

function createImpossibleObby() {
    // Starting platform
    createCheckpoint(0, 0, 0, 0, "Starting Area");

    // Section 1: Micro precision jumps (made slightly more forgiving)
    createPlatform(8, 2, 0, 1.8, 1, 1.8, 0x0066ff);
    createPlatform(12, 4, 0, 1.5, 1, 1.5, 0x0066ff);
    createPlatform(16, 6, 0, 1.3, 1, 1.3, 0x0066ff);
    createPlatform(20, 8, 0, 1.3, 1, 1.3, 0x0066ff);
    createPlatform(24, 10, 0, 1.5, 1, 1.5, 0x0066ff);
    createPlatform(28, 12, 0, 1.8, 1, 1.8, 0x0066ff);
    
    // Add safety platform halfway
    createPlatform(18, 4, -3, 2, 1, 2, 0x888888); // Safety platform
    
    // Add kill parts below
    createKillPart(8, -5, 0, 25, 1, 15);

    createCheckpoint(32, 14, 0, 1, "Micro Precision");

    // Section 2: Moving platform chaos
    createPlatform(40, 16, 0, 3, 1, 3, 0xff6600);
    createMovingObstacle(40, 18, 0, 2, 2, 2);
    
    createPlatform(48, 18, 5, 3, 1, 3, 0xff6600);
    createMovingObstacle(48, 20, 5, 2, 2, 2);
    
    createPlatform(56, 20, -5, 3, 1, 3, 0xff6600);
    createMovingObstacle(56, 22, -5, 2, 2, 2);
    
    createPlatform(64, 22, 0, 3, 1, 3, 0xff6600);
    createMovingObstacle(64, 24, 0, 2, 2, 2);
    
    // Kill parts below moving platforms
    createKillPart(40, 15, 0, 30, 1, 15);

    createCheckpoint(72, 24, 0, 2, "Moving Mayhem");

    // Section 3: Spinner gauntlet
    createPlatform(80, 26, 0, 8, 1, 8, 0xffff00);
    createSpinningObstacle(80, 29, 0, 1, 6, 1);
    createSpinningObstacle(82, 29, 2, 1, 6, 1);
    createSpinningObstacle(78, 29, -2, 1, 6, 1);
    
    createPlatform(88, 28, 0, 6, 1, 6, 0xffff00);
    createSpinningObstacle(88, 31, 0, 1, 6, 1);
    createSpinningObstacle(90, 31, 2, 1, 6, 1);
    
    createPlatform(96, 30, 0, 4, 1, 4, 0xffff00);
    createSpinningObstacle(96, 33, 0, 1, 6, 1);
    
    // Kill parts below spinners
    createKillPart(80, 25, 0, 20, 1, 10);

    createCheckpoint(104, 32, 0, 3, "Spinner Hell");

    // Section 4: Invisible bridge (slightly visible)
    for (let i = 0; i < 6; i++) {
        const platform = createPlatform(112 + i * 3, 34 + i * 0.5, Math.sin(i * 0.5) * 3, 1.5, 1, 1.5, 0x444444);
        platform.material.transparent = true;
        platform.material.opacity = 0.4; // Make them more visible than before
    }
    
    // Add some visible guide platforms and arrows
    createPlatform(112, 33, 0, 1, 0.1, 1, 0x00ff00); // Guide marker
    createPlatform(115, 33.5, 1, 0.5, 0.1, 0.5, 0x00ff00); // Arrow
    createPlatform(118, 34, 2, 0.5, 0.1, 0.5, 0x00ff00); // Arrow
    createPlatform(121, 34.5, 1, 0.5, 0.1, 0.5, 0x00ff00); // Arrow
    createPlatform(124, 35, 0, 0.5, 0.1, 0.5, 0x00ff00); // Arrow
    createPlatform(127, 36, 0, 1, 0.1, 1, 0x00ff00); // Guide marker
    
    createKillPart(112, 30, 0, 20, 1, 15);

    createCheckpoint(130, 37, 0, 4, "Invisible Bridge");

    // Section 5: Narrow tightrope
    createPlatform(138, 39, 0, 0.8, 1, 6, 0xff8800);
    createPlatform(144, 41, 0, 0.8, 1, 6, 0xff8800);
    createPlatform(150, 43, 0, 0.8, 1, 6, 0xff8800);
    createPlatform(156, 45, 0, 0.8, 1, 6, 0xff8800);
    
    // Kill parts below tightrope
    createKillPart(138, 35, 0, 25, 1, 15);

    createCheckpoint(162, 47, 0, 5, "Tightrope Walk");

    // Section 6: Final gauntlet - mixed obstacles
    createPlatform(170, 49, 0, 2, 1, 2, 0xff0000);
    createMovingObstacle(170, 51, 0, 1.5, 1.5, 1.5);
    
    createPlatform(176, 51, 3, 1.5, 1, 1.5, 0xff0000);
    createSpinningObstacle(176, 54, 3, 0.5, 4, 0.5);
    
    createPlatform(182, 53, -3, 1.5, 1, 1.5, 0xff0000);
    createMovingObstacle(182, 55, -3, 1.5, 1.5, 1.5);
    
    createPlatform(188, 55, 0, 2, 1, 2, 0xff0000);
    createSpinningObstacle(188, 58, 0, 0.5, 4, 0.5);
    
    createPlatform(194, 57, 0, 1.5, 1, 1.5, 0xff0000);
    
    // Kill parts below final section
    createKillPart(170, 45, 0, 30, 1, 15);

    createCheckpoint(200, 59, 0, 6, "Final Gauntlet");

    // Victory platform - make it bigger for relief
    createCheckpoint(208, 61, 0, 10, "IMPOSSIBLE COMPLETED!");
    createVictoryArea(208, 71, 0);
}

function createPlatform(x, y, z, w, h, d, color) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const material = new THREE.MeshLambertMaterial({ color });
    const platform = new THREE.Mesh(geometry, material);
    platform.position.set(x, y, z);
    platform.receiveShadow = true;
    scene.add(platform);
    platforms.push(platform);
    return platform; // Return the platform so we can modify it
}

function createMovingObstacle(x, y, z, w, h, d) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const material = new THREE.MeshLambertMaterial({ color: 0xff4444 });
    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.position.set(x, y, z);
    obstacle.castShadow = true;
    obstacle.userData = { type: 'moving', direction: 1, range: 6, startX: x };
    scene.add(obstacle);
    obstacles.push(obstacle);
}

function createSpinningObstacle(x, y, z, w, h, d) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const material = new THREE.MeshLambertMaterial({ color: 0xff8800 });
    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.position.set(x, y, z);
    obstacle.castShadow = true;
    obstacle.userData = { type: 'spinning' };
    scene.add(obstacle);
    obstacles.push(obstacle);
}

function createVictoryArea(x, y, z) {
    // Victory room walls
    createPlatform(x, y, z, 10, 1, 10, 0x00ffff); // Floor
    createPlatform(x, y + 5, z - 5, 10, 1, 0.2, 0xffd700); // Back wall
    createPlatform(x, y + 5, z + 5, 10, 1, 0.2, 0xffd700); // Front wall
    createPlatform(x - 5, y + 5, z, 0.2, 1, 10, 0xffd700); // Left wall
    createPlatform(x + 5, y + 5, z, 0.2, 1, 10, 0xffd700); // Right wall
    createPlatform(x, y + 10, z, 10, 1, 10, 0xffd700); // Ceiling

    // Victory trophy
    const trophy = new THREE.Mesh(
        new THREE.ConeGeometry(1, 3, 8),
        new THREE.MeshLambertMaterial({ color: 0xffd700 })
    );
    trophy.position.set(x, y + 3, z);
    trophy.userData = { type: 'victory' };
    scene.add(trophy);

    // Spinning victory ring
    const victoryRing = new THREE.Mesh(
        new THREE.RingGeometry(3, 4, 16),
        new THREE.MeshLambertMaterial({ color: 0x00ff00, side: THREE.DoubleSide })
    );
    victoryRing.position.set(x, y + 4, z);
    victoryRing.rotation.x = Math.PI / 2;
    victoryRing.userData = { type: 'victoryRing' };
    scene.add(victoryRing);

    // Store victory objects
    window.victoryTrophy = trophy;
    window.victoryRing = victoryRing;
}

function updateUI() {
    if (!gameMode) return;

    // Update timer
    gameTime = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;
    document.getElementById('timer').textContent = `⏱️ Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Update other UI elements
    document.getElementById('checkpoint').textContent = `🚩 Checkpoint: ${currentCheckpoint}/${totalCheckpoints}`;
    document.getElementById('deaths').textContent = `💀 Deaths: ${deaths}`;
    document.getElementById('stage').textContent = `🏁 Stage: ${currentStage}`;

    // Update leaderboard position
    const leaderboardContent = document.getElementById('leaderboardContent');
    if (leaderboardContent) {
        const yourPosition = `→ You: ${minutes}:${seconds.toString().padStart(2, '0')} (${deaths} deaths) - Stage: ${currentStage}`;
        const lines = leaderboardContent.innerHTML.split('<hr')[0] + '<hr style="margin: 8px 0; border-color: #ffd700;">' +
            `<div style="font-size: 12px; margin: 3px 0; color: #00ff00;">${yourPosition}</div>`;
        leaderboardContent.innerHTML = lines;
    }
}

function setupControls() {
    const keys = {};
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
            if (!ctrlPressed) {
                speedMultiplier = speedMultiplier === 1 ? 2 : 1;
                document.getElementById('speedStatus').textContent = `⚡ Speed: ${speedMultiplier === 1 ? 'Normal' : 'FAST!'}`;
                ctrlPressed = true;
            }
        }
        if (e.code === 'KeyC') {
            changeCharacter();
        }
        if (e.code === 'KeyR') {
            respawnAtCheckpoint();
        }
        if (e.code === 'Tab') {
            e.preventDefault();
            toggleLeaderboard();
        }
        if (e.code === 'KeyQ') {
            doEmote();
        }
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            isCrouching = true;
        }
    });
    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
        if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
            ctrlPressed = false;
        }
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            isCrouching = false;
        }
    });

    renderer.domElement.addEventListener('click', () => {
        if (gameMode) document.body.requestPointerLock();
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement && gameMode) {
            yaw += e.movementX * sensitivity;
            pitch -= e.movementY * sensitivity;
            pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
        }
    });

    window.keys = keys;
}

function updateCamera() {
    // Adjust camera distance based on difficulty for better visibility
    let distance = 8;
    let height = 3;
    
    if (gameMode === 'impossible') {
        distance = 15; // Pull camera back more for impossible obby
        height = 5; // Higher camera for better view
    } else if (gameMode === 'hard') {
        distance = 10;
        height = 4;
    }

    camera.position.x = player.position.x - Math.cos(yaw) * Math.cos(pitch) * distance;
    camera.position.y = player.position.y + height - Math.sin(pitch) * distance;
    camera.position.z = player.position.z - Math.sin(yaw) * Math.cos(pitch) * distance;

    const lookX = player.position.x + Math.cos(yaw) * Math.cos(pitch);
    const lookY = player.position.y + 1 + Math.sin(pitch);
    const lookZ = player.position.z + Math.sin(yaw) * Math.cos(pitch);
    camera.lookAt(lookX, lookY, lookZ);
}

function checkCollision(pos, size) {
    for (let platform of platforms) {
        const px = platform.position.x;
        const py = platform.position.y;
        const pz = platform.position.z;
        const pw = platform.geometry.parameters.width / 2;
        const ph = platform.geometry.parameters.height / 2;
        const pd = platform.geometry.parameters.depth / 2;

        if (pos.x - size.x / 2 < px + pw && pos.x + size.x / 2 > px - pw &&
            pos.y - size.y / 2 < py + ph && pos.y + size.y / 2 > py - ph &&
            pos.z - size.z / 2 < pz + pd && pos.z + size.z / 2 > pz - pd) {
            return platform;
        }
    }
    return null;
}

function animate() {
    if (!gameMode) return;
    requestAnimationFrame(animate);

    const char = obbyCharacters[currentCharacter];
    const speed = 0.1 * speedMultiplier * char.speed;
    const forward = { x: Math.cos(yaw), z: Math.sin(yaw) };
    const right = { x: Math.sin(yaw), z: -Math.cos(yaw) };

    isWalking = false;
    if (window.keys['KeyW']) {
        velocity.x += forward.x * speed;
        velocity.z += forward.z * speed;
        isWalking = true;
    }
    if (window.keys['KeyS']) {
        velocity.x -= forward.x * speed;
        velocity.z -= forward.z * speed;
        isWalking = true;
    }
    if (window.keys['KeyA']) {
        velocity.x += right.x * speed;
        velocity.z += right.z * speed;
        isWalking = true;
    }
    if (window.keys['KeyD']) {
        velocity.x -= right.x * speed;
        velocity.z -= right.z * speed;
        isWalking = true;
    }
    if (window.keys['Space'] && onGround && !jumpHeld) {
        const char = obbyCharacters[currentCharacter];
        let jumpBoost = 1;
        
        // Give extra jump power in impossible mode to make it more fair
        if (gameMode === 'impossible') {
            jumpBoost = 1.2;
        }
        
        velocity.y = 0.3 * char.jumpPower * jumpBoost;
        jumpHeld = true;
    }
    if (window.keys['Space'] && jumpHeld && velocity.y > 0) {
        const char = obbyCharacters[currentCharacter];
        let jumpBoost = 1;
        
        if (gameMode === 'impossible') {
            jumpBoost = 1.2;
        }
        
        velocity.y += 0.015 * char.jumpPower * jumpBoost;
    }
    if (!window.keys['Space']) {
        jumpHeld = false;
    }

    // Animations
    if (isWalking && onGround) {
        walkTime += 0.2;
        leftArm.rotation.x = Math.sin(walkTime) * 0.5;
        rightArm.rotation.x = -Math.sin(walkTime) * 0.5;
        leftLeg.rotation.x = -Math.sin(walkTime) * 0.3;
        rightLeg.rotation.x = Math.sin(walkTime) * 0.3;
    } else {
        leftArm.rotation.x = 0;
        rightArm.rotation.x = 0;
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
    }

    if (!onGround) {
        leftArm.rotation.x = -0.5;
        rightArm.rotation.x = -0.5;
    }

    // Physics
    velocity.x *= 0.8;
    velocity.z *= 0.8;
    velocity.y -= 0.02;

    const newPos = {
        x: player.position.x + velocity.x,
        y: player.position.y + velocity.y,
        z: player.position.z + velocity.z
    };

    onGround = false;
    const collision = checkCollision(newPos, { x: 1, y: 2, z: 1 });
    if (collision && velocity.y <= 0) {
        newPos.y = collision.position.y + collision.geometry.parameters.height / 2 + 1;
        velocity.y = 0;
        onGround = true;
    }

    player.position.set(newPos.x, newPos.y, newPos.z);
    player.rotation.y = -yaw + Math.PI / 2;

    // Fall reset or kill part collision
    if (player.position.y < -10) {
        respawnAtCheckpoint();
    }

    // Check kill part collisions
    for (let killPart of killParts) {
        const distance = player.position.distanceTo(killPart.position);
        if (distance < 3) {
            respawnAtCheckpoint();
            break;
        }
    }

    // Check checkpoint collisions
    for (let checkpoint of checkpoints) {
        if (checkpoint.userData.type === 'checkpoint') {
            const distance = player.position.distanceTo(checkpoint.position);
            if (distance < 4 && checkpoint.userData.number > currentCheckpoint) {
                currentCheckpoint = checkpoint.userData.number;
                lastCheckpointPos = {
                    x: checkpoint.position.x,
                    y: checkpoint.position.y + 2,
                    z: checkpoint.position.z
                };

                // Checkpoint reached effect
                checkpoint.material.color.setHex(0x00ff00);
                setTimeout(() => {
                    checkpoint.material.color.setHex(0x00ffff);
                }, 500);

                // Update current stage
                if (checkpoint.userData.stage) {
                    currentStage = checkpoint.userData.stage;
                }

                // Checkpoint particle effect
                createParticleEffect(checkpoint.position, 0x00ff00, 'checkpoint');

                updateUI();
            }
        }
    }

    // Check victory collision
    if (window.victoryTrophy) {
        const distance = player.position.distanceTo(window.victoryTrophy.position);
        if (distance < 3) {
            showVictoryScreen();
        }
    }

    // Update obstacles
    obstacles.forEach(obstacle => {
        if (obstacle.userData.type === 'moving') {
            obstacle.position.x += obstacle.userData.direction * 0.1;
            if (Math.abs(obstacle.position.x - obstacle.userData.startX) > obstacle.userData.range) {
                obstacle.userData.direction *= -1;
            }
        } else if (obstacle.userData.type === 'spinning') {
            obstacle.rotation.y += 0.05;
        }
    });

    // Obstacle collision
    for (let obstacle of obstacles) {
        const distance = player.position.distanceTo(obstacle.position);
        if (distance < 2) {
            player.position.set(0, 5, 0);
            velocity = { x: 0, y: 0, z: 0 };
            break;
        }
    }

    updateCamera();

    // Update checkpoint rings and victory ring
    checkpoints.forEach(checkpoint => {
        if (checkpoint.userData.type === 'checkpointRing') {
            checkpoint.rotation.z += 0.02;
        }
    });

    if (window.victoryRing) {
        window.victoryRing.rotation.z += 0.05;
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.position.add(particle.userData.velocity);
        particle.userData.velocity.y -= 0.01; // Gravity
        particle.userData.life--;

        // Fade out
        particle.material.opacity = particle.userData.life / 60;

        if (particle.userData.life <= 0) {
            scene.remove(particle);
            particles.splice(i, 1);
        }
    }

    // Update checkpoint rings with different speeds
    checkpoints.forEach(checkpoint => {
        if (checkpoint.userData.type === 'checkpointRing') {
            const speed = 0.02 + (checkpoint.userData.ringIndex || 0) * 0.01;
            checkpoint.rotation.z += speed;
        }
    });

    if (window.victoryRing) {
        window.victoryRing.rotation.z += 0.05;
    }

    // Update timer
    updateUI();

    renderer.render(scene, camera);
}

function showVictoryScreen() {
    gameMode = null; // Stop the game loop

    // Check for character unlocks
    const userData = loadUserData();
    const newUnlocks = checkCharacterUnlocks(gameMode, deaths, true);

    // Update user stats
    userData.totalDeaths += deaths;
    userData.totalPlayTime += gameTime;

    // Save best time
    const currentDifficulty = gameMode;
    if (!userData.bestTimes[currentDifficulty] || gameTime < userData.bestTimes[currentDifficulty]) {
        userData.bestTimes[currentDifficulty] = gameTime;
    }

    saveUserData(userData);

    // Create victory overlay
    const victoryDiv = document.createElement('div');
    victoryDiv.style.position = 'absolute';
    victoryDiv.style.top = '0';
    victoryDiv.style.left = '0';
    victoryDiv.style.width = '100%';
    victoryDiv.style.height = '100%';
    victoryDiv.style.background = 'rgba(0, 255, 0, 0.9)';
    victoryDiv.style.display = 'flex';
    victoryDiv.style.flexDirection = 'column';
    victoryDiv.style.justifyContent = 'center';
    victoryDiv.style.alignItems = 'center';
    victoryDiv.style.zIndex = '1000';
    victoryDiv.style.color = 'white';
    victoryDiv.style.fontFamily = 'Arial';

    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Create unlock notifications
    let unlockText = '';
    if (newUnlocks.length > 0) {
        unlockText = `
            <div style="background: rgba(255, 215, 0, 0.9); color: black; padding: 20px; border-radius: 10px; margin: 20px; border: 3px solid #FFD700;">
                <h2 style="margin: 0 0 10px 0;">🎉 NEW CHARACTERS UNLOCKED! 🎉</h2>
                ${newUnlocks.map(char => `<div style="font-size: 18px; margin: 5px 0;">✅ ${char}</div>`).join('')}
                <div style="font-size: 14px; margin-top: 10px; font-style: italic;">Visit the Character Gallery to select them!</div>
            </div>
        `;
    }

    victoryDiv.innerHTML = `
        <h1 style="font-size: 64px; margin: 20px; text-shadow: 3px 3px 6px rgba(0,0,0,0.7);">🏆 OBBY COMPLETED! 🏆</h1>
        <div style="font-size: 32px; margin: 10px;">⏱️ Time: ${timeStr}</div>
        <div style="font-size: 32px; margin: 10px;">💀 Deaths: ${deaths}</div>
        <div style="font-size: 32px; margin: 10px;">🚩 Checkpoints: ${currentCheckpoint + 1}</div>
        <div style="font-size: 32px; margin: 10px;">👤 Character: ${obbyCharacters[currentCharacter].name}</div>
        <div style="font-size: 24px; margin: 20px; text-align: center;">
            ${deaths === 0 ? '🌟 PERFECT RUN! NO DEATHS! 🌟' :
            deaths < 5 ? '⭐ GREAT JOB! 👏' :
                deaths < 15 ? '👍 NICE WORK! 💪' :
                    '🎉 YOU DID IT! 🎊'}
        </div>
        ${unlockText}
        <div style="display: flex; gap: 20px;">
            <button onclick="goHome()" style="padding: 15px 30px; font-size: 24px; background: #4CAF50; color: white; border: none; border-radius: 10px; cursor: pointer;">🏠 Back to Menu</button>
            <button onclick="openCharacterGallery()" style="padding: 15px 30px; font-size: 24px; background: #9C27B0; color: white; border: none; border-radius: 10px; cursor: pointer;">👤 View Characters</button>
        </div>
    `;

    document.body.appendChild(victoryDiv);

    // Remove victory div after going home
    window.currentVictoryDiv = victoryDiv;
}

function checkCharacterUnlocks(difficulty, deaths, completed) {
    const userData = loadUserData();
    let newUnlocks = [];

    if (completed) {
        // Add completed obby to list
        if (!userData.completedObbies.includes(difficulty)) {
            userData.completedObbies.push(difficulty);
        }

        // Check unlock conditions
        if (difficulty === 'easy' && !userData.unlockedCharacters.includes(1)) {
            userData.unlockedCharacters.push(1); // Bacon Hair
            newUnlocks.push('Bacon Hair');
        }

        if (difficulty === 'easy' && deaths < 5 && !userData.unlockedCharacters.includes(2)) {
            userData.unlockedCharacters.push(2); // Pro Player
            newUnlocks.push('Pro Player');
        }

        if (difficulty === 'hard' && !userData.unlockedCharacters.includes(3)) {
            userData.unlockedCharacters.push(3); // Speedrunner
            newUnlocks.push('Speedrunner');
        }

        if (difficulty === 'hard' && deaths < 10 && !userData.unlockedCharacters.includes(4)) {
            userData.unlockedCharacters.push(4); // Obby Master
            newUnlocks.push('Obby Master');
        }

        if (difficulty === 'impossible' && !userData.unlockedCharacters.includes(5)) {
            userData.unlockedCharacters.push(5); // Exploiter
            newUnlocks.push('Exploiter');
        }

        if (deaths === 0 && !userData.unlockedCharacters.includes(6)) {
            userData.unlockedCharacters.push(6); // Guest
            newUnlocks.push('Guest_12345');
        }

        if (userData.completedObbies.length >= 3 && !userData.unlockedCharacters.includes(7)) {
            userData.unlockedCharacters.push(7); // Robux Rich
            newUnlocks.push('Robux Rich');
        }
    }

    saveUserData(userData);
    return newUnlocks;
}

function openCharacterGallery() {
    window.location.href = 'characters.html';
}

// Handle window resize
window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});