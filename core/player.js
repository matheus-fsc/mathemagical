// Classe do jogador Link
class Player {
    constructor(x, y, spriteManager) {
        this.x = x;
        this.y = y;
        this.baseWidth = 64;  // tamanho base para colisão e posicionamento
        this.baseHeight = 64;
        this.spriteManager = spriteManager;
        
        // Propriedades de movimento
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 150; // pixels por segundo
        this.facing = 'front'; // direção que o Link está olhando
        
        // Estados de animação
        this.isMoving = false;
        this.lastDirection = 'front';
        
        // Sistema de ataque
        this.isAttacking = false;
        this.attackDuration = 500; // duração do ataque em ms
        this.attackTimer = 0;
        this.canAttack = true;
        this.attackCooldown = 200; // cooldown entre ataques em ms
        this.attackCooldownTimer = 0;
    }

    // Método para obter dimensões de renderização baseadas no sprite
    getRenderDimensions(spriteName) {
        const sprite = this.spriteManager.getSprite(spriteName);
        const spriteInfo = this.spriteManager.getSpriteInfo(spriteName);
        
        if (!sprite || !spriteInfo) {
            return { width: this.baseWidth, height: this.baseHeight };
        }
        
        // Usa as dimensões do sprite
        const maxSize = 80; // tamanho máximo permitido
        const naturalWidth = spriteInfo.width;
        const naturalHeight = spriteInfo.height;
        
        // Calcula escala para manter proporção
        const scale = Math.min(maxSize / naturalWidth, maxSize / naturalHeight);
        
        return {
            width: Math.round(naturalWidth * scale),
            height: Math.round(naturalHeight * scale)
        };
    }

    // Propriedades para compatibilidade
    get width() { return this.baseWidth; }
    get height() { return this.baseHeight; }

    update(deltaTime, inputManager) {
        // Converte deltaTime de milissegundos para segundos
        const dt = deltaTime / 1000;
        
        // Atualiza timers de ataque
        if (this.isAttacking) {
            this.attackTimer += deltaTime;
            if (this.attackTimer >= this.attackDuration) {
                this.isAttacking = false;
                this.attackTimer = 0;
                this.attackCooldownTimer = this.attackCooldown;
            }
        }
        
        // Atualiza cooldown de ataque
        if (this.attackCooldownTimer > 0) {
            this.attackCooldownTimer -= deltaTime;
            if (this.attackCooldownTimer <= 0) {
                this.canAttack = true;
            }
        }
        
        // Verifica input de ataque (prioridade sobre movimento)
        if (inputManager.isPressed('attack') && this.canAttack && !this.isAttacking) {
            this.startAttack();
        }
        
        // Se estiver atacando, não pode se mover
        if (this.isAttacking) {
            this.velocityX = 0;
            this.velocityY = 0;
            this.isMoving = false;
            return;
        }
        
        // Reset da velocidade horizontal
        this.velocityX = 0;
        this.velocityY = 0;
        this.isMoving = false;

        // Verifica input de movimento
        if (inputManager.isPressed('left')) {
            this.velocityX = -this.speed;
            this.facing = 'left';
            this.lastDirection = 'left';
            this.isMoving = true;
        }
        
        if (inputManager.isPressed('right')) {
            this.velocityX = this.speed;
            this.facing = 'right';
            this.lastDirection = 'right';
            this.isMoving = true;
        }
        
        if (inputManager.isPressed('up')) {
            this.velocityY = -this.speed;
            this.facing = 'back';
            this.lastDirection = 'back';
            this.isMoving = true;
        }
        
        if (inputManager.isPressed('down')) {
            this.velocityY = this.speed;
            this.facing = 'front';
            this.lastDirection = 'front';
            this.isMoving = true;
        }

        // Aplica movimento com verificação de colisão
        const newX = this.x + this.velocityX * dt;
        const newY = this.y + this.velocityY * dt;
        
        // Verificar colisão com paredes (se areaManager está disponível)
        let finalPosition = { x: newX, y: newY };
        if (this.areaManager && this.areaManager.checkWallCollision) {
            finalPosition = this.areaManager.checkWallCollision(this, newX, newY);
        }
        
        this.x = finalPosition.x;
        this.y = finalPosition.y;

        // Mantém o jogador dentro da tela
        this.x = Math.max(0, Math.min(this.x, 800 - this.width));
        this.y = Math.max(0, Math.min(this.y, 600 - this.height));
    }

    startAttack() {
        this.isAttacking = true;
        this.attackTimer = 0;
        this.canAttack = false;
        
        // Debug: verifica se o sprite de ataque existe
        const attackSpriteName = this.getAttackSpriteName();
        const attackSprite = this.spriteManager.getSprite(attackSpriteName);
        
        if (attackSprite) {
            const spriteInfo = this.spriteManager.getSpriteInfo(attackSpriteName);
            console.log(`✅ Link atacando para ${this.facing} com sprite: ${attackSpriteName} (${spriteInfo.type})`);
        } else {
            console.error(`❌ ERRO: Sprite de ataque não encontrado: ${attackSpriteName}`);
        }
    }

    // Método auxiliar para obter o nome do sprite de ataque
    getAttackSpriteName() {
        switch (this.facing) {
            case 'left': return 'linkAttackLeft';
            case 'right': return 'linkAttackLeft';
            case 'back': return 'linkAttackBack';
            case 'front': return 'linkAttackFront';
            default: return 'linkAttackFront';
        }
    }

    render(ctx) {
        // Determina qual sprite usar
        let spriteName = 'linkWalkFront'; // padrão
        
        if (this.isAttacking) {
            // Sprites de ataque
            switch (this.facing) {
                case 'left':
                    spriteName = 'linkAttackLeft';
                    break;
                case 'right':
                    spriteName = 'linkAttackLeft';
                    break;
                case 'back':
                    spriteName = 'linkAttackBack';
                    break;
                case 'front':
                    spriteName = 'linkAttackFront';
                    break;
            }
        } else if (this.isMoving) {
            // Sprites de caminhada
            switch (this.facing) {
                case 'left':
                    spriteName = 'linkWalkLeft';
                    break;
                case 'right':
                    spriteName = 'linkWalkLeft';
                    break;
                case 'back':
                    spriteName = 'linkWalkBack';
                    break;
                case 'front':
                    spriteName = 'linkWalkFront';
                    break;
            }
        } else {
            // Sprites parados (usa caminhada como base)
            switch (this.lastDirection) {
                case 'left':
                    spriteName = 'linkWalkLeft';
                    break;
                case 'right':
                    spriteName = 'linkWalkLeft';
                    break;
                case 'back':
                    spriteName = 'linkWalkBack';
                    break;
                case 'front':
                    spriteName = 'linkWalkFront';
                    break;
            }
        }

        // Renderiza o sprite
        const sprite = this.spriteManager.getSprite(spriteName);
        if (sprite) {
            const renderDim = this.getRenderDimensions(spriteName);
            
            // Debug específico para ataques
            if (this.isAttacking && Math.random() < 0.1) { // Log apenas 10% das vezes para não fazer spam
                console.log(`🗡️ Renderizando ataque: ${spriteName}`);
            }
            
            // Centraliza o sprite na posição do jogador
            const offsetX = (this.baseWidth - renderDim.width) / 2;
            const offsetY = (this.baseHeight - renderDim.height) / 2;
            
            ctx.save();
            
            // Se estiver olhando para a direita, espelha o sprite
            if (this.facing === 'right' || (this.lastDirection === 'right' && !this.isMoving && !this.isAttacking)) {
                ctx.scale(-1, 1);
                ctx.drawImage(
                    sprite, 
                    -(this.x + offsetX + renderDim.width), 
                    this.y + offsetY, 
                    renderDim.width, 
                    renderDim.height
                );
            } else {
                ctx.drawImage(
                    sprite, 
                    this.x + offsetX, 
                    this.y + offsetY, 
                    renderDim.width, 
                    renderDim.height
                );
            }
            
            ctx.restore();
        } else {
            // Fallback: desenha um retângulo se o sprite não carregou
            console.error(`SPRITE NÃO ENCONTRADO: ${spriteName}`);
            
            if (this.isAttacking) {
                ctx.fillStyle = '#ff0000'; // Vermelho para sprites de ataque não encontrados
                console.error(`SPRITE DE ATAQUE FALTANDO: ${spriteName}`);
            } else {
                ctx.fillStyle = '#00ff00'; // Verde para sprites de movimento não encontrados
            }
            
            ctx.fillRect(this.x, this.y, this.baseWidth, this.baseHeight);
            
            // Mostra qual sprite deveria estar carregado
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(spriteName, this.x + this.baseWidth/2, this.y + this.baseHeight/2 - 5);
            ctx.fillText('MISSING', this.x + this.baseWidth/2, this.y + this.baseHeight/2 + 5);
        }
    }

    // Método para debug
    renderDebug(ctx) {
        // Desenha hitbox (área de colisão)
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.baseWidth, this.baseHeight);
        
        // Desenha área de renderização do sprite atual
        const currentSpriteName = this.getCurrentSpriteName();
        const renderDim = this.getRenderDimensions(currentSpriteName);
        const offsetX = (this.baseWidth - renderDim.width) / 2;
        const offsetY = (this.baseHeight - renderDim.height) / 2;
        
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x + offsetX, this.y + offsetY, renderDim.width, renderDim.height);
        
        // Se estiver atacando, desenha área de ataque
        if (this.isAttacking) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            let attackX = this.x;
            let attackY = this.y;
            let attackWidth = this.baseWidth;
            let attackHeight = this.baseHeight;
            
            // Estende a área de ataque na direção que está olhando
            switch (this.facing) {
                case 'left':
                    attackX -= this.baseWidth * 0.5;
                    attackWidth *= 1.5;
                    break;
                case 'right':
                    attackWidth *= 1.5;
                    break;
                case 'back':
                    attackY -= this.baseHeight * 0.5;
                    attackHeight *= 1.5;
                    break;
                case 'front':
                    attackHeight *= 1.5;
                    break;
            }
            
            ctx.strokeRect(attackX, attackY, attackWidth, attackHeight);
        }
        
        // Mostra informações de debug
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Pos: (${Math.round(this.x)}, ${Math.round(this.y)})`, this.x, this.y - 50);
        ctx.fillText(`Sprite: ${currentSpriteName}`, this.x, this.y - 38);
        ctx.fillText(`Render: ${renderDim.width}x${renderDim.height}`, this.x, this.y - 26);
        ctx.fillText(`Facing: ${this.facing}`, this.x, this.y - 14);
        ctx.fillText(`Attacking: ${this.isAttacking}`, this.x, this.y - 2);
        
        if (this.isAttacking) {
            const attackProgress = Math.round((this.attackTimer / this.attackDuration) * 100);
            ctx.fillText(`Attack: ${attackProgress}%`, this.x, this.y + 10);
        }
        
        if (!this.canAttack) {
            const cooldownProgress = Math.round(((this.attackCooldown - this.attackCooldownTimer) / this.attackCooldown) * 100);
            ctx.fillText(`Cooldown: ${cooldownProgress}%`, this.x, this.y + 22);
        }
    }

    // Método auxiliar para obter o nome do sprite atual
    getCurrentSpriteName() {
        if (this.isAttacking) {
            switch (this.facing) {
                case 'left': return 'linkAttackLeft';
                case 'right': return 'linkAttackLeft';
                case 'back': return 'linkAttackBack';
                case 'front': return 'linkAttackFront';
            }
        } else if (this.isMoving) {
            switch (this.facing) {
                case 'left': return 'linkWalkLeft';
                case 'right': return 'linkWalkLeft';
                case 'back': return 'linkWalkBack';
                case 'front': return 'linkWalkFront';
            }
        } else {
            switch (this.lastDirection) {
                case 'left': return 'linkWalkLeft';
                case 'right': return 'linkWalkLeft';
                case 'back': return 'linkWalkBack';
                case 'front': return 'linkWalkFront';
            }
        }
        return 'linkWalkFront';
    }
}