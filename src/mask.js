/**
 * Cursor wipe mask.
 *
 * The frosted layer is a normal DOM element. We clip it with a CSS mask whose
 * alpha comes from an offscreen canvas:
 *   - canvas starts FULLY WHITE  -> frost fully visible
 *   - we paint soft BLACK circles where the cursor moves (destination-out
 *     style via black fill on a white base) -> those spots reveal the sharp bg
 *   - every frame we fade the whole canvas back toward white -> wiped trails
 *     slowly "re-frost", so the glass heals behind the cursor.
 *
 * We convert the canvas to an object URL each frame and feed it to the CSS
 * mask-image. This keeps the heavy blur in CSS (GPU) while JS only paints a
 * cheap grayscale alpha map.
 */
export function initMask(frostEl, hostEl) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  // mask runs at reduced resolution — it's blurry anyway, saves a lot of work
  const SCALE = 0.35;

  const pointer = { x: -9999, y: -9999, active: false };
  // trail of recent points so fast movements still carve a continuous path
  let lastPaint = null;

  function resize() {
    const rect = hostEl.getBoundingClientRect();
    w = Math.max(1, Math.floor(rect.width * SCALE));
    h = Math.max(1, Math.floor(rect.height * SCALE));
    canvas.width = w;
    canvas.height = h;
    // reset to fully frosted (white = opaque mask = frost shown)
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
  }

  function wipeAt(px, py) {
    const x = px * SCALE;
    const y = py * SCALE;
    const r = 90 * SCALE; // wipe radius in device-independent px

    // draw a soft hole: black with a feathered radial gradient
    const paintCircle = (cx, cy) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(0,0,0,0.9)');
      g.addColorStop(0.6, 'rgba(0,0,0,0.5)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    };

    // interpolate between last and current point for continuous strokes
    if (lastPaint) {
      const dx = x - lastPaint.x;
      const dy = y - lastPaint.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.floor(dist / (r * 0.4)));
      for (let i = 1; i <= steps; i++) {
        paintCircle(lastPaint.x + (dx * i) / steps, lastPaint.y + (dy * i) / steps);
      }
    } else {
      paintCircle(x, y);
    }
    lastPaint = { x, y };
  }

  let objectUrl = null;
  function pushToMask() {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const prev = objectUrl;
      objectUrl = url;
      const value = `url(${url})`;
      frostEl.style.maskImage = value;
      frostEl.style.webkitMaskImage = value;
      frostEl.style.maskSize = '100% 100%';
      frostEl.style.webkitMaskSize = '100% 100%';
      if (prev) URL.revokeObjectURL(prev);
    });
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let raf = 0;
  function frame() {
    // heal: fade whole mask back toward white (re-frost)
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255,255,255,0.012)';
    ctx.fillRect(0, 0, w, h);

    if (pointer.active) wipeAt(pointer.x, pointer.y);

    pushToMask();
    raf = requestAnimationFrame(frame);
  }

  function onMove(clientX, clientY) {
    const rect = hostEl.getBoundingClientRect();
    pointer.x = clientX - rect.left;
    pointer.y = clientY - rect.top;
    pointer.active = true;
  }

  hostEl.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
  hostEl.addEventListener('mouseleave', () => {
    pointer.active = false;
    lastPaint = null;
  });
  hostEl.addEventListener(
    'touchmove',
    (e) => {
      const t = e.touches[0];
      if (t) onMove(t.clientX, t.clientY);
    },
    { passive: true }
  );
  hostEl.addEventListener('touchend', () => {
    pointer.active = false;
    lastPaint = null;
  });

  window.addEventListener('resize', resize);
  resize();

  if (!reduce) {
    raf = requestAnimationFrame(frame);
  } else {
    pushToMask(); // static fully-frosted
  }

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  };
}
