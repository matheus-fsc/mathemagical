// NetworkManager - Gerencia conexões WebSocket
class NetworkManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.serverUrl = ServerConfig ? ServerConfig.getCurrentServerUrl() : 'https://link-websocket-game.onrender.com';
        this.playerId = null;
        this.latency = 0;
        this.connectionAttempts = 0;
        this.maxAttempts = 3;
        
        console.log('🔧 NetworkManager inicializado com URL:', this.serverUrl);
        
        // Callbacks para eventos
        this.callbacks = {
            onConnected: null,
            onDisconnected: null,
            onPlayerJoined: null,
            onPlayerConnected: null,
            onPlayerDisconnected: null,
            onPlayerMoved: null,
            onPlayerAttacked: null,
            onGameState: null,
            onConnectionError: null
        };
        
        // Ping interval
        this.pingInterval = null;
    }

    // Conectar ao servidor
    connect(playerData = {}) {
        return new Promise((resolve, reject) => {
            try {
                // Socket.io já deve estar carregado via script tag
                if (typeof io === 'undefined') {
                    console.error('Socket.io não está disponível. Verifique se o script foi carregado.');
                    reject(new Error('Socket.io não disponível'));
                    return;
                }
                this.tryConnection(playerData, resolve, reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Tentar conexão com retry automático para cold start do Render
    async tryConnection(playerData, resolve, reject) {
        const urls = [this.serverUrl];
        
        // Adicionar URLs alternativas se disponível
        if (ServerConfig && ServerConfig.getAlternativeUrls) {
            urls.push(...ServerConfig.getAlternativeUrls().filter(url => url !== this.serverUrl));
        }
        
        console.log('🔄 URLs disponíveis:', urls);
        
        for (let urlIndex = 0; urlIndex < urls.length; urlIndex++) {
            const url = urls[urlIndex];
            console.log(`🔗 Testando URL ${urlIndex + 1}/${urls.length}: ${url}`);
            
            // Estratégia de retry para cada URL (especial para Render cold start)
            const maxRetries = url.includes('render.com') ? 5 : 2; // Mais tentativas para Render
            
            for (let retry = 0; retry < maxRetries; retry++) {
                try {
                    const retryInfo = retry > 0 ? ` (retry ${retry}/${maxRetries - 1})` : '';
                    console.log(`🔗 Tentativa${retryInfo}: ${url}`);
                    
                    if (retry > 0) {
                        // Delay progressivo entre tentativas
                        const delay = this.calculateRetryDelay(retry, url.includes('render.com'));
                        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
                        await this.sleep(delay);
                    }
                    
                    await this.establishConnection(playerData, url);
                    console.log('✅ Conexão estabelecida com sucesso!');
                    resolve(this);
                    return;
                    
                } catch (error) {
                    const isLastRetry = retry === maxRetries - 1;
                    const isLastUrl = urlIndex === urls.length - 1;
                    
                    if (this.isRetryableError(error, url)) {
                        console.log(`⚠️ Erro retriável${retry > 0 ? ` (tentativa ${retry + 1})` : ''}: ${error.message}`);
                        
                        if (url.includes('render.com') && retry < 2) {
                            console.log('🌙 Servidor Render pode estar em sleep, aguardando wake-up...');
                        }
                        
                        if (!isLastRetry) continue; // Tenta novamente
                    }
                    
                    console.log(`❌ Falha na URL ${url}${retry > 0 ? ` após ${retry + 1} tentativas` : ''}: ${error.message}`);
                    
                    if (isLastRetry && isLastUrl) {
                        reject(new Error(`Falha em todas as tentativas de conexão: ${error.message}`));
                        return;
                    }
                    
                    break; // Vai para próxima URL
                }
            }
        }
    }

    // Calcular delay entre tentativas (progressivo)
    calculateRetryDelay(attempt, isRender = false) {
        if (isRender) {
            // Para Render: delays maiores para aguardar cold start
            const delays = [2000, 5000, 8000, 12000, 15000]; // 2s, 5s, 8s, 12s, 15s
            return delays[Math.min(attempt - 1, delays.length - 1)];
        } else {
            // Para outros serviços: delay padrão
            return Math.min(1000 * attempt, 5000); // Máximo 5s
        }
    }

    // Verificar se é um erro que vale a pena tentar novamente
    isRetryableError(error, url) {
        const retryableErrors = [
            'timeout',
            'network error',
            'Transport unknown',
            'websocket error',
            'polling error',
            'xhr poll error',
            'connection error'
        ];
        
        const errorMessage = error.message.toLowerCase();
        const isRetryable = retryableErrors.some(retryError => 
            errorMessage.includes(retryError)
        );
        
        // Para Render, também considerar timeouts como retriáveis
        if (url.includes('render.com')) {
            return isRetryable || errorMessage.includes('timeout') || errorMessage.includes('failed to fetch');
        }
        
        return isRetryable;
    }

    // Helper para sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    establishConnection(playerData, serverUrl = null) {
        return new Promise((resolve, reject) => {
            const url = serverUrl || this.serverUrl;
            console.log('🔄 Tentando conectar em:', url);
            
            // Timeout para conexão (mais tempo para Render devido ao cold start)
            const timeoutDuration = url.includes('render.com') ? 20000 : 10000; // 20s para Render, 10s para outros
            const timeoutId = setTimeout(() => {
                if (!this.isConnected) {
                    const errorMsg = url.includes('render.com') ? 
                        'Timeout na conexão (servidor pode estar em cold start)' : 
                        'Timeout na conexão';
                    reject(new Error(errorMsg));
                }
            }, timeoutDuration);
            
            this.socket = io(url, {
                transports: ['websocket', 'polling'],
                timeout: timeoutDuration, // Usar o mesmo timeout no Socket.io
                forceNew: true
            });

            // Eventos de conexão
            this.socket.on('connect', () => {
                console.log('🌐 Conectado ao servidor:', url);
                clearTimeout(timeoutId); // Limpar timeout em caso de sucesso
                this.isConnected = true;
                this.serverUrl = url; // Atualizar URL bem-sucedida
                this.startPing();
                
                // Entrar no jogo
                this.socket.emit('joinGame', playerData);
                
                if (this.callbacks.onConnected) {
                    this.callbacks.onConnected();
                }
                resolve(this);
            });

            this.socket.on('connect_error', (error) => {
                console.log('❌ Erro de conexão:', error.message);
                console.log('🔍 URL tentada:', url);
                this.isConnected = false;
                reject(error);
            });

            this.socket.on('disconnect', (reason) => {
                console.log('🔌 Desconectado do servidor:', reason);
                this.isConnected = false;
                this.stopPing();
                
                if (this.callbacks.onDisconnected) {
                    this.callbacks.onDisconnected(reason);
                }
            });

            // Eventos do jogo
            this.socket.on('playerJoined', (playerData) => {
                console.log('👤 Você entrou no jogo:', playerData);
                this.playerId = playerData.id;
                
                if (this.callbacks.onPlayerJoined) {
                    this.callbacks.onPlayerJoined(playerData);
                }
            });

            this.socket.on('playerConnected', (playerData) => {
                console.log('👥 Novo jogador conectou:', playerData);
                if (this.callbacks.onPlayerConnected) {
                    this.callbacks.onPlayerConnected(playerData);
                }
            });

            this.socket.on('playerDisconnected', (data) => {
                console.log('👋 Jogador desconectou:', data);
                if (this.callbacks.onPlayerDisconnected) {
                    this.callbacks.onPlayerDisconnected(data);
                }
            });

            this.socket.on('playerMoved', (data) => {
                if (this.callbacks.onPlayerMoved) {
                    this.callbacks.onPlayerMoved(data);
                }
            });

            this.socket.on('playerAttacked', (data) => {
                if (this.callbacks.onPlayerAttacked) {
                    this.callbacks.onPlayerAttacked(data);
                }
            });

            this.socket.on('gameState', (gameState) => {
                if (this.callbacks.onGameState) {
                    this.callbacks.onGameState(gameState);
                }
            });

            this.socket.on('connectionError', (error) => {
                console.error('❌ Erro de conexão:', error);
                if (this.callbacks.onConnectionError) {
                    this.callbacks.onConnectionError(error);
                }
                reject(error);
            });

            // Ping/Pong para latência
            this.socket.on('pong', (data) => {
                this.latency = Date.now() - data.clientTime;
            });
        });
    }

    // Enviar posição para o servidor
    sendPosition(x, y, direction, isMoving, area = 'down') {
        if (this.isConnected && this.socket) {
            this.socket.emit('updatePosition', {
                x: x,
                y: y,
                direction: direction,
                isMoving: isMoving,
                area: area,
                timestamp: Date.now()
            });
        }
    }

    // Enviar ataque para o servidor
    sendAttack(direction, x, y) {
        if (this.isConnected && this.socket) {
            this.socket.emit('playerAttack', {
                direction: direction,
                x: x,
                y: y,
                timestamp: Date.now()
            });
        }
    }

    // Configurar callbacks
    setCallback(eventName, callback) {
        if (this.callbacks.hasOwnProperty(`on${eventName.charAt(0).toUpperCase() + eventName.slice(1)}`)) {
            this.callbacks[`on${eventName.charAt(0).toUpperCase() + eventName.slice(1)}`] = callback;
        }
    }

    // Ping para medir latência
    startPing() {
        this.pingInterval = setInterval(() => {
            if (this.isConnected && this.socket) {
                this.socket.emit('ping', {
                    clientTime: Date.now()
                });
            }
        }, 2000);
    }

    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    // Desconectar
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.stopPing();
            this.isConnected = false;
        }
    }

    // Getters
    getLatency() {
        return this.latency;
    }

    getPlayerId() {
        return this.playerId;
    }

    isSocketConnected() {
        return this.isConnected;
    }
}