(() => {
  const CONFIG = {
    enabledStorageKey: "butterfly_overlay_enabled",
    defaultEnabled: true,
    count: 20,
    padding: 18,
    minSpeed: 14,
    maxSpeed: 48,
    minSize: 18,
    maxSize: 54,
  };

  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const getEnabled = () => {
    try {
      const v = localStorage.getItem(CONFIG.enabledStorageKey);
      if (v === null) return CONFIG.defaultEnabled;
      return v === "1";
    } catch {
      return CONFIG.defaultEnabled;
    }
  };

  const isDisabledByFlag = () => {
    const w = window;
    return (
      (w && w.__BUTTERFLY_OVERLAY_DISABLED__ === true) ||
      document.documentElement?.dataset?.butterflyOverlay === "off"
    );
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const COLORS = [
    ["#ff7aa2", "#ffcc70"],
    ["#7dd3fc", "#a78bfa"],
    ["#34d399", "#60a5fa"],
    ["#f59e0b", "#f97316"],
    ["#fb7185", "#fda4af"],
    ["#22c55e", "#86efac"],
    ["#38bdf8", "#67e8f9"],
    ["#c084fc", "#f472b6"],
  ];

  const SHAPES = [
    {
      // rounded
      left: "M24,32 C10,26 8,12 18,8 C26,4 34,10 32,18 C31,24 28,29 24,32 Z",
      right: "M24,32 C38,26 40,12 30,8 C22,4 14,10 16,18 C17,24 20,29 24,32 Z",
    },
    {
      // pointed
      left: "M24,32 C12,30 6,16 16,10 C24,4 34,10 30,18 C27,25 28,30 24,32 Z",
      right: "M24,32 C36,30 42,16 32,10 C24,4 14,10 18,18 C21,25 20,30 24,32 Z",
    },
    {
      // big upper
      left: "M24,32 C9,28 6,10 18,7 C30,4 35,14 31,21 C28,27 28,30 24,32 Z",
      right: "M24,32 C39,28 42,10 30,7 C18,4 13,14 17,21 C20,27 20,30 24,32 Z",
    },
    {
      // narrow
      left: "M24,32 C14,28 10,12 18,9 C25,6 30,12 30,18 C30,25 28,30 24,32 Z",
      right: "M24,32 C34,28 38,12 30,9 C23,6 18,12 18,18 C18,25 20,30 24,32 Z",
    },
  ];

  const makeSVG = ({ c1, c2, shapeIndex }) => {
    const shape = SHAPES[shapeIndex % SHAPES.length];
    const uid = Math.random().toString(16).slice(2);
    return `\
<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false">\
  <defs>\
    <linearGradient id="g${uid}" x1="0" y1="0" x2="1" y2="1">\
      <stop offset="0" stop-color="${c1}" stop-opacity="0.95" />\
      <stop offset="1" stop-color="${c2}" stop-opacity="0.95" />\
    </linearGradient>\
  </defs>\
  <g fill="url(#g${uid})">\
    <path d="${shape.left}"/>\
    <path d="${shape.right}"/>\
  </g>\
  <path d="M24 14 C22 18 22 22 24 34 C26 22 26 18 24 14 Z" fill="rgba(30,30,30,0.55)"/>\
  <circle cx="24" cy="13" r="1.6" fill="rgba(30,30,30,0.6)"/>\
</svg>`;
  };

  const ensureOverlay = () => {
    let el = document.getElementById("butterfly-overlay");
    if (el) return el;
    el = document.createElement("div");
    el.id = "butterfly-overlay";
    document.body.appendChild(el);
    return el;
  };

  const init = () => {
    if (typeof window === "undefined") return;
    if (!getEnabled()) return;
    if (isDisabledByFlag()) return;
    if (prefersReducedMotion()) return;

    const overlay = ensureOverlay();
    if (overlay.dataset.started === "1") return;
    overlay.dataset.started = "1";

    const butterflies = [];

    const createButterfly = (i) => {
      const bf = document.createElement("div");
      bf.className = "bf";

      const [c1, c2] = pick(COLORS);
      const shapeIndex = i % SHAPES.length;
      bf.innerHTML = makeSVG({ c1, c2, shapeIndex });

      const size = rand(CONFIG.minSize, CONFIG.maxSize);
      bf.style.width = `${size}px`;
      bf.style.height = `${size}px`;

      overlay.appendChild(bf);

      const dir = rand(0, Math.PI * 2);
      const speed = rand(CONFIG.minSpeed, CONFIG.maxSpeed);
      const vx = Math.cos(dir) * speed;
      const vy = Math.sin(dir) * speed;

      const startX = rand(CONFIG.padding, window.innerWidth - CONFIG.padding);
      const startY = rand(CONFIG.padding, window.innerHeight - CONFIG.padding);

      return {
        el: bf,
        x: startX,
        y: startY,
        vx,
        vy,
        rot: rand(-25, 25),
        rotV: rand(-18, 18),
        flutter: rand(0, Math.PI * 2),
        flutterV: rand(5.5, 10.5),
        scale: rand(0.7, 1.25),
        wobble: rand(0.6, 1.4),
      };
    };

    for (let i = 0; i < CONFIG.count; i += 1) {
      butterflies.push(createButterfly(i));
    }

    let w = window.innerWidth;
    let h = window.innerHeight;
    let last = performance.now();
    let raf = 0;
    let running = true;

    const updateBounds = () => {
      w = window.innerWidth;
      h = window.innerHeight;
    };

    const step = (now) => {
      if (!running) return;
      const dt = clamp((now - last) / 1000, 0, 0.05);
      last = now;

      const pad = CONFIG.padding;

      for (const b of butterflies) {
        // gentle randomness
        b.vx += rand(-12, 12) * dt;
        b.vy += rand(-12, 12) * dt;

        // cap speed
        const sp = Math.hypot(b.vx, b.vy) || 0;
        const maxSp = CONFIG.maxSpeed;
        const minSp = CONFIG.minSpeed;
        if (sp > maxSp) {
          b.vx = (b.vx / sp) * maxSp;
          b.vy = (b.vy / sp) * maxSp;
        } else if (sp < minSp) {
          // nudge upward if too slow
          const d = rand(0, Math.PI * 2);
          b.vx += Math.cos(d) * (minSp - sp) * 0.35;
          b.vy += Math.sin(d) * (minSp - sp) * 0.35;
        }

        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // bounce within viewport
        if (b.x < pad) {
          b.x = pad;
          b.vx = Math.abs(b.vx);
        } else if (b.x > w - pad) {
          b.x = w - pad;
          b.vx = -Math.abs(b.vx);
        }

        if (b.y < pad) {
          b.y = pad;
          b.vy = Math.abs(b.vy);
        } else if (b.y > h - pad) {
          b.y = h - pad;
          b.vy = -Math.abs(b.vy);
        }

        // flutter / wing illusion by scaling X
        b.flutter += b.flutterV * dt;
        const wing = 0.72 + Math.sin(b.flutter) * 0.28;

        // slight rotation based on movement
        const targetRot = clamp((Math.atan2(b.vy, b.vx) * 180) / Math.PI, -55, 55);
        b.rot += (targetRot - b.rot) * dt * 3.2;
        b.rot += Math.sin(b.flutter * 0.6) * b.rotV * dt * 0.12;

        const wob = Math.sin(b.flutter * 0.9) * 6 * b.wobble;
        const tx = b.x + wob;
        const ty = b.y + Math.cos(b.flutter * 0.7) * 4 * b.wobble;

        b.el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(
          2
        )}px, 0) rotate(${b.rot.toFixed(2)}deg) scale(${b.scale.toFixed(
          3
        )}) scaleX(${wing.toFixed(3)})`;
      }

      raf = requestAnimationFrame(step);
    };

    const onVisibility = () => {
      const visible = document.visibilityState === "visible";
      running = visible;
      if (visible) {
        last = performance.now();
        raf = requestAnimationFrame(step);
      } else {
        cancelAnimationFrame(raf);
      }
    };

    window.addEventListener("resize", updateBounds);
    document.addEventListener("visibilitychange", onVisibility);

    raf = requestAnimationFrame(step);

    // Expose tiny API for toggling
    window.ButterflyOverlay = {
      enable: () => {
        try {
          localStorage.setItem(CONFIG.enabledStorageKey, "1");
        } catch {}
        window.location.reload();
      },
      disable: () => {
        try {
          localStorage.setItem(CONFIG.enabledStorageKey, "0");
        } catch {}
        window.location.reload();
      },
    };
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
