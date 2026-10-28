// Общее для всех страниц: шапка, мобильное меню, появление блоков, отсчёт до релиза, параллакс героя.
(() => {
  // плавная инерционная прокрутка (Lenis) — везде, кроме полноэкранной карты
  if (window.Lenis && !document.body.classList.contains('is-app') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const lenis = window.NB_LENIS = new Lenis({ lerp: .09, wheelMultiplier: .9, smoothWheel: true });
    const loop = t => { lenis.raf(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]'), t = a && a.getAttribute('href').length > 1 && document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -24, duration: 1.4 }); }
    });
  }

  const hdr = document.getElementById('hdr');
  const onScroll = () => hdr && hdr.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = document.getElementById('burger');
  burger && burger.addEventListener('click', () => {
    const open = document.documentElement.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open);
  });

  // появление при прокрутке
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));

  // отсчёт до релиза: 19 ноября 2026, полночь по Майами (EST)
  const LAUNCH = Date.parse('2026-11-19T00:00:00-05:00');
  const cds = document.querySelectorAll('[data-countdown]');
  if (cds.length) {
    const pad = n => String(n).padStart(2, '0');
    const tick = () => {
      let s = Math.max(0, Math.floor((LAUNCH - Date.now()) / 1000));
      const d = Math.floor(s / 86400); s -= d * 86400;
      const h = Math.floor(s / 3600); s -= h * 3600;
      const m = Math.floor(s / 60); s -= m * 60;
      cds.forEach(el => {
        const set = (k, v) => { const n = el.querySelector(`[data-u="${k}"]`); if (n && n.textContent !== v) n.textContent = v; };
        set('d', String(d)); set('h', pad(h)); set('m', pad(m)); set('s', pad(s));
        const short = el.querySelector('[data-u="short"]');
        if (short) short.textContent = `${d}d ${h}h`;
      });
    };
    tick(); setInterval(tick, 1000);
  }

  // ширина окна без полосы прокрутки — для единицы макета --u (100vw её включает, и правый край уезжал бы)
  const root = document.documentElement;
  const setVw = () => root.style.setProperty('--vw', root.clientWidth + 'px');
  setVw();
  new ResizeObserver(setVw).observe(root);

  // видео-петли играют, только пока видны
  const vio = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) e.target.play().catch(() => {}); else e.target.pause();
  }));
  document.querySelectorAll('video[data-autopause]').forEach(v => vio.observe(v));

  // параллакс героя по прокрутке: фон медленнее, люди чуть быстрее, купюры — быстрее всех
  const hero = document.querySelector('[data-parallax]');
  if (hero && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const layers = [...hero.querySelectorAll('[data-depth]')];
    let raf = 0;
    const apply = () => {
      raf = 0;
      const y = Math.min(scrollY, innerHeight * 1.2);
      layers.forEach(l => { l.style.transform = `translate3d(0, ${(y * +l.dataset.depth).toFixed(1)}px, 0)`; });
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
    apply();
  }

  // фишки-фильтры: визуальное переключение внутри группы
  document.querySelectorAll('[data-chips]').forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    g.querySelectorAll('.chip').forEach(c => c.classList.toggle('is-on', c === b));
    g.dispatchEvent(new CustomEvent('chip', { detail: b.dataset.v }));
  }));
})();
