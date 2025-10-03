// GameCore - Classe principal que integra todos os componentes
class GameCore {
    constructor() {
        this.isInitialized = false;
        this.isRunning = false;
        
        // Componentes principais
        this.sceneManager = null;
        this.collisionManager = null;
        this.interactionManager = null;
        this.assetLoader = null;
        
        // Sistemas legados (a serem migrados)
        this.areaManager = null;
        this.gameClient = null;
        
        // Canvas e contexto
        this.canvas = null;
        this.ctx = null;
        
        // Debug
        this.debug = {
            enabled: false,
            showCollisions: true,
            showInteractions: true,
            showSceneTransitions: true,
            showPerformance: false
        };
        
        console.log('🎮 GameCore inicializado');
    }

    // Inicializar todos os componentes
    async init(canvasId) {
        console.log('🚀 Inicializando GameCore...');
        
        try {
            // Setup canvas
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) {
                throw new Error(`Canvas não encontrado: ${canvasId}`);
            }
            this.ctx = this.canvas.getContext('2d');
            
            // Inicializar componentes
            this.assetLoader = new AssetLoader();
            this.sceneManager = new SceneManager();
            this.collisionManager = new CollisionManager();
            this.interactionManager = new InteractionManager();
            
            // Carregar assets críticos primeiro
            console.log('📦 Carregando assets críticos...');
            await this.assetLoader.loadCriticalAssets();
            
            // Carregar cenas
            console.log('🎬 Carregando cenas...');
            await this.sceneManager.loadAllScenes();
            
            // Setup interações de exemplo na área up
            this.setupExampleInteractions();
            
            // Setup eventos
            this.setupEvents();
            
            this.isInitialized = true;
            console.log('✅ GameCore inicializado com sucesso!');
            
            return true;
            
        } catch (error) {
            console.error('❌ Erro na inicialização do GameCore:', error);
            return false;
        }
    }

    // Configurar interações de exemplo
    setupExampleInteractions() {
        // Interação na área "up" na posição especificada pelo usuário
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        const interactionX = canvasWidth * 0.58;  // 58% da largura
        const interactionY = canvasHeight * 0.708; // 70.8% da altura
        
        this.interactionManager.addInteraction('up', 'portal_interaction', {
            x: interactionX - 25,
            y: interactionY - 25,
            width: 50,
            height: 50,
            type: 'click',
            icon: '🌟',
            description: 'Portal Místico',
            hoverText: 'Clique para ativar o portal',
            requiresProximity: false,
            onInteract: (context, interaction) => {
                console.log('🌟 Portal ativado!', context);
                alert(`🌟 Portal Místico Ativado!\n\nVocê descobriu um portal antigo!\nCoordenadas: (${context.mousePos.x.toFixed(1)}, ${context.mousePos.y.toFixed(1)})`);
                
                // Efeito visual
                this.createPortalEffect(interaction.x + 25, interaction.y + 25);
                
                return { success: true, message: 'Portal ativado!' };
            },
            visual: {
                showIcon: true,
                showBorder: true,
                pulseEffect: true,
                glowEffect: true,
                color: '#9932CC',
                hoverColor: '#FFD700'
            }
        });
        
        console.log('🎯 Interação de exemplo configurada na área up');
    }

    // Criar efeito visual do portal
    createPortalEffect(x, y) {
        // Criar partículas temporárias
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'absolute';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.width = '4px';
            particle.style.height = '4px';
            particle.style.backgroundColor = '#9932CC';
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '1000';
            
            const angle = (i / 12) * Math.PI * 2;
            const distance = 50;
            const targetX = x + Math.cos(angle) * distance;
            const targetY = y + Math.sin(angle) * distance;
            
            particle.style.transition = 'all 1s ease-out';
            document.body.appendChild(particle);
            
            setTimeout(() => {
                particle.style.left = targetX + 'px';
                particle.style.top = targetY + 'px';
                particle.style.opacity = '0';
            }, 10);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 1100);
        }
    }

    // Configurar eventos
    setupEvents() {
        // Eventos de redimensionamento
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Eventos de teclado para debug
        document.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
        
        // Eventos de progresso de assets
        window.addEventListener('assetLoadingProgress', (e) => {
            console.log('📈 Progresso de assets:', e.detail);
        });
        
        // Eventos de mudança de cena
        window.addEventListener('sceneChanged', (e) => {
            console.log('🎬 Cena alterada:', e.detail);
            this.onSceneChanged(e.detail);
        });
    }

    // Manipular teclas
    handleKeydown(e) {
        switch (e.key) {
            case 'F1':
                this.debug.enabled = !this.debug.enabled;
                console.log(`🐛 Debug ${this.debug.enabled ? 'ativado' : 'desativado'}`);
                break;
            case 'F2':
                this.debug.showCollisions = !this.debug.showCollisions;
                console.log(`💥 Debug de colisões ${this.debug.showCollisions ? 'ativado' : 'desativado'}`);
                break;
            case 'F3':
                this.debug.showInteractions = !this.debug.showInteractions;
                console.log(`🎯 Debug de interações ${this.debug.showInteractions ? 'ativado' : 'desativado'}`);
                break;
        }
    }

    // Manipular redimensionamento
    handleResize() {
        // Reconfigurar interações responsivas
        this.setupExampleInteractions();
        console.log('🔄 Interações reconfiguradas para novo tamanho');
    }

    // Callback de mudança de cena
    onSceneChanged(detail) {
        const { previousScene, newScene, spawnPosition } = detail;
        
        // Lógica específica para mudanças de cena
        console.log(`🎭 Transição: ${previousScene} → ${newScene}`);
        
        // Futuro: efeitos de transição, mudanças de música, etc.
    }

    // Verificar colisões do player
    checkPlayerCollisions(player, newX, newY) {
        if (!this.collisionManager || !this.sceneManager) {
            return { x: newX, y: newY, collided: false };
        }
        
        const currentScene = this.sceneManager.getCurrentScene();
        return this.collisionManager.checkPlayerMovement(
            player, newX, newY, currentScene, 
            this.canvas.width, this.canvas.height
        );
    }

    // Verificar transições de cena
    checkSceneTransitions(player) {
        if (!this.sceneManager) return null;
        
        return this.sceneManager.checkSceneTransitions(
            player, this.canvas.width, this.canvas.height
        );
    }

    // Verificar interações
    checkInteractions(player, mousePos = null) {
        if (!this.interactionManager || !this.sceneManager) return [];
        
        const currentScene = this.sceneManager.getCurrentScene();
        const results = [];
        
        // Verificar interações de proximidade
        const proximityResults = this.interactionManager.checkProximityInteractions(player, currentScene);
        results.push(...proximityResults);
        
        // Verificar cliques se fornecida posição do mouse
        if (mousePos) {
            const clickResults = this.interactionManager.checkClickInteractions(mousePos, currentScene);
            results.push(...clickResults);
        }
        
        return results;
    }

    // Renderizar tudo
    render() {
        if (!this.ctx || !this.isInitialized) return;
        
        // Limpar canvas com fundo sólido para evitar transparência
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Garantir fundo preto como base (evitar verde)
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Renderizar background da cena
        if (this.sceneManager) {
            this.sceneManager.renderBackground(this.ctx);
        }
        
        // Renderizar elementos debug
        if (this.debug.enabled) {
            const currentScene = this.sceneManager?.getCurrentScene() || 'down';
            
            if (this.debug.showCollisions && this.collisionManager) {
                this.collisionManager.renderCollisionAreas(this.ctx, currentScene);
            }
            
            if (this.debug.showInteractions && this.interactionManager) {
                this.interactionManager.renderInteractions(this.ctx, currentScene, true);
            }
            
            if (this.debug.showSceneTransitions && this.sceneManager) {
                this.sceneManager.renderTransitionZones(this.ctx);
            }
        } else {
            // Renderizar interações normais (sem debug)
            const currentScene = this.sceneManager?.getCurrentScene() || 'down';
            if (this.interactionManager) {
                this.interactionManager.renderInteractions(this.ctx, currentScene, false);
            }
        }
    }

    // Integração com sistema legado
    integrateWithLegacySystem(gameClient) {
        this.gameClient = gameClient;
        
        // Substituir AreaManager pelo SceneManager
        if (gameClient.areaManager && this.sceneManager) {
            console.log('🔄 Integrando SceneManager com sistema legado...');
            
            // Manter compatibilidade
            gameClient.sceneManager = this.sceneManager;
            gameClient.collisionManager = this.collisionManager;
            gameClient.interactionManager = this.interactionManager;
            gameClient.gameCore = this;
        }
        
        console.log('🔗 Integração com sistema legado concluída');
    }

    // Obter estatísticas do sistema
    getSystemStats() {
        return {
            isInitialized: this.isInitialized,
            isRunning: this.isRunning,
            currentScene: this.sceneManager?.getCurrentScene(),
            assets: this.assetLoader?.getStats(),
            collisions: this.collisionManager?.getCollisionInfo(this.sceneManager?.getCurrentScene()),
            interactions: this.interactionManager?.getStats(),
            debug: this.debug
        };
    }

    // Limpar recursos
    cleanup() {
        this.isRunning = false;
        
        if (this.assetLoader) {
            this.assetLoader.clearCache();
        }
        
        console.log('🧹 GameCore limpo');
    }
}

// Singleton global
window.GameCore = GameCore;