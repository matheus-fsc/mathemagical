// Configuração de servidor para frontend
var ServerConfig = {
    // URLs de servidor baseadas no ambiente
    development: 'http://localhost:3000',
    production: 'https://link-websocket-game.onrender.com', // ✅ URL do Render (SEM porta!)
    
    // Forçar modo produção (útil para testes locais)
    forceProduction: true, // ⚠️ Mude para false se quiser usar servidor local
    
    // Detectar ambiente automaticamente
    getCurrentServerUrl() {
        // Se forceProduction estiver ativo, sempre usar produção
        if (this.forceProduction) {
            console.log('🌐 Modo produção forçado - usando Render');
            return this.production;
        }
        
        // Se estiver rodando em localhost, usar desenvolvimento
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('🏠 Detectado localhost - usando desenvolvimento');
            return this.development;
        }
        
        // Se há uma variável global definida, usar ela
        if (window.GAME_SERVER_URL) {
            console.log('🔧 Usando variável global GAME_SERVER_URL');
            return window.GAME_SERVER_URL;
        }
        
        // Caso contrário, usar produção
        console.log('🌐 Usando produção por padrão');
        return this.production;
    },
    
    // URLs alternativas para teste
    getAlternativeUrls() {
        return [
            this.development,
            this.production,
            'https://link-websocket-game.onrender.com', // URL principal do Render
        ];
    },
    
    // Testar se o servidor está disponível
    async testConnection(url = null) {
        const testUrl = url || this.getCurrentServerUrl();
        try {
            const response = await fetch(`${testUrl}/health`);
            return response.ok;
        } catch (error) {
            console.warn(`Servidor ${testUrl} não disponível:`, error.message);
            return false;
        }
    }
};

// Função para detectar servidor automaticamente
async function detectServer() {
    const serverInput = document.getElementById('serverInput');
    const detectBtn = document.getElementById('detectServerBtn');
    
    if (detectBtn) {
        detectBtn.disabled = true;
        detectBtn.textContent = 'Detectando...';
    }
    
    try {
        const serverUrl = await SERVER_CONFIG.autoDetect();
        if (serverInput) {
            serverInput.value = serverUrl;
        }
        
        // Verificar status
        const status = await SERVER_CONFIG.checkServerStatus(serverUrl);
        if (status.online) {
            updateServerStatus(status);
        }
        
    } catch (error) {
        console.error('Erro ao detectar servidor:', error);
    } finally {
        if (detectBtn) {
            detectBtn.disabled = false;
            detectBtn.textContent = '🔍 Detectar';
        }
    }
}

// Atualizar status do servidor na UI
function updateServerStatus(status) {
    const statusEl = document.getElementById('serverStatus');
    if (statusEl) {
        if (status.online) {
            statusEl.innerHTML = `
                <span style="color: #4CAF50;">🟢 Online</span> | 
                Jogadores: ${status.players}/${status.maxPlayers}
            `;
        } else {
            statusEl.innerHTML = `<span style="color: #ff4444;">🔴 Offline</span>`;
        }
    }
}