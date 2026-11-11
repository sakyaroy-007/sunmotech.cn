/* Sunmo · core interactions (no dependencies) */
(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const raf = (fn) => { let q = false; return (...a) => { if (q) return; q = true; requestAnimationFrame(() => { q = false; fn(...a); }); }; };

  /* ---------- navigation ---------- */
  const nav = $('.nav');
  const here = location.pathname.replace(/index\.html$/, '');
  $$('[data-nav]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href !== '/' && here.startsWith(href)) a.setAttribute('aria-current', 'page');
  });
  const links = $('.nav-links');
  const hl = $('.nav-hl');
  if (links && hl) {
    const move = (a) => {
      const r = a.getBoundingClientRect();
      const p = links.getBoundingClientRect();
      hl.style.width = r.width + 'px';
      hl.style.transform = `translateX(${r.left - p.left}px)`;
      hl.style.opacity = '1';
    };
    $$('a', links).forEach((a) => a.addEventListener('pointerenter', () => move(a)));
    links.addEventListener('pointerleave', () => { hl.style.opacity = '0'; });
  }
  const onScrollNav = () => nav && nav.classList.toggle('is-scrolled', scrollY > 12);
  addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  const menuBtn = $('.nav-menu');
  const menu = $('.menu');
  if (menuBtn && menu) {
    const set = (open) => {
      menuBtn.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    };
    menuBtn.addEventListener('click', () => set(menuBtn.getAttribute('aria-expanded') !== 'true'));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) set(false); });
    $$('a', menu).forEach((a) => a.addEventListener('click', () => set(false)));
  }

  /* ---------- reveals ---------- */
  $$('[data-lines]').forEach((el) => {
    const base = parseInt(el.dataset.lines || '0', 10);
    $$('.ln > span', el).forEach((s, i) => s.style.setProperty('--d', base + i * 95 + 'ms'));
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  $$('[data-reveal], [data-lines], .tl, .report, .ratio, [data-observe]').forEach((el) => {
    if (reduce) el.classList.add('is-in'); else io.observe(el);
  });

  /* ---------- pointer effects ---------- */
  $$('[data-spot]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', e.clientX - r.left + 'px');
      el.style.setProperty('--my', e.clientY - r.top + 'px');
    });
  });

  if (fine && !reduce) {
    $$('[data-tilt]').forEach((el) => {
      const max = parseFloat(el.dataset.tilt) || 6;
      const glare = document.createElement('i');
      glare.className = 'glare';
      el.appendChild(glare);
      const update = raf((x, y) => {
        el.style.setProperty('--ty', ((x - 0.5) * max * 2).toFixed(2) + 'deg');
        el.style.setProperty('--tx', ((0.5 - y) * max * 2).toFixed(2) + 'deg');
        el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        update((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--tx', '0deg');
        el.style.setProperty('--ty', '0deg');
      });
    });

    $$('[data-magnet]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.translate = `${(x * 0.16).toFixed(1)}px ${(y * 0.26).toFixed(1)}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = ''; });
    });

    const stage = $('.wall-stage');
    const hero = $('.hero');
    if (stage && hero) {
      hero.addEventListener('pointermove', raf((e) => {
        const x = e.clientX / innerWidth - 0.5;
        const y = e.clientY / innerHeight - 0.5;
        stage.style.setProperty('--rx', (x * 6).toFixed(2) + 'deg');
        stage.style.setProperty('--ry', (-y * 5).toFixed(2) + 'deg');
      }));
    }
  }

  /* ---------- scroll-linked ---------- */
  const scrollers = [];
  const onScroll = raf(() => scrollers.forEach((f) => f()));
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);

  if (!reduce) {
    const px = $$('[data-parallax]');
    if (px.length) {
      scrollers.push(() => {
        const vh = innerHeight;
        px.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          const c = r.top + r.height / 2 - vh / 2;
          el.style.translate = `0 ${(-c * parseFloat(el.dataset.parallax)).toFixed(1)}px`;
        });
      });
    }

    const cards = $$('.pcard');
    if (cards.length > 1) {
      scrollers.push(() => {
        if (innerWidth <= 920) { cards.forEach((c) => { c.style.transform = ''; c.style.filter = ''; }); return; }
        cards.forEach((c, i) => {
          const next = cards[i + 1];
          if (!next) return;
          const top = parseFloat(getComputedStyle(c).top) || 0;
          const p = clamp(1 - (next.getBoundingClientRect().top - top) / c.offsetHeight, 0, 1);
          c.style.transform = p > 0 ? `scale(${(1 - p * 0.06).toFixed(4)})` : '';
          c.style.filter = p > 0 ? `brightness(${(1 - p * 0.5).toFixed(3)})` : '';
        });
      });
    }

    const scaleIn = $$('[data-scale-in]');
    if (scaleIn.length) {
      scrollers.push(() => {
        const vh = innerHeight;
        scaleIn.forEach((el) => {
          const r = el.getBoundingClientRect();
          const p = clamp((vh - r.top) / (vh * 0.9), 0, 1);
          const e = 1 - Math.pow(1 - p, 3);
          el.style.transform = `perspective(1600px) rotateX(${((1 - e) * 16).toFixed(2)}deg) scale(${(0.9 + e * 0.1).toFixed(4)})`;
        });
      });
    }
  }

  const tl = $('.timeline');
  if (tl) {
    const prog = $('.prog', tl);
    scrollers.push(() => {
      const r = tl.getBoundingClientRect();
      prog.style.setProperty('--p', clamp((innerHeight * 0.72 - r.top) / r.height, 0, 1).toFixed(3));
    });
  }
  onScroll();

  /* ---------- marquee reacts to scroll speed ---------- */
  const tracks = $$('.marquee-track');
  if (tracks.length && !reduce && 'getAnimations' in Element.prototype) {
    let last = scrollY, v = 0, visible = false, running = false;
    const anims = () => tracks.map((t) => t.getAnimations()[0]).filter(Boolean);
    const loop = () => {
      const d = Math.abs(scrollY - last);
      last = scrollY;
      v += (Math.min(d, 90) / 7 - v) * 0.08;
      anims().forEach((a) => { a.playbackRate = 1 + v; });
      if (visible || v > 0.02) requestAnimationFrame(loop); else running = false;
    };
    const mio = new IntersectionObserver((es) => {
      visible = es.some((e) => e.isIntersecting);
      if (visible && !running) { running = true; last = scrollY; requestAnimationFrame(loop); }
    });
    tracks.forEach((t) => mio.observe(t));
  }

  /* ---------- counters ---------- */
  const cio = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      const el = e.target;
      const raw = el.dataset.count;
      const to = parseFloat(raw);
      const dec = (raw.split('.')[1] || '').length;
      if (reduce) { el.textContent = to.toFixed(dec); return; }
      const t0 = performance.now();
      const dur = 1500;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = (to * (1 - Math.pow(1 - p, 4))).toFixed(dec);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => cio.observe(el));

  /* ---------- copy to clipboard ---------- */
  $$('[data-copy]').forEach((b) => {
    b.addEventListener('click', async () => {
      const label = $('span', b);
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        const old = label.textContent;
        label.textContent = '已复制';
        setTimeout(() => { label.textContent = old; }, 1600);
      } catch (_) {
        location.href = 'mailto:' + b.dataset.copy;
      }
    });
  });

  /* ---------- auto-advancing tabs ---------- */
  $$('[data-tabs]').forEach((root) => {
    const tabs = $$('.ptab', root);
    const panes = $$('.phase-vis .frame', root);
    const dur = parseInt(root.dataset.tabs, 10) || 6500;
    root.style.setProperty('--t', dur + 'ms');
    let i = 0;
    const show = (n) => {
      i = n;
      tabs.forEach((t, k) => { t.classList.toggle('is-on', k === n); t.setAttribute('aria-selected', String(k === n)); });
      panes.forEach((p, k) => p.classList.toggle('is-on', k === n));
    };
    tabs.forEach((t, k) => t.addEventListener('click', () => show(k)));
    if (!reduce) {
      tabs.forEach((t) => {
        const bar = $('.bar i', t);
        if (bar) bar.addEventListener('animationend', () => show((i + 1) % tabs.length));
      });
      root.classList.add('paused');
      new IntersectionObserver((es) => root.classList.toggle('paused', !es[0].isIntersecting), { threshold: 0.35 }).observe(root);
      root.addEventListener('pointerenter', () => root.classList.add('paused'));
      root.addEventListener('pointerleave', () => root.classList.remove('paused'));
    }
    show(0);
  });

  /* ---------- typing ---------- */
  $$('[data-type]').forEach((el) => {
    const host = el.closest('[data-type-host]') || el.parentElement;
    if (reduce) { host.classList.add('typed'); return; }
    const full = el.textContent;
    el.textContent = '';
    const caret = document.createElement('span');
    caret.className = 'caret';
    el.after(caret);
    const tio = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      tio.disconnect();
      let k = 0;
      const step = () => {
        el.textContent = full.slice(0, ++k);
        if (k < full.length) setTimeout(step, 34 + Math.random() * 46);
        else setTimeout(() => { caret.remove(); host.classList.add('typed'); }, 380);
      };
      setTimeout(step, 700);
    }, { threshold: 0.6 });
    tio.observe(el);
  });
})();
