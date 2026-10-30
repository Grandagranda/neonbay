// Карта Леониды: панорама/зум, блипы (коллекционные и обычные места), легенда-фильтр, поиск мест с подсказками, карточка места со скрином,
// обзорная мини-карта, подпись района как в GTA, открытки регионов с фокусом на регион.
// Телефон: щипок, инерция, выбор ближайшей точки касанием, нижние листы вместо панелей, плитки полного разрешения при приближении.
(() => {
  const D = window.MAP, $ = s => document.querySelector(s);
  const palms = [...document.querySelectorAll('.palm')];
  const stage = $('#stage'), world = $('#world'), blipsEl = $('#blips'), info = $('#info'), atlas = $('.atlas'), legend = $('#legend');
  const WW = 1000, WH = WW * D.aspect, KM_X = D.kmPerMap, KM_Y = D.kmPerMap * D.aspect;
  const MOB = !!(window.NB_MOB && NB_MOB.matches), PORTRAIT = matchMedia('(orientation: portrait) and (max-width: 640px)');
  const sheets = () => MOB && PORTRAIT.matches;

  // ---- справочники ----
  const SUB = {}, GROUP = {};
  D.groups.forEach(g => { GROUP[g.id] = g; g.subs.forEach(([k, name, total, desc]) => { SUB[k] = { k, name, total, desc, g: g.id }; }); });
  const REG = Object.fromEntries(D.regions.map(r => [r.id, r]));
  const off = new Set(); // выключенные типы
  const KEYS = { col: D.groups.filter(g => g.track), place: D.groups.filter(g => !g.track) };
  Object.keys(KEYS).forEach(t => { KEYS[t] = KEYS[t].flatMap(g => g.subs.map(s => s[0])); });
  const icon = (k, cls = '') => `<svg class="${cls}"><use href="#b-${k}"/></svg>`;
  const km = (a, b) => Math.hypot((a[0] - b[0]) / 100 * KM_X, (a[1] - b[1]) / 100 * KM_Y);
  const fmtKm = d => d < 1 ? Math.round(d * 1000 / 10) * 10 + ' m' : d.toFixed(1) + ' km';
  // ближайший ориентир; если задан район — только из него (иначе «Downtown» мог бы подписать Амбросию)
  const nearestLandmark = (x, y, r) => D.landmarks.reduce((b, l) => {
    if (r && (l[1] < r.b[0] || l[1] > r.b[2] || l[2] < r.b[1] || l[2] > r.b[3])) return b;
    const d = (l[1] - x) ** 2 + (l[2] - y) ** 2; return d < b[1] ? [l[0], d] : b;
  }, ['', 1e9]);
  // регион точки: среди рамок, куда она попадает, — с ближайшим центром подписи
  const regionAt = (x, y) => {
    const inside = D.regions.filter(r => x >= r.b[0] && x <= r.b[2] && y >= r.b[1] && y <= r.b[3]);
    return inside.sort((a, b) => ((a.lx - x) ** 2 + (a.ly - y) ** 2) - ((b.lx - x) ** 2 + (b.ly - y) ** 2))[0] || null;
  };
  const gxy = (x, y) => `X ${Math.round((x - 50) * 118).toLocaleString('en')} · Y ${Math.round((50 - y) * 170).toLocaleString('en')}`;

  // ---- блипы: подпись по наведению; при открытии проявляются волной от центра ----
  const START = [64, 46];
  const pins = (window.PINS || []).map((p, i) => {
    const s = SUB[p.k], b = document.createElement('button');
    b.type = 'button'; b.className = GROUP[s.g].track ? 'bp is-col' : 'bp'; b.dataset.cat = s.g; b.dataset.k = p.k;
    b.style.left = p.x + '%'; b.style.top = p.y + '%';
    b.style.setProperty('--dl', (.25 + Math.min(1.1, Math.hypot(p.x - START[0], (p.y - START[1]) * D.aspect) * .022)).toFixed(2) + 's');
    b.setAttribute('aria-label', `${p.n} · ${s.name}`);
    // телефон открывается на всём острове точками: значки не нужны, пока не приблизили
    if (!MOB) b.innerHTML = icon(p.k) + `<b>${p.n}<i>${s.name}</i></b>`;
    blipsEl.appendChild(b);
    return { ...p, i, s, el: b };
  });

  // подписи регионов и ориентиров
  $('#labels').innerHTML =
    D.regions.map(r => `<span class="rl" style="left:${r.lx}%;top:${r.ly}%">${r.name}</span>`).join('') +
    D.landmarks.map(([n, x, y]) => `<span class="lm" style="left:${x}%;top:${y}%">${n}</span>`).join('');

  // ---- легенда ----
  const countK = k => pins.filter(p => p.k === k).length;
  const groupRow = g => {
    const n = g.subs.reduce((s, [k]) => s + countK(k), 0);
    return `<div class="lg-g" data-cat="${g.id}" data-g="${g.id}">
      <button class="lg-gh" type="button" title="Show / hide group"><span>${g.name}</span><span class="mono">${g.track ? `0/${n}` : n}</span></button>
      ${g.subs.map(([k, name, total]) => `<button class="lg-i" type="button" data-k="${k}" data-name="${name.toLowerCase()}" title="Show / hide">
        <span class="mini">${icon(k)}</span>${name}<span class="mono">${total ? `0/${countK(k)} <i>· ${total}</i>` : countK(k)}</span></button>`).join('')}
    </div>`;
  };
  const part = (name, cls, gs) => `<div class="lg-part"><p class="lg-cap"><i class="kd ${cls}"></i>${name}</p>${gs.map(groupRow).join('')}</div>`;
  $('#list').innerHTML = part('Collectibles', 'kd-col', D.groups.filter(g => g.track)) + part('Places', '', D.groups.filter(g => !g.track));

  // приглушение: поиск по тексту и фокус на регионе действуют вместе
  let q = '', focus = null, hoverK = null;
  const hit = p => (!q || p.n.toLowerCase().includes(q) || p.s.name.toLowerCase().includes(q) || GROUP[p.s.g].name.toLowerCase().includes(q) || REG[p.r].name.toLowerCase().includes(q))
    && (!focus || p.r === focus);
  const dim = () => {
    const ks = new Set();
    pins.forEach(p => { const h = hit(p); p.el.classList.toggle('is-dim', !h || (hoverK && p.k !== hoverK)); if (h) ks.add(p.k); });
    document.querySelectorAll('.lg-i').forEach(i => i.hidden = !!q && !ks.has(i.dataset.k));
    document.querySelectorAll('.lg-g').forEach(g => g.hidden = !!q && !g.querySelector('.lg-i:not([hidden])'));
    document.querySelectorAll('.lg-part').forEach(g => g.hidden = !!q && !g.querySelector('.lg-g:not([hidden])'));
  };
  const refresh = () => {
    let shown = 0;
    pins.forEach(p => { const o = off.has(p.k); p.el.classList.toggle('is-off', o); if (!o && hit(p)) shown++; });
    $('#shown').textContent = shown;
    document.querySelectorAll('.lg-i').forEach(i => i.classList.toggle('is-off', off.has(i.dataset.k)));
    document.querySelectorAll('.lg-g').forEach(g => g.querySelector('.lg-gh').classList.toggle('is-off', GROUP[g.dataset.g].subs.every(([k]) => off.has(k))));
    const only = t => off.size === KEYS[t === 'col' ? 'place' : 'col'].length && KEYS[t].every(k => !off.has(k));
    document.querySelectorAll('.lg-quick [data-all]').forEach(b => b.classList.toggle('is-on', b.dataset.all === 'all' ? !off.size : only(b.dataset.all)));
  };
  $('#list').addEventListener('click', e => {
    const it = e.target.closest('.lg-i'), gh = e.target.closest('.lg-gh');
    if (it) { const k = it.dataset.k; off.has(k) ? off.delete(k) : off.add(k); }
    else if (gh) {
      const subs = GROUP[gh.closest('.lg-g').dataset.g].subs.map(s => s[0]);
      const allOff = subs.every(k => off.has(k));
      subs.forEach(k => allOff ? off.delete(k) : off.add(k));
    } else return;
    refresh();
  });
  // наведение на строку легенды подсвечивает её блипы
  if (!MOB) {
    $('#list').addEventListener('mouseover', e => { const it = e.target.closest('.lg-i'); hoverK = it ? it.dataset.k : null; dim(); });
    $('#list').addEventListener('mouseleave', () => { hoverK = null; dim(); });
  }
  document.querySelector('.lg-quick').addEventListener('click', e => {
    const b = e.target.closest('[data-all]'); if (!b) return;
    off.clear();
    if (b.dataset.all !== 'all') KEYS[b.dataset.all === 'col' ? 'place' : 'col'].forEach(k => off.add(k));
    refresh();
  });

  // ---- поиск: подсказки мест (↑ ↓ Enter), список типов и блипы фильтруются тут же ----
  const qIn = $('#q'), res = $('#res');
  let found = [], act = 0;
  const showRes = () => {
    if (!q) { res.hidden = true; return; }
    const w = s => s.toLowerCase().startsWith(q) ? 0 : 1;
    found = pins.filter(p => !off.has(p.k) && hit(p))
      .sort((a, b) => w(a.n) - w(b.n) || a.n.localeCompare(b.n)).slice(0, 6);
    act = 0;
    res.innerHTML = found.length
      ? found.map((p, j) => `<button type="button" role="option" data-i="${p.i}" data-cat="${p.s.g}" class="${j ? '' : 'is-act'}"><span class="mini">${icon(p.k)}</span>
          <span class="t"><b>${p.n}</b><span>${p.s.name} · ${REG[p.r].name}</span></span></button>`).join('')
      : `<p class="empty">Nothing on the map matches “${qIn.value.trim()}”.</p>`;
    res.hidden = false;
  };
  // выбор из подсказок: поиск сбрасывается — на карте снова все точки, выбранная открыта
  const pick = i => { qIn.value = ''; q = ''; res.hidden = true; qIn.blur(); dim(); refresh(); open(pins[i]); };
  const setAct = j => { act = (j + found.length) % found.length; res.querySelectorAll('button').forEach((b, k) => b.classList.toggle('is-act', k === act)); };
  qIn.addEventListener('input', () => { q = qIn.value.trim().toLowerCase(); dim(); refresh(); showRes(); });
  qIn.addEventListener('focus', () => { showRes(); if (sheets()) sheetL.go(2); });
  qIn.addEventListener('keydown', e => {
    if (res.hidden || !found.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setAct(act + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAct(act - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(found[act].i); }
  });
  res.addEventListener('mousedown', e => e.preventDefault()); // не терять фокус поля до клика
  res.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) pick(+b.dataset.i); });
  qIn.addEventListener('blur', () => setTimeout(() => { res.hidden = true; }, 120));

  // ---- панорама и зум ----
  let x = 0, y = 0, z = 1, fitZ = 1;
  const box = (bare) => { // видимая часть карты: за вычетом легенды, шапки, дока регионов и карточки (bare — без карточки)
    const r = stage.getBoundingClientRect(), hasInfo = !bare && atlas.classList.contains('has-info');
    if (sheets()) { // телефон: между лентой регионов и нижним листом
      const t = $('#cards').offsetTop + 46, b = (hasInfo ? peekI() : peekL()) + 8;
      return { l: 0, t, w: r.width, h: r.height - t - b, W: r.width, H: r.height };
    }
    if (MOB) { // телефон на боку и планшет: панели по краям, карточка закрывает легенду
      const t = $('#cards').offsetTop + 46, l = hasInfo ? 8 : legend.offsetLeft + legend.offsetWidth + 8, rt = hasInfo ? info.offsetWidth + 60 : 60;
      return { l, t, w: r.width - l - rt, h: r.height - t - 8, W: r.width, H: r.height };
    }
    const right = hasInfo ? 480 : 190;
    return { l: 385, t: 110, w: r.width - 385 - right, h: r.height - 110 - 120, W: r.width, H: r.height };
  };
  // подпись района и обзор
  const hudName = $('#hudName'), hudSub = $('#hudSub'), hudXY = $('#hudXY'), hud = $('#hud');
  const ov = $('#ov'), ovView = $('#ovView');
  let hudKey = '';
  const updateHud = () => {
    const b = box(), cx = ((b.l + b.w / 2) - x) / z / WW * 100, cy = ((b.t + b.h / 2) - y) / z / WH * 100;
    const r = regionAt(cx, cy), lm = nearestLandmark(cx, cy, r);
    const name = r ? r.name : (cx < 0 || cx > 100 || cy < 0 || cy > 100 ? 'Open water' : 'Leonida');
    const sub = lm[1] < (r ? 260 : 90) ? lm[0] : 'State of Leonida';
    if (name + sub !== hudKey) {
      hudKey = name + sub; hudName.textContent = name; hudSub.textContent = sub;
      hud.classList.remove('is-swap'); void hud.offsetWidth; hud.classList.add('is-swap');
    }
    hudXY.textContent = gxy(cx, cy);
    // рамка видимой части на обзоре (вся сцена, в долях острова)
    const vl = -x / z / WW, vt = -y / z / WH, vw = b.W / z / WW, vh = b.H / z / WH;
    const cl = Math.max(0, vl), ct = Math.max(0, vt), cr = Math.min(1, vl + vw), cb = Math.min(1, vt + vh);
    ovView.style.cssText = `left:${(cl * 100).toFixed(2)}%;top:${(ct * 100).toFixed(2)}%;width:${Math.max(0, (cr - cl) * 100).toFixed(2)}%;height:${Math.max(0, (cb - ct) * 100).toFixed(2)}%`;
    ov.classList.toggle('is-whole', vw >= 1 && vh >= 1);
  };
  let izOf = 0, hudT = 0, frame = 0, iconsOn = false;
  const apply = () => {
    if (MOB) { // остров не уводим из окна: центр экрана всегда над картой
      const W = stage.clientWidth, H = stage.clientHeight, mw = WW * z, mh = WH * z;
      x = Math.min(W / 2, Math.max(W / 2 - mw, x)); y = Math.min(H / 2, Math.max(H / 2 - mh, y));
    }
    world.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
    // при панораме масштаб не меняется — стили 139 блипов не пересчитываем
    if (z !== izOf) {
      izOf = z;
      world.style.setProperty('--iz', (1 / z).toFixed(4));
      const rel = z / fitZ;
      world.classList.toggle('is-far', rel < 1.7);
      world.classList.toggle('is-near', rel >= 1.7);
      if (MOB && rel >= 1.7 && !iconsOn) { iconsOn = true; pins.forEach(p => { p.el.innerHTML = icon(p.k); }); }
      world.classList.toggle('is-close', rel >= 3.4);
      $('#zl').textContent = rel.toFixed(1) + '×';
    }
    if (MOB) { if (!hudT) hudT = setTimeout(() => { hudT = 0; updateHud(); tiles(); }, 130); return; }
    palms.forEach(p => { const k = +p.dataset.k; p.style.translate = `${(x * k).toFixed(1)}px ${(y * k).toFixed(1)}px`; });
    updateHud();
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; apply(); }); };

  // ---- плитки: основа 1668 px лёгкая, но при приближении мылит; поверх подгружается полное разрешение, только видимая часть ----
  const tilesEl = $('#tiles'), TC = 4, TR = 6, live = new Map();
  const tiles = () => {
    if (MOB && shot.getAttribute('src') && !shot.complete) { shot.addEventListener('load', tiles, { once: true }); return; } // сначала кадр карточки, потом плитки
    const on = z * WW * Math.min(devicePixelRatio || 1, 3) > 1668 * 1.1, style = document.body.dataset.mode;
    tilesEl.hidden = !on;
    const want = new Set();
    if (on) {
      const W = stage.clientWidth, H = stage.clientHeight, tw = WW * z / TC, th = WH * z / TR;
      const c0 = Math.max(0, Math.floor(-x / tw)), c1 = Math.min(TC - 1, Math.floor((W - x) / tw));
      const r0 = Math.max(0, Math.floor(-y / th)), r1 = Math.min(TR - 1, Math.floor((H - y) / th));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) want.add(`${style}-${r}-${c}`);
    }
    want.forEach(k => {
      if (live.has(k)) return;
      const [, r, c] = k.split('-').map(Number), im = new Image();
      im.className = 'tile'; im.alt = ''; im.decoding = 'async'; im.fetchPriority = 'low';
      im.style.cssText = `left:${c / TC * 100}%;top:${r / TR * 100}%;width:${100 / TC + .03}%;height:${100 / TR + .03}%`;
      im.onload = () => im.classList.add('is-on');
      im.src = `img/m/map/${k}.webp`;
      tilesEl.appendChild(im); live.set(k, im);
    });
    // в памяти держим не больше дюжины плиток: 24 штуки — это снова целая картинка
    live.forEach((im, k) => { if (!want.has(k) && (live.size > 12 || !k.startsWith(style))) { im.remove(); live.delete(k); } });
  };
  const anim = on => { world.classList.toggle('is-anim', !!on); clearTimeout(anim.t); if (on) anim.t = setTimeout(() => world.classList.remove('is-anim'), 720); };
  const clampZ = v => Math.min(fitZ * 6.5, Math.max(fitZ * .8, v));
  const flyTo = (cx, cy, nz, a = true) => { // cx, cy — в % карты
    const b = box(); z = clampZ(nz);
    x = b.l + b.w / 2 - cx / 100 * WW * z; y = b.t + b.h / 2 - cy / 100 * WH * z;
    anim(a); apply();
  };
  const fit = a => { close(); const b = box(true); fitZ = Math.min(b.w / WW, b.h / WH) * 1.02; flyTo(50, 50, fitZ, a); };
  const zoomAt = (px, py, f, a) => { const nz = clampZ(z * f); x = px - (px - x) * (nz / z); y = py - (py - y) * (nz / z); z = nz; anim(a); apply(); };

  stage.addEventListener('wheel', e => { e.preventDefault(); const r = stage.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * .0016)); }, { passive: false });
  const center = () => { const b = box(); return [b.l + b.w / 2, b.t + b.h / 2]; };
  document.querySelector('.zoom').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.z === 'fit') { setRegion(null); return fit(true); }
    zoomAt(...center(), b.dataset.z === 'in' ? 1.6 : 1 / 1.6, true);
  });
  // один палец — панорама с инерцией, два — масштаб вокруг точки между ними; касание — ближайшая точка, двойное касание — приближение
  let drag = null, pinch = null, glide = 0, lastTap = { t: 0, x: 0, y: 0 };
  const touches = new Map();
  const at = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const startPinch = () => {
    const [a, b] = [...touches.values()];
    pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, z, x, y };
    drag = null; world.classList.remove('is-anim');
  };
  const nearest = (px, py) => { // в пределах 30 px от пальца: в плотном центре Вайс-Сити точки стоят вплотную
    let best = null, bd = 30 * 30;
    pins.forEach(p => {
      if (p.el.classList.contains('is-off') || p.el.classList.contains('is-dim')) return;
      const d = (x + p.x / 100 * WW * z - px) ** 2 + (y + p.y / 100 * WH * z - py) ** 2;
      if (d < bd) { bd = d; best = p; }
    });
    return best;
  };
  const tap = (px, py, t) => {
    const hit = nearest(px, py);
    if (hit) { open(hit); return; }
    if (t - lastTap.t < 320 && Math.hypot(px - lastTap.x, py - lastTap.y) < 30) { zoomAt(px, py, 1.9, true); lastTap.t = 0; return; }
    lastTap = { t, x: px, y: py };
    if (cur) close(); else if (sheets() && sheetL.stop) sheetL.go(0);
  };
  stage.addEventListener('pointerdown', e => {
    const touch = e.pointerType !== 'mouse';
    if (!touch && e.target.closest('.bp')) return;
    cancelAnimationFrame(glide); world.classList.add('is-move');
    stage.setPointerCapture(e.pointerId);
    if (touch) touches.set(e.pointerId, at(e));
    if (touches.size >= 2) { if (touches.size === 2) startPinch(); return; }
    drag = { sx: e.clientX, sy: e.clientY, x, y, moved: false, touch, lx: e.clientX, ly: e.clientY, lt: e.timeStamp, vx: 0, vy: 0 };
  });
  stage.addEventListener('pointermove', e => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, at(e));
    if (pinch && touches.size >= 2) {
      const [a, b] = [...touches.values()], k = clampZ(pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d) / pinch.z;
      z = pinch.z * k; x = (a[0] + b[0]) / 2 - (pinch.cx - pinch.x) * k; y = (a[1] + b[1]) / 2 - (pinch.cy - pinch.y) * k;
      schedule(); return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < (drag.touch ? 8 : 4)) return;
    drag.moved = true; stage.classList.add('is-drag');
    const dt = e.timeStamp - drag.lt;
    if (dt > 0) { drag.vx = drag.vx * .3 + (e.clientX - drag.lx) / dt * .7; drag.vy = drag.vy * .3 + (e.clientY - drag.ly) / dt * .7; drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = e.timeStamp; }
    x = drag.x + dx; y = drag.y + dy; schedule();
  });
  const coast = (vx, vy) => { // инерция: скорость тает примерно за полсекунды
    let t0 = performance.now();
    const step = now => {
      const dt = Math.min(32, now - t0), k = Math.pow(.994, dt); t0 = now;
      vx *= k; vy *= k; x += vx * dt; y += vy * dt; apply();
      if (Math.hypot(vx, vy) > .03) glide = requestAnimationFrame(step); else world.classList.remove('is-move');
    };
    glide = requestAnimationFrame(step);
  };
  const end = e => {
    touches.delete(e.pointerId);
    if (pinch) {
      if (touches.size < 2) pinch = null;
      if (touches.size === 1) { // второй палец убран — панорама продолжается от оставшегося
        const [p] = [...touches.values()], r = stage.getBoundingClientRect();
        drag = { sx: p[0] + r.left, sy: p[1] + r.top, x, y, moved: true, touch: true, lx: p[0] + r.left, ly: p[1] + r.top, lt: e.timeStamp, vx: 0, vy: 0 };
      } else world.classList.remove('is-move');
      return;
    }
    if (touches.size) return;
    const d = drag; drag = null; stage.classList.remove('is-drag');
    if (d && d.touch && !d.moved) { const [px, py] = at(e); tap(px, py, e.timeStamp); world.classList.remove('is-move'); return; }
    if (d && !d.moved) close();
    // палец замер перед отпусканием — без инерции
    if (d && d.touch && e.timeStamp - d.lt < 60 && Math.hypot(d.vx, d.vy) > .2) coast(d.vx, d.vy); else world.classList.remove('is-move');
  };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);

  // обзор: клик или перетаскивание — центр карты туда
  let ovDrag = false;
  const ovGo = (e, a) => {
    const r = ov.getBoundingClientRect();
    const cx = Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)), cy = Math.min(100, Math.max(0, (e.clientY - r.top) / r.height * 100));
    flyTo(cx, cy, Math.max(z, fitZ * 1.8), a);
  };
  ov.addEventListener('pointerdown', e => { ovDrag = true; ov.setPointerCapture(e.pointerId); ovGo(e, true); });
  ov.addEventListener('pointermove', e => { if (ovDrag) ovGo(e, false); });
  ov.addEventListener('pointerup', () => { ovDrag = false; });

  // ---- карточка места ----
  let cur = null;
  const shot = $('#iShot'), shotBox = shot.parentElement;
  shot.fetchPriority = 'high';
  shot.addEventListener('load', () => shotBox.classList.add('is-on'));
  function open(p, fly = true) {
    if (cur) cur.el.classList.remove('is-on');
    if (off.has(p.k)) { off.delete(p.k); refresh(); }
    cur = p; p.el.classList.add('is-on');
    info.dataset.cat = p.s.g;
    $('#iBlip').innerHTML = icon(p.k);
    $('#iCat').textContent = `${GROUP[p.s.g].name} · ${p.s.name}`;
    $('#iName').textContent = p.n;
    // кадр грузится только при открытии карточки; место под него занято заранее, лист не прыгает
    const src = D.spot(p, p.i, MOB);
    if (shot.getAttribute('src') !== src) { shotBox.classList.remove('is-on'); shot.src = src; }
    shot.alt = `Where to find ${p.n}`;
    info.classList.toggle('is-place', !GROUP[p.s.g].track);
    const lm = nearestLandmark(p.x, p.y);
    $('#iWhere').textContent = REG[p.r].name + (lm[1] < 60 ? ` · near ${lm[0]}` : '');
    $('#iTxt').textContent = p.s.desc;
    $('#iXY').textContent = gxy(p.x, p.y);
    $('#iNear').innerHTML = pins.filter(o => o !== p && !off.has(o.k))
      .map(o => [o, km([p.x, p.y], [o.x, o.y])]).sort((a, b) => a[1] - b[1]).slice(0, 4)
      .map(([o, d]) => `<li><button type="button" data-i="${o.i}" data-cat="${o.s.g}"><span class="mini">${icon(o.k)}</span>${o.n}<span class="mono">${fmtKm(d)}</span></button></li>`).join('');
    info.hidden = false; atlas.classList.add('has-info');
    info.scrollTop = 0;
    if (sheets()) { info.classList.add('is-open'); sheetL.go(0, false); sheetI.go(0); setSheetVar(); }
    else requestAnimationFrame(() => info.classList.add('is-open'));
    history.replaceState(null, '', '#p' + p.i);
    if (fly) flyTo(p.x, p.y, Math.max(z, fitZ * 2.4));
  }
  function close() {
    if (!cur) return;
    cur.el.classList.remove('is-on'); cur = null;
    info.classList.remove('is-open'); atlas.classList.remove('has-info');
    if (sheets()) { info.classList.add('is-anim'); info.style.transform = ''; setSheetVar(); }
    history.replaceState(null, '', location.pathname);
  }
  blipsEl.addEventListener('click', e => { const b = e.target.closest('.bp'); if (b) open(pins.find(p => p.el === b)); });
  info.querySelector('[data-close]').addEventListener('click', close);
  $('#iNear').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) open(pins[+b.dataset.i]); });

  // ссылка на место — в буфер, с подтверждением снизу
  const toast = $('#toast');
  const say = t => { toast.textContent = t; toast.hidden = false; toast.classList.remove('is-on'); void toast.offsetWidth; toast.classList.add('is-on'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('is-on'), 1800); };
  $('#linkBtn').addEventListener('click', () => {
    const u = location.href, ok = () => say('Link to ' + cur.n + ' copied');
    navigator.clipboard ? navigator.clipboard.writeText(u).then(ok, ok) : ok();
  });

  // ---- открытки регионов: перелёт и фокус — точки вне региона гаснут, в легенде — чип региона ----
  const cards = $('#cards'), chip = $('#rgChip');
  // миниатюра (_tools/region-thumbs.cjs) — весь остров 42 px в окне 46×64, регион залит своим цветом; блип — в его центре
  const TW = 42, TH = TW * D.aspect, TX = (46 - TW) / 2, TY = (64 - TH) / 2;
  cards.innerHTML = D.regions.map(r => {
    const n = pins.filter(p => p.r === r.id).length;
    const rx = TX + (r.b[0] + r.b[2]) / 200 * TW, ry = TY + (r.b[1] + r.b[3]) / 200 * TH;
    return `<button class="rg" type="button" data-r="${r.id}" style="--g0:${r.g[0]};--g1:${r.g[1]}" title="${r.name} — ${r.d}">
      <span class="rg-map" style="--x:${rx.toFixed(1)}px;--y:${ry.toFixed(1)}px"><img src="img/regions/${r.id}.webp" alt=""></span>
      <span class="rg-t"><span class="rg-name">${r.name}</span><span class="rg-meta"><i></i><b>${n}</b>points</span></span></button>`;
  }).join('');
  function setRegion(id) {
    focus = id;
    cards.querySelectorAll('.rg').forEach(c => c.classList.toggle('is-on', c.dataset.r === id));
    chip.hidden = !id;
    if (id) {
      const r = REG[id];
      chip.style.setProperty('--g0', r.g[0]); chip.style.setProperty('--g1', r.g[1]);
      $('#rgName').textContent = r.name; $('#rgN').textContent = pins.filter(p => p.r === id).length + ' points';
    }
    dim(); refresh(); if (q) showRes();
  }
  cards.addEventListener('click', e => {
    const c = e.target.closest('.rg'); if (!c) return;
    const r = REG[c.dataset.r];
    if (focus === r.id) { setRegion(null); return; }
    close(); setRegion(r.id);
    const b = box();
    const nz = Math.min(b.w / ((r.b[2] - r.b[0]) / 100 * WW), b.h / ((r.b[3] - r.b[1]) / 100 * WH));
    flyTo((r.b[0] + r.b[2]) / 2, (r.b[1] + r.b[3]) / 2, nz);
  });
  chip.querySelector('button').addEventListener('click', () => setRegion(null));

  // ---- стиль карты: неон / атлас ----
  // атлас на телефоне подгружается только по выбору стиля, на ПК — сразу, как и раньше
  const lay = $('.lay-atlas'), loadAtlas = () => { if (!lay.getAttribute('src')) lay.src = MOB ? 'img/m/map/atlas.webp' : 'img/map-atlas.webp'; };
  if (!MOB) loadAtlas();
  document.querySelector('.mode').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]'); if (!b) return;
    document.body.dataset.mode = b.dataset.mode;
    document.querySelectorAll('.mode button').forEach(o => o.classList.toggle('is-on', o === b));
    if (b.dataset.mode === 'atlas') loadAtlas();
    if (MOB) tiles();
  });

  // ---- клавиши ----
  addEventListener('keydown', e => {
    if (e.target.matches('input')) { if (e.key === 'Escape') { qIn.value = ''; q = ''; dim(); refresh(); res.hidden = true; e.target.blur(); } return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); qIn.focus(); }
    else if (e.key === 'Escape') { if (cur) close(); else if (focus) setRegion(null); }
    else if (e.code === 'KeyF') { setRegion(null); fit(true); }
    else if (e.key === '+' || e.key === '=') zoomAt(...center(), 1.4, true);
    else if (e.key === '-') zoomAt(...center(), 1 / 1.4, true);
  });
  addEventListener('resize', () => {
    if (sheets()) { sheetL.go(sheetL.stop, false); if (cur) sheetI.go(sheetI.stop, false); }
    else { legend.style.transform = ''; info.style.transform = ''; }
    setSheetVar();
    const keep = Math.abs(z - fitZ) > 1e-6, b = box(true);
    fitZ = Math.min(b.w / WW, b.h / WH) * 1.02;
    keep ? apply() : fit(false);
  });

  // ---- нижние листы (телефон в портрете): легенда — три положения, карточка места — два ----
  // Лист выше видимой части, положение — сдвиг вниз; тянется за ручку и шапку, отпускание ведёт к ближайшему положению с учётом скорости
  function makeSheet(el, stops, grabs, onstop) {
    let i = 0, d = null;
    const off = v => el.offsetHeight - v;
    const go = (n, anim = true) => {
      const s = stops(); i = Math.max(0, Math.min(s.length - 1, n));
      el.classList.toggle('is-anim', anim);
      el.style.transform = `translate3d(0, ${off(s[i])}px, 0)`;
      el.style.setProperty('--hid', off(s[i]) + 'px');
      el.dataset.stop = i;
      if (onstop) onstop(i);
    };
    grabs.forEach(g => {
      // без этого браузер считает жест прокруткой, и касание сразу после броска листа не становится кликом
      g.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
      g.addEventListener('pointerdown', e => {
        if (e.target.closest('a, button, input')) return;
        const s = stops();
        d = { y: e.clientY, from: off(s[i]), min: off(s[s.length - 1]), max: off(s[0]), moved: false, ly: e.clientY, lt: e.timeStamp, v: 0 };
        g.setPointerCapture(e.pointerId); el.classList.remove('is-anim');
      });
      g.addEventListener('pointermove', e => {
        if (!d) return;
        const dy = e.clientY - d.y;
        if (!d.moved && Math.abs(dy) < 6) return;
        d.moved = true;
        const dt = e.timeStamp - d.lt; if (dt > 0) { d.v = d.v * .3 + (e.clientY - d.ly) / dt * .7; d.ly = e.clientY; d.lt = e.timeStamp; }
        el.style.transform = `translate3d(0, ${Math.min(d.max + 40, Math.max(d.min, d.from + dy))}px, 0)`;
      });
      const up = e => {
        if (!d) return;
        const was = d; d = null;
        if (!was.moved) { go(i + 1 >= stops().length ? 0 : i + 1); return; } // касание ручки — следующее положение
        const now = was.from + (e.clientY - was.y), aim = now + was.v * 170, s = stops();
        let best = 0; s.forEach((v, k) => { if (Math.abs(off(v) - aim) < Math.abs(off(s[best]) - aim)) best = k; });
        go(best);
      };
      g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
    });
    return { go, get stop() { return i; } };
  }
  // отступ домашней полосы: env() читается только через вычисленный стиль
  const safeB = () => parseFloat(getComputedStyle(legend).paddingBottom) || 0;
  // видимая высота в нижнем положении: у легенды — до конца поиска, у карточки — до конца кнопок
  const peekL = () => { const f = legend.querySelector('.lg-find'); return f.offsetTop + f.offsetHeight + 12 + safeB(); };
  const peekI = () => { const a = info.querySelector('.info-act'); return a.offsetTop + a.offsetHeight + 16 + safeB(); };
  const setSheetVar = () => { if (sheets()) atlas.style.setProperty('--sheet', (cur ? peekI() : peekL()) + 'px'); };
  const sheetL = makeSheet(legend, () => [peekL(), Math.round(stage.clientHeight * .58), legend.offsetHeight],
    [legend.querySelector('.sheet-grip'), legend.querySelector('.lg-head')], n => { if (!n) qIn.blur(); });
  const sheetI = makeSheet(info, () => { const p = peekI(), h = info.offsetHeight; return h - p > 30 ? [p, h] : [p]; },
    [info.querySelector('.sheet-grip'), info.querySelector('.info-top')], n => { info.style.overflowY = n ? 'auto' : ''; });

  // старт: чуть ближе «по размеру», чтобы сразу были видны иконки, а не точки; на телефоне — весь остров
  refresh();
  if (sheets()) { sheetL.go(0, false); setSheetVar(); }
  fit(false);
  if (!MOB) flyTo(START[0], START[1], fitZ * 1.75, false);
  // с главной приходят с адресом: #vice — к региону, #p12 — сразу к точке
  const h = location.hash.slice(1);
  if (REG[h]) cards.querySelector(`[data-r="${h}"]`).click();
  else if (/^p\d+$/.test(h) && pins[+h.slice(1)]) open(pins[+h.slice(1)]);
})();
