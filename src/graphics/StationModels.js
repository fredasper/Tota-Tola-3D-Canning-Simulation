/**
 * Station 3D Models
 * Factory methods for creating 3D station models
 */

import CONFIG from '../config/settings.js';
import { createTextCanvas } from '../utils/helpers.js';

const THREE = window.THREE;

export class StationModels {
    /**
     * Create mixing station model
     * @returns {THREE.Group} Station group
     */
    static createMixingStation() {
        const group = new THREE.Group();

        // Tank
        const tankGeometry = new THREE.CylinderGeometry(1, 1, 2, 32);
        const tankMaterial = new THREE.MeshStandardMaterial({
            color: 0xff6b35,
            metalness: 0.6,
            roughness: 0.4
        });
        const tank = new THREE.Mesh(tankGeometry, tankMaterial);
        tank.castShadow = true;
        group.add(tank);

        // Mixer arm
        const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 16);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
        const arm = new THREE.Mesh(armGeometry, armMaterial);
        arm.castShadow = true;
        group.add(arm);

        return group;
    }

    /**
     * Create carbonation station model
     * @returns {THREE.Group} Station group
     */
    static createCarbonationStation() {
        const group = new THREE.Group();

        // Pressure vessel
        const vesselGeometry = new THREE.CylinderGeometry(0.8, 0.8, 2, 32);
        const vesselMaterial = new THREE.MeshStandardMaterial({
            color: 0xff8555,
            metalness: 0.7,
            roughness: 0.3
        });
        const vessel = new THREE.Mesh(vesselGeometry, vesselMaterial);
        vessel.castShadow = true;
        group.add(vessel);

        // Pressure gauge
        const gaugeGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const gaugeMaterial = new THREE.MeshStandardMaterial({
            color: 0xff6b35,
            emissive: 0xff6b35,
            emissiveIntensity: 0.3
        });
        const gauge = new THREE.Mesh(gaugeGeometry, gaugeMaterial);
        gauge.position.set(1.2, 0.5, 0);
        gauge.castShadow = true;
        group.add(gauge);

        return group;
    }

    /**
     * Create filling station model
     * @returns {THREE.Group} Station group
     */
    static createFillingStation() {
        const group = new THREE.Group();

        // Filling nozzles
        for (let i = 0; i < 4; i++) {
            const nozzleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.5, 16);
            const nozzleMaterial = new THREE.MeshStandardMaterial({
                color: 0xff6b35,
                metalness: 0.8
            });
            const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
            nozzle.position.x = -0.8 + i * 0.5;
            nozzle.position.y = 0.25;
            nozzle.castShadow = true;
            group.add(nozzle);
        }

        // Platform
        const platformGeometry = new THREE.BoxGeometry(2, 0.3, 1.5);
        const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.y = -0.25;
        platform.castShadow = true;
        group.add(platform);

        return group;
    }

    /**
     * Create capping station model
     * @returns {THREE.Group} Station group
     */
    static createCappingStation() {
        const group = new THREE.Group();

        // Robotic arm base
        const baseGeometry = new THREE.BoxGeometry(0.5, 1.5, 0.5);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
        const armBase = new THREE.Mesh(baseGeometry, baseMaterial);
        armBase.castShadow = true;
        group.add(armBase);

        // Arm segment 1
        const segment1Geometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 16);
        const segment1 = new THREE.Mesh(segment1Geometry, baseMaterial);
        segment1.position.y = 1.25;
        segment1.rotation.z = Math.PI / 6;
        segment1.castShadow = true;
        group.add(segment1);

        // Gripper
        const gripperGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.3);
        const gripperMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b35 });
        const gripper = new THREE.Mesh(gripperGeometry, gripperMaterial);
        gripper.position.set(0.5, 1.8, 0);
        gripper.castShadow = true;
        group.add(gripper);

        return group;
    }

    /**
     * Create packing station model
     * @returns {THREE.Group} Station group
     */
    static createPackingStation() {
        const group = new THREE.Group();

        // Conveyor belt section
        const beltGeometry = new THREE.BoxGeometry(3, 0.3, 1);
        const beltMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const belt = new THREE.Mesh(beltGeometry, beltMaterial);
        belt.position.y = 0;
        belt.castShadow = true;
        group.add(belt);

        // Box stacking
        const boxGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const boxMaterial = new THREE.MeshStandardMaterial({
            color: 0xff6b35,
            metalness: 0.3
        });

        for (let i = 0; i < 3; i++) {
            const box = new THREE.Mesh(boxGeometry, boxMaterial);
            box.position.y = 0.75 + i * 1.5;
            box.castShadow = true;
            group.add(box);
        }

        return group;
    }

    /**
     * Create station base/platform
     * @returns {THREE.Mesh} Base mesh
     */
    static createStationBase() {
        const geometry = new THREE.BoxGeometry(3, 1, 4);
        const material = new THREE.MeshStandardMaterial({ color: 0x2a3a52 });
        const base = new THREE.Mesh(geometry, material);
        base.position.y = 0.5;
        base.castShadow = true;
        base.receiveShadow = true;
        return base;
    }

    /**
     * Create station label
     * @param {string} text - Label text
     * @returns {THREE.Mesh} Label mesh
     */
    static createStationLabel(text) {
        const canvas = createTextCanvas(text);
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const geometry = new THREE.PlaneGeometry(3, 0.5);
        const label = new THREE.Mesh(geometry, material);
        label.position.y = 3;
        label.position.z = 2.2;
        return label;
    }
}

export default StationModels;
