// SceneManager - Gerencia cenários e backgrounds do jogo
class SceneManager {
    constructor() {
        this.currentScene = 'down'; // Cena atual
        this.scenes = new Map(); // Armazena todas as cenas
        this.backgroundImages = new Map(); // Cache de imagens
        this.transitionZone = 20; // Pixels da borda para transição
        this.isLoading = false;
        
        console.log('🎬 SceneManager inicializado');
        this.setupDefaultScenes();
    }

    // Configurar cenas padrão
    setupDefaultScenes() {
        this.addScene('down', {
            name: 'down',
            displayName: 'Floresta Inferior',
            background: 'backgrounds/imgdown.png',
            music: null, // Futuro: música de fundo
            ambientSounds: [], // Futuro: sons ambiente
            transitions: {
                up: { 
                    target: 'up', 
                    direction: 'up',
                    spawnPosition: 'bottom'
                }
            },
            lighting: 'normal', // normal, dark, bright
            weatherEffects: null // rain, snow, fog, etc.
        });

        this.addScene('up', {
            name: 'up',
            displayName: 'Ruínas Antigas',
            background: 'backgrounds/imgup.png',
            music: null,
            ambientSounds: [],
            transitions: {
                down: { 
                    target: 'down', 
                    direction: 'down',
                    spawnPosition: 'top'
                }
            },
            lighting: 'dark',
            weatherEffects: null
        });
    }

    // Adicionar nova cena
    addScene(sceneId, sceneData) {
        this.scenes.set(sceneId, {
            id: sceneId,
            ...sceneData,
            isLoaded: false,
            assets: new Map()
        });
        
        console.log(`🎭 Cena adicionada: ${sceneId} (${sceneData.displayName})`);
    }

    // Carregar assets de uma cena específica
    async loadSceneAssets(sceneId) {
        const scene = this.scenes.get(sceneId);
        if (!scene) {
            console.error(`❌ Cena não encontrada: ${sceneId}`);
            return false;
        }

        if (scene.isLoaded) {
            console.log(`✅ Cena ${sceneId} já carregada`);
            return true;
        }

        this.isLoading = true;
        console.log(`🔄 Carregando assets da cena: ${sceneId}`);

        try {
            // Carregar background
            if (scene.background) {
                const bgImage = await this.loadImage(scene.background);
                this.backgroundImages.set(sceneId, bgImage);
                scene.assets.set('background', bgImage);
            }

            // Futuro: carregar música, sons, efeitos, etc.
            // if (scene.music) await this.loadAudio(scene.music);
            // if (scene.ambientSounds) await this.loadAmbientSounds(scene.ambientSounds);

            scene.isLoaded = true;
            console.log(`✅ Cena ${sceneId} carregada com sucesso`);
            return true;

        } catch (error) {
            console.error(`❌ Erro ao carregar cena ${sceneId}:`, error);
            return false;
        } finally {
            this.isLoading = false;
        }
    }

    // Helper para carregar imagem
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Falha ao carregar: ${src}`));
            img.src = src;
        });
    }

    // Carregar todas as cenas
    async loadAllScenes() {
        console.log('🔄 Carregando todas as cenas...');
        const loadPromises = Array.from(this.scenes.keys()).map(sceneId => 
            this.loadSceneAssets(sceneId)
        );

        try {
            const results = await Promise.all(loadPromises);
            const successful = results.filter(Boolean).length;
            console.log(`✅ ${successful}/${results.length} cenas carregadas com sucesso`);
            return successful === results.length;
        } catch (error) {
            console.error('❌ Erro ao carregar cenas:', error);
            return false;
        }
    }

    // Transicionar para outra cena
    async transitionToScene(newSceneId, playerSpawnPosition = null) {
        if (newSceneId === this.currentScene) {
            console.log(`⚠️ Já está na cena: ${newSceneId}`);
            return false;
        }

        const newScene = this.scenes.get(newSceneId);
        if (!newScene) {
            console.error(`❌ Cena não existe: ${newSceneId}`);
            return false;
        }

        console.log(`🎬 Transicionando: ${this.currentScene} → ${newSceneId}`);

        // Carregar cena se necessário
        if (!newScene.isLoaded) {
            const loaded = await this.loadSceneAssets(newSceneId);
            if (!loaded) {
                console.error(`❌ Falha ao carregar cena: ${newSceneId}`);
                return false;
            }
        }

        const previousScene = this.currentScene;
        this.currentScene = newSceneId;

        // Evento de mudança de cena (para outros sistemas reagirem)
        this.onSceneChanged(previousScene, newSceneId, playerSpawnPosition);

        console.log(`✅ Transição concluída para: ${newScene.displayName}`);
        return true;
    }

    // Callback para mudança de cena
    onSceneChanged(previousScene, newScene, spawnPosition) {
        // Override em subclasses ou definir callbacks externos
        console.log(`🎭 Cena alterada: ${previousScene} → ${newScene}`);
        
        // Emitir evento customizado
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sceneChanged', {
                detail: { previousScene, newScene, spawnPosition }
            }));
        }
    }

    // Verificar transições baseadas na posição do player
    checkSceneTransitions(player, canvasWidth, canvasHeight) {
        const currentSceneData = this.scenes.get(this.currentScene);
        if (!currentSceneData || !currentSceneData.transitions) return null;

        const transitions = currentSceneData.transitions;

        // Verificar transição superior
        if (transitions.up && player.y <= this.transitionZone) {
            return {
                direction: 'up',
                target: transitions.up.target,
                spawnPosition: transitions.up.spawnPosition
            };
        }

        // Verificar transição inferior  
        if (transitions.down && player.y >= canvasHeight - this.transitionZone - player.height) {
            return {
                direction: 'down',
                target: transitions.down.target,
                spawnPosition: transitions.down.spawnPosition
            };
        }

        // Futuro: transições laterais
        // if (transitions.left && player.x <= this.transitionZone) { ... }
        // if (transitions.right && player.x >= canvasWidth - this.transitionZone) { ... }

        return null;
    }

    // Renderizar background da cena atual
    renderBackground(ctx) {
        const backgroundImg = this.backgroundImages.get(this.currentScene);
        if (backgroundImg) {
            ctx.drawImage(backgroundImg, 0, 0, ctx.canvas.width, ctx.canvas.height);
        } else {
            // Fallback: cor sólida baseada na cena
            const scene = this.scenes.get(this.currentScene);
            const fallbackColor = this.currentScene === 'up' ? '#2C2C2C' : '#4A7C59';
            ctx.fillStyle = fallbackColor;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    }

    // Renderizar zonas de transição (debug)
    renderTransitionZones(ctx) {
        const currentSceneData = this.scenes.get(this.currentScene);
        if (!currentSceneData?.transitions) return;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.7)'; // Laranja para transições
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        const transitions = currentSceneData.transitions;

        // Zona superior
        if (transitions.up) {
            ctx.strokeRect(0, 0, ctx.canvas.width, this.transitionZone);
        }

        // Zona inferior
        if (transitions.down) {
            ctx.strokeRect(0, ctx.canvas.height - this.transitionZone, 
                          ctx.canvas.width, this.transitionZone);
        }

        ctx.restore();
    }

    // Getters
    getCurrentScene() {
        return this.currentScene;
    }

    getCurrentSceneData() {
        return this.scenes.get(this.currentScene);
    }

    getSceneData(sceneId) {
        return this.scenes.get(sceneId);
    }

    getAllScenes() {
        return Array.from(this.scenes.values());
    }

    // Status de carregamento
    getLoadingStatus() {
        const totalScenes = this.scenes.size;
        const loadedScenes = Array.from(this.scenes.values()).filter(s => s.isLoaded).length;
        
        return {
            total: totalScenes,
            loaded: loadedScenes,
            percentage: totalScenes > 0 ? (loadedScenes / totalScenes) * 100 : 0,
            isComplete: loadedScenes === totalScenes,
            isLoading: this.isLoading
        };
    }
}

// Singleton pattern para acesso global
window.SceneManager = SceneManager;