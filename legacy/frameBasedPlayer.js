// Player atualizado para trabalhar com sprites baseados em frames
class FrameBasedPlayer {
    constructor(x, y, spriteManager, inputManager, color = null) {
        this.x = x;
        this.y = y;
        this.baseWidth = 64;
        this.baseHeight = 64;
        this.spriteManager = spriteManager;
        this.inputManager = inputManager;
        this.color = color; // Cor do jogador
        
        // Propriedades de movimento
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 150;
        this.facing = 'front';
        
        // Estados de animação
        this.isMoving = false;
        this.lastDirection = 'front';
        
        // Sistema de ataque
        this.isAttacking = false;
        this.attackDuration = 600; // 300ms + 50ms + 250ms = 600ms total para 3 frames
        this.attackTimer = 0;
        this.canAttack = true;
        this.attackCooldown = 300; // Cooldown um pouco maior
        this.attackCooldownTimer = 0;
    }

    // Método para obter dimensões de renderização baseadas no sprite
    getRenderDimensions(spriteName) {
        const spriteInfo = this.spriteManager.getSpriteInfo(spriteName);
        
        if (!spriteInfo) {
            return { width: this.baseWidth, height: this.baseHeight };
        }
        
        // Obtém dimensões originais do sprite
        const originalWidth = spriteInfo.width;
        const originalHeight = spriteInfo.height;
        
        let targetSize;
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
        
        // Adiciona 1 pixel para cada lado nos sprites de ataque (total +2 pixels em cada dimensão)
        if (spriteName.includes('attack')) {
            width += 6;
            height += 6;
        }
        
        return {
            width: width,
            height: height
        };
    }

    get width() { return this.baseWidth; }
    get height() { return this.baseHeight; }

    update(deltaTime, inputManager = null, joystickData = null) {
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
        
        if (this.attackCooldownTimer > 0) {
            this.attackCooldownTimer -= deltaTime;
            if (this.attackCooldownTimer <= 0) {
                this.canAttack = true;
            }
        }
        
        // Verifica input de ataque
        if (this.inputManager && this.inputManager.isPressed('attack') && this.canAttack && !this.isAttacking) {
            this.startAttack();
        }
        
        // Se estiver atacando, não pode se mover
        if (this.isAttacking) {
            this.velocityX = 0;
            this.velocityY = 0;
            this.isMoving = false;
            return;
        }
        
        // Reset da velocidade
        this.velocityX = 0;
        this.velocityY = 0;
        this.isMoving = false;

        // === JOYSTICK VIRTUAL (PRIORIDADE) ===
        if (joystickData && joystickData.magnitude > 0.1) { // Dead zone de 10%
            const normalizedSpeed = this.speed * joystickData.magnitude;
            this.velocityX = joystickData.direction.x * normalizedSpeed;
            this.velocityY = joystickData.direction.y * normalizedSpeed;
            
            // Determinar direção do sprite baseada no movimento dominante
            if (Math.abs(joystickData.direction.x) > Math.abs(joystickData.direction.y)) {
                this.facing = joystickData.direction.x > 0 ? 'right' : 'left';
                this.lastDirection = this.facing;
            } else {
                this.facing = joystickData.direction.y > 0 ? 'front' : 'back';
                this.lastDirection = this.facing;
            }
            
            this.isMoving = true;
        }
        // === TECLADO (FALLBACK SE NÃO HOUVER JOYSTICK ATIVO) ===
        else if (!joystickData || joystickData.magnitude <= 0.1) {
            // Verifica input de movimento do teclado
        if (this.inputManager && this.inputManager.isPressed('left')) {
            this.velocityX = -this.speed;
            this.facing = 'left';
            this.lastDirection = 'left';
            this.isMoving = true;
        }
        
        if (this.inputManager && this.inputManager.isPressed('right')) {
            this.velocityX = this.speed;
            this.facing = 'right';
            this.lastDirection = 'right';
            this.isMoving = true;
        }
        
        if (this.inputManager && this.inputManager.isPressed('up')) {
            this.velocityY = -this.speed;
            this.facing = 'back';
            this.lastDirection = 'back';
            this.isMoving = true;
        }
        
        if (this.inputManager && this.inputManager.isPressed('down')) {
            this.velocityY = this.speed;
            this.facing = 'front';
            this.lastDirection = 'front';
            this.isMoving = true;
        }
        } // Fechamento do bloco else if do teclado

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

        // Mantém o jogador dentro dos limites apropriados
        if (this.gameClient && this.gameClient.camera.enabled) {
            // Se câmera estiver ativa, limitar jogador aos limites do mundo
            const worldWidth = this.gameClient.camera.worldWidth;
            const worldHeight = this.gameClient.camera.worldHeight;
            
            // Primeiro limitar aos limites do mundo
            this.x = Math.max(0, Math.min(this.x, worldWidth - this.baseWidth));
            this.y = Math.max(0, Math.min(this.y, worldHeight - this.baseHeight));
            
            // Depois verificar se está dentro da visualização da câmera
            const canvas = this.canvas || this.gameClient.canvas;
            const canvasWidth = canvas ? canvas.width : 800;
            const canvasHeight = canvas ? canvas.height : 600;
            
            const cameraLeft = this.gameClient.camera.x;
            const cameraTop = this.gameClient.camera.y;
            const cameraRight = cameraLeft + canvasWidth;
            const cameraBottom = cameraTop + canvasHeight;
            
            // Se o jogador está fora da visualização da câmera, limitá-lo
            this.x = Math.max(cameraLeft, Math.min(this.x, cameraRight - this.baseWidth));
            this.y = Math.max(cameraTop, Math.min(this.y, cameraBottom - this.baseHeight));
        } else if (this.canvas) {
            // Usar limites do canvas para telas grandes
            this.x = Math.max(0, Math.min(this.x, this.canvas.width - this.baseWidth));
            this.y = Math.max(0, Math.min(this.y, this.canvas.height - this.baseHeight));
        } else {
            // Fallback para dimensões padrão
            this.x = Math.max(0, Math.min(this.x, 800 - this.baseWidth));
            this.y = Math.max(0, Math.min(this.y, 600 - this.baseHeight));
        }
    }

    startAttack() {
        this.isAttacking = true;
        this.attackTimer = 0;
        this.canAttack = false;
        
        // Reinicia a animação de ataque do frame 0
        const attackSpriteName = this.getAttackSpriteName();
        this.spriteManager.resetSpriteAnimation(attackSpriteName);
        
        console.log(`⚔️ Link atacando para ${this.facing} com sprite: ${attackSpriteName} (duração: ${this.attackDuration}ms)`);
        
        // Debug: mostra informações da animação
        const spriteInfo = this.spriteManager.getSpriteInfo(attackSpriteName);
        if (spriteInfo) {
            const totalDuration = spriteInfo.frameCount * spriteInfo.frameDuration;
            console.log(`   Frames: ${spriteInfo.frameCount}, Duração total esperada: ${totalDuration}ms`);
        }
    }

    getAttackSpriteName() {
        switch (this.facing) {
            case 'left': return 'link_attack_left';
            case 'right': return 'link_attack_left'; // Será espelhado
            case 'back': return 'link_attack_back';
            case 'front': return 'link_attack_front';
            default: return 'link_attack_front';
        }
    }

    render(ctx) {
        const currentTime = Date.now();
        let spriteName = 'link_walk_front'; // padrão
        
        if (this.isAttacking) {
            // Sprites de ataque
            switch (this.facing) {
                case 'left':
                    spriteName = 'link_attack_left';
                    break;
                case 'right':
                    spriteName = 'link_attack_left';
                    break;
                case 'back':
                    spriteName = 'link_attack_back';
                    break;
                case 'front':
                    spriteName = 'link_attack_front';
                    break;
            }
        } else if (this.isMoving) {
            // Sprites de caminhada
            switch (this.facing) {
                case 'left':
                    spriteName = 'link_walk_left';
                    break;
                case 'right':
                    spriteName = 'link_walk_left';
                    break;
                case 'back':
                    spriteName = 'link_walk_back';
                    break;
                case 'front':
                    spriteName = 'link_walk_front';
                    break;
            }
        } else {
            // Sprites parados
            switch (this.lastDirection) {
                case 'left':
                    spriteName = 'link_walk_left';
                    break;
                case 'right':
                    spriteName = 'link_walk_left';
                    break;
                case 'back':
                    spriteName = 'link_walk_back';
                    break;
                case 'front':
                    spriteName = 'link_walk_front';
                    break;
            }
        }

        // Renderiza o sprite com animação baseada em frames
        const sprite = this.spriteManager.getSprite(spriteName, currentTime, this.color);
        if (sprite) {
            const renderDim = this.getRenderDimensions(spriteName);
            
            const offsetX = (this.baseWidth - renderDim.width) / 2;
            const offsetY = (this.baseHeight - renderDim.height) / 2;
            
            ctx.save();
            
            // Espelhamento para direita
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
            // Fallback
            ctx.fillStyle = this.isAttacking ? '#ff0000' : '#00ff00';
            ctx.fillRect(this.x, this.y, this.baseWidth, this.baseHeight);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(spriteName, this.x + this.baseWidth/2, this.y + this.baseHeight/2 - 5);
            ctx.fillText('MISSING', this.x + this.baseWidth/2, this.y + this.baseHeight/2 + 5);
        }
    }

    renderDebug(ctx) {
        // Desenha hitbox
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.baseWidth, this.baseHeight);
        
        // Área de renderização do sprite
        const currentSpriteName = this.getCurrentSpriteName();
        const renderDim = this.getRenderDimensions(currentSpriteName);
        const offsetX = (this.baseWidth - renderDim.width) / 2;
        const offsetY = (this.baseHeight - renderDim.height) / 2;
        
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x + offsetX, this.y + offsetY, renderDim.width, renderDim.height);
        
        // Área de ataque
        if (this.isAttacking) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            let attackX = this.x;
            let attackY = this.y;
            let attackWidth = this.baseWidth;
            let attackHeight = this.baseHeight;
            
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
        
        // Informações de debug
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Pos: (${Math.round(this.x)}, ${Math.round(this.y)})`, this.x, this.y - 50);
        ctx.fillText(`Sprite: ${currentSpriteName}`, this.x, this.y - 38);
        
        // Mostra dimensões originais vs renderização
        const debugSpriteInfo = this.spriteManager.getSpriteInfo(currentSpriteName);
        const debugRenderDim = this.getRenderDimensions(currentSpriteName);
        if (debugSpriteInfo) {
            ctx.fillText(`Original: ${debugSpriteInfo.width}x${debugSpriteInfo.height}`, this.x, this.y - 26);
            ctx.fillText(`Render: ${debugRenderDim.width}x${debugRenderDim.height}`, this.x, this.y - 14);
        }
        
        ctx.fillText(`Facing: ${this.facing}`, this.x, this.y - 2);
        ctx.fillText(`Attacking: ${this.isAttacking}`, this.x, this.y - 2);
        
        // Info de frames
        const spriteInfo = this.spriteManager.getSpriteInfo(currentSpriteName);
        if (spriteInfo) {
            ctx.fillText(`Frame: ${spriteInfo.currentFrame}/${spriteInfo.frameCount}`, this.x, this.y + 10);
            
            // Mostra tempo de ataque se estiver atacando
            if (this.isAttacking) {
                const attackProgress = Math.round((this.attackTimer / this.attackDuration) * 100);
                ctx.fillText(`Attack: ${attackProgress}% (${Math.round(this.attackTimer)}ms)`, this.x, this.y + 22);
            }
        }
    }

    getCurrentSpriteName() {
        if (this.isAttacking) {
            switch (this.facing) {
                case 'left': return 'link_attack_left';
                case 'right': return 'link_attack_left';
                case 'back': return 'link_attack_back';
                case 'front': return 'link_attack_front';
            }
        } else if (this.isMoving) {
            switch (this.facing) {
                case 'left': return 'link_walk_left';
                case 'right': return 'link_walk_left';
                case 'back': return 'link_walk_back';
                case 'front': return 'link_walk_front';
            }
        } else {
            switch (this.lastDirection) {
                case 'left': return 'link_walk_left';
                case 'right': return 'link_walk_left';
                case 'back': return 'link_walk_back';
                case 'front': return 'link_walk_front';
            }
        }
        return 'link_walk_front';
    }
}