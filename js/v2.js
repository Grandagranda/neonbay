// NeonBay v2 — общее для страниц по первым двум блокам главной:
// наезд листа на липкую шапку (шапка уходит в размытие), параллакс слоёв по скроллу, полоса чтения, оглавление, «скопировать ссылку».
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, MOB = !!(window.NB_MOB && NB_MOB.matches);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const jobs = [];

  // ---- наезд: p (0…1) — насколько лист [data-sheet] закрыл шапку [data-hero]; ролик закрытой шапки стоит ----
  // Каждая работа сначала читает, а записи возвращает функцией: чтение после записи заставляло браузер пересчитывать стили внутри кадра.
  // Значения пишутся прямо в слои шапки, а не в --p на стопке: иначе стили всего блока пересчитывались бы на каждый кадр. Слои подняты will-change — блюр считает видеокарта
  document.querySelectorAll('[data-stack]').forEach(stack => {
    const sheet = stack.querySelector('[data-sheet]'), hero = stack.querySelector('[data-hero]');
    if (!sheet || !hero) return;
    const video = hero.querySelector('video'), dim = hero.querySelector('.hero-dim');
    const layers = [...hero.children].filter(el => el !== dim), zoom = hero.querySelector('.hero-video, .nh-bg img');
    let covered = false, last = -1;
    // отсчёт от того места, где лист стоит при открытии страницы (шапка бывает ниже окна — тогда лист уже виден)
    jobs.push(vh => {
      const start = Math.min(vh, hero.offsetHeight);
      const p = +clamp((start - sheet.getBoundingClientRect().top) / start, 0, 1).toFixed(3);
      if (p === last) return;
      const u = document.documentElement.clientWidth / 1920, on = p > 0;
      last = p;
      return () => {
        if (MOB) { if (dim) dim.style.opacity = (p * .5).toFixed(3); }
        else {
          hero.classList.toggle('is-soft', on);
          hero.style.transform = on ? `translate3d(0, ${(-40 * u * p).toFixed(1)}px, 0)` : '';
          if (dim) dim.style.opacity = (p * .22).toFixed(3);
          const blur = on ? `blur(${(18 * u * p).toFixed(1)}px)` : '';
          layers.forEach(el => { el.style.filter = blur; });
          if (zoom) zoom.style.scale = on ? (1 + p * .04).toFixed(4) : '';
        }
        if (video && (p >= 1) !== covered) { covered = p >= 1; covered ? video.pause() : video.play().catch(() => {}); }
      };
    });
  });

  // ---- параллакс: слой отстаёт от прокрутки на долю k; опора — [data-par-root] или ближайшая секция ----
  // at — доля высоты окна, где слой стоит на своём месте; lo/hi — пределы сдвига в px макета;
  // ps — уменьшение на px ухода вниз (лого блока 2 «уходит» за персонажа). На телефоне параллакса нет: прокрутку ведёт система, сдвиг на JS отставал бы от пальца
  if (!reduce && !MOB) {
    const par = [...document.querySelectorAll('[data-par]')].map(el => ({
      el, root: el.closest('[data-par-root]') || el.closest('section, footer') || el.parentElement,
      k: +el.dataset.par, lo: +(el.dataset.lo ?? -1e4), hi: +(el.dataset.hi ?? 1e4), ps: +(el.dataset.ps || 0), at: +(el.dataset.at || 0),
    }));
    if (par.length) jobs.push(vh => {
      const u = document.documentElement.clientWidth / 1920, rects = new Map(), out = [];
      par.forEach(item => {
        const { root, k, lo, hi, ps, at } = item;
        if (!rects.has(root)) rects.set(root, root.getBoundingClientRect());
        const r = rects.get(root);
        if (r.bottom < -vh * .5 || r.top > vh * 1.5) return;
        const y = clamp((at * vh - clamp(r.top, -r.height, vh)) * k, lo * u, hi * u);
        const tr = `translate3d(0, ${y.toFixed(1)}px, 0)` + (ps ? ` scale(${(1 - Math.max(0, y / u) * ps).toFixed(4)})` : '');
        if (tr !== item.tr) { item.tr = tr; out.push(item); }
      });
      return () => out.forEach(i => { i.el.style.transform = i.tr; });
    });
  }

  // ---- полоса чтения статьи ----
  const bar = document.querySelector('[data-progress]'), prose = document.querySelector('[data-prose]');
  if (bar && prose) jobs.push(vh => {
    const r = prose.getBoundingClientRect();
    const x = clamp((vh * .6 - r.top) / r.height, 0, 1).toFixed(4);
    return () => { bar.style.transform = `scaleX(${x})`; };
  });

  let raf = 0, seen = -1;
  const run = () => { raf = 0; seen = scrollY; const vh = innerHeight; jobs.map(j => j(vh)).forEach(w => w && w()); };
  addEventListener('scroll', () => { if (!raf && !window.NB_LENIS) raf = requestAnimationFrame(run); }, { passive: true });
  // с Lenis слои двигаются в том же кадре, что и прокрутка: через событие scroll они отставали бы на кадр и дрожали относительно страницы
  window.NB_FRAME = () => { if (scrollY !== seen) run(); };
  addEventListener('resize', run);
  run();

  // ---- оглавление: подсветка раздела, который сейчас читают ----
  const toc = document.querySelector('[data-toc]');
  if (toc && prose) {
    const links = [...toc.querySelectorAll('a')], heads = links.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
    const mark = () => {
      let cur = heads[0];
      heads.forEach(h => { if (h.getBoundingClientRect().top < innerHeight * .35) cur = h; });
      links.forEach(a => a.classList.toggle('is-on', cur && a.hash === '#' + cur.id));
    };
    addEventListener('scroll', mark, { passive: true }); mark();
    // телефон: оглавление свёрнуто над текстом, раскрывается касанием; после выбора раздела снова сворачивается
    if (MOB) {
      const head = toc.querySelector('.kk'), set = on => { toc.classList.toggle('is-open', on); head.setAttribute('aria-expanded', on); };
      head.setAttribute('role', 'button'); head.tabIndex = 0; set(false);
      head.addEventListener('click', () => set(!toc.classList.contains('is-open')));
      head.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(!toc.classList.contains('is-open')); } });
      links.forEach(a => a.addEventListener('click', () => set(false)));
    }
  }

  // ---- скопировать ссылку ----
  document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
    const done = () => { b.classList.add('is-done'); setTimeout(() => b.classList.remove('is-done'), 1600); };
    navigator.clipboard ? navigator.clipboard.writeText(location.href).then(done, done) : done();
  }));
  // ссылки «поделиться» — с адресом страницы
  document.querySelectorAll('[data-share]').forEach(a => {
    const u = encodeURIComponent(location.href), t = encodeURIComponent(document.title);
    a.href = a.dataset.share === 'tg' ? `https://t.me/share/url?url=${u}&text=${t}` : `https://x.com/intent/post?url=${u}&text=${t}`;
  });
})();
