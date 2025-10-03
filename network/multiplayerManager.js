// MultiplayerManager - Gerencia outros jogadores na tela
class MultiplayerManager {
    constructor(spriteManager) {
        this.spriteManager = spriteManager;
        this.otherPlayers = new Map();
        this.interpolationBuffer = new Map(); // Para suavização de movimento
    }

    // Adicionar outro jogador
    addPlayer(playerData) {
        const otherPlayer = {
            id: playerData.id,
            nickname: playerData.nickname || 'Player',
            x: playerData.x,
            y: playerData.y,
            targetX: playerData.x,
            targetY: playerData.y,
            direction: playerData.direction || 'down',
            isMoving: playerData.isMoving || false,
            isAttacking: playerData.isAttacking || false,
            health: playerData.health || 100,
            area: playerData.area || 'down', // Área do jogador
            color: playerData.color || '#4ECDC4', // Cor padrão se não fornecida
            lastUpdate: Date.now(),
            
            // Estado de animação
            animationState: {
                type: 'idle',
                frame: 0,
                lastFrameTime: Date.now(),
                duration: 200
            },
            
            // Interpolação
            interpolation: {
                startX: playerData.x,
                startY: playerData.y,
                startTime: Date.now()
            }
        };

        this.otherPlayers.set(playerData.id, otherPlayer);
        console.log(`🧑‍🤝‍🧑 Adicionado jogador: ${otherPlayer.nickname}`);
    }

    // Remover jogador
    removePlayer(playerId) {
        const player = this.otherPlayers.get(playerId);
        if (player) {
            console.log(`👋 Removido jogador: ${player.nickname}`);
            this.otherPlayers.delete(playerId);
        }
    }

    // Atualizar posição de outro jogador
    updatePlayerPosition(data) {
        const player = this.otherPlayers.get(data.playerId);
        if (player) {
            // Configurar interpolação suave
            player.interpolation.startX = player.x;
            player.interpolation.startY = player.y;
            player.interpolation.startTime = Date.now();
            
            // Definir destino
            player.targetX = data.x;
            player.targetY = data.y;
            player.direction = data.direction;
            player.isMoving = data.isMoving;
            player.lastUpdate = Date.now();

            // Atualizar animação
            if (data.isMoving) {
                this.updatePlayerAnimation(data.playerId, 'walk');
            } else {
                this.updatePlayerAnimation(data.playerId, 'idle');
            }
        }
    }

    // Atualizar ataque de outro jogador
    updatePlayerAttack(data) {
        const player = this.otherPlayers.get(data.playerId);
        if (player) {
            player.isAttacking = true;
            player.direction = data.direction;
            this.updatePlayerAnimation(data.playerId, 'attack');
            
            // Reset attack after duration
            setTimeout(() => {
                if (this.otherPlayers.has(data.playerId)) {
                    player.isAttacking = false;
                    this.updatePlayerAnimation(data.playerId, 'idle');
                }
            }, 800);
        }
    }

    // Atualizar animação do jogador
    updatePlayerAnimation(playerId, animationType) {
        const player = this.otherPlayers.get(playerId);
        if (player) {
            player.animationState.type = animationType;
            player.animationState.frame = 0;
            player.animationState.lastFrameTime = Date.now();
            
            // Reset sprite animation no spriteManager se necessário
            const spriteName = this.getSpriteName(player.direction, animationType);
            this.spriteManager.resetSpriteAnimation(spriteName);
        }
    }

    // Obter nome do sprite baseado na direção e tipo
    getSpriteName(direction, animationType) {
        // Mapear direções para os nomes corretos dos sprites
        // Servidor usa: 'up', 'down', 'left', 'right'
        // Sprites são: 'back', 'front', 'left'
        const directionMap = {
            'front': 'front',
            'down': 'front',
            'back': 'back', 
            'up': 'back',
            'left': 'left',
            'right': 'left' // será espelhado automaticamente
        };
        
        const typeMap = {
            'walk': 'walk',
            'idle': 'walk',
            'attack': 'attack'
        };
        
        const mappedDirection = directionMap[direction] || 'front';
        const mappedType = typeMap[animationType] || 'walk';
        
        return `link_${mappedType}_${mappedDirection}`;
    }

    // Atualizar interpolação de todos os jogadores
    update(deltaTime) {
        const now = Date.now();
        const interpolationDuration = 100; // 100ms para suavizar movimento

        this.otherPlayers.forEach((player) => {
            // Interpolação de posição
            const timeSinceUpdate = now - player.interpolation.startTime;
            const progress = Math.min(timeSinceUpdate / interpolationDuration, 1.0);
            
            if (progress < 1.0) {
                // Interpolação suave usando easing
                const easeProgress = this.easeOutQuad(progress);
                player.x = this.lerp(player.interpolation.startX, player.targetX, easeProgress);
                player.y = this.lerp(player.interpolation.startY, player.targetY, easeProgress);
            } else {
                player.x = player.targetX;
                player.y = player.targetY;
            }

            // Atualizar frame de animação
            this.updateAnimationFrame(player, deltaTime);
        });
    }

    // Atualizar frame de animação do jogador
    updateAnimationFrame(player, deltaTime) {
        const now = Date.now();
        const frameInterval = 200; // 200ms por frame
        
        if (now - player.animationState.lastFrameTime >= frameInterval) {
            const spriteName = this.getSpriteName(player.direction, player.animationState.type);
            
            // Avançar frame no sprite manager
            this.spriteManager.getSprite(spriteName); // Isso atualiza o frame automaticamente
            
            player.animationState.lastFrameTime = now;
        }
    }

    // Renderizar todos os outros jogadores
    render(ctx, camera = { x: 0, y: 0 }, currentArea = 'down') {
        this.otherPlayers.forEach((player) => {
            // Só renderizar players na mesma área
            if (player.area === currentArea) {
                this.renderPlayer(ctx, player, camera);
            }
        });
    }

    // Renderizar um jogador específico
    renderPlayer(ctx, player, camera) {
        const spriteName = this.getSpriteName(player.direction, 
            player.isAttacking ? 'attack' : (player.isMoving ? 'walk' : 'idle'));
        
        const sprite = this.spriteManager.getSprite(spriteName, Date.now(), player.color);
        
        if (sprite) {
            // Calcular posição na tela
            const screenX = player.x - camera.x;
            const screenY = player.y - camera.y;
            
            // Obter dimensões do sprite
            const dimensions = this.getSpriteRenderDimensions(spriteName);
            
            // Renderizar sprite
            ctx.drawImage(
                sprite,
                screenX - dimensions.width / 2,
                screenY - dimensions.height / 2,
                dimensions.width,
                dimensions.height
            );
            
            // Renderizar nickname
            this.renderPlayerNickname(ctx, player, screenX, screenY - dimensions.height / 2 - 10);
            
            // Renderizar barra de vida se não estiver cheia
            if (player.health < 100) {
                this.renderHealthBar(ctx, player, screenX, screenY - dimensions.height / 2 - 25);
            }
        }
    }

    // Renderizar nickname do jogador
    renderPlayerNickname(ctx, player, x, y) {
        ctx.save();
        
        // Usar a cor do jogador para o texto
        ctx.fillStyle = player.color || '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        
        const text = player.nickname;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        
        // Pequeno indicador de cor ao lado do nome
        const colorSize = 8;
        ctx.fillStyle = player.color || '#ffffff';
        ctx.fillRect(x + ctx.measureText(text).width / 2 + 5, y - colorSize, colorSize, colorSize);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + ctx.measureText(text).width / 2 + 5, y - colorSize, colorSize, colorSize);
        
        ctx.restore();
    }

    // Renderizar barra de vida
    renderHealthBar(ctx, player, x, y) {
        const barWidth = 40;
        const barHeight = 4;
        const healthPercent = player.health / 100;
        
        ctx.save();
        
        // Fundo da barra
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);
        
        // Vida atual
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x - barWidth / 2, y, barWidth * healthPercent, barHeight);
        
        // Borda
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - barWidth / 2, y, barWidth, barHeight);
        
        ctx.restore();
    }

    // Obter dimensões de renderização do sprite (igual ao FrameBasedPlayer)
    getSpriteRenderDimensions(spriteName) {
        const spriteInfo = this.spriteManager.getSpriteInfo(spriteName);
        
        if (!spriteInfo) {
            return { width: 64, height: 64 }; // baseWidth/baseHeight padrão
        }
        
        // Obtém dimensões originais do sprite
        const originalWidth = spriteInfo.width;
        const originalHeight = spriteInfo.height;
        
        let scale;
        
        if (spriteName.includes('attack')) {
            // Para sprites de ataque, força um tamanho mínimo para manter consistência
            const minAttackSize = 85; // Tamanho mínimo para sprites de ataque
            const maxAttackSize = 120; // Tamanho máximo
            
            // Calcula escala baseada na maior dimensão para garantir tamanho adequado
            const maxDimension = Math.max(originalWidth, originalHeight);
            scale = Math.max(minAttackSize / maxDimension, Math.min(maxAttackSize / maxDimension, 2.5));
            
        } else {
            // Para sprites de movimento, usa escala padrão
            const maxSize = 80;
            scale = Math.min(maxSize / originalWidth, maxSize / originalHeight, 3.0);
        }
        
        let width = Math.round(originalWidth * scale);
        let height = Math.round(originalHeight * scale);
        
        // Adiciona 6 pixels para cada lado nos sprites de ataque (total +6 pixels em cada dimensão)
        if (spriteName.includes('attack')) {
            width += 6;
            height += 6;
        }
        
        return {
            width: width,
            height: height
        };
    }

    // Funções de interpolação
    lerp(start, end, progress) {
        return start + (end - start) * progress;
    }

    easeOutQuad(t) {
        return t * (2 - t);
    }

    // Getters
    getPlayerCount() {
        return this.otherPlayers.size;
    }

    getPlayers() {
        return Array.from(this.otherPlayers.values());
    }

    getPlayer(playerId) {
        return this.otherPlayers.get(playerId);
    }

    // Limpar todos os jogadores
    clear() {
        this.otherPlayers.clear();
    }
}