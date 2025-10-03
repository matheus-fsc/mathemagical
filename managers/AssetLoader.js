// AssetLoader - Gerencia carregamento otimizado de assets
class AssetLoader {
    constructor() {
        this.assets = new Map(); // Cache de todos os assets
        this.loadingPromises = new Map(); // Promises de carregamento ativas
        this.loadingQueue = []; // Fila de carregamento
        this.isLoading = false;
        this.loadingProgress = { loaded: 0, total: 0, percentage: 0 };
        
        // Configurações
        this.config = {
            maxConcurrentLoads: 4, // Máximo de carregamentos simultâneos
            retryAttempts: 3, // Tentativas de recarregamento
            retryDelay: 1000, // Delay entre tentativas (ms)
            useProgressiveLoading: true, // Carregamento progressivo
            enableCaching: true, // Cache de assets
            preloadCritical: true // Pré-carregar assets críticos
        };
        
        // Tipos de assets suportados
        this.assetTypes = {
            IMAGE: 'image',
            AUDIO: 'audio',
            JSON: 'json',
            SPRITE_SHEET: 'spritesheet',
            FONT: 'font'
        };
        
        // Assets críticos que devem ser carregados primeiro
        this.criticalAssets = new Set();
        
        console.log('📦 AssetLoader inicializado');
        this.setupDefaultAssets();
    }

    // Configurar assets padrão do jogo
    setupDefaultAssets() {
        // Sprites do player
        this.addToQueue('sprite_info', 'sprite_frames/sprites_info.json', this.assetTypes.JSON, true);
        
        // Backgrounds
        this.addToQueue('bg_down', 'backgrounds/imgdown.png', this.assetTypes.IMAGE, true);
        this.addToQueue('bg_up', 'backgrounds/imgup.png', this.assetTypes.IMAGE, true);
        
        // Sprites de movimento
        const walkSprites = [
            'sprite_frames/walk/link_walk_back_frame_000.png',
            'sprite_frames/walk/link_walk_back_frame_001.png',
            'sprite_frames/walk/link_walk_front_frame_000.png',
            'sprite_frames/walk/link_walk_front_frame_001.png',
            'sprite_frames/walk/link_walk_left_frame_000.png',
            'sprite_frames/walk/link_walk_left_frame_001.png'
        ];
        
        walkSprites.forEach((sprite, index) => {
            this.addToQueue(`walk_sprite_${index}`, sprite, this.assetTypes.IMAGE, true);
        });
        
        // Sprites de ataque
        const attackSprites = [
            'sprite_frames/attack/link_attack_back_frame_000.png',
            'sprite_frames/attack/link_attack_back_frame_001.png',
            'sprite_frames/attack/link_attack_back_frame_002.png',
            'sprite_frames/attack/link_attack_front_frame_000.png',
            'sprite_frames/attack/link_attack_front_frame_001.png',
            'sprite_frames/attack/link_attack_front_frame_002.png',
            'sprite_frames/attack/link_attack_left_frame_000.png',
            'sprite_frames/attack/link_attack_left_frame_001.png',
            'sprite_frames/attack/link_attack_left_frame_002.png'
        ];
        
        attackSprites.forEach((sprite, index) => {
            this.addToQueue(`attack_sprite_${index}`, sprite, this.assetTypes.IMAGE, false);
        });
    }

    // Adicionar asset à fila de carregamento
    addToQueue(assetId, url, type, isCritical = false) {
        const asset = {
            id: assetId,
            url: url,
            type: type,
            isCritical: isCritical,
            isLoaded: false,
            isLoading: false,
            loadAttempts: 0,
            data: null,
            error: null,
            size: 0,
            loadTime: 0
        };
        
        if (isCritical) {
            this.criticalAssets.add(assetId);
            // Adicionar no início da fila se for crítico
            this.loadingQueue.unshift(asset);
        } else {
            this.loadingQueue.push(asset);
        }
        
        console.log(`📋 Asset adicionado à fila: ${assetId} (${type}${isCritical ? ', crítico' : ''})`);
        return asset;
    }

    // Carregar asset individual
    async loadAsset(asset) {
        if (this.assets.has(asset.id) && this.assets.get(asset.id).isLoaded) {
            console.log(`✅ Asset já carregado: ${asset.id}`);
            return this.assets.get(asset.id);
        }

        // Verificar se já está carregando
        if (this.loadingPromises.has(asset.id)) {
            return this.loadingPromises.get(asset.id);
        }

        const loadPromise = this.performAssetLoad(asset);
        this.loadingPromises.set(asset.id, loadPromise);

        try {
            const result = await loadPromise;
            this.loadingPromises.delete(asset.id);
            return result;
        } catch (error) {
            this.loadingPromises.delete(asset.id);
            throw error;
        }
    }

    // Executar carregamento do asset
    async performAssetLoad(asset) {
        const startTime = Date.now();
        asset.isLoading = true;
        asset.loadAttempts++;

        try {
            console.log(`🔄 Carregando asset: ${asset.id} (tentativa ${asset.loadAttempts})`);

            let loadedData;
            
            switch (asset.type) {
                case this.assetTypes.IMAGE:
                    loadedData = await this.loadImage(asset.url);
                    break;
                case this.assetTypes.JSON:
                    loadedData = await this.loadJSON(asset.url);
                    break;
                case this.assetTypes.AUDIO:
                    loadedData = await this.loadAudio(asset.url);
                    break;
                default:
                    throw new Error(`Tipo de asset não suportado: ${asset.type}`);
            }

            // Sucesso
            asset.data = loadedData;
            asset.isLoaded = true;
            asset.isLoading = false;
            asset.loadTime = Date.now() - startTime;
            asset.error = null;

            // Armazenar no cache
            if (this.config.enableCaching) {
                this.assets.set(asset.id, asset);
            }

            console.log(`✅ Asset carregado: ${asset.id} (${asset.loadTime}ms)`);
            return asset;

        } catch (error) {
            console.error(`❌ Erro ao carregar asset ${asset.id}:`, error);
            
            asset.isLoading = false;
            asset.error = error;

            // Tentar novamente se não excedeu o limite
            if (asset.loadAttempts < this.config.retryAttempts) {
                console.log(`🔄 Tentando novamente carregar ${asset.id} em ${this.config.retryDelay}ms...`);
                
                await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
                return this.performAssetLoad(asset);
            } else {
                console.error(`💥 Falha definitiva ao carregar asset: ${asset.id}`);
                throw error;
            }
        }
    }

    // Carregar imagem
    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                resolve(img);
            };
            
            img.onerror = () => {
                reject(new Error(`Falha ao carregar imagem: ${url}`));
            };
            
            img.src = url;
        });
    }

    // Carregar JSON
    async loadJSON(url) {
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            throw new Error(`Falha ao carregar JSON: ${url} - ${error.message}`);
        }
    }

    // Carregar áudio
    loadAudio(url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            
            audio.addEventListener('canplaythrough', () => {
                resolve(audio);
            });
            
            audio.addEventListener('error', () => {
                reject(new Error(`Falha ao carregar áudio: ${url}`));
            });
            
            audio.src = url;
        });
    }

    // Carregar todos os assets da fila
    async loadAll() {
        if (this.isLoading) {
            console.log('⚠️ Carregamento já em progresso');
            return false;
        }

        this.isLoading = true;
        this.loadingProgress = { loaded: 0, total: this.loadingQueue.length, percentage: 0 };

        console.log(`🚀 Iniciando carregamento de ${this.loadingQueue.length} assets...`);

        try {
            // Carregar assets críticos primeiro se habilitado
            if (this.config.preloadCritical) {
                await this.loadCriticalAssets();
            }

            // Carregar assets restantes
            await this.loadNonCriticalAssets();

            console.log('✅ Todos os assets carregados com sucesso!');
            return true;

        } catch (error) {
            console.error('❌ Erro no carregamento dos assets:', error);
            return false;
        } finally {
            this.isLoading = false;
        }
    }

    // Carregar apenas assets críticos
    async loadCriticalAssets() {
        const criticalAssets = this.loadingQueue.filter(asset => asset.isCritical);
        
        if (criticalAssets.length === 0) {
            console.log('📦 Nenhum asset crítico para carregar');
            return;
        }

        console.log(`⚡ Carregando ${criticalAssets.length} assets críticos...`);

        // Carregar com limite de concorrência
        await this.loadAssetsWithConcurrency(criticalAssets);
    }

    // Carregar assets não críticos
    async loadNonCriticalAssets() {
        const nonCriticalAssets = this.loadingQueue.filter(asset => !asset.isCritical);
        
        if (nonCriticalAssets.length === 0) {
            console.log('📦 Nenhum asset não crítico para carregar');
            return;
        }

        console.log(`📦 Carregando ${nonCriticalAssets.length} assets não críticos...`);

        // Carregar com limite de concorrência
        await this.loadAssetsWithConcurrency(nonCriticalAssets);
    }

    // Carregar assets com controle de concorrência
    async loadAssetsWithConcurrency(assetList) {
        const chunks = this.chunkArray(assetList, this.config.maxConcurrentLoads);
        
        for (const chunk of chunks) {
            const promises = chunk.map(asset => {
                return this.loadAsset(asset).then(() => {
                    this.loadingProgress.loaded++;
                    this.loadingProgress.percentage = (this.loadingProgress.loaded / this.loadingProgress.total) * 100;
                    
                    // Emitir evento de progresso
                    this.onLoadingProgress(this.loadingProgress);
                });
            });
            
            await Promise.allSettled(promises);
        }
    }

    // Dividir array em chunks
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    // Callback de progresso (pode ser sobrescrito)
    onLoadingProgress(progress) {
        console.log(`📈 Progresso: ${progress.loaded}/${progress.total} (${progress.percentage.toFixed(1)}%)`);
        
        // Emitir evento
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('assetLoadingProgress', {
                detail: progress
            }));
        }
    }

    // Obter asset carregado
    getAsset(assetId) {
        const asset = this.assets.get(assetId);
        return asset?.isLoaded ? asset.data : null;
    }

    // Verificar se asset está carregado
    isAssetLoaded(assetId) {
        const asset = this.assets.get(assetId);
        return asset?.isLoaded || false;
    }

    // Obter informações de asset
    getAssetInfo(assetId) {
        return this.assets.get(assetId) || null;
    }

    // Liberar memória de asset
    unloadAsset(assetId) {
        const asset = this.assets.get(assetId);
        if (asset) {
            // Limpar dados do asset
            if (asset.data && typeof asset.data.src === 'string') {
                // Para imagens, revogar object URL se necessário
                if (asset.data.src.startsWith('blob:')) {
                    URL.revokeObjectURL(asset.data.src);
                }
            }
            
            this.assets.delete(assetId);
            console.log(`🗑️ Asset removido da memória: ${assetId}`);
            return true;
        }
        return false;
    }

    // Obter estatísticas
    getStats() {
        const stats = {
            totalAssets: this.assets.size,
            loadedAssets: 0,
            failedAssets: 0,
            criticalAssets: this.criticalAssets.size,
            totalMemoryUsage: 0,
            isLoading: this.isLoading,
            progress: this.loadingProgress
        };

        for (const asset of this.assets.values()) {
            if (asset.isLoaded) {
                stats.loadedAssets++;
            } else if (asset.error) {
                stats.failedAssets++;
            }
            
            stats.totalMemoryUsage += asset.size || 0;
        }

        return stats;
    }

    // Limpar cache
    clearCache() {
        for (const assetId of this.assets.keys()) {
            this.unloadAsset(assetId);
        }
        console.log('🧹 Cache de assets limpo');
    }
}

// Singleton pattern
window.AssetLoader = AssetLoader;