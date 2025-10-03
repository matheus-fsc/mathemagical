// Configuração específica para Neocities
var ServerConfig = {
    // URL do backend no Render.com
    production: 'https://link-websocket-game.onrender.com',
    
    // Sempre usar produção no Neocities
    forceProduction: true,
    
    // URL atual do servidor
    getCurrentServerUrl() {
        console.log('🌐 Neocities conectando ao Render:', this.production);
        return this.production;
    },
    
    // Configurações específicas para Neocities
    neocities: {
        siteName: 'link-adventure', // Substitua pelo seu site no Neocities
        enableMultiplayer: true,
        enableDebug: false // Desabilitar debug em produção
    },
    
    // Verificar conectividade com backend
    async testConnection() {
        try {
            // Usar fetch com modo no-cors para contornar CSP
            const response = await fetch(this.production + '/health', {
                mode: 'no-cors',
                method: 'GET'
            });
            
            // Para no-cors, sempre retorna opaque response
            console.log('✅ Backend acessível (no-cors mode)');
            return true;
        } catch (error) {
            console.warn('⚠️ Backend offline:', error.message);
            
            // Tentar ping alternativo via imagem
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    console.log('✅ Backend pingável via imagem');
                    resolve(true);
                };
                img.onerror = () => {
                    console.warn('❌ Backend não acessível');
                    resolve(false);
                };
                img.src = this.production + '/favicon.ico?' + Date.now();
            });
        }
    }
};

// Auto-teste de conexão quando carregar
document.addEventListener('DOMContentLoaded', () => {
    if (ServerConfig.neocities.enableMultiplayer) {
        ServerConfig.testConnection();
    }
});