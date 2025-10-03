// Mock Server para testes locais (quando o servidor real não estiver disponível)
class MockServer {
    constructor() {
        this.isActive = false;
        this.players = new Map();
        this.callbacks = {};
    }

    // Simular conexão
    connect(playerData) {
        return new Promise((resolve) => {
            console.log('🤖 Usando servidor simulado (modo desenvolvimento)');
            
            setTimeout(() => {
                this.isActive = true;
                const mockPlayer = {
                    id: 'mock-player-' + Date.now(),
                    nickname: playerData.nickname || 'MockPlayer',
                    x: 400,
                    y: 300,
                    direction: 'down',
                    isMoving: false,
                    color: this.generateRandomColor()
                };
                
                this.players.set('local', mockPlayer);
                
                if (this.callbacks.onPlayerJoined) {
                    this.callbacks.onPlayerJoined(mockPlayer);
                }
                
                if (this.callbacks.onConnected) {
                    this.callbacks.onConnected();
                }
                
                resolve(mockPlayer);
            }, 1000);
        });
    }

    // Gerar cor aleatória (mesmo sistema do servidor)
    generateRandomColor() {
        const colors = [
            '#FF6B6B', // Vermelho
            '#4ECDC4', // Turquesa
            '#45B7D1', // Azul
            '#96CEB4', // Verde
            '#FFEAA7', // Amarelo
            '#DDA0DD', // Lilás
            '#FFB347', // Laranja
            '#98D8C8', // Verde água
            '#F7DC6F', // Amarelo claro
            '#BB8FCE', // Roxo
            '#85C1E9', // Azul claro
            '#F8C471'  // Dourado
        ];
        
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Simular desconexão
    disconnect() {
        this.isActive = false;
        this.players.clear();
        
        if (this.callbacks.onDisconnected) {
            this.callbacks.onDisconnected('Mock server disconnected');
        }
    }

    // Configurar callbacks
    setCallback(eventName, callback) {
        this.callbacks[`on${eventName.charAt(0).toUpperCase() + eventName.slice(1)}`] = callback;
    }

    // Simular envio de posição
    sendPosition(x, y, direction, isMoving) {
        if (this.isActive) {
            console.log(`📍 Mock: Posição enviada - ${x}, ${y} | ${direction} | Moving: ${isMoving}`);
        }
    }

    // Simular envio de ataque
    sendAttack(direction, x, y) {
        if (this.isActive) {
            console.log(`⚔️ Mock: Ataque enviado - ${direction} em ${x}, ${y}`);
        }
    }

    // Getters simulados
    getLatency() {
        return Math.floor(Math.random() * 50) + 10; // 10-60ms simulado
    }

    getPlayerId() {
        const player = this.players.get('local');
        return player ? player.id : null;
    }

    isSocketConnected() {
        return this.isActive;
    }
}