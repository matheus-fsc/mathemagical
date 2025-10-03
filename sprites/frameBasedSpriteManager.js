// Sistema de animação baseado em frames PNG extraídos de GIFs
class FrameBasedSpriteManager {
    constructor() {
        this.sprites = {};
        this.spriteAliases = {}; // Para mapear nomes alternativos
        this.loadingCount = 0;
        this.loadedCount = 0;
        this.onAllLoaded = null;
        this.spritesInfo = null;
    }

    // Carrega informações dos sprites do JSON
    async loadSpritesInfo() {
        try {
            const response = await fetch('./sprite_frames/sprites_info.json');
            this.spritesInfo = await response.json();
            console.log('Informações dos sprites carregadas:', this.spritesInfo);
            return true;
        } catch (error) {
            console.error('Erro ao carregar sprites_info.json:', error);
            return false;
        }
    }

    // Carrega um sprite animado baseado em frames PNG
    async loadAnimatedSprite(spriteName) {
        if (!this.spritesInfo || !this.spritesInfo.sprites[spriteName]) {
            console.error(`Sprite não encontrado nas informações: ${spriteName}`);
            return Promise.reject(new Error(`Sprite ${spriteName} não encontrado`));
        }

        const spriteInfo = this.spritesInfo.sprites[spriteName];
        const frames = [];
        let loadedFrames = 0;

        this.loadingCount++;

        return new Promise((resolve, reject) => {
            // Carrega cada frame
            spriteInfo.frames.forEach((frameInfo, index) => {
                const img = new Image();
                
                img.onload = () => {
                    frames[index] = img;
                    loadedFrames++;
                    
                    console.log(`Frame ${index + 1}/${spriteInfo.frames.length} carregado para ${spriteName}`);
                    
                    // Quando todos os frames estiverem carregados
                    if (loadedFrames === spriteInfo.frames.length) {
                        this.sprites[spriteName] = {
                            frames: frames,
                            frameCount: spriteInfo.frame_count,
                            frameDuration: spriteInfo.frame_duration,
                            frameInfos: spriteInfo.frames, // Guarda informações individuais dos frames
                            width: spriteInfo.width,
                            height: spriteInfo.height,
                            currentFrame: 0,
                            lastFrameTime: 0,
                            type: 'animated-frames'
                        };
                        
                        this.loadedCount++;
                        console.log(`✅ Sprite animado carregado: ${spriteName} (${spriteInfo.frame_count} frames)`);
                        
                        if (this.loadedCount === this.loadingCount && this.onAllLoaded) {
                            this.onAllLoaded();
                        }
                        
                        resolve();
                    }
                };
                
                img.onerror = () => {
                    console.error(`Erro ao carregar frame ${index} de ${spriteName}: ${frameInfo.filename}`);
                    reject(new Error(`Erro ao carregar frame ${index} de ${spriteName}`));
                };
                
                // Determina o caminho baseado no tipo de sprite
                let basePath = './sprite_frames/';
                if (spriteName.includes('walk')) {
                    basePath += 'walk/';
                } else if (spriteName.includes('attack')) {
                    basePath += 'attack/';
                }
                
                img.src = basePath + frameInfo.filename;
            });
        });
    }

    // Carrega todos os sprites do Link
    async loadLinkSprites() {
        const infoLoaded = await this.loadSpritesInfo();
        if (!infoLoaded) {
            console.error('Não foi possível carregar informações dos sprites');
            return;
        }

        // Lista de sprites para carregar
        const spritesToLoad = [
            'link_walk_back',
            'link_walk_front', 
            'link_walk_left',
            'link_attack_back',
            'link_attack_front',
            'link_attack_left'
        ];

        spritesToLoad.forEach(spriteName => {
            this.loadAnimatedSprite(spriteName);
        });
    }

    // Retorna o frame atual do sprite
    getSprite(name, currentTime = Date.now(), color = null) {
        // Verificar se é um alias
        let actualName = this.spriteAliases[name] || name;
        let shouldFlip = false;
        
        // Espelhar sprites "right" usando os sprites "left"
        if (name.includes('_right')) {
            actualName = actualName.replace('_right', '_left');
            shouldFlip = true;
        }
        
        const spriteData = this.sprites[actualName];
        
        if (!spriteData) {
            console.warn(`Sprite não encontrado: ${name} (${actualName}). Sprites disponíveis:`, Object.keys(this.sprites));
            return null;
        }

        // Usa duração individual de cada frame se disponível
        let currentFrameDuration = spriteData.frameDuration;
        if (spriteData.frameInfos && spriteData.frameInfos[spriteData.currentFrame]) {
            currentFrameDuration = spriteData.frameInfos[spriteData.currentFrame].duration;
        }

        // Calcula qual frame deve ser mostrado baseado no tempo
        const timeSinceLastFrame = currentTime - spriteData.lastFrameTime;
        
        if (timeSinceLastFrame >= currentFrameDuration) {
            // Para sprites de ataque, não faz loop - para no último frame
            if (name.includes('attack')) {
                if (spriteData.currentFrame < spriteData.frameCount - 1) {
                    spriteData.currentFrame++;
                    spriteData.lastFrameTime = currentTime;
                    console.log(`⚔️ ${name}: avançou para frame ${spriteData.currentFrame}/${spriteData.frameCount}`);
                }
                // Se chegou no último frame, fica parado nele
            } else {
                // Para sprites de movimento, faz loop normal
                spriteData.currentFrame = (spriteData.currentFrame + 1) % spriteData.frameCount;
                spriteData.lastFrameTime = currentTime;
            }
        }

        const currentFrame = spriteData.frames[spriteData.currentFrame];
        
        // Se precisa espelhar ou colorir, criar canvas temporário
        if (shouldFlip || color) {
            return this.createColoredSprite(currentFrame, color, shouldFlip);
        }

        return currentFrame;
    }

    // Criar sprite colorido e/ou espelhado
    createColoredSprite(originalImage, color, shouldFlip = false) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;
        
        // Espelhar se necessário
        if (shouldFlip) {
            ctx.scale(-1, 1);
            ctx.drawImage(originalImage, -canvas.width, 0);
        } else {
            ctx.drawImage(originalImage, 0, 0);
        }
        
        // Aplicar cor se fornecida
        if (color) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Converter cor hex para RGB
            const colorRGB = this.hexToRgb(color);
            
            for (let i = 0; i < data.length; i += 4) {
                // Apenas colorir pixels que não são transparentes
                if (data[i + 3] > 0) {
                    // Calcular intensidade do pixel original (escala de cinza)
                    const intensity = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
                    
                    // Aplicar cor mantendo a intensidade
                    data[i] = colorRGB.r * intensity;     // Red
                    data[i + 1] = colorRGB.g * intensity; // Green
                    data[i + 2] = colorRGB.b * intensity; // Blue
                    // Alpha permanece o mesmo
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
        }
        
        return canvas;
    }

    // Converter cor hexadecimal para RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }

    // Retorna informações do sprite
    getSpriteInfo(name) {
        // Verificar se é um alias
        const actualName = this.spriteAliases[name] || name;
        const spriteData = this.sprites[actualName];
        if (!spriteData) return null;
        
        return {
            width: spriteData.width,
            height: spriteData.height,
            type: spriteData.type,
            frameCount: spriteData.frameCount,
            currentFrame: spriteData.currentFrame,
            frameDuration: spriteData.frameDuration
        };
    }

    // Verifica se todos os sprites foram carregados
    allSpritesLoaded() {
        return this.loadedCount === this.loadingCount;
    }

    // Lista todos os sprites carregados (para debug)
    listLoadedSprites() {
        console.log('=== SPRITES ANIMADOS CARREGADOS ===');
        Object.keys(this.sprites).forEach(name => {
            const spriteInfo = this.getSpriteInfo(name);
            console.log(`${name}: ${spriteInfo.width}x${spriteInfo.height} (${spriteInfo.frameCount} frames, ${spriteInfo.frameDuration}ms/frame)`);
        });
        console.log('==================================');
    }

    // Reinicia animação de um sprite
    resetSpriteAnimation(name) {
        // Verificar se é um alias
        const actualName = this.spriteAliases[name] || name;
        const spriteData = this.sprites[actualName];
        if (spriteData) {
            spriteData.currentFrame = 0;
            spriteData.lastFrameTime = Date.now();
        }
    }
}