import * as THREE from 'three';
import { GameObject } from '../engine/GameObject.js';
import { TextureGenerator } from '../materials/TextureGenerator.js';

class Apple extends GameObject {
  constructor(startPos, groundY = 0) {
    super("Apple");
    this.startPos = startPos.clone();
    this.groundY = groundY;
    
    this.isFalling = false;
    this.timeFalling = 0;
    this.velocityY = 0;
    this.fallDelay = 0; 
    
    // Physics properties
    this.restitution = 0.4; 
    this.isResting = false;
    this.restTime = 0; 

    // Angular velocity for rotation while falling
    this.angularVelocity = new THREE.Vector3(
      Math.random() * 4 - 2, 
      Math.random() * 4 - 2, 
      Math.random() * 4 - 2
    );
    
    this.createMesh();
    this.setPosition(this.startPos.x, this.startPos.y, this.startPos.z);
  }

  createMesh() {
    const appleMat = TextureGenerator.createAppleMaterial();

    const geometry = new THREE.SphereGeometry(0.25, 32, 32);
    const appleMesh = new THREE.Mesh(geometry, appleMat);
    appleMesh.castShadow = true;
    this.add(appleMesh);

    const stemGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.15);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.position.y = 0.28;
    stem.castShadow = true;
    this.add(stem);

    const leafGeom = new THREE.ConeGeometry(0.08, 0.15, 3);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const leaf = new THREE.Mesh(leafGeom, leafMat);
    leaf.position.set(0.08, 0.28, 0);
    leaf.rotation.z = -Math.PI / 4;
    leaf.castShadow = true;
    this.add(leaf);
    
    // Random initial rotation
    this.setRotation(Math.random()*0.5-0.25, Math.random()*Math.PI, Math.random()*0.5-0.25);
    
    // Random Scale
    const scale = 0.8 + Math.random() * 0.4;
    this.setScale(scale, scale, scale);
  }

  reset() {
    this.isFalling = false;
    this.isResting = false;
    this.timeFalling = 0;
    this.restTime = 0;
    this.velocityY = 0;
    this.setPosition(this.startPos.x, this.startPos.y, this.startPos.z);
    this.setRotation(Math.random()*0.5-0.25, Math.random()*Math.PI, Math.random()*0.5-0.25);
  }
}

export class AppleSystem {
  constructor(sceneManager, physicsEngine) {
    this.sceneManager = sceneManager;
    this.physicsEngine = physicsEngine;
    this.apples = [];
    this.spawnPoints = [];
    this.isSimulationRunning = false;
    this.groundY = 0;

    this.uiTime = document.getElementById('info-time');
    this.uiPos = document.getElementById('info-pos');
    this.uiVel = document.getElementById('info-vel');
    this.uiAcc = document.getElementById('info-acc');
    
    this.targetAppleCount = 15;
    this.audioCtx = null;
  }

  playThud() {
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioCtx = new AudioContext();
        }
      }
      
      if (!this.audioCtx) return;
      
      if (this.audioCtx.state === 'suspended') {
        const resumePromise = this.audioCtx.resume();
        if (resumePromise !== undefined) {
            resumePromise.catch(e => console.warn('Audio resume error', e));
        }
      }
      
      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
      
      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.1);
    } catch (err) {
      console.warn('Gagal memainkan suara:', err);
    }
  }

  setSpawnPoints(points) {
    this.spawnPoints = points;
  }

  populateInitialApples() {
    this.apples.forEach(a => this.sceneManager.removeGameObject(a));
    this.apples = [];
    
    const count = Math.min(this.targetAppleCount, this.spawnPoints.length * 3);
    for (let i = 0; i < count; i++) {
      const sp = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
      this.spawnApple(sp);
    }
  }

  spawnApple(position = null) {
    if (!position && this.spawnPoints.length > 0) {
      position = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
    }
    if (!position) return;

    const offsetPos = position.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 1.5
    ));

    const apple = new Apple(offsetPos, this.groundY);
    apple.fallDelay = Math.random() * 5.0; 

    this.apples.push(apple);
    this.sceneManager.addGameObject(apple);
  }

  startSimulation() {
    this.isSimulationRunning = true;
    this.apples.forEach(apple => {
      if (apple.mesh.position.y > this.groundY + 0.25 && !apple.isResting) {
        apple.isFalling = true;
      }
    });
  }

  pauseSimulation() {
    this.isSimulationRunning = false;
  }

  resetSimulation() {
    this.isSimulationRunning = false;
    this.apples.forEach(apple => apple.reset());
    this.updateUI(0, this.spawnPoints[0]?.y || 0, 0); 
  }

  update(deltaTime) {
    if (!this.isSimulationRunning) return;

    let activeAppleForUI = null;

    this.apples.forEach(apple => {
      if (apple.isResting) {
        apple.restTime += deltaTime;
        if (apple.restTime > 5.0) {
          apple.reset();
          apple.isFalling = true; 
          apple.fallDelay = Math.random() * 3.0; 
        }
        return;
      }

      if (apple.isFalling) {
        if (apple.fallDelay > 0) {
          apple.fallDelay -= deltaTime;
          return; 
        }

        apple.timeFalling += deltaTime;
        const currentY = apple.mesh.position.y;
        
        // Rotate while falling
        apple.mesh.rotation.x += apple.angularVelocity.x * deltaTime;
        apple.mesh.rotation.y += apple.angularVelocity.y * deltaTime;
        apple.mesh.rotation.z += apple.angularVelocity.z * deltaTime;

        const result = this.physicsEngine.calculateFall(currentY, apple.velocityY, deltaTime);
        
        if (result.positionY - 0.25 <= this.groundY) {
          apple.setPosition(apple.mesh.position.x, this.groundY + 0.25, apple.mesh.position.z);
          
          if (Math.abs(apple.velocityY) > 1.0) {
             this.playThud();
          }

          apple.velocityY = -result.velocityY * apple.restitution;
          
          if (Math.abs(apple.velocityY) < 0.5) {
            apple.velocityY = 0;
            apple.isFalling = false;
            apple.isResting = true;
          }
          
        } else {
          apple.setPosition(apple.mesh.position.x, result.positionY, apple.mesh.position.z);
          apple.velocityY = result.velocityY;
        }
        activeAppleForUI = apple; 
      }
    });

    if (activeAppleForUI) {
      this.updateUI(activeAppleForUI.timeFalling, activeAppleForUI.mesh.position.y, activeAppleForUI.velocityY, this.physicsEngine.gravity);
    }
  }

  updateUI(time, pos, vel, acc = 9.8) {
    if (this.uiTime) this.uiTime.innerText = time.toFixed(2);
    if (this.uiPos) this.uiPos.innerText = Math.max(0, pos).toFixed(2);
    if (this.uiVel) this.uiVel.innerText = Math.abs(vel).toFixed(2);
    if (this.uiAcc) this.uiAcc.innerText = acc.toFixed(2);
  }
}
