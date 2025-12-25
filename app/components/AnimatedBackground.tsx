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

    const PARTICLE_COUNT = 55;

    const isDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    const spawnParticle = (y?: number): Particle => {
      const radius = rand(8, 20);
      const baseOpacity = rand(0.22, 0.55);
      return {
        x: rand(0, cssWidth),
        y: y ?? rand(-cssHeight, cssHeight),
        vx: rand(-18, 18),
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
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particlesRef.current.push(spawnParticle());
      }
    };
    initParticles();

    const animate = (currentTime: number) => {
      const deltaMs = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      const dt = Math.min(0.033, Math.max(0.001, deltaMs / 1000));

      ctx.clearRect(0, 0, cssWidth, cssHeight);

      const dark = isDark();
      const tint = dark ? { r: 120, g: 175, b: 255 } : { r: 0, g: 130, b: 255 };

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];

        p.phase += dt * rand(0.8, 1.4);
        p.x += (p.vx + Math.sin(p.phase) * p.drift) * dt;
        p.y += p.vy * dt;

        if (p.x < -120) p.x = cssWidth + 120;
        if (p.x > cssWidth + 120) p.x = -120;

        if (p.y - p.radius > cssHeight + 160) {
          particlesRef.current[i] = spawnParticle(rand(-260, -40));
          continue;
        }

        const glow = p.opacity * p.glowIntensity;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.2);
        grad.addColorStop(0, `rgba(${tint.r}, ${tint.g}, ${tint.b}, ${Math.min(0.75, glow)})`);
        grad.addColorStop(0.35, `rgba(${tint.r}, ${tint.g}, ${tint.b}, ${Math.min(0.35, glow * 0.5)})`);
        grad.addColorStop(1, `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = dark
          ? `rgba(255, 255, 255, ${Math.min(0.85, p.opacity + 0.22)})`
          : `rgba(255, 255, 255, ${Math.min(0.78, p.opacity + 0.18)})`;
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
      window.removeEventListener("resize", resizeCanvas);
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
