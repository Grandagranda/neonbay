// Карта Леониды: панорама/зум, блипы, легенда-фильтр, поиск мест с подсказками, карточка места, метка пути с навигатором,
// обзорная мини-карта, подпись района как в GTA, открытки регионов с фокусом на регион.
(() => {
  const D = window.MAP, $ = s => document.querySelector(s);
  const palms = [...document.querySelectorAll('.palm')];
  const stage = $('#stage'), world = $('#world'), blipsEl = $('#blips'), info = $('#info'), atlas = $('.atlas');
  const WW = 1000, WH = WW * D.aspect, KM_X = D.kmPerMap, KM_Y = D.kmPerMap * D.aspect;

  // ---- справочники ----
  const SUB = {}, GROUP = {};
  D.groups.forEach(g => { GROUP[g.id] = g; g.subs.forEach(([k, name, total, desc]) => { SUB[k] = { k, name, total, desc, g: g.id }; }); });
  const REG = Object.fromEntries(D.regions.map(r => [r.id, r]));
  const off = new Set(); // выключенные типы
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
    b.type = 'button'; b.className = 'bp'; b.dataset.cat = s.g; b.dataset.k = p.k;
    b.style.left = p.x + '%'; b.style.top = p.y + '%';
    b.style.setProperty('--dl', (.25 + Math.min(1.1, Math.hypot(p.x - START[0], (p.y - START[1]) * D.aspect) * .022)).toFixed(2) + 's');
    b.setAttribute('aria-label', `${p.n} · ${s.name}`);
    b.innerHTML = icon(p.k) + `<b>${p.n}<i>${s.name}</i></b>`;
    blipsEl.appendChild(b);
    return { ...p, i, s, el: b };
  });
  const you = document.createElement('span'); you.className = 'you'; you.innerHTML = icon('you');
  you.style.left = D.you[0] + '%'; you.style.top = D.you[1] + '%'; blipsEl.appendChild(you);
  const wp = document.createElement('span'); wp.className = 'wp'; wp.hidden = true; wp.innerHTML = icon('waypoint'); blipsEl.appendChild(wp);

  // подписи регионов и ориентиров
  $('#labels').innerHTML =
    D.regions.map(r => `<span class="rl" style="left:${r.lx}%;top:${r.ly}%">${r.name}</span>`).join('') +
    D.landmarks.map(([n, x, y]) => `<span class="lm" style="left:${x}%;top:${y}%">${n}</span>`).join('');

  // ---- легенда ----
  const countK = k => pins.filter(p => p.k === k).length;
  $('#list').innerHTML = D.groups.map(g => {
    const n = g.subs.reduce((s, [k]) => s + countK(k), 0);
    return `<div class="lg-g" data-cat="${g.id}" data-g="${g.id}">
      <button class="lg-gh" type="button" title="Show / hide group"><span>${g.name}</span><span class="mono">${g.track ? `0/${n}` : n}</span></button>
      ${g.subs.map(([k, name, total]) => `<button class="lg-i" type="button" data-k="${k}" data-name="${name.toLowerCase()}" title="Show / hide">
        <span class="mini">${icon(k)}</span>${name}<span class="mono">${total ? `0/${countK(k)} <i>· ${total}</i>` : countK(k)}</span></button>`).join('')}
    </div>`;
  }).join('');

  // приглушение: поиск по тексту и фокус на регионе действуют вместе
  let q = '', focus = null, hoverK = null;
  const hit = p => (!q || p.n.toLowerCase().includes(q) || p.s.name.toLowerCase().includes(q) || GROUP[p.s.g].name.toLowerCase().includes(q) || REG[p.r].name.toLowerCase().includes(q))
    && (!focus || p.r === focus);
  const dim = () => {
    const ks = new Set();
    pins.forEach(p => { const h = hit(p); p.el.classList.toggle('is-dim', !h || (hoverK && p.k !== hoverK)); if (h) ks.add(p.k); });
    document.querySelectorAll('.lg-i').forEach(i => i.hidden = !!q && !ks.has(i.dataset.k));
    document.querySelectorAll('.lg-g').forEach(g => g.hidden = !!q && !g.querySelector('.lg-i:not([hidden])'));
  };
  const refresh = () => {
    let shown = 0;
    pins.forEach(p => { const o = off.has(p.k); p.el.classList.toggle('is-off', o); if (!o && hit(p)) shown++; });
    $('#shown').textContent = shown;
    document.querySelectorAll('.lg-i').forEach(i => i.classList.toggle('is-off', off.has(i.dataset.k)));
    document.querySelectorAll('.lg-g').forEach(g => g.querySelector('.lg-gh').classList.toggle('is-off', GROUP[g.dataset.g].subs.every(([k]) => off.has(k))));
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
  $('#list').addEventListener('mouseover', e => { const it = e.target.closest('.lg-i'); hoverK = it ? it.dataset.k : null; dim(); });
  $('#list').addEventListener('mouseleave', () => { hoverK = null; dim(); });
  document.querySelector('.lg-quick').addEventListener('click', e => {
    const b = e.target.closest('[data-all]'); if (!b) return;
    if (b.dataset.all === 'on') off.clear(); else Object.keys(SUB).forEach(k => off.add(k));
    refresh();
  });

  // ---- поиск: подсказки мест (↑ ↓ Enter), список типов и блипы фильтруются тут же ----
  const qIn = $('#q'), res = $('#res');
  let found = [], act = 0;
  const showRes = () => {
    if (!q) { res.hidden = true; return; }
    const w = s => s.toLowerCase().startsWith(q) ? 0 : 1;
    found = pins.filter(p => !off.has(p.k) && hit(p))
      .sort((a, b) => w(a.n) - w(b.n) || km([a.x, a.y], D.you) - km([b.x, b.y], D.you)).slice(0, 6);
    act = 0;
    res.innerHTML = found.length
      ? found.map((p, j) => `<button type="button" role="option" data-i="${p.i}" data-cat="${p.s.g}" class="${j ? '' : 'is-act'}"><span class="mini">${icon(p.k)}</span>
          <span class="t"><b>${p.n}</b><span>${p.s.name} · ${REG[p.r].name}</span></span><span class="d">${fmtKm(km([p.x, p.y], D.you))}</span></button>`).join('')
      : `<p class="empty">Nothing on the map matches “${qIn.value.trim()}”.</p>`;
    res.hidden = false;
  };
  // выбор из подсказок: поиск сбрасывается — на карте снова все точки, выбранная открыта
  const pick = i => { qIn.value = ''; q = ''; res.hidden = true; qIn.blur(); dim(); refresh(); open(pins[i]); };
  const setAct = j => { act = (j + found.length) % found.length; res.querySelectorAll('button').forEach((b, k) => b.classList.toggle('is-act', k === act)); };
  qIn.addEventListener('input', () => { q = qIn.value.trim().toLowerCase(); dim(); refresh(); showRes(); });
  qIn.addEventListener('focus', showRes);
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
    const r = stage.getBoundingClientRect(), right = !bare && atlas.classList.contains('has-info') ? 480 : 190;
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
  const apply = () => {
    world.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
    world.style.setProperty('--iz', (1 / z).toFixed(4));
    const rel = z / fitZ;
    world.classList.toggle('is-far', rel < 1.7);
    world.classList.toggle('is-near', rel >= 1.7);
    world.classList.toggle('is-close', rel >= 3.4);
    $('#zl').textContent = rel.toFixed(1) + '×';
    palms.forEach(p => { const k = +p.dataset.k; p.style.translate = `${(x * k).toFixed(1)}px ${(y * k).toFixed(1)}px`; });
    updateHud();
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
  const findMe = () => flyTo(D.you[0], D.you[1], Math.max(z, fitZ * 3));
  $('#locate').addEventListener('click', findMe);
  let drag = null;
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('.bp')) return;
    drag = { sx: e.clientX, sy: e.clientY, x, y, moved: false }; stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true; stage.classList.add('is-drag');
    x = drag.x + dx; y = drag.y + dy; apply();
  });
  const end = () => { if (drag && !drag.moved) close(); drag = null; stage.classList.remove('is-drag'); };
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
  let cur = null, wpPin = null;
  function open(p, fly = true) {
    if (cur) cur.el.classList.remove('is-on');
    if (off.has(p.k)) { off.delete(p.k); refresh(); }
    cur = p; p.el.classList.add('is-on');
    info.dataset.cat = p.s.g;
    $('#iBlip').innerHTML = icon(p.k);
    $('#iCat').textContent = `${GROUP[p.s.g].name} · ${p.s.name}`;
    $('#iName').textContent = p.n;
    const lm = nearestLandmark(p.x, p.y);
    $('#iWhere').textContent = REG[p.r].name + (lm[1] < 60 ? ` · near ${lm[0]}` : '');
    $('#iDist').textContent = fmtKm(km([p.x, p.y], D.you)) + ' away';
    $('#iTxt').textContent = p.s.desc;
    $('#iXY').textContent = gxy(p.x, p.y);
    $('#iNear').innerHTML = pins.filter(o => o !== p && !off.has(o.k))
      .map(o => [o, km([p.x, p.y], [o.x, o.y])]).sort((a, b) => a[1] - b[1]).slice(0, 4)
      .map(([o, d]) => `<li><button type="button" data-i="${o.i}" data-cat="${o.s.g}"><span class="mini">${icon(o.k)}</span>${o.n}<span class="mono">${fmtKm(d)}</span></button></li>`).join('');
    setWpBtn();
    info.hidden = false; atlas.classList.add('has-info');
    requestAnimationFrame(() => info.classList.add('is-open'));
    history.replaceState(null, '', '#p' + p.i);
    if (fly) flyTo(p.x, p.y, Math.max(z, fitZ * 2.4));
  }
  function close() {
    if (!cur) return;
    cur.el.classList.remove('is-on'); cur = null;
    info.classList.remove('is-open'); atlas.classList.remove('has-info');
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

  // ---- метка пути: маршрут от игрока и навигатор сверху (расстояние и время в пути на машине) ----
  const route = $('#route'), lines = [$('#routeLine'), $('#routeGlow')], gps = $('#gps'), ovWp = $('#ovWp');
  function setWpBtn() {
    const on = cur && wpPin === cur, b = $('#wpBtn');
    b.classList.toggle('is-set', on);
    b.querySelector('span').textContent = on ? 'Remove waypoint' : 'Set waypoint';
  }
  function setWp(p) {
    wpPin = p;
    if (!p) { wp.hidden = true; route.classList.remove('is-on'); gps.hidden = true; ovWp.hidden = true; setWpBtn(); return; }
    wp.hidden = false; wp.style.left = p.x + '%'; wp.style.top = p.y + '%';
    wp.style.animation = 'none'; void wp.offsetWidth; wp.style.animation = '';
    lines.forEach(l => { l.setAttribute('x1', D.you[0]); l.setAttribute('y1', D.you[1]); l.setAttribute('x2', p.x); l.setAttribute('y2', p.y); });
    route.classList.add('is-on');
    const d = km([p.x, p.y], D.you);
    $('#gpsName').textContent = p.n;
    $('#gpsKm').textContent = d < 1 ? Math.round(d * 1000 / 10) * 10 : d.toFixed(1);
    $('#gpsUnit').textContent = d < 1 ? 'm' : 'km';
    $('#gpsMin').textContent = Math.max(1, Math.round(d / 60 * 60 * 1.35)); // по прямой ×1,35 — дороги петляют, 60 км/ч
    gps.hidden = false; gps.classList.remove('is-in'); void gps.offsetWidth; gps.classList.add('is-in');
    ovWp.hidden = false; ovWp.style.left = p.x + '%'; ovWp.style.top = p.y + '%';
    setWpBtn();
  }
  const toggleWp = () => { if (cur) setWp(wpPin === cur ? null : cur); };
  $('#wpBtn').addEventListener('click', toggleWp);
  $('#gpsX').addEventListener('click', () => setWp(null));
  $('#gpsGo').addEventListener('click', () => wpPin && open(wpPin));

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
  document.querySelector('.mode').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]'); if (!b) return;
    document.body.dataset.mode = b.dataset.mode;
    document.querySelectorAll('.mode button').forEach(o => o.classList.toggle('is-on', o === b));
  });

  // ---- клавиши ----
  addEventListener('keydown', e => {
    if (e.target.matches('input')) { if (e.key === 'Escape') { qIn.value = ''; q = ''; dim(); refresh(); res.hidden = true; e.target.blur(); } return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); qIn.focus(); }
    else if (e.key === 'Escape') { if (cur) close(); else if (focus) setRegion(null); }
    else if (e.code === 'KeyW') toggleWp();
    else if (e.code === 'KeyL') findMe();
    else if (e.code === 'KeyF') { setRegion(null); fit(true); }
    else if (e.key === '+' || e.key === '=') zoomAt(...center(), 1.4, true);
    else if (e.key === '-') zoomAt(...center(), 1 / 1.4, true);
  });
  addEventListener('resize', () => {
    const keep = Math.abs(z - fitZ) > 1e-6, b = box(true);
    fitZ = Math.min(b.w / WW, b.h / WH) * 1.02;
    keep ? apply() : fit(false);
  });

  // старт: чуть ближе «по размеру», чтобы сразу были видны иконки, а не точки
  refresh(); fit(false); flyTo(START[0], START[1], fitZ * 1.75, false);
  // с главной приходят с адресом: #vice — к региону, #p12 — сразу к точке
  const h = location.hash.slice(1);
  if (REG[h]) cards.querySelector(`[data-r="${h}"]`).click();
  else if (/^p\d+$/.test(h) && pins[+h.slice(1)]) open(pins[+h.slice(1)]);
})();
