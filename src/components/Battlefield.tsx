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
  
  // Touch joystick tracking for responsive mobile play
  const [touchMoving, setTouchMoving] = useState(false);
  const joystickCenter = useRef({ x: 0, y: 0 });
  const joystickCurrent = useRef({ x: 0, y: 0 });
  const joystickValue = useRef({ x: 0, y: 0 }); // -1 to 1

  // References to keep loop sync
  const stateRef = useRef({
    health: 100,
    ammo: equippedWeapon.ammoCapacity,
    isReloading: false,
    kills: 0,
    wave: 1,
    time: 0,
    keys: { w: false, a: false, s: false, d: false, Space: false },
    lookAngle: 0, // angular rotation
    playerPos: new THREE.Vector3(0, 0.8, 0),
    speed: 0.15
  });

  // Keep weapon in sync in ref
  useEffect(() => {
    stateRef.current.ammo = equippedWeapon.ammoCapacity;
    setAmmo(equippedWeapon.ammoCapacity);
  }, [equippedWeapon]);

  // Handle countdown before battle starts
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

  // Game timer clock
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

  // Core Game loop and Three.js initialization
  useEffect(() => {
    if (!gameStarted || gameOver || gameWon || !containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || 500;

    // 1. Create Scene & Ambient Fog matching the Map selection
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(activeMap.primaryColor);
    scene.fog = new THREE.FogExp2(activeMap.fogColor, 0.04);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    camera.position.set(0, 10, 12); // Initial angled follow view

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.25);
    sunLight.position.set(40, 100, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 250;
    const d = 50;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // Add extra tactical directional spotlight
    const spotLight = new THREE.SpotLight(0xffffff, 0.8);
    spotLight.position.set(0, 40, 0);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.1;
    scene.add(spotLight);

    // 5. Ground Plane
    const groundGeo = new THREE.PlaneGeometry(activeMap.groundSize, activeMap.groundSize);
    const groundMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(activeMap.primaryColor),
      roughness: 0.8,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Add ground grid markings to clarify movement
    const grid = new THREE.GridHelper(activeMap.groundSize, activeMap.groundSize / 3, 0xff0000, 0x444444);
    grid.position.y = 0.01;
    scene.add(grid);

    // 6. Spawn Collidable Obstacles (Crater blocks / ruins)
    const colliders: THREE.Box3[] = [];
    const obstacleMeshes: THREE.Mesh[] = [];
    
    // Boundary walls
    const addBoundary = (x: number, z: number, w: number, d: number) => {
      const geo = new THREE.BoxGeometry(w, 4, d);
      const mat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
      const wall = new THREE.Mesh(geo, mat);
      wall.position.set(x, 2, z);
      scene.add(wall);
      colliders.push(new THREE.Box3().setFromObject(wall));
    };

    const halfSize = activeMap.groundSize / 2;
    addBoundary(0, -halfSize, activeMap.groundSize, 1.5);
    addBoundary(0, halfSize, activeMap.groundSize, 1.5);
    addBoundary(-halfSize, 0, 1.5, activeMap.groundSize);
    addBoundary(halfSize, 0, 1.5, activeMap.groundSize);

    // Random blocks based on map settings (seeded simple)
    const obsGeo = new THREE.BoxGeometry(3, 3, 3);
    const pillarGeo = new THREE.CylinderGeometry(1, 1, 6, 8);
    
    for (let i = 0; i < activeMap.obstaclesCount; i++) {
      const isPillar = i % 3 === 0;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(activeMap.obstacleColor),
        roughness: 0.7,
        metalness: 0.1
      });
      
      const mesh = new THREE.Mesh(isPillar ? pillarGeo : obsGeo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      // Prevent spawning right at the center (spawn zone)
      let x = (Math.random() - 0.5) * (activeMap.groundSize - 15);
      let z = (Math.random() - 0.5) * (activeMap.groundSize - 15);
      if (Math.abs(x) < 8 && Math.abs(z) < 8) {
        x = x > 0 ? x + 8 : x - 8;
        z = z > 0 ? z + 8 : z - 8;
      }
      
      mesh.position.set(x, isPillar ? 3 : 1.5, z);
      scene.add(mesh);
      obstacleMeshes.push(mesh);
      colliders.push(new THREE.Box3().setFromObject(mesh));
    }

    // 7. Render Player Avatar
    const playerGroup = new THREE.Group();
    playerGroup.position.copy(stateRef.current.playerPos);
    
    // Core body block
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(equippedSkin.color),
      roughness: 0.4,
      metalness: 0.3
    });
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 1.2), bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.position.y = 0.75;
    playerGroup.add(bodyMesh);

    // Head block with a tactical helmet
    const headMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.8, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xe0a96d })
    );
    headMesh.position.set(0, 1.6, 0);
    headMesh.castShadow = true;
    playerGroup.add(headMesh);
    
    const helmetMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.3, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x1f2937 })
    );
    helmetMesh.position.set(0, 2.0, 0);
    playerGroup.add(helmetMesh);

    // Weapon mesh representation (barrel pointing forward along -z)
    const gunMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(equippedWeapon.color), metalness: 0.8, roughness: 0.2 });
    const gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 1.4), gunMat);
    gunMesh.position.set(0.6, 0.8, -0.6);
    gunMesh.castShadow = true;
    playerGroup.add(gunMesh);

    // Laser sight emission line
    const laserMat = new THREE.LineBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true });
    const laserPoints = [new THREE.Vector3(0.6, 0.8, -1.2), new THREE.Vector3(0.6, 0.8, -25)];
    const laserGeo = new THREE.BufferGeometry().setFromPoints(laserPoints);
    const laserLine = new THREE.Line(laserGeo, laserMat);
    playerGroup.add(laserLine);

    scene.add(playerGroup);

    // 8. Setup Enemies Structure
    interface Enemy {
      mesh: THREE.Group;
      health: number;
      speed: number;
      lastShotTime: number;
      id: string;
      wanderAngle: number;
    }
    const enemies: Enemy[] = [];

    const spawnEnemy = (id: string) => {
      const eGroup = new THREE.Group();
      // Spawn at a perimeter distance
      const angle = Math.random() * Math.PI * 2;
      const distance = 25 + Math.random() * 20;
      const x = playerGroup.position.x + Math.cos(angle) * distance;
      const z = playerGroup.position.z + Math.sin(angle) * distance;
      
      eGroup.position.set(
        Math.max(-halfSize + 5, Math.min(halfSize - 5, x)),
        0.8,
        Math.max(-halfSize + 5, Math.min(halfSize - 5, z))
      );

      // Enemy mesh
      const eBody = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.5, 1.2),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 }) // Red alert soldiers
      );
      eBody.position.y = 0.75;
      eBody.castShadow = true;
      eGroup.add(eBody);

      // Enemy Head
      const eHead = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x4b5563 })
      );
      eHead.position.set(0, 1.6, 0);
      eGroup.add(eHead);

      // Enemy Weapon
      const eGun = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.2, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x111827 })
      );
      eGun.position.set(0.6, 0.8, -0.6);
      eGroup.add(eGun);

      scene.add(eGroup);
      enemies.push({
        mesh: eGroup,
        health: 40 + (playerLevel * 5) + (stateRef.current.wave * 10),
        speed: 0.05 + Math.random() * 0.04 + (stateRef.current.wave * 0.01),
        lastShotTime: 0,
        id,
        wanderAngle: Math.random() * Math.PI * 2
      });
    };

    // First wave enemies
    const initialEnemiesCount = 3 + wave * 2;
    for (let s = 0; s < initialEnemiesCount; s++) {
      spawnEnemy(`enemy_${s}`);
    }

    // 9. Particle Effect System for tracer bullets and hits
    const tracerParticles: { mesh: THREE.Mesh; step: THREE.Vector3; life: number }[] = [];
    
    const createTracer = (from: THREE.Vector3, to: THREE.Vector3, color: number = 0xfffd73) => {
      const bGeo = new THREE.SphereGeometry(0.12, 4, 4);
      const bMat = new THREE.MeshBasicMaterial({ color });
      const bullet = new THREE.Mesh(bGeo, bMat);
      bullet.position.copy(from);
      scene.add(bullet);

      const direction = new THREE.Vector3().subVectors(to, from);
      const dist = direction.length();
      direction.normalize();
      
      tracerParticles.push({
        mesh: bullet,
        step: direction.multiplyScalar(0.8), // speed
        life: Math.min(50, dist / 0.8)
      });
    };

    // Sparks for impact
    const hitParticles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];
    const createSparks = (pos: THREE.Vector3, color: number = 0xff0000) => {
      const particleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const particleMat = new THREE.MeshBasicMaterial({ color });
      for (let i = 0; i < 8; i++) {
        const p = new THREE.Mesh(particleGeo, particleMat);
        p.position.copy(pos);
        scene.add(p);
        hitParticles.push({
          mesh: p,
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            Math.random() * 0.3 + 0.1,
            (Math.random() - 0.5) * 0.3
          ),
          life: 25 + Math.random() * 10
        });
      }
    };

    // Keyboard handlers
    const onKeyDown = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') stateRef.current.keys.w = true;
      if (k === 'a' || e.key === 'ArrowLeft') stateRef.current.keys.a = true;
      if (k === 's' || e.key === 'ArrowDown') stateRef.current.keys.s = true;
      if (k === 'd' || e.key === 'ArrowRight') stateRef.current.keys.d = true;
      if (e.key === ' ' || e.key === 'Spacebar') {
        stateRef.current.keys.Space = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') stateRef.current.keys.w = false;
      if (k === 'a' || e.key === 'ArrowLeft') stateRef.current.keys.a = false;
      if (k === 's' || e.key === 'ArrowDown') stateRef.current.keys.s = false;
      if (k === 'd' || e.key === 'ArrowRight') stateRef.current.keys.d = false;
      if (e.key === ' ' || e.key === 'Spacebar') {
        stateRef.current.keys.Space = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Mouse aiming handlers
    let isMouseDown = false;
    let prevMouseX = 0;

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      prevMouseX = e.clientX;
      // PC shoot click
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

    // Canvas click triggers pointer lock style rotation
    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Pointer-lock alternative drag rotation on screen for mobile
    const onTouchStartAim = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        prevMouseX = e.touches[0].clientX;
        isMouseDown = true;
      }
    };
    const onTouchMoveAim = (e: TouchEvent) => {
      if (isMouseDown && e.touches.length > 0) {
        const clientX = e.touches[0].clientX;
        const deltaX = clientX - prevMouseX;
        stateRef.current.lookAngle -= deltaX * 0.015;
        prevMouseX = clientX;
      }
    };
    domEl.addEventListener('touchstart', onTouchStartAim, { passive: true });
    domEl.addEventListener('touchmove', onTouchMoveAim, { passive: true });
    domEl.addEventListener('touchend', onMouseUp);

    // Shooting interval clock
    let lastPlayerShot = 0;

    const triggerPlayerShoot = () => {
      if (stateRef.current.isReloading || stateRef.current.ammo <= 0) {
        // Force reload automatically
        dryReload();
        return;
      }

      const now = performance.now();
      if (now - lastPlayerShot < equippedWeapon.fireRate) return;
      lastPlayerShot = now;

      // Deduct ammo
      stateRef.current.ammo -= 1;
      setAmmo(stateRef.current.ammo);
      
      // Sound
      synths.playShoot(equippedWeapon.id as any);

      // Raycast shooting calculation
      // Calculate shooting origin: front barrel of the gun
      // Gun world direction
      const shootingOrigin = new THREE.Vector3(0.6, 0.8, -1.2);
      shootingOrigin.applyMatrix4(playerGroup.matrixWorld);

      const shootDirection = new THREE.Vector3(0, 0, -1);
      shootDirection.applyQuaternion(playerGroup.quaternion);
      shootDirection.normalize();

      const shootTarget = new THREE.Vector3()
        .copy(playerGroup.position)
        .add(shootDirection.clone().multiplyScalar(equippedWeapon.range));

      // Visual tracer
      createTracer(shootingOrigin, shootTarget, 0x60a5fa);

      // Check hits on enemies
      // Wrap player raycast
      const playerRay = new THREE.Ray(playerGroup.position, shootDirection);
      let hitEnemy: Enemy | null = null;
      let minDistance = equippedWeapon.range;

      enemies.forEach((enemy) => {
        const eBox = new THREE.Box3().setFromObject(enemy.mesh);
        // Expand combat target boxes to compensate for precision on mobile
        const checkDstStr = playerGroup.position.distanceTo(enemy.mesh.position);
        if (checkDstStr <= equippedWeapon.range) {
          // Angle alignment check
          const toEnemyVec = new THREE.Vector3().subVectors(enemy.mesh.position, playerGroup.position);
          toEnemyVec.normalize();
          const alignment = shootDirection.dot(toEnemyVec);
          
          if (alignment > 0.94) { // Tight cone aiming line
            if (checkDstStr < minDistance) {
              minDistance = checkDstStr;
              hitEnemy = enemy;
            }
          }
        }
      });

      if (hitEnemy) {
        const targetEnemy = hitEnemy as Enemy;
        targetEnemy.health -= equippedWeapon.damage;
        createSparks(targetEnemy.mesh.position, 0xef4444);
        synths.playHit();

        if (targetEnemy.health <= 0) {
          // Kill enemy
          createSparks(targetEnemy.mesh.position, 0xfecdd3);
          synths.playExplosion();
          
          // Remove from scene and list
          scene.remove(targetEnemy.mesh);
          const idx = enemies.findIndex(e => e.id === targetEnemy.id);
          if (idx !== -1) enemies.splice(idx, 1);

          stateRef.current.kills += 1;
          setKills(stateRef.current.kills);

          // Check Wave Cleared status
          if (enemies.length === 0) {
            // Level up/Next wave
            const nextWave = stateRef.current.wave + 1;
            stateRef.current.wave = nextWave;
            setWave(nextWave);
            
            // Spawn next wave!
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
      }, 1500); // 1.5s reload delay
    };

    // Main animation frame tick
    let animationId = 0;

    const tick = () => {
      // 1. Position movement input
      const moveVec = new THREE.Vector3(0, 0, 0);
      
      // Merge keyboard inputs
      if (stateRef.current.keys.w) moveVec.z -= 1;
      if (stateRef.current.keys.s) moveVec.z += 1;
      if (stateRef.current.keys.a) moveVec.x -= 1;
      if (stateRef.current.keys.d) moveVec.x += 1;

      // Merge mobile touchscreen joystick controller
      if (touchMoving) {
        moveVec.x += joystickValue.current.x;
        moveVec.z += joystickValue.current.y;
      }

      if (moveVec.length() > 0) {
        moveVec.normalize();
        
        // Rotate move vector according to player look angle
        const alignedMove = new THREE.Vector3();
        alignedMove.x = moveVec.x * Math.cos(stateRef.current.lookAngle) - moveVec.z * Math.sin(stateRef.current.lookAngle);
        alignedMove.z = moveVec.x * Math.sin(stateRef.current.lookAngle) + moveVec.z * Math.cos(stateRef.current.lookAngle);
        alignedMove.multiplyScalar(stateRef.current.speed);

        // Apply temporary next position to check crash bounds against obstacles
        const originalPos = playerGroup.position.clone();
        playerGroup.position.add(alignedMove);

        // Simple bounding box checks
        const playerBox = new THREE.Box3().setFromObject(bodyMesh);
        let collides = false;
        for (const wallBox of colliders) {
          if (playerBox.intersectsBox(wallBox)) {
            collides = true;
            break;
          }
        }

        if (collides) {
          // Revert position
          playerGroup.position.copy(originalPos);
        } else {
          stateRef.current.playerPos.copy(playerGroup.position);
          // Gently bob head on move
          headMesh.position.y = 1.6 + Math.sin(performance.now() * 0.015) * 0.04;
        }
      }

      // Rotate player group based on aiming rotation angle
      playerGroup.rotation.y = stateRef.current.lookAngle;

      // Shoot continuous laser/plasma fires if holding spacebar
      if (stateRef.current.keys.Space) {
        triggerPlayerShoot();
      }

      // 2. Camera tracking (Third Person smooth follow)
      const idealCameraPos = new THREE.Vector3(0, 5, 8);
      // Align to lookAngle rotation
      idealCameraPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), stateRef.current.lookAngle);
      idealCameraPos.add(playerGroup.position);
      camera.position.lerp(idealCameraPos, 0.1);
      
      // Camera looks slightly ahead of player position
      const lookTarget = new THREE.Vector3(0, 1.2, -4);
      lookTarget.applyQuaternion(playerGroup.quaternion);
      lookTarget.add(playerGroup.position);
      camera.lookAt(lookTarget);

      // 3. Enemy logic: patrol and follow player
      const enemyLaserMat = new THREE.LineBasicMaterial({ color: 0xef4444, opacity: 0.3, transparent: true });
      const nowTime = performance.now();
      
      enemies.forEach((enemy) => {
        const dstToPlayer = enemy.mesh.position.distanceTo(playerGroup.position);
        
        // Look towards player
        enemy.mesh.lookAt(playerGroup.position);

        if (dstToPlayer > 5 && dstToPlayer < 35) {
          // Chase player
          const dir = new THREE.Vector3().subVectors(playerGroup.position, enemy.mesh.position).normalize();
          const prevEnemyPos = enemy.mesh.position.clone();
          enemy.mesh.position.add(dir.multiplyScalar(enemy.speed));

          // Collider checks for enemies too
          const eBox = new THREE.Box3().setFromObject(enemy.mesh);
          let eCollide = false;
          for (const box of colliders) {
            if (eBox.intersectsBox(box)) {
              eCollide = true;
              break;
            }
          }
          if (eCollide) {
            enemy.mesh.position.copy(prevEnemyPos);
          }
        }

        // Shooting intervals for enemies
        if (dstToPlayer < 25 && nowTime - enemy.lastShotTime > 1800 - wave * 100) {
          enemy.lastShotTime = nowTime;
          
          // Enemy shoot tracer
          const shooterPoint = new THREE.Vector3(0, 0.8, -0.6).applyMatrix4(enemy.mesh.matrixWorld);
          createTracer(shooterPoint, playerGroup.position, 0xef4444);

          // Test hit on player
          if (Math.random() < 0.40) { // 40% chance of a bot landing the hit
            const rawDmg = 8 + wave * 2;
            // Shield armor reduction
            const finalDmg = Math.round(rawDmg * equippedSkin.armorMultiplier);
            
            stateRef.current.health = Math.max(0, stateRef.current.health - finalDmg);
            setHealth(stateRef.current.health);
            createSparks(playerGroup.position, 0xffa500); // orange shield spark
            synths.playHit();

            if (stateRef.current.health <= 0) {
              setGameOver(true);
            }
          }
        }
      });

      // 4. Update Particle animations
      for (let i = tracerParticles.length - 1; i >= 0; i--) {
        const tr = tracerParticles[i];
        tr.mesh.position.add(tr.step);
        tr.life -= 1;
        if (tr.life <= 0) {
          scene.remove(tr.mesh);
          tracerParticles.splice(i, 1);
        }
      }

      for (let j = hitParticles.length - 1; j >= 0; j--) {
        const hp = hitParticles[j];
        hp.mesh.position.add(hp.vel);
        hp.life -= 1;
        if (hp.life <= 0) {
          scene.remove(hp.mesh);
          hitParticles.splice(j, 1);
        }
      }

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(tick);
    };

    tick();

    // 10. Handle window responsive resizing inside Three canvas
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

    // Cleanup Everything
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      domEl.removeEventListener('touchstart', onTouchStartAim);
      domEl.removeEventListener('touchmove', onTouchMoveAim);
      domEl.removeEventListener('touchend', onMouseUp);
      
      resizeObserver.disconnect();
      
      tracerParticles.forEach(p => scene.remove(p.mesh));
      hitParticles.forEach(p => scene.remove(p.mesh));
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

  // Handle Mobile Virtual Joystick Events
  const handleJoystickStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    joystickCenter.current = { x: touch.clientX, y: touch.clientY };
    joystickCurrent.current = { x: touch.clientX, y: touch.clientY };
    setTouchMoving(true);
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    if (!touchMoving) return;
    const touch = e.touches[0];
    joystickCurrent.current = { x: touch.clientX, y: touch.clientY };

    const dx = joystickCurrent.current.x - joystickCenter.current.x;
    const dy = joystickCurrent.current.y - joystickCenter.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 45; // limit drag perimeter

    if (distance === 0) {
      joystickValue.current = { x: 0, y: 0 };
    } else {
      const angle = Math.atan2(dy, dx);
      const intensity = Math.min(distance, maxRadius) / maxRadius;
      
      joystickValue.current = {
        x: Math.cos(angle) * intensity,
        y: Math.sin(angle) * intensity
      };
    }
  };

  const handleJoystickEnd = () => {
    setTouchMoving(false);
    joystickValue.current = { x: 0, y: 0 };
  };

  // Submit Match Scores to profile storage on end
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

  // Trigger manually reload weapon
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
    <div id="combat_view_root" className="relative w-full h-[620px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col justify-between">
      
      {/* 1. Countdown Overlay */}
      {readyCountdown > 0 && (
        <div className="absolute inset-0 bg-slate-950/90 z-40 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
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

      {/* 2. GameOver / Out of Health Overlay */}
      {gameOver && (
        <div className="absolute inset-0 bg-slate-950/95 z-40 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
          <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 mb-4 animate-pulse">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-4xl font-extrabold text-red-500 mb-2 font-sans">لقد قُتلت في المعركة!</h2>
          <p className="text-slate-400 max-w-sm mb-6 text-sm">البقاء على قيد الحياة تطلب درعًا أقوى أو مناورات تكتيكية ممتازة.</p>
          
          <div className="grid grid-cols-2 gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl mb-6 min-w-[280px]">
            <div className="text-center p-2">
              <span className="block text-slate-500 text-xs">عدد القتلى</span>
              <span className="text-white font-extrabold text-xl">{kills}</span>
            </div>
            <div className="text-center p-2">
              <span className="block text-slate-500 text-xs">زمن البقاء</span>
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

      {/* 3. Victory Wave completed (e.g. survival of 60 seconds) */}
      {(gameTime >= 60 || kills >= 12) && !gameOver && (
        <div className="absolute inset-0 bg-slate-950/95 z-40 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
          <div className="p-4 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-4 animate-bounce">
            <Award className="w-12 h-12 text-yellow-400 animate-pulse" />
          </div>
          <h2 className="text-4xl font-extrabold text-yellow-500 mb-2 font-sans">نصر تكتيكي مؤزر! 🏆</h2>
          <p className="text-slate-400 max-w-sm mb-6 text-sm">لقد هيمنت على ساحة المعركة واكتسحت خطوط العدو الأمامية.</p>

          <div className="grid grid-cols-3 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl mb-6 min-w-[320px]">
            <div className="text-center p-1">
              <span className="block text-slate-500 text-xs">المستوى</span>
              <span className="text-yellow-400 font-extrabold text-lg">+{kills * 35 + 150} XP</span>
            </div>
            <div className="text-center p-1">
              <span className="block text-slate-500 text-xs">الذهب المكتسب</span>
              <span className="text-yellow-400 font-extrabold text-lg">+{kills * 15 + 80} 🪙</span>
            </div>
            <div className="text-center p-1">
              <span className="block text-slate-500 text-xs">الأعداء المحيدين</span>
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

      {/* 4. Battlefield Header (HUD info) */}
      <div className="relative z-10 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800 p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/50 border border-red-500/20 text-red-400">
            <Shield className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="text-sm font-bold">{health}% HP</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-950/50 border border-green-500/20 text-green-400">
            <Target className="w-4 h-4 text-green-400" />
            <span className="text-sm font-bold">
              {isReloading ? "إعادة تلقيم..." : `${ammo} / ♾️`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
          <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
            الخريطة: {activeMap.nameAr}
          </div>
          <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-yellow-400">
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
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-red-400 rounded-lg text-xs font-medium border border-slate-700 transition"
        >
          انسحاب 🏳️
        </button>
      </div>

      {/* 5. 3D WebGL Canvas Holder */}
      <div
        id="three_canvas_container"
        ref={containerRef}
        className="w-full h-full relative cursor-crosshair overflow-hidden touch-none"
      >
        {/* Mobile controls hints overlay */}
        <div className="absolute right-4 top-4 pointer-events-none p-3 rounded-lg bg-slate-900/60 backdrop-blur-sm border border-slate-800 max-w-[200px]">
          <span className="text-[10px] text-indigo-400 font-bold block mb-1">🎮 تلميحات أزرار التحكم</span>
          <span className="text-[10px] text-slate-300 block">💻 للكمبيوتر: WASD للمشي + السحب بالفأرة للتصويب + نقر/مسطرة إطلاق</span>
          <span className="text-[10px] text-slate-300 block">📱 للهاتف: عصا اللعب اليمين للتصويب + لوحة التحكم اليسارية و زر الضرب</span>
        </div>
      </div>

      {/* 6. Battlefield Footer / Action Panel (For Touch Screens/Mobile and reloading support) */}
      <div className="relative z-10 w-full bg-slate-950/90 border-t border-slate-800 p-4 flex items-center justify-between pb-6 gap-6">
        
        {/* Joystick Zone (Left) */}
        <div className="flex items-center gap-2">
          <div
            id="mobile_joystick_container"
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
            className="w-24 h-24 rounded-full bg-slate-900 border-2 border-slate-700/80 relative flex items-center justify-center cursor-default select-none active:border-indigo-500"
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
          <span className="text-xs text-slate-400 text-right font-sans hidden md:inline max-w-xs leading-5">
            <b>توجيه الهاتف 🕹️:</b> لغرض الحركة السلسة، اسحب المستشعر المركزي يساراً أو يميناً. اضرب بالمؤشر اليمين.
          </span>
        </div>

        {/* Action Controls (Right) */}
        <div className="flex items-center gap-4">
          <button
            id="reload_action_btn"
            onClick={manualReload}
            disabled={isReloading}
            className="px-4 py-3 bg-slate-800 active:bg-slate-700 border border-slate-700 rounded-xl text-white font-semibold text-sm transition duration-150 flex items-center gap-1.5"
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
            className="px-6 py-4.5 bg-red-600 active:bg-red-700 text-white font-black rounded-2xl shadow-xl transition select-none flex items-center gap-2 text-base cursor-pointer"
          >
            <Crosshair className="w-5 h-5 animate-pulse" />
            إطلاق النار 💥
          </button>
        </div>
      </div>

    </div>
  );
}
