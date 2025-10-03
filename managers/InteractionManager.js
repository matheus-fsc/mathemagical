// InteractionManager - Gerencia todas as interações do jogo
class InteractionManager {
    constructor() {
        this.interactions = new Map(); // Interações por cena
        this.activeInteractions = new Set(); // Interações ativas no momento
        this.interactionHistory = []; // Histórico de interações
        this.globalInteractions = new Map(); // Interações que funcionam em qualquer cena
        
        console.log('🎯 InteractionManager inicializado');
    }

    // Adicionar interação a uma cena específica
    addInteraction(sceneId, interactionId, interactionData) {
        if (!this.interactions.has(sceneId)) {
            this.interactions.set(sceneId, new Map());
        }

        const interaction = {
            id: interactionId,
            sceneId: sceneId,
            type: interactionData.type || 'click', // click, proximity, trigger
            x: interactionData.x,
            y: interactionData.y,
            width: interactionData.width || 50,
            height: interactionData.height || 50,
            
            // Propriedades de interação
            isEnabled: true,
            isActive: false,
            isVisible: interactionData.isVisible !== false, // Visível por padrão
            requiresProximity: interactionData.requiresProximity || false,
            proximityDistance: interactionData.proximityDistance || 80,
            cooldownTime: interactionData.cooldownTime || 500, // ms
            lastInteraction: 0,
            
            // Callbacks
            onInteract: interactionData.onInteract || null,
            onHover: interactionData.onHover || null,
            onProximityEnter: interactionData.onProximityEnter || null,
            onProximityExit: interactionData.onProximityExit || null,
            
            // Dados visuais
            icon: interactionData.icon || '💫',
            description: interactionData.description || 'Interact',
            hoverText: interactionData.hoverText || 'Click to interact',
            
            // Estados
            isHovered: false,
            isInProximity: false,
            interactionCount: 0,
            
            // Condições (futuro)
            requirements: interactionData.requirements || null, // itens, level, etc.
            
            // Configurações visuais
            visual: {
                showIcon: interactionData.showIcon !== false,
                showBorder: interactionData.showBorder !== false,
                pulseEffect: interactionData.pulseEffect !== false,
                glowEffect: interactionData.glowEffect !== false,
                color: interactionData.color || '#FFD700',
                hoverColor: interactionData.hoverColor || '#FFA500'
            }
        };

        this.interactions.get(sceneId).set(interactionId, interaction);
        console.log(`🎯 Interação adicionada: ${sceneId}/${interactionId} (${interaction.type})`);
        return interaction;
    }

    // Adicionar interação global (funciona em qualquer cena)
    addGlobalInteraction(interactionId, interactionData) {
        const interaction = this.addInteraction('_global', interactionId, interactionData);
        this.globalInteractions.set(interactionId, interaction);
        console.log(`🌍 Interação global adicionada: ${interactionId}`);
        return interaction;
    }

    // Verificar interações de clique
    checkClickInteractions(mousePos, currentScene) {
        const results = [];
        
        // Verificar interações da cena atual
        const sceneInteractions = this.interactions.get(currentScene);
        if (sceneInteractions) {
            results.push(...this.checkInteractionsInMap(sceneInteractions, mousePos, 'click'));
        }
        
        // Verificar interações globais
        results.push(...this.checkInteractionsInMap(this.globalInteractions, mousePos, 'click'));
        
        return results;
    }

    // Verificar interações de proximidade
    checkProximityInteractions(player, currentScene) {
        const results = [];
        
        // Verificar interações da cena atual
        const sceneInteractions = this.interactions.get(currentScene);
        if (sceneInteractions) {
            results.push(...this.checkProximityInMap(sceneInteractions, player));
        }
        
        // Verificar interações globais
        results.push(...this.checkProximityInMap(this.globalInteractions, player));
        
        return results;
    }

    // Helper para verificar interações em um Map
    checkInteractionsInMap(interactionMap, mousePos, type) {
        const results = [];
        
        for (const [interactionId, interaction] of interactionMap.entries()) {
            if (!interaction.isEnabled || interaction.type !== type) continue;
            if (this.isInCooldown(interaction)) continue;
            
            if (this.isPointInside(mousePos, interaction)) {
                const result = this.executeInteraction(interaction, { mousePos, type: 'click' });
                if (result) results.push(result);
            }
        }
        
        return results;
    }

    // Helper para verificar proximidade em um Map
    checkProximityInMap(interactionMap, player) {
        const results = [];
        
        for (const [interactionId, interaction] of interactionMap.entries()) {
            if (!interaction.isEnabled) continue;
            
            const distance = this.calculateDistance(player, interaction);
            const wasInProximity = interaction.isInProximity;
            const isInProximity = distance <= interaction.proximityDistance;
            
            interaction.isInProximity = isInProximity;
            
            // Entrou na proximidade
            if (isInProximity && !wasInProximity) {
                if (interaction.onProximityEnter) {
                    interaction.onProximityEnter(player, interaction, distance);
                }
                results.push({
                    id: interactionId,
                    interaction: interaction,
                    event: 'proximityEnter',
                    distance: distance
                });
            }
            
            // Saiu da proximidade
            if (!isInProximity && wasInProximity) {
                if (interaction.onProximityExit) {
                    interaction.onProximityExit(player, interaction, distance);
                }
                results.push({
                    id: interactionId,
                    interaction: interaction,
                    event: 'proximityExit',
                    distance: distance
                });
            }
            
            // Interação por proximidade
            if (isInProximity && interaction.type === 'proximity' && !this.isInCooldown(interaction)) {
                const result = this.executeInteraction(interaction, { player, type: 'proximity', distance });
                if (result) results.push(result);
            }
        }
        
        return results;
    }

    // Executar interação
    executeInteraction(interaction, context) {
        const now = Date.now();
        
        // Verificar cooldown
        if (this.isInCooldown(interaction)) {
            console.log(`⏰ Interação ${interaction.id} em cooldown`);
            return null;
        }
        
        // Atualizar estatísticas
        interaction.lastInteraction = now;
        interaction.interactionCount++;
        
        // Adicionar ao histórico
        this.interactionHistory.push({
            id: interaction.id,
            sceneId: interaction.sceneId,
            timestamp: now,
            context: context
        });
        
        // Executar callback
        let result = null;
        if (interaction.onInteract) {
            try {
                result = interaction.onInteract(context, interaction);
                console.log(`✨ Interação executada: ${interaction.id}`);
            } catch (error) {
                console.error(`❌ Erro na interação ${interaction.id}:`, error);
            }
        }
        
        return {
            id: interaction.id,
            interaction: interaction,
            event: 'interact',
            result: result,
            context: context
        };
    }

    // Verificar se ponto está dentro da área
    isPointInside(point, interaction) {
        return point.x >= interaction.x && 
               point.x <= interaction.x + interaction.width &&
               point.y >= interaction.y && 
               point.y <= interaction.y + interaction.height;
    }

    // Calcular distância entre player e interação
    calculateDistance(player, interaction) {
        const playerCenterX = player.x + (player.width || player.baseWidth || 64) / 2;
        const playerCenterY = player.y + (player.height || player.baseHeight || 64) / 2;
        const interactionCenterX = interaction.x + interaction.width / 2;
        const interactionCenterY = interaction.y + interaction.height / 2;
        
        return Math.sqrt(
            Math.pow(playerCenterX - interactionCenterX, 2) + 
            Math.pow(playerCenterY - interactionCenterY, 2)
        );
    }

    // Verificar se está em cooldown
    isInCooldown(interaction) {
        return Date.now() - interaction.lastInteraction < interaction.cooldownTime;
    }

    // Renderizar interações (debug e visual)
    renderInteractions(ctx, currentScene, showDebug = false) {
        // Renderizar interações da cena atual
        const sceneInteractions = this.interactions.get(currentScene);
        if (sceneInteractions) {
            this.renderInteractionMap(ctx, sceneInteractions, showDebug);
        }
        
        // Renderizar interações globais
        this.renderInteractionMap(ctx, this.globalInteractions, showDebug);
    }

    // Helper para renderizar um Map de interações
    renderInteractionMap(ctx, interactionMap, showDebug) {
        ctx.save();
        
        for (const [interactionId, interaction] of interactionMap.entries()) {
            if (!interaction.isEnabled || !interaction.isVisible) continue;
            
            this.renderSingleInteraction(ctx, interaction, showDebug);
        }
        
        ctx.restore();
    }

    // Renderizar uma interação específica
    renderSingleInteraction(ctx, interaction, showDebug) {
        const { visual } = interaction;
        const time = Date.now();
        const isInCooldown = this.isInCooldown(interaction);
        
        // Efeito de pulso
        let scale = 1;
        if (visual.pulseEffect && !isInCooldown) {
            scale = 1 + Math.sin(time * 0.005) * 0.1;
        }
        
        // Cores baseadas no estado
        let currentColor = visual.color;
        if (isInCooldown) {
            currentColor = '#666666';
        } else if (interaction.isHovered) {
            currentColor = visual.hoverColor;
        } else if (interaction.isInProximity) {
            currentColor = '#00FF00';
        }
        
        // Renderizar borda
        if (visual.showBorder || showDebug) {
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = 2;
            if (visual.glowEffect && !isInCooldown) {
                ctx.shadowColor = currentColor;
                ctx.shadowBlur = 10;
            }
            
            const x = interaction.x - (interaction.width * (scale - 1)) / 2;
            const y = interaction.y - (interaction.height * (scale - 1)) / 2;
            const width = interaction.width * scale;
            const height = interaction.height * scale;
            
            ctx.strokeRect(x, y, width, height);
            
            // Reset shadow
            ctx.shadowBlur = 0;
        }
        
        // Renderizar ícone
        if (visual.showIcon) {
            ctx.fillStyle = currentColor;
            ctx.font = `${20 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const iconX = interaction.x + interaction.width / 2;
            const iconY = interaction.y + interaction.height / 2;
            
            ctx.fillText(interaction.icon, iconX, iconY);
        }
        
        // Debug info
        if (showDebug) {
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            const debugText = [
                `ID: ${interaction.id}`,
                `Type: ${interaction.type}`,
                `Count: ${interaction.interactionCount}`,
                isInCooldown ? 'COOLDOWN' : 'READY'
            ];
            
            debugText.forEach((text, index) => {
                ctx.fillText(text, interaction.x, interaction.y - 40 + (index * 12));
            });
        }
    }

    // Criar interação predefinida
    createQuickInteraction(sceneId, x, y, callback, options = {}) {
        const interactionId = options.id || `quick_${Date.now()}`;
        
        return this.addInteraction(sceneId, interactionId, {
            x: x,
            y: y,
            width: options.width || 50,
            height: options.height || 50,
            type: options.type || 'click',
            onInteract: callback,
            icon: options.icon || '⭐',
            description: options.description || 'Quick Interaction',
            ...options
        });
    }

    // Remover interação
    removeInteraction(sceneId, interactionId) {
        const sceneInteractions = this.interactions.get(sceneId);
        if (sceneInteractions && sceneInteractions.has(interactionId)) {
            sceneInteractions.delete(interactionId);
            console.log(`🗑️ Interação removida: ${sceneId}/${interactionId}`);
            return true;
        }
        
        // Verificar se é global
        if (this.globalInteractions.has(interactionId)) {
            this.globalInteractions.delete(interactionId);
            const globalSceneInteractions = this.interactions.get('_global');
            if (globalSceneInteractions) {
                globalSceneInteractions.delete(interactionId);
            }
            console.log(`🗑️ Interação global removida: ${interactionId}`);
            return true;
        }
        
        return false;
    }

    // Limpar interações de uma cena
    clearSceneInteractions(sceneId) {
        this.interactions.delete(sceneId);
        console.log(`🧹 Interações da cena ${sceneId} removidas`);
    }

    // Obter estatísticas
    getStats() {
        let totalInteractions = 0;
        let enabledInteractions = 0;
        
        for (const [sceneId, sceneInteractions] of this.interactions.entries()) {
            totalInteractions += sceneInteractions.size;
            for (const interaction of sceneInteractions.values()) {
                if (interaction.isEnabled) enabledInteractions++;
            }
        }
        
        return {
            totalInteractions,
            enabledInteractions,
            globalInteractions: this.globalInteractions.size,
            historyCount: this.interactionHistory.length,
            activeInteractions: this.activeInteractions.size
        };
    }
}

// Singleton pattern
window.InteractionManager = InteractionManager;