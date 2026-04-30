export class InputManager {
  constructor(canvasContainerId) {
    this.container = document.getElementById(canvasContainerId);
    this.keys = {};
    this.mouseDelta = { x: 0, y: 0 };
    this.isPointerLocked = false;
    this.isRightMouseDown = false;

    // Keyboard
    window.addEventListener('keydown', (e) => this.keys[e.code] = true);
    window.addEventListener('keyup', (e) => this.keys[e.code] = false);

    // Mouse Buttons
    window.addEventListener('mousedown', (e) => {
      if (e.button === 2) this.isRightMouseDown = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) this.isRightMouseDown = false;
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent right click menu

    // Pointer Lock
    const clickHandler = (e) => {
      // Hanya kunci kursor jika klik kiri (button 0)
      if (e.button === 0 && !this.isPointerLocked) {
        document.body.requestPointerLock();
      }
    };

    document.body.addEventListener('mousedown', clickHandler);

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === document.body);
    });

    document.addEventListener('pointerlockerror', () => {
      console.error('Terjadi kesalahan saat mengaktifkan Pointer Lock.');
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked || this.isRightMouseDown) {
        this.mouseDelta.x += e.movementX;
        this.mouseDelta.y += e.movementY;
      }
    });
  }

  isKeyPressed(keyCode) {
    return !!this.keys[keyCode];
  }

  getMouseDelta() {
    const delta = { x: this.mouseDelta.x, y: this.mouseDelta.y };
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    return delta;
  }
}
