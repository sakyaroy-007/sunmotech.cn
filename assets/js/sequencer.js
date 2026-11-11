/* BeatKitchen · playable 16-step demo (the L2 exercise). Web Audio, synthesized voices, no samples. */
(() => {
  const root = document.querySelector('[data-seq]');
  if (!root) return;

  const BPM = 140;
  const STEP = 60 / BPM / 4;
  const ROWS = [
    { id: 'kick', name: 'kick', c: '#ff9a4a' },
    { id: 'clap', name: 'clap', c: '#ff6f9c' },
    { id: 'hat', name: 'hat', c: '#ffd84a' },
  ];
  const DEFAULT = { kick: [0, 11], clap: [8], hat: [0, 2, 4, 6, 8, 10, 12, 14] };
  const pat = {};
  const resetPattern = () => ROWS.forEach((r) => { pat[r.id] = Array.from({ length: 16 }, (_, i) => DEFAULT[r.id].includes(i)); });
  resetPattern();

  const grid = root.querySelector('.seq-grid');
  let html = '<span></span>';
  for (let i = 0; i < 16; i++) html += `<span class="num${i % 4 === 0 ? ' beat' : ''}">${i % 4 === 0 ? i / 4 + 1 : '·'}</span>`;
  ROWS.forEach((r) => {
    html += `<span class="rl" style="--c:${r.c}"><i></i>${r.name}</span>`;
    for (let i = 0; i < 16; i++) {
      html += `<button type="button" class="cell" style="--c:${r.c}" data-r="${r.id}" data-i="${i}" aria-pressed="${pat[r.id][i]}" aria-label="${r.name}，第 ${i + 1} 格"></button>`;
    }
  });
  grid.innerHTML = html;
  const cells = Array.from(grid.querySelectorAll('.cell'));
  const cols = Array.from({ length: 16 }, (_, i) => cells.filter((c) => +c.dataset.i === i));
  cells.forEach((c) => { if (+c.dataset.i % 4 === 0) c.style.background = c.getAttribute('aria-pressed') === 'true' ? '' : 'rgba(255,255,255,.085)'; });

  const paint = () => {
    cells.forEach((c) => {
      const on = pat[c.dataset.r][+c.dataset.i];
      c.setAttribute('aria-pressed', String(on));
      c.style.background = !on && +c.dataset.i % 4 === 0 ? 'rgba(255,255,255,.085)' : '';
    });
    check();
  };

  /* live feedback, same two rules the app checks in this exercise */
  const ckClap = root.querySelector('[data-check="clap"]');
  const ckKick = root.querySelector('[data-check="kick"]');
  const check = () => {
    const clapOk = pat.clap.every((on, i) => on === (i === 8));
    const kickOk = pat.kick.some(Boolean);
    if (ckClap) ckClap.classList.toggle('bad', !clapOk);
    if (ckKick) ckKick.classList.toggle('bad', !kickOk);
  };
  check();

  /* ---------- audio ---------- */
  let ctx, out, noise;
  const ensure = () => {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.12;
    out = ctx.createGain();
    out.gain.value = 0.5;
    out.connect(comp).connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  };
  const env = (g, t, peak, decay) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  };
  const voices = {
    kick(t) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(46, t + 0.13);
      env(g, t, 1, 0.48);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.52);
      const s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), cg = ctx.createGain();
      s.buffer = noise; hp.type = 'highpass'; hp.frequency.value = 1800;
      env(cg, t, 0.22, 0.014);
      s.connect(hp).connect(cg).connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.03);
    },
    clap(t) {
      const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.9;
      g.gain.setValueAtTime(0.0001, t);
      [0, 0.011, 0.022].forEach((o) => {
        g.gain.setValueAtTime(0.0001, t + o);
        g.gain.exponentialRampToValueAtTime(0.8, t + o + 0.002);
        g.gain.exponentialRampToValueAtTime(0.09, t + o + 0.01);
      });
      g.gain.setValueAtTime(0.62, t + 0.033);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
      s.connect(bp).connect(g).connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.3);
    },
    hat(t) {
      const s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; hp.type = 'highpass'; hp.frequency.value = 7600;
      env(g, t, 0.28, 0.05);
      s.connect(hp).connect(g).connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.07);
    },
  };

  /* ---------- transport ---------- */
  let playing = false, cur = 0, nextT = 0, timer = 0, lastCol = -1;
  const queue = [];
  const stepEl = root.querySelector('[data-step]');
  const schedule = () => {
    while (nextT < ctx.currentTime + 0.12) {
      ROWS.forEach((r) => { if (pat[r.id][cur]) voices[r.id](nextT); });
      queue.push({ s: cur, t: nextT });
      cur = (cur + 1) % 16;
      nextT += STEP;
    }
  };
  const setCol = (s) => {
    if (lastCol >= 0) cols[lastCol].forEach((c) => c.classList.remove('cur'));
    if (s >= 0) cols[s].forEach((c) => c.classList.add('cur'));
    lastCol = s;
    if (stepEl) stepEl.textContent = s >= 0 ? `第 ${Math.floor(s / 4) + 1} 拍 · 第 ${s + 1} 格` : '140 BPM · 4/4';
  };
  const draw = () => {
    if (!playing) return;
    const now = ctx.currentTime;
    while (queue.length && queue[0].t <= now) setCol(queue.shift().s);
    requestAnimationFrame(draw);
  };
  const start = async () => {
    ensure();
    if (ctx.state !== 'running') await ctx.resume();
    playing = true; cur = 0; queue.length = 0;
    nextT = ctx.currentTime + 0.06;
    schedule();
    timer = setInterval(schedule, 25);
    root.classList.add('is-playing');
    playBtn.setAttribute('aria-label', '停止');
    requestAnimationFrame(draw);
  };
  const stop = () => {
    playing = false;
    clearInterval(timer);
    queue.length = 0;
    setCol(-1);
    root.classList.remove('is-playing');
    playBtn.setAttribute('aria-label', '播放');
  };
  const playBtn = root.querySelector('.seq-play');
  playBtn.addEventListener('click', () => (playing ? stop() : start()));

  grid.addEventListener('click', (e) => {
    const c = e.target.closest('.cell');
    if (!c) return;
    const r = c.dataset.r, i = +c.dataset.i;
    pat[r][i] = !pat[r][i];
    paint();
    if (pat[r][i] && !playing) {
      ensure();
      ctx.resume().then(() => voices[r](ctx.currentTime + 0.01));
    }
  });
  root.querySelector('[data-act="clear"]').addEventListener('click', () => { pat.kick = pat.kick.map(() => false); paint(); });
  root.querySelector('[data-act="reset"]').addEventListener('click', () => { resetPattern(); paint(); });

  new IntersectionObserver((es) => { if (!es[0].isIntersecting && playing) stop(); }, { threshold: 0 }).observe(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) stop(); });
})();
