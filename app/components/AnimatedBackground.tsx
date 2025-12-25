"use client";

import { useEffect, useRef } from "react";
import styles from "./AnimatedBackground.module.css";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  glowIntensity: number;
  drift: number;
  phase: number;
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef<number>(0);
  const pointerRef = useRef<{ x: number; y: number; active: boolean; lastMs: number }>({
    x: 0,
    y: 0,
    active: false,
    lastMs: 0,
  });
  const sphereElsRef = useRef<HTMLImageElement[]>([]);
  const sphereCacheRef = useRef<{ el: HTMLImageElement; cx: number; cy: number; r: number; rect: DOMRect }[]>([]);
  const lastSpinRef = useRef<WeakMap<Element, number>>(new WeakMap());
  const lastCacheUpdateMsRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let cssWidth = 0;
    let cssHeight = 0;
    let dpr = 1;

    const resizeCanvas = () => {
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      cssWidth = window.innerWidth;
      cssHeight = window.innerHeight;
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

    const canSpin = (el: Element, ms: number) => {
      const last = lastSpinRef.current.get(el) ?? 0;
      if (ms - last < 250) return false;
      lastSpinRef.current.set(el, ms);
      return true;
    };

    const COLLISION_BOUNCE = 0.35;
    const COLLISION_DAMPING = 0.92;
    const COLLISION_TANGENTIAL_KICK = 14;
    const COLLISION_SPHERE_RADIUS_SCALE = 0.5;
    const COLLISION_INSET_PX = 1.2;

    const spinSphere = (el: Element, ms: number, intensity: number) => {
      if (!canSpin(el, ms)) return;
      try {
        (el as HTMLElement).animate(
          [
            {
              transform: "rotate(0deg)",
              filter:
                "saturate(1) brightness(1) drop-shadow(0 0 0 rgba(0, 82, 255, 0))",
            },
            {
              transform: `rotate(${Math.max(180, Math.min(420, 220 + intensity * 200))}deg)`,
              filter:
                "saturate(3.2) contrast(1.25) brightness(1.22) drop-shadow(0 0 6px rgba(0, 82, 255, 0.95)) drop-shadow(0 0 18px rgba(0, 140, 255, 0.75)) drop-shadow(0 0 36px rgba(170, 220, 255, 0.45))",
            },
            {
              transform: `rotate(${Math.max(180, Math.min(420, 220 + intensity * 200))}deg)`,
              filter:
                "saturate(1) brightness(1) drop-shadow(0 0 0 rgba(0, 82, 255, 0))",
            },
          ],
          { duration: 520, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
        );
      } catch {
        // ignore
      }
    };

    const collectSpheres = () => {
      sphereElsRef.current = Array.from(
        document.querySelectorAll<HTMLImageElement>('img[src$="/sphere.png"], img[src*="/sphere.png?"]'),
      );
    };

    const updateSphereCache = (ms: number) => {
      lastCacheUpdateMsRef.current = ms;
      sphereCacheRef.current = sphereElsRef.current
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const r = Math.max(1, Math.min(rect.width, rect.height) / 2);
          return { el, rect, r, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
        })
        .filter((s) => Number.isFinite(s.cx) && Number.isFinite(s.cy) && s.r > 2);
    };

    collectSpheres();
    updateSphereCache(nowMs());

    const mo = new MutationObserver(() => {
      collectSpheres();
      updateSphereCache(nowMs());
    });
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });

    const setPointer = (clientX: number, clientY: number, active: boolean) => {
      const ms = nowMs();
      pointerRef.current.x = clientX;
      pointerRef.current.y = clientY;
      pointerRef.current.active = active;
      pointerRef.current.lastMs = ms;

      const spheres = sphereCacheRef.current;
      if (!spheres.length) return;

      let best: (typeof spheres)[number] | undefined;
      let bestD2 = Infinity;
      for (let i = 0; i < spheres.length; i++) {
        const s = spheres[i];
        const dx = clientX - s.cx;
        const dy = clientY - s.cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = s;
        }
      }

      if (!best) return;
      const d = Math.sqrt(bestD2);
      if (d < best.r * 0.65) {
        const intensity = Math.max(0, 1 - d / (best.r * 0.65));
        spinSphere(best.el, ms, intensity);
      }
    };

    const onPointerDown = (e: PointerEvent) => setPointer(e.clientX, e.clientY, true);
    const onPointerMove = (e: PointerEvent) => {
      if (pointerRef.current.active) setPointer(e.clientX, e.clientY, true);
      else setPointer(e.clientX, e.clientY, false);
    };
    const onPointerUp = (e: PointerEvent) => setPointer(e.clientX, e.clientY, false);

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });

    const getTargetParticleCount = () => {
      const area = Math.max(1, cssWidth * cssHeight);
      const target = Math.round(area / 12000);
      return Math.max(90, Math.min(170, target));
    };

    let targetParticleCount = getTargetParticleCount();

    const isDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    const spawnParticle = (y?: number): Particle => {
      const radius = rand(6.5, 16);
      const baseOpacity = rand(0.28, 0.62);
      return {
        x: rand(0, cssWidth),
        y: y ?? rand(-cssHeight * 0.25, cssHeight),
        vx: rand(-16, 16),
        vy: rand(28, 90) + radius * 4,
        radius,
        opacity: baseOpacity,
        glowIntensity: rand(0.35, 0.9),
        drift: rand(12, 40),
        phase: rand(0, Math.PI * 2),
      };
    };

    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < targetParticleCount; i++) {
        particlesRef.current.push(spawnParticle(rand(-cssHeight * 0.25, cssHeight)));
      }
    };
    initParticles();

    const syncParticleCount = () => {
      const desired = targetParticleCount;
      const current = particlesRef.current.length;
      if (current < desired) {
        const add = Math.min(40, desired - current);
        for (let i = 0; i < add; i++) particlesRef.current.push(spawnParticle(rand(-cssHeight * 0.25, cssHeight * 0.35)));
      } else if (current > desired) {
        particlesRef.current.length = desired;
      }
    };

    const resizeCanvasWithParticles = () => {
      resizeCanvas();
      targetParticleCount = getTargetParticleCount();
      syncParticleCount();
      updateSphereCache(nowMs());
    };

    window.removeEventListener("resize", resizeCanvas);
    window.addEventListener("resize", resizeCanvasWithParticles);

    const animate = (currentTime: number) => {
      const deltaMs = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      const dt = Math.min(0.033, Math.max(0.001, deltaMs / 1000));

      ctx.clearRect(0, 0, cssWidth, cssHeight);

      const dark = isDark();
      const tint = dark ? { r: 120, g: 175, b: 255 } : { r: 0, g: 130, b: 255 };

      const ms = nowMs();
      if (ms - lastCacheUpdateMsRef.current > 650) updateSphereCache(ms);
      if (particlesRef.current.length !== targetParticleCount) syncParticleCount();

      const spheres = sphereCacheRef.current;
      const pointer = pointerRef.current;
      const pointerRecentlyActive = ms - pointer.lastMs < 120;
      const repelActive = pointer.active || pointerRecentlyActive;
      const repelRadius = 150;
      const repelRadius2 = repelRadius * repelRadius;
      const repelStrength = pointer.active ? 200 : 120;

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];

        p.phase += dt * rand(0.8, 1.4);
        p.x += (p.vx + Math.sin(p.phase) * p.drift) * dt;
        p.y += p.vy * dt;

        const margin = 140;
        if (p.x < -margin) {
          p.x = cssWidth + margin;
          p.y = rand(-cssHeight * 0.25, cssHeight);
        } else if (p.x > cssWidth + margin) {
          p.x = -margin;
          p.y = rand(-cssHeight * 0.25, cssHeight);
        }

        if (p.y < -margin) {
          p.y = cssHeight + margin;
          p.x = rand(0, cssWidth);
        } else if (p.y - p.radius > cssHeight + margin) {
          p.y = rand(-margin, -12);
          p.x = rand(0, cssWidth);
          p.vx = rand(-16, 16);
          p.vy = rand(28, 90) + p.radius * 4;
          p.drift = rand(12, 40);
          p.phase = rand(0, Math.PI * 2);
        }

        if (repelActive) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > 0.0001 && d2 < repelRadius2) {
            const d = Math.sqrt(d2);
            const nx = dx / d;
            const ny = dy / d;
            const falloff = 1 - d / repelRadius;
            const impulse = repelStrength * falloff;
            p.vx += nx * impulse * dt;
            p.vy += ny * impulse * dt;
          }
        }

        if (spheres.length) {
          for (let si = 0; si < spheres.length; si++) {
            const s = spheres[si];
            if (
              p.x < s.rect.left - 60 ||
              p.x > s.rect.right + 60 ||
              p.y < s.rect.top - 60 ||
              p.y > s.rect.bottom + 60
            ) {
              continue;
            }

            const dx = p.x - s.cx;
            const dy = p.y - s.cy;
            const d2 = dx * dx + dy * dy;
            const hitR = Math.max(1, s.r * COLLISION_SPHERE_RADIUS_SCALE + p.radius - COLLISION_INSET_PX);
            if (d2 > 0.001 && d2 < hitR * hitR) {
              const d = Math.sqrt(d2);
              const nx = dx / d;
              const ny = dy / d;

              p.x = s.cx + nx * hitR;
              p.y = s.cy + ny * hitR;

              const vn = p.vx * nx + p.vy * ny;
              if (vn < 0) {
                p.vx = p.vx - (1 + COLLISION_BOUNCE) * vn * nx;
                p.vy = p.vy - (1 + COLLISION_BOUNCE) * vn * ny;
                p.vx *= COLLISION_DAMPING;
                p.vy *= COLLISION_DAMPING;
              }
              p.vx += -ny * COLLISION_TANGENTIAL_KICK * dt;
              p.vy += nx * COLLISION_TANGENTIAL_KICK * dt;

              spinSphere(s.el, ms, Math.min(1, Math.max(0.25, p.radius / 16)));
            }
          }
        }

        const glow = p.opacity * p.glowIntensity;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.35);
        grad.addColorStop(0, `rgba(${tint.r}, ${tint.g}, ${tint.b}, ${Math.min(0.9, glow)})`);
        grad.addColorStop(0.32, `rgba(${tint.r}, ${tint.g}, ${tint.b}, ${Math.min(0.5, glow * 0.65)})`);
        grad.addColorStop(1, `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = dark
          ? `rgba(255, 255, 255, ${Math.min(0.92, p.opacity + 0.28)})`
          : `rgba(255, 255, 255, ${Math.min(0.86, p.opacity + 0.22)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      } else {
        lastTimeRef.current = performance.now();
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("resize", resizeCanvasWithParticles);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      mo.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      aria-hidden="true"
    />
  );
}
