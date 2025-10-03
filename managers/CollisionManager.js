// CollisionManager - Gerencia todas as colisões do jogo
class CollisionManager {
    constructor() {
        this.collisionAreas = new Map(); // Áreas de colisão por cena
        this.staticColliders = new Map(); // Colidores estáticos (paredes, obstáculos)
        this.dynamicColliders = new Map(); // Colidores dinâmicos (NPCs, objetos móveis)
        this.triggers = new Map(); // Áreas de trigger (não bloqueiam, mas ativam eventos)
        
        console.log('💥 CollisionManager inicializado');
        this.setupDefaultCollisions();
    }

    // Configurar colisões padrão
    setupDefaultCollisions() {
        // Cena "up" - parede superior (40% da altura)
        this.addStaticCollider('up', 'wall_top', {
            x: 0,
            y: 0,
            width: '100%', // Usar % para responsividade
            height: '40%',
            type: 'wall',
            solid: true,
            debug: true
        });

        // Futuro: adicionar mais colisões
        // this.addStaticCollider('down', 'tree_01', { x: 200, y: 150, width: 64, height: 64 });
        // this.addTrigger('up', 'portal_zone', { x: 300, y: 200, width: 100, height: 50 });
    }

    // Adicionar colisor estático
    addStaticCollider(sceneId, colliderId, collisionData) {
        if (!this.staticColliders.has(sceneId)) {
            this.staticColliders.set(sceneId, new Map());
        }

        const collider = {
            id: colliderId,
            sceneId: sceneId,
            ...collisionData,
            isStatic: true,
            isEnabled: true,
            lastCollision: null
        };

        this.staticColliders.get(sceneId).set(colliderId, collider);
        console.log(`🔲 Colisor estático adicionado: ${sceneId}/${colliderId}`);
        return collider;
    }

    // Adicionar colisor dinâmico
    addDynamicCollider(sceneId, colliderId, collisionData) {
        if (!this.dynamicColliders.has(sceneId)) {
            this.dynamicColliders.set(sceneId, new Map());
        }

        const collider = {
            id: colliderId,
            sceneId: sceneId,
            ...collisionData,
            isStatic: false,
            isEnabled: true,
            velocity: { x: 0, y: 0 },
            lastPosition: { x: collisionData.x, y: collisionData.y },
            lastCollision: null
        };

        this.dynamicColliders.get(sceneId).set(colliderId, collider);
        console.log(`🔄 Colisor dinâmico adicionado: ${sceneId}/${colliderId}`);
        return collider;
    }

    // Adicionar área de trigger
    addTrigger(sceneId, triggerId, triggerData) {
        if (!this.triggers.has(sceneId)) {
            this.triggers.set(sceneId, new Map());
        }

        const trigger = {
            id: triggerId,
            sceneId: sceneId,
            ...triggerData,
            isTrigger: true,
            isEnabled: true,
            isActive: false,
            lastTriggered: null,
            callbacks: {
                onEnter: null,
                onStay: null,
                onExit: null
            }
        };

        this.triggers.get(sceneId).set(triggerId, trigger);
        console.log(`⚡ Trigger adicionado: ${sceneId}/${triggerId}`);
        return trigger;
    }

    // Verificar colisão entre duas formas retangulares
    checkRectCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    // Resolver dimensões responsivas
    resolveDimensions(collision, canvasWidth, canvasHeight) {
        const resolved = { ...collision };

        // Resolver width
        if (typeof collision.width === 'string' && collision.width.includes('%')) {
            const percentage = parseFloat(collision.width) / 100;
            resolved.width = canvasWidth * percentage;
        }

        // Resolver height
        if (typeof collision.height === 'string' && collision.height.includes('%')) {
            const percentage = parseFloat(collision.height) / 100;
            resolved.height = canvasHeight * percentage;
        }

        // Resolver x e y se são percentuais
        if (typeof collision.x === 'string' && collision.x.includes('%')) {
            const percentage = parseFloat(collision.x) / 100;
            resolved.x = canvasWidth * percentage;
        }

        if (typeof collision.y === 'string' && collision.y.includes('%')) {
            const percentage = parseFloat(collision.y) / 100;
            resolved.y = canvasHeight * percentage;
        }

        return resolved;
    }

    // Verificar colisão de movimento do player
    checkPlayerMovement(player, newX, newY, currentScene, canvasWidth, canvasHeight) {
        const staticColliders = this.staticColliders.get(currentScene);
        if (!staticColliders) {
            return { x: newX, y: newY, collided: false, colliders: [] };
        }

        const playerRect = {
            x: newX,
            y: newY,
            width: player.width || player.baseWidth || 64,
            height: player.height || player.baseHeight || 64
        };

        const collidedWith = [];

        for (const [colliderId, collider] of staticColliders.entries()) {
            if (!collider.isEnabled || !collider.solid) continue;

            const resolvedCollider = this.resolveDimensions(collider, canvasWidth, canvasHeight);
            
            if (this.checkRectCollision(playerRect, resolvedCollider)) {
                collidedWith.push({
                    id: colliderId,
                    collider: resolvedCollider,
                    type: collider.type
                });

                // Se é sólido, bloquear movimento
                if (collider.solid) {
                    // Calcular posição corrigida baseada na direção do movimento
                    const correctedPosition = this.calculateCorrectedPosition(
                        player, newX, newY, resolvedCollider
                    );
                    
                    return {
                        x: correctedPosition.x,
                        y: correctedPosition.y,
                        collided: true,
                        colliders: collidedWith
                    };
                }
            }
        }

        return { x: newX, y: newY, collided: false, colliders: collidedWith };
    }

    // Calcular posição corrigida após colisão
    calculateCorrectedPosition(player, newX, newY, collider) {
        const currentX = player.x;
        const currentY = player.y;
        
        // Verificar de qual direção veio a colisão
        const fromLeft = currentX >= collider.x + collider.width;
        const fromRight = currentX + player.width <= collider.x;
        const fromTop = currentY >= collider.y + collider.height;
        const fromBottom = currentY + player.height <= collider.y;

        let correctedX = newX;
        let correctedY = newY;

        // Movimento horizontal
        if (newX !== currentX) {
            if (fromLeft && newX < collider.x + collider.width) {
                correctedX = collider.x + collider.width; // Parar na borda direita
            } else if (fromRight && newX + player.width > collider.x) {
                correctedX = collider.x - player.width; // Parar na borda esquerda
            }
        }

        // Movimento vertical
        if (newY !== currentY) {
            if (fromTop && newY < collider.y + collider.height) {
                correctedY = collider.y + collider.height; // Parar na borda inferior
            } else if (fromBottom && newY + player.height > collider.y) {
                correctedY = collider.y - player.height; // Parar na borda superior
            }
        }

        return { x: correctedX, y: correctedY };
    }

    // Verificar triggers
    checkTriggers(player, currentScene, canvasWidth, canvasHeight) {
        const sceneTriggers = this.triggers.get(currentScene);
        if (!sceneTriggers) return [];

        const playerRect = {
            x: player.x,
            y: player.y,
            width: player.width || player.baseWidth || 64,
            height: player.height || player.baseHeight || 64
        };

        const activatedTriggers = [];

        for (const [triggerId, trigger] of sceneTriggers.entries()) {
            if (!trigger.isEnabled) continue;

            const resolvedTrigger = this.resolveDimensions(trigger, canvasWidth, canvasHeight);
            const isColliding = this.checkRectCollision(playerRect, resolvedTrigger);
            const wasActive = trigger.isActive;

            if (isColliding && !wasActive) {
                // Entrou no trigger
                trigger.isActive = true;
                trigger.lastTriggered = Date.now();
                
                if (trigger.callbacks.onEnter) {
                    trigger.callbacks.onEnter(player, trigger);
                }
                
                activatedTriggers.push({
                    id: triggerId,
                    trigger: trigger,
                    event: 'enter'
                });
                
            } else if (isColliding && wasActive) {
                // Continua no trigger
                if (trigger.callbacks.onStay) {
                    trigger.callbacks.onStay(player, trigger);
                }
                
            } else if (!isColliding && wasActive) {
                // Saiu do trigger
                trigger.isActive = false;
                
                if (trigger.callbacks.onExit) {
                    trigger.callbacks.onExit(player, trigger);
                }
                
                activatedTriggers.push({
                    id: triggerId,
                    trigger: trigger,
                    event: 'exit'
                });
            }
        }

        return activatedTriggers;
    }

    // Renderizar áreas de colisão (debug)
    renderCollisionAreas(ctx, currentScene) {
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;

        ctx.save();

        // Renderizar colisores estáticos
        const staticColliders = this.staticColliders.get(currentScene);
        if (staticColliders) {
            for (const [colliderId, collider] of staticColliders.entries()) {
                if (!collider.debug) continue;

                const resolved = this.resolveDimensions(collider, canvasWidth, canvasHeight);
                
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'; // Vermelho para colisões
                ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
                ctx.lineWidth = 2;
                
                ctx.fillRect(resolved.x, resolved.y, resolved.width, resolved.height);
                ctx.strokeRect(resolved.x, resolved.y, resolved.width, resolved.height);
                
                // Label
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.fillText(`${collider.type}`, resolved.x + 5, resolved.y + 15);
            }
        }

        // Renderizar triggers
        const sceneTriggers = this.triggers.get(currentScene);
        if (sceneTriggers) {
            for (const [triggerId, trigger] of sceneTriggers.entries()) {
                const resolved = this.resolveDimensions(trigger, canvasWidth, canvasHeight);
                
                ctx.strokeStyle = trigger.isActive ? 
                    'rgba(0, 255, 0, 0.8)' : 'rgba(255, 165, 0, 0.8)'; // Verde se ativo, laranja se não
                ctx.fillStyle = trigger.isActive ? 
                    'rgba(0, 255, 0, 0.1)' : 'rgba(255, 165, 0, 0.1)';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                
                ctx.fillRect(resolved.x, resolved.y, resolved.width, resolved.height);
                ctx.strokeRect(resolved.x, resolved.y, resolved.width, resolved.height);
                
                // Label
                ctx.fillStyle = 'white';
                ctx.font = '10px Arial';
                ctx.fillText(`T:${triggerId}`, resolved.x + 2, resolved.y + 12);
            }
        }

        ctx.restore();
    }

    // Remover colisor
    removeCollider(sceneId, colliderId, type = 'static') {
        const colliders = type === 'static' ? this.staticColliders : this.dynamicColliders;
        const sceneColliders = colliders.get(sceneId);
        
        if (sceneColliders && sceneColliders.has(colliderId)) {
            sceneColliders.delete(colliderId);
            console.log(`🗑️ Colisor removido: ${sceneId}/${colliderId}`);
            return true;
        }
        
        return false;
    }

    // Limpar colisões de uma cena
    clearSceneCollisions(sceneId) {
        this.staticColliders.delete(sceneId);
        this.dynamicColliders.delete(sceneId);
        this.triggers.delete(sceneId);
        console.log(`🧹 Colisões da cena ${sceneId} removidas`);
    }

    // Obter informações de colisão
    getCollisionInfo(sceneId) {
        return {
            static: this.staticColliders.get(sceneId)?.size || 0,
            dynamic: this.dynamicColliders.get(sceneId)?.size || 0,
            triggers: this.triggers.get(sceneId)?.size || 0
        };
    }
}

// Singleton pattern
window.CollisionManager = CollisionManager;