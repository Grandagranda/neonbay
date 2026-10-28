// NeonBay v2 — общее для страниц по первым двум блокам главной:
// наезд листа на липкую шапку (--p, шапка размывается), параллакс слоёв по скроллу, полоса чтения, оглавление, «скопировать ссылку».
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const jobs = [];

  // ---- наезд: --p (0…1) у стопки — насколько лист [data-sheet] закрыл шапку [data-hero]; ролик закрытой шапки стоит ----
  document.querySelectorAll('[data-stack]').forEach(stack => {
    const sheet = stack.querySelector('[data-sheet]'), hero = stack.querySelector('[data-hero]');
    if (!sheet || !hero) return;
    const video = hero.querySelector('video');
    let covered = false;
    // отсчёт от того места, где лист стоит при открытии страницы (шапка бывает ниже окна — тогда лист уже виден)
    jobs.push(vh => {
      const start = Math.min(vh, hero.offsetHeight);
      const p = clamp((start - sheet.getBoundingClientRect().top) / start, 0, 1);
      stack.style.setProperty('--p', p.toFixed(3));
      if (video && (p >= 1) !== covered) { covered = p >= 1; covered ? video.pause() : video.play().catch(() => {}); }
    });
  });

  // ---- параллакс: слой отстаёт от прокрутки на долю k; опора — [data-par-root] или ближайшая секция ----
  // at — доля высоты окна, где слой стоит на своём месте; lo/hi — пределы сдвига в px макета;
  // ps — уменьшение на px ухода вниз (лого блока 2 «уходит» за девушку)
  if (!reduce) {
    const par = [...document.querySelectorAll('[data-par]')].map(el => ({
      el, root: el.closest('[data-par-root]') || el.closest('section, footer') || el.parentElement,
      k: +el.dataset.par, lo: +(el.dataset.lo ?? -1e4), hi: +(el.dataset.hi ?? 1e4), ps: +(el.dataset.ps || 0), at: +(el.dataset.at || 0),
    }));
    if (par.length) jobs.push(vh => {
      const u = document.documentElement.clientWidth / 1920;
      par.forEach(({ el, root, k, lo, hi, ps, at }) => {
        const r = root.getBoundingClientRect();
        if (r.bottom < -vh * .5 || r.top > vh * 1.5) return;
        const t = clamp(r.top, -root.offsetHeight, vh);
        const y = clamp((at * vh - t) * k, lo * u, hi * u);
        el.style.setProperty('--py', y.toFixed(1) + 'px');
        if (ps) el.style.setProperty('--ps', (1 - Math.max(0, y / u) * ps).toFixed(4));
      });
    });
  }

  // ---- полоса чтения статьи ----
  const bar = document.querySelector('[data-progress]'), prose = document.querySelector('[data-prose]');
  if (bar && prose) jobs.push(vh => {
    const r = prose.getBoundingClientRect();
    bar.style.transform = `scaleX(${clamp((vh * .6 - r.top) / r.height, 0, 1).toFixed(4)})`;
  });

  let raf = 0;
  const run = () => { raf = 0; const vh = innerHeight; jobs.forEach(j => j(vh)); };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(run); }, { passive: true });
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
