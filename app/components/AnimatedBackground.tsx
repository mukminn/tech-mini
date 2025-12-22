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

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Physics constants
    const BOUNCE_DAMPING = 0.95;
    const BASE_RADIUS = 15;
    const PARTICLE_COUNT = 50; // 50 bola

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          radius: BASE_RADIUS + Math.random() * 10,
          opacity: 0.4 + Math.random() * 0.4,
          glowIntensity: 0.6 + Math.random() * 0.4,
        });
      }
    };
    initParticles();

    // Animation loop
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      // Clear canvas with fade
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      ctx.fillStyle = isDark ? "rgba(10, 10, 10, 0.1)" : "rgba(255, 255, 255, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.y - particle.radius <= 0) {
          particle.y = particle.radius;
          particle.vy *= -BOUNCE_DAMPING;
        }
        if (particle.y + particle.radius >= canvas.height) {
          particle.y = canvas.height - particle.radius;
          particle.vy *= -BOUNCE_DAMPING;
        }
        if (particle.x - particle.radius <= 0) {
          particle.x = particle.radius;
          particle.vx *= -BOUNCE_DAMPING;
        }
        if (particle.x + particle.radius >= canvas.width) {
          particle.x = canvas.width - particle.radius;
          particle.vx *= -BOUNCE_DAMPING;
        }

        // Draw particle with blue neon glow
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.radius * 2.5
        );

        const baseColor = `rgba(0, 150, 255, ${particle.opacity})`;
        const glowColor = `rgba(0, 100, 255, ${particle.opacity * particle.glowIntensity * 0.4})`;
        const outerGlow = `rgba(0, 150, 255, ${particle.opacity * 0.1})`;

        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(0.4, glowColor);
        gradient.addColorStop(0.8, outerGlow);
        gradient.addColorStop(1, "rgba(0, 150, 255, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core
        ctx.fillStyle = `rgba(0, 200, 255, ${particle.opacity * 0.9})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
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
