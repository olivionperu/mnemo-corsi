// Partículas de píxeles (corazones rotos, chispas) y temblor de cámara.
import * as THREE from 'three';

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.geometry = new THREE.BoxGeometry(0.13, 0.13, 0.13);
    this.materials = new Map();
  }

  material(color) {
    if (!this.materials.has(color)) this.materials.set(color, new THREE.MeshBasicMaterial({ color }));
    return this.materials.get(color);
  }

  burst(position, { count = 30, colors = [0xff7eb6], speed = 3.5, up = 4, life = 1.1 } = {}) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.geometry, this.material(colors[i % colors.length]));
      mesh.position.copy(position);
      const angle = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.items.push({
        mesh,
        vel: new THREE.Vector3(Math.cos(angle) * s, up * (0.5 + Math.random() * 0.7), Math.sin(angle) * s),
        life,
        age: 0,
      });
      this.scene.add(mesh);
    }
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.age += dt;
      p.vel.y -= 9.8 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.07) {
        p.mesh.position.y = 0.07;
        p.vel.multiplyScalar(0.5);
        p.vel.y = Math.abs(p.vel.y) * 0.3;
      }
      const k = 1 - p.age / p.life;
      p.mesh.scale.setScalar(Math.max(0.01, k));
      if (p.age >= p.life) {
        this.scene.remove(p.mesh);
        this.items.splice(i, 1);
      }
    }
  }

  clear() {
    this.items.forEach((p) => this.scene.remove(p.mesh));
    this.items = [];
  }
}

// Temblor de cámara que se apaga solo.
export class Shake {
  constructor() {
    this.strength = 0;
    this.offset = new THREE.Vector3();
  }

  kick(strength = 0.25) {
    this.strength = Math.max(this.strength, strength);
  }

  update(dt) {
    this.strength = Math.max(0, this.strength - dt * 0.9);
    const s = this.strength;
    this.offset.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    return this.offset;
  }
}
