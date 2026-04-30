export class PhysicsEngine {
  constructor() {
    this.gravity = 9.8; // m/s^2
  }

  setGravity(g) {
    this.gravity = g;
  }

  // Pure function to calculate free fall
  calculateFall(positionY, velocityY, deltaTime) {
    const newVelocityY = velocityY - (this.gravity * deltaTime);
    const newPositionY = positionY + (newVelocityY * deltaTime);
    
    return {
      positionY: newPositionY,
      velocityY: newVelocityY
    };
  }
}
