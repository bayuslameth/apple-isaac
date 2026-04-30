import * as THREE from 'three';
import { Engine } from './engine/Engine.js';
import { SceneManager } from './engine/SceneManager.js';
import { InputManager } from './engine/InputManager.js';
import { CollisionSystem } from './engine/CollisionSystem.js';
import { PlayerController } from './player/PlayerController.js';
import { EnvironmentBuilder } from './scene/EnvironmentBuilder.js';
import { TreeBuilder } from './scene/TreeBuilder.js';
import { NewtonBuilder } from './scene/NewtonBuilder.js';
import { PhysicsEngine } from './simulation/PhysicsEngine.js';
import { AppleSystem } from './simulation/AppleSystem.js';
import { GameObject } from './engine/GameObject.js';
import { TextureGenerator } from './materials/TextureGenerator.js';

// Initialization
const engine = new Engine('canvas-container');
const sceneManager = new SceneManager();
engine.setSceneManager(sceneManager);

const inputManager = new InputManager('canvas-container');

// Setup Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Start position slightly away from tree
camera.position.set(4, 1.7, 8); 

// Collision System
const collisionSystem = new CollisionSystem();
// Tree trunk collision
collisionSystem.addCylinderCollider(0, 0, 1.0); 
// Newton collision
collisionSystem.addBoxCollider(1.0, 2.0, 1.0, 2.0);

// Setup Held Branch (Ranting yang dipegang user)
const heldBranch = new GameObject("HeldBranch");
const woodTex = TextureGenerator.createWoodTexture();
const leafTex = TextureGenerator.createLeafTexture();
const branchMat = new THREE.MeshLambertMaterial({ map: woodTex });
const leafMat = new THREE.MeshLambertMaterial({ map: leafTex, color: 0x32cd32 });

const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 2.5, 8), branchMat);
stick.position.set(0, 1.25, 0); 
stick.castShadow = true;
heldBranch.add(stick);

const bLeaf1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), leafMat);
bLeaf1.position.set(0, 2.5, 0);
bLeaf1.castShadow = true;
heldBranch.add(bLeaf1);

const bLeaf2 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), leafMat);
bLeaf2.position.set(0.15, 2.2, 0);
bLeaf2.castShadow = true;
heldBranch.add(bLeaf2);

sceneManager.addGameObject(heldBranch);

const playerController = new PlayerController(camera, inputManager, collisionSystem, heldBranch);
playerController.yaw = Math.PI / 6; // Look at tree initially
engine.setCamera(camera);

// Add PlayerController as a GameObject to update it every frame
class PlayerObject {
  constructor(controller) {
    this.controller = controller;
  }
  update(deltaTime) {
    this.controller.update(deltaTime);
  }
}
sceneManager.gameObjects.push(new PlayerObject(playerController));

// Build Environment
const envBuilder = new EnvironmentBuilder(sceneManager);
envBuilder.buildEnvironment();

// Build Tree
const { treeObj, appleSpawnPoints } = TreeBuilder.buildTree(0, 0, 0);
sceneManager.addGameObject(treeObj);

// Setup Physics & Apple System
const physicsEngine = new PhysicsEngine();
const appleSystem = new AppleSystem(sceneManager, physicsEngine);
appleSystem.setSpawnPoints(appleSpawnPoints);
appleSystem.populateInitialApples();

// Wrapper for AppleSystem to be updated by SceneManager
class AppleSystemUpdater {
  constructor(system) {
    this.system = system;
  }
  update(deltaTime) {
    this.system.update(deltaTime);
  }
}
sceneManager.gameObjects.push(new AppleSystemUpdater(appleSystem));

// Build Newton and pass camera to him
const newton = NewtonBuilder.buildNewton(1.5, 0, 1.5, camera);
newton.mesh.lookAt(0, 0, 0);
sceneManager.addGameObject(newton);

// Start Engine Loop
engine.start();

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    if (appleSystem.isSimulationRunning) {
      appleSystem.pauseSimulation();
    } else {
      appleSystem.startSimulation();
    }
    e.preventDefault();
  } else if (e.code === 'KeyR') {
    appleSystem.resetSimulation();
  }
});

// Gravity Slider Binding
const gInput = document.getElementById('gravity-input');
const gVal = document.getElementById('gravity-val');
if (gInput && gVal) {
  gInput.addEventListener('input', (e) => {
    const newG = parseFloat(e.target.value);
    physicsEngine.setGravity(newG);
    gVal.innerText = newG.toFixed(1);
  });
}
