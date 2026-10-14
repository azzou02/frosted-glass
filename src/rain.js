/**
 * Rain on glass.
 * Two things happen on the frosted canvas:
 *   1. Static-ish beaded droplets that cling to the glass and slowly shrink.
 *   2. Occasional heavier drops that break loose and streak downward,
 *      leaving a thin wet trail (which clears a little of the beading).
 *
 * This is purely decorative; it draws onto its own canvas that lives inside
 * the frosted layer, so it gets masked away wherever the cursor wipes.
 */
export function initRain(canvas) {
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  /** @type {{x:number,y:number,r:number,life:number}[]} */
  let beads = [];
  /** @type {{x:number,y:number,r:number,vy:number}[]} */
  let streaks = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedBeads();
  }

  function seedBeads() {
    const target = Math.round((w * h) / 9000); // density scales with area
    beads = [];
    for (let i = 0; i < target; i++) {
      beads.push(spawnBead());
    }
  }

  function spawnBead() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.8 + Math.random() * 2.6,
      life: 0.4 + Math.random() * 0.6,
    };
  }

  function spawnStreak() {
    streaks.push({
      x: Math.random() * w,
      y: -10,
      r: 1.6 + Math.random() * 2.4,
      vy: 1.4 + Math.random() * 2.6,
    });
  }

  function drawDroplet(x, y, r, alpha) {
    // cool highlight + soft shadow to read as a water bead on glass
    const g = ctx.createRadialGradient(
      x - r * 0.4,
      y - r * 0.4,
      r * 0.1,
      x,
      y,
      r
    );
    g.addColorStop(0, `rgba(235,246,255,${0.9 * alpha})`);
    g.addColorStop(0.4, `rgba(186,222,247,${0.45 * alpha})`);
    g.addColorStop(1, `rgba(80,120,160,${0.08 * alpha})`);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    // tiny specular dot
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.35, Math.max(0.4, r * 0.22), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.8 * alpha})`;
    ctx.fill();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(50, now - last) / 16.67; // ~frames
    last = now;

    ctx.clearRect(0, 0, w, h);

    // beads: gentle shimmer, occasional respawn
    for (const b of beads) {
      drawDroplet(b.x, b.y, b.r, b.life);
      b.life -= 0.0008 * dt;
      if (b.life <= 0.15) Object.assign(b, spawnBead());
    }

    // spawn new streaks over time
    if (Math.random() < 0.06 * dt) spawnStreak();

    // streaks fall and leave a short tail
    for (let i = streaks.length - 1; i >= 0; i--) {
      const s = streaks[i];
      s.y += s.vy * dt;
      s.vy += 0.02 * dt; // slight acceleration

      // tail
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x, s.y - s.r * 6);
      ctx.strokeStyle = 'rgba(210,235,255,0.18)';
      ctx.lineWidth = s.r * 0.9;
      ctx.lineCap = 'round';
      ctx.stroke();

      drawDroplet(s.x, s.y, s.r, 0.9);

      if (s.y - s.r > h) streaks.splice(i, 1);
    }

    raf = requestAnimationFrame(frame);
  }

  let raf = 0;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  resize();
  window.addEventListener('resize', resize);
  if (!reduce) {
    raf = requestAnimationFrame(frame);
  } else {
    // draw a single static field of beads
    ctx.clearRect(0, 0, w, h);
    for (const b of beads) drawDroplet(b.x, b.y, b.r, b.life);
  }

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  };
}
