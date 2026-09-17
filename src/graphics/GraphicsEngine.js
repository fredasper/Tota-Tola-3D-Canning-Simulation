/**
 * Graphics Engine
 * Main Three.js rendering engine
 */

import CONFIG from '../config/settings.js';
import CameraManager from './Camera.js';
import StationModels from './StationModels.js';

const THREE = window.THREE;

export class GraphicsEngine {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cameraManager = null;
        this.factoryModels = {};
        this.animationId = null;
        this.isRunning = false;

        this.init();
    }

    /**
     * Initialize Three.js scene
     */
    init() {
        // Scene setup
        const sceneConfig = CONFIG.graphics.scene;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(sceneConfig.backgroundColor);
        this.scene.fog = new THREE.Fog(
            sceneConfig.fogColor,
            sceneConfig.fogNear,
            sceneConfig.fogFar
        );

        // Camera setup
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.cameraManager = new CameraManager(width, height);
        this.camera = this.cameraManager.getCamera();

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Setup lighting
        this.setupLighting();

        // Setup ground
        this.setupGround();

        // Create factory
        this.createFactory();

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    /**
     * Setup lighting
     */
    setupLighting() {
        const ambientConfig = CONFIG.graphics.lighting.ambient;
        const ambientLight = new THREE.AmbientLight(ambientConfig.color, ambientConfig.intensity);
        this.scene.add(ambientLight);

        const dirConfig = CONFIG.graphics.lighting.directional;
        const directionalLight = new THREE.DirectionalLight(dirConfig.color, dirConfig.intensity);
        directionalLight.position.set(
            dirConfig.position.x,
            dirConfig.position.y,
            dirConfig.position.z
        );
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = dirConfig.shadowMapSize;
        directionalLight.shadow.mapSize.height = dirConfig.shadowMapSize;
        this.scene.add(directionalLight);
    }

    /**
     * Setup ground plane
     */
    setupGround() {
        const factoryConfig = CONFIG.graphics.factory;
        const groundGeometry = new THREE.PlaneGeometry(factoryConfig.groundSize, factoryConfig.groundSize);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a2235,
            roughness: 0.7
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    /**
     * Create all factory stations
     */
    createFactory() {
        const positions = {
            mixing: { x: -16, y: 0, z: 0 },
            carbonation: { x: -8, y: 0, z: 0 },
            filling: { x: 0, y: 0, z: 0 },
            capping: { x: 8, y: 0, z: 0 },
            packing: { x: 16, y: 0, z: 0 }
        };

        // Create each station
        const stationOrder = ['mixing', 'carbonation', 'filling', 'capping', 'packing'];
        stationOrder.forEach(stationKey => {
            const pos = positions[stationKey];
            const stationGroup = new THREE.Group();
            stationGroup.position.set(pos.x, pos.y, pos.z);

            // Add base
            const base = StationModels.createStationBase();
            stationGroup.add(base);

            // Add station model
            let model;
            switch (stationKey) {
                case 'mixing':
                    model = StationModels.createMixingStation();
                    break;
                case 'carbonation':
                    model = StationModels.createCarbonationStation();
                    break;
                case 'filling':
                    model = StationModels.createFillingStation();
                    break;
                case 'capping':
                    model = StationModels.createCappingStation();
                    break;
                case 'packing':
                    model = StationModels.createPackingStation();
                    break;
            }

            if (model) {
                model.position.y = 1;
                stationGroup.add(model);
            }

            // Add label
            const label = StationModels.createStationLabel(CONFIG.stations[stationKey].name);
            stationGroup.add(label);

            this.scene.add(stationGroup);
            this.factoryModels[stationKey] = stationGroup;
        });

        // Create conveyor belts
        this.createConveyorBelts(positions);
    }

    /**
     * Create conveyor belts between stations
     */
    createConveyorBelts(positions) {
        const stationKeys = ['mixing', 'carbonation', 'filling', 'capping', 'packing'];

        for (let i = 0; i < stationKeys.length - 1; i++) {
            const currentKey = stationKeys[i];
            const nextKey = stationKeys[i + 1];
            const currentPos = positions[currentKey];
            const nextPos = positions[nextKey];

            const distance = Math.sqrt(
                Math.pow(nextPos.x - currentPos.x, 2) + Math.pow(nextPos.z - currentPos.z, 2)
            );

            const beltGeometry = new THREE.BoxGeometry(distance - 1, 0.2, 0.8);
            const beltMaterial = new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 0.8
            });
            const belt = new THREE.Mesh(beltGeometry, beltMaterial);

            belt.position.x = (currentPos.x + nextPos.x) / 2;
            belt.position.y = 0.5;
            belt.position.z = (currentPos.z + nextPos.z) / 2;
            belt.receiveShadow = true;

            this.scene.add(belt);
        }
    }

    /**
     * Update 3D visualization based on factory metrics
     * @param {object} metrics - Factory metrics
     */
    updateVisualization(metrics) {
        const stationStates = metrics.stationStates;
        const stationKeys = ['mixing', 'carbonation', 'filling', 'capping', 'packing'];

        stationKeys.forEach(stationKey => {
            const stationGroup = this.factoryModels[stationKey];
            const state = stationStates[stationKey];

            if (stationGroup && state) {
                // Update color based on efficiency
                const efficiency = state.efficiencyPercent;
                let color = this.getStatusColor(efficiency);

                // Update materials
                stationGroup.traverse(child => {
                    if (child.material && child.material.color) {
                        const currentColor = child.material.color?.getHex?.();
                        if (
                            currentColor === 0xff6b35 ||
                            currentColor === 0xff8555 ||
                            (child.material.emissive && child.material.emissive.getHex?.())
                        ) {
                            child.material.color.setHex(color);
                            if (child.material.emissive) {
                                child.material.emissive.setHex(color);
                                child.material.emissiveIntensity = 0.3;
                            }
                        }
                    }
                });
            }
        });
    }

    /**
     * Get color based on efficiency
     * @param {number} efficiency - Efficiency percentage 0-100
     * @returns {number} Hex color
     */
    getStatusColor(efficiency) {
        if (efficiency >= CONFIG.efficiency.optimal.min) {
            return CONFIG.efficiency.optimal.color;
        } else if (efficiency >= CONFIG.efficiency.caution.min) {
            return CONFIG.efficiency.caution.color;
        } else if (efficiency >= CONFIG.efficiency.warning.min) {
            return CONFIG.efficiency.warning.color;
        }
        return CONFIG.efficiency.critical.color;
    }

    /**
     * Render scene
     */
    render() {
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Update camera
     * @param {number} deltaTime - Delta time
     */
    updateCamera(deltaTime) {
        this.cameraManager.update(deltaTime);
    }

    /**
     * Start animation loop
     * @param {Function} onFrame - Frame callback
     */
    startAnimationLoop(onFrame) {
        this.isRunning = true;
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            
            const now = Date.now();
            const deltaTime = (now - (this.lastFrameTime || now)) / 1000;
            this.lastFrameTime = now;

            this.updateCamera(deltaTime);
            onFrame(deltaTime);
            this.render();
        };
        animate();
    }

    /**
     * Stop animation loop
     */
    stopAnimationLoop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.cameraManager.onWindowResize(width, height);
        this.renderer.setSize(width, height);
    }

    /**
     * Reset camera
     */
    resetCamera() {
        this.cameraManager.resetPosition();
    }

    /**
     * Get renderer
     * @returns {THREE.WebGLRenderer} Renderer
     */
    getRenderer() {
        return this.renderer;
    }

    /**
     * Get scene
     * @returns {THREE.Scene} Scene
     */
    getScene() {
        return this.scene;
    }

    /**
     * Get camera
     * @returns {THREE.PerspectiveCamera} Camera
     */
    getCamera() {
        return this.camera;
    }
}

export default GraphicsEngine;
