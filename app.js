/* Тақта: бір экран — бір әрекет. Әдіс → Қалай орындаймыз → Тапсырма. Бағалау, сөз, рейтинг — бөлек панельдерде. */
(function () {
  const LD = window.LD, GT = window.GT;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = GT.esc, ST = LD.stages;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const SET = Object.assign({ autoTimer: true, guideAll: false, voice: true, videoUrl: '' }, LS.get('sa_set', {}));
  const S = { i: Math.min(ST.length - 1, Math.max(0, LS.get('sa_stage', 0))), code: '', db: null, game: {}, roster: LS.get('sa_roster', []), manual: LS.get('sa_manual', {}),
    bsc: LS.get('sa_bsc', {}), deb: LS.get('sa_deb', { mode: 'prep', r: 0, crit: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], win: '' }), lab: { sel: 0, ans: LS.get('sa_lab', {}) }, rd: { i: 0, pick: null, key: false, done: {} },
    mood: {}, hw: { q: 0, pick: null, key: false }, grouped: false, endTab: 'rate', quizShow: true };
  if (!S.roster.length && LD.defaultRoster) { const list = GT.parseRoster(LD.defaultRoster); const out = []; LD.groups.forEach((_, gi) => GT.assignRoles(list.filter((p) => p.fixG === gi)).forEach((p) => out.push(Object.assign(p, { g: gi })))); S.roster = out; LS.set('sa_roster', out); }
  const grp = (i) => LD.groups[i] || LD.groups[0];
  const role = (k) => LD.roles.find((r) => r.key === k);
  const task = (k) => LD.tasks.find((t) => t.k === k);
  const kMax = (k) => task(k).d.reduce((a, d) => a + d.p, 0);
  const cur = () => ST[S.i];
  const link = (f, extra) => GT.base() + f + '?c=' + S.code + (S.db && S.db.demo ? '&demo=1' : '') + (extra || '');
  const MEDIA = 'live/media/';

  function fit() { const k = Math.min(innerWidth / 1920, innerHeight / 1080); $('#stage').style.transform = `scale(${k})`; }
  addEventListener('resize', fit); fit();

  /* ---------- ұпайлар ---------- */
  /* тақтада қойылған ұпай: S.bsc[key] = {name, g, sc:{K1_1:1, K2_0:1, K3_0:1, K3_1:0}} */
  function bScore(p, dk, v) { const key = GT.nrm(p.name); const e = S.bsc[key] || { name: p.name, g: p.g, sc: {} }; e.sc[dk] = v; S.bsc[key] = e; LS.set('sa_bsc', S.bsc); live(); }
  function boardMap() {
    const m = JSON.parse(JSON.stringify(S.bsc));
    S.roster.forEach((p) => { const pv = S.deb.crit[p.g]; if (!pv) return; const key = GT.nrm(p.name); const e = m[key] || { name: p.name, g: p.g, sc: {} }; pv.forEach((v, i) => { if (v) e.sc['K4_' + i] = 1; }); m[key] = e; });
    return m;
  }
  function rating() {
    const rows = GT.rating(S.game, S.roster, boardMap());
    rows.forEach((r) => {
      const m = S.manual[r.key];
      if (m) Object.keys(m).forEach((k) => { if (m[k] !== '' && m[k] != null) r.byK[k] = Math.min(kMax(k), Math.max(0, +m[k])); });
      r.total = Object.values(r.byK).reduce((a, b) => a + b, 0); r.pct = GT.pct(r.total, LD.MAX); r.b = GT.ball10(r.total, LD.MAX); r.band = GT.band(r.b);
    });
    return rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }
  function groupTotals(rows) { const t = LD.groups.map(() => 0); rows.forEach((r) => { if (r.g != null) t[r.g] += r.total; }); return t; }

  /* ---------- таймер ---------- */
  const T = { total: 0, left: 0, run: false, end: 0, sig60: false, last: -1 };
  const fmt = (s) => { s = Math.max(0, Math.ceil(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  function tSet(sec, start) { T.total = sec; T.left = sec; T.run = false; T.sig60 = sec <= 60; T.last = -1; $('#count').classList.remove('on'); if (start && sec > 0) tStart(); tDraw(); }
  function tStart() { if (T.left <= 0) return; T.run = true; T.end = Date.now() + T.left * 1000; tDraw(); }
  function tToggle() { if (T.run) { T.run = false; tDraw(); } else tStart(); GT.tone(1, 0.01); }
  function tDraw() { $('#tval').textContent = fmt(T.left); $('#tplay').textContent = T.run ? '⏸' : '▶'; $('#timer').classList.toggle('low', T.left <= 60 && T.total > 0); $('#timer').classList.toggle('run', T.run); }
  function banner(t, ms) { const b = $('#banner'); b.textContent = t; b.classList.add('on'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('on'), ms || 3800); }
  $('#tplay').onclick = tToggle; $('#treset').onclick = () => tSet(T.total);
  $('#tplus').onclick = () => { T.left += 60; T.total = Math.max(T.total, T.left); if (T.run) T.end += 60000; if (T.left > 60) T.sig60 = false; tDraw(); };
  const MT = { run: false, end: 0, last: -1, done: null, sec: 60 };
  function miniStart(sec, done) { MT.run = true; MT.sec = sec; MT.end = Date.now() + sec * 1000; MT.last = -1; MT.done = done; }
  setInterval(() => {
    if (T.run) {
      T.left = (T.end - Date.now()) / 1000;
      if (!T.sig60 && T.left <= 60) { T.sig60 = true; GT.chime(); banner('⏰ 1 минут қалды!'); }
      const s = Math.ceil(T.left);
      if (s <= 10 && s > 0 && s !== T.last && !MT.run) { T.last = s; GT.tick(); $('#count').classList.add('on'); const n = $('#cnum'); n.textContent = s; n.style.animation = 'none'; void n.offsetWidth; n.style.animation = ''; }
      if (T.left <= 0) { T.left = 0; T.run = false; $('#count').classList.remove('on'); GT.melody(); banner('🎵 Уақыт бітті!', 4000); }
      tDraw();
    }
    if (MT.run) {
      const left = Math.max(0, (MT.end - Date.now()) / 1000), s = Math.ceil(left), el = $('#mini');
      if (el) { el.textContent = fmt(left); el.style.color = s <= 10 ? '#D2452F' : ''; const ring = $('#ring'); if (ring) ring.style.strokeDashoffset = 314 * (1 - left / MT.sec); }
      if (s <= 10 && s > 0 && s !== MT.last) { MT.last = s; GT.tick(); }
      if (left <= 0) { MT.run = false; GT.bell(); if (MT.done) MT.done(); }
    }
  }, 200);

  /* ---------- гид ---------- */
  let kk = null; const lv = () => { try { kk = (speechSynthesis.getVoices() || []).find((v) => /^kk/i.test(v.lang)) || null; } catch (e) {} };
  try { lv(); speechSynthesis.onvoiceschanged = lv; } catch (e) {}
  function guide(text) {
    const b = $('#bub'); $('#gtext').textContent = text; b.classList.add('on'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('on'), 6500);
    if (kk && SET.voice) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.voice = kk; u.lang = kk.lang; speechSynthesis.speak(u); } catch (e) {} }
  }
  $('#gmed').onclick = () => guide(cur().guide);

  function killGlobe() {}

  /* ---------- дала суреті (өз SVG) ---------- */
  function steppe(mode) {
    const P = { day: ['#F9D9A0', '#F3B867', '#E7A04E', '#C98536', '#9E6427'], dusk: ['#F6C78A', '#E79A5A', '#C9744A', '#8E4E35', '#5C3226'], night: ['#24345A', '#1B2747', '#2B3557', '#1F2742', '#151B30'] }[mode || 'day'];
    const sky = mode === 'night' ? ['#0F1B38', '#2B3C6B'] : mode === 'dusk' ? ['#F2A65A', '#FBE3B5'] : ['#9FC9DF', '#F8E6C2'];
    const sun = mode === 'night' ? '<circle cx="1480" cy="170" r="54" fill="#F8EBC4"/><circle cx="1500" cy="160" r="50" fill="#0F1B38" opacity=".18"/>' + Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 233) % 1900}" cy="${(i * 97) % 420}" r="${1 + (i % 3) * 0.7}" fill="#fff" opacity="${0.4 + (i % 5) * 0.12}"/>`).join('') : `<circle cx="1450" cy="${mode === 'dusk' ? 520 : 230}" r="${mode === 'dusk' ? 120 : 90}" fill="${mode === 'dusk' ? '#FFD38A' : '#FFF3C8'}" opacity=".95"/>`;
    const camel = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#3B2414"><path d="M0 0 q8-26 26-22 q8-22 26-6 q10-16 24 0 q10-4 14 6 l14-14 q8-6 10 4 l-8 10 q-6 8-14 10 l-4 34 h-6 l-2-30 q-20 6-40 4 l-4 26 h-6 l-2-26 q-10-2-14-8 l-6 30 h-6 l2-32 q-6-2-6 16z"/></g>`;
    return `<svg class="steppe" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%">
      <defs><linearGradient id="sk${mode}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
      <rect width="1920" height="1080" fill="url(#sk${mode})"/>${sun}
      <path d="M0 640 Q300 560 620 610 T1240 590 T1920 620 V1080 H0Z" fill="${P[0]}" opacity=".75"/>
      <path d="M0 720 Q380 640 760 700 T1500 680 T1920 700 V1080 H0Z" fill="${P[1]}"/>
      <path d="M0 820 Q420 760 900 810 T1920 790 V1080 H0Z" fill="${P[2]}"/>
      ${camel(1180, 705, 1.1)}${camel(1290, 712, 1)}${camel(1390, 718, 0.95)}
      <g fill="${P[4]}" opacity=".85"><path d="M1560 720 q30-40 60 0z"/><rect x="1566" y="716" width="48" height="22"/></g>
      <path d="M0 920 Q520 860 1060 910 T1920 900 V1080 H0Z" fill="${P[3]}"/>
      <path d="M0 1010 Q600 960 1200 1000 T1920 990 V1080 H0Z" fill="${P[4]}"/></svg>`;
  }

  /* ---------- экрандар ---------- */
  const R = {};
  const how = (s) => `<div class="how"><div class="phase">${esc(s.phase || '')}</div><h3>ҚАЛАЙ ОРЫНДАЙМЫЗ?</h3><ol>${s.how.map((h, i) => `<li><b>${i + 1}</b><span>${esc(h)}</span></li>`).join('')}</ol>
    ${s.id === 'groups' ? `<div style="display:flex;gap:12px;align-items:center;background:rgba(255,255,255,.1);border-radius:18px;padding:10px"><div class="qrbox" style="width:120px;height:120px;padding:6px;flex:none">${GT.qr(link('hatshy.html'), 120)}</div><div style="font-size:18px;font-weight:700"><b style="color:var(--amber2)">📒 ХАТШЫЛАРҒА</b><br>Әр топтан бір хатшы осы QR-ды сканерлейді</div></div>` : ''}
    <div class="say"><h4>🗣 СӨЙЛЕУ ҮЛГІСІ</h4>${(LD.say[s.id] || []).map((x) => `<i>${esc(x)}</i>`).join('')}</div></div>`;

  R.hello = () => `<div class="card dark oyu" style="height:100%;padding:0;overflow:hidden;display:grid;grid-template-columns:1.25fr .75fr">
    <div style="position:relative;overflow:hidden;border-radius:26px 0 0 26px">${steppe('dusk')}<div class="shade"></div>
      <div style="position:absolute;left:44px;right:40px;top:40px;bottom:36px;display:flex;flex-direction:column">
        <div style="font:800 18px var(--display);letter-spacing:3px;color:var(--amber2)">ҚАЗАҚ ӘДЕБИЕТІ · 8-СЫНЫП</div>
        <h1 style="font-size:64px;margin-top:14px;color:#fff">Сәлеметсіздер ме, құрметті қонақтар мен оқушылар!</h1>
        <div style="font:800 34px var(--display);margin-top:18px;color:#FFD58A">${esc(LD.lesson.topic)}</div>
        <div style="margin-top:16px;padding:13px 18px;background:rgba(40,20,8,.6);border-left:4px solid #F7B24A;border-radius:0 14px 14px 0">
          <div style="font:800 16px var(--display);letter-spacing:1.5px;color:#F7B24A;margin-bottom:7px">ОҚУ МАҚСАТТАРЫ</div>
          <div style="font:700 19px/1.35 var(--body);color:#fff">${esc(LD.lesson.objective)}</div></div>
        <div style="font-size:21px;margin-top:12px;opacity:.9">Мұғалім: ${esc(LD.lesson.teacher)}${LD.lesson.school ? ' · ' + esc(LD.lesson.school) : ''}</div>
        <div style="margin-top:auto;font:italic 800 30px var(--body);border-left:5px solid var(--amber2);padding-left:16px">${esc(LD.lesson.quote)}</div></div></div>
    <div style="padding:30px 30px;background:#FFFBF2;color:var(--ink);display:flex;flex-direction:column;gap:12px">
      <div style="font:800 18px var(--display);letter-spacing:2px;color:var(--amber)">🎯 БҮГІН САБАҚТА</div>
      ${LD.goals.map((g, i) => `<div style="display:flex;gap:12px;align-items:center;font-size:22px;font-weight:700;line-height:1.25"><b style="flex:none;width:44px;height:44px;border-radius:14px;background:${grp(i).c};color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px">${['📖', '🔍', '⚖️'][i]}</b>${esc(g)}</div>`).join('')}
      <div style="font:800 18px var(--display);letter-spacing:2px;color:var(--amber);margin-top:8px">КӨҢІЛ-КҮЙІМ</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${LD.moods.map(({ icon: e, t, c }, i) => `<button class="mood" data-i="${i}" style="border:2px solid ${c}55;background:#fff;border-radius:20px;padding:8px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:10px"><span style="font-size:44px">${e}</span><b style="font-size:18px;line-height:1.15;color:${c};flex:1;text-align:left">${esc(t)}</b><b style="font:900 28px var(--display);color:${c}" data-c="${i}">${S.mood[i] || 0}</b></button>`).join('')}</div>
      <div style="margin-top:auto;background:#F5E6C8;border-radius:18px;padding:12px 16px;font-size:18px;font-weight:700"><b style="color:var(--amber)">ҚАРАША — ӘДІЛДІК ЖӘНЕ ЖАУАПКЕРШІЛІК АЙЫ</b><br>«Әділдік пен жауапкершілік – біртұтас ұғым»</div></div></div>`;

  /* «Ыстық орындық» */
  const pickBox = (p, id) => `<div class="card" style="padding:16px 20px"><div style="font:800 15px var(--display);letter-spacing:2px;color:var(--mut)">🔥 ОРТАҒА ШЫҒАДЫ</div><div id="${id || 'pick'}" style="font:900 42px/1.1 var(--display);min-height:48px;color:${p && p.g != null ? grp(p.g).ink : 'var(--ink)'}">${p ? esc(p.name) : '— ? —'}</div>${p && p.g != null ? `<div style="font-weight:800;color:${grp(p.g).c}">${grp(p.g).icon} ${esc(grp(p.g).name)}</div>` : ''}
    <button class="btn" id="spin" style="width:100%;margin-top:10px">🎲 Оқушыны таңдау</button></div>`;
  R.hw = () => { const q = LD.hot[S.hw.q], p = S.hw.pick; return `<div class="card oyu" style="height:100%;padding:0;overflow:hidden;position:relative">${steppe('day')}
    <div style="position:absolute;inset:26px;display:grid;grid-template-columns:440px 1fr;gap:22px">
      <div style="display:flex;flex-direction:column;gap:12px">${pickBox(p)}
        <div class="card" style="padding:16px 20px"><div style="font:800 15px var(--display);letter-spacing:2px;color:var(--mut)">📜 АҚЫН ТУРАЛЫ</div><div style="font:800 26px var(--display);margin-top:4px">${esc(LD.poet.name)} <span class="mut">(${LD.poet.years})</span></div>${LD.poet.facts.slice(0, 3).map((f) => `<div style="font-size:18px;font-weight:700;margin-top:6px;line-height:1.3">• ${esc(f)}</div>`).join('')}</div></div>
      <div class="card parch" style="padding:26px 32px;display:flex;flex-direction:column">
        <div style="display:flex;gap:8px">${LD.hot.map((h, i) => `<button class="btn ${i === S.hw.q ? '' : 'sec'} hq" data-i="${i}" style="flex:1;padding:10px">${i + 1}-сұрақ</button>`).join('')}</div>
        <div style="font:800 16px var(--display);letter-spacing:2px;color:var(--amber);margin-top:22px">«ҮШ ҚИЯН» · СҰРАҚ</div>
        <div style="font:800 46px/1.2 var(--display);margin-top:10px;color:var(--deep)">${esc(q.q)}</div>
        <div id="ans" style="margin-top:20px;font-size:27px;font-weight:800;line-height:1.35;color:#1E7A4A;background:#E5F4EA;border-radius:18px;padding:14px 18px;display:${S.hw.key ? 'block' : 'none'}">✓ ${esc(q.a)}</div>
        <div style="margin-top:auto;display:flex;gap:12px;align-items:center"><button class="btn sec" id="ansB">🔑 Жауапты ашу</button><button class="btn green" id="okB" ${p && !p.anon ? '' : 'disabled'}>✓ Мазмұнын айтты +1</button><span style="flex:1"></span><span class="chip">📒 Дәлел ұпайын — хатшы (K1)</span></div></div></div></div>`; };

  R.groups = () => {
    if (!S.roster.length) return `<div class="card oyu" style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center"><div style="font-size:90px">🐎</div><h2 style="font-size:36px">Оқушылар тізімі әлі енгізілмеген</h2><div class="mut" style="font-size:24px">⚙️ Баптау → «Тізім» бөліміне аты-жөнін деңгейімен (A/B/C) енгізіңіз — бір рет қана</div><button class="btn" id="goSet">⚙️ Тізімді енгізу</button></div>`;
    return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr 300px;gap:16px;height:100%">
      ${LD.groups.map((g, gi) => { const m = S.roster.filter((p) => p.g === gi); return `<div class="card" style="padding:16px 18px;border-top:10px solid ${g.c};background:${g.soft};overflow:hidden"><div style="font:800 18px var(--display);color:${g.ink}">${g.icon} ${g.short} · дебатта: ${esc(g.side)}</div><div style="font:800 30px/1.1 var(--display);color:${g.ink};margin-bottom:8px">${esc(g.name)}</div>
        ${m.map((p, k) => `<div class="mem" style="display:flex;justify-content:space-between;gap:8px;background:#fff;border-radius:14px;padding:8px 12px;margin-top:7px;font-size:21px;font-weight:800;${S.grouped ? '' : 'opacity:0;transform:translateY(-30px) scale(.8)'};transition:.5s cubic-bezier(.2,.8,.2,1);transition-delay:${(k * 3 + gi) * 0.12}s"><span>${esc(p.name)}</span><span title="${p.role ? role(p.role).name : ''}">${p.role ? role(p.role).icon : ''}</span></div>`).join('')}</div>`; }).join('')}
      <div class="card" style="text-align:center;padding:16px;display:flex;flex-direction:column;align-items:center;gap:10px"><b style="font:800 21px var(--display)">📱 Тобыңды тап</b><div class="qrbox" style="width:250px;height:250px">${GT.qr(link('quiz.html'), 250)}</div><div class="mut" style="font-size:17px;font-weight:700">Сканерле → атыңды таңда → тобың мен рөлің → телефонды шетке қой 📵</div>
        <div style="font-size:15px;font-weight:700;text-align:left;line-height:1.5">${LD.roles.map((r) => `${r.icon} ${esc(r.name)}`).join('<br>')}</div>
        <button class="btn" id="doGroup" style="margin-top:auto;width:100%">🎲 ${S.grouped ? 'Қайта көрсету' : 'Топтарды көрсету'}</button></div></div>`;
  };

  R.video = () => {
    const u = (SET.videoUrl || '').trim(); const yt = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
    const player = yt ? `<iframe src="https://www.youtube.com/embed/${yt[1]}?rel=0" style="width:100%;height:100%;border:0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
      : `<video id="tourV" src="${esc(u || 'media/saryarqa-kitapsha.mp4')}" poster="media/saryarqa-kitapsha.jpg" controls playsinline style="width:100%;height:100%;background:#1E120A;object-fit:contain"></video>`;
    return `<div style="display:grid;grid-template-columns:1fr 360px;gap:14px;height:100%"><div style="display:grid;grid-template-rows:1fr auto;gap:12px;min-height:0"><div class="card" style="padding:0;overflow:hidden;background:#1E120A">${player}</div>
      <div class="card" style="padding:12px 18px;display:flex;gap:14px;align-items:center"><button class="btn" id="vplay">▶ Кітапшаны ашу</button><button class="btn sec" id="vfull">⛶ Толық экран</button><span class="mut" style="flex:1;font-size:19px;font-weight:700">Көріп болған соң — 3 сұрақ</span><button class="btn sec" id="vdisc">💬 Талқылау</button></div></div>
      <div class="card parch" style="padding:18px 20px;display:flex;flex-direction:column;gap:8px;overflow:hidden"><div style="font:800 16px var(--display);letter-spacing:2px;color:var(--amber)">📜 ЖЫР ҚАЛАЙ ТУДЫ?</div>${LD.story.map((t, i) => `<div style="display:flex;gap:10px;font-size:17px;font-weight:700;line-height:1.3"><b style="flex:none;width:28px;height:28px;border-radius:50%;background:var(--deep);color:#F7B24A;display:flex;align-items:center;justify-content:center;font:800 14px var(--display)">${i + 1}</b><span>${esc(t)}</span></div>`).join('')}<div class="mut" style="margin-top:auto;font-size:15px;font-weight:700">Х. Досмұхамедұлы жазбасы бойынша (оқулық, 80-бет)</div></div></div>`;
  };

  /* «Жыр тізбегі» */
  R.read = () => {
    const st = LD.stanzas[S.rd.i], p = S.rd.pick, done = p && !p.anon && S.bsc[GT.nrm(p.name)] && S.bsc[GT.nrm(p.name)].sc.K2_0;
    return `<div style="display:grid;grid-template-columns:340px 1fr;gap:16px;height:100%">
      <div style="display:flex;flex-direction:column;gap:12px;min-height:0">${pickBox(p)}
        <div class="card" style="padding:12px 14px;display:grid;grid-template-columns:1fr 1fr;gap:8px">${LD.stanzas.map((x, i) => `<button class="btn ${i === S.rd.i ? '' : 'sec'} rdt" data-i="${i}" style="padding:10px 8px;font-size:17px;opacity:${S.rd.done[i] && i !== S.rd.i ? 0.55 : 1}">${S.rd.done[i] ? '✓ ' : ''}${i + 1}-шумақ</button>`).join('')}</div>
        <button class="btn green" id="rdOk" ${p && !p.anon && !done ? '' : 'disabled'}>${done ? '✓ +1 қойылды' : '✓ Мәнерлеп оқыды +1'}</button></div>
      <div style="display:grid;grid-template-rows:1fr auto;gap:12px;min-height:0">
        <div class="card book" style="padding:34px 50px;display:flex;flex-direction:column;justify-content:center;position:relative;min-height:0">
          <div style="position:absolute;top:16px;left:50px;font:800 15px var(--display);letter-spacing:3px;color:#9E6427">МҰРАТ МӨҢКЕҰЛЫ · «САРЫАРҚА» · ${S.rd.i + 1}-ШУМАҚ</div>
          ${st.lines.map((l, k) => `<div class="vline" style="animation-delay:${k * 0.25}s">${esc(l)}</div>`).join('')}
          <div style="position:absolute;bottom:14px;right:28px;font:800 18px var(--display);color:#9E6427">${st.p}-бет</div></div>
        <div style="display:grid;grid-template-columns:.8fr 1.2fr;gap:12px">
          <div class="card" style="padding:14px 18px;background:#FFF4DE;border:2px solid #E7B66A"><div style="font:800 15px var(--display);letter-spacing:2px;color:#A8651A">📚 СӨЗМАРЖАН</div>${st.words.map(([w, d]) => `<div style="font-size:20px;margin-top:6px;line-height:1.3"><b>${esc(w)}</b> — ${esc(d)}</div>`).join('')}</div>
          <div class="card" style="padding:14px 18px;display:flex;flex-direction:column;gap:8px"><div style="display:flex;gap:10px;align-items:flex-start"><span class="chip" style="background:${st.lvl === 'Білу' ? '#DFF0F3' : '#FBEFD9'}">${st.lvl === 'Білу' ? '① Білу' : '② Түсіну'}</span><div style="font:800 23px/1.25 var(--display)">${esc(st.q)}</div></div>
            <div id="rdA" style="font-size:19px;font-weight:800;line-height:1.3;color:#1E7A4A;display:${S.rd.key ? 'block' : 'none'}">✓ ${esc(st.a)}</div>
            <div style="margin-top:auto;display:flex;gap:10px"><button class="btn sec" id="rdKey">🔑 Жауап</button><button class="btn" id="rdNext" style="flex:1">${S.rd.i < LD.stanzas.length - 1 ? 'Келесі шумақ ▶' : '✓ Аяқтау'}</button></div></div></div></div></div>`;
  };

  /* «Көркемдік құралдар зертханасы» */
  const dev = (k) => LD.devices.find((d) => d.k === k);
  R.lab = () => {
    const n = Object.keys(S.lab.ans).length, ok = LD.lab.filter((x, i) => S.lab.ans[i] === x.a).length, sel = S.lab.sel;
    return `<div style="display:grid;grid-template-rows:1fr auto;gap:12px;height:100%">
      <div style="display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:1fr;gap:10px;min-height:0">${LD.lab.map((x, i) => { const a = S.lab.ans[i], st = a == null ? '' : a === x.a ? 'ok' : 'no'; return `<button class="lcard ${st} ${i === sel ? 'sel' : ''}" data-i="${i}"><b>${i + 1}</b><span class="ln">${esc(x.line)}</span>${a != null ? `<span class="res">${st === 'ok' ? '✓ ' + esc(dev(x.a).n) : '✗ ' + esc(dev(a).n) + ' емес → ' + esc(dev(x.a).n)}<small>${esc(x.why)}</small></span>` : '<span class="res q">?</span>'}</button>`; }).join('')}</div>
      <div class="card" style="padding:12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        ${sel != null ? `<b style="font:800 19px var(--display);margin-right:4px">${sel + 1}-жол:</b>${LD.devices.map((d) => `<button class="dopt" data-k="${d.k}" title="${esc(d.d)}">${esc(d.n)}</button>`).join('')}`
          : `<span style="font-size:20px;font-weight:800;flex:1">👆 Жолды басыңыз → жұптар айтқан құралды таңдаңыз</span>`}
        <span style="flex:1"></span><span class="chip">✓ ${ok} / ${n}</span><button class="btn sec" id="labTh">📘 Теория</button><button class="btn" id="labSt">✒️ Автор стилі</button></div></div>`;
  };

  /* Топтық дебат */
  R.debate = () => {
    const D = LD.debate, d = S.deb;
    const crit = (gi) => `<div style="display:flex;flex-direction:column;gap:6px">${task('K4').d.map((x, i) => `<button class="dcrit" data-g="${gi}" data-i="${i}" title="${esc(x.t)}" style="display:flex;gap:8px;align-items:center;text-align:left;border:2px solid ${d.crit[gi][i] ? '#2E8B57' : 'rgba(0,0,0,.12)'};background:${d.crit[gi][i] ? '#E2F3E8' : '#fff'};border-radius:12px;padding:6px 10px;font:800 15px/1.2 var(--body);cursor:pointer;color:var(--ink)"><span style="font-size:22px">${d.crit[gi][i] ? '✅' : '⬜'}</span>${esc(['Идея мен пафос', 'Дәлел: жол + дерек', 'Сұрақ-жауап'][i])}</button>`).join('')}</div>`;
    const head = `<div class="card dark oyu" style="padding:14px 24px;display:flex;align-items:center;gap:18px;background:linear-gradient(90deg,#3B2414,#6B3A1E)"><span style="font-size:46px">⚖️</span><div style="flex:1"><div style="font:800 15px var(--display);letter-spacing:2px;color:#F7B24A">ДЕБАТ ТАҚЫРЫБЫ</div><div style="font:900 40px var(--display);color:#fff">«${esc(D.motion)}»</div><div style="font-size:16px;opacity:.85">${esc(D.book)}</div></div>
      <div style="display:flex;gap:8px"><button class="btn ${d.mode === 'prep' ? '' : 'sec'}" id="dPrep">🛠 Дайындық</button><button class="btn ${d.mode === 'run' ? '' : 'sec'}" id="dRun">🗣 Дебат</button></div></div>`;
    if (d.mode === 'prep') return `<div style="display:grid;grid-template-rows:auto 1fr auto;grid-template-columns:minmax(0,1fr);gap:12px;height:100%">${head}
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;min-height:0">${D.sides.map((s) => { const g = grp(s.g); return `<div class="card" style="padding:16px 18px;border-top:10px solid ${g.c};background:${g.soft};display:flex;flex-direction:column;gap:8px;overflow:hidden">
        <div style="font:800 18px var(--display);color:${g.ink}">${g.icon} ${esc(g.name)} · ${esc(g.side)}</div><div style="font:900 25px/1.15 var(--display);color:${g.ink}">${esc(s.pos)}</div>
        ${s.hints.map((h) => `<div style="background:#fff;border-radius:12px;padding:8px 12px;font-size:17px;font-weight:700;line-height:1.3">💡 ${esc(h)}</div>`).join('')}</div>`; }).join('')}</div>
      <div class="card" style="padding:12px 18px;display:flex;gap:14px;align-items:center"><div style="flex:1;min-width:0;display:grid;grid-template-columns:auto 1fr 1fr;gap:4px 14px;align-items:center"><span style="font:800 17px var(--display);color:var(--amber);grid-row:span 2">📄 ДЕБАТ<br>КАРТАСЫ</span>${D.card.map((c, i) => `<span style="font-size:17px;font-weight:800">${i + 1}. ${esc(c)}</span>`).join('')}</div><span id="mini" style="font:900 38px var(--display);font-variant-numeric:tabular-nums">04:00</span><button class="btn" id="dPrepGo">▶ 4 минут</button></div></div>`;
    const r = D.rounds[d.r], rg = r.g >= 0 ? grp(r.g) : null;
    return `<div style="display:grid;grid-template-rows:auto 1fr;grid-template-columns:minmax(0,1fr);gap:12px;height:100%">${head}
      <div style="display:grid;grid-template-columns:330px minmax(0,1fr) 420px;gap:14px;min-height:0">
        <div class="card" style="padding:12px;display:flex;flex-direction:column;gap:6px">${D.rounds.map((x, i) => { const xg = x.g >= 0 ? grp(x.g) : null; return `<button class="drd" data-i="${i}" style="text-align:left;border:0;border-radius:12px;padding:9px 12px;font:800 16px/1.2 var(--body);cursor:pointer;background:${i === d.r ? (xg ? xg.c : 'var(--deep)') : i < d.r ? '#EFE6D3' : '#FBF6EA'};color:${i === d.r ? '#fff' : 'var(--ink)'}">${i < d.r ? '✓' : i + 1 + '.'} ${esc(x.t)} <small style="opacity:.8">· ${Math.round(x.s / 60 * 10) / 10} мин</small></button>`; }).join('')}</div>
        <div class="card" style="padding:0;overflow:hidden;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${rg ? rg.soft : '#FBF6EA'}">
          <div style="position:absolute;inset:0;opacity:.12">${steppe('dusk')}</div>
          <div style="position:relative;font:800 18px var(--display);letter-spacing:2px;color:${rg ? rg.ink : 'var(--amber)'}">${d.r + 1}-КЕЗЕҢ</div>
          <div style="position:relative;font:900 36px/1.15 var(--display);text-align:center;padding:0 24px;color:var(--deep)">${rg ? rg.icon + ' ' : '🔁 '}${esc(r.t)}</div>
          ${rg ? `<div style="position:relative;font:800 22px var(--display);color:${rg.c};margin-top:6px">${esc(rg.name)} · ${esc(rg.side)}</div>` : ''}
          <svg width="230" height="230" viewBox="0 0 120 120" style="position:relative;margin-top:14px"><circle cx="60" cy="60" r="50" fill="#fff" stroke="#EFE6D3" stroke-width="12"/><circle id="ring" cx="60" cy="60" r="50" fill="none" stroke="${rg ? rg.c : '#D9962B'}" stroke-width="12" stroke-dasharray="314" stroke-dashoffset="0" transform="rotate(-90 60 60)" stroke-linecap="round"/></svg>
          <span id="mini" style="position:relative;margin-top:-150px;margin-bottom:96px;font:900 46px var(--display);font-variant-numeric:tabular-nums">${fmt(r.s)}</span>
          <div style="position:relative;display:flex;gap:10px"><button class="btn sec" id="dPrevR" ${d.r ? '' : 'disabled'}>◀</button><button class="btn" id="dGo">▶ Бастау</button><button class="btn" id="dNextR">${d.r < D.rounds.length - 1 ? 'Келесі кезең ▶' : '✓ Аяқтау'}</button></div></div>
        <div class="card" style="padding:14px 16px;display:flex;flex-direction:column;gap:10px;overflow:hidden"><div style="font:800 15px var(--display);letter-spacing:1.5px;color:var(--amber)">K4 · МҰҒАЛІМ БАСАДЫ → БҮКІЛ ТОПҚА</div>
          ${LD.groups.map((g, gi) => `<div style="display:grid;grid-template-columns:110px 1fr;gap:8px;align-items:center;border-left:6px solid ${g.c};padding-left:8px"><div style="font:800 17px var(--display);color:${g.ink}">${g.icon} ${esc(g.name.replace(/[«»]| тобы/g, ''))}<br><b style="font:900 24px var(--display)">+${d.crit[gi].reduce((a, b) => a + b, 0)}</b></div>${crit(gi)}</div>`).join('')}
          <div style="margin-top:auto;display:flex;gap:6px">${[['yes', '🏔️ «Иә» жеңді'], ['no', '🐎 «Қарсы» жеңді'], ['tie', '🤝 Тең']].map(([k, t]) => `<button class="btn ${d.win === k ? '' : 'sec'} dwin" data-k="${k}" style="flex:1;padding:10px 6px;font-size:15px">${t}</button>`).join('')}</div></div></div></div>`;
  };

  R.quiz = () => `<div style="display:grid;grid-template-columns:400px 1fr;gap:18px;height:100%">
    <div class="card" style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px"><div class="qrbox" style="width:330px;height:330px">${GT.qr(link('quiz.html'), 330)}</div><div style="font-size:22px;font-weight:800">Код: <b style="font:900 36px var(--display);letter-spacing:3px">${esc(S.code)}</b></div>
      <div style="display:flex;gap:10px"><button class="btn" id="qopen">▶ Ашу</button><button class="btn sec" id="qclose">⏹ Жабу</button></div><div id="qstat" class="chip" style="margin-top:4px">—</div>
      <div id="qtop" style="width:100%;text-align:left;margin-top:6px"></div></div>
    <div class="card" style="padding:16px 20px;overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font:800 26px var(--display)">✅ Жауаптар — бірден экранда</b><button class="btn sec" id="qkey" style="padding:8px 14px;font-size:17px">${S.quizShow ? '🙈 Жауапты жасыру' : '🔑 Жауапты көрсету'}</button></div><div id="qlive" style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px"></div></div></div>`;

  R.end = () => `<div style="display:grid;grid-template-rows:auto 1fr;gap:12px;height:100%"><div style="display:flex;gap:10px">${[['rate', '🏅 Рейтинг'], ['aw', '🎖 Номинациялар'], ['fb', '💬 Кері байланыс'], ['hw', '🏠 Үй тапсырмасы']].map(([k, t]) => `<button class="btn ${S.endTab === k ? '' : 'sec'} etab" data-t="${k}" style="flex:1">${t}</button>`).join('')}</div><div id="endBox" style="min-height:0"></div></div>`;
  function endBox() {
    const box = $('#endBox'); if (!box) return; const rows = rating(), tot = groupTotals(rows);
    if (S.endTab !== 'fb') { box.dataset.tab = S.endTab; clearInterval(TREE.timer); }
    if (S.endTab === 'rate') {
      const order = LD.groups.map((g, i) => ({ g, i, t: tot[i] })).sort((a, b) => b.t - a.t), mx = Math.max(1, ...tot);
      const pod = [1, 0, 2].map((k) => { const o = order[k]; const h = [230, 300, 180][[1, 0, 2].indexOf(k)]; return o ? `<div style="text-align:center;width:250px"><div style="font-size:54px">${o.g.icon}</div><div style="font:800 23px var(--display);color:${o.g.ink}">${esc(o.g.name)}</div><div style="height:${h}px;margin-top:8px;border-radius:20px 20px 0 0;background:linear-gradient(180deg,${o.g.c},${o.g.c2});display:flex;flex-direction:column;align-items:center;padding-top:12px;color:#fff"><b style="font:900 56px var(--display)">${k + 1}</b><span style="font:800 22px var(--display)">${o.t} ұпай</span></div></div>` : ''; }).join('');
      box.innerHTML = `<div style="display:grid;grid-template-columns:.95fr 1.05fr;gap:16px;height:100%"><div class="card" style="display:flex;flex-direction:column"><b style="font:800 24px var(--display)">🏆 Топтар</b><div style="flex:1;display:flex;gap:14px;align-items:flex-end;justify-content:center">${pod}</div></div>
        <div class="card" style="overflow:hidden;display:flex;flex-direction:column"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font:800 24px var(--display)">👤 Оқушылар</b><button class="btn sec" id="fullR" style="padding:8px 14px;font-size:17px">Толық кесте</button></div>
          <div style="display:flex;gap:8px;margin:8px 0;font-size:16px;font-weight:800"><span class="lv lvA">85–100% → 9–10</span><span class="lv lvB">65–84% → 7–8</span><span class="lv lvC">0–64% → 1–6</span></div>
          <div style="overflow:hidden;flex:1">${rows.slice(0, 12).map((r, i) => `<div style="display:flex;gap:10px;align-items:center;font-size:20px;font-weight:700;padding:4px 0"><b style="width:36px">${i < 3 && r.total ? ['🥇', '🥈', '🥉'][i] : i + 1}</b><span style="width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.g != null ? grp(r.g).icon : ''} ${esc(r.name)}</span><div class="bar"><i style="width:${r.pct}%"></i></div><b style="width:64px;text-align:right">${r.pct}%</b><b style="width:54px;text-align:center;font:900 26px var(--display);color:${r.b >= 9 ? '#1E9A5A' : r.b >= 7 ? '#C0661A' : '#D2452F'}">${r.b}</b></div>`).join('') || '<div class="mut" style="font-size:22px;margin-top:20px">Ұпайлар осында жиналады</div>'}</div></div></div>`;
      const fr = $('#fullR'); if (fr) fr.onclick = openRate;
    } else if (S.endTab === 'aw') {
      const A = awards(rows, tot);
      box.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:1fr;gap:14px;height:100%">${A.map((a, i) => `<div class="card aw" style="display:flex;gap:16px;align-items:center;padding:16px 20px;opacity:0;transform:scale(.8);transition:.5s cubic-bezier(.2,.8,.2,1);transition-delay:${i * 0.18}s"><div style="flex:none;width:110px;height:110px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff6,transparent 45%),linear-gradient(160deg,${a.c},${a.c2});display:flex;align-items:center;justify-content:center;font-size:54px;box-shadow:0 0 0 6px #fff,0 0 0 9px ${a.c}55,0 12px 26px -8px ${a.c}">${a.ic}</div>
        <div style="min-width:0"><div style="font:800 15px var(--display);letter-spacing:2px;color:${a.c}">${esc(a.t).toUpperCase()}</div><div style="font:900 30px/1.1 var(--display);margin-top:4px;color:var(--deep)">${esc(a.who || '—')}</div><div class="mut" style="font-size:17px;font-weight:700;margin-top:4px">${esc(a.why)}</div></div></div>`).join('')}</div>`;
      requestAnimationFrame(() => requestAnimationFrame(() => $$('.aw', box).forEach((x) => { x.style.opacity = 1; x.style.transform = 'none'; })));
    } else if (S.endTab === 'fb') {
      treeTab(box);
    } else {
      box.innerHTML = `<div class="card" style="height:100%"><b style="font:800 28px var(--display)">🏠 Деңгейлік үй тапсырмасы</b>${LD.homework.map((h) => `<div style="display:flex;gap:16px;margin-top:18px;font-size:25px;font-weight:700;line-height:1.35;background:#F6F1E6;border-radius:18px;padding:16px 18px"><b class="lv lv${h.lvl}" style="font-size:28px;height:fit-content">${h.lvl}</b><span>${esc(h.t)}</span></div>`).join('')}<div class="mut" style="margin-top:18px;font-size:20px;font-weight:700">Оқулық, 72–81-беттер</div></div>`;
    }
  }


  /* ---------- Кері байланыс: «Жыр бәйтерегі» — оқушы жапырағы, қонақ пікірі алтын алма ---------- */
  const TREE = { leaf: new Set(), apple: new Set(), timer: null, ix: 0 };
  const LEAFC = { easy: '#B44A33', good: '#2F7E92', mid: '#D9962B', hard: '#5B4A8A' };
  const LEAFP = 'M0,-17 C12,-12 14,7 0,17 C-14,7 -12,-12 0,-17Z';
  const SPOTS = (() => { const a = []; for (let k = 0; k < 70; k++) { const r = Math.sqrt((k + .5) / 70), t = k * 2.39996; a.push([300 + Math.cos(t) * r * 225, 205 + Math.sin(t) * r * 150, (k * 47) % 70 - 35]); } return a; })();
  const APPLES = [[150, 260], [450, 250], [230, 120], [380, 110], [300, 70], [110, 190], [500, 180], [200, 320], [410, 330], [340, 200], [255, 215], [470, 300]];
  function treeSvg() {
    return '<svg viewBox="0 0 600 560" role="img" aria-label="Жыр бәйтерегі" style="width:100%;height:100%;display:block"><defs><radialGradient id="crown" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#DDF2D6"/><stop offset="1" stop-color="#C6E7BD" stop-opacity=".25"/></radialGradient><radialGradient id="gold" cx="35%" cy="30%"><stop offset="0" stop-color="#FFF1B8"/><stop offset=".55" stop-color="#F6C343"/><stop offset="1" stop-color="#C98A0B"/></radialGradient><linearGradient id="trunk" x1="0" x2="1"><stop offset="0" stop-color="#8A5A32"/><stop offset="1" stop-color="#6B4325"/></linearGradient></defs>' +
      '<ellipse cx="300" cy="530" rx="230" ry="22" fill="#CFE6C4"/><ellipse cx="300" cy="205" rx="262" ry="185" fill="url(#crown)"/>' +
      '<path d="M282 530 C286 450 280 400 270 360 C250 330 210 300 170 280 M292 400 C300 360 330 320 390 285 M300 530 C304 460 306 410 300 340 C298 300 300 260 300 200 M300 330 C340 300 380 250 420 210 M300 300 C260 270 230 230 200 190 M300 250 C300 200 290 150 280 110" stroke="url(#trunk)" stroke-width="14" fill="none" stroke-linecap="round"/>' +
      '<path d="M268 530 C278 470 282 420 280 380 L320 380 C318 420 322 470 332 530 Z" fill="url(#trunk)"/><g id="leaves"></g></svg>';
  }
  function treeNotes() {
    const fb = (S.game || {}).feedback || {}, gs = (S.game || {}).guests || {}, n = [];
    Object.keys(fb).forEach((u) => { const f = fb[u]; if (f && f.text) n.push({ u, t: f.text, who: f.name || 'Оқушы', c: LEAFC[f.k] || LEAFC.easy, g: false }); });
    Object.keys(gs).forEach((u) => { const x = gs[u]; if (x && x.kind === 'fb' && x.text) n.push({ u: 'g:' + u, t: x.text, who: x.name || 'Ұстаз', g: true }); });
    return n;
  }
  function treeQuote(u) {
    const q = $('#tquote'); if (!q) return; const all = treeNotes(); if (!all.length) return;
    const it = (u && all.find((x) => x.u === u)) || all[TREE.ix++ % all.length];
    q.style.opacity = 0; setTimeout(() => { q.innerHTML = `<span style="display:inline-block;padding:4px 12px;border-radius:999px;font:800 14px var(--body);background:${it.g ? '#FFF1D6' : 'var(--good-bg)'};color:${it.g ? '#8A5300' : '#13603A'}">${it.g ? '🍎 Ұстаз пікірі' : '🍃 Оқушы ойы'}</span><div style="margin-top:10px">«${esc(it.t)}»</div><div class="mut" style="font:800 18px var(--body);margin-top:8px">— ${esc(it.who)}</div>`; q.style.opacity = 1; }, 350);
  }
  function treeTab(box) {
    if (box.dataset.tab !== 'fb' || !$('#leaves', box)) {
      box.dataset.tab = 'fb'; TREE.leaf = new Set(); TREE.apple = new Set(); clearInterval(TREE.timer);
      box.innerHTML = `<div style="display:grid;grid-template-columns:1.25fr .75fr;gap:16px;height:100%">
        <div class="card" style="position:relative;padding:10px;background:radial-gradient(80% 70% at 50% 35%,#F3FBEF,#fff 70%);display:flex;align-items:center;justify-content:center;min-height:0">
          <div style="position:absolute;left:20px;top:14px;font:900 22px var(--display)">🌳 Жыр бәйтерегі · <b id="lcnt" style="font-size:1.6em;color:var(--good)">0</b> жапырақ</div>${treeSvg()}</div>
        <div style="display:flex;flex-direction:column;gap:14px;min-height:0">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${LD.feedback.map((f) => `<div class="card" style="padding:10px;text-align:center;border-top:8px solid ${LEAFC[f.k]}"><div style="font-size:34px">${f.icon}</div><b id="fc_${f.k}" style="display:block;font:900 40px var(--display);color:${LEAFC[f.k]}">0</b><div style="font:800 15px var(--body)">${esc(f.t)}</div></div>`).join('')}</div>
          <div class="card" style="flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center"><div id="tquote" style="font:800 30px/1.2 var(--display);transition:opacity .35s"><span class="mut" style="font-size:22px">Оқушылар телефоннан ойын жазғанда, жапырақ ағашқа өседі. Жапырақты бассаңыз — ойы шығады.</span></div></div>
          <div class="card" style="display:flex;gap:14px;align-items:center;padding:12px 16px;background:linear-gradient(160deg,#FFF8E8,#fff)"><div class="qrbox" style="width:130px;height:130px;flex:none">${GT.qr(link('quiz.html', '&guest=1'), 130)}</div><div style="font:700 17px var(--body)"><b style="font-family:var(--display)">🍎 Ұстаздар пікірі</b><br>Сканерлеп, «2 жұлдыз, 1 тілек» жазыңыз — ағашта алтын алма пайда болады.</div></div>
        </div></div>`;
      TREE.timer = setInterval(() => { if (!$('#tquote')) return clearInterval(TREE.timer); treeQuote(); }, 6000);
    }
    const g = $('#leaves', box), fb = (S.game || {}).feedback || {}, gs = (S.game || {}).guests || {}, cnt = { easy: 0, good: 0, mid: 0, hard: 0 }, NS = 'http://www.w3.org/2000/svg';
    Object.keys(fb).sort((a, b) => (fb[a].t || 0) - (fb[b].t || 0)).forEach((u) => {
      const f = fb[u]; if (!f || !f.k) return; cnt[f.k] = (cnt[f.k] || 0) + 1;
      if (TREE.leaf.has(u)) return; const k = TREE.leaf.size; TREE.leaf.add(u);
      const p = SPOTS[(k * 29 + 11) % SPOTS.length], off = Math.floor(k / SPOTS.length) * 9, el = document.createElementNS(NS, 'g');
      el.setAttribute('transform', `translate(${p[0] + off},${p[1] + off}) rotate(${p[2]}) scale(1.9)`);
      el.innerHTML = `<g class="leaf"><path d="${LEAFP}" fill="${LEAFC[f.k] || LEAFC.easy}" stroke="rgba(255,255,255,.8)" stroke-width="1.2"/><path d="M0,-13 L0,14" stroke="rgba(255,255,255,.75)" stroke-width="1.6"/></g>`;
      el.style.cursor = 'pointer'; el.onclick = () => treeQuote(u); g.appendChild(el);
      const lf = el.firstChild; setTimeout(() => lf.classList.add('sway'), 950);
    });
    Object.keys(gs).filter((u) => gs[u] && gs[u].kind === 'fb').sort((a, b) => (gs[a].t || 0) - (gs[b].t || 0)).forEach((u) => {
      if (TREE.apple.has(u)) return; const k = TREE.apple.size; TREE.apple.add(u);
      const p = APPLES[k % APPLES.length], el = document.createElementNS(NS, 'g');
      el.setAttribute('transform', `translate(${p[0]},${p[1]}) scale(1.6)`);
      el.innerHTML = '<g class="apple"><path d="M0,-16 C2,-22 6,-24 9,-25" stroke="#6B4325" stroke-width="2.4" fill="none"/><path d="M2,-18 C8,-24 14,-22 15,-18 C10,-15 6,-15 2,-18Z" fill="#3BB273"/><circle r="15" fill="url(#gold)" stroke="#fff" stroke-width="1.5"/><ellipse cx="-5" cy="-5" rx="4" ry="6" fill="rgba(255,255,255,.55)"/><path d="M0,-6 l2.4,5 5.4,.6 -4,3.7 1.1,5.3 -4.9,-2.7 -4.9,2.7 1.1,-5.3 -4,-3.7 5.4,-.6z" fill="#fff" opacity=".9"/></g>';
      el.style.cursor = 'pointer'; el.onclick = () => treeQuote('g:' + u); g.appendChild(el);
    });
    const lc = $('#lcnt', box); if (lc) lc.textContent = TREE.leaf.size;
    Object.keys(cnt).forEach((k) => { const e = $('#fc_' + k, box); if (e) e.textContent = cnt[k]; });
  }
  /* ---------- Номинациялар: рейтинг бойынша автоматты ---------- */
  function awards(rows, tot) {
    const named = rows.filter((r) => r.total > 0), by = (f) => named.slice().sort((a, b) => f(b) - f(a) || b.total - a.total)[0];
    const rl = (r) => { const p = S.roster.find((x) => GT.nrm(x.name) === r.key); return p ? p.role : ''; };
    const order = LD.groups.map((_, i) => i).sort((a, b) => tot[b] - tot[a]);
    const hatP = S.roster.find((p) => p.g === order[0] && p.role === 'hat');
    const dg = LD.groups.map((_, i) => i).sort((a, b) => S.deb.crit[b].reduce((x, y) => x + y, 0) - S.deb.crit[a].reduce((x, y) => x + y, 0) || tot[b] - tot[a])[0];
    const orator = S.roster.find((p) => p.g === dg && p.role === 'sp1');
    const reader = by((r) => (r.byK.K2 || 0) * 10 + (rl(r) === 'pos' ? 1 : 0)), lab = by((r) => r.byK.K3 || 0), quiz = by((r) => r.quizC || 0), top = named[0];
    return [
      { ic: '🏆', t: 'Жыр жүйрігі', who: top && top.name, why: top ? `Сабақ көшбасшысы · ${top.pct}% · ${top.b} балл` : 'рейтинг бойынша 1-орын', c: '#A8651A', c2: '#D9962B' },
      { ic: '🎙️', t: 'Мәнерлеп оқу шебері', who: reader && reader.byK.K2 ? reader.name : '', why: 'Жырды жүрекпен оқыды (K2)', c: '#B44A33', c2: '#E07A5F' },
      { ic: '🗣️', t: 'Үздік шешен', who: orator ? orator.name : grp(dg).name, why: 'Дебатта ең нақты дәлелдеді (K4)', c: '#1B5566', c2: '#2F7E92' },
      { ic: '🔍', t: 'Зерттеуші', who: lab && lab.byK.K3 ? lab.name : '', why: 'Көркемдік құралдарды дәл тапты (K3)', c: '#5B4A8A', c2: '#8A78C0' },
      { ic: '📒', t: 'Үздік хатшы', who: hatP ? hatP.name : grp(order[0]).name + ' хатшысы', why: '1-орын алған топтың хатшысы · әділ әрі мұқият', c: '#3B2414', c2: '#7A4E2D' },
      { ic: '⚡', t: 'Жыр білгір', who: quiz && quiz.quizC ? quiz.name : '', why: quiz && quiz.quizC ? `Квиз: ${quiz.quizC}/${LD.quiz.length} дұрыс` : 'Квиз бойынша 1-орын', c: '#2E6B3F', c2: '#4E9B62' }
    ];
  }

  /* ---------- көрсету ---------- */
  function show(i, opt) {
    opt = opt || {};
    const prev = S.i; S.i = Math.max(0, Math.min(ST.length - 1, i)); LS.set('sa_stage', S.i);
    const s = cur();
    if (prev !== S.i || opt.force) { MT.run = false; killGlobe(); }
    $('#num').textContent = S.i + 1; $('#title').textContent = s.title;
    const phone = LD.phoneAll.includes(s.id) ? '<span class="chip" style="background:#E1F0FB;color:#124E86">📱 Телефон: бәріне</span>' : '<span class="chip">📵 Телефон жинаулы · тек 📒 хатшы</span>';
    const mode = { 'Жеке': '👤 Жеке', 'Жұп': '👥 Жұп', 'Топ': '🌿 Топ', 'Барлығы': '🙌 Барлығы' }[s.mode] || '';
    $('#method').innerHTML = `<span class="lab">ӘДІС</span><span class="nm">${esc(s.method.name)}</span><span class="es">${esc(s.method.essence)}</span><span class="chip">${mode}</span>${s.sheet ? `<span class="chip sh">📄 ${esc(s.sheet)}</span>` : ''}${phone}${s.k ? `<span class="chip k" id="kchip" title="Критерий мен дескриптор — 📋">📋 ${s.k} · ${kMax(s.k)} ұпай</span>` : ''}`;
    $('#body').innerHTML = `${how(s)}<div class="task" id="task">${R[s.id]()}</div>`;
    $('#prog').innerHTML = ST.map((x, k) => `<i class="${k === S.i ? 'on' : k < S.i ? 'done' : ''}" data-k="${k}" title="${k + 1}. ${esc(x.title)} · ${x.min} мин">${x.ic}<small>${k + 1}</small></i>`).join('');
    if (!opt.keepTimer) tSet(s.min * 60, SET.autoTimer && !opt.noAuto && s.id !== 'video');
    bind(s); live();
    if (!opt.quiet && (SET.guideAll || s.id === 'hello' || s.id === 'end')) guide(s.guide);
    if (S.db && prev !== S.i) setMeta(s.id === 'quiz' ? { quiz: true, stage: s.id } : { stage: s.id });
  }
  const redraw = () => { killGlobe(); $('#task').innerHTML = R[cur().id](); bind(cur()); live(); };
  function spinName(el, names, done) { let n = 0; const iv = setInterval(() => { el.textContent = names[Math.floor(Math.random() * names.length)]; GT.tick(); if (++n > 18) { clearInterval(iv); done(); } }, 85); }
  function bind(s) {
    const kc = $('#kchip'); if (kc) kc.onclick = () => openAssess('now');
    $$('.mood').forEach((b) => b.onclick = () => { const k = b.dataset.i; S.mood[k] = (S.mood[k] || 0) + 1; b.querySelector('[data-c]').textContent = S.mood[k]; GT.tone(600 + k * 120, 0.15); });
    if (s.id === 'hw') bindHw();
    if (s.id === 'groups') {
      const gs = $('#goSet'); if (gs) gs.onclick = () => openSet('list');
      const dg = $('#doGroup'); if (dg) dg.onclick = () => { if (S.grouped) { S.grouped = false; redraw(); setTimeout(() => { S.grouped = true; reveal(); }, 80); } else { S.grouped = true; reveal(); dg.textContent = '🎲 Қайта көрсету'; } };
    }
    if (s.id === 'video') {
      const v = $('#tourV'); $('#vplay').onclick = () => { if (v) { v.play(); } };
      $('#vfull').onclick = () => { const el = v || $('#task iframe'); if (el && el.requestFullscreen) el.requestFullscreen(); };
      if (v) { v.onplay = () => { if (!T.run) tStart(); }; v.onerror = () => { v.outerHTML = '<div style="color:#fff;padding:40px;font-size:26px">Бейне файлы табылмады (media/saryarqa-kitapsha.mp4).</div>'; }; }
      $('#vdisc').onclick = () => full(`<h2>💬 Талқылау</h2>${['«Сарыарқа» жыры қашан, қай жерде, қандай жағдайда туды?', 'Ақын жырында нені жоқтайды, нені сағынады?', 'Ақынның көңіл күйін бір сөзбен атаңдар. Неге?'].map((q, i) => `<div style="font-size:32px;font-weight:700;margin-top:18px;line-height:1.3"><b style="color:var(--amber)">${i + 1}.</b> ${esc(q)}</div>`).join('')}`);
    }
    if (s.id === 'read') bindRead();
    if (s.id === 'lab') bindLab();
    if (s.id === 'debate') bindDebate();
    if (s.id === 'quiz') { $('#qopen').onclick = () => setMeta({ quiz: true }); $('#qclose').onclick = () => setMeta({ quiz: false }); $('#qkey').onclick = () => { S.quizShow = !S.quizShow; redraw(); }; }
    if (s.id === 'end') { $$('.etab').forEach((b) => b.onclick = () => { S.endTab = b.dataset.t; redraw(); }); endBox(); }
  }
  /* ---------- байланыстыру ---------- */
  function namesPool() { return S.roster.length ? S.roster : null; }
  function doSpin(el, set) {
    const pool = namesPool();
    if (!pool) { set({ name: 'Ерікті оқушы', anon: true }); return redraw(); }
    spinName(el, pool.map((p) => p.name), () => { const p = pool[Math.floor(Math.random() * pool.length)]; set({ name: p.name, g: p.g }); GT.chime(); redraw(); });
  }
  function bindHw() {
    $$('.hq').forEach((b) => b.onclick = () => { S.hw.q = +b.dataset.i; S.hw.key = false; redraw(); });
    $('#spin').onclick = () => doSpin($('#pick'), (p) => { S.hw.pick = p; S.hw.key = false; });
    $('#ansB').onclick = () => { S.hw.key = !S.hw.key; $('#ans').style.display = S.hw.key ? 'block' : 'none'; };
    const ok = $('#okB'); if (ok) ok.onclick = () => { const p = S.hw.pick; if (!p || p.anon) return; bScore(p, 'K1_0', 1); GT.chime(); ok.disabled = true; banner('🔥 ' + p.name + ': +1 (K1)'); };
  }
  function bindRead() {
    const go = (i) => { S.rd.i = Math.max(0, Math.min(LD.stanzas.length - 1, i)); S.rd.key = false; redraw(); };
    $$('.rdt').forEach((b) => b.onclick = () => go(+b.dataset.i));
    $('#spin').onclick = () => doSpin($('#pick'), (p) => { S.rd.pick = p; });
    $('#rdKey').onclick = () => { S.rd.key = !S.rd.key; $('#rdA').style.display = S.rd.key ? 'block' : 'none'; };
    $('#rdNext').onclick = () => { S.rd.done[S.rd.i] = 1; if (S.rd.i < LD.stanzas.length - 1) { S.rd.pick = null; go(S.rd.i + 1); } else { banner('✓ Жыр тізбегі аяқталды · 📒 Хатшылар K2 сұрақ ұпайын қойсын', 5000); redraw(); } };
    const ok = $('#rdOk'); if (ok) ok.onclick = () => { const p = S.rd.pick; if (!p || p.anon) return; bScore(p, 'K2_0', 1); GT.chime(); banner('🎙️ ' + p.name + ': +1 (K2)'); redraw(); };
  }
  function bindLab() {
    $$('.lcard').forEach((b) => b.onclick = () => { S.lab.sel = +b.dataset.i; redraw(); });
    $$('.dopt').forEach((b) => b.onclick = () => { const i = S.lab.sel, x = LD.lab[i]; S.lab.ans[i] = b.dataset.k; LS.set('sa_lab', S.lab.ans); if (b.dataset.k === x.a) GT.chime(); else GT.tone(200, 0.3, 'sawtooth', 0.1); S.lab.sel = Object.keys(S.lab.ans).length < LD.lab.length ? LD.lab.findIndex((_, k) => S.lab.ans[k] == null) : null; redraw(); });
    $('#labTh').onclick = () => full(`<h2>📘 Көркемдегіш құралдар</h2><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:10px">${LD.devices.map((d) => `<div style="background:#fff;border-radius:18px;padding:16px 18px;border-left:8px solid var(--amber)"><b style="font:800 26px var(--display)">${esc(d.n)}</b><div style="font-size:21px;margin-top:6px;line-height:1.35">${esc(d.d)}</div></div>`).join('')}</div><div class="mut" style="margin-top:14px;font-size:19px;font-weight:700">Эпитет (грекше «сипаттау») — оқулық, 81-бет. Гротеск «Сарыарқада» кездеспейді — оны басқа шығармалардан іздейміз.</div>`);
    $('#labSt').onclick = () => full(`<h2>✒️ Мұрат Мөңкеұлының стилі</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px">${LD.style.map((t, i) => `<div style="display:flex;gap:14px;align-items:center;background:#fff;border-radius:18px;padding:16px 18px;font-size:25px;font-weight:800;line-height:1.3;opacity:0;animation:zin .5s ${i * 0.35}s both"><b style="flex:none;width:48px;height:48px;border-radius:50%;background:var(--amber);color:#fff;display:flex;align-items:center;justify-content:center;font:900 22px var(--display)">${i + 1}</b>${esc(t)}</div>`).join('')}</div><div style="margin-top:18px;font:800 26px var(--display);background:#FBEFD9;border-radius:18px;padding:16px 20px">Қорытынды: Мұрат — <b style="color:var(--amber)">зар заман жырауы</b>; оның стилі — тарихи нақтылық, ащы сатира мен терең сағыныш.</div>`);
  }
  function bindDebate() {
    const D = LD.debate, d = S.deb, save = () => LS.set('sa_deb', S.deb);
    $('#dPrep').onclick = () => { d.mode = 'prep'; MT.run = false; save(); redraw(); };
    $('#dRun').onclick = () => { d.mode = 'run'; MT.run = false; save(); redraw(); };
    const pg = $('#dPrepGo'); if (pg) pg.onclick = () => miniStart(D.prep, () => banner('🛠 Дайындық аяқталды — дебат басталады!', 4000));
    if (d.mode !== 'run') return;
    const go = (i) => { d.r = Math.max(0, Math.min(D.rounds.length - 1, i)); MT.run = false; save(); redraw(); };
    $$('.drd').forEach((b) => b.onclick = () => go(+b.dataset.i));
    $('#dPrevR').onclick = () => go(d.r - 1);
    $('#dGo').onclick = () => miniStart(D.rounds[d.r].s, () => banner('⏰ ' + D.rounds[d.r].t + ': уақыт бітті'));
    $('#dNextR').onclick = () => { if (d.r < D.rounds.length - 1) { go(d.r + 1); miniStart(D.rounds[d.r].s, () => banner('⏰ Уақыт бітті')); } else { MT.run = false; banner('⚖️ Дебат аяқталды · ұпай топтарға түсті', 5000); } };
    $$('.dcrit').forEach((b) => b.onclick = () => { const g = +b.dataset.g, i = +b.dataset.i; d.crit[g][i] = d.crit[g][i] ? 0 : 1; if (d.crit[g][i]) GT.chime(); save(); const keep = MT.run; redraw(); MT.run = keep; live(); });
    $$('.dwin').forEach((b) => b.onclick = () => { d.win = d.win === b.dataset.k ? '' : b.dataset.k; save(); if (d.win) { GT.melody(); banner({ yes: '🏔️ Қазылар шешімі: «Иә» тарап жеңді!', no: '🐎 Қазылар шешімі: «Қарсы» тарап жеңді!', tie: '🤝 Қазылар шешімі: тең түсті!' }[d.win], 5000); } const keep = MT.run; redraw(); MT.run = keep; });
  }

  function reveal() { requestAnimationFrame(() => requestAnimationFrame(() => $$('.mem').forEach((m) => { m.style.opacity = 1; m.style.transform = 'none'; }))); GT.melody(); }

  /* ---------- live ---------- */
  function live() {
    const rows = rating(), tot = groupTotals(rows), g = S.game || {}, meta = g.meta || {};
    $('#ribbon').innerHTML = LD.groups.map((x, i) => `<span style="background:linear-gradient(180deg,${x.c},${x.c2})" title="${esc(x.name)} — ұпай">${x.icon} ${x.short}<b>${tot[i]}</b></span>`).join('');
    const s = cur();
    if (s.id === 'quiz' && $('#qlive')) {
      const players = g.players || {}, ans = g.answers || {}, ids = Object.keys(players);
      $('#qstat').textContent = (meta.quiz ? '🟢 ашық' : '⚪ жабық') + ' · ' + ids.length + ' оқушы';
      $('#qlive').innerHTML = LD.quiz.map((q, i) => { const a = ans[i] || {}, n = Object.keys(a).length, c = Object.values(a).filter((x) => GT.isRight(q, x.v)).length, p = n ? Math.round(c * 100 / n) : 0;
        const key = q.t === 'mc' ? q.o[q.a] : q.t === 'tf' ? (q.a ? 'Дұрыс' : 'Бұрыс') : q.t === 'num' ? String(q.a).replace('.', ',') + ' ' + (q.unit || '') : q.a.map((k) => q.o[k].split(' ').slice(0, 3).join(' ')).join(' → ');
        return `<div style="background:#F6F1E6;border-radius:14px;padding:8px 12px;font-size:16px;font-weight:700;line-height:1.25;display:flex;flex-direction:column;gap:4px;min-width:0"><div style="display:flex;gap:8px"><b style="flex:none;width:28px;height:28px;border-radius:50%;background:var(--deep);color:#F7B24A;display:flex;align-items:center;justify-content:center;font:800 14px var(--display)">${i + 1}</b><span style="overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${esc(q.q)}</span></div>
          <div style="color:#1E9A5A;font-weight:900;visibility:${S.quizShow ? 'visible' : 'hidden'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">✓ ${esc(key)}</div><div style="display:flex;align-items:center;gap:8px"><div class="bar" style="height:12px"><i style="width:${p}%;background:${p >= 65 ? '#1E9A5A' : p >= 40 ? '#F2A541' : '#D2452F'}"></i></div><b style="width:110px;text-align:right">${c}/${n} · ${p}%</b></div></div>`; }).join('');
      const rs = ids.map((u) => { let c = 0; LD.quiz.forEach((q, i) => { const a = ans[i] && ans[i][u]; if (a && GT.isRight(q, a.v)) c++; }); return { name: players[u].name, g: players[u].g, c }; }).sort((a, b) => b.c - a.c).slice(0, 5);
      $('#qtop').innerHTML = rs.map((r, i) => `<div style="display:flex;gap:8px;font-size:18px;font-weight:800;padding:3px 0"><span>${['🥇', '🥈', '🥉', '4', '5'][i]}</span><span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${grp(r.g).icon} ${esc(r.name)}</span><b>${r.c}/${LD.quiz.length}</b></div>`).join('');
    }
    if (s.id === 'end') endBox();
    const conn = S.db ? (S.db.demo ? '🟡 офлайн' : '🟢 ' + S.code) : '⏳ қосылуда';
    $('#sub').textContent = `${LD.lesson.subject} · ${LD.lesson.grade}${LD.lesson.section ? ' · ' + LD.lesson.section : ''} · ${conn}`;
    if (OV.kind === 'rate') renderRate();
  }
  function setMeta(o) { if (!S.db) return; S.db.update('games/' + S.code + '/meta', o).catch((e) => banner('⚠️ Байланыс: ' + (e.code || e.message), 5000)); }

  /* ---------- оверлейлер ---------- */
  const OV = { kind: '', tab: '' };
  const ov = $('#ov');
  function closeOV() { ov.classList.remove('on'); ov.innerHTML = ''; OV.kind = ''; }
  ov.onclick = (e) => { if (e.target === ov || e.target.classList.contains('x')) closeOV(); };
  function full(html, kind) { OV.kind = kind || 'full'; ov.innerHTML = `<div class="full"><button class="x">✕</button>${html}</div>`; ov.classList.add('on'); }
  function drawer(html, kind) { OV.kind = kind; ov.innerHTML = `<div class="drawer"><button class="x">✕</button>${html}</div>`; ov.classList.add('on'); }

  function openScript() {
    const s = cur();
    drawer(`<h2>💬 Мұғалім сөзі · ${S.i + 1}-экран</h2><div class="mut" style="font-size:19px;font-weight:700">${esc(s.title)} · ${s.min} мин · әдіс: ${esc(s.method.name)}</div>
      <div style="background:#FFF4E2;border-radius:18px;padding:16px 18px;margin-top:14px;font-size:24px;font-weight:700;line-height:1.45">${esc(s.T)}</div>
      <h3 style="margin:18px 0 6px">🧑‍🎓 Оқушылар не істейді</h3><div style="font-size:21px">${esc(s.S)}</div>
      <h3 style="margin:18px 0 6px">🗣 Оқушының сөйлеу үлгісі</h3>${(LD.say[s.id] || []).map((x) => `<div style="font-size:20px;margin-top:4px">• ${esc(x)}</div>`).join('')}
      ${s.k ? `<h3 style="margin:18px 0 6px">📋 Бағалау</h3><div style="font-size:20px"><b>${s.k}</b> · ${esc(task(s.k).title)} — ${task(s.k).d.map((d) => esc(d.t) + ' (' + ({ sec: '📒 хатшы', board: '🖥 тақта', auto: '⚙️ автоматты', group: '🖥 бүкіл топқа', quiz: '📱 квиз' }[d.by]) + ')').join('; ')}</div>` : ''}
      <h3 style="margin:22px 0 8px">🗺 Сабақ жоспары</h3>${ST.map((x, k) => `<div class="pl" data-k="${k}" style="display:flex;gap:10px;padding:8px 10px;border-radius:12px;cursor:pointer;font-size:19px;${k === S.i ? 'background:#FFF1DA;font-weight:800' : ''}"><span style="width:34px">${x.ic}</span><span style="flex:1">${k + 1}. ${esc(x.title)}</span><span class="mut">${x.min} мин</span></div>`).join('')}`, 'script');
    $$('.pl').forEach((p) => p.onclick = () => { closeOV(); show(+p.dataset.k); });
  }
  function openAssess(tab) { OV.tab = tab || (OV.kind === 'assess' ? OV.tab : 'now'); drawer('', 'assess'); renderAssess(); }
  const BY = { sec: '📒 хатшы', board: '🖥 тақта', auto: '⚙️ авто', group: '🖥 топқа', quiz: '📱 квиз' };
  function descTable(t) { return `<table class="t" style="font-size:19px;margin-top:10px"><thead><tr><th>${t.k} · ${esc(t.kind)}: ${esc(t.title)}</th><th style="width:110px">Кім</th><th style="width:70px">Ұпай</th></tr></thead><tbody>${t.d.map((d) => `<tr><td>${esc(d.t)}</td><td style="font-size:16px">${BY[d.by]}</td><td style="text-align:center;font-weight:900">${d.p}</td></tr>`).join('')}</tbody></table>`; }
  function renderAssess() {
    const dr = $('.drawer'); if (!dr) return; const s = cur();
    let h = `<button class="x">✕</button><h2>📋 Бағалау</h2><div class="tabs">${[['now', 'Осы экран'], ['all', 'Критерийлер мен дескрипторлар'], ['res', 'Нәтижелер']].map(([k, t]) => `<button data-t="${k}" class="${OV.tab === k ? 'on' : ''}">${t}</button>`).join('')}</div>`;
    if (OV.tab === 'now') h += s.k ? descTable(task(s.k)) : `<div style="font-size:22px">Бұл экранда ұпай қойылмайды — ауызша мадақтау: «Жарайсың!», «Дәлелің нақты!»</div>`;
    if (OV.tab === 'all') h += `<div style="font-size:19px;margin-bottom:6px"><b>Оқу мақсаты:</b> ${esc(LD.lesson.objective)}<br><b>Бағалау критерийі:</b> ${esc(LD.lesson.criterion)}</div>${LD.tasks.map(descTable).join('')}<div style="margin-top:14px;font-size:20px;background:#FFF4E2;border-radius:14px;padding:12px 16px">Барлығы ${LD.MAX} ұпай → пайыз → 10 балл: <b>85–100%</b> → 9–10 балл · <b>65–84%</b> → 7–8 балл · <b>0–64%</b> → 1–6 балл</div>`;
    if (OV.tab === 'res') { const rows = rating(); h += `<div class="mut" style="font-size:17px;margin-bottom:8px">Сұр сан — жүйе/хатшы ұпайы. Ұяшыққа сан жазсаңыз — мұғалімнің түзетуі (басым).</div><table class="t" style="font-size:17px"><thead><tr><th style="padding:8px">Оқушы</th>${LD.tasks.map((t) => `<th style="padding:8px 4px;text-align:center">${t.k}<br><small>${kMax(t.k)}</small></th>`).join('')}<th style="padding:8px">%</th><th style="padding:8px">Балл</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td style="padding:6px 8px">${r.g != null ? grp(r.g).icon : ''} ${esc(r.name)}</td>${LD.tasks.map((t) => `<td style="padding:3px"><input data-key="${esc(r.key)}" data-k="${t.k}" value="${S.manual[r.key] && S.manual[r.key][t.k] != null ? S.manual[r.key][t.k] : ''}" placeholder="${r.byK[t.k]}" style="width:46px;font-size:18px;text-align:center;border:2px solid #E6EDE8;border-radius:8px;padding:4px"></td>`).join('')}<td style="padding:4px 8px"><b>${r.pct}%</b></td><td style="padding:4px 8px"><b>${r.b}</b></td></tr>`).join('') || '<tr><td colspan="9" class="mut">Тізім бос — ⚙️ баптауда енгізіңіз</td></tr>'}</tbody></table>
      <button class="btn sec" id="csv" style="margin-top:12px">⬇️ Excel (CSV)</button>`; }
    dr.innerHTML = h;
    $$('.tabs button', dr).forEach((b) => b.onclick = () => { OV.tab = b.dataset.t; renderAssess(); });
    $$('input[data-k]', dr).forEach((inp) => inp.onchange = () => { const k = inp.dataset.key; S.manual[k] = S.manual[k] || {}; S.manual[k][inp.dataset.k] = inp.value === '' ? null : Math.min(kMax(inp.dataset.k), Math.max(0, +inp.value)); LS.set('sa_manual', S.manual); live(); });
    const c = $('#csv'); if (c) c.onclick = csv;
  }
  function csv() { const rows = rating(); const lines = [['#', 'Оқушы', 'Топ', ...LD.tasks.map((t) => t.k), 'Ұпай', '%', 'Балл', 'Деңгей'].join(';')].concat(rows.map((x, i) => [i + 1, x.name, x.g != null ? grp(x.g).name : '', ...LD.tasks.map((t) => x.byK[t.k]), x.total + '/' + LD.MAX, x.pct, x.b, x.band].join(';'))); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })); a.download = 'saryarqa-reyting.csv'; a.click(); }
  function openRate() { full('', 'rate'); renderRate(); }
  function renderRate() {
    const f = $('.full'); if (!f) return; const rows = rating(), tot = groupTotals(rows), mx = Math.max(1, ...tot);
    const place = LD.groups.map((_, i) => i).sort((a, b) => tot[b] - tot[a]);
    f.innerHTML = `<button class="x">✕</button><h2>🏅 Рейтинг · ${S.i + 1}-экраннан кейін</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:10px 0 18px">${LD.groups.map((x, i) => `<div style="background:${x.soft};border-radius:20px;padding:14px 18px"><b style="color:${x.ink};font:800 22px var(--display)">${['🥇', '🥈', '🥉'][place.indexOf(i)]} ${x.icon} ${esc(x.name)}</b><div style="display:flex;align-items:center;gap:10px;margin-top:8px"><div class="bar" style="height:20px"><i style="width:${tot[i] / mx * 100}%;background:${x.c}"></i></div><b style="font:900 40px var(--display)">${tot[i]}</b></div></div>`).join('')}</div>
      <table class="t" style="font-size:20px"><thead><tr><th>#</th><th>Оқушы</th>${LD.tasks.map((t) => `<th style="text-align:center">${t.k}</th>`).join('')}<th>Ұпай</th><th>%</th><th>Балл</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i < 3 && r.total ? ['🥇', '🥈', '🥉'][i] : i + 1}</td><td>${r.g != null ? grp(r.g).icon : ''} ${esc(r.name)}</td>${LD.tasks.map((t) => `<td style="text-align:center">${r.byK[t.k] || '·'}</td>`).join('')}<td><b>${r.total}/${LD.MAX}</b></td><td>${r.pct}%</td><td><b style="font:900 26px var(--display)">${r.b}</b> <span class="mut" style="font-size:16px">${r.band}</span></td></tr>`).join('') || '<tr><td colspan="10" class="mut">Әзірге ұпай жоқ</td></tr>'}</tbody></table>`;
  }
  function openSet(tab) { OV.tab = tab || 'list'; full('', 'set'); renderSet(); }
  function renderSet() {
    const f = $('.full'); if (!f) return; const tab = OV.tab;
    let h = `<button class="x">✕</button><h2>⚙️ Баптау</h2><div class="tabs">${[['list', '👥 Тізім және топтар'], ['links', '🔗 QR · Firebase'], ['docs', '📁 Құжаттар'], ['opt', '🎛 Параметрлер']].map(([k, t]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${t}</button>`).join('')}<a class="btn sec" href="materialdar.html" target="_blank" style="text-decoration:none;font-size:18px;padding:10px 16px">📁 Материалдар</a></div>`;
    if (tab === 'list') h += `<div style="display:grid;grid-template-columns:.8fr 1.2fr;gap:24px;font-size:20px"><div><div class="mut" style="margin-bottom:8px">Әр жолға: <b>Аты-жөні - A/B/C</b> (A — озат, B — екпінді, C — қанағат). Топты өзіңіз бөлсеңіз — соңына топ нөмірін жазыңыз: <b>Ұлжан - 1</b> немесе <b>Ұлжан - A - 1</b>, сосын «⚖️» басыңыз. Тізім тек осы құрылғыда сақталады — бір рет енгізсеңіз жетеді.</div><textarea id="rost" style="width:100%;height:420px;font-size:20px;border:2px solid #E6EDE8;border-radius:16px;padding:12px;font-family:inherit" placeholder="Ұлжан - 1&#10;Аяна - 2&#10;Қарақат - A - 3">${esc(S.roster.map((p) => p.name + ' - ' + p.l + ' - ' + (p.g + 1)).join('\n'))}</textarea>
      <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap"><button class="btn" id="bal">⚖️ Топтарға бөлу</button><button class="btn sec" id="rebal">🔀 Араластыру</button></div></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;align-content:start">${LD.groups.map((g, gi) => { const m = S.roster.filter((p) => p.g === gi); return `<div style="border-radius:18px;padding:12px 14px;background:${g.soft};border:3px solid ${g.c}"><b style="color:${g.ink}">${g.icon} ${esc(g.name)}</b><div class="mut">${m.length} оқушы · Σ ${GT.groupSum(m)}</div>${m.map((p) => `<div style="display:flex;justify-content:space-between;margin-top:6px"><span>${esc(p.name)} <span class="lv lv${p.l}">${p.l}</span></span><span>${p.role ? role(p.role).icon : ''}</span></div>`).join('')}</div>`; }).join('')}</div></div>`;
    if (tab === 'links') h += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;text-align:center;font-size:18px">${[['quiz.html', '📱 Оқушылар: топ, квиз, кері байланыс', ''], ['hatshy.html', '📒 Хатшылар (әр топқа 1 телефон)', ''], ['quiz.html', '👩‍🏫 Қонақ мұғалімдер: пікір', '&guest=1']].map(([fl, t, ex]) => `<div style="background:#fff;border-radius:20px;padding:14px"><b>${t}</b><div class="qrbox" style="width:230px;height:230px;margin:10px auto">${GT.qr(link(fl, ex), 230)}</div><div class="mut" style="word-break:break-all;font-size:14px">${esc(link(fl, ex))}</div></div>`).join('')}
      <div style="background:#fff;border-radius:20px;padding:14px"><b>Сабақ коды</b><div style="font:900 48px var(--display);margin:10px 0">${esc(S.code)}</div><div class="mut">${S.db ? (S.db.demo ? 'Офлайн: телефондар қосылмайды — ұпайды 📋 «Нәтижелер»-ге енгізіңіз' : 'Firebase ✓ байланыс бар') : '…'}</div><button class="btn sec" id="newc" style="margin-top:12px">🆕 Жаңа сабақ (ұпайлар нөлденеді)</button></div></div>`;
    if (tab === 'docs') h += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">${[['📘', 'ҚМЖ (қысқа мерзімді жоспар)', 'materialdar/1-QMZh-Saryarqa', 'pdf docx'], ['📄', 'Жұмыс парақтары (№1–3)', 'materialdar/2-Zhumys-paraqtary', 'pdf docx']].map(([ic, t, f, ex]) => `<div style="background:#fff;border-radius:20px;padding:16px 18px;border:1px solid var(--line)"><div style="font-size:40px">${ic}</div><b style="font:800 21px var(--display)">${t}</b><div style="display:flex;gap:8px;margin-top:10px">${ex.split(' ').map((x) => `<a class="btn sec" style="text-decoration:none;padding:8px 14px;font-size:16px" href="${f}.${x}" target="_blank">${x.toUpperCase()}</a>`).join('')}</div></div>`).join('')}</div>
      <div style="margin-top:16px;font-size:19px;font-weight:700" class="mut">Критерийлер мен дескрипторлар — 📋 «Бағалау» панелінде · Мұғалім сөзі мен сабақ жоспары — 💬 панелінде · Барлық материал — <a href="materialdar.html" target="_blank">materialdar.html</a></div>`;
    if (tab === 'opt') h += `<div style="font-size:22px;display:flex;flex-direction:column;gap:16px;max-width:1100px">
      <label><input type="checkbox" id="oAuto" ${SET.autoTimer ? 'checked' : ''}> Экранға өткенде таймер өздігінен қосылсын</label>
      <label><input type="checkbox" id="oGuide" ${SET.guideAll ? 'checked' : ''}> Гид әр экранда сөйлесін (әйтпесе тек басы мен соңында)</label>
      <div><b>🎬 Басқа бейне</b> (қаласаңыз: YouTube сілтемесі немесе .mp4). Бос қалса — «Сарыарқа» кітапша-бейнесі көрсетіледі.<br><input type="text" id="oVideo" value="${esc(SET.videoUrl)}" placeholder="https://youtu.be/..." style="width:100%;font-size:20px;padding:12px;border-radius:12px;border:2px solid #E6EDE8;margin-top:8px"></div>
      <div><button class="btn sec" id="oReset">🧹 Тақтадағы ұпайларды тазалау (тізім сақталады)</button></div>
      <div class="mut" style="font-size:19px">Пернелер: ← → экран · Space таймер · M мұғалім сөзі · B бағалау · R рейтинг · T баптау · Esc жабу</div></div>`;
    f.innerHTML = h;
    $$('.tabs button', f).forEach((b) => b.onclick = () => { OV.tab = b.dataset.t; renderSet(); });
    if (tab === 'list') { const doBal = (sh) => { let list = GT.parseRoster($('#rost').value); if (!list.length) return banner('Тізім бос'); if (sh) list = list.map((p) => [Math.random(), p]).sort((a, b) => a[0] - b[0]).map((x) => x[1]); const out = []; const fixed = list.length && list.every((p) => p.fixG != null && p.fixG < LD.groups.length); const parts = fixed && !sh ? LD.groups.map((_, gi) => list.filter((p) => p.fixG === gi)) : GT.balance(list, LD.groups.length); if (fixed && !sh) banner('📌 Топтар тізімдегі нөмір бойынша сақталды'); parts.forEach((m, gi) => GT.assignRoles(m).forEach((p) => out.push(Object.assign(p, { g: gi })))); S.roster = out; LS.set('sa_roster', out); S.grouped = false; pushRoster(); renderSet(); if (['groups', 'debate'].includes(cur().id)) redraw(); live(); }; $('#bal').onclick = () => doBal(false); $('#rebal').onclick = () => doBal(true); }
    if (tab === 'links') $('#newc').onclick = async () => { if (!confirm('Жаңа код жасалады, ағымдағы ұпайлар көрінбейді. Жалғастырасыз ба?')) return; LS.set('sa_code', ''); S.bsc = {}; S.manual = {}; S.deb = { mode: 'prep', r: 0, crit: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], win: '' }; S.lab.ans = {}; ['sa_bsc', 'sa_manual', 'sa_lab'].forEach((k) => LS.set(k, {})); LS.set('sa_deb', S.deb); await connect(true); renderSet(); live(); };
    if (tab === 'opt') { const sv = () => LS.set('sa_set', SET); $('#oAuto').onchange = (e) => { SET.autoTimer = e.target.checked; sv(); }; $('#oGuide').onchange = (e) => { SET.guideAll = e.target.checked; sv(); }; $('#oVideo').onchange = (e) => { SET.videoUrl = e.target.value.trim(); sv(); if (cur().id === 'video') redraw(); };
      $('#oReset').onclick = () => { if (!confirm('Тақтадағы ұпайлар (K1, K2, K3, K4) өшеді. Жалғастырасыз ба?')) return; S.bsc = {}; S.deb = { mode: 'prep', r: 0, crit: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], win: '' }; S.lab.ans = {}; LS.set('sa_bsc', {}); LS.set('sa_deb', S.deb); LS.set('sa_lab', {}); live(); banner('🧹 Тазаланды'); }; }
  }
  function pushRoster() { if (S.db && S.code) setMeta({ roster: S.roster.map((p) => ({ name: p.name, g: p.g, role: p.role || '' })) }); }

  /* ---------- Firebase ---------- */
  let unsub = null;
  async function connect(fresh) {
    if (!S.db) S.db = await GT.backend();
    const db = S.db; let code = fresh ? '' : LS.get('sa_code', '');
    for (let t = 0; t < 5; t++) {
      if (!code) code = GT.PREFIX + String(Math.floor(1000 + Math.random() * 9000));
      let meta = null; try { meta = await db.get('games/' + code + '/meta'); } catch (e) {}
      if (!meta) { try { await db.update('games/' + code + '/meta', { host: db.uid, created: db.TS, lesson: 'saryarqa-8' }); break; } catch (e) { code = ''; continue; } }
      if (meta.host === db.uid) break; code = '';
    }
    S.code = code; LS.set('sa_code', code);
    if (unsub) unsub(); unsub = db.on('games/' + code, (v) => { S.game = v || {}; live(); });
    pushRoster(); setMeta({ stage: cur().id });
    if (['groups', 'quiz', 'end'].includes(cur().id)) redraw();
  }

  /* ---------- басқару ---------- */
  $('#bn').onclick = () => show(S.i + 1); $('#bp').onclick = () => show(S.i - 1);
  $('#prog').onclick = (e) => { const i = e.target.closest('i'); if (i) show(+i.dataset.k); };
  $('#bScript').onclick = openScript; $('#bAssess').onclick = () => openAssess(); $('#bRate').onclick = openRate; $('#bSet').onclick = () => openSet(); $('#bMat').onclick = () => window.open('materialdar.html', '_blank');
  addEventListener('keydown', (e) => {
    if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') return closeOV();
    if (OV.kind) { if (['m', 'b', 'r', 't', 'ь', 'и', 'к', 'е'].includes(k)) closeOV(); return; }
    if (k === 'arrowright' || k === 'pagedown') show(S.i + 1); else if (k === 'arrowleft' || k === 'pageup') show(S.i - 1);
    else if (k === ' ') { e.preventDefault(); tToggle(); } else if (k === 'm' || k === 'ь') openScript(); else if (k === 'b' || k === 'и') openAssess(); else if (k === 'r' || k === 'к') openRate(); else if (k === 't' || k === 'е') openSet();
  });
  const route = () => { const m = location.hash.match(/^#s(\d+)/); if (m) show(+m[1] - 1); if (location.hash === '#teacher') openSet(); };
  addEventListener('hashchange', route);
  show(S.i, { noAuto: true, force: true }); route();
  connect().catch((e) => { console.error(e); });
  window.GEAPP = { S, show, openRate, openAssess, openSet, openScript, rating };
})();
