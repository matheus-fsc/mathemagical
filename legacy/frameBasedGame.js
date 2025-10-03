// Jogo usando sistema de sprites baseado em frames PNG
class FrameBasedGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Inicializa sistemas
        this.spriteManager = new FrameBasedSpriteManager();
        this.inputManager = new InputManager();
        this.player = null;
        
        // Controle do game loop
        this.lastTime = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.debugMode = false;
        
        // Background
        this.backgroundColor = '#87CEEB';
        
        this.init();
    }

    init() {
        console.log('Inicializando jogo com sprites baseados em frames...');
        
        // Carrega sprites
        this.spriteManager.loadLinkSprites();
        
        // Configura callback para quando todos os sprites carregarem
        this.spriteManager.onAllLoaded = () => {
            console.log('Todos os sprites carregados! Iniciando jogo...');
            this.spriteManager.listLoadedSprites();
            this.startGame();
        };
        
        this.setupSpecialEvents();
        this.renderLoadingScreen();
    }

    setupSpecialEvents() {
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'F1':
                    e.preventDefault();
                    this.debugMode = !this.debugMode;
                    console.log('Debug mode:', this.debugMode ? 'ON' : 'OFF');
                    break;
                case 'p':
                case 'P':
                    if (e.ctrlKey) break;
                    this.togglePause();
                    break;
                case 'r':
                case 'R':
                    this.resetGame();
                    break;
            }
        });
    }

    startGame() {
        this.player = new FrameBasedPlayer(
            (this.canvas.width - 64) / 2,
            (this.canvas.height - 64) / 2,
            this.spriteManager
        );
        
        this.isRunning = true;
        this.gameLoop();
    }

    gameLoop(currentTime = 0) {
        if (!this.isRunning) return;

        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        if (!this.isPaused) {
            this.update(deltaTime);
        }
        
        this.render();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime) {
        if (this.player) {
            this.player.update(deltaTime, this.inputManager);
        }
    }

    render() {
        // Limpa a tela
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Renderiza elementos do jogo
        if (this.player) {
            this.player.render(this.ctx);
            
            if (this.debugMode) {
                this.player.renderDebug(this.ctx);
                this.renderDebugInfo();
                this.renderFrameTestArea();
            }
        }

        if (this.isPaused) {
            this.renderPauseScreen();
        }
    }

    renderLoadingScreen() {
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            'Carregando sprites de frames...', 
            this.canvas.width / 2, 
            this.canvas.height / 2
        );
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText(
            `${this.spriteManager.loadedCount}/${this.spriteManager.loadingCount} sprites carregados`,
            this.canvas.width / 2,
            this.canvas.height / 2 + 30
        );
        
        this.ctx.font = '14px Arial';
        this.ctx.fillText(
            'Execute: python extract_gif_frames.py',
            this.canvas.width / 2,
            this.canvas.height / 2 + 60
        );
    }

    renderPauseScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSADO', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Pressione P para continuar', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }

    renderDebugInfo() {
        const debugY = 20;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(10, 10, 250, 200);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        
        this.ctx.fillText('=== DEBUG INFO (FRAMES) ===', 15, debugY + 15);
        this.ctx.fillText(`FPS: ${Math.round(1000 / (performance.now() - this.lastTime))}`, 15, debugY + 30);
        this.ctx.fillText(`Player: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`, 15, debugY + 45);
        this.ctx.fillText(`Facing: ${this.player.facing}`, 15, debugY + 60);
        this.ctx.fillText(`Moving: ${this.player.isMoving}`, 15, debugY + 75);
        
        if (this.player.isAttacking) {
            this.ctx.fillStyle = '#ffff00';
            this.ctx.fillText(`⚔️ ATTACKING: ${this.player.isAttacking}`, 15, debugY + 90);
            this.ctx.fillStyle = '#ffffff';
        } else {
            this.ctx.fillText(`Attacking: ${this.player.isAttacking}`, 15, debugY + 90);
        }
        
        this.ctx.fillText(`Can Attack: ${this.player.canAttack}`, 15, debugY + 105);
        this.ctx.fillText(`Current Sprite: ${this.player.getCurrentSpriteName()}`, 15, debugY + 120);
        
        // Mostra informações do sprite atual
        const currentSpriteName = this.player.getCurrentSpriteName();
        const spriteInfo = this.spriteManager.getSpriteInfo(currentSpriteName);
        if (spriteInfo) {
            this.ctx.fillText(`Type: ${spriteInfo.type}`, 15, debugY + 135);
            this.ctx.fillText(`Frame: ${spriteInfo.currentFrame}/${spriteInfo.frameCount}`, 15, debugY + 150);
            this.ctx.fillText(`Duration: ${spriteInfo.frameDuration}ms`, 15, debugY + 165);
        }
        
        this.ctx.fillText(`Sprites Loaded: ${this.spriteManager.loadedCount}/${this.spriteManager.loadingCount}`, 15, debugY + 180);
    }

    renderFrameTestArea() {
        if (!this.player) return;
        
        const testX = this.canvas.width - 200;
        const testY = 20;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(testX, testY, 180, 120);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('=== TESTE DE FRAMES ===', testX + 5, testY + 15);
        
        const currentSpriteName = this.player.getCurrentSpriteName();
        const currentSprite = this.spriteManager.getSprite(currentSpriteName, Date.now());
        const spriteInfo = this.spriteManager.getSpriteInfo(currentSpriteName);
        
        if (currentSprite && spriteInfo) {
            // Mostra sprite atual
            this.ctx.drawImage(currentSprite, testX + 5, testY + 25, 50, 50);
            
            // Informações
            this.ctx.fillText(`${currentSpriteName}`, testX + 60, testY + 35);
            this.ctx.fillText(`Frame: ${spriteInfo.currentFrame}/${spriteInfo.frameCount}`, testX + 60, testY + 50);
            this.ctx.fillText(`${spriteInfo.frameDuration}ms/frame`, testX + 60, testY + 65);
            
            // Status
            if (this.player.isAttacking) {
                this.ctx.fillStyle = '#ffff00';
                this.ctx.fillText('ATACANDO!', testX + 60, testY + 80);
            } else if (this.player.isMoving) {
                this.ctx.fillStyle = '#00ff00';
                this.ctx.fillText('MOVENDO!', testX + 60, testY + 80);
            } else {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillText('Parado', testX + 60, testY + 80);
            }
        }
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('Deve animar suavemente!', testX + 5, testY + 105);
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        console.log('Jogo', this.isPaused ? 'pausado' : 'despausado');
    }

    resetGame() {
        console.log('Resetando jogo...');
        if (this.player) {
            this.player.x = (this.canvas.width - 64) / 2;
            this.player.y = (this.canvas.height - 64) / 2;
            this.player.velocityX = 0;
            this.player.velocityY = 0;
            this.player.facing = 'front';
        }
        this.isPaused = false;
    }
}

// Inicializa o jogo quando a página carregar
window.addEventListener('load', () => {
    console.log('Página carregada, iniciando jogo baseado em frames...');
    new FrameBasedGame();
});