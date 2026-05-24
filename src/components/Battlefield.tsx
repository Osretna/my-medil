import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameMap, Weapon, Skin, MatchScore } from '../types';
import { ALL_MAPS, synths } from '../gameData';
import { Shield, Target, Award, Play, RotateCcw, AlertTriangle, Swords, Crosshair, Sparkles } from 'lucide-react';

interface BattlefieldProps {
  activeMap: GameMap;
  equippedWeapon: Weapon;
  equippedSkin: Skin;
  playerLevel: number;
  onMatchFinished: (score: MatchScore) => void;
  onExit: () => void;
}

interface HumanoidModel {
  group: THREE.Group;
  leftLegGroup: THREE.Group;
  rightLegGroup: THREE.Group;
  leftArmGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  head: THREE.Mesh;
  helmet: THREE.Mesh;
  visor: THREE.Mesh;
  torso: THREE.Mesh;
}

// ==================== PROCEDURAL HIGH-FIDELITY MILITARY TEXTURE GENERATORS ====================
function createProceduralCamoTexture(baseHex: string, darkHex: string, lightHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  
  // Base uniform color
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 128, 128);
  
  // High contrast military splotches
  for (let i = 0; i < 35; i++) {
    ctx.fillStyle = Math.random() < 0.55 ? darkHex : lightHex;
    ctx.beginPath();
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const r = 6 + Math.random() * 15;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    
    // Splatter noise
    ctx.beginPath();
    ctx.arc(x + (Math.random() - 0.5) * r, y + (Math.random() - 0.5) * r, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

function createProceduralGroundTexture(mapId: string, baseHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);
  
  if (mapId === 'desert') {
    // Sandy gravel ground
    ctx.fillStyle = 'rgba(180, 83, 9, 0.16)';
    for (let i = 0; i < 1200; i++) {
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
    }
    // Sand dune ridges
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.07)';
    ctx.lineWidth = 3;
    for (let loop = 0; loop < 6; loop++) {
      ctx.beginPath();
      const y = loop * 45 + Math.random() * 10;
      ctx.moveTo(0, y);
      for (let x = 0; x <= 256; x += 25) {
        ctx.lineTo(x, y + Math.sin(x * 0.06) * 12);
      }
      ctx.stroke();
    }
    // High-fidelity random rocks
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? '#92400e' : '#b45309';
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, 1.5 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (mapId === 'city') {
    // Concrete cracks / Asphalt pits & yellow warning lines
    ctx.fillStyle = 'rgba(17, 24, 39, 0.22)';
    for (let i = 0; i < 900; i++) {
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    // Cracks
    ctx.strokeStyle = 'rgba(9, 9, 11, 0.65)';
    ctx.lineWidth = 1;
    for (let c = 0; c < 8; c++) {
      ctx.beginPath();
      let cx = Math.random() * 256;
      let cy = Math.random() * 256;
      ctx.moveTo(cx, cy);
      for (let j = 0; j < 5; j++) {
        cx += (Math.random() - 0.5) * 35;
        cy += (Math.random() - 0.5) * 35;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  } else {
    // Dense jungle floor with details
    ctx.fillStyle = 'rgba(6, 78, 59, 0.3)';
    for (let i = 0; i < 800; i++) {
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2.5, 2.5);
    }
    // Herbaceous grass clusters overlay
    ctx.strokeStyle = '#022c22';
    ctx.lineWidth = 1.6;
    for (let g = 0; g < 150; g++) {
      const gx = Math.random() * 256;
      const gy = Math.random() * 256;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx - 3, gy - 8);
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + 3, gy - 9);
      ctx.stroke();
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  return texture;
}

function createProceduralRustTexture(baseHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 64, 64);
  
  // Rust overlay
  ctx.fillStyle = 'rgba(154, 52, 18, 0.4)';
  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 64, Math.random() * 64, 2 + Math.random() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

// Procedural detailed humanoid soldier builder
function buildHumanoidSoldier(skinHexColor: string, isEnemy: boolean): HumanoidModel {
  const group = new THREE.Group();

  // Create customized military camouflage textures dynamically
  const camoUniformTex = createProceduralCamoTexture(
    isEnemy ? '#450a0a' : skinHexColor, 
    isEnemy ? '#111827' : '#1e293b', 
    isEnemy ? '#991b1b' : '#334155'
  );

  // Torso / tactical fatigue fabric mesh
  const torsoGeo = new THREE.BoxGeometry(0.55, 0.75, 0.35);
  const torsoMat = new THREE.MeshStandardMaterial({
    map: camoUniformTex,
    roughness: 0.8,
    metalness: 0.1
  });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.y = 0.8;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // Tactical combat armor plate vest on top of torso
  const vestGeo = new THREE.BoxGeometry(0.61, 0.55, 0.41);
  const vestMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? new THREE.Color('#310808') : new THREE.Color('#0f172a'),
    roughness: 0.6,
    metalness: 0.3
  });
  const vest = new THREE.Mesh(vestGeo, vestMat);
  vest.position.y = 0.01;
  vest.castShadow = true;
  torso.add(vest);

  // Add highly detailed front gear compartments (Ammo pouches & Grenades) on vest belt
  const pouchGeo = new THREE.BoxGeometry(0.14, 0.20, 0.12);
  const pouchMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  
  const rightPouch = new THREE.Mesh(pouchGeo, pouchMat);
  rightPouch.position.set(0.18, -0.15, 0.22);
  vest.add(rightPouch);

  const leftPouch = new THREE.Mesh(pouchGeo, pouchMat);
  leftPouch.position.set(-0.18, -0.15, 0.22);
  vest.add(leftPouch);

  // High-fidelity Tactical survival backpack (essential for realistic back view aesthetics)
  const backpackGroup = new THREE.Group();
  
  const packGeo = new THREE.BoxGeometry(0.46, 0.48, 0.20);
  const packMat = new THREE.MeshStandardMaterial({ map: camoUniformTex, roughness: 0.85 });
  const backpackMain = new THREE.Mesh(packGeo, packMat);
  backpackMain.position.set(0, 0.0, -0.25);
  backpackMain.castShadow = true;
  backpackGroup.add(backpackMain);

  // Sleeping bag roll sleeping mat on top of back kit
  const sleepRollGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.46, 8);
  const sleepRollMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const sleepRoll = new THREE.Mesh(sleepRollGeo, sleepRollMat);
  sleepRoll.rotation.z = Math.PI / 2;
  sleepRoll.position.set(0, 0.28, -0.28);
  backpackGroup.add(sleepRoll);

  // Detailed radio transceiver communication antenna rod
  const antennaGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.65, 4);
  const antennaMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 });
  const antenna = new THREE.Mesh(antennaGeo, antennaMat);
  antenna.position.set(0.16, 0.3, -0.28);
  backpackGroup.add(antenna);

  // Active tiny red tactical status signal light beacon
  const radioLightGeo = new THREE.SphereGeometry(0.03, 8, 8);
  const radioLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const radioLight = new THREE.Mesh(radioLightGeo, radioLightMat);
  radioLight.position.set(0.16, 0.62, -0.28);
  backpackGroup.add(radioLight);

  torso.add(backpackGroup);

  // Elegant anatomical Neck
  const neckGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.16, 12);
  const neckMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#fbcfe8'), roughness: 0.6 });
  const neck = new THREE.Mesh(neckGeo, neckMat);
  neck.position.y = 1.15;
  group.add(neck);

  // Human Spherical Head (replaces the box model for realism)
  const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#fbcfe8'), // skin flesh tone
    roughness: 0.55
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.34;
  head.castShadow = true;
  group.add(head);

  // Military combat helmets wrapping the head sphere
  const helmetGeo = new THREE.SphereGeometry(0.20, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.7);
  const helmetMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? new THREE.Color('#1f2937') : new THREE.Color('#14532d'), // deep green/combat gray
    roughness: 0.7,
    metalness: 0.25
  });
  const helmet = new THREE.Mesh(helmetGeo, helmetMat);
  helmet.position.set(0, 1.34, 0);
  helmet.rotation.x = -Math.PI / 25; // slightly forward tilt
  helmet.castShadow = true;
  group.add(helmet);

  // Goggles elastic strap going around head
  const strapGeo = new THREE.CylinderGeometry(0.205, 0.205, 0.05, 12, 1, true);
  const strapMat = new THREE.MeshStandardMaterial({ color: 0x09090b });
  const strap = new THREE.Mesh(strapGeo, strapMat);
  strap.position.set(0, 1.34, 0);
  group.add(strap);

  // High-tech glowing military HUD Visor / Tactical goggles
  const visorGeo = new THREE.BoxGeometry(0.28, 0.09, 0.08);
  const visorMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? new THREE.Color('#ef4444') : new THREE.Color('#06b6d4'),
    emissive: isEnemy ? new THREE.Color('#991b1b') : new THREE.Color('#0891b2'),
    metalness: 0.95,
    roughness: 0.05
  });
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 1.35, -0.17);
  group.add(visor);

  // Dual Night-Vision Goggles (NVG) scope mounts projecting forward (ultimate realism touch)
  const nvgGroup = new THREE.Group();
  nvgGroup.position.set(0, 1.45, -0.14);

  const nvgPipeGeo = new THREE.BoxGeometry(0.06, 0.05, 0.14);
  const nvgPipeMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
  const nvgPipe = new THREE.Mesh(nvgPipeGeo, nvgPipeMat);
  nvgGroup.add(nvgPipe);

  const nvgLensGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.18, 8);
  const nvgLensMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x15803d,
    roughness: 0.2
  });

  const leftLens = new THREE.Mesh(nvgLensGeo, nvgLensMat);
  leftLens.rotation.x = Math.PI / 2;
  leftLens.position.set(-0.08, -0.06, -0.12);
  nvgGroup.add(leftLens);

  const rightLens = new THREE.Mesh(nvgLensGeo, nvgLensMat);
  rightLens.rotation.x = Math.PI / 2;
  rightLens.position.set(0.08, -0.06, -0.12);
  nvgGroup.add(rightLens);

  helmet.add(nvgGroup);

  // Joint plates / protectors (Shoulder plates & Knee-pads for realistic look)
  const jointPadGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const jointPadMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#111827'), roughness: 0.7 });

  // Left Arm Group
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.4, 1.05, 0);
  const armGeo = new THREE.BoxGeometry(0.15, 0.55, 0.15);
  const armMat = new THREE.MeshStandardMaterial({
    map: camoUniformTex,
    roughness: 0.8
  });
  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.y = -0.25;
  leftArm.castShadow = true;
  leftArmGroup.add(leftArm);

  const lPlate = new THREE.Mesh(jointPadGeo, jointPadMat);
  lPlate.position.set(0, 0.05, 0);
  lPlate.castShadow = true;
  leftArmGroup.add(lPlate);
  group.add(leftArmGroup);

  // Right Arm Group
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.4, 1.05, 0);
  const rightArm = new THREE.Mesh(armGeo, armMat);
  rightArm.position.y = -0.25;
  rightArm.castShadow = true;
  rightArmGroup.add(rightArm);

  const rPlate = new THREE.Mesh(jointPadGeo, jointPadMat);
  rPlate.position.set(0, 0.05, 0);
  rPlate.castShadow = true;
  rightArmGroup.add(rPlate);
  group.add(rightArmGroup);

  // Legs and composite heavy combat boots with sole heels
  const legGeo = new THREE.BoxGeometry(0.16, 0.6, 0.16);
  const bootGeo = new THREE.BoxGeometry(0.19, 0.13, 0.26);
  const bootMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#09090b'), roughness: 0.9 });
  const kneePadGeo = new THREE.BoxGeometry(0.21, 0.13, 0.21);

  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.18, 0.45, 0);
  const leftLeg = new THREE.Mesh(legGeo, armMat);
  leftLeg.position.y = -0.25;
  leftLeg.castShadow = true;
  leftLegGroup.add(leftLeg);

  // Knee guard protector
  const lKneePad = new THREE.Mesh(kneePadGeo, jointPadMat);
  lKneePad.position.set(0, -0.25, 0.05);
  leftLegGroup.add(lKneePad);

  const lBoot = new THREE.Mesh(bootGeo, bootMat);
  lBoot.position.set(0, -0.55, -0.04);
  lBoot.castShadow = true;
  leftLegGroup.add(lBoot);
  group.add(leftLegGroup);

  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.18, 0.45, 0);
  const rightLeg = new THREE.Mesh(legGeo, armMat);
  rightLeg.position.y = -0.25;
  rightLeg.castShadow = true;
  rightLegGroup.add(rightLeg);

  // Knee guard protector
  const rKneePad = new THREE.Mesh(kneePadGeo, jointPadMat);
  rKneePad.position.set(0, -0.25, 0.05);
  rightLegGroup.add(rKneePad);

  const rBoot = new THREE.Mesh(bootGeo, bootMat);
  rBoot.position.set(0, -0.55, -0.04);
  rBoot.castShadow = true;
  rightLegGroup.add(rBoot);
  group.add(rightLegGroup);

  return {
    group,
    leftLegGroup,
    rightLegGroup,
    leftArmGroup,
    rightArmGroup,
    head,
    helmet,
    visor,
    torso
  };
}

// Procedural detailed mechanical weapon builder
function buildDetailedGun(weaponColor: string): THREE.Group {
  const gunGroup = new THREE.Group();
  
  // Tactical main rifle body frame
  const frameGeo = new THREE.BoxGeometry(0.1, 0.16, 0.7);
  const frameMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#27272a'), metalness: 0.8, roughness: 0.35 });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.castShadow = true;
  gunGroup.add(frame);
  
  // Custom colored accent shroud/handguard cover matching shop selection color
  const shroudGeo = new THREE.BoxGeometry(0.12, 0.13, 0.4);
  const shroudMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(weaponColor), metalness: 0.65, roughness: 0.2 });
  const shroud = new THREE.Mesh(shroudGeo, shroudMat);
  shroud.position.set(0, 0.01, -0.15);
  shroud.castShadow = true;
  gunGroup.add(shroud);

  // Extended barrel tube
  const barrelGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.45, 8);
  const barrelMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#18181b'), metalness: 0.9, roughness: 0.1 });
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.03, -0.42);
  barrel.castShadow = true;
  gunGroup.add(barrel);

  // Curved magazine/clip
  const magGeo = new THREE.BoxGeometry(0.07, 0.26, 0.14);
  const magMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#1e1b4b'), metalness: 0.7, roughness: 0.4 });
  const mag = new THREE.Mesh(magGeo, magMat);
  mag.position.set(0, -0.15, -0.05);
  mag.rotation.x = -Math.PI / 10;
  mag.castShadow = true;
  gunGroup.add(mag);

  // Scope sights
  const scopeGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.25, 8);
  const scopeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3f3f46'), metalness: 0.8, roughness: 0.2 });
  const scope = new THREE.Mesh(scopeGeo, scopeMat);
  scope.rotation.x = Math.PI / 2;
  scope.position.set(0, 0.12, -0.05);
  scope.castShadow = true;
  gunGroup.add(scope);

  // Holographic lens glowing ring
  const lensGeo = new THREE.CircleGeometry(0.028, 8);
  const lensMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#22c55e') });
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.position.set(0, 0.12, -0.18);
  gunGroup.add(lens);

  // Ergonomic gun handle
  const handleGeo = new THREE.BoxGeometry(0.07, 0.18, 0.07);
  const handle = new THREE.Mesh(handleGeo, frameMat);
  handle.position.set(0, -0.12, 0.18);
  handle.rotation.x = Math.PI / 5;
  gunGroup.add(handle);

  return gunGroup;
}

// Procedurally constructs hyper-realistic warfare objects for high-fidelity battlefield immersion
function buildTacticalObstacle(type: 'pillar' | 'barrel' | 'container', colorHex: string): THREE.Group {
  const obstacleGroup = new THREE.Group();
  const rustTex = createProceduralRustTexture(colorHex);

  if (type === 'pillar') {
    // 1. Broken concrete column ruins with vertical core grooves & reinforcement rebar wire
    const coreGeo = new THREE.CylinderGeometry(1.0, 1.1, 7.0, 10);
    const coreMat = new THREE.MeshStandardMaterial({
      map: rustTex,
      roughness: 0.9,
      metalness: 0.1
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.castShadow = true;
    core.receiveShadow = true;
    obstacleGroup.add(core);

    // Add 3 steel rebar wires sticking out of the broken top for ultimate realism
    const wireGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 4);
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.95, roughness: 0.2 });
    
    for (let r = 0; r < 3; r++) {
      const wire = new THREE.Mesh(wireGeo, wireMat);
      const angle = (r / 3) * Math.PI * 2;
      wire.position.set(Math.cos(angle) * 0.4, 3.8, Math.sin(angle) * 0.4);
      wire.rotation.z = (Math.random() - 0.5) * 0.3; // bent wire Look
      wire.rotation.x = (Math.random() - 0.5) * 0.3;
      obstacleGroup.add(wire);
    }
  } else if (type === 'barrel') {
    // 2. Industrial petroleum chemical fuel barrel with structural reinforcement rings
    const barrelGeo = new THREE.CylinderGeometry(0.8, 0.8, 2.4, 12);
    const barrelMat = new THREE.MeshStandardMaterial({
      map: rustTex,
      metalness: 0.75,
      roughness: 0.3
    });
    const mainBarrel = new THREE.Mesh(barrelGeo, barrelMat);
    mainBarrel.castShadow = true;
    mainBarrel.receiveShadow = true;
    obstacleGroup.add(mainBarrel);

    // Reinforcement metal banding rings around the barrel
    const ringGeo = new THREE.CylinderGeometry(0.84, 0.84, 0.08, 12, 1, true);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.4 });
    
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.position.y = 0.6;
    mainBarrel.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.position.y = -0.6;
    mainBarrel.add(ring2);

    // Hazard skull yellow/black caution stripes detail
    const stripeGeo = new THREE.CylinderGeometry(0.81, 0.81, 0.4, 12, 1, true);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.6 }); // yellow stripe
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = 0;
    mainBarrel.add(stripe);

    // Hazard bio-hazard glow indicator
    const glowGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x22c55e }); // glowing green sludge indicator
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, 0.82, 0);
    mainBarrel.add(glow);

  } else {
    // 3. Heavy steel military shipping supply cargo container with vertical metal siding ridges
    const baseBoxGeo = new THREE.BoxGeometry(4.0, 3.2, 4.0);
    const baseBoxMat = new THREE.MeshStandardMaterial({
      map: rustTex,
      roughness: 0.75,
      metalness: 0.5
    });
    const container = new THREE.Mesh(baseBoxGeo, baseBoxMat);
    container.castShadow = true;
    container.receiveShadow = true;
    obstacleGroup.add(container);

    // Build vertical metal structural sidetrack ridges on all 4 sides for realistic siding
    const ridgeGeo = new THREE.BoxGeometry(0.08, 3.12, 0.08);
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.5 });
    
    // Front and back ridges
    for (let f = -1.8; f <= 1.8; f += 0.6) {
      const ridgeFront = new THREE.Mesh(ridgeGeo, ridgeMat);
      ridgeFront.position.set(f, 0, 2.02);
      container.add(ridgeFront);

      const ridgeBack = new THREE.Mesh(ridgeGeo, ridgeMat);
      ridgeBack.position.set(f, 0, -2.02);
      container.add(ridgeBack);
    }

    // Left and right ridges
    for (let s = -1.8; s <= 1.8; s += 0.6) {
      const ridgeLeft = new THREE.Mesh(ridgeGeo, ridgeMat);
      ridgeLeft.position.set(-2.02, 0, s);
      container.add(ridgeLeft);

      const ridgeRight = new THREE.Mesh(ridgeGeo, ridgeMat);
      ridgeRight.position.set(2.02, 0, s);
      container.add(ridgeRight);
    }
  }

  return obstacleGroup;
}

export default function Battlefield({
  activeMap,
  equippedWeapon,
  equippedSkin,
  playerLevel,
  onMatchFinished,
  onExit
}: BattlefieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // HUD state
  const [health, setHealth] = useState(100);
  const [ammo, setAmmo] = useState(equippedWeapon.ammoCapacity);
  const [isReloading, setIsReloading] = useState(false);
  const [kills, setKills] = useState(0);
  const [wave, setWave] = useState(1);
  const [gameTime, setGameTime] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [readyCountdown, setReadyCountdown] = useState(3);
  const [gameStarted, setGameStarted] = useState(false);
  
  // Touch movements & aim trackpad systems bypass stale closures using state refs completely!
  const [touchMoving, setTouchMoving] = useState(false);
  const joystickCenter = useRef({ x: 0, y: 0 });
  const joystickCurrent = useRef({ x: 0, y: 0 });
  const joystickValue = useRef({ x: 0, y: 0 });

  const lastAimTouchX = useRef(0);
  const isAimTouching = useRef(false);

  // Single unified operational reference dictionary to avoid closure pitfalls
  const stateRef = useRef({
    health: 100,
    ammo: equippedWeapon.ammoCapacity,
    isReloading: false,
    kills: 0,
    wave: 1,
    time: 0,
    keys: { w: false, a: false, s: false, d: false, Space: false },
    lookAngle: 0,
    playerPos: new THREE.Vector3(0, 0.8, 0),
    speed: 0.15,
    touchMoving: false,
    joystickX: 0,
    joystickY: 0
  });

  // Hot swap reloads/weapon state changes
  useEffect(() => {
    stateRef.current.ammo = equippedWeapon.ammoCapacity;
    setAmmo(equippedWeapon.ammoCapacity);
  }, [equippedWeapon]);

  // Handle countdown sequences
  useEffect(() => {
    if (readyCountdown > 0) {
      const timer = setTimeout(() => {
        setReadyCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setGameStarted(true);
      synths.playLevelUp();
    }
  }, [readyCountdown]);

  // Main game stopwatch
  useEffect(() => {
    if (!gameStarted || gameOver || gameWon) return;
    const interval = setInterval(() => {
      setGameTime(prev => {
        const next = prev + 1;
        stateRef.current.time = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver, gameWon]);

  // Core 3D engine and game pipeline
  useEffect(() => {
    if (!gameStarted || gameOver || gameWon || !containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // 1. Create Scene & Atmospheric Fogs based on Map Colors
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(activeMap.primaryColor);
    scene.fog = new THREE.FogExp2(activeMap.fogColor, 0.035);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 12, 14);

    // 3. Renderer configuration
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    sunLight.position.set(50, 110, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 280;
    const d = 60;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // Dynamic ceiling spot highlight
    const spotLight = new THREE.SpotLight(0xffffff, 0.82);
    spotLight.position.set(0, 50, 0);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.15;
    scene.add(spotLight);

    // 5. Build High-Fidelity Textured Ground Plane
    const groundGeo = new THREE.PlaneGeometry(activeMap.groundSize, activeMap.groundSize);
    const groundTexture = createProceduralGroundTexture(activeMap.id, activeMap.primaryColor);
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 0.9,
      metalness: 0.15
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Tactical grids
    const grid = new THREE.GridHelper(activeMap.groundSize, activeMap.groundSize / 4, 0xef4444, 0x334155);
    grid.position.y = 0.01;
    scene.add(grid);

    // Real atmospheric wind particles (Desert dust storm, city ashes, green forest spores)
    const windParticles: { mesh: THREE.Mesh; speedX: number; speedY: number; speedZ: number }[] = [];
    const particleGeo = new THREE.DodecahedronGeometry(0.12, 0);
    const particleColor = activeMap.id === 'desert' ? '#d97706' : activeMap.id === 'city' ? '#9ca3af' : '#14532d';
    const particleMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(particleColor),
      transparent: true,
      opacity: 0.35
    });

    for (let p = 0; p < 130; p++) {
      const pm = new THREE.Mesh(particleGeo, particleMat);
      pm.position.set(
        (Math.random() - 0.5) * activeMap.groundSize,
        Math.random() * 8 + 0.1,
        (Math.random() - 0.5) * activeMap.groundSize
      );
      scene.add(pm);
      windParticles.push({
        mesh: pm,
        speedX: (Math.random() - 0.5) * 0.08 - 0.03, // steady drift direction
        speedY: (Math.random() - 0.5) * 0.02,
        speedZ: (Math.random() - 0.5) * 0.08 - 0.02
      });
    }

    // 6. Spawn Colliders Obstacles (Pillars, Barrels & Ridged Containers)
    const colliders: THREE.Box3[] = [];
    const obstacleMeshes: THREE.Object3D[] = [];
    
    const addBoundaryWall = (x: number, z: number, w: number, depth: number) => {
      const geo = new THREE.BoxGeometry(w, 5, depth);
      const boundaryTexture = createProceduralCamoTexture('#0f172a', '#020617', '#1e293b');
      const mat = new THREE.MeshStandardMaterial({ map: boundaryTexture, roughness: 0.95 });
      const wall = new THREE.Mesh(geo, mat);
      wall.position.set(x, 2.5, z);
      scene.add(wall);
      colliders.push(new THREE.Box3().setFromObject(wall));
    };

    const halfSize = activeMap.groundSize / 2;
    addBoundaryWall(0, -halfSize, activeMap.groundSize, 2);
    addBoundaryWall(0, halfSize, activeMap.groundSize, 2);
    addBoundaryWall(-halfSize, 0, 2, activeMap.groundSize);
    addBoundaryWall(halfSize, 0, 2, activeMap.groundSize);
    
    for (let s = 0; s < activeMap.obstaclesCount; s++) {
      // Determine what high-fidelity obstacle to spawn
      const obsType = s % 3 === 0 ? 'pillar' : s % 3 === 1 ? 'barrel' : 'container';
      
      const mesh = buildTacticalObstacle(obsType, activeMap.obstacleColor);
      
      let x = (Math.random() - 0.5) * (activeMap.groundSize - 18);
      let z = (Math.random() - 0.5) * (activeMap.groundSize - 18);
      // Spawn-protection zone around center
      if (Math.abs(x) < 10 && Math.abs(z) < 10) {
        x = x > 0 ? x + 10 : x - 10;
        z = z > 0 ? z + 10 : z - 10;
      }
      
      // Compute coordinate base height based on the obstacle geometry
      mesh.position.set(x, obsType === 'pillar' ? 3.5 : obsType === 'barrel' ? 1.2 : 1.6, z);
      
      // Random rotation values for high-fidelity broken debris looking layout
      mesh.rotation.y = Math.random() * Math.PI * 2;
      
      scene.add(mesh);
      obstacleMeshes.push(mesh);
      colliders.push(new THREE.Box3().setFromObject(mesh));
    }

    // 7. Render Player Humanoid Avatar
    const playerUnit = buildHumanoidSoldier(equippedSkin.color, false);
    const playerGroup = new THREE.Group();
    playerGroup.position.copy(stateRef.current.playerPos);
    playerGroup.add(playerUnit.group);

    // Render & mount player gun to their stance
    const playerDetailedGun = buildDetailedGun(equippedWeapon.color);
    playerDetailedGun.position.set(0.3, 1.0, -0.4);
    playerGroup.add(playerDetailedGun);

    // Glowing laser path line
    const laserMat = new THREE.LineBasicMaterial({ color: 0xef4444, opacity: 0.5, transparent: true });
    const laserPoints = [new THREE.Vector3(0.3, 1.04, -0.9), new THREE.Vector3(0.3, 1.04, -25)];
    const laserGeo = new THREE.BufferGeometry().setFromPoints(laserPoints);
    const laserLine = new THREE.Line(laserGeo, laserMat);
    playerGroup.add(laserLine);

    scene.add(playerGroup);

    // 8. Setup Enemies structures
    interface Enemy {
      mesh: THREE.Group;
      health: number;
      speed: number;
      lastShotTime: number;
      id: string;
      wanderAngle: number;
      unit: HumanoidModel;
    }
    const enemies: Enemy[] = [];

    const spawnEnemy = (id: string) => {
      const eGroup = new THREE.Group();
      const angle = Math.random() * Math.PI * 2;
      const distance = 25 + Math.random() * 25;
      const x = playerGroup.position.x + Math.cos(angle) * distance;
      const z = playerGroup.position.z + Math.sin(angle) * distance;
      
      eGroup.position.set(
        Math.max(-halfSize + 6, Math.min(halfSize - 6, x)),
        0, // Let leg coordinates sit directly on ground
        Math.max(-halfSize + 6, Math.min(halfSize - 6, z))
      );

      // Build red enemy humanoid model
      const eUnit = buildHumanoidSoldier('#ef4444', true);
      eGroup.add(eUnit.group);

      // Enemy weapons
      const eGun = buildDetailedGun('#1e293b');
      eGun.position.set(0.3, 1.0, -0.4);
      eGroup.add(eGun);

      scene.add(eGroup);
      enemies.push({
        mesh: eGroup,
        health: 40 + (playerLevel * 5) + (stateRef.current.wave * 12),
        speed: 0.052 + Math.random() * 0.045 + (stateRef.current.wave * 0.012),
        lastShotTime: 0,
        id,
        wanderAngle: Math.random() * Math.PI * 2,
        unit: eUnit
      });
    };

    // First wave spawn
    const count = 3 + wave * 2;
    for (let s = 0; s < count; s++) {
      spawnEnemy(`enemy_${s}`);
    }

    // 9. Particle arrays
    const tracers: { mesh: THREE.Mesh; step: THREE.Vector3; life: number }[] = [];
    const hitSparks: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];

    const createTracer = (from: THREE.Vector3, to: THREE.Vector3, isEnemyTracer: boolean) => {
      const bGeo = new THREE.SphereGeometry(0.12, 4, 4);
      const bMat = new THREE.MeshBasicMaterial({ color: isEnemyTracer ? 0xff4444 : 0x60a5fa });
      const bullet = new THREE.Mesh(bGeo, bMat);
      bullet.position.copy(from);
      scene.add(bullet);

      const dir = new THREE.Vector3().subVectors(to, from);
      const dist = dir.length();
      dir.normalize();

      tracers.push({
        mesh: bullet,
        step: dir.multiplyScalar(0.85),
        life: Math.min(60, dist / 0.85)
      });
    };

    const createHitSparks = (pos: THREE.Vector3, color: number) => {
      const particleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const particleMat = new THREE.MeshBasicMaterial({ color });
      for (let i = 0; i < 9; i++) {
        const p = new THREE.Mesh(particleGeo, particleMat);
        p.position.copy(pos);
        scene.add(p);
        hitSparks.push({
          mesh: p,
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 0.32,
            Math.random() * 0.35 + 0.12,
            (Math.random() - 0.5) * 0.32
          ),
          life: 20 + Math.random() * 12
        });
      }
    };

    // Keyboard controls
    const onKeyDown = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') stateRef.current.keys.w = true;
      if (k === 'a' || e.key === 'ArrowLeft') stateRef.current.keys.a = true;
      if (k === 's' || e.key === 'ArrowDown') stateRef.current.keys.s = true;
      if (k === 'd' || e.key === 'ArrowRight') stateRef.current.keys.d = true;
      if (e.key === ' ' || e.key === 'Spacebar') stateRef.current.keys.Space = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') stateRef.current.keys.w = false;
      if (k === 'a' || e.key === 'ArrowLeft') stateRef.current.keys.a = false;
      if (k === 's' || e.key === 'ArrowDown') stateRef.current.keys.s = false;
      if (k === 'd' || e.key === 'ArrowRight') stateRef.current.keys.d = false;
      if (e.key === ' ' || e.key === 'Spacebar') stateRef.current.keys.Space = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Mouse control listeners
    let isMouseDown = false;
    let prevMouseX = 0;

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      prevMouseX = e.clientX;
      triggerPlayerShoot();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isMouseDown) {
        const deltaX = e.clientX - prevMouseX;
        stateRef.current.lookAngle -= deltaX * 0.008;
        prevMouseX = e.clientX;
      }
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Shooting mechanics
    let lastPlayerShot = 0;

    const triggerPlayerShoot = () => {
      if (stateRef.current.isReloading || stateRef.current.ammo <= 0) {
        dryReload();
        return;
      }

      const now = performance.now();
      if (now - lastPlayerShot < equippedWeapon.fireRate) return;
      lastPlayerShot = now;

      // Decrement ammunition
      stateRef.current.ammo -= 1;
      setAmmo(stateRef.current.ammo);
      
      synths.playShoot(equippedWeapon.id as any);

      // Gun muzzle flash points
      const barrelMuzzlePoint = new THREE.Vector3(0.3, 1.04, -0.9);
      barrelMuzzlePoint.applyMatrix4(playerGroup.matrixWorld);

      const lookDir = new THREE.Vector3(0, 0, -1);
      lookDir.applyQuaternion(playerGroup.quaternion);
      lookDir.normalize();

      const targetAimPoint = new THREE.Vector3()
        .copy(playerGroup.position)
        .add(lookDir.clone().multiplyScalar(equippedWeapon.range));

      // Visual bullet tracers
      createTracer(barrelMuzzlePoint, targetAimPoint, false);

      // Target Ray selection
      let selectedEnemy: Enemy | null = null;
      let closestDistance = equippedWeapon.range;

      enemies.forEach((enemy) => {
        const distanceToTarget = playerGroup.position.distanceTo(enemy.mesh.position);
        if (distanceToTarget <= equippedWeapon.range) {
          const toTargetVec = new THREE.Vector3().subVectors(enemy.mesh.position, playerGroup.position).normalize();
          const targetAlignment = lookDir.dot(toTargetVec);

          // Standard precise cone checking
          if (targetAlignment > 0.94) {
            if (distanceToTarget < closestDistance) {
              closestDistance = distanceToTarget;
              selectedEnemy = enemy;
            }
          }
        }
      });

      if (selectedEnemy) {
        const target = selectedEnemy as Enemy;
        target.health -= equippedWeapon.damage;
        createHitSparks(target.mesh.position, 0xef4444);
        synths.playHit();

        if (target.health <= 0) {
          // Explode target
          createHitSparks(target.mesh.position, 0xfecdd3);
          synths.playExplosion();

          scene.remove(target.mesh);
          const iIdx = enemies.findIndex(e => e.id === target.id);
          if (iIdx !== -1) enemies.splice(iIdx, 1);

          stateRef.current.kills += 1;
          setKills(stateRef.current.kills);

          // Check if active wave has been completed successfully
          if (enemies.length === 0) {
            const nextWave = stateRef.current.wave + 1;
            stateRef.current.wave = nextWave;
            setWave(nextWave);

            synths.playLevelUp();
            const nextCount = 3 + nextWave * 2;
            for (let s = 0; s < nextCount; s++) {
              spawnEnemy(`enemy_wave_${nextWave}_${s}`);
            }
          }
        }
      }
    };

    const dryReload = () => {
      if (stateRef.current.isReloading) return;
      stateRef.current.isReloading = true;
      setIsReloading(true);
      synths.playClick();
      
      setTimeout(() => {
        stateRef.current.ammo = equippedWeapon.ammoCapacity;
        stateRef.current.isReloading = false;
        setIsReloading(false);
        setAmmo(equippedWeapon.ammoCapacity);
        synths.playClick();
      }, 1500);
    };

    // Locomotive ticks
    let frameId = 0;

    const gameTick = () => {
      const moveVec = new THREE.Vector3(0, 0, 0);

      if (stateRef.current.keys.w) moveVec.z -= 1;
      if (stateRef.current.keys.s) moveVec.z += 1;
      if (stateRef.current.keys.a) moveVec.x -= 1;
      if (stateRef.current.keys.d) moveVec.x += 1;

      // Handle custom mobile movement
      if (stateRef.current.touchMoving) {
        moveVec.x += stateRef.current.joystickX;
        moveVec.z += stateRef.current.joystickY;
      }

      const isMoving = (moveVec.length() > 0);

      if (isMoving) {
        moveVec.normalize();

        const alignedMove = new THREE.Vector3(moveVec.x, 0, moveVec.z);
        alignedMove.applyAxisAngle(new THREE.Vector3(0, 1, 0), stateRef.current.lookAngle);
        alignedMove.multiplyScalar(stateRef.current.speed);

        const tempPos = playerGroup.position.clone();
        playerGroup.position.add(alignedMove);

        // Compute stable custom physical collision Box centered around player's cylinder coordinates
        const playerBox = new THREE.Box3(
          new THREE.Vector3(playerGroup.position.x - 0.45, 0.1, playerGroup.position.z - 0.45),
          new THREE.Vector3(playerGroup.position.x + 0.45, 1.9, playerGroup.position.z + 0.45)
        );

        let isCrashed = false;
        for (const wallBox of colliders) {
          if (playerBox.intersectsBox(wallBox)) {
            isCrashed = true;
            break;
          }
        }

        if (isCrashed) {
          playerGroup.position.copy(tempPos);
        } else {
          stateRef.current.playerPos.copy(playerGroup.position);
        }
      }

      // Sync character aim look rotations
      playerGroup.rotation.y = stateRef.current.lookAngle;

      // Update wind-borne ambient dust/sand/leaf storm simulation
      windParticles.forEach(p => {
        p.mesh.position.x += p.speedX;
        p.mesh.position.y += p.speedY;
        p.mesh.position.z += p.speedZ;
        
        // Loop recycling
        if (p.mesh.position.y < 0.1 || p.mesh.position.y > 8.0) {
          p.mesh.position.y = 8.0;
        }
        if (Math.abs(p.mesh.position.x) > activeMap.groundSize / 2) {
          p.mesh.position.x = -p.mesh.position.x;
        }
        if (Math.abs(p.mesh.position.z) > activeMap.groundSize / 2) {
          p.mesh.position.z = -p.mesh.position.z;
        }
      });

      // Swing civilian/soldier limbs dynamic walk cycles
      const walkCycle = isMoving ? Math.sin(performance.now() * 0.012) * 0.55 : 0;
      playerUnit.leftLegGroup.rotation.x = walkCycle;
      playerUnit.rightLegGroup.rotation.x = -walkCycle;
      playerUnit.leftArmGroup.rotation.x = -walkCycle * 0.35;
      playerUnit.rightArmGroup.rotation.x = (walkCycle * 0.1) - 0.25;

      // Continuous spray clicks when tracking trigger button active
      if (stateRef.current.keys.Space) {
        triggerPlayerShoot();
      }

      // Camera follow logic (Smooth LERP)
      const targetCameraOffset = new THREE.Vector3(0, 5, 8.5);
      targetCameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), stateRef.current.lookAngle);
      targetCameraOffset.add(playerGroup.position);
      camera.position.lerp(targetCameraOffset, 0.1);

      const lookAheadTarget = new THREE.Vector3(0, 1.15, -4);
      lookAheadTarget.applyQuaternion(playerGroup.quaternion);
      lookAheadTarget.add(playerGroup.position);
      camera.lookAt(lookAheadTarget);

      // Enemy locomotion behaviors
      const currentTime = performance.now();

      enemies.forEach((enemy) => {
        const dist = enemy.mesh.position.distanceTo(playerGroup.position);
        enemy.mesh.lookAt(playerGroup.position);

        let enemyIsWalking = false;

        if (dist > 4 && dist < 38) {
          enemyIsWalking = true;
          const dir = new THREE.Vector3().subVectors(playerGroup.position, enemy.mesh.position).normalize();
          const prevEnemyPos = enemy.mesh.position.clone();
          enemy.mesh.position.add(dir.multiplyScalar(enemy.speed));

          // Physical collisions checks for enemies too
          const eBox = new THREE.Box3(
            new THREE.Vector3(enemy.mesh.position.x - 0.4, 0.1, enemy.mesh.position.z - 0.4),
            new THREE.Vector3(enemy.mesh.position.x + 0.4, 1.8, enemy.mesh.position.z + 0.4)
          );

          let eCrashed = false;
          for (const box of colliders) {
            if (eBox.intersectsBox(box)) {
              eCrashed = true;
              break;
            }
          }
          if (eCrashed) {
            enemy.mesh.position.copy(prevEnemyPos);
            enemyIsWalking = false;
          }
        }

        // Cycle enemy limbs
        const eStep = parseFloat(enemy.id.replace(/[^\d]/g, '') || '0');
        const enemyWalkCycle = enemyIsWalking ? Math.sin(performance.now() * 0.012 + eStep * 40) * 0.55 : 0;
        enemy.unit.leftLegGroup.rotation.x = enemyWalkCycle;
        enemy.unit.rightLegGroup.rotation.x = -enemyWalkCycle;
        enemy.unit.leftArmGroup.rotation.x = -enemyWalkCycle * 0.35;
        enemy.unit.rightArmGroup.rotation.x = (enemyWalkCycle * 0.1) - 0.25;

        // Enemy weapons firing timer
        if (dist < 26 && currentTime - enemy.lastShotTime > 1900 - wave * 100) {
          enemy.lastShotTime = currentTime;

          const muzzleLoc = new THREE.Vector3(0.3, 1.0, -0.6).applyMatrix4(enemy.mesh.matrixWorld);
          createTracer(muzzleLoc, playerGroup.position, true);

          // Landing calculations (40% accuracy)
          if (Math.random() < 0.38) {
            const rawDmg = 8 + wave * 2.2;
            const finalDmg = Math.round(rawDmg * equippedSkin.armorMultiplier);
            
            stateRef.current.health = Math.max(0, stateRef.current.health - finalDmg);
            setHealth(stateRef.current.health);
            createHitSparks(playerGroup.position, 0xffa500); // orange shield energy flash
            synths.playHit();

            if (stateRef.current.health <= 0) {
              setGameOver(true);
            }
          }
        }
      });

      // Render tracer elements
      for (let i = tracers.length - 1; i >= 0; i--) {
        const tr = tracers[i];
        tr.mesh.position.add(tr.step);
        tr.life -= 1;
        if (tr.life <= 0) {
          scene.remove(tr.mesh);
          tracers.splice(i, 1);
        }
      }

      for (let j = hitSparks.length - 1; j >= 0; j--) {
        const hp = hitSparks[j];
        hp.mesh.position.add(hp.vel);
        hp.life -= 1;
        if (hp.life <= 0) {
          scene.remove(hp.mesh);
          hitSparks.splice(j, 1);
        }
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(gameTick);
    };

    gameTick();

    // Canvas resize observers
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Full system disposal
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      resizeObserver.disconnect();
      
      tracers.forEach(p => scene.remove(p.mesh));
      hitSparks.forEach(p => scene.remove(p.mesh));
      enemies.forEach(e => scene.remove(e.mesh));
      obstacleMeshes.forEach(o => scene.remove(o));
      
      scene.remove(playerGroup);
      scene.remove(ground);
      scene.remove(grid);
      
      renderer.setSize(0, 0);
      renderer.dispose();
      
      if (domEl.parentNode) {
        domEl.parentNode.removeChild(domEl);
      }
    };
  }, [gameStarted, gameOver, gameWon]);

  // Touch joystick system
  const handleJoystickStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    joystickCenter.current = { x: touch.clientX, y: touch.clientY };
    joystickCurrent.current = { x: touch.clientX, y: touch.clientY };
    setTouchMoving(true);
    stateRef.current.touchMoving = true;
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    joystickCurrent.current = { x: touch.clientX, y: touch.clientY };

    const dx = joystickCurrent.current.x - joystickCenter.current.x;
    const dy = joystickCurrent.current.y - joystickCenter.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 45;

    if (distance === 0) {
      joystickValue.current = { x: 0, y: 0 };
      stateRef.current.joystickX = 0;
      stateRef.current.joystickY = 0;
    } else {
      const angle = Math.atan2(dy, dx);
      const intensity = Math.min(distance, maxRadius) / maxRadius;
      
      const vx = Math.cos(angle) * intensity;
      const vy = Math.sin(angle) * intensity;
      
      joystickValue.current = { x: vx, y: vy };
      stateRef.current.joystickX = vx;
      stateRef.current.joystickY = vy;
    }
  };

  const handleJoystickEnd = () => {
    setTouchMoving(false);
    stateRef.current.touchMoving = false;
    joystickValue.current = { x: 0, y: 0 };
    stateRef.current.joystickX = 0;
    stateRef.current.joystickY = 0;
  };

  // Aim trackpad swipe system
  const handleAimTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    lastAimTouchX.current = touch.clientX;
    isAimTouching.current = true;
  };

  const handleAimTouchMove = (e: React.TouchEvent) => {
    if (!isAimTouching.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - lastAimTouchX.current;
    
    // update look direction
    stateRef.current.lookAngle -= deltaX * 0.015;
    lastAimTouchX.current = touch.clientX;
  };

  const handleAimTouchEnd = () => {
    isAimTouching.current = false;
  };

  // Yield game variables back to state
  const handleMatchEndSubmit = (victory: boolean) => {
    const survivalSec = gameTime;
    const finalKills = kills;
    const computedXp = finalKills * 35 + (victory ? 150 : 30);
    const computedCoins = finalKills * 15 + (victory ? 80 : 20);

    onMatchFinished({
      kills: finalKills,
      xpEarned: computedXp,
      coinsEarned: computedCoins,
      survivalTimeSeconds: survivalSec,
      victory
    });
  };

  const manualReload = () => {
    if (ammo < equippedWeapon.ammoCapacity && !isReloading) {
      synths.playClick();
      setIsReloading(true);
      setTimeout(() => {
        stateRef.current.ammo = equippedWeapon.ammoCapacity;
        setAmmo(equippedWeapon.ammoCapacity);
        setIsReloading(false);
        stateRef.current.isReloading = false;
        synths.playClick();
      }, 1500);
    }
  };

  return (
    <div id="combat_view_root" className="fixed inset-0 w-screen h-screen z-50 bg-slate-950 flex flex-col justify-between overflow-hidden select-none text-right">
      
      {/* 1. Countdown Overlay */}
      {readyCountdown > 0 && (
        <div className="absolute inset-0 bg-slate-950/95 z-40 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
          <div className="p-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4 animate-bounce">
            <Swords className="w-12 h-12 text-indigo-400" />
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-2 font-sans tracking-wide">الاستعداد للمعركة</h2>
          <p className="text-slate-400 max-w-sm mb-6 text-sm">التثبيت في الموضع. جارٍ تسيير محاكاة القتال ثنائية الأبعاد...</p>
          <div className="w-24 h-24 rounded-full border-4 border-indigo-500/30 flex items-center justify-center border-t-indigo-500 animate-spin">
            <span className="text-4xl font-extrabold text-white animate-pulse">{readyCountdown}</span>
          </div>
        </div>
      )}

      {/* 2. GameOver Overlay */}
      {gameOver && (
        <div className="absolute inset-0 bg-slate-950/95 z-40 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
          <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 mb-4 animate-pulse">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-4xl font-extrabold text-red-500 mb-2 font-sans">لقد قُتلت في المعركة!</h2>
          <p className="text-slate-400 max-w-sm mb-6 text-sm">البقاء على قيد الحياة تطلب درعًا أقوى أو مناورات تكتيكية ممتازة.</p>
          
          <div className="grid grid-cols-2 gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl mb-6 min-w-[280px]">
            <div className="text-center p-2">
              <span className="block text-slate-500 text-xs text-right">عدد القتلى</span>
              <span className="text-white font-extrabold text-xl">{kills}</span>
            </div>
            <div className="text-center p-2">
              <span className="block text-slate-500 text-xs text-right">زمن البقاء</span>
              <span className="text-white font-extrabold text-xl">{gameTime} ث</span>
            </div>
          </div>

          <button
            id="sub_match_die_btn"
            onClick={() => handleMatchEndSubmit(false)}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition duration-200 flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            جمع المكافآت والعودة للريد
          </button>
        </div>
      )}

      {/* 3. Victory Overlay */}
      {(gameTime >= 60 || kills >= 12) && !gameOver && (
        <div className="absolute inset-0 bg-slate-950/95 z-40 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
          <div className="p-4 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-4 animate-bounce">
            <Award className="w-12 h-12 text-yellow-400 animate-pulse" />
          </div>
          <h2 className="text-4xl font-extrabold text-yellow-500 mb-2 font-sans">نصر تكتيكي مؤزر! 🏆</h2>
          <p className="text-slate-400 max-w-sm mb-6 text-sm">لقد هيمنت على ساحة المعركة واكتسحت خطوط العدو الأمامية.</p>

          <div className="grid grid-cols-3 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl mb-6 min-w-[320px]">
            <div className="text-center p-1">
              <span className="block text-slate-500 text-[10px] text-right">المستوى</span>
              <span className="text-yellow-400 font-extrabold text-xs">+{kills * 35 + 150} XP</span>
            </div>
            <div className="text-center p-1">
              <span className="block text-slate-500 text-[10px] text-right">الذهب المكتسب</span>
              <span className="text-yellow-400 font-extrabold text-xs">+{kills * 15 + 80} 🪙</span>
            </div>
            <div className="text-center p-1">
              <span className="block text-slate-500 text-[10px] text-right">الأعداء المحيدين</span>
              <span className="text-white font-extrabold text-lg">{kills}</span>
            </div>
          </div>

          <button
            id="sub_match_win_btn"
            onClick={() => handleMatchEndSubmit(true)}
            className="px-8 py-3.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-extrabold rounded-xl shadow-xl transition duration-200 flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 animate-spin" />
            تحصيل المكافآت وترقية الرتبة
          </button>
        </div>
      )}

      {/* 4. Battlefield HUD Headbar */}
      <div className="relative z-30 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/50 border border-red-500/30 text-red-400 shadow">
            <Shield className="w-4 h-4 text-red-400 animate-bounce" />
            <span className="text-sm font-bold font-mono">{health}% HP</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-950/50 border border-green-500/30 text-green-400 shadow">
            <Target className="w-4 h-4 text-green-400" />
            <span className="text-sm font-bold font-mono">
              {isReloading ? "تعمير..." : `${ammo} / ♾️`}
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 text-xs font-mono text-slate-300">
          <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
            الخريطة: {activeMap.nameAr}
          </div>
          <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-yellow-400 font-bold">
            الموجة {wave}
          </div>
          <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
            زمن: {gameTime} ث / 60
          </div>
          <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-extrabold text-red-400">
            القتلى: {kills}
          </div>
        </div>

        <button
          id="exit_combat_early_btn"
          onClick={onExit}
          className="px-4 py-2 bg-slate-800 hover:bg-red-700 hover:text-white rounded-lg text-xs font-bold border border-slate-700 transition"
        >
          انسحاب 🏳️
        </button>
      </div>

      {/* 5. 3D WebGL Canvas Area */}
      <div
        id="three_canvas_container"
        ref={containerRef}
        className="w-full h-full relative cursor-crosshair overflow-hidden touch-none"
      >
        {/* Right Half Swipe Trackpad overlay for looking direction */}
        <div
          id="touch_swipe_aim_pad"
          onTouchStart={handleAimTouchStart}
          onTouchMove={handleAimTouchMove}
          onTouchEnd={handleAimTouchEnd}
          className="absolute right-0 top-0 bottom-0 w-1/2 z-20 select-none touch-none active:bg-white/5 flex flex-col items-center justify-center pointer-events-auto"
        >
          <div className="p-3 bg-slate-950/80 backdrop-blur-sm border border-indigo-500/20 rounded-xl flex items-center gap-1.5 opacity-30 active:opacity-90 hover:opacity-100 transition duration-150 pointer-events-none select-none">
            <Crosshair className="w-4.5 h-4.5 text-indigo-400 animate-spin" />
            <span className="text-[10px] text-slate-300 font-black uppercase tracking-wider">
               اسحب السلك للتوجيه والتصويب 🔄
            </span>
          </div>
        </div>

        {/* Floating live score panel for mobile layout density */}
        <div className="absolute left-4 top-4 pointer-events-none p-3 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800/80 max-w-[160px] z-20 text-right md:hidden space-y-1">
          <span className="text-[10px] text-amber-400 font-bold block">الموجة الحالية: {wave}</span>
          <span className="text-[10px] text-rose-400 font-bold block">الأعداء المقتولين: {kills}</span>
          <span className="text-[10px] text-slate-300 font-bold block">الوقت المنقضي: {gameTime} ث</span>
        </div>
      </div>

      {/* 6. Gameplay Action Controllers Footbar */}
      <div className="relative z-30 w-full bg-slate-950/90 border-t border-slate-800/80 p-4 flex items-center justify-between pb-6 gap-6">
        
        {/* Bottom Left: Walk Joystick zone */}
        <div className="flex items-center gap-2">
          <div
            id="mobile_joystick_container"
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
            className="w-24 h-24 rounded-full bg-slate-900 border-2 border-slate-700/80 relative flex items-center justify-center cursor-default select-none active:border-indigo-500 pointer-events-auto"
          >
            <div
              className="w-10 h-10 rounded-full bg-indigo-500/80 shadow-lg absolute transition-all duration-75 pointer-events-none"
              style={{
                left: `calc(50% - 20px + ${joystickValue.current.x * 25}px)`,
                top: `calc(50% - 20px + ${joystickValue.current.y * 25}px)`
              }}
            />
            <span className="absolute bottom-1 text-[8px] text-slate-500">مشي (WASD)</span>
          </div>
          <span className="text-[11px] text-slate-500 text-right font-sans hidden lg:inline max-w-xs leading-relaxed">
            <b>تحريك الهاتف اليدوي 🕹️:</b> استخدم الإبهام الأيسر على الدائرة للتحرك، واسحب يسار/يمين بالنصف الأيمن للتصويب والتبديل!
          </span>
        </div>

        {/* Bottom Right: Bullet shoot action and manual reloading triggers */}
        <div className="flex items-center gap-4 pointer-events-auto">
          <button
            id="reload_action_btn"
            onClick={manualReload}
            disabled={isReloading}
            className="px-4.5 py-4 bg-slate-900 active:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 rounded-2xl text-slate-100 font-extrabold text-xs transition duration-150 flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
            تعبئة (Reload)
          </button>

          <button
            id="shoot_action_btn"
            onTouchStart={() => {
              stateRef.current.keys.Space = true;
            }}
            onTouchEnd={() => {
              stateRef.current.keys.Space = false;
            }}
            onMouseDown={() => {
              stateRef.current.keys.Space = true;
            }}
            onMouseUp={() => {
              stateRef.current.keys.Space = false;
            }}
            onMouseLeave={() => {
              stateRef.current.keys.Space = false;
            }}
            className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 hover:scale-105 active:scale-95 text-white font-black shadow-lg shadow-red-600/30 transition select-none flex flex-col items-center justify-center gap-0.5 cursor-pointer border-2 border-red-400/30"
          >
            <Crosshair className="w-6 h-6 animate-pulse" />
            <span className="text-[10px] font-bold">إطلاق 💥</span>
          </button>
        </div>
      </div>

    </div>
  );
}
