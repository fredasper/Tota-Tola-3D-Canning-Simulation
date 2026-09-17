/**
 * Main Application Entry Point
 * Orchestrates Factory, Graphics, and UI modules
 */

import Factory from './core/Factory.js';
import GraphicsEngine from './graphics/GraphicsEngine.js';
import UIManager from './ui/UIManager.js';

class PopaColaApp {
    constructor() {
        this.factory = null;
        this.graphics = null;
        this.uiManager = null;
        this.lastFrameTime = null;

        this.init();
    }

    /**
     * Initialize application
     */
    init() {
        console.log('Initializing Popa Cola Factory Simulator...');

        // Initialize factory simulation engine
        this.factory = new Factory();

        // Initialize graphics engine
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) {
            this.graphics = new GraphicsEngine(canvasContainer);
        } else {
            console.error('Canvas container not found');
            return;
        }

        // Initialize UI manager
        this.uiManager = new UIManager(this.factory);
        this.uiManager.startUpdateLoop();

        // Start main application loop
        this.startMainLoop();

        console.log('Popa Cola Factory Simulator initialized successfully');
    }

    /**
     * Main application loop
     */
    startMainLoop() {
        const animate = () => {
            requestAnimationFrame(animate);

            const now = Date.now();
            const deltaTime = (now - (this.lastFrameTime || now)) / 1000;
            this.lastFrameTime = now;

            // Update simulation
            this.factory.update(deltaTime);

            // Update graphics
            if (this.graphics) {
                this.graphics.updateCamera(deltaTime);
                const metrics = this.factory.getMetrics();
                this.graphics.updateVisualization(metrics);
                this.graphics.render();
            }

            // UI is updated via UIManager's interval timer
        };

        animate();
    }

    /**
     * Cleanup on window close
     */
    dispose() {
        if (this.uiManager) {
            this.uiManager.dispose();
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new PopaColaApp();
    });
} else {
    window.app = new PopaColaApp();
}
