const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

let cameraX = 0;
let score = 0;
let coins = 0;
let gameState = 'menu';   // menu / playing / paused / gameover / win / editor
let keys = {};
let tool = null;
let entities = [];
let particles = [];

let player = {
    x: 80,
    y: 300,
    w: 36,
    h: 36,
    vx: 0,
    vy: 0,
    mode: 'cube',
    gravity: 1,
    rot: 0,
    rotSpeed: 9,
    onGround: false,
    trail: [],
    jumpCharge: 0,
    swingAngle: 0,
    swingVel: 0,
    size: 1
};

document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') {
        if (gameState === 'playing') jumpOrHold();
        if (gameState === 'menu') startGame();
    }
    if (e.code === 'KeyP' && gameState === 'playing') {
        gameState = 'paused';
        document.getElementById('pause-menu').style.display = 'block';
    }
    if (e.code === 'KeyP' && gameState === 'paused') {
        gameState = 'playing';
        document.getElementById('pause-menu').style.display = 'none';
    }
    if (e.code === 'KeyR' && (gameState === 'gameover' || gameState === 'win')) reset();
    if (e.code === 'KeyE') {
        gameState = gameState === 'editor' ? 'menu' : 'editor';
        document.getElementById('editor-panel').style.display = gameState === 'editor' ? 'block' : 'none';
    }
});

document.addEventListener('keyup', e => {
    keys[e.code] = false;
    if (e.code === 'Space' && player.mode === 'robot') {
        player.vy = - (player.jumpCharge / 45) * 18 * player.gravity;
        player.jumpCharge = 0;
    }
});

canvas.addEventListener('mousedown', () => {
    if (gameState === 'playing') jumpOrHold();
    if (gameState === 'menu') startGame();
});

canvas.addEventListener('mouseup', () => {
    if (player.mode === 'robot') {
        player.vy = - (player.jumpCharge / 45) * 18 * player.gravity;
        player.jumpCharge = 0;
    }
});

function setEditorTool(t) { tool = t; }

function jumpOrHold() {
    if (player.mode === 'cube' && player.onGround) {
        player.vy = -13.5 * player.gravity;
        player.onGround = false;
    } else if (player.mode === 'ship' || player.mode === 'ufo') {
        player.vy -= 0.85 * player.gravity;
    } else if (player.mode === 'ball' || player.mode === 'spider') {
        player.gravity *= -1;
        player.vy = 0;
        player.y = player.gravity > 0 ? 368 - player.h*player.size : 30;
    } else if (player.mode === 'wave') {
        player.vy = keys['Space'] ? -12 * player.gravity : 12 * player.gravity;
    } else if (player.mode === 'robot' && player.onGround) {
        player.jumpCharge = Math.min(player.jumpCharge + 1.5, 45);
    } else if (player.mode === 'swing') {
        player.swingVel += 0.4;
    }
}

function reset() {
    cameraX = 0;
    score = 0;
    coins = 0;
    player = {
        x:80, y:300, w:36, h:36, vx:0, vy:0,
        mode:'cube', gravity:1, rot:0, onGround:false, trail:[], jumpCharge:0,
        swingAngle:0, swingVel:0, size:1
    };
    particles = [];
    entities = [
        {type:'spike', x:400, y:368-40, w:30, h:40},
        {type:'block', x:700, y:300, w:80, h:20},
        {type:'portal_ship', x:1200, y:200, w:60, h:80},
        {type:'coin', x:1600, y:220, r:16},
        {type:'portal_cube', x:2200, y:200, w:60, h:80},
        {type:'gravity', x:2800, y:180, w:60, h:80},
        {type:'orb', x:3400, y:220, r:18}
    ];
    gameState = 'playing';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('level-complete').style.display = 'none';
}

function startGame() {
    reset();
    gameState = 'playing';
}

function update() {
    if (gameState !== 'playing') return;

    // Player physics (all modes)
    if (player.mode === 'cube' || player.mode === 'ball') {
        player.vy += 0.65 * player.gravity;
        player.y += player.vy;
        player.rot += player.rotSpeed * player.gravity;
        if (player.y >= 368 - player.h*player.size || player.y <= 30) {
            player.y = player.gravity > 0 ? 368 - player.h*player.size : 30;
            player.vy = 0;
            player.onGround = true;
            player.rot = Math.round(player.rot / 90) * 90;
        } else player.onGround = false;
    } else if (player.mode === 'ship' || player.mode === 'ufo') {
        player.vy += (keys['Space'] ? -0.45 : 0.35) * player.gravity;
        player.vy *= 0.96;
        player.y += player.vy;
        player.rot = player.vy * 4;
        player.y = Math.max(30, Math.min(368 - player.h*player.size, player.y));
    } else if (player.mode === 'wave') {
        player.vy = keys['Space'] ? -12 * player.gravity : 12 * player.gravity;
        player.y += player.vy;
        if (player.y < 30 || player.y > 368 - player.h*player.size) gameState = 'gameover';
    } else if (player.mode === 'robot') {
        if (player.onGround && keys['Space']) player.jumpCharge = Math.min(player.jumpCharge + 1.5, 45);
        player.vy += 0.65 * player.gravity;
        player.y += player.vy;
        if (player.y >= 368 - player.h*player.size) {
            player.y = 368 - player.h*player.size;
            player.vy = 0;
            player.onGround = true;
        }
    } else if (player.mode === 'spider') {
        player.y += player.vy;
        if (keys['Space'] && player.onGround) {
            player.gravity *= -1;
            player.y = player.gravity > 0 ? 368 - player.h*player.size : 30;
        }
    } else if (player.mode === 'swing') {
        player.swingVel += (keys['Space'] ? 0.35 : -0.35);
        player.swingVel *= 0.92;
        player.swingAngle += player.swingVel;
        player.y = 200 + Math.sin(player.swingAngle) * 140;
        player.y = Math.max(30, Math.min(368 - player.h*player.size, player.y));
        player.rot = player.swingAngle * 30;
    }

    cameraX += 4.8;
    score = Math.floor(cameraX / 8);

    // Particles
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        return p.life > 0;
    });

    // Collision
    entities.forEach((e, i) => {
        const ex = e.x - cameraX;
        if (ex < -100 || ex > W + 100) return;

        const touching =
            player.x + player.w > e.x &&
            player.x < e.x + (e.w || e.r*2 || 60) &&
            player.y + player.h*player.size > e.y &&
            player.y < e.y + (e.h || e.r*2 || 80);

        if (touching) {
            if (e.type === 'spike' || e.type === 'block') gameState = 'gameover';
            if (e.type === 'portal_cube') player.mode = 'cube';
            if (e.type === 'portal_ship') player.mode = 'ship';
            if (e.type === 'gravity') player.gravity *= -1;
            if (e.type === 'coin') { coins++; entities.splice(i,1); }
            if (e.type === 'orb') player.vy = -16 * player.gravity;
        }
    });

    if (cameraX > 10000) {
        gameState = 'win';
        document.getElementById('level-complete').style.display = 'block';
    }

    // UI update
    document.getElementById('s').textContent = score;
    document.getElementById('pct').textContent = Math.floor((cameraX/10000)*100) + ' %   •   Coins: ' + coins + '/3';
}

function draw() {
    ctx.fillStyle = '#0a0015';
    ctx.fillRect(0,0,W,H);

    // background
    ctx.fillStyle = '#444';
    for (let i = 0; i < 80; i++) {
        let x = (cameraX*0.4 + i*60) % (W*1.5) - W*0.5;
        ctx.fillRect(x, 40 + Math.sin(i + cameraX*0.01)*30, 2, 2);
    }

    // ground
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 370, W, H-370);

    // entities
    entities.forEach(e => {
        const sx = e.x - cameraX;
        if (sx < -100 || sx > W + 100) return;

        if (e.type === 'spike') {
            ctx.fillStyle = '#ff3366';
            ctx.beginPath();
            ctx.moveTo(sx, e.y + e.h);
            ctx.lineTo(sx + e.w/2, e.y);
            ctx.lineTo(sx + e.w, e.y + e.h);
            ctx.fill();
        } else if (e.type === 'block') {
            ctx.fillStyle = '#3366ff';
            ctx.fillRect(sx, e.y, e.w, e.h);
        } else if (e.type === 'coin') {
            ctx.fillStyle = '#ffdd00';
            ctx.beginPath();
            ctx.arc(sx + e.r, e.y + e.r, e.r, 0, Math.PI*2);
            ctx.fill();
        } else if (e.type === 'orb') {
            ctx.fillStyle = '#ffff66';
            ctx.beginPath();
            ctx.arc(sx + e.r, e.y + e.r, e.r, 0, Math.PI*2);
            ctx.fill();
        } else if (e.type.startsWith('portal_') || e.type === 'gravity') {
            ctx.globalAlpha = 0.7 + Math.sin(Date.now()/300)*0.3;
            ctx.fillStyle = e.type.includes('cube') ? '#00ff88' : e.type.includes('ship') ? '#ff8800' : '#aa00ff';
            ctx.beginPath();
            ctx.arc(sx + 30, e.y + 40, 30, 0, Math.PI*2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    });

    // player trail
    player.trail.forEach((p, i) => {
        ctx.globalAlpha = (i + 1) / player.trail.length * 0.6;
        ctx.fillStyle = player.mode === 'ship' ? '#ffaa00' : '#44ff88';
        ctx.fillRect(p.x - cameraX, p.y, player.w * 0.7 * player.size, player.h * 0.7 * player.size);
    });
    ctx.globalAlpha = 1;

    // player
    ctx.save();
    ctx.translate(player.x - cameraX + player.w/2 * player.size, player.y + player.h/2 * player.size);
    ctx.rotate(player.rot * Math.PI / 180);
    ctx.scale(player.size, player.size);
    ctx.fillStyle = player.mode === 'ship' ? '#ffaa00' : player.mode === 'ufo' ? '#88ffdd' : '#44ff88';
    ctx.fillRect(-player.w/2, -player.h/2, player.w, player.h);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeRect(-player.w/2, -player.h/2, player.w, player.h);
    ctx.restore();

    // particles
    particles.forEach(p => {
        ctx.globalAlpha = p.life / 30;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - cameraX, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Start the game
reset();
loop();
