/* SAKYAROY LABS · decorative spectrum displays, Silencio-style knobs, dust motes */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const GOLD = [217, 181, 122];
  const TEAL = [87, 194, 180];

  /* smooth pseudo-random field in (x, t) */
  const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
  const vnoise = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };
  const field = (x, t, detail) => {
    let v = 0, a = 0.5, fr = 1;
    for (let o = 0; o < 4; o++) { v += a * vnoise(x * fr * (2 + detail * 6) + t * (0.6 + o * 0.35) + o * 17.3); fr *= 2; a *= 0.5; }
    return v;
  };

  /* params: depth 0..1 (attenuation), focus 0..1, bias -1..1 */
  function makeDisplay(cv, opts) {
    const g = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1, last = null;
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (last) draw(last[0], last[1]);
    };
    size();
    addEventListener('resize', size);
    const fx = (f) => Math.log10(f / 20) / Math.log10(1000);
    const N = 220;
    function draw(t, p) {
      last = [t, p];
      g.clearRect(0, 0, w, h);
      const padL = opts.labels ? 28 : 0, padB = opts.labels ? 24 : 0;
      const W = w - padL - (opts.labels ? 16 : 0), H = h - padB;
      const y0 = H * (opts.zero || 0.42);
      const X = (u) => padL + u * W;
      if (opts.labels) {
        g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1;
        g.fillStyle = 'rgba(255,255,255,.38)'; g.font = '10px "Geist Mono", ui-monospace, monospace'; g.textAlign = 'center';
        [[20, '20'], [50, '50'], [100, '100'], [500, '500'], [1000, '1k'], [5000, '5k'], [10000, '10k'], [20000, '20k Hz']].forEach(([f, l]) => {
          const x = X(fx(f));
          g.beginPath(); g.moveTo(x + 0.5, 10); g.lineTo(x + 0.5, H); g.stroke();
          g.fillText(l, Math.min(x, w - 24), h - 7);
        });
        g.textAlign = 'left'; g.fillText('0', 8, y0 + 3);
      }
      g.strokeStyle = 'rgba(217,181,122,.55)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(X(0), y0 + 0.5); g.lineTo(X(1), y0 + 0.5); g.stroke();

      const cross = 0.30 - p.bias * 0.07;
      const sig = new Float32Array(N + 1), red = new Float32Array(N + 1);
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const n1 = field(u * 3.2, t * 0.55, p.focus);
        const lowHump = Math.pow(clamp(1 - u / cross, 0, 1), 0.6);
        sig[i] = (0.35 + 0.8 * n1) * lowHump * H * 0.30 * (1.05 - p.depth * 0.35);
        const rise = clamp((u - cross + 0.02) / 0.1, 0, 1);
        const n2 = field(u * 5 + 4.1, t * 0.8, p.focus);
        const spike = Math.exp(-Math.pow((u - 0.58) / 0.012, 2)) * (0.35 + 0.65 * vnoise(t * 2.3)) * -0.55 + Math.exp(-Math.pow((u - 0.72) / 0.008, 2)) * 0.6;
        red[i] = rise * Math.max(0.06, 0.42 + 1.05 * (n2 - 0.47) + spike * (0.4 + p.focus)) * H * 0.34 * (0.25 + p.depth * 0.95) * (1 + p.bias * 0.25);
      }
      const area = (arr, sign, rgb) => {
        const grad = g.createLinearGradient(0, y0, 0, y0 + sign * H * 0.4);
        grad.addColorStop(0, `rgba(${rgb},.78)`); grad.addColorStop(1, `rgba(${rgb},.04)`);
        g.fillStyle = grad;
        g.beginPath(); g.moveTo(X(0), y0);
        for (let i = 0; i <= N; i++) g.lineTo(X(i / N), y0 + sign * arr[i]);
        g.lineTo(X(1), y0); g.closePath(); g.fill();
      };
      area(sig, -1, GOLD.join(','));
      area(red, 1, TEAL.join(','));
      g.shadowColor = 'rgba(255,255,255,.65)'; g.shadowBlur = opts.glow ? 14 : 6;
      g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = opts.glow ? 1.6 : 1.3;
      g.beginPath();
      for (let i = 0; i <= N; i++) {
        const y = y0 - sig[i] + red[i];
        if (i) g.lineTo(X(i / N), y); else g.moveTo(X(0), y);
      }
      g.stroke(); g.shadowBlur = 0;
    }
    return { draw };
  }

  const loops = [];
  const run = (el, fn) => {
    let vis = false, id = 0;
    const tick = (now) => { fn(now / 1000); id = vis && !reduce && !document.hidden ? requestAnimationFrame(tick) : 0; };
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; if (vis && !id) id = requestAnimationFrame(tick); }).observe(el);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && vis && !id) id = requestAnimationFrame(tick); });
    fn(performance.now() / 1000);
    loops.push(tick);
  };

  /* hero spectrum: wanders on its own */
  const hero = document.querySelector('[data-spectrum="hero"]');
  if (hero) {
    const d = makeDisplay(hero, { labels: false, glow: true, zero: 0.5 });
    run(hero, (t) => d.draw(t, { depth: 0.55 + 0.25 * Math.sin(t * 0.21), focus: 0.5 + 0.3 * Math.sin(t * 0.13), bias: 0.2 * Math.sin(t * 0.17) }));
  }

  /* panel spectrum: driven by the knobs */
  const panel = document.querySelector('[data-spectrum="panel"]');
  const state = { att: -10, focus: 50, bias: 0 };
  if (panel) {
    const d = makeDisplay(panel, { labels: true, glow: false, zero: 0.4 });
    run(panel, (t) => d.draw(t, { depth: clamp(-state.att / 20, 0, 1), focus: state.focus / 100, bias: state.bias / 20 }));
  }

  /* knobs */
  document.querySelectorAll('.knob').forEach((k) => {
    const min = +k.dataset.min, max = +k.dataset.max, step = +k.dataset.step, def = +k.dataset.value;
    const key = k.dataset.key, unit = k.dataset.unit || '';
    const valEl = k.parentElement.querySelector('.knob-val');
    const arc = k.querySelector('.arc');
    const L = arc ? arc.getTotalLength() : 0;
    let v = def;
    const fmt = (x) => (unit === 'dB' ? x.toFixed(1) + ' dB' : String(Math.round(x)));
    const set = (x) => {
      v = clamp(Math.round(x / step) * step, min, max);
      const f = (v - min) / (max - min);
      k.style.setProperty('--a', (-135 + 270 * f).toFixed(1) + 'deg');
      if (arc) arc.style.strokeDashoffset = String(L * (1 - f));
      k.setAttribute('aria-valuenow', String(v));
      k.setAttribute('aria-valuetext', fmt(v));
      if (valEl) valEl.textContent = fmt(v);
      state[key] = v;
    };
    if (arc) { arc.style.strokeDasharray = `${L} ${L}`; }
    set(def);
    let sy = 0, sx = 0, sv = 0, drag = false;
    k.addEventListener('pointerdown', (e) => { drag = true; sy = e.clientY; sx = e.clientX; sv = v; k.setPointerCapture(e.pointerId); e.preventDefault(); });
    k.addEventListener('pointermove', (e) => { if (!drag) return; const d = (sy - e.clientY) + (e.clientX - sx) * 0.6; set(sv + (d / 180) * (max - min)); });
    const end = () => { drag = false; };
    k.addEventListener('pointerup', end); k.addEventListener('pointercancel', end);
    k.addEventListener('dblclick', () => set(def));
    k.addEventListener('keydown', (e) => {
      const big = (max - min) / 10;
      const map = { ArrowUp: step, ArrowRight: step, ArrowDown: -step, ArrowLeft: -step, PageUp: big, PageDown: -big };
      if (e.key in map) { set(v + map[e.key]); e.preventDefault(); }
      if (e.key === 'Home') { set(min); e.preventDefault(); }
      if (e.key === 'End') { set(max); e.preventDefault(); }
    });
    k.addEventListener('wheel', (e) => { e.preventDefault(); set(v - Math.sign(e.deltaY) * step); }, { passive: false });
  });

  /* dust motes drifting through the spotlight */
  const dust = document.querySelector('canvas.dust');
  if (dust && !reduce) {
    const g = dust.getContext('2d');
    let w, h;
    const P = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3, s: Math.random() * 0.02 + 0.006, o: Math.random() * Math.PI * 2 }));
    const size = () => { const dpr = Math.min(devicePixelRatio || 1, 2); w = dust.clientWidth; h = dust.clientHeight; dust.width = w * dpr; dust.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    run(dust, (t) => {
      g.clearRect(0, 0, w, h);
      P.forEach((p) => {
        const y = ((p.y - t * p.s) % 1 + 1) % 1;
        const x = p.x + Math.sin(t * 0.3 + p.o) * 0.01;
        const cone = 1 - Math.min(1, Math.abs(x - 0.5) / (0.06 + y * 0.32));
        if (cone <= 0) return;
        g.globalAlpha = cone * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.3 + p.o))) * (1 - y * 0.6);
        g.fillStyle = '#eaf6ff';
        g.beginPath(); g.arc(x * w, y * h, p.r, 0, 6.283); g.fill();
      });
      g.globalAlpha = 1;
    });
  }
})();
