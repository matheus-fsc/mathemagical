// InputManager.js - Classe responsável por gerenciar entrada do usuário
class InputManager {
    constructor() {
        this.keys = {};
        this.keyHandlers = {}; // Para handlers específicos de teclas
        this.keyMappings = {
            // Movimento
            'a': 'left',
            'arrowleft': 'left',
            'd': 'right',
            'arrowright': 'right',
            'w': 'up',
            'arrowup': 'up',
            's': 'down',
            'arrowdown': 'down',
            
            // Pulo
            ' ': 'jump', // espaço
            
            // Ações
            'x': 'attack',
            'z': 'attack',
            'enter': 'attack'
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            // Não interferir se o usuário está digitando em um input, textarea ou elemento editável
            if (e.target.tagName === 'INPUT' || 
                e.target.tagName === 'TEXTAREA' || 
                e.target.contentEditable === 'true') {
                return;
            }
            
            const key = e.key.toLowerCase();
            
            // Executar handlers específicos se existirem
            if (this.keyHandlers[key]) {
                this.keyHandlers[key](e);
                e.preventDefault();
                return;
            }
            
            // Tratamento normal das teclas
            if (this.keyMappings[key]) {
                e.preventDefault();
                this.keys[key] = true;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            // Não interferir se o usuário está digitando em um input, textarea ou elemento editável
            if (e.target.tagName === 'INPUT' || 
                e.target.tagName === 'TEXTAREA' || 
                e.target.contentEditable === 'true') {
                return;
            }
            
            const key = e.key.toLowerCase();
            if (this.keyMappings[key]) {
                e.preventDefault();
                this.keys[key] = false;
            }
        });
        
        // Prevenir perda de foco
        window.addEventListener('blur', () => {
            this.keys = {};
        });
    }
    
    isPressed(action) {
        // Verificar se alguma tecla mapeada para essa ação está pressionada
        for (let key in this.keyMappings) {
            if (this.keyMappings[key] === action && this.keys[key]) {
                return true;
            }
        }
        return false;
    }
    
    isKeyPressed(key) {
        return !!this.keys[key.toLowerCase()];
    }
    
    // Método para adicionar novos mapeamentos de teclas
    addKeyMapping(key, action) {
        this.keyMappings[key.toLowerCase()] = action;
    }
    
    // Método para remover mapeamentos
    removeKeyMapping(key) {
        delete this.keyMappings[key.toLowerCase()];
    }
    
    // Obter todas as teclas atualmente pressionadas
    getPressedKeys() {
        return Object.keys(this.keys).filter(key => this.keys[key]);
    }
    
    // Obter todas as ações ativas
    getActiveActions() {
        const actions = new Set();
        for (let key in this.keyMappings) {
            if (this.keys[key]) {
                actions.add(this.keyMappings[key]);
            }
        }
        return Array.from(actions);
    }
    
    // Limpar todas as teclas (útil para pause/reset)
    clearAll() {
        this.keys = {};
    }
    
    // Adicionar handler para tecla específica
    addKeyHandler(key, handler) {
        this.keyHandlers[key.toLowerCase()] = handler;
    }
    
    // Remover handler de tecla específica
    removeKeyHandler(key) {
        delete this.keyHandlers[key.toLowerCase()];
    }
}