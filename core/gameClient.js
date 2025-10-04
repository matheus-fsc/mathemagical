// GameClient - Cliente principal do jogo multiplayer
class GameClient {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.networkManager = null;
        this.multiplayerManager = null;
        this.spriteManager = null;
        this.inputManager = null;
        this.player = null;
        this.areaManager = null; // Gerenciador de áreas/backgrounds
        
        // Estado do jogo
        this.gameState = {
            isConnected: false,
            isGameRunning: false,
            playerId: null,
            nickname: 'Player',
            serverUrl: ServerConfig ? ServerConfig.getCurrentServerUrl() : 'http://localhost:3000'
        };
        
        // Sistema de debug
        this.debug = {
            enabled: false,
            showFPS: true,
            showLatency: true,
            showPlayerCount: true,
            showCoordinates: true
        };
        
        // FPS tracking
        this.fps = {
            current: 0,
            frameCount: 0,
            lastTime: 0
        };
        
        // Última posição enviada (para evitar spam)
        this.lastSentPosition = {
            x: 0,
            y: 0,
            direction: 'front',
            isMoving: false,
            timestamp: 0
        };
        
        this.positionSendInterval = 50; // Enviar posição a cada 50ms máximo
        
        // Sistema de câmera para dispositivos menores
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            smoothing: 0.1, // Suavização do movimento da câmera (0.1 = muito suave, 1 = instantâneo)
            enabled: false,
            worldWidth: 1600,  // Tamanho do mundo (ajustar conforme necessário)
            worldHeight: 1200
        };
        
        // Detectar se é dispositivo móvel/pequeno para ativar câmera
        this.camera.enabled = this.shouldEnableCamera();
    }
    
    // Verificar se deve ativar a câmera baseado no tamanho da tela
    shouldEnableCamera() {
        // Ativar câmera em dispositivos com tela pequena ou móveis
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isSmallScreen = window.innerWidth <= 800 || window.innerHeight <= 600;
        
        // Também considerar o tamanho atual do canvas
        if (this.canvas) {
            const canvasIsSmall = this.canvas.width <= 800 || this.canvas.height <= 600;
            return isMobile || isSmallScreen || canvasIsSmall;
        }
        
        return isMobile || isSmallScreen;
    }

    // Inicializar o cliente
    async init(canvasId, config = {}) {
        try {
            // Configuração
            this.gameState.nickname = config.nickname || this.gameState.nickname;
            this.gameState.serverUrl = config.serverUrl || this.gameState.serverUrl;
            
            // Canvas setup
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) {
                throw new Error(`Canvas com ID '${canvasId}' não encontrado`);
            }
            
            this.ctx = this.canvas.getContext('2d');
            
            // Inicializar managers
            this.spriteManager = new FrameBasedSpriteManager();
            this.inputManager = new InputManager();
            this.networkManager = new NetworkManager();
            this.multiplayerManager = new MultiplayerManager(this.spriteManager);
            this.areaManager = new AreaManager(this);
            
            // Adicionar fallback para mock server
            this.setupMockFallback();
            
            // Carregar sprites e backgrounds
            await this.loadSprites();
            await this.areaManager.loadBackgrounds();
            
            // Criar jogador local (posição inicial)
            let initialX, initialY;
            
            if (this.camera.enabled) {
                // Para câmera ativa, colocar player no centro do mundo
                initialX = this.camera.worldWidth / 2;
                initialY = this.camera.worldHeight / 2;
            } else {
                // Para telas grandes, manter posição original
                initialX = this.canvas.width / 2;
                initialY = this.canvas.height / 2;
            }
            
            this.player = new FrameBasedPlayer(initialX, initialY, this.spriteManager, this.inputManager);
            this.player.canvas = this.canvas; // Adicionar referência do canvas
            this.player.areaManager = this.areaManager; // Adicionar referência do areaManager
            this.player.gameClient = this; // Adicionar referência do gameClient para acessar câmera
            
            // Configurar eventos de rede
            this.setupNetworkEvents();
            
            // Configurar input
            this.setupInput();
            
            // Configurar virtual joystick se disponível
            this.setupVirtualJoystick();
            
            // Ativar o jogo em modo singleplayer por padrão
            this.gameState.isGameRunning = true;
            
            console.log('🎮 Cliente inicializado com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar cliente:', error);
            throw error;
        }
    }

    // Configurar fallback para mock server
    setupMockFallback() {
        const originalConnect = this.networkManager.connect.bind(this.networkManager);
        
        this.networkManager.connect = async (playerData) => {
            try {
                // Tentar conexão real primeiro
                return await originalConnect(playerData);
            } catch (error) {
                console.warn('⚠️ Conexão real falhou, usando servidor simulado:', error.message);
                
                // Criar mock server
                const mockServer = new MockServer();
                
                // Substituir métodos do networkManager com o mock
                this.networkManager.sendPosition = mockServer.sendPosition.bind(mockServer);
                this.networkManager.sendAttack = mockServer.sendAttack.bind(mockServer);
                this.networkManager.getLatency = mockServer.getLatency.bind(mockServer);
                this.networkManager.getPlayerId = mockServer.getPlayerId.bind(mockServer);
                this.networkManager.isSocketConnected = mockServer.isSocketConnected.bind(mockServer);
                this.networkManager.disconnect = mockServer.disconnect.bind(mockServer);
                
                // Configurar callbacks do mock
                Object.keys(this.networkManager.callbacks).forEach(callbackKey => {
                    if (this.networkManager.callbacks[callbackKey]) {
                        mockServer.setCallback(callbackKey.replace('on', '').toLowerCase(), this.networkManager.callbacks[callbackKey]);
                    }
                });
                
                // Conectar ao mock
                return await mockServer.connect(playerData);
            }
        };
    }

    // Carregar sprites
    async loadSprites() {
        // Primeiro carregar as informações dos sprites
        const infoLoaded = await this.spriteManager.loadSpritesInfo();
        if (!infoLoaded) {
            console.error('Não foi possível carregar informações dos sprites');
            return;
        }

        const sprites = [
            'link_walk_back',    // up
            'link_walk_front',   // down  
            'link_walk_left',    // left
            'link_attack_back',  // attack up
            'link_attack_front', // attack down
            'link_attack_left'   // attack left
        ];
        
        const spriteMapping = {
            'link_walk_back': 'walk_up',
            'link_walk_front': 'walk_down',
            'link_walk_left': ['walk_left', 'walk_right'], // usar para ambos os lados
            'link_attack_back': 'attack_up',
            'link_attack_front': 'attack_down',
            'link_attack_left': ['attack_left', 'attack_right'] // usar para ambos os lados
        };
        
        for (const originalSpriteName of sprites) {
            await this.spriteManager.loadAnimatedSprite(originalSpriteName);
            
            // Criar aliases para os nomes esperados
            const mappings = spriteMapping[originalSpriteName];
            if (Array.isArray(mappings)) {
                mappings.forEach(aliasName => {
                    this.spriteManager.spriteAliases = this.spriteManager.spriteAliases || {};
                    this.spriteManager.spriteAliases[aliasName] = originalSpriteName;
                });
            } else {
                this.spriteManager.spriteAliases = this.spriteManager.spriteAliases || {};
                this.spriteManager.spriteAliases[mappings] = originalSpriteName;
            }
        }
        
        console.log('✅ Sprites carregados');
    }

    // Configurar eventos de rede
    setupNetworkEvents() {
        // Conexão estabelecida
        this.networkManager.setCallback('connected', () => {
            this.gameState.isConnected = true;
            this.gameState.isGameRunning = true;
            this.showMessage('Conectado ao servidor', 'success');
        });

        // Desconexão
        this.networkManager.setCallback('disconnected', (reason) => {
            this.gameState.isConnected = false;
            // Manter o jogo rodando em modo singleplayer
            this.gameState.isGameRunning = true;
            this.showMessage(`Desconectado: ${reason} - Modo singleplayer ativo`, 'warning');
            this.multiplayerManager.clear(); // Limpar outros jogadores
        });

        // Jogador entrou no jogo
        this.networkManager.setCallback('playerJoined', (playerData) => {
            this.gameState.playerId = playerData.id;
            this.gameState.isGameRunning = true;
            
            // Definir cor do jogador local se fornecida
            if (playerData.color && this.player) {
                this.player.color = playerData.color;
            }
            
            this.showMessage('Entrou no jogo!', 'success');
        });

        // Novo jogador conectou
        this.networkManager.setCallback('playerConnected', (playerData) => {
            this.multiplayerManager.addPlayer(playerData);
            this.showMessage(`${playerData.nickname} entrou no jogo`, 'info');
        });

        // Jogador desconectou
        this.networkManager.setCallback('playerDisconnected', (data) => {
            const player = this.multiplayerManager.getPlayer(data.playerId);
            if (player) {
                this.showMessage(`${player.nickname} saiu do jogo`, 'info');
                this.multiplayerManager.removePlayer(data.playerId);
            }
        });

        // Jogador se moveu
        this.networkManager.setCallback('playerMoved', (data) => {
            this.multiplayerManager.updatePlayerPosition(data);
        });

        // Jogador atacou
        this.networkManager.setCallback('playerAttacked', (data) => {
            this.multiplayerManager.updatePlayerAttack(data);
        });

        // Estado do jogo atualizado
        this.networkManager.setCallback('gameState', (gameState) => {
            this.syncGameState(gameState);
        });

        // Erro de conexão
        this.networkManager.setCallback('connectionError', (error) => {
            this.showMessage(`Erro: ${error.message}`, 'error');
        });
    }

    // Sincronizar estado do jogo
    syncGameState(gameState) {
        // Atualizar jogadores
        gameState.players.forEach(playerData => {
            if (playerData.id !== this.gameState.playerId) {
                if (!this.multiplayerManager.getPlayer(playerData.id)) {
                    this.multiplayerManager.addPlayer(playerData);
                } else {
                    this.multiplayerManager.updatePlayerPosition(playerData);
                }
            }
        });

        // Remover jogadores que não estão mais no estado
        const currentPlayerIds = gameState.players.map(p => p.id);
        this.multiplayerManager.getPlayers().forEach(player => {
            if (!currentPlayerIds.includes(player.id)) {
                this.multiplayerManager.removePlayer(player.id);
            }
        });
    }

    // Configurar input
    setupInput() {
        // Debug toggle
        this.inputManager.addKeyHandler('F1', () => {
            this.debug.enabled = !this.debug.enabled;
        });

        // Conectar/desconectar
        this.inputManager.addKeyHandler('F2', () => {
            if (this.gameState.isConnected) {
                this.disconnect();
            } else {
                this.connect();
            }
        });

        // Interceptar ataques para enviar pela rede
        const originalAttack = this.player.startAttack.bind(this.player);
        this.player.attack = () => {
            if (this.gameState.isGameRunning && this.player.canAttack) {
                originalAttack();
                
                // Enviar ataque para outros jogadores
                this.networkManager.sendAttack(
                    this.player.facing,
                    this.player.x,
                    this.player.y
                );
            }
        };
        
        // Manter o método original também disponível
        this.player.startAttack = () => {
            if (this.gameState.isGameRunning && this.player.canAttack) {
                originalAttack();
                
                // Enviar ataque para outros jogadores
                this.networkManager.sendAttack(
                    this.player.facing,
                    this.player.x,
                    this.player.y
                );
            }
        };
    }

    // Configurar virtual joystick se disponível
    setupVirtualJoystick() {
        // O VirtualJoystick já será atribuído durante a inicialização do jogo
        // Verificar se foi atribuído corretamente
        if (this.virtualJoystick) {
            console.log('🕹️ VirtualJoystick já está conectado ao GameClient');
        } else {
            console.log('⚠️ VirtualJoystick não encontrado - será configurado durante inicialização do jogo');
        }
    }

    // Conectar ao servidor
    async connect(nickname = null) {
        try {
            if (this.gameState.isConnected) {
                console.log('⚠️ Já conectado ao servidor');
                return;
            }

            this.showMessage('Conectando...', 'info');
            
            const playerData = {
                nickname: nickname || this.gameState.nickname
            };

            console.log('🔍 Conectando com playerData:', playerData);
            console.log('🔍 gameState.nickname atual:', this.gameState.nickname);
            console.log('🔍 nickname parameter:', nickname);

            await this.networkManager.connect(playerData);
            
        } catch (error) {
            console.error('❌ Erro ao conectar:', error);
            this.showMessage(`Erro ao conectar: ${error.message}`, 'error');
        }
    }

    // Desconectar do servidor
    disconnect() {
        if (this.networkManager) {
            this.networkManager.disconnect();
            this.multiplayerManager.clear();
            this.gameState.isConnected = false;
            // Manter o jogo rodando em modo singleplayer
            this.gameState.isGameRunning = true;
            this.showMessage('Desconectado - Modo singleplayer ativo', 'info');
        }
    }

    // Loop principal do jogo
    update(deltaTime) {
        if (!this.gameState.isGameRunning) return;

        // Preparar dados do joystick virtual se disponível
        let joystickData = null;
        if (this.virtualJoystick) {
            if (this.virtualJoystick.active) {
                joystickData = {
                    direction: this.virtualJoystick.currentDirection,
                    magnitude: this.virtualJoystick.currentMagnitude
                };
            }
        }

        // Atualizar jogador local com dados do joystick
        if (this.player) {
            this.player.update(deltaTime, this.inputManager, joystickData);
        }
        
        // Atualizar câmera para seguir o jogador
        this.updateCamera();
        
        // Verificar transições de área
        if (this.areaManager) {
            this.areaManager.checkTransitions(this.player);
        }
        
        // Verificar interações com mouse (incluindo área do personagem)
        if (this.mouseManager) {
            this.mouseManager.checkInteractions();
        }
        
        // Enviar posição se mudou
        this.sendPositionIfChanged();
        
        // Atualizar outros jogadores
        this.multiplayerManager.update(deltaTime);
        
        // Atualizar FPS
        this.updateFPS();
    }

    // Enviar posição se mudou
    sendPositionIfChanged() {
        const now = Date.now();
        const timeSinceLastSend = now - this.lastSentPosition.timestamp;
        
        if (timeSinceLastSend < this.positionSendInterval) return;
        
        const currentPos = {
            x: Math.round(this.player.x),
            y: Math.round(this.player.y),
            direction: this.player.facing,
            isMoving: this.player.isMoving
        };

        // Verificar se a posição mudou significativamente
        const posChanged = Math.abs(currentPos.x - this.lastSentPosition.x) > 1 ||
                          Math.abs(currentPos.y - this.lastSentPosition.y) > 1 ||
                          currentPos.direction !== this.lastSentPosition.direction ||
                          currentPos.isMoving !== this.lastSentPosition.isMoving;

        // Verificar se a área mudou
        const currentArea = this.areaManager ? this.areaManager.getCurrentArea() : 'down';
        const areaChanged = currentArea !== this.lastSentPosition.area;

        // Verificar se o joystick está ativo (forçar envio para garantir movimento suave)
        const joystickActive = this.virtualJoystick && this.virtualJoystick.active;

        if (posChanged || areaChanged || joystickActive) {
            this.networkManager.sendPosition(
                currentPos.x,
                currentPos.y,
                currentPos.direction,
                currentPos.isMoving,
                currentArea
            );

            this.lastSentPosition = { ...currentPos, area: currentArea, timestamp: now };
        }
    }

    // ===== SISTEMA DE CÂMERA =====
    
    // Atualizar posição da câmera para seguir o jogador
    updateCamera() {
        if (!this.camera.enabled || !this.player) return;
        
        // Calcular posição alvo da câmera (centralizar jogador na tela)
        this.camera.targetX = this.player.x - this.canvas.width / 2;
        this.camera.targetY = this.player.y - this.canvas.height / 2;
        
        // Limitar câmera aos limites do mundo
        const maxCameraX = this.camera.worldWidth - this.canvas.width;
        const maxCameraY = this.camera.worldHeight - this.canvas.height;
        
        this.camera.targetX = Math.max(0, Math.min(this.camera.targetX, maxCameraX));
        this.camera.targetY = Math.max(0, Math.min(this.camera.targetY, maxCameraY));
        
        // Aplicar suavização na movimentação da câmera
        this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.smoothing;
        this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.smoothing;
        
        // Garantir que a posição final da câmera também esteja dentro dos limites
        this.camera.x = Math.max(0, Math.min(this.camera.x, maxCameraX));
        this.camera.y = Math.max(0, Math.min(this.camera.y, maxCameraY));
    }
    
    // Aplicar transformação da câmera ao contexto
    applyCameraTransform() {
        if (!this.camera.enabled) return;
        
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
    }
    
    // Remover transformação da câmera do contexto
    removeCameraTransform() {
        if (!this.camera.enabled) return;
        
        this.ctx.restore();
    }
    
    // Converter coordenadas de tela para coordenadas do mundo
    screenToWorld(screenX, screenY) {
        if (!this.camera.enabled) {
            return { x: screenX, y: screenY };
        }
        return {
            x: screenX + this.camera.x,
            y: screenY + this.camera.y
        };
    }
    
    // Converter coordenadas do mundo para coordenadas de tela
    worldToScreen(worldX, worldY) {
        if (!this.camera.enabled) {
            return { x: worldX, y: worldY };
        }
        return {
            x: worldX - this.camera.x,
            y: worldY - this.camera.y
        };
    }

    // Renderizar jogo
    render() {
        // Limpar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.gameState.isGameRunning) {
            this.renderConnectionScreen();
            return;
        }

        // ===== RENDERIZAR ELEMENTOS DO MUNDO (com câmera) =====
        this.applyCameraTransform();
        
        // Renderizar background da área atual
        if (this.areaManager) {
            this.areaManager.renderBackground(this.ctx);
        }

        // Renderizar jogador local
        this.player.render(this.ctx);
        
        // Renderizar outros jogadores
        const currentArea = this.areaManager ? this.areaManager.getCurrentArea() : 'down';
        this.multiplayerManager.render(this.ctx, { x: 0, y: 0 }, currentArea);
        
        // Renderizar zonas de transição (debug)
        if (this.areaManager && this.debug.enabled) {
            this.areaManager.renderTransitionZones(this.ctx);
            this.areaManager.renderCollisionAreas(this.ctx);
        }
        
        // Renderizar áreas de interação do mouse (debug)
        if (this.mouseManager && this.debug.enabled) {
            this.mouseManager.renderDebugAreas(this.ctx);
        }
        
        this.removeCameraTransform();
        // ===== FIM DOS ELEMENTOS DO MUNDO =====
        
        // ===== RENDERIZAR UI (sem câmera) =====
        // Renderizar debug info
        if (this.debug.enabled) {
            this.renderDebugInfo();
        }
        
        // Renderizar UI
        this.renderUI();
    }

    // Renderizar tela de conexão
    renderConnectionScreen() {
        this.ctx.save();
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Pressione F2 para conectar', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Servidor: ${this.gameState.serverUrl}`, this.canvas.width / 2, this.canvas.height / 2 + 40);
        this.ctx.fillText(`Nickname: ${this.gameState.nickname}`, this.canvas.width / 2, this.canvas.height / 2 + 60);
        
        this.ctx.restore();
    }

    // Renderizar debug info
    renderDebugInfo() {
        // Determinar modo do jogo
        let gameMode = 'Parado';
        if (this.gameState.isConnected) {
            gameMode = 'Multiplayer';
        } else if (this.gameState.isGameRunning) {
            gameMode = 'Singleplayer';
        }
        
        const debugInfo = [
            `FPS: ${this.fps.current}`,
            `Latência: ${this.networkManager.getLatency()}ms`,
            `Jogadores: ${this.multiplayerManager.getPlayerCount() + 1}`,
            `Posição: ${Math.round(this.player.x)}, ${Math.round(this.player.y)}`,
            `Direção: ${this.player.facing}`,
            `Cor: ${this.player.color || 'Padrão'}`,
            `Modo: ${gameMode}`,
            `Câmera: ${this.camera.enabled ? 'Ativa' : 'Inativa'}`,
            ...(this.camera.enabled ? [`Câmera XY: ${Math.round(this.camera.x)}, ${Math.round(this.camera.y)}`] : [])
        ];

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 220, debugInfo.length * 20 + 10);
        
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'left';
        
        debugInfo.forEach((info, index) => {
            this.ctx.fillText(info, 20, 30 + index * 20);
        });
        
        // Mostrar cor do jogador como uma pequena amostra
        if (this.player.color) {
            this.ctx.fillStyle = this.player.color;
            this.ctx.fillRect(180, 120, 15, 15);
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(180, 120, 15, 15);
        }
        
        this.ctx.restore();
    }

    // Renderizar UI
    renderUI() {
        // Indicador de conexão
        let indicator = '🔴'; // Desconectado
        if (this.gameState.isConnected) {
            indicator = '🟢'; // Multiplayer
        } else if (this.gameState.isGameRunning) {
            indicator = '�'; // Singleplayer
        }
        
        this.ctx.save();
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(indicator, this.canvas.width - 20, 30);
        
        // Mostrar cor do jogador
        if (this.player.color) {
            this.ctx.fillStyle = this.player.color;
            this.ctx.fillRect(this.canvas.width - 50, 40, 20, 20);
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(this.canvas.width - 50, 40, 20, 20);
            
            // Texto "Sua cor"
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText('Sua cor', this.canvas.width - 55, 55);
        }
        
        this.ctx.restore();
    }

    // Atualizar FPS
    updateFPS() {
        this.fps.frameCount++;
        const now = Date.now();
        
        if (now - this.fps.lastTime >= 1000) {
            this.fps.current = this.fps.frameCount;
            this.fps.frameCount = 0;
            this.fps.lastTime = now;
        }
    }

    // Mostrar mensagem na tela
    showMessage(message, type = 'info') {
        console.log(`📱 ${type.toUpperCase()}: ${message}`);
        
        // Criar elemento de mensagem na tela (opcional)
        const messageEl = document.createElement('div');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 5px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 1000;
            background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4444ff'};
        `;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    // Getters
    getGameState() {
        return { ...this.gameState };
    }

    isConnected() {
        return this.gameState.isConnected;
    }

    isGameRunning() {
        return this.gameState.isGameRunning;
    }
    
    isSingleplayer() {
        return this.gameState.isGameRunning && !this.gameState.isConnected;
    }
    
    get debugMode() {
        return this.debug.enabled;
    }
}