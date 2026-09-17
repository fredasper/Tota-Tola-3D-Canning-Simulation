/**
 * Procedural 3D digital twin of the canning line.
 * Fully synchronized industrial facility with dual production lines,
 * unified conveyor elevation, connected sanitary piping, 4 forklifts,
 * retractable roller gates into housings, and complete structural architecture.
 */

'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CanSnapshot, CaseSnapshot, FactoryMetrics, StationKey } from '@/types/simulation';
import CONFIG from '@/lib/config';
import {
  createForkliftWithDriver,
  createIndustrialWorkerAgents,
} from './factory3d/FactoryWorkers';

interface Factory3DProps {
  metrics: FactoryMetrics | null;
  activeLine?: 'overview' | 'line1' | 'line2';
  containerClassName?: string;
}

export interface Factory3DHandle {
  focusStation: (stationId: CameraStationId) => void;
}

interface MachineVisual {
  key?: StationKey;
  line?: 'line1' | 'line2';
  group: THREE.Group;
  movingParts?: THREE.Object3D[];
  indicator?: THREE.MeshStandardMaterial;
  update?: (elapsedTime: number, productionSpeed: number, overloadRatio: number, isRunning: boolean) => void;
  reset?: () => void;
}

interface CanVisual {
  group: THREE.Group;
  liquid: THREE.Mesh;
  lid: THREE.Mesh;
  label: THREE.MeshLambertMaterial;
}

export type CameraStationId =
  | 'overview'
  | 'line1_infeed' | 'line1_rinser' | 'line1_mixing' | 'line1_carbonation' | 'line1_filling' | 'line1_seaming' | 'line1_capping' | 'line1_inspection' | 'line1_packing' | 'line1_palletizing'
  | 'line2_infeed' | 'line2_rinser' | 'line2_mixing' | 'line2_carbonation' | 'line2_filling' | 'line2_seaming' | 'line2_capping' | 'line2_inspection' | 'line2_packing' | 'line2_palletizing';

interface CameraNavigation {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  destination: THREE.Vector3 | null;
  target: THREE.Vector3 | null;
}

interface CameraStation {
  id: CameraStationId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

const steel = 0xb7c4ce;
const darkSteel = 0x263746;
const beltColor = 0x17212b;
const BELT_SURFACE_Y = 1.0;

export const cameraStations: CameraStation[] = [
  // Overview (Centered inside plant envelope, framing both lines without showing outside void)
  { id: 'overview', label: 'Overview', position: [-6, 15.5, 34], target: [-6, 2.0, 0] },
  
  // Line 1 (Z = -15, workers and machines framed at dynamic 3/4 perspective)
  { id: 'line1_infeed', label: 'Depalletizer', position: [-58, 8.5, -4], target: [-65, 1.8, -13.5] },
  { id: 'line1_rinser', label: 'Rinser', position: [-34, 7.5, -5], target: [-40, 1.6, -14.5] },
  { id: 'line1_mixing', label: 'Blend', position: [-23, 8.5, -12], target: [-29, 2.4, -20.5] },
  { id: 'line1_carbonation', label: 'Carbonation', position: [-12, 7.5, -12], target: [-18, 2.0, -20.5] },
  { id: 'line1_filling', label: 'Filler', position: [5, 8.0, -5], target: [-1.6, 2.0, -14] },
  { id: 'line1_seaming', label: 'Seamer', position: [17, 8.0, -4.5], target: [10.8, 1.8, -13.5] },
  { id: 'line1_inspection', label: 'QA Inspect', position: [26, 7.0, -5.5], target: [20, 1.6, -14] },
  { id: 'line1_packing', label: 'Packer', position: [36, 8.0, -4], target: [30, 1.8, -13.5] },
  { id: 'line1_palletizing', label: 'Palletizer', position: [52, 9.5, -4], target: [44, 2.0, -13] },

  // Line 2 (Z = 15, workers and machines framed at dynamic 3/4 perspective)
  { id: 'line2_infeed', label: 'Depalletizer', position: [-58, 8.5, 25], target: [-65, 1.8, 13.5] },
  { id: 'line2_rinser', label: 'Rinser', position: [-34, 7.5, 24], target: [-40, 1.6, 14.5] },
  { id: 'line2_mixing', label: 'Blend', position: [-23, 8.5, 12], target: [-29, 2.4, 20.5] },
  { id: 'line2_carbonation', label: 'Carbonation', position: [-12, 7.5, 12], target: [-18, 2.0, 20.5] },
  { id: 'line2_filling', label: 'Filler', position: [5, 8.0, 24], target: [-1.6, 2.0, 14] },
  { id: 'line2_seaming', label: 'Seamer', position: [17, 8.0, 24.5], target: [10.8, 1.8, 13.5] },
  { id: 'line2_inspection', label: 'QA Inspect', position: [26, 7.0, 24.5], target: [20, 1.6, 14] },
  { id: 'line2_packing', label: 'Packer', position: [36, 8.0, 24], target: [30, 1.8, 13.5] },
  { id: 'line2_palletizing', label: 'Palletizer', position: [52, 9.5, 24], target: [44, 2.0, 13] },
];

export const Factory3D = forwardRef<Factory3DHandle, Factory3DProps>(function Factory3D(
  { metrics, activeLine = 'overview', containerClassName = '' },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef(metrics);
  const activeLineRef = useRef(activeLine);
  const animationIdRef = useRef<number | null>(null);
  const machinesRef = useRef<MachineVisual[]>([]);
  const line1LabelsRef = useRef<THREE.Group[]>([]);
  const line2LabelsRef = useRef<THREE.Group[]>([]);
  const canVisualsL1Ref = useRef(new Map<number, CanVisual>());
  const canVisualsL2Ref = useRef(new Map<number, CanVisual>());
  const caseVisualsL1Ref = useRef(new Map<number, THREE.Group>());
  const caseVisualsL2Ref = useRef(new Map<number, THREE.Group>());
  const canLayerL1Ref = useRef<THREE.Group | null>(null);
  const canLayerL2Ref = useRef<THREE.Group | null>(null);
  const caseLayerL1Ref = useRef<THREE.Group | null>(null);
  const caseLayerL2Ref = useRef<THREE.Group | null>(null);
  const fillerStreamsRef = useRef<THREE.Mesh[]>([]);
  const cameraNavigationRef = useRef<CameraNavigation | null>(null);

  useImperativeHandle(ref, () => ({
    focusStation(stationId: CameraStationId) {
      if (stationId.startsWith('line1_')) {
        activeLineRef.current = 'line1';
      } else if (stationId.startsWith('line2_')) {
        activeLineRef.current = 'line2';
      } else if (stationId === 'overview') {
        activeLineRef.current = 'overview';
      }
      const station = cameraStations.find((s) => s.id === stationId);
      const navigation = cameraNavigationRef.current;
      if (!station || !navigation) return;
      navigation.destination = new THREE.Vector3(...station.position);
      navigation.target = new THREE.Vector3(...station.target);
    },
  }), []);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    activeLineRef.current = activeLine;
  }, [activeLine]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const canVisualsL1 = canVisualsL1Ref.current;
    const canVisualsL2 = canVisualsL2Ref.current;
    const caseVisualsL1 = caseVisualsL1Ref.current;
    const caseVisualsL2 = caseVisualsL2Ref.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#7fa2c4');

    const size = () => ({
      width: Math.max(container.clientWidth, 1),
      height: Math.max(container.clientHeight, 1),
    });
    const initialSize = size();
    const camera = new THREE.PerspectiveCamera(56, initialSize.width / initialSize.height, 0.1, 240);
    camera.position.set(...cameraStations[0].position);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.setSize(initialSize.width, initialSize.height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.minDistance = 4;
    controls.maxDistance = 54;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.minPolarAngle = Math.PI * 0.12;
    controls.target.set(...cameraStations[0].target);
    controls.update();

    controls.addEventListener('start', () => {
      const navigation = cameraNavigationRef.current;
      if (navigation) {
        navigation.destination = null;
        navigation.target = null;
      }
    });

    controls.addEventListener('change', () => {
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -72, 72);
      controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0.5, 9.0);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -22, 22);

      // Clamp camera position strictly within the factory interior
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -76, 76);
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, 1.2, 18.2);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -36, 36);
    });

    cameraNavigationRef.current = {
      camera,
      controls,
      destination: null,
      target: null,
    };

    // Bright, Clean Industrial Daylight Lighting Architecture
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 2.0));

    const mainSun = new THREE.DirectionalLight(0xfffaed, 3.2);
    mainSun.position.set(24, 24, 20);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.set(1024, 1024);
    mainSun.shadow.camera.left = -75;
    mainSun.shadow.camera.right = 75;
    mainSun.shadow.camera.top = 50;
    mainSun.shadow.camera.bottom = -50;
    mainSun.shadow.bias = -0.0005;
    scene.add(mainSun);

    const fillLight = new THREE.DirectionalLight(0xe2f1fe, 2.2);
    fillLight.position.set(-24, 22, -20);
    scene.add(fillLight);

    const overheadLight = new THREE.DirectionalLight(0xffffff, 1.5);
    overheadLight.position.set(0, 26, 0);
    scene.add(overheadLight);

    // Solid Industrial Floor (Clean, solid uniform surface)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 80),
      new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.68, metalness: 0.12 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Build Environment
    const fanBlades: THREE.Object3D[] = [];
    scene.add(createFactoryEnvironment(fanBlades));

    // Build Dual Canning Lines
    const machineVisuals: MachineVisual[] = [];
    const line1Labels: THREE.Group[] = [];
    const line2Labels: THREE.Group[] = [];
    buildProductionLine(-15, 'LINE 1', machineVisuals, fillerStreamsRef.current, scene, line1Labels);
    buildProductionLine(15, 'LINE 2', machineVisuals, fillerStreamsRef.current, scene, line2Labels);
    machinesRef.current = machineVisuals;
    line1LabelsRef.current = line1Labels;
    line2LabelsRef.current = line2Labels;

    // Visual Layers for Dynamic Cans and Cases
    const canLayerL1 = new THREE.Group();
    const caseLayerL1 = new THREE.Group();
    const canLayerL2 = new THREE.Group();
    const caseLayerL2 = new THREE.Group();
    canLayerL1.position.z = -15;
    caseLayerL1.position.z = -15;
    canLayerL2.position.z = 15;
    caseLayerL2.position.z = 15;

    scene.add(canLayerL1, caseLayerL1, canLayerL2, caseLayerL2);
    canLayerL1Ref.current = canLayerL1;
    caseLayerL1Ref.current = caseLayerL1;
    canLayerL2Ref.current = canLayerL2;
    caseLayerL2Ref.current = caseLayerL2;

    // Articulated Industrial Operators with Functional Machine Interactions
    const workerSystem = createIndustrialWorkerAgents(scene);

    // 4 Forklifts (2 for Line 1, 2 for Line 2)
    const forklift1A = createForklift();
    const forklift1B = createForklift();
    const forklift2A = createForklift();
    const forklift2B = createForklift();
    scene.add(forklift1A, forklift1B, forklift2A, forklift2B);

    // Realistic forklift dispatch route for Line 1 (Z = -15)
    // Drives directly to the Palletizer / Dispatcher pickup point (X = 50.5, Z = -15.0)
    // Smoothly collects pallet, transits outbound to Gate 1 (X = 90) and shipping dock (X = 112-115)
    const forkliftPath1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(50.5, 0, -15.0), // Dispatcher pickup staging (faces pallet at X = 47.2)
      new THREE.Vector3(53.0, 0, -14.2), // Steer out into outbound transit lane
      new THREE.Vector3(57.0, 0, -13.5), // Outbound lane entrance
      new THREE.Vector3(68.0, 0, -13.5), // Outbound marked lane
      new THREE.Vector3(78.0, 0, -13.5), // Fast transit lane
      new THREE.Vector3(85.0, 0, -14.2), // Align towards Gate 1 threshold
      new THREE.Vector3(90.0, 0, -15.0), // Center of Gate 1 doorway (X = 90, Z = -15)
      new THREE.Vector3(98.0, 0, -15.0), // Cleared Gate 1 out into shipping yard
      new THREE.Vector3(106.0, 0, -14.4), // Dock trailer bay approach
      new THREE.Vector3(112.0, 0, -14.4), // Dock drop-off staging
      new THREE.Vector3(115.5, 0, -15.5), // Smooth rear-wheel turn at dock apron
      new THREE.Vector3(112.0, 0, -16.6), // Inbound return lane heading back
      new THREE.Vector3(106.0, 0, -16.6), // Staging yard return lane
      new THREE.Vector3(98.0, 0, -15.0), // Return approach to Gate 1
      new THREE.Vector3(90.0, 0, -15.0), // Pass inbound through Gate 1
      new THREE.Vector3(85.0, 0, -15.8), // Steer into return transit lane
      new THREE.Vector3(78.0, 0, -16.5), // Inbound return transit lane
      new THREE.Vector3(68.0, 0, -16.5), // Inbound transit lane
      new THREE.Vector3(57.0, 0, -16.5), // Inbound approach to dispatcher
      new THREE.Vector3(53.0, 0, -15.8), // Steer in towards dispatcher pallet alignment
    ], true, 'centripetal');

    // Realistic forklift dispatch route for Line 2 (Z = 15)
    const forkliftPath2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(50.5, 0, 15.0), // Dispatcher pickup staging (faces pallet at X = 47.2)
      new THREE.Vector3(53.0, 0, 14.2), // Steer out into outbound transit lane
      new THREE.Vector3(57.0, 0, 13.5), // Outbound lane entrance
      new THREE.Vector3(68.0, 0, 13.5), // Outbound marked lane
      new THREE.Vector3(78.0, 0, 13.5), // Fast transit lane
      new THREE.Vector3(85.0, 0, 14.2), // Align towards Gate 2 threshold
      new THREE.Vector3(90.0, 0, 15.0), // Center of Gate 2 doorway (X = 90, Z = 15)
      new THREE.Vector3(98.0, 0, 15.0), // Cleared Gate 2 out into shipping yard
      new THREE.Vector3(106.0, 0, 14.4), // Dock trailer bay approach
      new THREE.Vector3(112.0, 0, 14.4), // Dock drop-off staging
      new THREE.Vector3(115.5, 0, 15.5), // Smooth rear-wheel turn at dock apron
      new THREE.Vector3(112.0, 0, 16.6), // Inbound return lane heading back
      new THREE.Vector3(106.0, 0, 16.6), // Staging yard return lane
      new THREE.Vector3(98.0, 0, 15.0), // Return approach to Gate 2
      new THREE.Vector3(90.0, 0, 15.0), // Pass inbound through Gate 2
      new THREE.Vector3(85.0, 0, 15.8), // Steer into return transit lane
      new THREE.Vector3(78.0, 0, 16.5), // Inbound return transit lane
      new THREE.Vector3(68.0, 0, 16.5), // Inbound transit lane
      new THREE.Vector3(57.0, 0, 16.5), // Inbound approach to dispatcher
      new THREE.Vector3(53.0, 0, 15.8), // Steer in towards dispatcher pallet alignment
    ], true, 'centripetal');

    const initForklift = (forklift: THREE.Group, path: THREE.CatmullRomCurve3, t: number) => {
      forklift.position.copy(path.getPoint(t));
      const look = path.getPoint((t + 0.006) % 1);
      look.y = forklift.position.y;
      forklift.lookAt(look);
    };

    initForklift(forklift1A, forkliftPath1, 0);
    initForklift(forklift1B, forkliftPath1, 0.5);
    initForklift(forklift2A, forkliftPath2, 0.15);
    initForklift(forklift2B, forkliftPath2, 0.65);

    // 2 Gates embedded in Right Wall (X = 90)
    const gate1 = createGate();
    gate1.position.set(90, 0, -15);
    scene.add(gate1);

    const gate2 = createGate();
    gate2.position.set(90, 0, 15);
    scene.add(gate2);

    const resize = () => {
      const nextSize = size();
      camera.aspect = nextSize.width / nextSize.height;
      camera.updateProjectionMatrix();
      renderer.setSize(nextSize.width, nextSize.height);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const clock = new THREE.Clock();

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const currentMetrics = metricsRef.current;
      const realTime = clock.getElapsedTime();
      const navigation = cameraNavigationRef.current;
      if (navigation?.destination && navigation.target) {
        navigation.camera.position.lerp(navigation.destination, 0.12);
        navigation.controls.target.lerp(navigation.target, 0.12);
        if (
          navigation.camera.position.distanceTo(navigation.destination) < 0.05 &&
          navigation.controls.target.distanceTo(navigation.target) < 0.05
        ) {
          navigation.camera.position.copy(navigation.destination);
          navigation.controls.target.copy(navigation.target);
          navigation.destination = null;
          navigation.target = null;
        }
      }
      controls.update();

      // Keep camera and target safely contained inside factory building envelope
      if (!navigation?.destination) {
        controls.target.x = THREE.MathUtils.clamp(controls.target.x, -72, 72);
        controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0.5, 9.0);
        controls.target.z = THREE.MathUtils.clamp(controls.target.z, -22, 22);

        camera.position.x = THREE.MathUtils.clamp(camera.position.x, -76, 76);
        camera.position.y = THREE.MathUtils.clamp(camera.position.y, 1.2, 18.2);
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, -36, 36);
      }
 
      // Animate industrial exhaust fan blades continuously
      if (fanBlades.length > 0) {
        const fanSpeed = currentMetrics?.isRunning ? 0.08 : 0.02;
        fanBlades.forEach((blade) => {
          blade.rotation.z += fanSpeed;
        });
      }

      // Eliminate overlapping duplicate station labels when inspecting a specific line
      const active = activeLineRef.current;
      if (active === 'line1') {
        line1LabelsRef.current.forEach((l) => (l.visible = true));
        line2LabelsRef.current.forEach((l) => (l.visible = false));
      } else if (active === 'line2') {
        line1LabelsRef.current.forEach((l) => (l.visible = false));
        line2LabelsRef.current.forEach((l) => (l.visible = true));
      } else {
        line1LabelsRef.current.forEach((l) => (l.visible = true));
        line2LabelsRef.current.forEach((l) => (l.visible = true));
      }

      if (currentMetrics) {
        updateMachines(machineVisuals, currentMetrics);
        syncCanVisuals(
          currentMetrics.lineState.visualCans.filter((c) => c.lane === 0),
          canLayerL1,
          canVisualsL1
        );
        syncCanVisuals(
          currentMetrics.lineState.visualCans.filter((c) => c.lane === 1),
          canLayerL2,
          canVisualsL2
        );
        syncCaseVisuals(
          currentMetrics.lineState.visibleCases.filter((c) => c.lane === 0),
          caseLayerL1,
          caseVisualsL1
        );
        syncCaseVisuals(
          currentMetrics.lineState.visibleCases.filter((c) => c.lane === 1),
          caseLayerL2,
          caseVisualsL2
        );
        updateFillingStreams(fillerStreamsRef.current, currentMetrics);

        // Animate Articulated Industrial Workers & Forklift Drivers
        const speedMultiplier = (currentMetrics?.productionSpeed || 1.0) * (currentMetrics?.overloadRatio || 1.0);
        const isRunning = !!currentMetrics?.isRunning;
        const l1Active = isRunning && !!currentMetrics?.line1Enabled;
        const l2Active = isRunning && !!currentMetrics?.line2Enabled;

        workerSystem.agents.forEach((agent, idx) => {
          // Workers 0-5 belong to Station 1, workers 6-11 belong to Station 2
          const isAgentLine1 = idx < 6;
          const agentActive = isAgentLine1 ? l1Active : l2Active;
          agent.update(
            currentMetrics ? currentMetrics.elapsedTime : 0,
            speedMultiplier,
            agentActive,
            realTime
          );
        });
        workerSystem.updateDrivers(
          [forklift1A, forklift1B, forklift2A, forklift2B],
          currentMetrics ? currentMetrics.elapsedTime : 0,
          isRunning,
          realTime
        );

        if (isRunning) {
          // Animate 4 Forklifts with authentic maneuvers and pallet transport
          const baseSpeed = currentMetrics.productionMode === 'express' ? 0.055 : 0.026;

          const updateForklift = (
            forklift: THREE.Group,
            path: THREE.CatmullRomCurve3,
            tOffset: number,
            stationActive: boolean
          ) => {
            if (!stationActive) return; // FREEZE FORKLIFT IF THIS STATION IS OFF!
            const t = (currentMetrics.elapsedTime * baseSpeed + tOffset) % 1;
            const currentPos = path.getPoint(t);
            const nextPos = path.getPoint((t + 0.006) % 1);
            forklift.position.copy(currentPos);
            // Maintain level floor alignment
            nextPos.y = currentPos.y;
            forklift.lookAt(nextPos);

            // Realistic pallet delivery: carries full pallet outbound (t < 0.48), returns with empty forks (t >= 0.48)
            if (forklift.userData.load) {
              forklift.userData.load.visible = t < 0.48;
            }
          };

          updateForklift(forklift1A, forkliftPath1, 0, l1Active);
          updateForklift(forklift1B, forkliftPath1, 0.5, l1Active);
          updateForklift(forklift2A, forkliftPath2, 0.15, l2Active);
          updateForklift(forklift2B, forkliftPath2, 0.65, l2Active);

          // Gate 1 Proximity (only opens when Station 1 forklifts are running)
          const dist1 = l1Active
            ? Math.min(
                forklift1A.position.distanceTo(new THREE.Vector3(90, 0, -15)),
                forklift1B.position.distanceTo(new THREE.Vector3(90, 0, -15))
              )
            : 999;
          animateGateDoor(gate1, dist1 < 24);

          // Gate 2 Proximity (only opens when Station 2 forklifts are running)
          const dist2 = l2Active
            ? Math.min(
                forklift2A.position.distanceTo(new THREE.Vector3(90, 0, 15)),
                forklift2B.position.distanceTo(new THREE.Vector3(90, 0, 15))
              )
            : 999;
          animateGateDoor(gate2, dist2 < 24);
        } else if (currentMetrics.elapsedTime === 0) {
          // STANDBY / RESET RUN: Staged at starting locations
          initForklift(forklift1A, forkliftPath1, 0);
          initForklift(forklift1B, forkliftPath1, 0.5);
          initForklift(forklift2A, forkliftPath2, 0.15);
          initForklift(forklift2B, forkliftPath2, 0.65);
          if (forklift1A.userData.load) forklift1A.userData.load.visible = false;
          if (forklift1B.userData.load) forklift1B.userData.load.visible = false;
          if (forklift2A.userData.load) forklift2A.userData.load.visible = false;
          if (forklift2B.userData.load) forklift2B.userData.load.visible = false;
          animateGateDoor(gate1, false);
          animateGateDoor(gate2, false);
        }
        // When paused (!isRunning && elapsedTime > 0), forklifts and gates freeze in place!
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      resizeObserver.disconnect();
      if (animationIdRef.current !== null) cancelAnimationFrame(animationIdRef.current);
      canVisualsL1.forEach((visual) => disposeObject(visual.group));
      caseVisualsL1.forEach((visual) => disposeObject(visual));
      canVisualsL2.forEach((visual) => disposeObject(visual.group));
      caseVisualsL2.forEach((visual) => disposeObject(visual));
      canVisualsL1.clear();
      caseVisualsL1.clear();
      canVisualsL2.clear();
      caseVisualsL2.clear();
      workerSystem.dispose();
      scene.traverse(disposeObject);
      controls.dispose();
      cameraNavigationRef.current = null;
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={containerRef} className={`h-full w-full overflow-hidden ${containerClassName}`} />
  );
});

/**
 * Builds a complete canning line with all machines, piping, and unified conveyor
 */
function buildProductionLine(
  zOffset: number,
  lineName: string,
  machineVisuals: MachineVisual[],
  streamsArray: THREE.Mesh[],
  scene: THREE.Scene,
  stationLabels?: THREE.Group[]
) {
  const lineTag = zOffset < 0 ? 'LINE 1' : 'LINE 2';
  const lineId: 'line1' | 'line2' = zOffset < 0 ? 'line1' : 'line2';

  // 1. Unified Conveyor (top of belt surface at Y = 1.0)
  const conveyor = createConveyorLine();
  conveyor.line = lineId;
  conveyor.group.position.z = zOffset;
  machineVisuals.push(conveyor);
  scene.add(conveyor.group);

  // 2. Depalletizer at infeed (X = -64)
  const depal = createEmptyCanDepalletizer(lineTag, stationLabels);
  depal.line = lineId;
  depal.group.position.set(-64, 0, zOffset);
  machineVisuals.push(depal);
  scene.add(depal.group);

  // 3. Rinser & Optical Clean Check (X = -40)
  const rinser = createRinserAndEmptyCanInspector(lineTag, stationLabels);
  rinser.line = lineId;
  rinser.group.position.set(-40, 0, zOffset);
  machineVisuals.push(rinser);
  scene.add(rinser.group);

  // 4. Syrup Blending Skid (X = -30, Z offset by -5.5 towards utility alley)
  const mixingZ = zOffset + (zOffset < 0 ? -5.5 : -5.5);
  const mixing = createBlendingTank(lineTag, stationLabels);
  mixing.line = lineId;
  mixing.group.position.set(-30, 0, mixingZ);
  mixing.key = 'mixing';
  machineVisuals.push(mixing);
  scene.add(mixing.group);

  // 5. Carbonation Skid (X = -18, Z offset by -5.5)
  const carbonation = createCarbonator(lineTag, stationLabels);
  carbonation.line = lineId;
  carbonation.group.position.set(-18, 0, mixingZ);
  carbonation.key = 'carbonation';
  machineVisuals.push(carbonation);
  scene.add(carbonation.group);

  // 6. Connected Sanitary Stainless Piping (Tank -> Pump -> Carbonator -> Filler)
  const sanitaryPiping = createSanitaryPiping(mixingZ, zOffset);
  scene.add(sanitaryPiping);

  // 7. Counter-Pressure Rotary Filler (X = -1.6)
  const filling = createFiller(streamsArray, lineTag, stationLabels);
  filling.line = lineId;
  filling.group.position.set(-1.6, 0, zOffset);
  filling.key = 'filling';
  machineVisuals.push(filling);
  scene.add(filling.group);

  // 8. Can Seamer (X = 10.8)
  const capping = createSeamer(lineTag, stationLabels);
  capping.line = lineId;
  capping.group.position.set(10.8, 0, zOffset);
  capping.key = 'capping';
  machineVisuals.push(capping);
  scene.add(capping.group);

  // 9. Full Can QA Inspection (X = 20)
  const fullCanQA = createFullCanInspection(lineTag, stationLabels);
  fullCanQA.line = lineId;
  fullCanQA.group.position.set(20, 0, zOffset);
  machineVisuals.push(fullCanQA);
  scene.add(fullCanQA.group);

  // 10. Case Packer (X = 29)
  const packing = createCasePacker(lineTag, stationLabels);
  packing.line = lineId;
  packing.group.position.set(29, 0, zOffset);
  packing.key = 'packing';
  machineVisuals.push(packing);
  scene.add(packing.group);

  // 11. Palletizer & Dispatch Bay (X = 46)
  const palletizer = createPalletizer(lineTag, stationLabels);
  palletizer.line = lineId;
  palletizer.group.position.set(46, 0, zOffset);
  machineVisuals.push(palletizer);
  scene.add(palletizer.group);

  // 12. Station Overhead Line Badge suspended safely near truss at Y = 16.8
  const sign = createLineSign(lineName);
  sign.position.set(-8, 16.8, zOffset);
  scene.add(sign);
  stationLabels?.push(sign);
}

/**
 * Creates the entire factory architecture: walls with gate cutouts,
 * full roof trusses, support columns, high-bay lights, windows, and props.
 */
function createFactoryEnvironment(fanBladesList?: THREE.Object3D[]): THREE.Group {
  const group = new THREE.Group();

  const wallLowerMaterial = new THREE.MeshLambertMaterial({
    color: 0x243447,
    side: THREE.DoubleSide,
  });

  const wallUpperMaterial = new THREE.MeshLambertMaterial({
    color: 0xdbeafe,
    side: THREE.DoubleSide,
  });

  const pillarMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.3,
  });

  const roofMaterial = new THREE.MeshLambertMaterial({
    color: 0x334155,
    side: THREE.DoubleSide,
  });

  const roomWidth = 180;
  const roomDepth = 80;
  const roomHeight = 20;

  // Exterior ground plane (asphalt/paved apron surrounding the factory building)
  const exteriorGround = new THREE.Mesh(
    new THREE.PlaneGeometry(380, 320),
    new THREE.MeshLambertMaterial({ color: 0x475569 })
  );
  exteriorGround.rotation.x = -Math.PI / 2;
  exteriorGround.position.y = -0.05;
  exteriorGround.receiveShadow = true;
  group.add(exteriorGround);

  // 1. Symmetric Floor Safety Markings for Line 1 and Line 2
  const floorMarkings = new THREE.Group();
  const lineYellow = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

  // Boundary lines framing equipment bays
  [-28, -2, 2, 28].forEach((z) => {
    const safetyLine = new THREE.Mesh(new THREE.PlaneGeometry(160, 0.4), lineYellow);
    safetyLine.rotation.x = -Math.PI / 2;
    safetyLine.position.set(-5, 0.012, z);
    floorMarkings.add(safetyLine);
  });

  // Forklift lane markings from Palletizer (X = 50) to Gates (X = 90)
  [-15, 15].forEach((zLine) => {
    [-3.8, 3.8].forEach((dz) => {
      const driveLine = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.3), lineYellow);
      driveLine.rotation.x = -Math.PI / 2;
      driveLine.position.set(70, 0.015, zLine + dz);
      floorMarkings.add(driveLine);
    });
  });

  // Central Floor Drain Grate
  const grateMat = metalMaterial(0x1e293b);
  for (let gx = -70; gx <= 70; gx += 8) {
    const grate = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 0.9), grateMat);
    grate.rotation.x = -Math.PI / 2;
    grate.position.set(gx, 0.016, 0);
    floorMarkings.add(grate);
  }

  // Hazard Striping Along Perimeter Walkways
  const stripeCanvas = document.createElement('canvas');
  stripeCanvas.width = 256;
  stripeCanvas.height = 256;
  const ctx = stripeCanvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#1e293b';
    for (let i = -256; i < 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 128, 256);
      ctx.lineTo(i + 128 + 32, 256);
      ctx.lineTo(i + 32, 0);
      ctx.fill();
    }
  }
  const stripeTex = new THREE.CanvasTexture(stripeCanvas);
  stripeTex.colorSpace = THREE.SRGBColorSpace;
  stripeTex.wrapS = THREE.RepeatWrapping;
  stripeTex.wrapT = THREE.RepeatWrapping;
  stripeTex.repeat.set(24, 1);
  const hazardMat = new THREE.MeshBasicMaterial({ map: stripeTex });

  [-36, 36].forEach((z) => {
    const hazardLine = new THREE.Mesh(new THREE.PlaneGeometry(160, 1.4), hazardMat);
    hazardLine.rotation.x = -Math.PI / 2;
    hazardLine.position.set(-5, 0.014, z);
    floorMarkings.add(hazardLine);
  });
  group.add(floorMarkings);

  // 2. Perimeter Walls
  const createWall = (width: number, x: number, z: number, rotationY: number) => {
    const wall = new THREE.Group();
    const lower = new THREE.Mesh(new THREE.PlaneGeometry(width, 5), wallLowerMaterial);
    lower.position.y = 2.5;
    lower.receiveShadow = true;
    const upper = new THREE.Mesh(new THREE.PlaneGeometry(width, roomHeight - 5), wallUpperMaterial);
    upper.position.y = 5 + (roomHeight - 5) / 2;
    upper.receiveShadow = true;
    wall.add(lower, upper);
    wall.position.set(x, 0, z);
    wall.rotation.y = rotationY;
    return wall;
  };

  // Back Wall (Z = -70) & Front Wall (Z = 70)
  const backWall = createWall(roomWidth, 0, -roomDepth / 2, 0);
  const frontWall = createWall(roomWidth, 0, roomDepth / 2, Math.PI);
  group.add(backWall, frontWall);

  // Left Wall (X = -90)
  const leftWall = createWall(roomDepth, -roomWidth / 2, 0, Math.PI / 2);
  group.add(leftWall);

  // Add Perfectly Aligned Industrial Windows to Left Wall (Counter-side: symmetrical corner and central bays)
  const leftWallBays = [
    { x: -32.5, width: 11 },
    { x: -12.5, width: 15 },
    { x: 12.5, width: 15 },
    { x: 32.5, width: 11 },
  ];
  leftWallBays.forEach((bay) => {
    const win = createIndustrialWindow(bay.width, 3.2);
    win.position.set(bay.x, 11.2, 0.2);
    leftWall.add(win);
  });

  // Add Perfectly Aligned Industrial Windows to Back Wall (Excluding corner structural bays)
  const backWallBays = [
    { x: -60, width: 18 },
    { x: -30, width: 18 },
    { x: 0, width: 18 },
    { x: 30, width: 18 },
    { x: 60, width: 18 },
  ];
  backWallBays.forEach((bay) => {
    const win = createIndustrialWindow(bay.width, 3.2);
    win.position.set(bay.x, 11.2, 0.2);
    backWall.add(win);
  });

  // Add Matching Industrial Windows to Front Wall
  backWallBays.forEach((bay) => {
    const win = createIndustrialWindow(bay.width, 3.2);
    win.position.set(bay.x, 11.2, 0.2);
    frontWall.add(win);
  });

  // Right Wall (X = 90) with PRECISE Gate Openings for Line 1 (Z = -15) and Line 2 (Z = 15)
  // Wall rotated by -Math.PI / 2, so local lx maps to world Z!
  // Gate 1 center at lx = -15 (width 6.0: -18 to -12)
  // Gate 2 center at lx = 15 (width 6.0: 12 to 18)
  const rightWallGroup = new THREE.Group();
  rightWallGroup.position.set(roomWidth / 2, 0, 0);
  rightWallGroup.rotation.y = -Math.PI / 2;

  const segWidth = roomDepth / 2 - 18; // 40 - 18 = 22
  const segCenter = 18 + segWidth / 2; // 29

  // Segment 1: from lx = -40 to -18 (width 22, center -29)
  const seg1 = new THREE.Group();
  const lower1 = new THREE.Mesh(new THREE.PlaneGeometry(segWidth, 5), wallLowerMaterial);
  lower1.position.y = 2.5;
  const upper1 = new THREE.Mesh(new THREE.PlaneGeometry(segWidth, roomHeight - 5), wallUpperMaterial);
  upper1.position.y = 5 + (roomHeight - 5) / 2;
  seg1.add(lower1, upper1);
  seg1.position.set(-segCenter, 0, 0);
  rightWallGroup.add(seg1);

  // Segment 2: between Gate 1 and 2 from lx = -12 to 12 (width 24, center 0)
  const seg2 = new THREE.Group();
  const lower2 = new THREE.Mesh(new THREE.PlaneGeometry(24, 5), wallLowerMaterial);
  lower2.position.y = 2.5;
  const upper2 = new THREE.Mesh(new THREE.PlaneGeometry(24, roomHeight - 5), wallUpperMaterial);
  upper2.position.y = 5 + (roomHeight - 5) / 2;
  seg2.add(lower2, upper2);
  seg2.position.set(0, 0, 0);
  rightWallGroup.add(seg2);

  // Segment 3: from lx = 18 to 40 (width 22, center 29)
  const seg3 = new THREE.Group();
  const lower3 = new THREE.Mesh(new THREE.PlaneGeometry(segWidth, 5), wallLowerMaterial);
  lower3.position.y = 2.5;
  const upper3 = new THREE.Mesh(new THREE.PlaneGeometry(segWidth, roomHeight - 5), wallUpperMaterial);
  upper3.position.y = 5 + (roomHeight - 5) / 2;
  seg3.add(lower3, upper3);
  seg3.position.set(segCenter, 0, 0);
  rightWallGroup.add(seg3);

  // Wall header above Gate 1 (lx = -15, from y = 5.0 to 20, height 15)
  const top1 = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 15), wallUpperMaterial);
  top1.position.set(-15, 12.5, 0);
  rightWallGroup.add(top1);

  // Wall header above Gate 2 (lx = 15, from y = 5.0 to 20, height 15)
  const top2 = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 15), wallUpperMaterial);
  top2.position.set(15, 12.5, 0);
  rightWallGroup.add(top2);

  // 2 Industrial Windows aligned with corner bays on the gate wall (2.0m clearance from columns & corners)
  [-32.5, 32.5].forEach((bayZ) => {
    const win = createIndustrialWindow(11, 3.2);
    win.position.set(bayZ, 11.2, 0.2);
    rightWallGroup.add(win);
  });

  group.add(rightWallGroup);

  // 3. Roof Trusses & Structural Vertical Columns
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.35 });

  for (let z = -25; z <= 25; z += 25) {
    // Top & bottom horizontal truss chords spanning full 180m
    const beamTop = new THREE.Mesh(new THREE.BoxGeometry(180, 0.5, 0.5), trussMat);
    beamTop.position.set(0, 19.5, z);
    const beamBot = new THREE.Mesh(new THREE.BoxGeometry(180, 0.5, 0.5), trussMat);
    beamBot.position.set(0, 18.0, z);
    group.add(beamTop, beamBot);

    // Diagonal zigzag webbing
    for (let i = 0; i < 14; i++) {
      const diag = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.1, 8), trussMat);
      diag.position.set(-84.5 + i * 13, 18.75, z);
      diag.rotation.z = i % 2 === 0 ? Math.PI / 4 : -Math.PI / 4;
      group.add(diag);
    }

    // Heavy vertical structural I-beams at Left Wall (X = -90) and Right Wall (X = 90)
    // Anchored firmly from floor (y = 0) to ceiling (y = 20)
    const colLeft = new THREE.Mesh(new THREE.BoxGeometry(1.2, 20, 1.2), pillarMaterial);
    colLeft.position.set(-89.2, 10, z);
    const colRight = new THREE.Mesh(new THREE.BoxGeometry(1.2, 20, 1.2), pillarMaterial);
    colRight.position.set(89.2, 10, z);
    group.add(colLeft, colRight);
  }

  // Vertical structural columns along Back (Z = -40) and Front (Z = 40)
  for (let px = -75; px <= 75; px += 30) {
    const colBack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 20, 1.2), pillarMaterial);
    colBack.position.set(px, 10, -roomDepth / 2 + 0.8);
    const colFront = new THREE.Mesh(new THREE.BoxGeometry(1.2, 20, 1.2), pillarMaterial);
    colFront.position.set(px, 10, roomDepth / 2 - 0.8);
    group.add(colBack, colFront);
  }

  // 4. Overhead Utilities & Air Ventilation System
  const ventMat = metalMaterial(0x475569);
  const pipeMat = metalMaterial(0x94a3b8);
  const diffMat = metalMaterial(0x64748b);
  const swirlMat = metalMaterial(0x334155);

  [-22, 22].forEach((z) => {
    // Main horizontal HVAC trunk duct spanning 180m
    const hvac = new THREE.Mesh(new THREE.BoxGeometry(180, 0.8, 1.4), ventMat);
    hvac.position.set(0, 19.2, z);
    group.add(hvac);

    // Vertical Spiral Duct Drops & Conical Swirl Air Diffusers
    const dropPositions = [-60, -35, -10, 15, 40, 65];
    dropPositions.forEach((dx) => {
      const dropGroup = new THREE.Group();
      dropGroup.position.set(dx, 0, z);

      // Vertical drop duct from Y = 19.2 down to Y = 16.2 (Height 3.0m)
      const ductHeight = 3.0;
      const ductCenterY = 19.2 - ductHeight / 2;
      const dropDuct = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, ductHeight, 14),
        diffMat
      );
      dropDuct.position.y = ductCenterY;

      // Conical Bellmouth Swirl Diffuser at bottom (Y = 16.0)
      const bellmouth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.7, 0.4, 16),
        diffMat
      );
      bellmouth.position.y = 16.0;

      // Bottom discharge ring
      const dischargeRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.7, 0.05, 16),
        swirlMat
      );
      dischargeRing.position.y = 15.75;

      // Suspension hanger rods connecting to ceiling truss overhead
      const rodL = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.5, 6), pipeMat);
      rodL.position.set(0.28, 18.2, 0);
      const rodR = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.5, 6), pipeMat);
      rodR.position.set(-0.28, 18.2, 0);

      dropGroup.add(dropDuct, bellmouth, dischargeRing, rodL, rodR);
      group.add(dropGroup);
    });
  });

  [-15, 15].forEach((z) => {
    const mainUtilityPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 180, 14), pipeMat);
    mainUtilityPipe.rotation.z = Math.PI / 2;
    mainUtilityPipe.position.set(0, 18.2, z);
    group.add(mainUtilityPipe);

    // Rigid drop pipe descending seamlessly from main header into Filler Bowl at X = -1.6
    const dropPipeHeight = 18.2 - 2.4;
    const dropPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, dropPipeHeight, 12), pipeMat);
    dropPipe.position.set(-1.6, 2.4 + dropPipeHeight / 2, z);
    group.add(dropPipe);
  });

  // 5. Ceiling with Gravity Relief / Turbine Mushroom Vents
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomDepth), roofMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, roomHeight, 0);
  group.add(ceiling);

  const roofVentPositions = [
    [-50, -18], [-50, 18],
    [0, -18], [0, 18],
    [50, -18], [50, 18],
  ];
  roofVentPositions.forEach(([rx, rz]) => {
    const vent = new THREE.Group();
    vent.position.set(rx, 19.8, rz);

    const curb = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.35, 14), metalMaterial(darkSteel));
    curb.position.y = 0.18;
    const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.4, 14), metalMaterial(steel));
    throat.position.y = -0.12;
    const cowl = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.4, 16), metalMaterial(0x475569));
    cowl.position.y = -0.28;
    cowl.rotation.x = Math.PI;
    const louverBand = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.2, 14, 1, true), metalMaterial(darkSteel));
    louverBand.position.y = -0.18;

    vent.add(curb, throat, cowl, louverBand);
    group.add(vent);
  });

  // 6. High-Bay Industrial LED Light Fixtures (Visually luminous fixtures, zero per-pixel pointlight overhead)
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
  const casingMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });

  for (let x = -60; x <= 60; x += 30) {
    for (let z = -20; z <= 20; z += 20) {
      const light = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), casingMat);
      stem.position.y = 18.6;
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.4, 0.45, 14), casingMat);
      shade.position.y = 17.3;
      const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.15, 14), bulbMat);
      bulb.position.y = 17.0;
      light.add(stem, shade, bulb);
      light.position.set(x, 0, z);
      group.add(light);
    }
  }


  // Wall Electrical NEMA Control Panels
  const elecMat = metalMaterial(0x475569);
  const redMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });

  [-60, -20, 20, 60].forEach((wx) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 0.5), elecMat);
    panel.position.set(wx, 5.0, -roomDepth / 2 + 0.4);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), redMat);
    light.position.set(wx, 5.8, -roomDepth / 2 + 0.7);
    group.add(panel, light);
  });

  // 8. High-Capacity Wall-Mounted Industrial Exhaust Fans with Spinning Impellers
  // Back Wall (Y = 15.6, Facing South into factory)
  [-60, -30, 30, 60].forEach((fx) => {
    const fan = createIndustrialExhaustFan(fanBladesList);
    fan.position.set(fx, 15.6, -roomDepth / 2 + 0.4);
    fan.rotation.y = 0;
    group.add(fan);
  });

  // Front Wall (Y = 15.6, Facing North into factory)
  [-60, -30, 30, 60].forEach((fx) => {
    const fan = createIndustrialExhaustFan(fanBladesList);
    fan.position.set(fx, 15.6, roomDepth / 2 - 0.4);
    fan.rotation.y = Math.PI;
    group.add(fan);
  });

  // Left Wall (X = -89.6, Y = 15.6, Facing East into factory)
  [-32.5, 32.5].forEach((fz) => {
    const fan = createIndustrialExhaustFan(fanBladesList);
    fan.position.set(-89.6, 15.6, fz);
    fan.rotation.y = Math.PI / 2;
    group.add(fan);
  });

  // Right Wall (X = 89.6, Y = 15.6, Facing West into factory)
  [-32.5, 32.5].forEach((fz) => {
    const fan = createIndustrialExhaustFan(fanBladesList);
    fan.position.set(89.6, 15.6, fz);
    fan.rotation.y = -Math.PI / 2;
    group.add(fan);
  });

  // 9. Industrial Personnel Doors for People (Man-Doors & Emergency Egress)
  // Right Wall: Dedicated Logistics Pedestrian Doors next to Forklift Gates
  const dockDoor1 = createPersonnelDoor({
    label: 'DOCK 1 PEDESTRIAN',
    roomTag: 'LINE 1 LOGISTICS ACCESS',
    isEmergencyExit: false,
  });
  dockDoor1.position.set(89.7, 0, -3.8);
  dockDoor1.rotation.y = -Math.PI / 2;
  group.add(dockDoor1);

  const dockDoor2 = createPersonnelDoor({
    label: 'DOCK 2 PEDESTRIAN',
    roomTag: 'LINE 2 LOGISTICS ACCESS',
    isEmergencyExit: false,
  });
  dockDoor2.position.set(89.7, 0, 3.8);
  dockDoor2.rotation.y = -Math.PI / 2;
  group.add(dockDoor2);

  // Left Wall: Main Employee Entrance & Laboratory/QA Staff Door
  const mainStaffDoor = createPersonnelDoor({
    label: 'PLANT PERSONNEL',
    roomTag: 'MAIN ENTRANCE & LOCKERS',
    isEmergencyExit: false,
  });
  mainStaffDoor.position.set(-89.7, 0, -12.5);
  mainStaffDoor.rotation.y = Math.PI / 2;
  group.add(mainStaffDoor);

  const qaDoor = createPersonnelDoor({
    label: 'QA LAB & SANITATION',
    roomTag: 'STAFF ACCESS ONLY',
    isEmergencyExit: false,
  });
  qaDoor.position.set(-89.7, 0, 12.5);
  qaDoor.rotation.y = Math.PI / 2;
  group.add(qaDoor);

  // Back Wall: Central High-Visibility Emergency Egress Double Door
  const northExit = createPersonnelDoor({
    label: 'NORTH EMERGENCY EXIT',
    roomTag: 'FIRE EVACUATION ROUTE',
    isEmergencyExit: true,
  });
  northExit.position.set(0, 0, -roomDepth / 2 + 0.3);
  northExit.rotation.y = 0;
  group.add(northExit);

  // Front Wall: Central High-Visibility Emergency Egress Double Door
  const southExit = createPersonnelDoor({
    label: 'SOUTH EMERGENCY EXIT',
    roomTag: 'FIRE EVACUATION ROUTE',
    isEmergencyExit: true,
  });
  southExit.position.set(0, 0, roomDepth / 2 - 0.3);
  southExit.rotation.y = Math.PI;
  group.add(southExit);

  return group;
}

/**
 * Creates the continuous conveyor line with unified elevation:
 * Top of belt surface at Y = 1.0, with floor-anchored support legs, guide rails,
 * and driven stainless idler rollers spinning synchronously with belt movement.
 */
function createConveyorLine(): MachineVisual {
  const group = new THREE.Group();

  // Belt surface: spans X = -66 to 44.5 (Length 110.5, Center at X = -10.75)
  // Stops cleanly before Palletizer / Dispatcher turntable (X = 45.6 to 48.8) with zero overlap!
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(110.5, 0.18, 1.4),
    new THREE.MeshStandardMaterial({ color: beltColor, roughness: 0.65, metalness: 0.4 })
  );
  belt.position.set(-10.75, 0.91, 0);
  belt.receiveShadow = true;
  group.add(belt);

  // Continuous side guide rails
  const railMaterial = metalMaterial(steel);
  [-0.75, 0.75].forEach((z) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(110.5, 0.08, 0.06), railMaterial);
    rail.position.set(-10.75, 1.22, z);
    group.add(rail);
  });

  // Stainless conveyor discharge end-roller cap at X = 44.5
  const endRoller = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 1.42, 16),
    metalMaterial(steel)
  );
  endRoller.rotation.x = Math.PI / 2;
  endRoller.position.set(44.5, 0.91, 0);
  group.add(endRoller);

  // Rotating idler rollers under the belt
  const rollers: THREE.Mesh[] = [];
  for (let x = -65; x <= 43; x += 4.5) {
    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1.35, 10),
      metalMaterial(darkSteel)
    );
    roller.rotation.x = Math.PI / 2;
    roller.position.set(x, 0.86, 0);
    group.add(roller);
    rollers.push(roller);
  }

  // Heavy steel structural legs anchored firmly to the floor (Y = 0)
  const legMat = metalMaterial(0x334155);
  for (let x = -64; x <= 43; x += 9.0) {
    [-0.65, 0.65].forEach((z) => {
      // Vertical post from y=0 to y=0.91
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.91, 8), legMat);
      leg.position.set(x, 0.455, z);
      // Floor mounting base plate
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 8), legMat);
      foot.position.set(x, 0.015, z);
      group.add(leg, foot);
    });
    // Cross brace between pair of legs
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.3), legMat);
    brace.position.set(x, 0.35, 0);
    group.add(brace);
  }

  const update = (_elapsedTime: number, productionSpeed: number, overloadRatio: number) => {
    const rollSpeed = 0.08 * productionSpeed * overloadRatio;
    rollers.forEach((r) => {
      r.rotation.y += rollSpeed;
    });
    endRoller.rotation.y += rollSpeed * 0.67;
  };

  return { group, update };
}

/**
 * High-level empty can depalletizer at infeed (X = -64)
 * Features reciprocating sweeping transfer carriage, scissor lift linkages,
 * and rotating gantry amber warning beacon.
 */
function createEmptyCanDepalletizer(lineTag?: string, stationLabels?: THREE.Group[]): MachineVisual {
  const group = new THREE.Group();
  const frameMat = metalMaterial(darkSteel);

  // 4 Main heavy gantry columns
  [-2.2, 2.2].forEach((dx) => {
    [-1.6, 1.6].forEach((dz) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 6.2, 0.24), frameMat);
      post.position.set(dx, 3.1, dz);
      group.add(post);
    });
  });

  // Top gantry frame
  const topGantry = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.3, 3.4), frameMat);
  topGantry.position.y = 6.2;
  group.add(topGantry);

  // Overhead Amber Warning Strobe Beacon atop Gantry
  const beaconBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.16, 10), metalMaterial(darkSteel));
  beaconBase.position.set(0, 6.42, 0);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.85,
  });
  const beaconLens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 12), beaconMat);
  beaconLens.position.set(0, 6.58, 0);
  group.add(beaconBase, beaconLens);

  // Scissor lift staging table holding tiered empty can pallet
  const liftPlatform = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 2.4), frameMat);
  liftPlatform.position.set(0, 0.85, 0);
  group.add(liftPlatform);

  // Scissor lift X-brace linkages beneath platform
  const scissorMat = metalMaterial(steel);
  [[-1.0, 1.15], [-1.0, -1.15]].forEach(([sx, sz]) => {
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.08), scissorMat);
    s1.position.set(sx, 0.45, sz);
    s1.rotation.z = 0.55;
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.08), scissorMat);
    s2.position.set(sx, 0.45, sz);
    s2.rotation.z = -0.55;
    group.add(s1, s2);
  });

  const pallet = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 1.8), new THREE.MeshStandardMaterial({ color: 0x8a552a }));
  pallet.position.set(0, 1.04, 0);
  group.add(pallet);

  // Stacked can layers waiting to be swept onto belt
  for (let l = 0; l < 4; l++) {
    const canBlock = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.3, 1.6),
      metalMaterial(steel)
    );
    canBlock.position.set(0, 1.28 + l * 0.32, 0);
    group.add(canBlock);
  }

  // Overhead Carriage & Sweeping Transfer Bridge
  const carriageGroup = new THREE.Group();
  carriageGroup.position.set(-0.7, 1.5, 0);

  // Overhead guide rails
  const guideRail1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.08), metalMaterial(steel));
  guideRail1.position.set(0.2, 2.8, -0.85);
  const guideRail2 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.08), metalMaterial(steel));
  guideRail2.position.set(0.2, 2.8, 0.85);
  group.add(guideRail1, guideRail2);

  // Sweeper crossbar slider
  const slider = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 2.0), metalMaterial(darkSteel));
  slider.position.y = 1.3;
  carriageGroup.add(slider);

  // Vertical drop arms
  [-0.85, 0.85].forEach((dz) => {
    const dropArm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), metalMaterial(steel));
    dropArm.position.set(0, 0.6, dz);
    carriageGroup.add(dropArm);
  });

  // Sweeper pusher blade at bottom
  const sweepBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.4, 1.8),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.6 })
  );
  sweepBlade.position.set(0, -0.05, 0);
  carriageGroup.add(sweepBlade);
  group.add(carriageGroup);

  const label = createStationLabel(`${lineTag ? lineTag + ' • ' : ''}00 | EMPTY-CAN INFEED`, 'AUTOMATIC HIGH-LEVEL DEPALLETIZER', 4.8);
  label.position.set(0, 6.8, 0);
  group.add(label);
  stationLabels?.push(label);

  const update = (elapsedTime: number, productionSpeed: number, overloadRatio: number) => {
    const speed = productionSpeed * overloadRatio;
    const cycle = (elapsedTime * 0.3 * speed) % 1.0;
    let cx = -0.7;
    let cy = 1.5;
    if (cycle < 0.6) {
      const p = cycle / 0.6;
      cx = -0.7 + p * 1.8;
      cy = 1.5;
    } else if (cycle < 0.72) {
      cx = 1.1;
      cy = 1.5 + ((cycle - 0.6) / 0.12) * 0.35;
    } else {
      const p = (cycle - 0.72) / 0.28;
      cx = 1.1 - p * 1.8;
      cy = 1.85 - p * 0.35;
    }
    carriageGroup.position.set(cx, cy, 0);

    beaconLens.rotation.y += 0.12 * speed;
    beaconMat.emissiveIntensity = 0.5 + Math.abs(Math.sin(elapsedTime * 7 * speed)) * 1.3;
  };

  const reset = () => {
    carriageGroup.position.set(-0.7, 1.5, 0);
    beaconMat.emissiveIntensity = 0.4;
  };

  return { group, update, reset };
}

/**
 * Enclosed air rinse tunnel & optical inspection (X = -40)
 * Features rotating inversion gripper wheel, pulsed ionized air nozzles,
 * and high-speed optical laser scan curtain.
 */
function createRinserAndEmptyCanInspector(lineTag?: string, stationLabels?: THREE.Group[]): MachineVisual {
  const group = new THREE.Group();

  // Stainless & polycarbonate wash enclosure straddling the conveyor at Y = 1.0
  const enclosure = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 1.6, 1.8),
    new THREE.MeshLambertMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.22 })
  );
  enclosure.position.set(0, 1.7, 0);

  const ssFrame = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.1, 1.85), metalMaterial(darkSteel));
  ssFrame.position.set(0, 2.5, 0);
  group.add(enclosure, ssFrame);

  // Rotary Inversion Cage (simulates circular can turnover for air cleaning)
  const inversionGroup = new THREE.Group();
  inversionGroup.position.set(0, 1.65, 0);

  const ringMat = metalMaterial(steel);
  [-0.6, 0.6].forEach((rx) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 8, 20), ringMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = rx;
    inversionGroup.add(ring);
  });

  // Gripper crossbars holding can fixtures inside
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), ringMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, Math.sin(angle) * 0.5, Math.cos(angle) * 0.5);
    inversionGroup.add(bar);
  }
  group.add(inversionGroup);

  // Ionized Air Wash Nozzles
  const nozzleMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
  });
  const nozzleGroup = new THREE.Group();
  [-0.4, 0, 0.4].forEach((nx) => {
    const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 8), nozzleMat);
    nozzle.position.set(nx, 2.2, 0);
    nozzle.rotation.x = Math.PI;
    nozzleGroup.add(nozzle);
  });
  group.add(nozzleGroup);

  // Vision inspection camera module at exit
  const cameraHousing = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.5), metalMaterial(darkSteel));
  cameraHousing.position.set(1.5, 2.2, 0);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
  lens.rotation.x = Math.PI / 2;
  lens.position.set(1.5, 1.99, 0);
  group.add(cameraHousing, lens);

  // Optical laser inspection curtain
  const laserMat = new THREE.MeshBasicMaterial({
    color: 0x00f5ff,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });
  const laserBeam = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.7), laserMat);
  laserBeam.position.set(1.5, 1.6, 0);
  group.add(laserBeam);

  const label = createStationLabel(`${lineTag ? lineTag + ' • ' : ''}00A | RINSE + INSPECT`, 'IONIZED AIR RINSER & VISION CHECK', 4.6);
  label.position.set(0, 3.4, 0);
  group.add(label);
  stationLabels?.push(label);

  const update = (elapsedTime: number, productionSpeed: number, overloadRatio: number) => {
    const speed = productionSpeed * overloadRatio;
    inversionGroup.rotation.x += 0.05 * speed;

    nozzleMat.emissiveIntensity = 0.4 + Math.sin(elapsedTime * 14 * speed) * 0.5;
    laserMat.opacity = 0.35 + Math.sin(elapsedTime * 22 * speed) * 0.35;
  };

  const reset = () => {
    inversionGroup.rotation.x = 0;
    nozzleMat.emissiveIntensity = 0.4;
    laserMat.opacity = 0.35;
  };

  return { group, update, reset };
}

/**
 * Connected Sanitary Stainless Piping network:
 * Blending Tank (X = -30) -> Pump -> Carbonator (X = -18) -> Filler Bowl (X = -1.6)
 */
function createSanitaryPiping(mixingZ: number, lineZ: number): THREE.Group {
  const group = new THREE.Group();
  const pipeMat = metalMaterial(0x94a3b8);
  const productMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.3,
  });

  // 1. Pipe: Mixing tank outlet (-30) to Carbonator inlet (-18) at mixingZ
  const skidCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-30, 0.8, mixingZ),
    new THREE.Vector3(-25, 0.8, mixingZ),
    new THREE.Vector3(-20, 1.2, mixingZ),
    new THREE.Vector3(-18, 1.6, mixingZ),
  ]);
  const skidPipe = new THREE.Mesh(new THREE.TubeGeometry(skidCurve, 20, 0.12, 10), pipeMat);
  group.add(skidPipe);

  // 2. Insulated Feed Pipe: Carbonator outlet (-18, mixingZ) to Filler intake (-1.6, lineZ)
  const feedCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-18, 2.2, mixingZ),
    new THREE.Vector3(-14, 2.2, mixingZ),
    new THREE.Vector3(-8, 2.2, lineZ - (lineZ < 0 ? 1.5 : -1.5)),
    new THREE.Vector3(-1.6, 2.4, lineZ),
  ]);
  const feedPipe = new THREE.Mesh(new THREE.TubeGeometry(feedCurve, 32, 0.14, 10), pipeMat);
  const productCore = new THREE.Mesh(new THREE.TubeGeometry(feedCurve, 32, 0.08, 8), productMat);
  group.add(feedPipe, productCore);

  return group;
}

/**
 * Syrup Blending Tank (Station 01 at X = -30)
 * Features spinning motor fan cowl, internal hydrofoil agitators,
 * dynamic liquid sight-glass column, and vibrating centrifugal pump coupling/gauge.
 */
function createBlendingTank(lineTag?: string, stationLabels?: THREE.Group[]): MachineVisual {
  const group = new THREE.Group();
  const indicator = statusMaterial();
  const movingParts: THREE.Object3D[] = [];

  // Concrete equipment pad
  const pad = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.2, 4.4), metalMaterial(0x334155));
  pad.position.y = 0.1;
  group.add(pad);

  // Vertical Stainless Tank
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.2, 28), metalMaterial(steel));
  tank.position.y = 2.4;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), metalMaterial(steel));
  dome.position.y = 4.0;
  group.add(tank, dome);

  // 4 Support legs
  [-1.2, 1.2].forEach((dx) => {
    [-1.2, 1.2].forEach((dz) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2), metalMaterial(darkSteel));
      leg.position.set(dx, 0.7, dz);
      group.add(leg);
    });
  });

  // Top Agitator Motor with spinning external cooling fan cowl
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 16), metalMaterial(darkSteel));
  motor.position.y = 5.0;
  group.add(motor);

  const motorFan = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 8), metalMaterial(steel));
  motorFan.position.y = 5.46;
  group.add(motorFan);

  // Internal spinning agitator shaft with dual-tier impellers
  const agitator = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.0), metalMaterial(darkSteel));
  shaft.position.y = 2.8;
  const bladeLower = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.25), metalMaterial(steel));
  bladeLower.position.y = 1.8;
  const bladeUpper = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.25), metalMaterial(steel));
  bladeUpper.position.y = 3.0;
  bladeUpper.rotation.y = Math.PI / 2;
  agitator.add(shaft, bladeLower, bladeUpper);
  group.add(agitator);
  movingParts.push(agitator);

  // Fluid Level Sight Glass on tank exterior
  const sightTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 2.0, 10),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0.1 })
  );
  sightTube.position.set(1.65, 2.4, 0);
  const fluidColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 1.8, 10),
    new THREE.MeshStandardMaterial({ color: 0x991b1b, emissive: 0x7f1d1d, emissiveIntensity: 0.4 })
  );
  fluidColumn.position.set(1.65, 2.3, 0);
  group.add(sightTube, fluidColumn);

  // Skid centrifugal pump with visible rotating drive shaft coupling
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.6, 16), metalMaterial(darkSteel));
  pump.rotation.z = Math.PI / 2;
  pump.position.set(1.8, 0.5, 0);
  const pumpCoupling = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.25, 8), metalMaterial(steel));
  pumpCoupling.rotation.z = Math.PI / 2;
  pumpCoupling.position.set(1.3, 0.5, 0);
  group.add(pump, pumpCoupling);

  // Pressure gauge on pump discharge
  const pGauge = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 14), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
  pGauge.rotation.x = Math.PI / 2;
  pGauge.position.set(2.0, 1.2, 0.4);
  const pNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.12, 0.02), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
  pNeedle.position.set(2.0, 1.2, 0.44);
  group.add(pGauge, pNeedle);

  // Control console
  const control = createControlPanel(indicator);
  control.position.set(2.0, 1.2, 1.5);
  group.add(control);

  const label = createStationLabel(`${lineTag ? lineTag + ' • ' : ''}01 | SYRUP BLENDING`, 'BATCH PROCESS SKID | 4,000 L', 4.6);
  label.position.set(0, 5.8, 0);
  group.add(label);
  stationLabels?.push(label);

  const update = (elapsedTime: number, productionSpeed: number, overloadRatio: number) => {
    const speed = productionSpeed * overloadRatio;
    agitator.rotation.y += 0.055 * speed;
    motorFan.rotation.y += 0.28 * speed;
    pumpCoupling.rotation.x += 0.22 * speed;

    // Fluid height fluctuation & micro pump vibration
    fluidColumn.scale.y = 0.85 + Math.sin(elapsedTime * 1.5 * speed) * 0.12;
    pNeedle.rotation.z = -0.5 + Math.sin(elapsedTime * 6 * speed) * 0.09 + Math.sin(elapsedTime * 19) * 0.03;
  };

  const reset = () => {
    fluidColumn.scale.y = 0.85;
    pNeedle.rotation.z = -0.5;
  };

  return { group, movingParts, indicator, update, reset };
}

/**
 * Carbonator Pressure Vessel (Station 02 at X = -18)
 * Features duplex reciprocating metering pump pistons in counter-phase,
 * spinning drive flywheel, and dual synchronized vibrating pressure gauges.
 */
function createCarbonator(lineTag?: string, stationLabels?: THREE.Group[]): MachineVisual {
  const group = new THREE.Group();
  const indicator = statusMaterial();
  const movingParts: THREE.Object3D[] = [];

  const pad = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.2, 3.8), metalMaterial(0x334155));
  pad.position.y = 0.1;
  group.add(pad);

  // Horizontal cylindrical pressure vessel
  const vessel = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 3.4, 24), metalMaterial(steel));
  vessel.rotation.z = Math.PI / 2;
  vessel.position.y = 1.8;
  [-1.7, 1.7].forEach((x) => {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1.0, 20, 12), metalMaterial(steel));
    cap.scale.x = 0.4;
    cap.position.set(x, 1.8, 0);
    group.add(cap);
  });
  group.add(vessel);

  // Support saddles
  [-1.0, 1.0].forEach((x) => {
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 2.2), metalMaterial(darkSteel));
    saddle.position.set(x, 0.5, 0);
    group.add(saddle);
  });

  // Duplex Reciprocating Dosing Pump with Dual Counter-Phase Pistons
  const pumpBlock = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.4), metalMaterial(darkSteel));
  pumpBlock.position.set(0, 0.45, 1.3);
  group.add(pumpBlock);

  const pistonMat = metalMaterial(steel);
  const piston1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 12), pistonMat);
  piston1.rotation.z = Math.PI / 2;
  piston1.position.set(0.5, 0.52, 1.05);

  const piston2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 12), pistonMat);
  piston2.rotation.z = Math.PI / 2;
  piston2.position.set(0.5, 0.52, 1.55);

  const crankFlywheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 14), metalMaterial(darkSteel));
  crankFlywheel.position.set(0.85, 0.52, 1.3);
  group.add(piston1, piston2, crankFlywheel);

  // Dual Pressure Dial Gauges (Vessel Saturation & CO2 Supply)
  const gaugeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
  const needleMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  const gauge1 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16), gaugeMat);
  gauge1.rotation.x = Math.PI / 2;
  gauge1.position.set(1.1, 2.6, 0.9);
  const needle1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.02), needleMat);
  needle1.position.set(1.1, 2.6, 0.95);

  const gauge2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16), gaugeMat);
  gauge2.rotation.x = Math.PI / 2;
  gauge2.position.set(0.4, 2.6, 0.9);
  const needle2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.02), needleMat);
  needle2.position.set(0.4, 2.6, 0.95);

  group.add(gauge1, needle1, gauge2, needle2);
  movingParts.push(needle1);

  // Blue CO2 gas bottle rack
  [-0.6, 0, 0.6].forEach((dz) => {
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.8, 14), new THREE.MeshStandardMaterial({ color: 0x2563eb }));
    cylinder.position.set(-1.8, 1.0, dz);
    group.add(cylinder);
  });

  const control = createControlPanel(indicator);
  control.position.set(1.8, 1.2, 1.2);
  group.add(control);

  const label = createStationLabel(`${lineTag ? lineTag + ' • ' : ''}02 | CARBONATION`, 'IN-LINE CARBONATOR | 4.2 VOL CO2', 4.6);
  label.position.set(0, 4.4, 0);
  group.add(label);
  stationLabels?.push(label);

  const update = (elapsedTime: number, productionSpeed: number, overloadRatio: number) => {
    const speed = productionSpeed * overloadRatio;
    const stroke = Math.sin(elapsedTime * 6.5 * speed);

    // Alternating counter-phase piston stroke
    piston1.position.x = 0.5 + stroke * 0.12;
    piston2.position.x = 0.5 - stroke * 0.12;
    crankFlywheel.rotation.x += 0.12 * speed;

    // Dual needle oscillations with realistic flutter
    needle1.rotation.z = -0.5 + stroke * 0.14 + (Math.sin(elapsedTime * 17) * 0.02);
    needle2.rotation.z = -0.7 + (Math.sin(elapsedTime * 9) + Math.cos(elapsedTime * 21)) * 0.035;
  };

  const reset = () => {
    piston1.position.x = 0.5;
    piston2.position.x = 0.5;
    needle1.rotation.z = -0.5;
    needle2.rotation.z = -0.7;
  };

  return { group, movingParts, indicator, update, reset };
}

/**
 * Rotary Counter-Pressure Filler (Station 03 at X = -1.6)
 * Features rotating central bowl, counter-rotating infeed & outfeed starwheels,
 * and 12 cam-actuated vertical filling valve heads.
 */
function createFiller(streams: THREE.Mesh[], lineTag?: string, stationLabels?: THREE.Group[]): MachineVisual {
  const group = new THREE.Group();
  const indicator = statusMaterial();
  const movingParts: THREE.Object3D[] = [];

  // Heavy floor-anchored cylindrical base (up to y = 0.85)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.85, 32), metalMaterial(darkSteel));
  base.position.y = 0.425;
  group.add(base);

  // Polycarbonate protective wrap
  const guard = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 2.2, 32, 1, true),
    new THREE.MeshPhysicalMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.14, roughness: 0.05 })
  );
  guard.position.y = 1.9;
  group.add(guard);

  // Central Rotary Carousel
  const carousel = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.55, 32), metalMaterial(steel));
  bowl.position.y = 2.15;
  carousel.add(bowl);

  // Infeed and Outfeed Starwheels with pocket notches
  const starMat = metalMaterial(darkSteel);
  const infeedStar = new THREE.Group();
  infeedStar.position.set(-1.85, 1.05, 0.95);
  const infeedDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 16), starMat);
  infeedStar.add(infeedDisc);
  group.add(infeedStar);

  const outfeedStar = new THREE.Group();
  outfeedStar.position.set(1.85, 1.05, 0.95);
  const outfeedDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 16), starMat);
  outfeedStar.add(outfeedDisc);
  group.add(outfeedStar);

  // 12 Cam-Actuated Filling Valves
  const valveMeshes: THREE.Group[] = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const nx = Math.cos(angle) * 1.6;
    const nz = Math.sin(angle) * 1.6;

    const valveGroup = new THREE.Group();
    valveGroup.position.set(nx, 1.7, nz);

    const valveBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 10), metalMaterial(darkSteel));
    const nozzleTip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 10), metalMaterial(steel));
    nozzleTip.position.y = -0.32;
    nozzleTip.rotation.x = Math.PI;
    valveGroup.add(valveBody, nozzleTip);
    carousel.add(valveGroup);
    valveMeshes.push(valveGroup);

    if (i % 3 === 0) {
      const stream = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.28, 8),
        new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.8 })
      );
      stream.position.set(0, -0.46, 0);
      stream.visible = false;
      valveGroup.add(stream);
      streams.push(stream);
    }
  }
  group.add(carousel);
  movingParts.push(carousel);

  const control = createControlPanel(indicator);
  control.position.set(2.8, 1.2, 1.4);
  group.add(control);

  const label = createStationLabel(`${lineTag ? lineTag + ' • ' : ''}03 | COUNTER-PRESSURE FILLER`, '12-VALVE ROTARY TURRET | 6,000 CPH', 4.8);
  label.position.set(0, 4.2, 0);
  group.add(label);
  stationLabels?.push(label);

  const update = (_elapsedTime: number, productionSpeed: number, overloadRatio: number) => {
    const speed = productionSpeed * overloadRatio;
    const rotSpeed = 0.038 * speed;
    carousel.rotation.y += rotSpeed;
    infeedStar.rotation.y += rotSpeed * 2.2;
    outfeedStar.rotation.y -= rotSpeed * 2.2;

    // 12-Valve Cam-Track vertical motion:
    // Valve enters filling zone (lowers onto can), fills, then lifts for starwheel transfer
    valveMeshes.forEach((vg, idx) => {
      const currentAngle = (carousel.rotation.y + (idx / 12) * Math.PI * 2) % (Math.PI * 2);
      const a = (currentAngle + Math.PI * 2) % (Math.PI * 2);
      let targetY = 1.7; // default elevated
      if (a > 0.35 * Math.PI && a < 1.45 * Math.PI) {
        targetY = 1.48; // Lowered onto can
      }
      vg.position.y = THREE.MathUtils.lerp(vg.position.y, targetY, 0.15);
    });
  };

  const reset = () => {
    valveMeshes.forEach((vg) => {
      vg.position.y = 1.7;
    });
  };

  return { group, movingParts, indicator, update, reset };
}

/**
 * Rotary Can Seamer (Station 04 at X = 10.8)
 */
/**
 * Rotary Can Seamer (Station 04 at X = 10.8)
 * Features revolving turret, 8 vertical chuck lifters raising cans during seaming arc,
 * dual-operation seaming cam rocker arms, and reciprocating pneumatic lid shuttle.
 */
function createSeamer(lineTag?: string, stationLabels?: THREE.Group[]): MachineVisual {
  const group = new THREE.Group();
  const indicator = statusMaterial();
  const movingParts: THREE.Object3D[] = [];

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.85, 2.6), metalMaterial(darkSteel));
  base.position.y = 0.425;
  group.add(base);

  // Vertical support pillar
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.0), metalMaterial(darkSteel));
  pillar.position.set(-0.8, 1.5, 0);
  group.add(pillar);

  // Rotary Seaming Turret (seaming rolls at Y = 1.45)
  const turret = new THREE.Group();
  const head = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.3, 24), metalMaterial(steel));
  head.position.y = 1.95;
  turret.add(head);

  // 8 Rotary Seaming Chuck Spindles with Cam Lifters
  const lifterPedestals: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const seamerRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 10), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    seamerRoll.position.set(Math.cos(angle) * 0.9, 1.65, Math.sin(angle) * 0.9);
    turret.add(seamerRoll);

    // Lifter pedestal beneath chuck
    const lifter = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12), metalMaterial(steel));
    lifter.position.set(Math.cos(angle) * 0.9, 1.15, Math.sin(angle) * 0.9);
    turret.add(lifter);
    lifterPedestals.push(lifter);
  }
  group.add(turret);
  movingParts.push(turret);

  // Dual-Operation Seaming Cam Rocker Arms
  const rocker1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.12), metalMaterial(steel));
  rocker1.position.set(0.35, 1.7, 0.7);
  const rocker2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.12), metalMaterial(steel));
  rocker2.position.set(-0.35, 1.7, 0.7);
  group.add(rocker1, rocker2);

  // Lid feed magazine hopper
  const lidMagazine = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.6, 16), metalMaterial(steel));
  lidMagazine.position.set(0.9, 2.2, -0.6);
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.6), metalMaterial(steel));
  chute.rotation.x = Math.PI / 4;
  chute.position.set(0.9, 1.6, -0.2);

  // Pneumatic Lid Separator Shuttle
  const lidShuttle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.28), metalMaterial(0x38bdf8));
  lidShuttle.position.set(0.9, 1.35, -0.2);
  group.add(lidMagazine, chute, lidShuttle);

  const control = createControlPanel(indicator);
  control.position.set(1.5, 1.2, 1.2);
  group.add(control);

  const label = createStationLabel(`${lineTag ? lineTag + ' • ' : ''}04 | CAN SEAMER`, '8-HEAD ROTARY DOUBLE SEAMER', 4.6);
  label.position.set(0, 4.0, 0);
  group.add(label);
  stationLabels?.push(label);

  const update = (elapsedTime: number, productionSpeed: number, overloadRatio: number) => {
    const speed = productionSpeed * overloadRatio;
    turret.rotation.y += 0.045 * speed;

    // Rocker arms pivoting inward on cam followers
    rocker1.rotation.y = Math.sin(elapsedTime * 12 * speed) * 0.22;
    rocker2.rotation.y = Math.cos(elapsedTime * 12 * speed) * 0.22;

    // Lifter cam: lifters raise cans as they pass the seaming zone
    lifterPedestals.forEach((lp, idx) => {
      const a = ((turret.rotation.y + (idx / 8) * Math.PI * 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const isSeaming = a > 0.4 * Math.PI && a < 1.3 * Math.PI;
      lp.position.y = THREE.MathUtils.lerp(lp.position.y, isSeaming ? 1.22 : 1.15, 0.18);
    });

    // Lid shuttle indexing
    lidShuttle.position.x = 0.9 + Math.sin(elapsedTime * 5.5 * speed) * 0.09;
  };

  const reset = () => {
    lifterPedestals.forEach(lp => lp.position.y = 1.15);
    rocker1.rotation.y = 0;
    rocker2.rotation.y = 0;
    lidShuttle.position.x = 0.9;
  };

  return { group, movingParts, indicator, update, reset };
}

/**
 * Full Can QA Inspection (Station 05 at X = 20)
 * Features pulsing emerald laser scan curtain, pneumatic reject kicker cylinder,
 * and dynamic verification strobe LED.
 */
function createFullCanInspection(lineTag?: string, stationLabels?: THREE.Group[]): MachineVisual {
  const group = new THREE.Group();

  // Portal inspection arch
  const archL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.8, 0.16), metalMaterial(darkSteel));
  archL.position.set(0, 1.7, -0.85);
  const archR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.8, 0.16), metalMaterial(darkSteel));
  archR.position.set(0, 1.7, 0.85);
  const archTop = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 1.8), metalMaterial(darkSteel));
  archTop.position.set(0, 2.5, 0);
  group.add(archL, archR, archTop);

  // Optical fill-level sensor head
  const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.2), metalMaterial(steel));
  sensor.position.set(0, 2.1, 0);
  group.add(sensor);

  // Pulsing Emerald Green Laser Scan Curtain across can lids
  const laserMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });
  const laserCurtain = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.65), laserMat);
  laserCurtain.position.set(0, 1.75, 0);
  group.add(laserCurtain);

  // High-visibility verification pass/status strobe LED
  const passLedMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 0.8,
  });
  const passLed = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), passLedMat);
  passLed.position.set(0, 2.65, 0);
  group.add(passLed);

  // Pneumatic Reject Ram & Red Bin
  const rejectTable = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.8), metalMaterial(darkSteel));
  rejectTable.position.set(0.6, 0.92, 1.15);
  const rejectBin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.7), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
  rejectBin.position.set(0.6, 0.55, 1.15);
  group.add(rejectTable, rejectBin);

  // Articulated Pneumatic Reject Piston Ram
  const cylinderBody = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 10), metalMaterial(darkSteel));
  cylinderBody.rotation.x = Math.PI / 2;
  cylinderBody.position.set(0.6, 1.18, 0.75);
  const rejectRam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.06), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
  rejectRam.position.set(0.6, 1.18, 0.62);
  group.add(cylinderBody, rejectRam);

  const label = createStationLabel(`${lineTag ? lineTag + ' • ' : ''}05 | FULL-CAN QA`, 'FILL-LEVEL & SEAM INTEGRITY CHECK', 4.5);
  label.position.set(0, 3.4, 0);
  group.add(label);
  stationLabels?.push(label);

  const update = (elapsedTime: number, productionSpeed: number, overloadRatio: number) => {
    const speed = productionSpeed * overloadRatio;

    // Laser scan beam pulse
    laserMat.opacity = 0.35 + Math.sin(elapsedTime * 20 * speed) * 0.35;
    passLedMat.emissiveIntensity = 0.6 + Math.abs(Math.sin(elapsedTime * 9 * speed)) * 1.5;

    // Periodic pneumatic kicker test pulse
    const phase = (elapsedTime * 0.12 * speed) % 1.0;
    const kick = phase > 0.93 ? Math.sin((phase - 0.93) / 0.07 * Math.PI) * 0.35 : 0;
    rejectRam.position.z = 0.62 + kick;
  };

  const reset = () => {
    laserMat.opacity = 0.35;
    rejectRam.position.z = 0.62;
    passLedMat.emissiveIntensity = 0.6;
  };

  return { group, update, reset };
}

/**
 * Case Packer (Station 06 at X = 29)
 * Features articulated vacuum carton erector 2-bar linkage,
 * quick-return 24-can grouping pusher ram, and flap compression rollers.
 */
function createCasePacker(lineTag?: string, stationLabels?: THREE.Group[]): MachineVisual {
  const group = new THREE.Group();
  const indicator = statusMaterial();
  const movingParts: THREE.Object3D[] = [];
  const frameMat = metalMaterial(darkSteel);

  // 4 Structural Columns
  [-1.6, 1.6].forEach((dx) => {
    [-1.1, 1.1].forEach((dz) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.6, 0.18), frameMat);
      col.position.set(dx, 1.8, dz);
      group.add(col);
    });
  });

  const topHeader = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 2.4), frameMat);
  topHeader.position.y = 3.6;
  group.add(topHeader);

  // Flat carton blank magazine
  const cartonMag = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 1.2), new THREE.MeshStandardMaterial({ color: 0xb96d2d }));
  cartonMag.position.set(-0.8, 2.2, 1.3);
  group.add(cartonMag);

  // Articulated Vacuum Carton Erector Arm
  const erectorGroup = new THREE.Group();
  erectorGroup.position.set(-0.8, 2.2, 0.65);

  const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), metalMaterial(steel));
  upperArm.position.y = -0.4;
  erectorGroup.add(upperArm);

  const suctionBar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.6), metalMaterial(0x38bdf8));
  suctionBar.position.set(0, -0.8, 0);
  erectorGroup.add(suctionBar);
  group.add(erectorGroup);

  // Quick-Return 24-Can Grouping Pusher Ram on linear guide rails
  const railMat = metalMaterial(steel);
  const pusherRail1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8), railMat);
  pusherRail1.rotation.z = Math.PI / 2;
  pusherRail1.position.set(0.6, 1.55, -0.4);
  const pusherRail2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8), railMat);
  pusherRail2.rotation.z = Math.PI / 2;
  pusherRail2.position.set(0.6, 1.55, 0.4);
  group.add(pusherRail1, pusherRail2);

  const pusher = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 1.1), metalMaterial(0xf59e0b));
  pusher.position.set(0.2, 1.25, 0);
  group.add(pusher);
  movingParts.push(pusher);

  // Side Flap Compression Rollers
  const rollerMat = metalMaterial(darkSteel);
  const flapRollerL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 12), rollerMat);
  flapRollerL.position.set(1.4, 1.2, 0.65);
  const flapRollerR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 12), rollerMat);
  flapRollerR.position.set(1.4, 1.2, -0.65);
  group.add(flapRollerL, flapRollerR);

  const control = createControlPanel(indicator);
  control.position.set(1.8, 1.2, 1.3);
  group.add(control);

  const label = createStationLabel(`${lineTag ? lineTag + ' • ' : ''}06 | CASE PACKER`, '24-CAN TRAY ERECTOR & PACKER', 4.6);
  label.position.set(0, 4.4, 0);
  group.add(label);
  stationLabels?.push(label);

  const update = (elapsedTime: number, productionSpeed: number, overloadRatio: number) => {
    const speed = productionSpeed * overloadRatio;

    // Quick-return pusher ram stroke
    const cycle = (elapsedTime * 0.45 * speed) % 1.0;
    let px = 0.1;
    if (cycle < 0.65) {
      const p = cycle / 0.65;
      px = 0.1 + (1 - Math.cos(p * Math.PI)) * 0.5 * 0.95;
    } else {
      const p = (cycle - 0.65) / 0.35;
      px = 1.05 - p * 0.95;
    }
    pusher.position.x = px;

    // Carton Erector linkage swinging to feed next box
    const erectorAngle = Math.sin(cycle * Math.PI * 2) * 0.48;
    erectorGroup.rotation.z = erectorAngle;
    suctionBar.rotation.z = -erectorAngle * 0.8;

    // Flap rollers spinning
    flapRollerL.rotation.y += 0.08 * speed;
    flapRollerR.rotation.y -= 0.08 * speed;
  };

  const reset = () => {
    pusher.position.x = 0.1;
    erectorGroup.rotation.z = 0;
    suctionBar.rotation.z = 0;
  };

  return { group, movingParts, indicator, update, reset };
}

/**
 * Palletizer & Dispatch Bay (Station 07 at X = 46)
 * Features 4-axis articulated palletizing robot with vacuum matrix gripper,
 * rotating stretch-wrapper turntable, and ascending film carriage.
 */
function createPalletizer(lineTag?: string, stationLabels?: THREE.Group[]): MachineVisual {
  const group = new THREE.Group();
  const frameMat = metalMaterial(darkSteel);

  // Heavy Palletizer Gantry Mast
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.6, 0.4), frameMat);
  mast.position.set(-1.4, 2.3, 1.4);
  group.add(mast);

  // Articulated 4-Axis Robot Turret & Arm Assembly
  const robotTurret = new THREE.Group();
  robotTurret.position.set(-1.4, 4.0, 1.4);

  const shoulderHub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16), metalMaterial(steel));
  robotTurret.add(shoulderHub);

  // Horizontal primary boom arm
  const boomArm = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.28, 0.28), metalMaterial(steel));
  boomArm.position.set(1.3, 0, 0);
  robotTurret.add(boomArm);

  // Vertical telescopic hoist carriage & gripper
  const hoistCarriage = new THREE.Group();
  hoistCarriage.position.set(2.4, 0, 0);

  const verticalStem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 12), metalMaterial(steel));
  verticalStem.position.y = -1.1;
  hoistCarriage.add(verticalStem);

  const matrixGripper = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.16, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.3 })
  );
  matrixGripper.position.y = -2.2;

  // 6 Vacuum suction cups on gripper underside
  [-0.45, 0, 0.45].forEach((gx) => {
    [-0.35, 0.35].forEach((gz) => {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.12, 10), metalMaterial(darkSteel));
      cup.position.set(gx, -2.32, gz);
      hoistCarriage.add(cup);
    });
  });
  hoistCarriage.add(matrixGripper);
  robotTurret.add(hoistCarriage);
  group.add(robotTurret);

  // Finished pallet staging table
  const pallet = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 1.6), new THREE.MeshStandardMaterial({ color: 0x8a552a }));
  pallet.position.set(1.2, 0.1, 0);
  group.add(pallet);

  // Stack of packed cases on pallet
  for (let layer = 0; layer < 3; layer++) {
    const layerCases = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.32, 1.4),
      new THREE.MeshStandardMaterial({ color: 0xb96d2d, roughness: 0.8 })
    );
    layerCases.position.set(1.2, 0.35 + layer * 0.34, 0);
    group.add(layerCases);
  }

  // Motorized stretch-wrap turntable
  const turntable = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.1, 24), metalMaterial(darkSteel));
  turntable.position.set(1.2, 0.05, 0);
  group.add(turntable);

  // Vertical Stretch-Wrap Mast & Orbital Film Roll Carriage
  const wrapMast = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.6, 0.15), metalMaterial(darkSteel));
  wrapMast.position.set(2.6, 1.3, 1.2);
  const filmCarriage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.38, 14),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.85 })
  );
  filmCarriage.position.set(2.6, 0.6, 1.2);
  group.add(wrapMast, filmCarriage);

  const label = createStationLabel(`${lineTag ? lineTag + ' • ' : ''}07 | PALLETIZE + DISPATCH`, 'AUTOMATIC ROBOTIC CELL', 4.6);
  label.position.set(0, 5.2, 0);
  group.add(label);
  stationLabels?.push(label);

  const update = (elapsedTime: number, productionSpeed: number, overloadRatio: number) => {
    const speed = productionSpeed * overloadRatio;

    // Robotic Pick-and-Place Trajectory
    const robotCycle = (elapsedTime * 0.25 * speed) % 1.0;
    let turretAngle = -0.4;
    let hoistY = 0;

    if (robotCycle < 0.25) {
      turretAngle = -0.45;
      const p = robotCycle / 0.25;
      hoistY = -Math.sin(p * Math.PI) * 0.45;
    } else if (robotCycle < 0.5) {
      const p = (robotCycle - 0.25) / 0.25;
      turretAngle = -0.45 + p * 0.55;
      hoistY = 0;
    } else if (robotCycle < 0.75) {
      turretAngle = 0.1;
      const p = (robotCycle - 0.5) / 0.25;
      hoistY = -Math.sin(p * Math.PI) * 0.55;
    } else {
      const p = (robotCycle - 0.75) / 0.25;
      turretAngle = 0.1 - p * 0.55;
      hoistY = 0;
    }

    robotTurret.rotation.y = turretAngle;
    hoistCarriage.position.y = hoistY;

    // Stretch wrapper continuous rotation & vertical film travel
    turntable.rotation.y += 0.025 * speed;
    filmCarriage.position.y = 0.4 + Math.abs(Math.sin(elapsedTime * 0.45 * speed)) * 1.5;
  };

  const reset = () => {
    robotTurret.rotation.y = -0.45;
    hoistCarriage.position.y = 0;
    filmCarriage.position.y = 0.4;
  };

  return { group, update, reset };
}

/**
 * Synchronizes visible cans on the conveyor:
 * Cans sit flush on top of the belt surface at Y = 1.0!
 */
function syncCanVisuals(
  cans: CanSnapshot[],
  layer: THREE.Group,
  visuals: Map<number, CanVisual>
): void {
  const currentIds = new Set(cans.map((can) => can.id));
  visuals.forEach((visual, id) => {
    if (!currentIds.has(id)) {
      layer.remove(visual.group);
      disposeObject(visual.group);
      visuals.delete(id);
    }
  });

  cans.forEach((can) => {
    let visual = visuals.get(can.id);
    if (!visual) {
      visual = createCanVisual();
      visuals.set(can.id, visual);
      layer.add(visual.group);
    }
    updateCanVisual(visual, can);
  });
}

const SHARED_CAN_BODY_GEO = new THREE.CylinderGeometry(0.12, 0.12, 0.44, 12);
const SHARED_CAN_LIQUID_GEO = new THREE.CylinderGeometry(0.11, 0.11, 0.38, 10);
const SHARED_CAN_BAND_GEO = new THREE.CylinderGeometry(0.122, 0.122, 0.22, 12);
const SHARED_CAN_LID_GEO = new THREE.CylinderGeometry(0.12, 0.12, 0.015, 12);

const SHARED_CAN_BODY_MAT = metalMaterial(steel);
const SHARED_CAN_LIQUID_MAT = new THREE.MeshLambertMaterial({ color: 0x991b1b, transparent: true, opacity: 0.85 });
const SHARED_CAN_LID_MAT = metalMaterial(steel);

const SHARED_CASE_BOX_GEO = new THREE.BoxGeometry(1.2, 0.32, 0.86);
const SHARED_CASE_BOX_MAT = new THREE.MeshStandardMaterial({ color: 0xb96d2d, roughness: 0.85, metalness: 0.05 });
const SHARED_CASE_LABEL_GEO = new THREE.PlaneGeometry(0.8, 0.18);
let sharedCaseLabelMat: THREE.MeshBasicMaterial | null = null;
function getSharedCaseLabelMaterial(): THREE.MeshBasicMaterial {
  if (!sharedCaseLabelMat) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(9, 18, 30, 0.92)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#fff7ed';
      ctx.lineWidth = 4;
      ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
      ctx.fillStyle = '#fff7ed';
      ctx.font = '600 44px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('24 CANS • TOTA TOLA', canvas.width / 2, canvas.height / 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    sharedCaseLabelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
  }
  return sharedCaseLabelMat;
}

function createCanVisual(): CanVisual {
  const group = new THREE.Group();
  const canHeight = 0.44;

  const body = new THREE.Mesh(SHARED_CAN_BODY_GEO, SHARED_CAN_BODY_MAT);
  const liquid = new THREE.Mesh(SHARED_CAN_LIQUID_GEO, SHARED_CAN_LIQUID_MAT);

  const label = new THREE.MeshLambertMaterial({ color: 0x64748b });
  const band = new THREE.Mesh(SHARED_CAN_BAND_GEO, label);

  const lid = new THREE.Mesh(SHARED_CAN_LID_GEO, SHARED_CAN_LID_MAT);
  lid.position.y = canHeight / 2 + 0.007;

  group.add(body, liquid, band, lid);
  return { group, liquid, lid, label };
}

function updateCanVisual(visual: CanVisual, can: CanSnapshot): void {
  const canHeight = 0.44;
  // Sits flush on belt surface at Y = 1.0 -> center Y = 1.0 + canHeight/2 = 1.22
  const zLane = can.lane === 0 ? -0.32 : 0.32;
  visual.group.position.set(can.position, BELT_SURFACE_Y + canHeight / 2, zLane);

  const fillRatio = Math.max(0.01, can.fillLevel / 100);
  visual.liquid.scale.y = fillRatio;
  visual.liquid.position.y = -canHeight * 0.4 + (canHeight * 0.88 * fillRatio) / 2;

  visual.lid.visible = can.isSeamed;
  visual.label.color.setHex(
    can.stage === 'empty'
      ? 0x64748b
      : can.stage === 'filling'
      ? 0xf59e0b
      : can.isSeamed
      ? 0x22c55e
      : 0xfb923c
  );
}

/**
 * Synchronizes visible cases on the conveyor:
 * Cases ride flush on top of belt surface at Y = 1.0!
 */
function syncCaseVisuals(cases: CaseSnapshot[], layer: THREE.Group, visuals: Map<number, THREE.Group>): void {
  // Only display cases while on top of the conveyor belt (X <= 44.2). Never let cases float past the belt!
  const validCases = cases.filter((c) => c.position <= 44.2);
  const currentIds = new Set(validCases.map((c) => c.id));
  visuals.forEach((visual, id) => {
    if (!currentIds.has(id)) {
      layer.remove(visual);
      disposeObject(visual);
      visuals.delete(id);
    }
  });

  validCases.forEach((c) => {
    let visual = visuals.get(c.id);
    if (!visual) {
      visual = createCaseMesh(c.canCount);
      visuals.set(c.id, visual);
      layer.add(visual);
    }
    // Sits flush on belt surface at Y = 1.0 -> center Y = 1.0 + 0.16 = 1.16
    const zLane = c.lane === 0 ? -0.15 : 0.15;
    visual.position.set(c.position, BELT_SURFACE_Y + 0.16, zLane);
  });
}

function createCaseMesh(_canCount: number): THREE.Group {
  const group = new THREE.Group();
  const carton = new THREE.Mesh(SHARED_CASE_BOX_GEO, SHARED_CASE_BOX_MAT);
  group.add(carton);

  const labelMesh = new THREE.Mesh(SHARED_CASE_LABEL_GEO, getSharedCaseLabelMaterial());
  labelMesh.position.set(0, 0.01, 0.435);
  group.add(labelMesh);

  return group;
}

/**
 * Updates status indicator LEDs and moving parts of machines
 */
function updateMachines(machines: MachineVisual[], metrics: FactoryMetrics): void {
  const overloadMultiplier = metrics.overloadRatio || 1.0;

  machines.forEach((machine) => {
    const isLine1 = machine.line === 'line1';
    const isLineEnabled = isLine1 ? metrics.line1Enabled : metrics.line2Enabled;
    const stationMap = isLine1 ? metrics.line1Stations : metrics.line2Stations;
    const station = machine.key && stationMap ? stationMap[machine.key] : null;

    // 1. Status Indicator LED update (for stations with control panels)
    if (machine.indicator) {
      const isOffline = !isLineEnabled || (station && station.isEnabled === false);
      if (isOffline) {
        // Powered off: dark slate indicator
        machine.indicator.color.setHex(0x334155);
        machine.indicator.emissive.setHex(0x0f172a);
        machine.indicator.emissiveIntensity = 0.05;
      } else if (station) {
        const isCritical = station.efficiencyPercent < 70 || station.isJammed;
        const statusColor = station.isJammed ? 0xef4444 : getStatusColor(station.efficiencyPercent);

        machine.indicator.color.setHex(statusColor);
        machine.indicator.emissive.setHex(statusColor);

        // Dynamic flashing alarm when station is in critical state or mechanically jammed
        if (isCritical && metrics.isRunning) {
          const pulse = 0.6 + Math.abs(Math.sin(metrics.elapsedTime * 9)) * 1.8;
          machine.indicator.emissiveIntensity = pulse;
        } else {
          machine.indicator.emissiveIntensity = metrics.isRunning ? 1.2 : 0.2;
        }
      }
    }

    // 2. Machine Animation update
    if (metrics.isRunning) {
      const isOffline = !isLineEnabled || (station && station.isEnabled === false);
      if (isOffline) {
        // Station/Line is powered off: freeze its mechanical moving parts!
        return;
      }

      const isJammed = station?.isJammed ?? false;

      // Stutter/freeze motion on jammed station
      if (isJammed) {
        if (machine.movingParts) {
          machine.movingParts.forEach((part) => {
            if (part instanceof THREE.Mesh) {
              part.rotation.y += (Math.random() - 0.5) * 0.008;
            }
          });
        }
        return;
      }

      // Execute custom upgraded machine animation
      if (machine.update) {
        machine.update(metrics.elapsedTime, metrics.productionSpeed, overloadMultiplier, true);
      } else if (machine.movingParts && machine.key) {
        const rotationSpeed = machine.key === 'mixing' ? 0.055 : machine.key === 'packing' ? 0.025 : 0.042;
        machine.movingParts.forEach((part) => {
          part.rotation.y += rotationSpeed * metrics.productionSpeed * overloadMultiplier;
        });
      }
    } else if (metrics.elapsedTime === 0) {
      // Standby / Reset: return mechanical components to clean resting poses
      if (machine.reset) {
        machine.reset();
      }
    }
    // When paused (!isRunning && elapsedTime > 0), mechanical assemblies freeze in place!
  });
}

function updateFillingStreams(streams: THREE.Mesh[], metrics: FactoryMetrics): void {
  const l1Filling =
    metrics.isRunning &&
    metrics.line1Enabled &&
    metrics.line1Rate > 0 &&
    metrics.line1Stations?.filling?.isEnabled !== false &&
    metrics.lineState.visualCans.some((can) => can.lane === 0 && can.stage === 'filling');

  const l2Filling =
    metrics.isRunning &&
    metrics.line2Enabled &&
    metrics.line2Rate > 0 &&
    metrics.line2Stations?.filling?.isEnabled !== false &&
    metrics.lineState.visualCans.some((can) => can.lane === 1 && can.stage === 'filling');

  streams.forEach((stream, index) => {
    const isLine1 = index < streams.length / 2;
    const isFilling = isLine1 ? l1Filling : l2Filling;
    stream.visible = isFilling;
    if (isFilling) {
      stream.scale.y = 0.7 + Math.sin(metrics.elapsedTime * 10 + index) * 0.2;
    }
  });
}

/**
 * Realistic Forklift Model with Open Safety Cage & Seated Articulated Driver
 */
function createForklift(): THREE.Group {
  return createForkliftWithDriver();
}

/**
 * Gate with Roller Housing and coiling roll-up door.
 * As the door opens, it coils UP INTO the drum housing and NEVER sticks out above it!
 */
function createGate(): THREE.Group {
  const group = new THREE.Group();
  const doorMaterial = new THREE.MeshLambertMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
  const pillarMaterial = new THREE.MeshLambertMaterial({ color: 0x1e293b });

  // Roll-up door plane (width 5.8, height 5.0)
  // Top anchor at y = 5.0.
  const doorGroup = new THREE.Group();
  doorGroup.name = 'doorGroup';
  doorGroup.position.set(0, 5.0, 0); // pivot at top of doorway

  const doorMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 5.0), doorMaterial);
  doorMesh.name = 'doorMesh';
  doorMesh.position.set(0, -2.5, 0.1); // hangs down from y = 5.0 to y = 0
  doorMesh.rotation.y = -Math.PI / 2;

  // Horizontal ribbed panels
  for (let j = -2.1; j <= 2.1; j += 0.5) {
    const rib = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.05), pillarMaterial);
    rib.position.set(0, j, 0.15);
    doorMesh.add(rib);
  }
  doorGroup.add(doorMesh);
  group.add(doorGroup);

  // Roller drum housing box at y = 5.6 (spanning y = 5.0 to 6.2, depth 1.2, width 6.8)
  const housing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 6.8), pillarMaterial);
  housing.position.set(0.15, 5.6, 0);
  group.add(housing);

  // Vertical guide tracks along the sides
  const trackL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.0, 0.3), pillarMaterial);
  trackL.position.set(0.1, 2.5, -3.05);
  const trackR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.0, 0.3), pillarMaterial);
  trackR.position.set(0.1, 2.5, 3.05);
  group.add(trackL, trackR);

  // Yellow safety crash bollards guarding the gate threshold
  const bollardMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 });
  [-3.5, 3.5].forEach((z) => {
    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.2, 14), bollardMat);
    bollard.position.set(-1.0, 0.6, z);
    group.add(bollard);
  });

  return group;
}

/**
 * Animates the roll-up door into the roller drum housing.
 * When open, scale.y shrinks to ~0.05, smoothly coiling into the drum.
 */
function animateGateDoor(gate: THREE.Group, isOpen: boolean) {
  const doorGroup = gate.getObjectByName('doorGroup');
  if (!doorGroup) return;

  const targetScaleY = isOpen ? 0.04 : 1.0;
  doorGroup.scale.y = THREE.MathUtils.lerp(doorGroup.scale.y, targetScaleY, 0.09);
}


function createLineSign(lineName: string): THREE.Group {
  const group = new THREE.Group();
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 46px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${lineName} • 330 mL CANNING LINE • 6,000 CPH`, canvas.width / 2, 70);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(8.2, 1.1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
  );
  group.add(board);

  // Twin vertical suspension steel rods connecting up to roof truss overhead
  const rodMat = metalMaterial(steel);
  [-3.8, 3.8].forEach((rx) => {
    const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), rodMat);
    hanger.position.set(rx, 1.1, 0);
    group.add(hanger);
  });

  return group;
}

function createStationLabel(title: string, detail: string, width: number): THREE.Group {
  const group = new THREE.Group();

  // 1. Solid Dark Steel Enclosure Box (100% opaque, eliminates transparency sorting glitches)
  const enclosure = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.78, 0.1),
    metalMaterial(darkSteel)
  );
  group.add(enclosure);

  // 2. High-contrast Crisp Canvas Sign Face
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 220;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = 'rgba(9, 18, 30, 0.98)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#f97316';
    context.lineWidth = 6;
    context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    context.fillStyle = '#ffffff';
    context.font = '800 44px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(title, canvas.width / 2, 80);
    context.fillStyle = '#94a3b8';
    context.font = '600 26px Arial, sans-serif';
    context.fillText(detail, canvas.width / 2, 150);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.08, 0.7),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide })
  );
  face.position.z = 0.055;
  group.add(face);

  // 3. Stanchion Mounting Legs connecting down to machine
  const rodMat = metalMaterial(steel);
  [-width * 0.38, width * 0.38].forEach((rx) => {
    const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8), rodMat);
    hanger.position.set(rx, -0.6, 0);
    group.add(hanger);
  });

  return group;
}

function createControlPanel(indicator: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0), metalMaterial(darkSteel));
  stand.position.y = 0.5;
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.22), metalMaterial(darkSteel));
  box.position.y = 1.1;
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), indicator);
  light.position.set(0, 1.25, 0.12);
  group.add(stand, box, light);
  return group;
}

function metalMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.8, roughness: 0.24 });
}

function statusMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x4ade80, emissive: 0x4ade80, emissiveIntensity: 0.2 });
}

function getStatusColor(efficiency: number): number {
  if (efficiency >= 95) return CONFIG.efficiency.optimal.color;
  if (efficiency >= 85) return CONFIG.efficiency.caution.color;
  if (efficiency >= 70) return CONFIG.efficiency.warning.color;
  return CONFIG.efficiency.critical.color;
}

function disposeObject(object: THREE.Object3D): void {
  if (!(object instanceof THREE.Mesh)) return;
  if (
    object.geometry === SHARED_CAN_BODY_GEO ||
    object.geometry === SHARED_CAN_LIQUID_GEO ||
    object.geometry === SHARED_CAN_BAND_GEO ||
    object.geometry === SHARED_CAN_LID_GEO ||
    object.geometry === SHARED_CASE_BOX_GEO ||
    object.geometry === SHARED_CASE_LABEL_GEO
  ) {
    return;
  }
  object.geometry.dispose();
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  materials.forEach((material) => {
    if (
      material === SHARED_CAN_BODY_MAT ||
      material === SHARED_CAN_LIQUID_MAT ||
      material === SHARED_CAN_LID_MAT ||
      material === SHARED_CASE_BOX_MAT ||
      material === sharedCaseLabelMat
    ) {
      return;
    }
    const textureMaterial = material as THREE.Material & { map?: THREE.Texture };
    textureMaterial.map?.dispose();
    material.dispose();
  });
}

function createIndustrialWindow(width: number, height: number): THREE.Group {
  const group = new THREE.Group();

  // Glass pane (optimized MeshLambertMaterial)
  const glassMat = new THREE.MeshLambertMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width, height), glassMat);
  glass.position.z = 0.05;
  group.add(glass);

  // Outer frame & sill
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.7,
    roughness: 0.4,
    side: THREE.DoubleSide,
  });

  const borderThickness = 0.22;
  const topFrame = new THREE.Mesh(new THREE.PlaneGeometry(width + borderThickness * 2, borderThickness), frameMat);
  topFrame.position.set(0, height / 2 + borderThickness / 2, 0.08);
  const botFrame = new THREE.Mesh(new THREE.PlaneGeometry(width + borderThickness * 2, borderThickness), frameMat);
  botFrame.position.set(0, -height / 2 - borderThickness / 2, 0.08);
  const leftFrame = new THREE.Mesh(new THREE.PlaneGeometry(borderThickness, height), frameMat);
  leftFrame.position.set(-width / 2 - borderThickness / 2, 0, 0.08);
  const rightFrame = new THREE.Mesh(new THREE.PlaneGeometry(borderThickness, height), frameMat);
  rightFrame.position.set(width / 2 + borderThickness / 2, 0, 0.08);

  // 3D bottom window sill
  const sill = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.18, 0.3), frameMat);
  sill.position.set(0, -height / 2 - borderThickness / 2, 0.15);

  group.add(topFrame, botFrame, leftFrame, rightFrame, sill);

  // Inner multi-pane industrial mullion grid (approx. 1.5m wide x 1.0m tall per pane)
  const cols = Math.max(3, Math.round(width / 1.6));
  const rows = Math.max(2, Math.round(height / 1.05));
  const colStep = width / cols;
  const rowStep = height / rows;

  for (let c = 1; c < cols; c++) {
    const vBar = new THREE.Mesh(new THREE.PlaneGeometry(0.12, height), frameMat);
    vBar.position.set(-width / 2 + c * colStep, 0, 0.07);
    group.add(vBar);
  }

  for (let r = 1; r < rows; r++) {
    const hBar = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.12), frameMat);
    hBar.position.set(0, -height / 2 + r * rowStep, 0.07);
    group.add(hBar);
  }

  return group;
}

/**
 * Industrial Personnel Door (Pedestrian Access / Emergency Exit)
 * Complete with hollow-metal frame, vision lite safety window,
 * stainless panic crash push-bars, overhead illuminated green EXIT sign,
 * and yellow/black hatched floor hazard clearance striping.
 */
interface PersonnelDoorOptions {
  label?: string;
  roomTag?: string;
  isEmergencyExit?: boolean;
}

function createPersonnelDoor(options: PersonnelDoorOptions = {}): THREE.Group {
  const {
    label = 'PERSONNEL ACCESS',
    roomTag = 'PLANT EGRESS',
    isEmergencyExit = true,
  } = options;

  const group = new THREE.Group();

  const frameWidth = 2.8;
  const frameHeight = 3.3;
  const doorWidth = 2.4;
  const doorHeight = 3.0;
  const leafWidth = doorWidth / 2;

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.35,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.6,
    roughness: 0.45,
  });
  const hardwareMat = metalMaterial(steel);
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });

  // 1. Heavy Outer Steel Frame
  const header = new THREE.Mesh(new THREE.BoxGeometry(frameWidth, 0.3, 0.35), frameMat);
  header.position.set(0, frameHeight - 0.15, 0.08);
  const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.2, frameHeight, 0.35), frameMat);
  jambL.position.set(-frameWidth / 2 + 0.1, frameHeight / 2, 0.08);
  const jambR = new THREE.Mesh(new THREE.BoxGeometry(0.2, frameHeight, 0.35), frameMat);
  jambR.position.set(frameWidth / 2 - 0.1, frameHeight / 2, 0.08);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(frameWidth, 0.04, 0.4), hardwareMat);
  sill.position.set(0, 0.02, 0.1);

  group.add(header, jambL, jambR, sill);

  // 2. Twin Door Leaves (Double Door)
  [-1, 1].forEach((dir) => {
    const leafGroup = new THREE.Group();
    const leafX = (dir * leafWidth) / 2;
    leafGroup.position.set(leafX, doorHeight / 2, 0.06);

    // Door leaf panel
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(leafWidth - 0.04, doorHeight, 0.1), leafMat);
    leafGroup.add(leaf);

    // Vision Glass Lite (Optimized MeshLambertMaterial)
    const glassMat = new THREE.MeshLambertMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.45,
    });
    const visionGlass = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.2, 0.12), glassMat);
    visionGlass.position.set(dir * 0.18, 0.3, 0);

    const glassBead = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.24, 0.13), darkMat);
    glassBead.position.set(dir * 0.18, 0.3, 0);

    leafGroup.add(glassBead, visionGlass);

    // Stainless Steel Panic Push-Bar (Crash Bar) at waist height
    const pushBar = new THREE.Mesh(new THREE.BoxGeometry(leafWidth - 0.22, 0.08, 0.12), hardwareMat);
    pushBar.position.set(0, -0.45, 0.1);
    const pushBaseL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.1), darkMat);
    pushBaseL.position.set(-(leafWidth - 0.3) / 2, -0.45, 0.08);
    const pushBaseR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.1), darkMat);
    pushBaseR.position.set((leafWidth - 0.3) / 2, -0.45, 0.08);
    leafGroup.add(pushBar, pushBaseL, pushBaseR);

    // Stainless Kickplate at bottom
    const kickPlate = new THREE.Mesh(new THREE.BoxGeometry(leafWidth - 0.08, 0.32, 0.11), hardwareMat);
    kickPlate.position.set(0, -doorHeight / 2 + 0.18, 0.01);
    leafGroup.add(kickPlate);

    // Overhead Hydraulic Door Closer
    const closerBody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.12), hardwareMat);
    closerBody.position.set(dir * 0.2, doorHeight / 2 - 0.1, 0.1);
    const closerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 6), hardwareMat);
    closerArm.rotation.z = dir * 0.5;
    closerArm.position.set(dir * 0.2, doorHeight / 2 + 0.02, 0.1);
    leafGroup.add(closerBody, closerArm);

    group.add(leafGroup);
  });

  // Center Astragal
  const astragal = new THREE.Mesh(new THREE.BoxGeometry(0.04, doorHeight, 0.12), hardwareMat);
  astragal.position.set(0, doorHeight / 2, 0.06);
  group.add(astragal);

  // 3. Overhead Illuminated Emergency Exit Sign Box (Luminous emissive material, zero real-time pointlight overhead)
  const exitSignGroup = new THREE.Group();
  exitSignGroup.position.set(0, frameHeight + 0.26, 0.15);

  const signBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.34, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.4 })
  );
  exitSignGroup.add(signBox);

  // Dynamic canvas texture for luminous EXIT sign face
  const exitCanvas = document.createElement('canvas');
  exitCanvas.width = 512;
  exitCanvas.height = 192;
  const exitCtx = exitCanvas.getContext('2d');
  if (exitCtx) {
    exitCtx.fillStyle = '#15803d'; // Rich emergency green
    exitCtx.fillRect(0, 0, 512, 192);

    exitCtx.strokeStyle = '#86efac';
    exitCtx.lineWidth = 6;
    exitCtx.strokeRect(6, 6, 500, 180);

    // Running person symbol on the left
    exitCtx.fillStyle = '#ffffff';
    exitCtx.beginPath();
    exitCtx.arc(100, 56, 18, 0, Math.PI * 2);
    exitCtx.fill();
    exitCtx.beginPath();
    exitCtx.moveTo(95, 78);
    exitCtx.lineTo(110, 118);
    exitCtx.lineTo(135, 142);
    exitCtx.lineTo(125, 155);
    exitCtx.lineTo(95, 128);
    exitCtx.lineTo(82, 160);
    exitCtx.lineTo(65, 152);
    exitCtx.lineTo(85, 102);
    exitCtx.lineTo(80, 80);
    exitCtx.closePath();
    exitCtx.fill();

    // Bold white text
    exitCtx.font = '900 68px Arial, sans-serif';
    exitCtx.textAlign = 'center';
    exitCtx.textBaseline = 'middle';
    exitCtx.fillText(isEmergencyExit ? 'EXIT' : 'DOOR', 290, 80);

    exitCtx.font = '700 24px Arial, sans-serif';
    exitCtx.fillStyle = '#bbf7d0';
    exitCtx.fillText(isEmergencyExit ? 'EMERGENCY EGRESS' : 'PERSONNEL ACCESS', 290, 140);
  }
  const exitTex = new THREE.CanvasTexture(exitCanvas);
  exitTex.colorSpace = THREE.SRGBColorSpace;

  const exitFaceMat = new THREE.MeshStandardMaterial({
    map: exitTex,
    color: 0x4ade80,
    emissive: 0x22c55e,
    emissiveIntensity: 2.2,
  });
  const exitFace = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.3), exitFaceMat);
  exitFace.position.set(0, 0, 0.075);
  exitSignGroup.add(exitFace);
  group.add(exitSignGroup);

  // 4. Floor Hazard Stripe "KEEP CLEAR • EMERGENCY EGRESS" Clearance Zone
  const hazardWidth = 3.4;
  const hazardDepth = 2.4;
  const hazardCanvas = document.createElement('canvas');
  hazardCanvas.width = 512;
  hazardCanvas.height = 384;
  const hCtx = hazardCanvas.getContext('2d');
  if (hCtx) {
    hCtx.fillStyle = '#facc15';
    hCtx.fillRect(0, 0, 512, 384);

    hCtx.fillStyle = '#0f172a';
    const stripeW = 44;
    for (let x = -512; x < 1024; x += stripeW * 2) {
      hCtx.beginPath();
      hCtx.moveTo(x, 0);
      hCtx.lineTo(x + stripeW, 0);
      hCtx.lineTo(x + stripeW + 384, 384);
      hCtx.lineTo(x + 384, 384);
      hCtx.closePath();
      hCtx.fill();
    }

    hCtx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    hCtx.fillRect(20, 140, 472, 104);
    hCtx.strokeStyle = '#facc15';
    hCtx.lineWidth = 4;
    hCtx.strokeRect(20, 140, 472, 104);

    hCtx.fillStyle = '#facc15';
    hCtx.font = '800 36px Arial, sans-serif';
    hCtx.textAlign = 'center';
    hCtx.textBaseline = 'middle';
    hCtx.fillText('DO NOT BLOCK', 256, 175);

    hCtx.font = '700 24px Arial, sans-serif';
    hCtx.fillStyle = '#f8fafc';
    hCtx.fillText('EMERGENCY EXIT ZONE', 256, 218);
  }
  const hazardTex = new THREE.CanvasTexture(hazardCanvas);
  hazardTex.colorSpace = THREE.SRGBColorSpace;
  const hazardFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(hazardWidth, hazardDepth),
    new THREE.MeshBasicMaterial({ map: hazardTex })
  );
  hazardFloor.rotation.x = -Math.PI / 2;
  hazardFloor.position.set(0, 0.016, hazardDepth / 2 + 0.1);
  group.add(hazardFloor);

  // 5. Wall Mounted Door Info Plaque
  const plaqueCanvas = document.createElement('canvas');
  plaqueCanvas.width = 256;
  plaqueCanvas.height = 128;
  const pCtx = plaqueCanvas.getContext('2d');
  if (pCtx) {
    pCtx.fillStyle = '#1e293b';
    pCtx.fillRect(0, 0, 256, 128);
    pCtx.strokeStyle = '#38bdf8';
    pCtx.lineWidth = 4;
    pCtx.strokeRect(4, 4, 248, 120);

    pCtx.fillStyle = '#38bdf8';
    pCtx.font = '700 24px Arial, sans-serif';
    pCtx.textAlign = 'center';
    pCtx.textBaseline = 'middle';
    pCtx.fillText(label, 128, 45);

    pCtx.fillStyle = '#94a3b8';
    pCtx.font = '500 18px Arial, sans-serif';
    pCtx.fillText(roomTag, 128, 85);
  }
  const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
  plaqueTex.colorSpace = THREE.SRGBColorSpace;
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(0.75, 0.4),
    new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.3 })
  );
  plaque.position.set(frameWidth / 2 + 0.55, 1.8, 0.08);
  group.add(plaque);

  return group;
}

/**
 * High-Capacity Industrial Wall Exhaust Fan (Optimized geometry, 4 blades, rotating impeller)
 */
function createIndustrialExhaustFan(fanBladesList?: THREE.Object3D[]): THREE.Group {
  const group = new THREE.Group();

  const plenumMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.75,
    roughness: 0.3,
  });
  const bellmouthMat = metalMaterial(steel);
  const bladeMat = metalMaterial(0x94a3b8);
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });

  // 1. Square Wall Mounting Plenum Housing
  const plenum = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 0.65), plenumMat);
  group.add(plenum);

  // 2. Aerodynamic Vent Cowl / Bellmouth Intake Cylinder
  const intakeShroud = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.85, 0.68, 18, 1, true),
    bellmouthMat
  );
  intakeShroud.rotation.x = Math.PI / 2;
  group.add(intakeShroud);

  // 3. Central Electric Motor Pod
  const motorPod = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.45, 14), darkMat);
  motorPod.rotation.x = Math.PI / 2;
  motorPod.position.z = -0.1;
  group.add(motorPod);

  // 4. Rotating Fan Blade Impeller Assembly (4 Aerodynamic Blades)
  const bladeGroup = new THREE.Group();
  bladeGroup.position.z = 0.14;

  const spinnerCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.3, 16),
    metalMaterial(steel)
  );
  spinnerCone.rotation.x = Math.PI / 2;
  bladeGroup.add(spinnerCone);

  const numBlades = 4;
  for (let b = 0; b < numBlades; b++) {
    const bAngle = (b / numBlades) * Math.PI * 2;
    const bladeArm = new THREE.Group();
    bladeArm.rotation.z = bAngle;

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.58, 0.025), bladeMat);
    blade.position.y = 0.46;
    blade.rotation.y = 0.45;
    blade.rotation.x = 0.08;

    const tipMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.026), tipMat);
    tip.position.set(0, 0.25, 0);
    blade.add(tip);

    bladeArm.add(blade);
    bladeGroup.add(bladeArm);
  }

  group.add(bladeGroup);
  if (fanBladesList) {
    fanBladesList.push(bladeGroup);
  }

  // 5. Protective Wire Guard Outer Ring & Crossed Spokes
  const guardMat = metalMaterial(darkSteel);
  const guardRing = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.016, 6, 20), guardMat);
  guardRing.position.z = 0.35;
  const spokeH = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.64, 6), guardMat);
  spokeH.rotation.z = Math.PI / 2;
  spokeH.position.z = 0.35;
  const spokeV = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.64, 6), guardMat);
  spokeV.position.z = 0.35;
  group.add(guardRing, spokeH, spokeV);

  // 6. External Back Gravity Louvers (3 slats)
  const louverMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.6,
    roughness: 0.4,
    side: THREE.DoubleSide,
  });
  [-0.42, 0, 0.42].forEach((ly) => {
    const louver = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.38), louverMat);
    louver.position.set(0, ly, -0.34);
    louver.rotation.x = -0.55;
    group.add(louver);
  });

  return group;
}
