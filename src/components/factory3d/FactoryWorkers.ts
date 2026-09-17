import * as THREE from 'three';

export interface WorkerRig {
  root: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  neckMesh: THREE.Mesh;
  faceMesh: THREE.Mesh;
  glassesMesh: THREE.Mesh;
  hardhatDome: THREE.Mesh;
  hardhatBrim: THREE.Mesh;
  armL: THREE.Group;
  forearmL: THREE.Group;
  handMountL: THREE.Group;
  armR: THREE.Group;
  forearmR: THREE.Group;
  handMountR: THREE.Group;
  propMountChest: THREE.Group;
  legL: THREE.Group;
  shinL: THREE.Group;
  legR: THREE.Group;
  shinR: THREE.Group;
}

export interface InteractiveWorkerAgent {
  group: THREE.Group;
  rig: WorkerRig;
  name: string;
  update: (elapsedTime: number, speedMultiplier: number, isRunning: boolean, realTime?: number) => void;
  dispose: () => void;
}

// ---------------------------------------------------------------------------
// Shared Reusable High-Performance Materials
// ---------------------------------------------------------------------------
const steelColor = 0xb7c4ce;
const darkSteelColor = 0x263746;

function metalMat(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.82, roughness: 0.25 });
}

export const workerMats = {
  skin: new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.72 }),
  pantsNavy: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 }),
  beltDark: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 }),
  bootLeather: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 }),
  vestOrange: new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.55 }), // Line 1
  vestLime: new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.55 }),   // Line 2
  vestStripe: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2, metalness: 0.7 }),
  hardhatYellow: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.1 }),
  hardhatWhite: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.1 }),
  hardhatBlue: new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.35, metalness: 0.1 }),
  gloveBlue: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 }),
  gloveGrey: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 }),
  glassesPoly: new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.85, transparent: true, opacity: 0.78 }),
  cardboardBox: new THREE.MeshStandardMaterial({ color: 0xb96d2d, roughness: 0.84 }),
  canAluminum: metalMat(steelColor),
  paperWrap: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.75 }),
  woodPallet: new THREE.MeshStandardMaterial({ color: 0x8a552a, roughness: 0.92 }),
  labCoatWhite: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.42 }),
  coverallsGrey: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.65 }),
  apronBlue: new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.5 }),
};

// ---------------------------------------------------------------------------
// Props Creation
// ---------------------------------------------------------------------------

/**
 * Realistic cardboard carton filled with 24 aluminum beverage cans (4 x 6 grid).
 */
export function createCanBoxProp(): THREE.Group {
  const group = new THREE.Group();

  // Outer corrugated cardboard carton tray
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.24, 0.38), workerMats.cardboardBox);
  group.add(box);

  // 24 Cans neatly arranged inside
  const canGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.11, 8);
  for (let ix = -0.21; ix <= 0.22; ix += 0.084) {
    for (let iz = -0.13; iz <= 0.14; iz += 0.088) {
      const miniCan = new THREE.Mesh(canGeo, workerMats.canAluminum);
      miniCan.position.set(ix, 0.11, iz);
      group.add(miniCan);
    }
  }

  return group;
}

/**
 * Realistic retail 6-pack cluster box / multipack sleeve of canned beverage.
 * Branded carton sleeve with 6 exposed aluminum can top lids.
 */
export function createSmallPackProp(): THREE.Group {
  const group = new THREE.Group();

  // Branded cardboard sleeve (3 cans long x 2 cans wide)
  // Length: 0.38m, Height: 0.18m, Depth: 0.26m
  const sleeve = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.18, 0.26),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.45, metalness: 0.1 })
  );
  const brandStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.385, 0.08, 0.265),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 })
  );
  group.add(sleeve, brandStripe);

  // 6 can tops visible in 3x2 grid
  const canGeo = new THREE.CylinderGeometry(0.046, 0.046, 0.02, 8);
  for (let ix = -0.11; ix <= 0.12; ix += 0.11) {
    for (let iz = -0.065; iz <= 0.07; iz += 0.13) {
      const top = new THREE.Mesh(canGeo, workerMats.canAluminum);
      top.position.set(ix, 0.1, iz);
      group.add(top);
    }
  }

  return group;
}

/**
 * Realistic 24-can corrugated master shipping carton ("24 CANS • TOTA TOLA"),
 * matching the cases moving on the conveyor belt and stacked on the pallet.
 */
let masterCaseLabelTex: THREE.CanvasTexture | null = null;
function getMasterCaseLabelTexture(): THREE.CanvasTexture {
  if (!masterCaseLabelTex) {
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
    masterCaseLabelTex = new THREE.CanvasTexture(canvas);
    masterCaseLabelTex.colorSpace = THREE.SRGBColorSpace;
  }
  return masterCaseLabelTex;
}

export function createMasterCaseProp(): THREE.Group {
  const group = new THREE.Group();
  // Corrugated cardboard master case (matching case mesh dimensions)
  const carton = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.32, 0.82),
    workerMats.cardboardBox
  );
  carton.castShadow = true;
  group.add(carton);

  const labelMat = new THREE.MeshBasicMaterial({
    map: getMasterCaseLabelTexture(),
    transparent: true,
    side: THREE.DoubleSide,
  });
  const labelFront = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.18), labelMat);
  labelFront.position.set(0, 0.01, 0.415);
  const labelBack = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.18), labelMat);
  labelBack.position.set(0, 0.01, -0.415);
  labelBack.rotation.y = Math.PI;

  group.add(labelFront, labelBack);
  return group;
}

/**
 * Bundle of flat unfolded corrugated carton blanks ready for the case erector.
 */
export function createFlatBlanksProp(): THREE.Group {
  const group = new THREE.Group();
  const stack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.38), workerMats.cardboardBox);
  const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.53, 0.125, 0.03), workerMats.vestStripe);
  band1.position.z = -0.1;
  const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.53, 0.125, 0.03), workerMats.vestStripe);
  band2.position.z = 0.1;
  group.add(stack, band1, band2);
  return group;
}

/**
 * Long cylindrical sleeve of stacked metal can lids for the double seamer.
 */
export function createLidSleeveProp(): THREE.Group {
  const group = new THREE.Group();

  // Cylindrical paper wrapping
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.82, 14), workerMats.paperWrap);
  group.add(sleeve);

  // Exposed aluminum lids at top and bottom ends
  [-0.41, 0.41].forEach((y) => {
    const end = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.074, 0.03, 14), workerMats.canAluminum);
    end.position.y = y;
    group.add(end);
  });

  return group;
}

/**
 * Individual test can for QA inspection.
 */
export function createTestCanProp(): THREE.Group {
  const group = new THREE.Group();
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.18, 12), workerMats.canAluminum);
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.051, 0.051, 0.12, 12),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 })
  );
  group.add(can, label);
  return group;
}

/**
 * Rugged industrial digital QA tablet.
 */
export function createTabletProp(): THREE.Group {
  const group = new THREE.Group();
  const casing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.02), metalMat(darkSteelColor));
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.25),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  screen.position.z = 0.012;
  group.add(casing, screen);
  return group;
}

/**
 * Glass/stainless liquid sample beaker for syrup testing.
 */
export function createSampleFlaskProp(): THREE.Group {
  const group = new THREE.Group();
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.045, 0.16, 12),
    new THREE.MeshStandardMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.65, roughness: 0.1 })
  );
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.042, 0.11, 10),
    new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.3 })
  );
  liquid.position.y = -0.02;
  group.add(glass, liquid);
  return group;
}

// ---------------------------------------------------------------------------
// Articulated Low-Poly Industrial Worker Model Generator
// ---------------------------------------------------------------------------

export function createArticulatedWorker(options?: {
  vestColor?: THREE.MeshStandardMaterial;
  hardhatMat?: THREE.MeshStandardMaterial;
  gloveMat?: THREE.MeshStandardMaterial;
  pantsMat?: THREE.MeshStandardMaterial;
  scale?: number;
}): { group: THREE.Group; rig: WorkerRig } {
  const group = new THREE.Group();
  const vestMat = options?.vestColor ?? workerMats.vestOrange;
  const hardhatMat = options?.hardhatMat ?? workerMats.hardhatYellow;
  const gloveMat = options?.gloveMat ?? workerMats.gloveBlue;
  const pantsMat = options?.pantsMat ?? workerMats.pantsNavy;
  const scale = options?.scale ?? 1.0;

  // 1. Torso Group (hip pivot at Y = 0.88m)
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.88;

  // Pelvis / Hips
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.22), pantsMat);
  pelvis.position.y = -0.04;
  torsoGroup.add(pelvis);

  // Utility Belt & Buckle
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.24), workerMats.beltDark);
  belt.position.y = 0.05;
  const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.1), workerMats.beltDark);
  pouch.position.set(0.19, 0.05, 0.02);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), workerMats.vestStripe);
  buckle.position.set(0, 0.05, 0.125);
  torsoGroup.add(belt, pouch, buckle);

  // Chest / Hi-Vis Safety Vest
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.24), vestMat);
  chest.position.y = 0.28;
  torsoGroup.add(chest);

  // Reflective Stripes (horizontal belt + dual shoulder suspender stripes)
  const horizStripe = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.05, 0.25), workerMats.vestStripe);
  horizStripe.position.y = 0.22;
  const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.25), workerMats.vestStripe);
  strapL.position.set(-0.1, 0.28, 0);
  const strapR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.25), workerMats.vestStripe);
  strapR.position.set(0.1, 0.28, 0);
  torsoGroup.add(horizStripe, strapL, strapR);

  // Prop mount at front of chest (ideal for 2-handed box carrying)
  const propMountChest = new THREE.Group();
  propMountChest.position.set(0, 0.26, 0.36);
  torsoGroup.add(propMountChest);

  // 2. Head Group (neck pivot at Y = 0.52 inside torsoGroup)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.52, 0);

  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.1, 10), workerMats.skin);
  neckMesh.position.y = 0.04;

  const faceMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.2), workerMats.skin);
  faceMesh.position.y = 0.19;

  const glassesMesh = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.05, 0.06), workerMats.glassesPoly);
  glassesMesh.position.set(0, 0.21, 0.09);

  // Molded safety hardhat
  const hardhatDome = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), hardhatMat);
  hardhatDome.position.set(0, 0.25, -0.01);
  hardhatDome.scale.set(1.0, 0.85, 1.15);

  const hardhatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.03, 16), hardhatMat);
  hardhatBrim.position.set(0, 0.25, 0.03);
  hardhatBrim.rotation.x = 0.05;

  const hardhatRidge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.26), hardhatMat);
  hardhatRidge.position.set(0, 0.35, -0.01);

  headGroup.add(neckMesh, faceMesh, glassesMesh, hardhatDome, hardhatBrim, hardhatRidge);
  torsoGroup.add(headGroup);

  // 3. Left Arm (Shoulder at (-0.24, 0.44, 0))
  const armL = new THREE.Group();
  armL.position.set(-0.24, 0.44, 0);
  const upperArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.26, 10), vestMat);
  upperArmL.position.y = -0.13;
  armL.add(upperArmL);

  const forearmL = new THREE.Group();
  forearmL.position.y = -0.26;
  const lowerArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.24, 10), workerMats.skin);
  lowerArmL.position.y = -0.12;
  const handL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.06), gloveMat);
  handL.position.y = -0.27;
  const handMountL = new THREE.Group();
  handMountL.position.set(0, -0.28, 0);
  forearmL.add(lowerArmL, handL, handMountL);
  armL.add(forearmL);
  torsoGroup.add(armL);

  // 4. Right Arm (Shoulder at (0.24, 0.44, 0))
  const armR = new THREE.Group();
  armR.position.set(0.24, 0.44, 0);
  const upperArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.26, 10), vestMat);
  upperArmR.position.y = -0.13;
  armR.add(upperArmR);

  const forearmR = new THREE.Group();
  forearmR.position.y = -0.26;
  const lowerArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.24, 10), workerMats.skin);
  lowerArmR.position.y = -0.12;
  const handR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.06), gloveMat);
  handR.position.y = -0.27;
  const handMountR = new THREE.Group();
  handMountR.position.set(0, -0.28, 0);
  forearmR.add(lowerArmR, handR, handMountR);
  armR.add(forearmR);
  torsoGroup.add(armR);

  group.add(torsoGroup);

  // 5. Left Leg (Hip at (-0.11, 0.84, 0))
  const legL = new THREE.Group();
  legL.position.set(-0.11, 0.84, 0);
  const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.38, 10), pantsMat);
  thighL.position.y = -0.19;
  legL.add(thighL);

  const shinL = new THREE.Group();
  shinL.position.y = -0.38;
  const lowerLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.052, 0.36, 10), pantsMat);
  lowerLegL.position.y = -0.18;
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.22), workerMats.bootLeather);
  bootL.position.set(0, -0.38, 0.04);
  shinL.add(lowerLegL, bootL);
  legL.add(shinL);
  group.add(legL);

  // 6. Right Leg (Hip at (0.11, 0.84, 0))
  const legR = new THREE.Group();
  legR.position.set(0.11, 0.84, 0);
  const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.38, 10), pantsMat);
  thighR.position.y = -0.19;
  legR.add(thighR);

  const shinR = new THREE.Group();
  shinR.position.y = -0.38;
  const lowerLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.052, 0.36, 10), pantsMat);
  lowerLegR.position.y = -0.18;
  const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.22), workerMats.bootLeather);
  bootR.position.set(0, -0.38, 0.04);
  shinR.add(lowerLegR, bootR);
  legR.add(shinR);
  group.add(legR);

  group.scale.set(scale, scale, scale);

  const rig: WorkerRig = {
    root: group,
    torsoGroup,
    headGroup,
    neckMesh,
    faceMesh,
    glassesMesh,
    hardhatDome,
    hardhatBrim,
    armL,
    forearmL,
    handMountL,
    armR,
    forearmR,
    handMountR,
    propMountChest,
    legL,
    shinL,
    legR,
    shinR,
  };

  return { group, rig };
}

// ---------------------------------------------------------------------------
// Procedural Pose Functions
// ---------------------------------------------------------------------------

export function resetWorkerPose(rig: WorkerRig) {
  rig.torsoGroup.position.set(0, 0.88, 0);
  rig.torsoGroup.rotation.set(0, 0, 0);
  rig.headGroup.rotation.set(0, 0, 0);
  rig.armL.rotation.set(0, 0, -0.05);
  rig.forearmL.rotation.set(-0.15, 0, 0);
  rig.armR.rotation.set(0, 0, 0.05);
  rig.forearmR.rotation.set(-0.15, 0, 0);
  rig.legL.rotation.set(0, 0, 0);
  rig.shinL.rotation.set(0, 0, 0);
  rig.legR.rotation.set(0, 0, 0);
  rig.shinR.rotation.set(0, 0, 0);
}

export function applyWorkerWalkPose(rig: WorkerRig, phase: number, isCarrying: boolean) {
  const stride = Math.sin(phase);
  const kneeL = Math.max(0, Math.sin(phase + Math.PI * 0.2)) * 0.85;
  const kneeR = Math.max(0, Math.sin(phase + Math.PI * 1.2)) * 0.85;

  rig.legL.rotation.set(stride * 0.55, 0, 0);
  rig.shinL.rotation.set(kneeL, 0, 0);
  rig.legR.rotation.set(-stride * 0.55, 0, 0);
  rig.shinR.rotation.set(kneeR, 0, 0);

  rig.torsoGroup.position.y = 0.88 + Math.abs(Math.sin(phase * 2)) * 0.035;
  rig.torsoGroup.rotation.y = -stride * 0.08;

  if (isCarrying) {
    rig.armL.rotation.set(-0.65, 0.15, 0.05);
    rig.forearmL.rotation.set(-1.0, 0, 0);
    rig.armR.rotation.set(-0.65, -0.15, -0.05);
    rig.forearmR.rotation.set(-1.0, 0, 0);
    rig.torsoGroup.rotation.x = -0.04;
  } else {
    rig.armL.rotation.set(-stride * 0.45, 0, -0.05);
    rig.forearmL.rotation.set(-0.25, 0, 0);
    rig.armR.rotation.set(stride * 0.45, 0, 0.05);
    rig.forearmR.rotation.set(-0.25, 0, 0);
    rig.torsoGroup.rotation.x = 0.03;
  }
}

export function applyWorkerBendPose(rig: WorkerRig, bendAmount: number, isCarrying: boolean) {
  // bendAmount from 0 (standing) to 1 (full bend down)
  rig.torsoGroup.position.y = 0.88 - bendAmount * 0.28;
  rig.torsoGroup.rotation.x = bendAmount * 0.72; // deep bend at waist

  rig.legL.rotation.set(-bendAmount * 0.45, 0, 0);
  rig.shinL.rotation.set(bendAmount * 0.85, 0, 0);
  rig.legR.rotation.set(-bendAmount * 0.45, 0, 0);
  rig.shinR.rotation.set(bendAmount * 0.85, 0, 0);

  if (isCarrying) {
    rig.armL.rotation.set(-0.55 + bendAmount * 0.3, 0.1, 0);
    rig.forearmL.rotation.set(-1.1 + bendAmount * 0.2, 0, 0);
    rig.armR.rotation.set(-0.55 + bendAmount * 0.3, -0.1, 0);
    rig.forearmR.rotation.set(-1.1 + bendAmount * 0.2, 0, 0);
  } else {
    // Reaching down to grab
    rig.armL.rotation.set(-bendAmount * 0.65, 0, 0);
    rig.forearmL.rotation.set(-bendAmount * 0.4, 0, 0);
    rig.armR.rotation.set(-bendAmount * 0.65, 0, 0);
    rig.forearmR.rotation.set(-bendAmount * 0.4, 0, 0);
  }
}

// ---------------------------------------------------------------------------
// 1. Infeed Worker Agent (Depalletizer Can Feeder at X = -64)
// ---------------------------------------------------------------------------
export function createInfeedWorker(
  scene: THREE.Scene | THREE.Group,
  lineZ: number,
  isLine1: boolean
): InteractiveWorkerAgent {
  const vestColor = isLine1 ? workerMats.vestOrange : workerMats.vestLime;
  const { group, rig } = createArticulatedWorker({ vestColor });
  scene.add(group);

  // Pallet sits back safely in the staging zone
  const palletZ = lineZ + (isLine1 ? 3.4 : -3.4);
  const walkZ = lineZ + (isLine1 ? 1.8 : -1.8);

  const palletGroup = new THREE.Group();
  palletGroup.position.set(-67.5, 0, palletZ);

  // Wooden staging pallet
  const stagingPallet = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 1.4), workerMats.woodPallet);
  stagingPallet.position.y = 0.08;
  palletGroup.add(stagingPallet);

  // Staged empty can trays on pallet
  for (let l = 0; l < 2; l++) {
    const stackBox = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.24, 1.1), workerMats.cardboardBox);
    stackBox.position.y = 0.22 + l * 0.26;
    palletGroup.add(stackBox);
  }
  scene.add(palletGroup);

  // Worker stands safely in front of the pallet in the clear walkway (never inside the pallet!)
  const standAtPallet = new THREE.Vector3(-67.5, 0, walkZ);
  const infeedPos = new THREE.Vector3(-63.5, 0, walkZ);

  // Carried box prop attached to worker's chest
  const carriedBox = createCanBoxProp();
  rig.propMountChest.add(carriedBox);
  carriedBox.visible = false;

  const cycleDuration = 11.0; // seconds per cycle

  const update = (elapsedTime: number, speedMultiplier: number, isRunning: boolean, realTime: number = 0) => {
    if (!isRunning && elapsedTime > 0) {
      // PAUSED: Freeze exactly in current position, pose, and carried box state
      return;
    }

    if (!isRunning || elapsedTime === 0) {
      // STANDBY / RESET: Stand alert at infeed table, breathing and ready
      resetWorkerPose(rig);
      group.position.copy(infeedPos);
      group.rotation.y = isLine1 ? Math.PI : 0;
      carriedBox.visible = false;
      const breath = Math.sin(realTime * 1.8) * 0.02;
      rig.torsoGroup.position.y = 0.88 + breath;
      rig.armL.rotation.set(-0.35, 0.15, 0.05);
      rig.forearmL.rotation.set(-0.45, 0, 0);
      rig.armR.rotation.set(-0.35, -0.15, -0.05);
      rig.forearmR.rotation.set(-0.45, 0, 0);
      rig.headGroup.rotation.x = 0.12 + Math.sin(realTime * 1.2) * 0.03;
      return;
    }

    const t = ((elapsedTime * (speedMultiplier || 1.0)) / cycleDuration) % 1.0;
    const walkSpeed = 20.0 * (speedMultiplier || 1.0);

    if (t < 0.28) {
      // Phase 1: Walking empty-handed from infeed table back to pallet
      carriedBox.visible = false;
      const alpha = t / 0.28;
      group.position.lerpVectors(infeedPos, standAtPallet, alpha);
      group.rotation.y = -Math.PI / 2; // walks in -X direction
      applyWorkerWalkPose(rig, elapsedTime * walkSpeed, false);
    } else if (t < 0.42) {
      // Phase 2: Standing in front of pallet, lifting new box of empty cans
      group.position.copy(standAtPallet);
      group.rotation.y = isLine1 ? 0 : Math.PI; // faces the pallet cleanly at +Z/-Z
      resetWorkerPose(rig);

      const subT = (t - 0.28) / 0.14;
      // Reaches arms forward to lift from pallet (feet and hips stay outside!)
      rig.torsoGroup.position.y = 0.88 - Math.sin(subT * Math.PI) * 0.06;
      rig.armL.rotation.set(-0.65, 0.15, 0.1);
      rig.forearmL.rotation.set(-0.85, 0, 0);
      rig.armR.rotation.set(-0.65, -0.15, -0.1);
      rig.forearmR.rotation.set(-0.85, 0, 0);

      carriedBox.visible = subT > 0.45;
    } else if (t < 0.72) {
      // Phase 3: Walking along walkway carrying box of cans to depalletizer infeed
      carriedBox.visible = true;
      const alpha = (t - 0.42) / 0.3;
      group.position.lerpVectors(standAtPallet, infeedPos, alpha);
      group.rotation.y = Math.PI / 2; // walks in +X direction
      applyWorkerWalkPose(rig, elapsedTime * walkSpeed, true);
    } else if (t < 0.90) {
      // Phase 4: Standing at infeed table and guiding cans onto the infeed chute
      group.position.copy(infeedPos);
      group.rotation.y = isLine1 ? Math.PI : 0; // facing conveyor machine
      carriedBox.visible = true;

      const feedT = (t - 0.72) / 0.18;
      const pourTilt = Math.sin(feedT * Math.PI) * 0.55; // gentle tilt forward

      resetWorkerPose(rig);
      rig.torsoGroup.rotation.x = pourTilt * 0.35;
      rig.armL.rotation.set(-0.75 - pourTilt * 0.35, 0.15, 0.1);
      rig.forearmL.rotation.set(-0.9 - pourTilt * 0.2, 0, 0);
      rig.armR.rotation.set(-0.75 - pourTilt * 0.35, -0.15, -0.1);
      rig.forearmR.rotation.set(-0.9 - pourTilt * 0.2, 0, 0);
      carriedBox.rotation.x = -pourTilt;
      rig.headGroup.rotation.x = pourTilt * 0.3; // head looks down at table
    } else {
      // Phase 5: Straightens up, empties tray, turns back towards walkway
      group.position.copy(infeedPos);
      carriedBox.visible = false;
      carriedBox.rotation.set(0, 0, 0);
      resetWorkerPose(rig);
      const readyT = (t - 0.90) / 0.10;
      group.rotation.y = THREE.MathUtils.lerp(
        isLine1 ? Math.PI : 0,
        -Math.PI / 2,
        readyT
      );
    }
  };

  const dispose = () => {
    scene.remove(group, palletGroup);
  };

  return { group, rig, name: `InfeedWorker_${isLine1 ? 'L1' : 'L2'}`, update, dispose };
}

// ---------------------------------------------------------------------------
// 2. Syrup Blending Technician (Tank & Skid Operator at X = -30)
// ---------------------------------------------------------------------------
export function createBlendingWorker(
  scene: THREE.Scene | THREE.Group,
  mixingZ: number,
  isLine1: boolean
): InteractiveWorkerAgent {
  const vestColor = isLine1 ? workerMats.vestOrange : workerMats.vestLime;
  const { group, rig } = createArticulatedWorker({ vestColor, hardhatMat: workerMats.hardhatWhite });
  scene.add(group);

  // Positioned directly on equipment pad in front of HMI control console and sampling valve
  const consolePos = new THREE.Vector3(-28.0, 0, mixingZ + 2.1);
  const valvePos = new THREE.Vector3(-28.2, 0, mixingZ + 0.8);

  // Glass flask attached to left hand
  const flask = createSampleFlaskProp();
  rig.handMountL.add(flask);
  flask.position.set(0, -0.06, 0.08);

  const cycleDuration = 10.0;

  const update = (elapsedTime: number, speedMultiplier: number, isRunning: boolean, realTime: number = 0) => {
    if (!isRunning && elapsedTime > 0) {
      // PAUSED: Freeze exactly in current position, pose, and flask
      return;
    }

    if (!isRunning || elapsedTime === 0) {
      // STANDBY / RESET: At the syrup touchscreen console, monitoring tank gauges
      resetWorkerPose(rig);
      group.position.copy(consolePos);
      group.rotation.y = Math.PI; // faces console at -Z
      const breath = Math.sin(realTime * 1.8) * 0.02;
      rig.torsoGroup.position.y = 0.88 + breath;
      // Left hand cradles the testing flask
      rig.armL.rotation.set(-0.4, 0.15, -0.1);
      rig.forearmL.rotation.set(-0.6, 0, 0);
      // Right hand resting near the console controls
      rig.armR.rotation.set(-0.55, -0.15, 0.05);
      rig.forearmR.rotation.set(-0.4, 0, 0);
      rig.headGroup.rotation.x = 0.14 + Math.sin(realTime * 1.2) * 0.03;
      return;
    }

    const t = ((elapsedTime * (speedMultiplier || 1.0)) / cycleDuration) % 1.0;
    const walkSpeed = 18.0 * (speedMultiplier || 1.0);

    if (t < 0.4) {
      // Phase 1: Operating HMI Touchscreen Console
      group.position.copy(consolePos);
      group.rotation.y = Math.PI; // facing console at -Z
      resetWorkerPose(rig);

      // Right arm taps touchscreen buttons
      const tapWave = Math.sin(elapsedTime * 8);
      rig.armR.rotation.set(-1.1 + tapWave * 0.15, -0.2, 0.1);
      rig.forearmR.rotation.set(-0.8 + tapWave * 0.2, 0, 0);

      // Left hand holds test flask casually
      rig.armL.rotation.set(-0.4, 0.15, -0.1);
      rig.forearmL.rotation.set(-0.6, 0, 0);

      // Head nods reading tank levels
      rig.headGroup.rotation.x = 0.15 + Math.sin(elapsedTime * 2.5) * 0.1;
      rig.headGroup.rotation.y = Math.sin(elapsedTime * 1.8) * 0.18;
    } else if (t < 0.5) {
      // Phase 2: Walking over to the tank sampling valve
      const alpha = (t - 0.4) / 0.1;
      group.position.lerpVectors(consolePos, valvePos, alpha);
      const faceAngle = Math.atan2(valvePos.x - consolePos.x, valvePos.z - consolePos.z);
      group.rotation.y = faceAngle;
      applyWorkerWalkPose(rig, elapsedTime * walkSpeed, false);
    } else if (t < 0.85) {
      // Phase 3: Drawing liquid sample from tank valve and inspecting clarity
      group.position.copy(valvePos);
      group.rotation.y = Math.PI; // facing tank pump & sampling valve at -Z
      resetWorkerPose(rig);

      const subT = (t - 0.5) / 0.35;
      if (subT < 0.4) {
        // Turning valve lever with right hand, holding flask under valve
        rig.torsoGroup.rotation.x = 0.22;
        rig.armR.rotation.set(-0.9, -0.2, 0);
        rig.forearmR.rotation.set(-0.7, 0, 0);
        rig.armL.rotation.set(-0.7, 0.2, 0);
        rig.forearmL.rotation.set(-1.2, 0, 0);
      } else {
        // Lifting sample flask up to eye level, checking color & bubbles
        rig.armL.rotation.set(-1.25, 0.3, 0);
        rig.forearmL.rotation.set(-1.3, 0, 0);
        rig.headGroup.rotation.x = -0.25; // tilting head back to inspect
        rig.headGroup.rotation.y = -0.2;
      }
    } else {
      // Phase 4: Walking back to console
      const alpha = (t - 0.85) / 0.15;
      group.position.lerpVectors(valvePos, consolePos, alpha);
      const faceAngle = Math.atan2(consolePos.x - valvePos.x, consolePos.z - valvePos.z);
      group.rotation.y = faceAngle;
      applyWorkerWalkPose(rig, elapsedTime * walkSpeed, false);
    }
  };

  const dispose = () => {
    scene.remove(group);
  };

  return { group, rig, name: `BlendingTech_${isLine1 ? 'L1' : 'L2'}`, update, dispose };
}

// ---------------------------------------------------------------------------
// 3. Can Seamer Operator (Lid Hopper Feeder at X = 10.8)
// ---------------------------------------------------------------------------
export function createSeamerWorker(
  scene: THREE.Scene | THREE.Group,
  lineZ: number,
  isLine1: boolean
): InteractiveWorkerAgent {
  const vestColor = isLine1 ? workerMats.vestOrange : workerMats.vestLime;
  const { group, rig } = createArticulatedWorker({ vestColor });
  scene.add(group);

  // Storage rack placed safely behind the worker walkway
  const rackZ = lineZ + (isLine1 ? 3.2 : -3.2);
  const walkZ = lineZ + (isLine1 ? 1.9 : -1.9);

  const rackGroup = new THREE.Group();
  const lidRack = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.3, 0.7), metalMat(darkSteelColor));
  lidRack.position.set(7.5, 0.65, rackZ);
  rackGroup.add(lidRack);
  [-0.2, 0.2].forEach((dx) => {
    const spareSleeve = createLidSleeveProp();
    spareSleeve.position.set(7.5 + dx, 1.45, rackZ);
    rackGroup.add(spareSleeve);
  });
  scene.add(rackGroup);

  // Worker stands in front of the rack in the clear walkway (never inside it!)
  const standAtRack = new THREE.Vector3(7.5, 0, walkZ);
  // Worker stands in front of seamer machine console & lid chute
  const seamerPos = new THREE.Vector3(12.0, 0, walkZ);

  // Carried lid sleeve prop
  const lidSleeve = createLidSleeveProp();
  rig.handMountR.add(lidSleeve);
  lidSleeve.position.set(0, 0.4, 0);
  lidSleeve.visible = false;

  const cycleDuration = 13.0;

  const update = (elapsedTime: number, speedMultiplier: number, isRunning: boolean, realTime: number = 0) => {
    if (!isRunning && elapsedTime > 0) {
      // PAUSED: Freeze exactly in current position, pose, and carried lid sleeve
      return;
    }

    if (!isRunning || elapsedTime === 0) {
      // STANDBY / RESET: Standing alert by the rotary seamer turret, ready to feed lids
      resetWorkerPose(rig);
      group.position.copy(seamerPos);
      group.rotation.y = isLine1 ? Math.PI : 0;
      lidSleeve.visible = false;
      const breath = Math.sin(realTime * 1.8) * 0.02;
      rig.torsoGroup.position.y = 0.88 + breath;
      rig.armL.rotation.set(-0.35, 0.1, 0.05);
      rig.forearmL.rotation.set(-0.45, 0, 0);
      rig.armR.rotation.set(-0.35, -0.1, -0.05);
      rig.forearmR.rotation.set(-0.45, 0, 0);
      rig.headGroup.rotation.x = 0.1 + Math.sin(realTime * 1.2) * 0.03;
      return;
    }

    const t = ((elapsedTime * (speedMultiplier || 1.0)) / cycleDuration) % 1.0;
    const walkSpeed = 20.0 * (speedMultiplier || 1.0);

    if (t < 0.28) {
      // Phase 1: At rack, picking up new sleeve of can ends
      group.position.copy(standAtRack);
      group.rotation.y = isLine1 ? 0 : Math.PI; // faces rack directly (+Z for line 1, -Z for line 2)
      lidSleeve.visible = t > 0.14;
      resetWorkerPose(rig);
      rig.armR.rotation.set(-0.8, -0.1, 0);
      rig.forearmR.rotation.set(-0.9, 0, 0);
      rig.armL.rotation.set(-0.8, 0.1, 0);
      rig.forearmL.rotation.set(-0.9, 0, 0);
    } else if (t < 0.52) {
      // Phase 2: Walking along walkway to Seamer holding the tall sleeve vertically
      lidSleeve.visible = true;
      const alpha = (t - 0.28) / 0.24;
      group.position.lerpVectors(standAtRack, seamerPos, alpha);
      group.rotation.y = Math.PI / 2; // walks in +X direction
      applyWorkerWalkPose(rig, elapsedTime * walkSpeed, true);
    } else if (t < 0.78) {
      // Phase 3: Loading lids overhead into vertical chute at seamer
      group.position.copy(seamerPos);
      group.rotation.y = isLine1 ? Math.PI : 0; // facing seamer machine
      lidSleeve.visible = true;
      resetWorkerPose(rig);

      const loadT = (t - 0.52) / 0.26;
      const reachProgress = Math.sin(loadT * Math.PI);

      // Reaching both arms high overhead
      rig.armR.rotation.set(-1.8 - reachProgress * 0.4, -0.2, -0.15);
      rig.forearmR.rotation.set(-0.5, 0, 0);
      rig.armL.rotation.set(-1.8 - reachProgress * 0.4, 0.2, 0.15);
      rig.forearmL.rotation.set(-0.5, 0, 0);
      rig.headGroup.rotation.x = -0.4; // head tilted up looking at top chute
      lidSleeve.rotation.x = Math.PI - reachProgress * 0.3; // sleeve inverted over chute
    } else {
      // Phase 4: Checking dial gauge, walking back to rack along walkway
      lidSleeve.visible = false;
      lidSleeve.rotation.set(0, 0, 0);
      const alpha = (t - 0.78) / 0.22;
      group.position.lerpVectors(seamerPos, standAtRack, alpha);
      group.rotation.y = -Math.PI / 2; // walks in -X direction
      applyWorkerWalkPose(rig, elapsedTime * walkSpeed, false);
    }
  };

  const dispose = () => {
    scene.remove(group, rackGroup);
  };

  return { group, rig, name: `SeamerWorker_${isLine1 ? 'L1' : 'L2'}`, update, dispose };
}

// ---------------------------------------------------------------------------
// 4. Full Can QA Inspector (Station 05 at X = 20)
// ---------------------------------------------------------------------------
export function createQAWorker(
  scene: THREE.Scene | THREE.Group,
  lineZ: number,
  isLine1: boolean
): InteractiveWorkerAgent {
  const vestColor = isLine1 ? workerMats.vestOrange : workerMats.vestLime;
  const { group, rig } = createArticulatedWorker({ vestColor, hardhatMat: workerMats.hardhatWhite });
  scene.add(group);

  const standPos = new THREE.Vector3(20.0, 0, lineZ + (isLine1 ? 1.7 : -1.7));
  group.position.copy(standPos);
  group.rotation.y = isLine1 ? Math.PI : 0; // facing conveyor belt and optical inspector

  // Tablet attached to left hand
  const tablet = createTabletProp();
  rig.handMountL.add(tablet);
  tablet.position.set(0, -0.04, 0.12);
  tablet.rotation.set(-Math.PI / 4, 0, 0);

  // Sample can for right hand
  const testCan = createTestCanProp();
  rig.handMountR.add(testCan);
  testCan.position.set(0, -0.06, 0.06);
  testCan.visible = false;

  const cycleDuration = 8.5;

  const update = (elapsedTime: number, speedMultiplier: number, isRunning: boolean, realTime: number = 0) => {
    if (!isRunning && elapsedTime > 0) {
      // PAUSED: Freeze exactly in current position, pose, and sample can state
      return;
    }

    if (!isRunning || elapsedTime === 0) {
      // STANDBY / RESET: Holding digital inspection tablet in both hands, ready for cans
      resetWorkerPose(rig);
      group.position.copy(standPos);
      group.rotation.y = isLine1 ? Math.PI : 0;
      testCan.visible = false;
      const breath = Math.sin(realTime * 1.8) * 0.02;
      rig.torsoGroup.position.y = 0.88 + breath;
      // Holding tablet with both hands in front of chest
      rig.armL.rotation.set(-0.75, 0.25, 0);
      rig.forearmL.rotation.set(-1.15, 0, 0);
      rig.armR.rotation.set(-0.55, -0.1, 0);
      rig.forearmR.rotation.set(-0.9, 0, 0);
      rig.headGroup.rotation.x = 0.22 + Math.sin(realTime * 1.2) * 0.03;
      return;
    }

    const t = ((elapsedTime * (speedMultiplier || 1.0)) / cycleDuration) % 1.0;
    resetWorkerPose(rig);
    group.rotation.y = isLine1 ? Math.PI : 0; // directly face conveyor & optical inspection machine

    // Left hand constantly cradles the inspection tablet
    rig.armL.rotation.set(-0.75, 0.25, 0);
    rig.forearmL.rotation.set(-1.15, 0, 0);

    if (t < 0.25) {
      // Phase 1: Reaching right arm out over conveyor to grab a can
      testCan.visible = false;
      const reachT = t / 0.25;
      rig.armR.rotation.set(-0.6 - reachT * 0.45, -0.15, 0.1);
      rig.forearmR.rotation.set(-0.4 - reachT * 0.5, 0, 0);
      rig.headGroup.rotation.x = 0.25; // looking down at conveyor
    } else if (t < 0.65) {
      // Phase 2: Lifting test can up to eye level, rotating wrist to check seam & label
      testCan.visible = true;
      const inspectT = (t - 0.25) / 0.4;
      const wristSpin = inspectT * Math.PI * 2;

      rig.armR.rotation.set(-1.15, -0.2, 0.1);
      rig.forearmR.rotation.set(-1.25, wristSpin * 0.3, 0);
      testCan.rotation.y = wristSpin;

      rig.headGroup.rotation.x = 0.05;
      rig.headGroup.rotation.y = -0.15 + Math.sin(inspectT * Math.PI * 2) * 0.15;
    } else if (t < 0.82) {
      // Phase 3: Tapping tablet to log QA pass status
      testCan.visible = true;
      rig.armR.rotation.set(-0.7, 0.15, 0);
      rig.forearmR.rotation.set(-1.1, 0, 0); // finger near tablet screen
      const tap = Math.sin(elapsedTime * 12) * 0.08;
      rig.forearmR.rotation.x += tap;
      rig.headGroup.rotation.x = 0.3; // head looking down at tablet
    } else {
      // Phase 4: Setting test can back down on conveyor
      const returnT = (t - 0.82) / 0.18;
      testCan.visible = returnT < 0.8;
      rig.armR.rotation.set(-1.05 + returnT * 0.5, -0.1, 0);
      rig.forearmR.rotation.set(-1.1 + returnT * 0.6, 0, 0);
    }
  };

  const dispose = () => {
    scene.remove(group);
  };

  return { group, rig, name: `QAInspector_${isLine1 ? 'L1' : 'L2'}`, update, dispose };
}

// ---------------------------------------------------------------------------
// 5. Case Packer Operator (Packing 6-Packs into Master Cartons at Station 06)
// ---------------------------------------------------------------------------
export function createPackerWorker(
  scene: THREE.Scene | THREE.Group,
  lineZ: number,
  isLine1: boolean
): InteractiveWorkerAgent {
  const vestColor = isLine1 ? workerMats.vestOrange : workerMats.vestLime;
  const { group, rig } = createArticulatedWorker({ vestColor, hardhatMat: workerMats.hardhatYellow });
  scene.add(group);

  // Operator stands at the packaging station table parallel to the conveyor (Station 06 at X = 28.6)
  const walkZ = lineZ + (isLine1 ? 1.55 : -1.55);
  group.position.set(28.6, 0, walkZ);
  group.rotation.y = isLine1 ? Math.PI : 0; // facing forward towards the conveyor and packaging table

  const stationProps = new THREE.Group();

  // 1. Stainless Ergonomic Packaging Workstation Table (between worker and conveyor belt)
  const tableZ = lineZ + (isLine1 ? 0.96 : -0.96);
  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.08, 0.72),
    metalMat(steelColor)
  );
  tableTop.position.set(28.6, 0.88, tableZ);
  stationProps.add(tableTop);

  // 4 Steel table support legs
  [-0.7, 0.7].forEach((tx) => {
    [-0.28, 0.28].forEach((tz) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.88, 8),
        metalMat(darkSteelColor)
      );
      leg.position.set(28.6 + tx, 0.44, tableZ + tz);
      stationProps.add(leg);
    });
  });

  // 2. Master Corrugated Shipping Carton (holding four 6-pack small boxes = 24 cans)
  const masterCarton = new THREE.Group();
  masterCarton.position.set(28.6, 0.92, tableZ);

  const cartonMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.84, 0.24, 0.58),
    workerMats.cardboardBox
  );
  cartonMesh.position.y = 0.12;
  masterCarton.add(cartonMesh);

  // Open top flaps angled outwards
  [-0.28, 0.28].forEach((fz) => {
    const flap = new THREE.Mesh(
      new THREE.BoxGeometry(0.84, 0.015, 0.1),
      workerMats.cardboardBox
    );
    flap.rotation.x = fz < 0 ? -0.4 : 0.4;
    flap.position.set(0, 0.24, fz);
    masterCarton.add(flap);
  });

  // Three 6-pack small boxes already packed inside 3 of the 4 quadrants:
  // Quadrant 1 (back-left):
  const p1 = createSmallPackProp();
  p1.position.set(-0.2, 0.12, -0.13);
  // Quadrant 2 (back-right):
  const p2 = createSmallPackProp();
  p2.position.set(0.2, 0.12, -0.13);
  // Quadrant 3 (front-left):
  const p3 = createSmallPackProp();
  p3.position.set(-0.2, 0.12, 0.13);
  masterCarton.add(p1, p2, p3);

  stationProps.add(masterCarton);

  // 3. Small Box Gravity Infeed Roller Chute (where incoming 6-packs arrive from multipacker)
  const infeedZ = lineZ + (isLine1 ? 1.35 : -1.35);
  const rollerTray = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.06, 0.42),
    metalMat(steelColor)
  );
  rollerTray.position.set(27.0, 0.88, infeedZ);
  rollerTray.rotation.y = isLine1 ? 0.22 : -0.22;
  stationProps.add(rollerTray);

  const infeedLeg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.88, 8),
    metalMat(darkSteelColor)
  );
  infeedLeg.position.set(26.6, 0.44, infeedZ);
  stationProps.add(infeedLeg);

  // Queued small box waiting on infeed rollers
  const queuedBox = createSmallPackProp();
  queuedBox.position.set(26.8, 0.95, infeedZ);
  queuedBox.rotation.y = isLine1 ? 0.22 : -0.22;
  stationProps.add(queuedBox);

  // 4. Staged supply pallet with carton blanks behind the workstation
  const blankPalletZ = lineZ + (isLine1 ? 2.7 : -2.7);
  const supplyPallet = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 1.2), workerMats.woodPallet);
  supplyPallet.position.set(25.0, 0.08, blankPalletZ);
  stationProps.add(supplyPallet);

  for (let s = 0; s < 3; s++) {
    const blankBundle = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.95), workerMats.cardboardBox);
    blankBundle.position.set(25.0, 0.23 + s * 0.16, blankPalletZ);
    stationProps.add(blankBundle);
  }

  // 5. Digital HMI Packing Terminal on pedestal (to worker's right)
  const hmiZ = lineZ + (isLine1 ? 1.25 : -1.25);
  const hmiPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8),
    metalMat(darkSteelColor)
  );
  hmiPedestal.position.set(30.1, 0.7, hmiZ);
  const hmiScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.32, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 })
  );
  hmiScreen.position.set(30.1, 1.45, hmiZ);
  hmiScreen.rotation.y = isLine1 ? -0.35 : 0.35;
  const hmiFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.28),
    new THREE.MeshBasicMaterial({ color: 0x0284c7 })
  );
  hmiFace.position.set(30.1, 1.45, hmiZ + (isLine1 ? 0.035 : -0.035));
  hmiFace.rotation.y = isLine1 ? Math.PI - 0.35 : -0.35;
  stationProps.add(hmiPedestal, hmiScreen, hmiFace);

  scene.add(stationProps);

  // Active small 6-pack box being handled and placed by the worker
  const activeBox = createSmallPackProp();
  group.add(activeBox);

  const cycleDuration = 6.2;
  const dirX = isLine1 ? 1 : -1;

  const update = (elapsedTime: number, speedMultiplier: number, isRunning: boolean, realTime: number = 0) => {
    if (!isRunning && elapsedTime > 0) {
      // PAUSED: Freeze exactly in current position, pose, and packed carton state
      return;
    }

    if (!isRunning || elapsedTime === 0) {
      // STANDBY / RESET: Standing alert at packaging table with carton staged and ready
      resetWorkerPose(rig);
      group.position.set(28.6, 0, walkZ);
      group.rotation.y = isLine1 ? Math.PI : 0;
      const breath = Math.sin(realTime * 1.8) * 0.02;
      rig.torsoGroup.position.y = 0.88 + breath;
      rig.armL.rotation.set(-0.42, 0.12, 0.05);
      rig.forearmL.rotation.set(-0.65, 0, 0);
      rig.armR.rotation.set(-0.42, -0.12, -0.05);
      rig.forearmR.rotation.set(-0.65, 0, 0);
      rig.headGroup.rotation.x = 0.15 + Math.sin(realTime * 1.2) * 0.03;
      activeBox.position.set(0.62 * dirX, 0.92, 0.35);
      activeBox.rotation.set(0, 0.25 * dirX, 0);
      activeBox.visible = true; // carton blank ready on table
      return;
    }

    const t = ((elapsedTime * (speedMultiplier || 1.0)) / cycleDuration) % 1.0;

    if (t < 0.28) {
      // Phase 1: Reaching left towards infeed chute for the next small 6-pack
      const p = t / 0.28;
      resetWorkerPose(rig);
      rig.torsoGroup.rotation.y = Math.sin(p * Math.PI) * 0.35 * dirX;
      rig.headGroup.rotation.y = Math.sin(p * Math.PI) * 0.45 * dirX;
      rig.headGroup.rotation.x = 0.15;

      rig.armL.rotation.set(-0.95, 0.35 * dirX, 0.2 * dirX);
      rig.forearmL.rotation.set(-0.85, 0, 0);
      rig.armR.rotation.set(-0.85, -0.3 * dirX, -0.15 * dirX);
      rig.forearmR.rotation.set(-0.9, 0, 0);

      activeBox.position.set(0.62 * dirX, 0.92, 0.35);
      activeBox.rotation.set(0, 0.25 * dirX, 0);
      activeBox.visible = true;
    } else if (t < 0.50) {
      // Phase 2: Lifting the small box up to chest height and turning to face carton
      const p = (t - 0.28) / 0.22;
      resetWorkerPose(rig);
      rig.torsoGroup.rotation.y = 0.35 * (1 - p) * dirX;
      rig.headGroup.rotation.y = 0.45 * (1 - p) * dirX;
      rig.headGroup.rotation.x = 0.12;

      rig.armL.rotation.set(-0.75 - p * 0.2, 0.15 * dirX, 0.1 * dirX);
      rig.forearmL.rotation.set(-0.95, 0, 0);
      rig.armR.rotation.set(-0.75 - p * 0.2, -0.15 * dirX, -0.1 * dirX);
      rig.forearmR.rotation.set(-0.95, 0, 0);

      const bx = 0.62 * (1 - p) * dirX;
      const by = 0.92 + Math.sin(p * Math.PI) * 0.22 + p * 0.16;
      const bz = 0.35 + p * 0.11;
      activeBox.position.set(bx, by, bz);
      activeBox.rotation.set(0, 0.25 * (1 - p) * dirX, 0);
      activeBox.visible = true;
    } else if (t < 0.72) {
      // Phase 3: Lowering the small box directly into the 4th quadrant of the master carton
      const p = (t - 0.50) / 0.22;
      resetWorkerPose(rig);
      rig.torsoGroup.position.y = 0.88 - Math.sin(p * Math.PI) * 0.06;
      rig.torsoGroup.rotation.x = 0.12 * Math.sin(p * Math.PI);
      rig.headGroup.rotation.x = 0.25 + 0.15 * p;

      rig.armL.rotation.set(-0.95 - p * 0.25, 0.12 * dirX, 0.05 * dirX);
      rig.forearmL.rotation.set(-0.75 - p * 0.2, 0, 0);
      rig.armR.rotation.set(-0.95 - p * 0.25, -0.12 * dirX, -0.05 * dirX);
      rig.forearmR.rotation.set(-0.75 - p * 0.2, 0, 0);

      const bx = p * 0.18 * dirX;
      const by = 1.08 - p * 0.14;
      const bz = 0.46 + p * 0.22;
      activeBox.position.set(bx, by, bz);
      activeBox.rotation.set(0, 0, 0);
      activeBox.visible = true;
    } else if (t < 0.86) {
      // Phase 4: Tamping flaps and pressing down to seal the carton
      const p = (t - 0.72) / 0.14;
      resetWorkerPose(rig);
      const tamp = Math.sin(p * Math.PI * 4);
      rig.armL.rotation.set(-1.12 + tamp * 0.08, 0.14 * dirX, 0.05 * dirX);
      rig.forearmL.rotation.set(-0.85, 0, 0);
      rig.armR.rotation.set(-1.12 + tamp * 0.08, -0.14 * dirX, -0.05 * dirX);
      rig.forearmR.rotation.set(-0.85, 0, 0);
      rig.headGroup.rotation.x = 0.35;

      activeBox.position.set(0.18 * dirX, 0.94, 0.68);
      activeBox.visible = true;
    } else {
      // Phase 5: Tapping HMI digital case counter to worker's right
      const p = (t - 0.86) / 0.14;
      resetWorkerPose(rig);
      rig.armL.rotation.set(-0.25, 0.1 * dirX, 0.1 * dirX);
      rig.forearmL.rotation.set(-0.2, 0, 0);

      rig.torsoGroup.rotation.y = -0.28 * Math.sin(p * Math.PI) * dirX;
      rig.armR.rotation.set(-1.1, -0.35 * dirX, -0.15 * dirX);
      rig.forearmR.rotation.set(-0.88, 0, 0);
      rig.headGroup.rotation.y = -0.32 * Math.sin(p * Math.PI) * dirX;
      rig.headGroup.rotation.x = 0.05;

      // When case completes, activeBox resets for the incoming unit
      activeBox.visible = p < 0.75;
    }
  };

  const dispose = () => {
    scene.remove(group, stationProps);
  };

  return { group, rig, name: `PackerOperator_${isLine1 ? 'L1' : 'L2'}`, update, dispose };
}

// ---------------------------------------------------------------------------
// 5B. Palletizer & Dispatcher Operator (Station 07 at X = 45.2)
// Takes the 24-can master carton ("24 CANS • TOTA TOLA") from the conveyor
// discharge (X = 44.2) and stacks it directly onto the dispatcher pallet turntable (X = 47.2)
// ---------------------------------------------------------------------------
export function createDispatcherWorker(
  scene: THREE.Scene | THREE.Group,
  lineZ: number,
  isLine1: boolean
): InteractiveWorkerAgent {
  const vestColor = isLine1 ? workerMats.vestOrange : workerMats.vestLime;
  const { group, rig } = createArticulatedWorker({ vestColor, hardhatMat: workerMats.hardhatYellow });
  scene.add(group);

  // Positioned directly at the Dispatcher station (Station 07)
  // between the conveyor discharge (X = 44.5) and pallet turntable (X = 47.2)
  const walkZ = lineZ + (isLine1 ? 1.35 : -1.35);
  group.position.set(45.2, 0, walkZ);
  group.rotation.y = isLine1 ? Math.PI : 0; // facing towards conveyor & palletizer

  const stationProps = new THREE.Group();

  // Dispatch manifest stand & digital barcode scanner pedestal (at X = 43.8)
  const standZ = lineZ + (isLine1 ? 1.2 : -1.2);
  const standPost = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 8), metalMat(darkSteelColor));
  standPost.position.set(43.8, 0.6, standZ);
  const standPlate = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.03), metalMat(steelColor));
  standPlate.position.set(43.8, 1.2, standZ);
  standPlate.rotation.x = -Math.PI / 4;
  stationProps.add(standPost, standPlate);

  scene.add(stationProps);

  // Active 24-can master carton ("24 CANS • TOTA TOLA") carried and placed onto the pallet
  const activeBox = createMasterCaseProp();
  group.add(activeBox);

  // Handheld barcode scanner in worker's right hand
  const scanner = new THREE.Group();
  const scBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.08), workerMats.beltDark);
  const scLaser = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.015, 0.01), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
  scLaser.position.set(0, -0.05, 0.045);
  scanner.add(scBody, scLaser);
  rig.handMountR.add(scanner);
  scanner.position.set(0, -0.1, 0.05);
  scanner.visible = false;

  const cycleDuration = 5.8;
  const dirX = isLine1 ? 1 : -1;

  const update = (elapsedTime: number, speedMultiplier: number, isRunning: boolean, realTime: number = 0) => {
    if (!isRunning && elapsedTime > 0) {
      // PAUSED: Freeze exactly in current position, pose, and master carton state
      return;
    }

    if (!isRunning || elapsedTime === 0) {
      // STANDBY / RESET: Standing alert beside turntable ready for master cartons
      resetWorkerPose(rig);
      group.position.set(45.2, 0, walkZ);
      group.rotation.y = isLine1 ? Math.PI : 0;
      const breath = Math.sin(realTime * 1.8) * 0.02;
      rig.torsoGroup.position.y = 0.88 + breath;
      rig.armL.rotation.set(-0.35, 0.1, 0.05);
      rig.forearmL.rotation.set(-0.45, 0, 0);
      rig.armR.rotation.set(-0.35, -0.1, -0.05);
      rig.forearmR.rotation.set(-0.45, 0, 0);
      rig.headGroup.rotation.x = 0.12 + Math.sin(realTime * 1.2) * 0.03;
      activeBox.position.set(0.8 * dirX, 1.05, 0.7);
      activeBox.rotation.set(0, 0, 0);
      activeBox.visible = true; // master carton waiting at conveyor discharge
      scanner.visible = false;
      return;
    }

    const t = ((elapsedTime * (speedMultiplier || 1.0)) / cycleDuration) % 1.0;

    if (t < 0.26) {
      // Phase 1: Reaching left to the conveyor belt end (X = 44.2) for the arriving 24-can carton
      const p = t / 0.26;
      resetWorkerPose(rig);
      scanner.visible = false;

      rig.torsoGroup.rotation.y = Math.sin(p * Math.PI) * 0.38 * dirX;
      rig.headGroup.rotation.y = Math.sin(p * Math.PI) * 0.45 * dirX;
      rig.headGroup.rotation.x = 0.18;

      rig.armL.rotation.set(-0.92, 0.35 * dirX, 0.2 * dirX);
      rig.forearmL.rotation.set(-0.85, 0, 0);
      rig.armR.rotation.set(-0.92, -0.35 * dirX, -0.15 * dirX);
      rig.forearmR.rotation.set(-0.9, 0, 0);

      activeBox.position.set(0.8 * dirX, 1.05, 0.7);
      activeBox.rotation.set(0, 0, 0);
      activeBox.visible = true;
    } else if (t < 0.48) {
      // Phase 2: Lifting the 24-can carton up to chest height and pivoting toward the pallet turntable (X = 47.2)
      const p = (t - 0.26) / 0.22;
      resetWorkerPose(rig);
      scanner.visible = false;

      // Turning from conveyor (+X_loc) toward pallet (-X_loc)
      rig.torsoGroup.rotation.y = (0.38 * (1 - p) - 0.38 * p) * dirX;
      rig.headGroup.rotation.y = (0.45 * (1 - p) - 0.42 * p) * dirX;
      rig.headGroup.rotation.x = 0.12;

      rig.armL.rotation.set(-0.82 - p * 0.15, 0.25 * dirX, 0.18 * dirX);
      rig.forearmL.rotation.set(-0.95, 0, 0);
      rig.armR.rotation.set(-0.82 - p * 0.15, -0.25 * dirX, -0.18 * dirX);
      rig.forearmR.rotation.set(-0.95, 0, 0);

      const bx = (0.8 * (1 - p) - 0.5 * p) * dirX;
      const by = 1.05 + Math.sin(p * Math.PI) * 0.22 + p * 0.1;
      const bz = 0.7 + p * 0.12;
      activeBox.position.set(bx, by, bz);
      activeBox.rotation.set(0, -0.2 * p * dirX, 0);
      activeBox.visible = true;
    } else if (t < 0.72) {
      // Phase 3: Lowering the 24-can carton onto the dispatcher pallet stack at X = 47.0
      const p = (t - 0.48) / 0.24;
      resetWorkerPose(rig);
      scanner.visible = false;

      rig.torsoGroup.position.y = 0.88 - Math.sin(p * Math.PI) * 0.08;
      rig.torsoGroup.rotation.x = 0.14 * Math.sin(p * Math.PI);
      rig.torsoGroup.rotation.y = -0.38 * dirX;
      rig.headGroup.rotation.y = -0.42 * dirX;
      rig.headGroup.rotation.x = 0.25 + 0.18 * p;

      rig.armL.rotation.set(-0.97 - p * 0.25, 0.22 * dirX, 0.1 * dirX);
      rig.forearmL.rotation.set(-0.75 - p * 0.2, 0, 0);
      rig.armR.rotation.set(-0.97 - p * 0.25, -0.22 * dirX, -0.1 * dirX);
      rig.forearmR.rotation.set(-0.75 - p * 0.2, 0, 0);

      const bx = (-0.5 - p * 0.5) * dirX;
      const by = 1.15 - p * 0.38;
      const bz = 0.82 + p * 0.15;
      activeBox.position.set(bx, by, bz);
      activeBox.rotation.set(0, -0.2 * dirX, 0);
      activeBox.visible = true;
    } else if (t < 0.86) {
      // Phase 4: Patting down & squaring the 24-can carton neatly on the pallet stack
      const p = (t - 0.72) / 0.14;
      resetWorkerPose(rig);
      scanner.visible = false;

      const pat = Math.sin(p * Math.PI * 4);
      rig.torsoGroup.rotation.y = -0.38 * dirX;
      rig.armL.rotation.set(-1.18 + pat * 0.08, 0.2 * dirX, 0.08 * dirX);
      rig.forearmL.rotation.set(-0.85, 0, 0);
      rig.armR.rotation.set(-1.18 + pat * 0.08, -0.2 * dirX, -0.08 * dirX);
      rig.forearmR.rotation.set(-0.85, 0, 0);
      rig.headGroup.rotation.x = 0.35;
      rig.headGroup.rotation.y = -0.38 * dirX;

      activeBox.position.set(-1.0 * dirX, 0.77, 0.97);
      activeBox.visible = true;
    } else {
      // Phase 5: Barcode dispatch scan — points scanner at pallet label to confirm ready for forklift
      const p = (t - 0.86) / 0.14;
      resetWorkerPose(rig);
      activeBox.visible = p < 0.6; // placed box blends into pallet stack

      rig.armL.rotation.set(-0.25, 0.1 * dirX, 0.1 * dirX);
      rig.forearmL.rotation.set(-0.2, 0, 0);

      scanner.visible = true;
      rig.torsoGroup.rotation.y = -0.35 * dirX;
      rig.armR.rotation.set(-1.05, -0.22 * dirX, -0.1 * dirX);
      rig.forearmR.rotation.set(-0.45, 0, 0);
      rig.headGroup.rotation.y = -0.38 * dirX;
      rig.headGroup.rotation.x = 0.15;
    }
  };

  const dispose = () => {
    scene.remove(group, stationProps);
  };

  return { group, rig, name: `DispatcherOperator_${isLine1 ? 'L1' : 'L2'}`, update, dispose };
}

// ---------------------------------------------------------------------------
// 6. Forklift with Open Safety Cage & Seated Articulated Driver
// ---------------------------------------------------------------------------

export function createForkliftWithDriver(): THREE.Group {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.48, metalness: 0.28 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  const steelMat = metalMat(0x94a3b8);

  // Main forklift chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 1.4), bodyMat);
  chassis.position.y = 0.55;
  chassis.castShadow = true;

  // 4 Steel roll-cage pillars (open cab instead of solid block!)
  [-0.85, 0.15].forEach((cx) => {
    [-0.55, 0.55].forEach((cz) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), darkMat);
      pillar.position.set(cx, 1.55, cz);
      inner.add(pillar);
    });
  });

  // Roof overhead guard
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 1.25), bodyMat);
  roof.position.set(-0.35, 2.22, 0);

  // Ergonomic driver seat
  const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.55), darkMat);
  seatBase.position.set(-0.45, 1.05, 0);
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.52), darkMat);
  seatBack.position.set(-0.7, 1.5, 0);
  inner.add(seatBase, seatBack);

  // Steering column and steering wheel
  const steeringCol = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55), steelMat);
  steeringCol.rotation.z = -Math.PI / 6;
  steeringCol.position.set(-0.05, 1.35, 0);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 20), darkMat);
  wheel.rotation.y = Math.PI / 2;
  wheel.rotation.x = Math.PI / 6;
  wheel.position.set(-0.16, 1.55, 0);
  inner.add(steeringCol, wheel);

  // Seated articulated driver
  const { group: driverGroup, rig: driverRig } = createArticulatedWorker({
    vestColor: workerMats.vestOrange,
    hardhatMat: workerMats.hardhatYellow,
    scale: 0.95,
  });

  // Position driver in forklift seat
  driverGroup.position.set(-0.42, 0.72, 0);
  driverGroup.rotation.y = Math.PI / 2; // facing forward (+X direction in inner group)

  // Seated pose (hips bent 90 deg, knees bent 90 deg, hands on steering wheel)
  driverRig.torsoGroup.position.y = 0.52;
  driverRig.legL.rotation.set(-Math.PI / 2 + 0.1, 0, 0);
  driverRig.shinL.rotation.set(Math.PI / 2 - 0.1, 0, 0);
  driverRig.legR.rotation.set(-Math.PI / 2 + 0.1, 0, 0);
  driverRig.shinR.rotation.set(Math.PI / 2 - 0.1, 0, 0);

  driverRig.armL.rotation.set(-0.85, 0.15, 0.15);
  driverRig.forearmL.rotation.set(-0.75, 0, 0);
  driverRig.armR.rotation.set(-0.85, -0.15, -0.15);
  driverRig.forearmR.rotation.set(-0.75, 0, 0);

  inner.add(driverGroup);

  // Mast uprights
  const mastL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), darkMat);
  mastL.position.set(1.25, 1.4, -0.45);
  const mastR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), darkMat);
  mastR.position.set(1.25, 1.4, 0.45);

  // Steel lifting forks
  const forkBack = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 1.1), steelMat);
  forkBack.position.set(1.38, 0.75, 0);
  const forkL = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.14), steelMat);
  forkL.position.set(2.05, 0.42, -0.32);
  const forkR = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.14), steelMat);
  forkR.position.set(2.05, 0.42, 0.32);

  // Carried pallet of boxes
  const load = new THREE.Group();
  const palletMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 1.1), workerMats.woodPallet);
  palletMesh.position.set(2.1, 0.52, 0);
  load.add(palletMesh);
  const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.95), workerMats.cardboardBox);
  boxMesh.position.set(2.1, 1.16, 0);
  load.add(boxMesh);

  // 4 Industrial rubber wheels
  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.22, 16);
  wheelGeo.rotateX(Math.PI / 2);
  [
    [-0.8, 0.3, -0.75], [-0.8, 0.3, 0.75],
    [0.9, 0.3, -0.75], [0.9, 0.3, 0.75],
  ].forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.position.set(wx, wy, wz);
    inner.add(wheel);
  });

  inner.add(chassis, roof, mastL, mastR, forkBack, forkL, forkR, load);

  // Rotate inner group by -Math.PI / 2 so forward (+X) aligns with standard Three.js +Z heading
  inner.rotation.y = -Math.PI / 2;
  group.add(inner);
  group.scale.set(1.15, 1.15, 1.15);

  group.userData.inner = inner;
  group.userData.load = load;
  group.userData.driverRig = driverRig;

  return group;
}

// ---------------------------------------------------------------------------
// Orchestrator: Creates All Workers for Dual Canning Lines
// ---------------------------------------------------------------------------
export function createIndustrialWorkerAgents(scene: THREE.Scene | THREE.Group): {
  agents: InteractiveWorkerAgent[];
  updateDrivers: (forklifts: THREE.Group[], time: number, isRunning: boolean, realTime?: number) => void;
  dispose: () => void;
} {
  const agents: InteractiveWorkerAgent[] = [];

  // Line 1 (Z = -15) & Line 2 (Z = +15)
  [-15, 15].forEach((lineZ) => {
    const isLine1 = lineZ < 0;
    const mixingZ = isLine1 ? -20.5 : 9.5;

    // 1. Infeed can loader
    agents.push(createInfeedWorker(scene, lineZ, isLine1));

    // 2. Syrup blending skid technician
    agents.push(createBlendingWorker(scene, mixingZ, isLine1));

    // 3. Can seamer lid feeder
    agents.push(createSeamerWorker(scene, lineZ, isLine1));

    // 4. Full-can QA inspector
    agents.push(createQAWorker(scene, lineZ, isLine1));

    // 5. Case packer technician (Station 06)
    agents.push(createPackerWorker(scene, lineZ, isLine1));

    // 6. Palletizer & Dispatcher operator loading boxes onto the pallet turntable (Station 07)
    agents.push(createDispatcherWorker(scene, lineZ, isLine1));
  });

  // Driver head tracking updater for the 4 forklifts
  const updateDrivers = (forklifts: THREE.Group[], time: number, isRunning: boolean, realTime: number = 0) => {
    if (!isRunning && time > 0) {
      // PAUSED: Drivers freeze in their exact current posture
      return;
    }
    const t = isRunning ? time : realTime;
    forklifts.forEach((forklift, idx) => {
      const driverRig: WorkerRig | undefined = forklift.userData.driverRig;
      if (!driverRig) return;
      if (isRunning) {
        // Head subtly looks into turn curvature and breathes while driving
        driverRig.headGroup.rotation.y = Math.sin(t * 2.2 + idx) * 0.22;
        driverRig.headGroup.rotation.x = 0.05 + Math.cos(t * 1.5 + idx) * 0.05;
        driverRig.armL.rotation.z = 0.15 + Math.sin(t * 3 + idx) * 0.05;
        driverRig.armR.rotation.z = -0.15 - Math.sin(t * 3 + idx) * 0.05;
      } else {
        // Standby subtle idle breathing while seated at the wheel
        driverRig.headGroup.rotation.y = Math.sin(t * 0.8 + idx) * 0.06;
        driverRig.headGroup.rotation.x = 0.04 + Math.sin(t * 1.2 + idx) * 0.02;
        driverRig.torsoGroup.position.y = 0.52 + Math.sin(t * 1.4 + idx) * 0.008;
      }
    });
  };

  const dispose = () => {
    agents.forEach((agent) => agent.dispose());
  };

  return { agents, updateDrivers, dispose };
}
