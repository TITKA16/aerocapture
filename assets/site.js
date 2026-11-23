/* AeroCapture — naršyklės skriptas.
   ŠIS FAILAS YRA ŠALTINIS. assets/site.js sugeneruojamas komanda: node _saltinis/build.mjs
   CONFIG ir PKG įrašomi iš _saltinis/duomenys.mjs — kontaktus ir kainas keisk TEN. */
const CONFIG = {"email":"info@aerocapture.lt","phone":"+370 647 65943","whatsapp":"37064765943","freeKm":25,"perKm":0.3};
const PKG = [{"id":"sodyba","name":"Sodyba / NT","price":60},{"id":"sklypas","name":"Sklypas","price":50},{"id":"promo","name":"Verslo promo","price":100},{"id":"renginys","name":"Renginys","price":100},{"id":"ukis","name":"Ūkis, 1 vizitas","price":40},{"id":"stogas","name":"Stogas","price":50},{"id":"statybos","name":"Statybų eiga, 1 mėn.","price":59},{"id":"kita","name":"Kitas darbas","price":null}];
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eur = (v) => new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }).format(v);
  const STORE = 'ac-skaiciuokle';

  /* ===== Meniu telefone ===== */
  const menuBtn = $('#menu-btn'), menu = $('#menu');
  if (menuBtn && menu) {
    const set = (open) => {
      menu.hidden = !open;
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Uždaryti meniu' : 'Atidaryti meniu');
      document.body.classList.toggle('menu-open', open);
      if (open) { const f = menu.querySelector('a'); if (f) f.focus(); }
    };
    menuBtn.addEventListener('click', () => set(menu.hidden));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { set(false); menuBtn.focus(); } });
    matchMedia('(min-width: 1024px)').addEventListener('change', (m) => { if (m.matches) set(false); });
  }

  /* ===== Kainų skaičiuoklė ===== */
  const calc = $('#calc');
  if (calc) {
    const pkgSel = $('#calc-pkg'), range = $('#calc-km-range'), num = $('#calc-km');
    const addons = $$('input[type="checkbox"]', calc);
    for (const p of PKG) pkgSel.add(new Option(p.price === null ? `${p.name} — susitarus` : `${p.name} — iki ${eur(p.price)}`, p.id, false, p.id === (calc.dataset.default || 'sodyba')));
    let summary = '';
    const update = () => {
      const p = PKG.find((x) => x.id === pkgSel.value) || PKG[0];
      const km = Math.max(0, Math.min(400, Math.round(Number(num.value) || 0)));
      const extra = Math.max(0, km - CONFIG.freeKm);
      const travel = Math.round(extra * CONFIG.perKm * 100) / 100;
      const picked = addons.filter((a) => a.checked);
      const add = picked.reduce((s, a) => s + Number(a.dataset.add), 0);
      const lines = [[p.name, p.price === null ? 'susitarus' : 'iki ' + eur(p.price)]];
      lines.push(extra > 0 ? [`Kelionė: ${extra} km × ${eur(CONFIG.perKm)}`, eur(travel)] : [`Kelionė iki ${CONFIG.freeKm} km`, 'nemokama']);
      for (const a of picked) lines.push([a.dataset.name, '+' + eur(Number(a.dataset.add))]);
      $('#calc-lines').replaceChildren(...lines.map(([k, v]) => { const d = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v; d.append(dt, dd); return d; }));
      let total, note, label;
      if (p.price === null) { label = 'Kaina'; total = 'Susitarus'; note = 'Parašykite, ko reikia — kainą pasiūlysiu per valandą.'; }
      else { label = 'Ne daugiau kaip'; total = eur(Math.round((p.price + travel + add) * 100) / 100); note = 'Tai didžiausia suma. Tikslią kainą sutarsime prieš filmavimą — dažniausiai ji mažesnė.'; }
      $('#calc-label').textContent = label;
      $('#calc-total').textContent = total;
      $('#calc-note').textContent = note;
      summary = `Skaičiuoklė: ${p.name}, apie ${km} km nuo Veisiejų${picked.length ? ', priedai: ' + picked.map((a) => a.dataset.name).join(', ') : ''}. Ne daugiau kaip: ${total}.`;
    };
    range.addEventListener('input', () => { num.value = range.value; update(); });
    num.addEventListener('input', () => { range.value = String(Math.min(150, Number(num.value) || 0)); update(); });
    pkgSel.addEventListener('change', update);
    addons.forEach((a) => a.addEventListener('change', update));
    calc.addEventListener('submit', (e) => e.preventDefault());
    $('#calc-send').addEventListener('click', (e) => {
      const form = $('#req');
      if (form) {
        $('#r-pkg').value = pkgSel.value;
        const msg = $('#r-msg');
        msg.value = summary + (msg.value && !msg.value.startsWith('Skaičiuoklė:') ? '\n' + msg.value.replace(/^Skaičiuoklė:.*\n?/, '') : '');
      } else {
        try { sessionStorage.setItem(STORE, JSON.stringify({ pkg: pkgSel.value, summary })); } catch (err) { /* privatus režimas */ }
        e.currentTarget.href = '/kontaktai/?paslauga=' + encodeURIComponent(pkgSel.value) + '#uzklausa';
      }
    });
    update();
  }

  /* ===== Užklausos forma ===== */
  const form = $('#req');
  if (form) {
    const sel = $('#r-pkg');
    for (const p of PKG) sel.add(new Option(p.name, p.id));
    sel.add(new Option('Dar nežinau', 'nezinau', true, true));
    const qp = new URLSearchParams(location.search).get('paslauga');
    if (qp && PKG.some((p) => p.id === qp)) sel.value = qp;
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) || 'null');
      if (saved && saved.summary) { if (PKG.some((p) => p.id === saved.pkg)) sel.value = saved.pkg; $('#r-msg').value = saved.summary; sessionStorage.removeItem(STORE); }
    } catch (err) { /* nieko */ }
    const d = $('#r-date'); if (d) d.min = new Date().toISOString().slice(0, 10);

    const fields = [
      { box: '#f-name', input: '#r-name', ok: (v) => v.length > 1, msg: 'Įrašykite vardą.' },
      { box: '#f-contact', input: '#r-contact', ok: (v) => /@.+\./.test(v) || v.replace(/\D/g, '').length >= 8, msg: 'Įrašykite telefoną arba el. pašto adresą.' },
      { box: '#f-place', input: '#r-place', ok: (v) => v.length > 1, msg: 'Įrašykite vietą.' }
    ];
    const check = (f) => {
      const v = $(f.input).value.trim(), bad = !f.ok(v), box = $(f.box), err = box.querySelector('.err');
      box.classList.toggle('bad', bad); err.hidden = !bad; err.textContent = bad ? f.msg : '';
      if (bad) $(f.input).setAttribute('aria-invalid', 'true'); else $(f.input).removeAttribute('aria-invalid');
      return !bad;
    };
    fields.forEach((f) => {
      $(f.input).addEventListener('blur', () => { if ($(f.input).value.trim() || $(f.box).classList.contains('bad')) check(f); });
      $(f.input).addEventListener('input', () => { if ($(f.box).classList.contains('bad')) check(f); });
    });
    const sum = $('#errsum');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const bad = fields.filter((f) => !check(f));
      if (bad.length) {
        $('#errsum-list').replaceChildren(...bad.map((f) => { const li = document.createElement('li'), a = document.createElement('a'); a.href = f.input; a.textContent = f.msg; a.addEventListener('click', (ev) => { ev.preventDefault(); $(f.input).focus(); }); li.append(a); return li; }));
        sum.hidden = false; sum.focus();
        return;
      }
      sum.hidden = true;
      const val = (id) => $(id).value.trim();
      const pkg = sel.selectedOptions[0].text;
      const text = [
        'Sveiki, norėčiau užsakyti filmavimą dronu.',
        `Vardas: ${val('#r-name')}`,
        `Kontaktas: ${val('#r-contact')}`,
        `Vieta: ${val('#r-place')}`,
        `Paslauga: ${pkg}`,
        val('#r-date') ? `Pageidaujama data: ${val('#r-date')}` : '',
        val('#r-msg') ? `Žinutė: ${val('#r-msg')}` : ''
      ].filter(Boolean).join('\n');
      $('#ready-text').textContent = text;
      $('#ready-mail').href = `mailto:${CONFIG.email}?subject=${encodeURIComponent('Užklausa: ' + pkg)}&body=${encodeURIComponent(text)}`;
      $('#ready-wa').href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
      const ready = $('#ready'); ready.hidden = false;
      ready.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
      $('#ready-h').focus();
    });
  }

  /* ===== Kopijavimas ===== */
  $$('[data-copy]').forEach((btn) => btn.addEventListener('click', () => {
    const src = btn.dataset.copy === 'ready' ? $('#ready-text').textContent : CONFIG[btn.dataset.copy];
    const label = btn.dataset.label || (btn.dataset.label = btn.textContent);
    const show = (t) => { btn.textContent = t; clearTimeout(btn._t); btn._t = setTimeout(() => (btn.textContent = label), 2200); };
    if (navigator.clipboard) navigator.clipboard.writeText(src).then(() => show('Nukopijuota'), () => show('Nepavyko'));
    else show('Nepavyko');
  }));

  /* ===== Darbų filtrai ===== */
  const filters = $('.filters');
  if (filters) filters.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', filters).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const cat = b.dataset.cat;
    $$('.gallery .tile').forEach((t) => { t.hidden = cat !== 'visi' && !t.dataset.cat.split(' ').includes(cat); });
  });

  /* ===== Fiksuotas WhatsApp mygtukas telefone ===== */
  const fab = $('.fab'), heroEl = $('.hero, .page-hero');
  if (fab && heroEl && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => fab.classList.toggle('on', !e.isIntersecting)).observe(heroEl);
  }

  /* ===== Atsiradimas slenkant ===== */
  const rv = $$('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rv.forEach((el) => { const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.classList.contains('rv')) : []; const i = sibs.indexOf(el); if (i > 0) el.style.transitionDelay = Math.min(i, 6) * 50 + 'ms'; io.observe(el); });
  } else rv.forEach((el) => el.classList.add('on'));

  /* ===== Iliustracijos iš oro (kol nėra tikrų nuotraukų) ===== */
  const VW = 1200, VH = 900, TAU = Math.PI * 2;
  const COL = { green: ['#7C9E4E', '#8BAA59', '#6D8C44', '#97B465', '#5F7D3B', '#86A453'], straw: ['#C8B36D', '#D3C07F', '#BCA45B', '#CDB874'], soil: ['#8E6C49', '#7B5E40', '#9A7B57'], tree: ['#2E4F31', '#38603D', '#294630', '#33573A', '#3F6A43'] };
  const mulberry = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  function tree(ctx, r, x, y, rad) { ctx.fillStyle = 'rgba(14,22,14,0.38)'; ctx.beginPath(); ctx.arc(x + rad * 0.45, y + rad * 0.45, rad, 0, TAU); ctx.fill(); ctx.fillStyle = pick(r, COL.tree); ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(170,205,125,0.22)'; ctx.beginPath(); ctx.arc(x - rad * 0.3, y - rad * 0.32, rad * 0.5, 0, TAU); ctx.fill(); }
  function forest(ctx, r, test, count, rmin, rmax) { const pts = []; for (let i = 0; i < count * 8 && pts.length < count; i++) { const x = r() * VW, y = r() * VH; if (test(x, y)) pts.push([x, y, rmin + r() * (rmax - rmin)]); } pts.sort((a, b) => a[1] - b[1]); ctx.fillStyle = '#24402A'; for (const p of pts) { ctx.beginPath(); ctx.arc(p[0], p[1], p[2] * 1.5, 0, TAU); ctx.fill(); } for (const p of pts) tree(ctx, r, p[0], p[1], p[2]); }
  function fields(ctx, r, angle) { ctx.save(); ctx.translate(VW / 2, VH / 2); ctx.rotate(angle); const S = 1750; let y = -S / 2; while (y < S / 2) { const h = 80 + r() * 130; let x = -S / 2; while (x < S / 2) { const w = 180 + r() * 380, k = r(); ctx.fillStyle = pick(r, k < 0.5 ? COL.green : k < 0.78 ? COL.straw : COL.soil); ctx.fillRect(x, y, w + 1, h + 1); ctx.strokeStyle = 'rgba(20,30,10,0.08)'; ctx.lineWidth = 2; const gap = 8 + r() * 6; ctx.beginPath(); if (r() < 0.5) { for (let xx = x + gap / 2; xx < x + w; xx += gap) { ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); } } else { for (let yy = y + gap / 2; yy < y + h; yy += gap) { ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); } } ctx.stroke(); ctx.strokeStyle = 'rgba(40,46,24,0.28)'; ctx.strokeRect(x, y, w, h); x += w; } if (r() < 0.4) { for (let tx = -S / 2; tx < S / 2; tx += 18 + r() * 26) tree(ctx, r, tx, y + (r() - 0.5) * 6, 7 + r() * 5); } y += h; } ctx.restore(); }
  function makeBlob(r, cx, cy, rad, sx) { sx = sx || 1.25; const p1 = r() * TAU, p2 = r() * TAU, p3 = r() * TAU; const R = (t) => rad * (1 + 0.16 * Math.sin(2 * t + p1) + 0.09 * Math.sin(3 * t + p2) + 0.05 * Math.sin(5 * t + p3)); const pts = []; for (let i = 0; i < 72; i++) { const t = (i / 72) * TAU, rr = R(t); pts.push([cx + Math.cos(t) * rr * sx, cy + Math.sin(t) * rr]); } return { pts, inside: (x, y, m) => { const dx = (x - cx) / sx, dy = y - cy; return Math.hypot(dx, dy) < R(Math.atan2(dy, dx)) * (m || 1); } }; }
  function closed(ctx, pts) { const n = pts.length; ctx.beginPath(); ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2); for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } ctx.closePath(); }
  function open(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } const L = pts[pts.length - 1]; ctx.lineTo(L[0], L[1]); }
  function lake(ctx, r, b) { ctx.lineJoin = 'round'; closed(ctx, b.pts); ctx.lineWidth = 30; ctx.strokeStyle = '#4C6B39'; ctx.stroke(); ctx.fillStyle = '#1D4A66'; ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(80,150,170,0.55)'; ctx.stroke(); ctx.save(); closed(ctx, b.pts); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 3; for (let i = 0; i < 26; i++) { const x = r() * VW, y = r() * VH, l = 30 + r() * 70; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y - l * 0.08); ctx.stroke(); } ctx.restore(); }
  function road(ctx, pts, w) { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; open(ctx, pts); ctx.strokeStyle = '#B7A882'; ctx.lineWidth = w + 5; ctx.stroke(); open(ctx, pts); ctx.strokeStyle = '#D6C9A6'; ctx.lineWidth = w; ctx.stroke(); }
  function poly(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }
  function lawn(ctx, pts, angle, color) { ctx.save(); poly(ctx, pts); ctx.fillStyle = color || '#9BBC69'; ctx.fill(); ctx.clip(); ctx.translate(VW / 2, VH / 2); ctx.rotate(angle); ctx.fillStyle = 'rgba(255,255,255,0.06)'; for (let x = -900; x < 900; x += 28) ctx.fillRect(x, -900, 14, 1800); ctx.restore(); }
  function house(ctx, x, y, w, h, a, roof) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = 'rgba(12,16,12,0.42)'; ctx.fillRect(-w / 2 + 8, -h / 2 + 10, w, h); ctx.fillStyle = roof; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-w / 2, -h / 2, w, h / 2); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-w / 2 + 4, 0); ctx.lineTo(w / 2 - 4, 0); ctx.stroke(); ctx.restore(); }
  function boundary(ctx, pts) { ctx.save(); poly(ctx, pts); ctx.fillStyle = 'rgba(59,163,245,0.12)'; ctx.fill(); ctx.setLineDash([18, 12]); ctx.lineWidth = 5; ctx.strokeStyle = '#3BA3F5'; ctx.stroke(); ctx.setLineDash([]); for (const [x, y] of pts) { ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#3BA3F5'; ctx.stroke(); } ctx.restore(); }
  function sheep(ctx, r, test, n) { let placed = 0; for (let i = 0; i < n * 10 && placed < n; i++) { const x = r() * VW, y = r() * VH; if (!test(x, y)) continue; placed++; ctx.save(); ctx.translate(x, y); ctx.rotate(r() * TAU); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(4, 4, 9, 6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#F2EFE6'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#3A3A36'; ctx.beginPath(); ctx.arc(9, 0, 3, 0, TAU); ctx.fill(); ctx.restore(); } }
  const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const SCENES = {
    hero(ctx, r) { fields(ctx, r, -0.18); const L = makeBlob(r, 915, 300, 170); forest(ctx, r, (x, y) => L.inside(x, y, 1.8) && !L.inside(x, y, 1.14) && x > 640 && Math.hypot(x - 668, y - 432) > 60, 1100, 9, 15); lake(ctx, r, L); road(ctx, [[-20, 770], [200, 705], [380, 610], [470, 540], [540, 505]], 13); road(ctx, [[470, 540], [640, 650], [900, 705], [1220, 690]], 10); const yard = [[345, 360], [612, 328], [652, 592], [378, 640]]; lawn(ctx, yard, -0.2); for (let i = 0; i < 9; i++) tree(ctx, r, 400 + r() * 120, 560 + r() * 55, 9 + r() * 4); house(ctx, 478, 438, 152, 84, -0.18, '#9A4E3C'); house(ctx, 580, 525, 92, 64, 0.12, '#5D6872'); house(ctx, 668, 432, 48, 40, 0.3, '#7A5442'); boundary(ctx, yard); },
    lake(ctx, r) { fields(ctx, r, 0.12); const L = makeBlob(r, 800, 520, 225); forest(ctx, r, (x, y) => L.inside(x, y, 1.65) && !L.inside(x, y, 1.12) && y < 640, 900, 9, 15); lake(ctx, r, L); road(ctx, [[-20, 200], [180, 240], [300, 300], [360, 360]], 12); const yard = [[230, 290], [470, 270], [490, 470], [250, 500]]; lawn(ctx, yard, 0.1); house(ctx, 350, 360, 140, 80, 0.08, '#8B3F33'); house(ctx, 430, 440, 80, 56, -0.1, '#5D6872'); for (let i = 0; i < 8; i++) tree(ctx, r, 260 + r() * 90, 400 + r() * 80, 9 + r() * 4); },
    plot(ctx, r) { fields(ctx, r, 0.08); road(ctx, [[-20, 760], [400, 740], [800, 770], [1220, 750]], 14); const plot = [[300, 250], [880, 220], [930, 640], [330, 680]]; ctx.save(); poly(ctx, plot); ctx.fillStyle = '#A2BF6C'; ctx.fill(); ctx.restore(); forest(ctx, r, (x, y) => inPoly(plot, x, y) && (x < 380 || y < 300), 120, 10, 16); for (let i = 0; i < 14; i++) tree(ctx, r, 380 + r() * 500, 330 + r() * 300, 4 + r() * 3); boundary(ctx, plot); },
    fields(ctx, r) { fields(ctx, r, -0.36); forest(ctx, r, (x, y) => y < 160 + 0.25 * x - 40 && y > 0.25 * x - 120, 500, 9, 14); road(ctx, [[-20, 620], [300, 560], [700, 520], [1220, 380]], 11); house(ctx, 1010, 600, 120, 70, 0.3, '#5D6872'); house(ctx, 1080, 690, 80, 54, 0.25, '#9A4E3C'); },
    pines(ctx, r) { ctx.fillStyle = '#24402A'; ctx.fillRect(0, 0, VW, VH); const L = makeBlob(r, 870, 610, 210); const clear = (x, y) => Math.hypot((x - 370) / 1.25, y - 330) < 175; forest(ctx, r, (x, y) => !L.inside(x, y, 1.08) && !clear(x, y), 2600, 10, 17); ctx.save(); ctx.beginPath(); ctx.ellipse(370, 330, 175 * 1.25, 175, 0, 0, TAU); ctx.fillStyle = '#9BBC69'; ctx.fill(); ctx.restore(); lake(ctx, r, L); road(ctx, [[-20, 420], [120, 380], [250, 350], [330, 330]], 10); house(ctx, 380, 300, 130, 74, -0.1, '#7A5442'); house(ctx, 260, 420, 54, 46, 0.2, '#9A4E3C'); house(ctx, 470, 420, 54, 46, -0.25, '#9A4E3C'); ctx.fillStyle = '#B79A6B'; ctx.save(); ctx.translate(690, 540); ctx.rotate(0.55); ctx.fillRect(0, -6, 110, 12); ctx.restore(); },
    farm(ctx, r) { fields(ctx, r, 0.15); const pasture = [[120, 300], [720, 250], [760, 700], [160, 760]]; ctx.save(); poly(ctx, pasture); ctx.fillStyle = '#8FB060'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(245,240,225,0.7)'; ctx.stroke(); ctx.restore(); sheep(ctx, r, (x, y) => inPoly(pasture, x, y) && x > 180 && y > 330, 46); road(ctx, [[1220, 200], [1000, 300], [880, 360], [820, 380]], 12); house(ctx, 930, 470, 180, 96, 0.1, '#5D6872'); house(ctx, 960, 330, 120, 70, 0.1, '#9A4E3C'); for (let i = 0; i < 8; i++) tree(ctx, r, 820 + r() * 260, 520 + r() * 120, 10 + r() * 5); },
    build(ctx, r) { fields(ctx, r, -0.05); const site = [[250, 220], [930, 200], [960, 700], [270, 730]]; ctx.save(); poly(ctx, site); ctx.fillStyle = '#A88B67'; ctx.fill(); ctx.setLineDash([10, 8]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.stroke(); ctx.restore(); road(ctx, [[-20, 820], [200, 780], [420, 700], [520, 640]], 14); ctx.save(); ctx.translate(600, 440); ctx.rotate(-0.03); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-182, -110, 380, 240); ctx.fillStyle = '#B9BDC1'; ctx.fillRect(-190, -120, 380, 240); ctx.strokeStyle = 'rgba(70,60,50,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = -190; x <= 190; x += 24) { ctx.moveTo(x, -120); ctx.lineTo(x, 120); } for (let y = -120; y <= 120; y += 24) { ctx.moveTo(-190, y); ctx.lineTo(190, y); } ctx.stroke(); ctx.restore(); ctx.fillStyle = '#D9C38C'; ctx.beginPath(); ctx.ellipse(350, 300, 70, 46, 0.3, 0, TAU); ctx.fill(); for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(844, 264 + i * 34, 52, 26); ctx.fillStyle = '#9C7A4E'; ctx.fillRect(840, 260 + i * 34, 52, 26); } ctx.save(); ctx.translate(420, 600); ctx.rotate(-0.4); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(6, 8, 70, 44); ctx.fillStyle = '#F2B636'; ctx.fillRect(0, 0, 70, 44); ctx.fillRect(60, 14, 70, 14); ctx.restore(); },
    roof(ctx, r) { fields(ctx, r, 0.2); road(ctx, [[-20, 700], [400, 640], [800, 660], [1220, 620]], 13); lawn(ctx, [[260, 180], [940, 160], [960, 600], [280, 620]], 0.05); for (let i = 0; i < 12; i++) tree(ctx, r, 290 + r() * 640, 540 + r() * 60, 10 + r() * 5); ctx.save(); ctx.translate(610, 360); ctx.rotate(0.05); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-214, -116, 440, 250); ctx.fillStyle = '#8B3F33'; ctx.fillRect(-220, -125, 440, 250); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-220, -125, 440, 125); ctx.fillStyle = '#1E2C44'; for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { ctx.fillRect(-180 + i * 72, -105 + j * 50, 64, 44); } ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) ctx.strokeRect(-180 + i * 72, -105 + j * 50, 64, 44); ctx.restore(); },
    event(ctx, r) { fields(ctx, r, -0.1); const L = makeBlob(r, 260, 640, 160); lake(ctx, r, L); lawn(ctx, [[420, 180], [1000, 160], [1020, 620], [440, 650]], 0.1, '#9BBC69'); ctx.save(); ctx.translate(720, 380); ctx.rotate(0.05); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-142, -62, 290, 130); ctx.fillStyle = '#F4F1EA'; ctx.fillRect(-150, -70, 290, 130); ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2; for (let x = -150; x <= 140; x += 29) { ctx.beginPath(); ctx.moveTo(x, -70); ctx.lineTo(x, 60); ctx.stroke(); } ctx.restore(); for (let i = 0; i < 10; i++) tree(ctx, r, 450 + r() * 540, 190 + r() * 40, 10 + r() * 5); }
  };
  function paint(shot) {
    const cv = shot.querySelector('canvas'); if (!cv) return;
    const w = shot.clientWidth, h = shot.clientHeight; if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(cv.width / VW, 0, 0, cv.height / VH, 0, 0);
    ctx.fillStyle = '#7C9E4E'; ctx.fillRect(0, 0, VW, VH);
    (SCENES[shot.dataset.scene] || SCENES.fields)(ctx, mulberry(Number(shot.dataset.seed) || 1));
    shot.dataset.paintedW = String(w);
  }
  const shots = $$('.shot[data-scene]');
  if ('IntersectionObserver' in window) {
    const seen = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { paint(e.target); seen.unobserve(e.target); if (ro) ro.observe(e.target); } }), { rootMargin: '200px' });
    var ro = 'ResizeObserver' in window ? new ResizeObserver((es) => es.forEach((e) => { const s = e.target; if (Math.abs((Number(s.dataset.paintedW) || 0) - s.clientWidth) > 2) requestAnimationFrame(() => paint(s)); })) : null;
    shots.forEach((s) => seen.observe(s));
  } else shots.forEach(paint);

  $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
})();
