/* macYourCash · build-pool illustration (not live data) */
(() => {
  const cv = document.querySelector('canvas[data-pool]');
  if (!cv) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const g = cv.getContext('2d');
  const GREEN = '98,230,164', AMBER = '255,190,90';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = (x) => 1 - Math.pow(1 - x, 3);

  let w = 0, h = 0, cols = 8, rows = 4, M = [], src = { x: 0, y: 0, w: 0, h: 0 };
  const layout = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const narrow = w < 640;
    cols = narrow ? 5 : 8; rows = narrow ? 4 : 4;
    const gx0 = narrow ? w * 0.08 : w * 0.34, gx1 = w * 0.95;
    const gy0 = h * (narrow ? 0.36 : 0.14), gy1 = h * 0.88;
    const cw = (gx1 - gx0) / cols, ch = (gy1 - gy0) / rows;
    const old = M;
    M = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const prev = old[i];
      M.push(Object.assign(prev || { state: Math.random() < 0.08 ? 'off' : 'idle', t0: 0, dur: 0, ownerAfter: false, ownerUntil: 0, flash: 0 }, {
        x: gx0 + c * cw + cw * 0.12, y: gy0 + r * ch + ch * 0.18, w: cw * 0.76, h: ch * 0.6,
      }));
    }
    src = narrow ? { x: w * 0.08, y: h * 0.08, w: w * 0.84, h: 46 } : { x: w * 0.05, y: h * 0.5 - 34, w: w * 0.2, h: 68 };
  };
  layout();
  let lastT = 0;
  addEventListener('resize', () => { layout(); draw(lastT); });

  const jobs = [], backs = [];
  let nextJob = 0, nextOwner = 0;
  const statsEl = document.querySelector('[data-pool-stats]');
  const rr = (x, y, ww, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); };
  const srcPt = () => ({ x: src.x + src.w, y: src.y + src.h / 2 });

  const step = (t) => {
    if (t > nextJob) {
      const idle = M.filter((m) => m.state === 'idle' && !jobs.some((j) => j.m === m));
      if (idle.length) {
        const m = idle[Math.floor(Math.random() * idle.length)];
        jobs.push({ m, t0: t, dur: rnd(0.9, 1.3) });
      }
      nextJob = t + rnd(0.45, 1.1);
    }
    if (t > nextOwner) {
      const m = M[Math.floor(Math.random() * M.length)];
      if (m.state === 'idle') { m.state = 'owner'; m.ownerUntil = t + rnd(5, 11); }
      else if (m.state === 'run') m.ownerAfter = true;
      nextOwner = t + rnd(2.2, 4.2);
    }
    for (let i = jobs.length - 1; i >= 0; i--) {
      const j = jobs[i];
      if (t - j.t0 >= j.dur) {
        jobs.splice(i, 1);
        if (j.m.state === 'idle') { j.m.state = 'run'; j.m.t0 = t; j.m.dur = rnd(4, 9); }
      }
    }
    M.forEach((m) => {
      if (m.state === 'run' && t - m.t0 >= m.dur) {
        m.flash = t;
        backs.push({ m, t0: t, dur: 0.9 });
        if (m.ownerAfter) { m.state = 'owner'; m.ownerAfter = false; m.ownerUntil = t + rnd(5, 10); } else m.state = 'idle';
      }
      if (m.state === 'owner' && t > m.ownerUntil) m.state = 'idle';
    });
    for (let i = backs.length - 1; i >= 0; i--) if (t - backs[i].t0 > backs[i].dur) backs.splice(i, 1);
  };

  const bez = (a, b, u) => {
    const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - 40;
    const x = (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * cx + u * u * b.x;
    const y = (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * cy + u * u * b.y;
    return { x, y };
  };

  function draw(t) {
    lastT = t;
    g.clearRect(0, 0, w, h);
    // source node
    rr(src.x, src.y, src.w, src.h, 14);
    g.fillStyle = 'rgba(255,255,255,.04)'; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '600 13px Geist, "PingFang SC", sans-serif'; g.textBaseline = 'middle';
    g.fillText('GitHub Actions', src.x + 16, src.y + src.h / 2 - 9);
    g.fillStyle = 'rgba(255,255,255,.45)'; g.font = '11px "Geist Mono", ui-monospace, monospace';
    g.fillText(`队列中 ${jobs.length} 个任务`, src.x + 16, src.y + src.h / 2 + 11);

    const a = srcPt();
    // links
    jobs.forEach((j) => {
      const b = { x: j.m.x, y: j.m.y + j.m.h / 2 };
      const u = Math.min(1, (t - j.t0) / j.dur);
      g.strokeStyle = `rgba(${GREEN},${0.18 * (1 - u * 0.5)})`; g.lineWidth = 1;
      g.beginPath();
      for (let s = 0; s <= 20; s++) { const p = bez(a, b, s / 20); s ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }
      g.stroke();
      const p = bez(a, b, ease(u));
      g.shadowColor = `rgba(${GREEN},.9)`; g.shadowBlur = 14;
      g.fillStyle = `rgb(${GREEN})`; g.beginPath(); g.arc(p.x, p.y, 3.2, 0, 6.283); g.fill();
      g.shadowBlur = 0;
    });
    backs.forEach((k) => {
      const u = Math.min(1, (t - k.t0) / k.dur);
      const p = bez({ x: k.m.x, y: k.m.y + k.m.h / 2 }, a, ease(u));
      g.fillStyle = `rgba(255,255,255,${0.8 * (1 - u)})`;
      g.beginPath(); g.arc(p.x, p.y, 2.2, 0, 6.283); g.fill();
    });

    // machines
    let nRun = 0, nIdle = 0, nOwn = 0;
    M.forEach((m) => {
      const r = Math.min(10, m.h * 0.22);
      rr(m.x, m.y, m.w, m.h, r);
      if (m.state === 'run') {
        nRun++;
        const pr = Math.min(1, (t - m.t0) / m.dur);
        g.fillStyle = `rgba(${GREEN},.13)`; g.fill();
        g.shadowColor = `rgba(${GREEN},.55)`; g.shadowBlur = 18;
        g.strokeStyle = `rgba(${GREEN},.85)`; g.lineWidth = 1.2; g.stroke(); g.shadowBlur = 0;
        g.fillStyle = `rgba(${GREEN},.9)`;
        g.fillRect(m.x + 10, m.y + m.h - 9, (m.w - 20) * pr, 2.5);
        g.fillStyle = 'rgba(255,255,255,.10)';
        g.fillRect(m.x + 10 + (m.w - 20) * pr, m.y + m.h - 9, (m.w - 20) * (1 - pr), 2.5);
        if (m.ownerAfter) { g.fillStyle = `rgb(${AMBER})`; g.beginPath(); g.arc(m.x + m.w - 10, m.y + 10, 3, 0, 6.283); g.fill(); }
      } else if (m.state === 'owner') {
        nOwn++;
        g.fillStyle = `rgba(${AMBER},.08)`; g.fill();
        g.strokeStyle = `rgba(${AMBER},.6)`; g.lineWidth = 1.1; g.stroke();
      } else if (m.state === 'idle') {
        nIdle++;
        g.fillStyle = 'rgba(255,255,255,.035)'; g.fill();
        g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1; g.stroke();
      } else {
        g.fillStyle = 'rgba(255,255,255,.012)'; g.fill();
        g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1; g.stroke();
      }
      const f = t - m.flash;
      if (m.flash && f < 0.6) {
        rr(m.x - 3, m.y - 3, m.w + 6, m.h + 6, r + 3);
        g.strokeStyle = `rgba(255,255,255,${0.7 * (1 - f / 0.6)})`; g.lineWidth = 1.5; g.stroke();
      }
      // status light
      g.fillStyle = m.state === 'run' ? `rgb(${GREEN})` : m.state === 'owner' ? `rgba(${AMBER},.9)` : m.state === 'idle' ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.1)';
      g.beginPath(); g.arc(m.x + m.w / 2, m.y + m.h * 0.42, 2, 0, 6.283); g.fill();
    });
    if (statsEl) statsEl.textContent = `正在构建 ${nRun} 台 · 空闲 ${nIdle} 台 · 机主在用 ${nOwn} 台`;
  }

  // warm up so the first frame already looks alive
  let sim = 0;
  for (let i = 0; i < 300; i++) { sim += 1 / 30; step(sim); }
  let base = performance.now() / 1000 - sim;
  draw(sim);

  let vis = false, id = 0;
  const tick = (now) => {
    const t = now / 1000 - base;
    step(t); draw(t);
    id = vis && !document.hidden ? requestAnimationFrame(tick) : 0;
  };
  if (!reduce) {
    new IntersectionObserver((es) => {
      vis = es[0].isIntersecting;
      if (vis && !id) { base = performance.now() / 1000 - sim; id = requestAnimationFrame(tick); }
      if (!vis) sim = performance.now() / 1000 - base;
    }).observe(cv);
  }
})();
