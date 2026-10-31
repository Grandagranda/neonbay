// Общее для всех страниц: шапка, мобильное меню, появление блоков, отсчёт до релиза, параллакс героя, ролик первого экрана.
(() => {
  // макет телефона: тот же запрос, что в media у css/mobile.css
  const MOB = window.NB_MOB = matchMedia('(max-width: 900px), (max-width: 1100px) and (max-height: 520px)');

  // карта и заставка на главной работают по-разному на телефоне и ПК: поворот планшета через границу макета перезагружает страницу
  if (document.querySelector('[data-mm], .atlas')) MOB.addEventListener('change', () => location.reload());

  // плавная инерционная прокрутка (Lenis) — везде, кроме полноэкранной карты; телефону библиотека не нужна: прокруткой управляет сама система
  if (!MOB.matches && !document.body.classList.contains('is-app') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const lib = document.createElement('script');
    lib.src = 'js/vendor/lenis.min.js';
    lib.onload = () => {
      const lenis = window.NB_LENIS = new Lenis({ lerp: .12, wheelMultiplier: .9, smoothWheel: true });
      const loop = t => { lenis.raf(t); if (window.NB_FRAME) NB_FRAME(); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      document.addEventListener('click', e => {
        const a = e.target.closest('a[href^="#"]'), t = a && a.getAttribute('href').length > 1 && document.querySelector(a.getAttribute('href'));
        if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -24, duration: 1.4 }); }
      });
    };
    document.head.appendChild(lib);
  }

  // ссылки-заглушки не прыгают наверх страницы
  document.addEventListener('click', e => { if (e.target.closest('a[href="#"]')) e.preventDefault(); });

  // iOS применяет :active только при наличии обработчика касаний
  document.addEventListener('touchstart', () => {}, { passive: true });

  const hdr = document.getElementById('hdr');
  const onScroll = () => hdr && hdr.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // полноэкранное меню телефона: закрывается по пункту, по Esc и при уходе на широкий экран; страница под ним не листается
  const burger = document.getElementById('burger'), mnav = document.getElementById('mnav'), html = document.documentElement;
  const setMenu = open => {
    html.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    mnav.inert = !open;
  };
  if (burger && mnav) {
    burger.addEventListener('click', () => setMenu(!html.classList.contains('menu-open')));
    mnav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && html.classList.contains('menu-open')) { setMenu(false); burger.focus(); } });
    MOB.addEventListener('change', e => { if (!e.matches) setMenu(false); });
  }

  // форма входа: вкладки с бегунком, показать пароль, сила пароля. Одна на странице login.html и в окне на ПК
  const initAuth = box => {
    const seg = box.querySelector('[data-seg]'), ind = seg.querySelector('.seg-ind');
    const move = b => { ind.style.width = b.offsetWidth + 'px'; ind.style.transform = `translateX(${b.offsetLeft - 4}px)`; };
    const tab = name => {
      const b = seg.querySelector(`[data-tab="${name}"]`);
      seg.querySelectorAll('button').forEach(x => x.classList.toggle('is-on', x === b));
      box.querySelectorAll('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== name);
      move(b);
    };
    seg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) tab(b.dataset.tab); });
    box.querySelectorAll('.pass-eye').forEach(b => b.addEventListener('click', () => {
      const i = b.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password';
      b.classList.toggle('is-on', i.type === 'text');
    }));
    const up = box.querySelector('#up-pass'), bars = box.querySelectorAll('.meter i');
    up.addEventListener('input', () => {
      const v = up.value; let n = 0;
      if (v.length >= 8) n++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) n++; if (/\d/.test(v)) n++; if (/[^\w]/.test(v) || v.length >= 14) n++;
      bars.forEach((b, i) => b.classList.toggle('is-on', i < n));
      up.closest('.field').dataset.s = n;
    });
    return tab;
  };
  const pageBox = document.querySelector('.auth .auth-box');
  if (pageBox) {
    const tab = initAuth(pageBox), first = () => tab(location.hash === '#signup' ? 'up' : 'in');
    first(); addEventListener('load', first);
  }

  // окно входа на ПК (Figma 4065:1853): ссылки на login.html открывают форму поверх страницы; на телефоне вход — отдельная страница
  const authTpl = document.getElementById('auth-tpl');
  if (authTpl) {
    let am = null, back = null;
    const closeAm = () => {
      if (!am) return;
      const el = am; am = null;
      html.classList.remove('am-open'); el.classList.remove('is-on');
      if (window.NB_LENIS) NB_LENIS.start();
      setTimeout(() => el.remove(), 300);
      if (back) back.focus();
    };
    const openAm = (link, name) => {
      am = document.createElement('div');
      am.className = 'am'; am.setAttribute('role', 'dialog'); am.setAttribute('aria-modal', 'true'); am.setAttribute('aria-label', 'Sign in');
      am.innerHTML = '<div class="am-in"></div>';
      am.firstChild.append(authTpl.content.cloneNode(true));
      am.querySelectorAll('.rv').forEach(x => x.classList.replace('rv', 'is-in'));
      document.body.append(am);
      initAuth(am)(name);
      back = link;
      html.classList.add('am-open');
      if (window.NB_LENIS) NB_LENIS.stop();
      am.addEventListener('mousedown', e => { if (!e.target.closest('.auth-box')) closeAm(); });
      am.getBoundingClientRect();
      am.classList.add('is-on');
      const f = am.querySelector('form:not([hidden]) input'); if (f) f.focus({ preventScroll: true });
    };
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href^="login.html"]');
      if (!a || MOB.matches || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
      e.preventDefault(); e.stopPropagation();
      openAm(a, /#signup$/.test(a.getAttribute('href')) ? 'up' : 'in');
    }, true);
    addEventListener('keydown', e => {
      if (!am) return;
      if (e.key === 'Escape') return closeAm();
      if (e.key !== 'Tab') return;
      const all = [...am.querySelectorAll('button, input, a')].filter(x => x.offsetParent), i = all.indexOf(document.activeElement);
      if (e.shiftKey ? i <= 0 : i === all.length - 1) { e.preventDefault(); all[e.shiftKey ? all.length - 1 : 0].focus(); }
    });
    MOB.addEventListener('change', e => { if (e.matches) closeAm(); });
  }

  // появление при прокрутке
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: MOB.matches ? '0px' : '0px 0px -8% 0px' });
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
  let vw = 0;
  const setVw = () => { if (root.clientWidth !== vw) { vw = root.clientWidth; root.style.setProperty('--vw', vw + 'px'); } };
  setVw();
  new ResizeObserver(setVw).observe(root);

  // ролик первого экрана. Постер уже на экране, поэтому на телефоне файл подключается после загрузки страницы и не спорит с ней за сеть.
  // Экономия трафика, 2G и «меньше движения» — без ролика, только постер. Поворот телефона меняет кадр: вертикальный ↔ горизонтальный
  const hv = document.querySelector('.hero-video');
  if (hv) {
    const portrait = matchMedia('(orientation: portrait)'), conn = navigator.connection;
    const lite = MOB.matches && (matchMedia('(prefers-reduced-motion: reduce)').matches || (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))));
    const file = () => !MOB.matches ? 'video/hero.mp4' : portrait.matches ? 'video/hero-m.mp4' : 'video/hero-l.mp4';
    const start = () => {
      if (!hv.getAttribute('src') || !hv.src.endsWith(file())) { hv.classList.remove('is-on'); hv.src = file(); }
      hv.play().catch(() => {});
    };
    hv.addEventListener('playing', () => hv.classList.add('is-on'));
    if (!lite) {
      if (!MOB.matches || document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
      portrait.addEventListener('change', () => { if (hv.getAttribute('src')) start(); });
      MOB.addEventListener('change', () => { if (hv.getAttribute('src')) start(); });
    }
  }

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
