import * as THREE from 'three';
import { createRng } from '../painting/math';

function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

/** Procedural oak floor planks (no external image assets). */
export function woodFloor() {
  const rng = createRng(42);
  return canvasTex(1024, 1024, (ctx) => {
    const plankH = 128;
    for (let y = 0; y < 1024; y += plankH) {
      let x = -rng() * 400;
      while (x < 1024) {
        const len = 380 + rng() * 420;
        const base = 120 + rng() * 30;
        ctx.fillStyle = `rgb(${base + 34},${base - 4},${base - 46})`;
        ctx.fillRect(x, y, len, plankH);
        for (let g = 0; g < 28; g++) {
          ctx.strokeStyle = `rgba(${60 + rng() * 30},${35 + rng() * 20},${15},${0.06 + rng() * 0.12})`;
          ctx.lineWidth = 1 + rng() * 2.5;
          ctx.beginPath();
          const gy = y + rng() * plankH;
          ctx.moveTo(x, gy);
          for (let k = 0; k <= 8; k++) ctx.lineTo(x + (len * k) / 8, gy + Math.sin(k + rng()) * 4);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(30,18,8,.55)';
        ctx.fillRect(x, y, 2, plankH);
        x += len;
      }
      ctx.fillStyle = 'rgba(30,18,8,.5)';
      ctx.fillRect(0, y, 1024, 2);
    }
  }, [3, 3]);
}

export function plaster(color = '#E9E2D4') {
  const rng = createRng(7);
  return canvasTex(512, 512, (ctx) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3500; i++) {
      ctx.fillStyle = `rgba(${rng() > 0.5 ? '255,255,255' : '120,105,85'},${rng() * 0.05})`;
      const r = 2 + rng() * 14;
      ctx.beginPath(); ctx.arc(rng() * 512, rng() * 512, r, 0, Math.PI * 2); ctx.fill();
    }
  }, [3, 2]);
}

export function canvasWeave() {
  return canvasTex(256, 256, (ctx) => {
    ctx.fillStyle = '#F1ECE1'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 3) {
      ctx.fillStyle = 'rgba(120,100,70,.07)'; ctx.fillRect(i, 0, 1, 256); ctx.fillRect(0, i, 256, 1);
    }
  }, [4, 4]);
}

export function paperTex(color: string) {
  const rng = createRng(3);
  return canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 600; i++) { ctx.fillStyle = `rgba(0,0,0,${rng() * 0.035})`; ctx.fillRect(rng() * 128, rng() * 128, 1.5, 1.5); }
  });
}
