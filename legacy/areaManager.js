// AreaManager - Gerencia diferentes áreas/zonas do jogo
class AreaManager {
    constructor(gameClient) {
        this.gameClient = gameClient;
        this.currentArea = 'down'; // Área inicial
        this.areas = {
            down: {
                name: 'down',
                background: 'backgrounds/imgdown.png',
                backgroundMusic: 'songs/backgroundsond.mp3', // Música de fundo para área down
                musicVolume: 0.3,
                transitions: {
                    up: { area: 'up', playerY: 'bottom' } // Ao encostar no topo, vai para 'up' e player aparece embaixo
                }
            },
            up: {
                name: 'up', 
                background: 'backgrounds/imgup.png',
                backgroundMusic: 'songs/backgroundsond.mp3', // Mesma música para continuidade
                musicVolume: 0.3,
                transitions: {
                    down: { area: 'down', playerY: 'top' } // Ao encostar embaixo, vai para 'down' e player aparece no topo
                }
            }
        };
        
        this.backgroundImages = new Map();
        this.transitionZone = 20; // Pixels da borda para ativar transição
        
        console.log('🗺️ AreaManager inicializado');
    }

    // Carregar todas as imagens de background
    async loadBackgrounds() {
        console.log('🖼️ Carregando backgrounds das áreas...');
        
        const loadPromises = Object.values(this.areas).map(area => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    this.backgroundImages.set(area.name, img);
                    console.log(`✅ Background carregado: ${area.name} (${area.background})`);
                    resolve();
                };
                img.onerror = () => {
                    console.error(`❌ Erro ao carregar background: ${area.background}`);
                    reject(new Error(`Falha ao carregar ${area.background}`));
                };
                img.src = area.background;
            });
        });

        try {
            await Promise.all(loadPromises);
            console.log('✅ Todos os backgrounds carregados');
            return true;
        } catch (error) {
            console.error('❌ Erro ao carregar backgrounds:', error);
            return false;
        }
    }

    // Verificar se player deve fazer transição
    checkTransitions(player) {
        const currentAreaData = this.areas[this.currentArea];
        if (!currentAreaData || !currentAreaData.transitions) return;

        const canvas = this.gameClient.canvas;
        const transitions = currentAreaData.transitions;

        // Verificar transição para cima
        if (transitions.up && player.y <= this.transitionZone) {
            this.transitionToArea(transitions.up.area, player, transitions.up.playerY);
        }
        
        // Verificar transição para baixo  
        if (transitions.down && player.y >= canvas.height - this.transitionZone - player.height) {
            this.transitionToArea(transitions.down.area, player, transitions.down.playerY);
        }
        
        // Verificar transição para esquerda
        if (transitions.left && player.x <= this.transitionZone) {
            this.transitionToArea(transitions.left.area, player, transitions.left.playerX);
        }
        
        // Verificar transição para direita
        if (transitions.right && player.x >= canvas.width - this.transitionZone - player.width) {
            this.transitionToArea(transitions.right.area, player, transitions.right.playerX);
        }
    }

    // Fazer transição para nova área
    transitionToArea(newArea, player, playerPosition) {
        if (newArea === this.currentArea) return;

        console.log(`🚪 Transição: ${this.currentArea} → ${newArea}`);
        
        const oldArea = this.currentArea;
        this.currentArea = newArea;
        
        // Gerenciar áudio da nova área
        this.handleAreaAudio(newArea, oldArea);
        
        // Reposicionar player baseado na transição
        this.repositionPlayer(player, playerPosition);
        
        // Efeito visual de transição (opcional)
        this.showTransitionEffect(oldArea, newArea);
        
        // Notificar outros sistemas sobre mudança de área
        if (this.gameClient.networkManager && this.gameClient.gameState.isConnected) {
            this.gameClient.networkManager.socket.emit('areaChanged', {
                playerId: this.gameClient.networkManager.playerId,
                newArea: newArea,
                position: { x: player.x, y: player.y }
            });
        }
    }

    // Gerenciar áudio ao mudar de área
    handleAreaAudio(newArea, oldArea) {
        const newAreaData = this.areas[newArea];
        const oldAreaData = this.areas[oldArea];
        
        if (!newAreaData || !window.audioManager) return;

        // Se a nova área tem música de fundo configurada
        if (newAreaData.backgroundMusic) {
            // Se for a mesma música da área anterior, manter tocando
            if (oldAreaData && oldAreaData.backgroundMusic === newAreaData.backgroundMusic) {
                console.log('🎵 Mantendo música de fundo contínua durante transição');
                // Não para a música - continua tocando
            } else {
                // Trocar para nova música
                console.log(`🎵 Mudando música: ${oldAreaData?.backgroundMusic || 'nenhuma'} → ${newAreaData.backgroundMusic}`);
                window.audioManager.startBackgroundMusic(
                    newAreaData.backgroundMusic, 
                    newAreaData.musicVolume || 0.3
                );
            }
        } else {
            // Nova área não tem música - parar música atual
            window.audioManager.stopBackgroundMusic();
        }
    }

    // Reposicionar player após transição
    repositionPlayer(player, position) {
        const canvas = this.gameClient.canvas;
        
        switch (position) {
            case 'top':
                player.y = this.transitionZone + 5;
                break;
            case 'bottom':
                player.y = canvas.height - this.transitionZone - player.height - 5;
                break;
            case 'left':
                player.x = this.transitionZone + 5;
                break;
            case 'right':
                player.x = canvas.width - this.transitionZone - player.width - 5;
                break;
        }
    }

    // Efeito visual de transição
    showTransitionEffect(fromArea, toArea) {
        // Criar overlay de transição
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFD700;
            font-family: 'Courier New', monospace;
            font-size: 24px;
            z-index: 1000;
            pointer-events: none;
        `;
        overlay.textContent = `🚪 Entrando em nova área...`;
        
        document.body.appendChild(overlay);
        
        // Remover overlay após animação
        setTimeout(() => {
            overlay.remove();
        }, 800);
    }

    // Renderizar background da área atual
    renderBackground(ctx) {
        const backgroundImg = this.backgroundImages.get(this.currentArea);
        if (backgroundImg && backgroundImg.complete && backgroundImg.naturalWidth > 0) {
            ctx.save();
            
            // Melhorar qualidade da renderização
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Forçar esticamento completo para cobrir todo o canvas
            // Usa drawImage com parâmetros completos para garantir cobertura total
            ctx.drawImage(
                backgroundImg,
                0, 0, backgroundImg.naturalWidth, backgroundImg.naturalHeight,  // área fonte (imagem completa)
                0, 0, ctx.canvas.width, ctx.canvas.height                       // área destino (canvas completo)
            );
            
            ctx.restore();
        } else {
            // Fallback: cor sólida
            ctx.fillStyle = this.currentArea === 'up' ? '#2C2C2C' : '#4A7C59';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            
            // Log para debug
            if (!backgroundImg) {
                console.warn(`🖼️ Background não encontrado para área: ${this.currentArea}`);
            } else {
                console.warn(`🖼️ Background ainda carregando para área: ${this.currentArea}`);
            }
        }
    }

    // Renderizar bordas de transição (debug)
    renderTransitionZones(ctx) {
        // Debug é controlado pelo gameClient que chama esta função
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        const currentAreaData = this.areas[this.currentArea];
        if (!currentAreaData || !currentAreaData.transitions) return;
        
        const transitions = currentAreaData.transitions;
        
        // Zona de transição superior
        if (transitions.up) {
            ctx.strokeRect(0, 0, ctx.canvas.width, this.transitionZone);
        }
        
        // Zona de transição inferior
        if (transitions.down) {
            ctx.strokeRect(0, ctx.canvas.height - this.transitionZone, ctx.canvas.width, this.transitionZone);
        }
        
        ctx.setLineDash([]);
    }

    // Verificar colisão com paredes da área atual
    checkWallCollision(player, newX, newY) {
        const canvas = this.gameClient.canvas;
        
        // Área "up" tem parede na parte superior (40% da altura)
        if (this.currentArea === 'up') {
            const wallHeight = canvas.height * 0.4; // 40% da altura é parede
            
            // Verificar se o player tentaria entrar na área da parede
            if (newY < wallHeight) {
                // Colidir com a parede - não permitir movimento para cima
                return {
                    x: newX, // Permitir movimento horizontal
                    y: Math.max(wallHeight, player.y) // Não deixar passar da parede
                };
            }
        }
        
        // Se não há colisão, retornar posição pretendida
        return { x: newX, y: newY };
    }

    // Renderizar áreas de colisão (debug)
    renderCollisionAreas(ctx) {
        // Debug é passado através do gameClient, não há necessidade de verificar
        ctx.save();
        
        // Área "up" - mostrar parede
        if (this.currentArea === 'up') {
            const wallHeight = ctx.canvas.height * 0.4;
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Vermelho translúcido
            ctx.fillRect(0, 0, ctx.canvas.width, wallHeight);
            
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, ctx.canvas.width, wallHeight);
            
            // Texto de debug
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.fillText('PAREDE (40%)', 10, 20);
        }
        
        ctx.restore();
    }

    // Inicializar música da área atual
    initializeAreaAudio() {
        const currentAreaData = this.areas[this.currentArea];
        if (currentAreaData && currentAreaData.backgroundMusic && window.audioManager) {
            console.log(`🎵 Inicializando música da área inicial: ${this.currentArea}`);
            window.audioManager.startBackgroundMusic(
                currentAreaData.backgroundMusic,
                currentAreaData.musicVolume || 0.3
            );
        }
    }

    // Getters
    getCurrentArea() {
        return this.currentArea;
    }
    
    getCurrentAreaData() {
        return this.areas[this.currentArea];
    }
}