/**
 * Camera Manager
 * Handles camera setup, positioning, and controls
 */

import CONFIG from '../config/settings.js';

// Dynamically load THREE from global scope (loaded separately in HTML or via CDN)
const THREE = window.THREE;

export class CameraManager {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.camera = null;
        this.defaultPosition = CONFIG.graphics.camera.defaultPosition;
        this.lookAtPosition = CONFIG.graphics.camera.lookAtPosition;
        this.orbitRadius = 20;
        this.orbitTime = 0;
        this.isOrbiting = true;

        this.init();
    }

    /**
     * Initialize camera
     */
    init() {
        const config = CONFIG.graphics.camera;
        this.camera = new THREE.PerspectiveCamera(
            config.fov,
            this.width / this.height,
            config.near,
            config.far
        );

        this.resetPosition();
    }

    /**
     * Reset camera to default position
     */
    resetPosition() {
        const pos = this.defaultPosition;
        this.camera.position.set(pos.x, pos.y, pos.z);
        const look = this.lookAtPosition;
        this.camera.lookAt(look.x, look.y, look.z);
        this.orbitTime = 0;
    }

    /**
     * Update camera (for orbiting animation)
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        if (this.isOrbiting) {
            this.orbitTime += deltaTime * 0.1;
            const x = Math.cos(this.orbitTime) * this.orbitRadius;
            const z = Math.sin(this.orbitTime) * this.orbitRadius;
            this.camera.position.set(x, 10, z);
            const look = this.lookAtPosition;
            this.camera.lookAt(look.x, look.y, look.z);
        }
    }

    /**
     * Handle window resize
     * @param {number} width - New width
     * @param {number} height - New height
     */
    onWindowResize(width, height) {
        this.width = width;
        this.height = height;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    /**
     * Toggle orbiting animation
     * @param {boolean} enable - Enable orbiting
     */
    setOrbiting(enable) {
        this.isOrbiting = enable;
        if (!enable) {
            this.resetPosition();
        }
    }

    /**
     * Get camera instance
     * @returns {THREE.PerspectiveCamera} Camera
     */
    getCamera() {
        return this.camera;
    }
}

export default CameraManager;
