/**
 * Popa Cola Factory 3D Simulator
 * Main application script with Three.js visualization
 */

// Global variables
let factory;
let scene, camera, renderer;
let factoryModels = {};
let animationId;
let lastUpdateTime = Date.now();

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initializeFactory();
    initializeThreeJS();
    initializeUI();
    initializeEventListeners();
    startAnimationLoop();
});

/**
 * Initialize factory simulation engine
 */
function initializeFactory() {
    factory = new PopaColaFactory();
}

/**
 * Initialize Three.js scene, camera, and renderer
 */
function initializeThreeJS() {
    const container = document.getElementById('canvas-container');
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e27);
    scene.fog = new THREE.Fog(0x0a0e27, 100, 500);

    // Camera setup
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(15, 10, 15);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 30, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a2235, 
        roughness: 0.7 
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Create factory models
    createFactoryModels();

    // Handle window resize
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    });
}

/**
 * Create 3D models for factory stations
 */
function createFactoryModels() {
    const stationSpacing = 8;
    const startX = -16;
    
    // Station positions
    const positions = {
        mixing: { x: startX, y: 0, z: 0 },
        carbonation: { x: startX + stationSpacing, y: 0, z: 0 },
        filling: { x: startX + stationSpacing * 2, y: 0, z: 0 },
        capping: { x: startX + stationSpacing * 3, y: 0, z: 0 },
        packing: { x: startX + stationSpacing * 4, y: 0, z: 0 }
    };

    // Create each station
    Object.keys(factory.stationOrder).forEach((index) => {
        const stationKey = factory.stationOrder[index];
        const pos = positions[stationKey];
        const stationGroup = new THREE.Group();
        stationGroup.position.set(pos.x, pos.y, pos.z);

        // Create station base
        const baseGeometry = new THREE.BoxGeometry(3, 1, 4);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x2a3a52 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.5;
        base.castShadow = true;
        base.receiveShadow = true;
        stationGroup.add(base);

        // Create station-specific 3D elements
        let stationModel;
        if (stationKey === 'mixing') {
            stationModel = createMixingStation();
        } else if (stationKey === 'carbonation') {
            stationModel = createCarbonationStation();
        } else if (stationKey === 'filling') {
            stationModel = createFillingStation();
        } else if (stationKey === 'capping') {
            stationModel = createCappingStation();
        } else if (stationKey === 'packing') {
            stationModel = createPackingStation();
        }

        if (stationModel) {
            stationModel.position.y = 1;
            stationGroup.add(stationModel);
        }

        // Station label
        const labelCanvas = createTextCanvas(factory.stations[stationKey].name);
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelMaterial = new THREE.MeshBasicMaterial({ map: labelTexture });
        const labelGeometry = new THREE.PlaneGeometry(3, 0.5);
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.y = 3;
        label.position.z = 2.2;
        stationGroup.add(label);

        scene.add(stationGroup);
        factoryModels[stationKey] = stationGroup;
    });

    // Add conveyor belts between stations
    createConveyorBelts(positions);
}

/**
 * Create mixing station 3D model
 */
function createMixingStation() {
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
 * Create carbonation station 3D model
 */
function createCarbonationStation() {
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

    // Pressure gauge indicator
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
 * Create filling station 3D model
 */
function createFillingStation() {
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
 * Create capping station 3D model
 */
function createCappingStation() {
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

    // Arm segment 2 / gripper
    const gripperGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.3);
    const gripperMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b35 });
    const gripper = new THREE.Mesh(gripperGeometry, gripperMaterial);
    gripper.position.set(0.5, 1.8, 0);
    gripper.castShadow = true;
    group.add(gripper);

    return group;
}

/**
 * Create packing station 3D model
 */
function createPackingStation() {
    const group = new THREE.Group();
    
    // Conveyor belt section
    const beltGeometry = new THREE.BoxGeometry(3, 0.3, 1);
    const beltMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const belt = new THREE.Mesh(beltGeometry, beltMaterial);
    belt.position.y = 0;
    belt.castShadow = true;
    group.add(belt);

    // Box stacking area
    const boxGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const boxMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff6b35,
        metalness: 0.3
    });
    
    // Stack 3 boxes
    for (let i = 0; i < 3; i++) {
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.y = 0.75 + i * 1.5;
        box.castShadow = true;
        group.add(box);
    }

    return group;
}

/**
 * Create conveyor belts between stations
 */
function createConveyorBelts(positions) {
    const stationKeys = factory.stationOrder;
    
    for (let i = 0; i < stationKeys.length - 1; i++) {
        const currentKey = stationKeys[i];
        const nextKey = stationKeys[i + 1];
        const currentPos = positions[currentKey];
        const nextPos = positions[nextKey];

        const distance = Math.sqrt(
            Math.pow(nextPos.x - currentPos.x, 2) + 
            Math.pow(nextPos.z - currentPos.z, 2)
        );

        // Conveyor belt geometry
        const beltGeometry = new THREE.BoxGeometry(distance - 1, 0.2, 0.8);
        const beltMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.8
        });
        const belt = new THREE.Mesh(beltGeometry, beltMaterial);

        // Position belt between stations
        belt.position.x = (currentPos.x + nextPos.x) / 2;
        belt.position.y = 0.5;
        belt.position.z = (currentPos.z + nextPos.z) / 2;
        belt.receiveShadow = true;

        scene.add(belt);
    }
}

/**
 * Create canvas texture for text labels
 */
function createTextCanvas(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ff6b35';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    return canvas;
}

// ===== Animation Loop =====
function startAnimationLoop() {
    function animate() {
        animationId = requestAnimationFrame(animate);

        const currentTime = Date.now();
        const deltaTime = (currentTime - lastUpdateTime) / 1000;
        lastUpdateTime = currentTime;

        // Update factory simulation
        factory.update(deltaTime);

        // Update 3D visualizations
        updateFactoryVisualization();

        // Update UI
        updateUI();

        // Render scene
        renderer.render(scene, camera);
    }

    animate();
}

/**
 * Update 3D factory models based on simulation state
 */
function updateFactoryVisualization() {
    const metrics = factory.getMetrics();

    // Update each station's visual state
    factory.stationOrder.forEach(stationKey => {
        const stationGroup = factoryModels[stationKey];
        const state = metrics.stationStates[stationKey];

        if (stationGroup && state) {
            // Rotate elements to show activity
            stationGroup.rotation.y += 0.01 * factory.productionSpeed;

            // Update color based on efficiency
            const efficiency = factory.getStationEfficiency(stationKey);
            let color;
            if (efficiency >= 95) {
                color = 0x4ade80; // Green
            } else if (efficiency >= 85) {
                color = 0xfacc15; // Yellow
            } else if (efficiency >= 70) {
                color = 0xef4444; // Red
            } else {
                color = 0xa855f7; // Purple
            }

            // Update material colors
            stationGroup.traverse(child => {
                if (child.material && child.material.color) {
                    if (child.material.color.getHex && 
                        (child.material.color.getHex() === 0xff6b35 || 
                         child.material.color.getHex() === 0xff8555)) {
                        child.material.color.setHex(color);
                        child.material.emissive?.setHex(color);
                        child.material.emissiveIntensity = 0.3;
                    }
                }
            });
        }
    });

    // Animate camera orbit
    const time = Date.now() * 0.0001;
    camera.position.x = Math.cos(time) * 20;
    camera.position.z = Math.sin(time) * 20;
    camera.lookAt(0, 3, 0);
}

// ===== UI Initialization and Updates =====
function initializeUI() {
    // Populate station table
    updateStationTable();
    
    // Initialize chart canvas
    const canvas = document.getElementById('productionChart');
    if (canvas && canvas.getContext) {
        canvas.ctx = canvas.getContext('2d');
    }
}

/**
 * Update station table display
 */
function updateStationTable() {
    const tbody = document.getElementById('stationTableBody');
    tbody.innerHTML = '';

    factory.stationOrder.forEach(stationKey => {
        const station = factory.stations[stationKey];
        const efficiency = factory.getStationEfficiency(stationKey);
        const status = factory.getStationStatus(stationKey);
        const statusClass = factory.getStationStatusClass(stationKey);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${station.name}</td>
            <td>${efficiency.toFixed(1)}%</td>
            <td><span class="${statusClass}">${status}</span></td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Update all UI displays with current metrics
 */
function updateUI() {
    const metrics = factory.getMetrics();

    // Update status
    const overallStatus = factory.getOverallStatus();
    const statusElement = document.getElementById('overallStatus');
    statusElement.textContent = overallStatus.label;
    statusElement.className = overallStatus.class;

    // Update summary info
    document.getElementById('bottleneckInfo').textContent = 
        `Bottleneck: ${metrics.bottleneck}`;
    document.getElementById('overallThroughput').textContent = 
        `Throughput: ${metrics.productionRate.toFixed(1)} cans/min`;

    // Update metric boxes
    document.getElementById('metricRate').textContent = metrics.productionRate.toFixed(1);
    document.getElementById('metricCycle').textContent = metrics.cycleTime.toFixed(1);
    document.getElementById('metricFill').textContent = metrics.fillLevel.toFixed(1);
    document.getElementById('metricTotal').textContent = Math.floor(metrics.totalCansProduced);

    // Update timeline chart
    updateProductionChart(metrics.productionHistory);

    // Format time
    const minutes = Math.floor(metrics.elapsedTime / 60);
    const seconds = Math.floor(metrics.elapsedTime % 60);
    document.getElementById('elapsedTime').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    document.getElementById('currentRate').textContent = 
        `${metrics.productionRate.toFixed(0)} cans/min`;
}

/**
 * Draw production rate timeline chart
 */
function updateProductionChart(history) {
    const canvas = document.getElementById('productionChart');
    if (!canvas.ctx) return;

    const ctx = canvas.ctx;
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = 'rgba(10, 14, 39, 0.5)';
    ctx.fillRect(0, 0, width, height);

    if (history.length < 2) return;

    // Calculate scale
    const maxRate = Math.max(...history.map(h => h.maxRate || 20), 20);
    const timeRange = history[history.length - 1].time - history[0].time || 1;

    // Draw grid
    ctx.strokeStyle = 'rgba(42, 58, 82, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Draw line chart
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 2;
    ctx.beginPath();

    history.forEach((point, index) => {
        const x = (index / history.length) * width;
        const y = height - (point.rate / maxRate) * height;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Draw current value point
    const lastPoint = history[history.length - 1];
    const lastX = width;
    const lastY = height - (lastPoint.rate / maxRate) * height;

    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fill();
}

// ===== Event Listeners =====
function initializeEventListeners() {
    // Control panel toggle
    document.getElementById('btnControls').addEventListener('click', () => {
        document.getElementById('controlPanel').classList.toggle('active');
    });

    document.getElementById('closePanel').addEventListener('click', () => {
        document.getElementById('controlPanel').classList.remove('active');
    });

    // Slider controls
    document.getElementById('sliderSpeed').addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        factory.setProductionSpeed(speed);
        document.getElementById('speedValue').textContent = speed.toFixed(1) + 'x';
    });

    document.getElementById('sliderBatch').addEventListener('input', (e) => {
        const batch = parseInt(e.target.value);
        factory.setCansPerBatch(batch);
        document.getElementById('batchValue').textContent = batch;
    });

    document.getElementById('sliderDuration').addEventListener('input', (e) => {
        const duration = parseInt(e.target.value);
        factory.setSimulationDuration(duration);
        document.getElementById('durationValue').textContent = duration + ' s';
    });

    document.getElementById('selectMode').addEventListener('change', (e) => {
        factory.setProductionMode(e.target.value);
    });

    // Action buttons
    document.getElementById('btnStart').addEventListener('click', () => {
        if (factory.isRunning) {
            factory.stop();
            document.getElementById('btnStart').textContent = 'START PRODUCTION';
        } else {
            factory.start();
            document.getElementById('btnStart').textContent = 'STOP PRODUCTION';
        }
    });

    document.getElementById('btnReset').addEventListener('click', resetCamera);
    document.getElementById('btnReset2').addEventListener('click', () => {
        factory.stop();
        factory.resetStations();
        factory.elapsedTime = 0;
        factory.totalCansProduced = 0;
        factory.productionHistory = [];
        updateUI();
        document.getElementById('btnStart').textContent = 'START PRODUCTION';
    });

    // Camera controls
    document.getElementById('btnReset').addEventListener('click', resetCamera);
    document.getElementById('btnFullscreen').addEventListener('click', toggleFullscreen);
    document.getElementById('btnHideUI').addEventListener('click', toggleUIVisibility);

    // Close control panel when clicking outside (optional)
    document.addEventListener('click', (e) => {
        const controlPanel = document.getElementById('controlPanel');
        const btnControls = document.getElementById('btnControls');
        if (!controlPanel.contains(e.target) && e.target !== btnControls) {
            // Optional: auto-close on outside click
        }
    });
}

/**
 * Reset camera to default position
 */
function resetCamera() {
    camera.position.set(15, 10, 15);
    camera.lookAt(0, 3, 0);
}

/**
 * Toggle fullscreen mode
 */
function toggleFullscreen() {
    const container = document.getElementById('canvas-container');
    if (!document.fullscreenElement) {
        container.requestFullscreen?.();
    } else {
        document.exitFullscreen?.();
    }
}

/**
 * Toggle UI visibility
 */
function toggleUIVisibility() {
    document.body.classList.toggle('hide-ui');
}
