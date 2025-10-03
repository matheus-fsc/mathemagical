// Sistema de carregamento e gerenciamento de sprites
class SpriteManager {
    constructor() {
        this.sprites = {};
        this.loadingCount = 0;
        this.loadedCount = 0;
        this.onAllLoaded = null;
        this.frameCounter = 0;
        
        // Container visível para os GIFs (necessário para animação)
        this.gifContainer = document.createElement('div');
        this.gifContainer.style.position = 'fixed';
        this.gifContainer.style.left = '0px';
        this.gifContainer.style.top = '0px';
        this.gifContainer.style.zIndex = '-1000';
        this.gifContainer.style.opacity = '0.01'; // Quase invisível mas ainda renderizado
        this.gifContainer.style.pointerEvents = 'none';
        document.body.appendChild(this.gifContainer);
        
        // Força atualização dos GIFs a cada frame
        this.startFrameUpdater();
    }
    
    startFrameUpdater() {
        const updateGifs = () => {
            this.frameCounter++;
            
            // A cada 3 frames (~20fps), força uma pequena alteração visual para renovar o canvas
            if (this.frameCounter % 3 === 0) {
                Object.values(this.sprites).forEach(spriteData => {
                    if (spriteData.type === 'animated-gif') {
                        const element = spriteData.element;
                        // Técnica para forçar refresh: altera minimamente o estilo
                        element.style.transform = this.frameCounter % 6 === 0 ? 'scale(1.0001)' : 'scale(1)';
                    }
                });
            }
            
            requestAnimationFrame(updateGifs);
        };
        updateGifs();
    }

    // Carrega um sprite GIF (mantém animação)
    loadSprite(name, path) {
        // Cria múltiplas instâncias do GIF para garantir frames frescos
        const numInstances = 3;
        const instances = [];
        let loadedInstances = 0;
        
        for (let i = 0; i < numInstances; i++) {
            const img = document.createElement('img');
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                loadedInstances++;
                
                // Adiciona ao container visível com offset temporal
                img.style.width = '32px';
                img.style.height = '32px';
                img.style.imageRendering = 'pixelated';
                img.style.animationDelay = `${i * 100}ms`; // Offset de animação
                this.gifContainer.appendChild(img);
                
                instances.push(img);
                
                // Só considera carregado quando todas as instâncias estiverem prontas
                if (loadedInstances === numInstances) {
                    this.sprites[name] = {
                        instances: instances,
                        currentInstance: 0,
                        width: img.naturalWidth || img.width,
                        height: img.naturalHeight || img.height,
                        type: 'animated-gif',
                        lastSwitch: 0
                    };
                    
                    this.loadedCount++;
                    console.log(`🎬 GIF animado carregado: ${name} (${numInstances} instâncias) - Dimensões: ${img.naturalWidth}x${img.naturalHeight}`);
                    
                    if (this.loadedCount === this.loadingCount && this.onAllLoaded) {
                        this.onAllLoaded();
                    }
                }
            };
            
            img.onerror = () => {
                console.error(`Erro ao carregar GIF instância ${i}: ${name} (${path})`);
                if (i === 0) { // Só incrementa erro na primeira instância
                    this.loadedCount++;
                }
            };
            
            // Adiciona timestamp único para forçar cache diferente
            img.src = path + '?t=' + Date.now() + '_' + i;
        }
        
        this.loadingCount++; // Conta como um sprite apenas
    }

    // Carrega todos os sprites do Link
    loadLinkSprites() {
        // Sprites de caminhada
        this.loadSprite('linkWalkBack', './sprites/walk/Link (Back).gif');
        this.loadSprite('linkWalkFront', './sprites/walk/Link (Front)1.gif');
        this.loadSprite('linkWalkLeft', './sprites/walk/Link (Left)1.gif');
        
        // Sprites de ataque
        this.loadSprite('linkAttackBack', './sprites/attackSword/Link (Normal) (Back) - Wooden Sword.gif');
        this.loadSprite('linkAttackFront', './sprites/attackSword/Link (Normal) (Front) - Wooden Sword1.gif');
        this.loadSprite('linkAttackLeft', './sprites/attackSword/Link (Normal) (Left) - Wooden Sword1.gif');
    }

    // Retorna um sprite pelo nome
    getSprite(name) {
        const spriteData = this.sprites[name];
        if (!spriteData) {
            console.warn(`Sprite não encontrado: ${name}. Sprites disponíveis:`, Object.keys(this.sprites));
            return null;
        }
        
        // Para GIFs animados, rotaciona entre instâncias para garantir frames frescos
        if (spriteData.type === 'animated-gif' && spriteData.instances) {
            const currentTime = Date.now();
            
            // Troca de instância a cada 100ms para capturar diferentes frames
            if (currentTime - spriteData.lastSwitch > 100) {
                spriteData.currentInstance = (spriteData.currentInstance + 1) % spriteData.instances.length;
                spriteData.lastSwitch = currentTime;
            }
            
            return spriteData.instances[spriteData.currentInstance];
        }
        
        // Fallback para sprites não-GIF
        return spriteData.element || spriteData.instances?.[0];
    }

    // Retorna informações do sprite
    getSpriteInfo(name) {
        const spriteData = this.sprites[name];
        if (!spriteData) return null;
        
        return {
            width: spriteData.width,
            height: spriteData.height,
            type: spriteData.type,
            instances: spriteData.instances ? spriteData.instances.length : 1,
            currentInstance: spriteData.currentInstance || 0
        };
    }

    // Verifica se todos os sprites foram carregados
    allSpritesLoaded() {
        return this.loadedCount === this.loadingCount;
    }

    // Lista todos os sprites carregados (para debug)
    listLoadedSprites() {
        console.log('=== SPRITES CARREGADOS ===');
        Object.keys(this.sprites).forEach(name => {
            const spriteInfo = this.getSpriteInfo(name);
            console.log(`${name}: ${spriteInfo.width}x${spriteInfo.height} (${spriteInfo.type}) - ${spriteInfo.instances} instâncias`);
        });
        console.log('========================');
    }
}