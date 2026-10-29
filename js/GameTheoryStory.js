/*
 * ===================== DESIGN DECISIONS =====================
 * FORMAT   Scripted timeline of steps. Each step = {act, who, text, fn(world)}.
 *          goTo(n) rebuilds the world from step 0..n, so back/forward/scrub are
 *          deterministic. `text` is the voiceover script. Swap in audio later.
 * GRAPHICS Live SVG stage (10 avatars, bucket / lockbox, coins, meter) + a side
 *          panel (rules, decision card, matrix, ledger, charts).
 *          Art slots (Nano Banana): GameTheoryStory.ART, or pass env.art = {crane, barnaby, narrator, stage}.
 *          The built-in SVG faces are fallbacks. The art-prompts button lists the prompts.
 * GAME     One game, never changes: $1 in, bucket x5, split 10 ways. Each dollar
 *          returns $0.50 to its giver, so keeping beats giving by $0.50 always.
 * CAST     MR. CRANE: bored billionaire running an experiment on human nature.
 *          Dry, amused, never says why. Expected to pay out almost nothing.
 *          BARNABY QUILL: Music Man / McBean con man. Charming, self-interested,
 *          takes a $0.25 fee ONLY on success, and accidentally dissolves the dilemma.
 * ACTS     0 Setup | 1 The Dilemma | 2 The Broker | 3 The Lesson
 * ============================================================
 */
class GameTheoryStory {
  static NAMES = ['Ana','Ben','Cora','Dev','Eli','Fay','Gus','Hana','Ivo','Jo'];
  // rounds each person keeps giving while watching others free-ride (0 = cynic from the start)
  static PATIENCE = [6,0,4,2,1,5,0,3,2,3];
  static SKIN = ['#f1c27d','#c68642','#8d5524','#e0ac69','#ffdbac','#a1665e','#f1c27d','#c68642','#e0ac69','#8d5524'];
  static SHIRT = ['#4a6fa5','#b5485d','#5b8c5a','#8e6bbf','#c9803c','#3d8b99','#7a5c58','#a35d8f','#5a7d3a','#c25b3a'];
  static COLORS = { grey:'#9aa5b1', green:'#2e9e5b', orange:'#f08a24', gold:'#d4a017', refunded:'#5b8def' };
  static ACTS = ['Setup','The Dilemma','The Broker','The Lesson'];
  static WHO = { narrator:'Narrator', crane:'Mr. Crane', barnaby:'Barnaby Quill' };
  static ART = { crane:'', barnaby:'', narrator:'', stage:'' };
  static PROMPTS = {
    style: 'STYLE (reuse for every image): flat vector storybook illustration, warm muted palette, soft shadows, clean outlines, square 1:1, plain background, no text.',
    crane: 'Mr. Crane: a bored, very rich gentleman in a velvet smoking jacket with a monocle, idly fanning a deck of banknotes, faint amused half-smile, curious rather than cruel.',
    barnaby: 'Barnaby Quill: a dapper 1910s traveling salesman con man (Music Man energy), striped suit, bowler hat, red bow tie, battered briefcase, rubber stamp and ledger, huge charming grin.',
    narrator: 'Narrator: a friendly vintage microphone with a small speech bubble, same palette.',
    stage: 'Stage backdrop (16:9): a quiet plaza at dusk with ten empty stools in a circle and a clear soft-lit center, very low contrast so avatars stay readable.'
  };
  static FACES = {
    narrator: '<svg viewBox="0 0 72 72"><rect width="72" height="72" fill="#334155"/><rect x="29" y="14" width="14" height="26" rx="7" fill="#e2e8f0"/><path d="M22 34 Q22 50 36 50 Q50 50 50 34" fill="none" stroke="#e2e8f0" stroke-width="3"/><rect x="34" y="50" width="4" height="10" fill="#e2e8f0"/><rect x="26" y="60" width="20" height="4" rx="2" fill="#e2e8f0"/></svg>',
    crane: '<svg viewBox="0 0 72 72"><rect width="72" height="72" fill="#3b4a63"/><rect x="22" y="56" width="28" height="16" fill="#6b2d5c"/><circle cx="36" cy="40" r="16" fill="#f1c27d"/><rect x="25" y="12" width="22" height="18" rx="2" fill="#111"/><rect x="18" y="29" width="36" height="4" rx="2" fill="#111"/><circle cx="43" cy="38" r="5" fill="none" stroke="#d4a017" stroke-width="1.5"/><circle cx="30" cy="38" r="1.6" fill="#222"/><circle cx="43" cy="38" r="1.6" fill="#222"/><path d="M30 48 Q37 52 43 47" stroke="#7a3b2e" fill="none" stroke-width="1.6"/></svg>',
    barnaby: '<svg viewBox="0 0 72 72"><rect width="72" height="72" fill="#7a3b2e"/><rect x="20" y="56" width="32" height="16" fill="#2f3b52"/><circle cx="36" cy="40" r="16" fill="#e0ac69"/><path d="M20 32 Q36 6 52 32 Z" fill="#222"/><rect x="16" y="30" width="40" height="4" rx="2" fill="#222"/><circle cx="30" cy="39" r="1.7" fill="#222"/><circle cx="42" cy="39" r="1.7" fill="#222"/><path d="M28 46 Q36 55 44 46" stroke="#5a2a20" fill="#fff" stroke-width="1.6"/><path d="M30 44 Q36 42 42 44" stroke="#222" fill="none" stroke-width="2"/><path d="M36 56 L28 52 L28 60 Z M36 56 L44 52 L44 60 Z" fill="#c0392b"/></svg>'
  };

  async run(env) {
    if (!env || !env.container) throw new Error('[GameTheoryStory] run() requires env.container.');
    this.env = env;
    this.root = env.container;
    if (env.art) Object.assign(GameTheoryStory.ART, env.art);
    this.idx = 0; this.playing = false; this.speed = 1; this.k = 4; this.timer = null;
    const N = GameTheoryStory.NAMES;
    this.pos = N.map((_, i) => {
      const a = (-90 + i * 36) * Math.PI / 180;
      return { x: 320 + 235 * Math.cos(a), y: 235 + 165 * Math.sin(a) };
    });
    this._css();
    this._build();
    this._buildSteps();
    this._bind();
    this.goTo(0);
  }

  destroy() {
    clearTimeout(this.timer);
    if (this._key) document.removeEventListener('keydown', this._key);
    if (this.root) this.root.innerHTML = '';
  }

  /* ---------------------------------------------------------- styles */
  _css() {
    const css = `
    .gts-root{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1f2937;padding:16px;max-width:1100px;margin:0 auto;box-sizing:border-box;background:#f4f6f9;min-height:100vh}
    .gts-root *{box-sizing:border-box}
    .gts-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
    .gts-title{font-size:22px;font-weight:800;letter-spacing:-.01em}
    .gts-acts{display:flex;gap:6px;flex-wrap:wrap}
    .gts-acts button{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;color:#475569}
    .gts-acts button.on{background:#1e293b;color:#fff;border-color:#1e293b}
    .gts-main{display:flex;gap:14px;flex-wrap:wrap}
    .gts-stage{flex:1 1 440px;background:#fff;border:1px solid #dbe2ea;border-radius:14px;overflow:hidden}
    .gts-svg{width:100%;height:auto;display:block}
    .gts-tally{padding:8px 14px;font-weight:600;color:#334155;background:#f8fafc;border-top:1px solid #e5eaf0;font-size:14px;min-height:36px}
    .gts-panel{flex:0 1 330px;min-width:280px;background:#fff;border:1px solid #dbe2ea;border-radius:14px;padding:14px;min-height:300px}
    .gts-h{margin:0 0 8px;font-size:16px}
    .gts-h small{font-weight:400;color:#64748b;font-size:11px}
    .gts-empty{color:#94a3b8;font-size:13px;text-align:center;margin-top:90px}
    .gts-chart{width:100%;height:auto;display:block}
    .gts-axis{font-size:11px;color:#64748b;text-align:center;margin:2px 0 6px}
    .gts-range{width:100%}
    .gts-read{font-size:13px;line-height:1.5;margin-top:8px;color:#334155}
    .gts-read .g{color:#2e9e5b;font-weight:700}.gts-read .o{color:#d9730d;font-weight:700}
    .gts-rules{padding-left:18px;margin:0 0 10px;font-size:14px;line-height:1.6}
    .gts-box{background:#f1f5f9;border-radius:8px;padding:8px 10px;font-size:13px}
    .gts-mx{width:100%;border-collapse:collapse;font-size:13px;text-align:center}
    .gts-mx th{font-size:11px;color:#64748b;font-weight:600;padding:6px}
    .gts-mx td{border:1px solid #e2e8f0;padding:12px 6px;font-weight:700;transition:background .3s}
    .gts-mx td small{font-weight:400;color:#64748b}
    .gts-mx td.hl{background:#fef3c7;outline:2px solid #f59e0b}
    .gts-led{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:8px 0;font-size:12px}
    .gts-led div{border:1px solid #e2e8f0;border-radius:6px;padding:5px 7px;display:flex;justify-content:space-between;gap:6px}
    .gts-led .s{background:#fef9e7;border-color:#e7c766}.gts-led .r{background:#eaf1ff;border-color:#9db9f5}
    .gts-led b{font-weight:700}
    .gts-list{padding-left:18px;margin:6px 0;font-size:13px;line-height:1.55}
    .gts-fine{margin-top:10px;font-size:12px;color:#64748b;border-top:1px dashed #cbd5e1;padding-top:8px;line-height:1.5}
    .gts-cap{margin-top:14px;display:flex;gap:14px;background:#1e293b;color:#f1f5f9;border-radius:14px;padding:14px 16px;align-items:center;min-height:100px}
    .gts-portrait{width:72px;height:72px;flex:none;border-radius:50%;overflow:hidden;background:#334155}
    .gts-portrait svg,.gts-portrait img{width:100%;height:100%;object-fit:cover;display:block}
    .gts-who{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#fbbf24;font-weight:700;margin-bottom:4px}
    .gts-text{font-size:18px;line-height:1.45;animation:gtsFade .5s}
    @keyframes gtsFade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
    .gts-ctl{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}
    .gts-ctl button,.gts-ctl select{border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:7px 12px;font-size:14px;cursor:pointer}
    .gts-ctl button:hover{background:#f1f5f9}
    .gts-scrub{flex:1 1 160px}
    .gts-count{font-size:12px;color:#64748b;min-width:54px;text-align:right}
    .gts-prompts{margin-top:12px;background:#fff;border:1px solid #dbe2ea;border-radius:12px;padding:12px 14px;font-size:12px;line-height:1.5}
    .gts-prompts code{display:block;background:#f1f5f9;border-radius:6px;padding:6px 8px;margin:3px 0 8px;white-space:pre-wrap}
    .av{transition:opacity .4s}.avin{transition:transform .5s cubic-bezier(.3,.7,.3,1)}
    .ring{transition:stroke .4s,fill .4s}
    .coin{transition:transform .9s cubic-bezier(.3,.7,.3,1),opacity .5s}
    .gts-svg text{font-family:system-ui,sans-serif}
    `;
    let s = document.getElementById('gts-styles');
    if (!s) { s = document.createElement('style'); s.id = 'gts-styles'; document.head.appendChild(s); }
    s.textContent = css;
  }

  /* ---------------------------------------------------------- DOM */
  _build() {
    const A = GameTheoryStory.ACTS;
    this.root.classList.add('gts-root');
    this.root.innerHTML = `
      <div class="gts-top"><div class="gts-title">The Dollar in the Bucket</div>
        <div class="gts-acts">${A.map((a, i) => `<button data-act="${i}">${a}</button>`).join('')}</div></div>
      <div class="gts-main">
        <div class="gts-stage">${this._stageSVG()}<div class="gts-tally"></div></div>
        <div class="gts-panel"></div>
      </div>
      <div class="gts-cap"><div class="gts-portrait"></div>
        <div><div class="gts-who"></div><div class="gts-text"></div></div></div>
      <div class="gts-ctl">
        <button data-c="restart" title="Restart">⏮</button>
        <button data-c="prev" title="Back">◀</button>
        <button data-c="play" class="gts-play">▶ Play</button>
        <button data-c="next" title="Forward">▶|</button>
        <input type="range" class="gts-scrub" min="0" max="0" value="0">
        <span class="gts-count"></span>
        <select class="gts-speed"><option value="0.7">0.7×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2.5">2.5×</option></select>
        <button data-c="replay">↺ Replay act</button>
        <button data-c="art">🎨 Art prompts</button>
      </div>
      <div class="gts-prompts" hidden></div>`;
    const q = s => this.root.querySelector(s);
    this.el = { svg: q('.gts-svg'), tally: q('.gts-tally'), panel: q('.gts-panel'), portrait: q('.gts-portrait'),
      who: q('.gts-who'), text: q('.gts-text'), count: q('.gts-count'), scrub: q('.gts-scrub'), play: q('.gts-play'),
      speed: q('.gts-speed'), prompts: q('.gts-prompts'), acts: this.root.querySelectorAll('.gts-acts button') };
    const svg = this.el.svg;
    this.avEls = GameTheoryStory.NAMES.map((_, i) => {
      const g = svg.querySelector(`.av[data-i="${i}"]`);
      return { root: g, inner: g.querySelector('.avin'), ring: g.querySelector('.ring'), note: g.querySelector('.nt') };
    });
    this.coinEls = GameTheoryStory.NAMES.map((_, i) => {
      const g = svg.querySelector(`.coin[data-i="${i}"]`);
      return { g, label: g.querySelector('text'), ring: g.querySelector('circle') };
    });
    this.s = { bucket: svg.querySelector('#gts-bucket'), lockbox: svg.querySelector('#gts-lockbox'),
      shackle: svg.querySelector('#gts-shackle'), meterG: svg.querySelector('#gts-meter'),
      meterRects: svg.querySelectorAll('#gts-meter rect'), meterTxt: svg.querySelector('#gts-metertxt'),
      pot: svg.querySelector('#gts-pot'), burst: svg.querySelector('#gts-burst'), bubble: svg.querySelector('#gts-bubble'),
      bg: svg.querySelector('#gts-bg') };
    if (GameTheoryStory.ART.stage) this.s.bg.setAttribute('href', GameTheoryStory.ART.stage);
    const P = GameTheoryStory.PROMPTS;
    this.el.prompts.innerHTML = `<b>Nano Banana prompts</b> (generate, host, then set <code style="display:inline;padding:1px 4px">GameTheoryStory.ART.crane = 'url'</code> etc.)
      <code>${P.style}</code>` + ['crane', 'barnaby', 'narrator', 'stage'].map(k => `<b>${k}</b><code>${P[k]}</code>`).join('');
  }

  _stageSVG() {
    const N = GameTheoryStory.NAMES, SK = GameTheoryStory.SKIN, SH = GameTheoryStory.SHIRT;
    let s = `<svg class="gts-svg" viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="480" fill="#fbfcfe"/>
      <image id="gts-bg" href="" x="0" y="0" width="640" height="480" preserveAspectRatio="xMidYMid slice" opacity=".35"/>
      <ellipse cx="320" cy="235" rx="250" ry="180" fill="none" stroke="#dfe5ec" stroke-dasharray="4 8"/>
      <g id="gts-bucket"><path d="M284 208 L356 208 L346 272 L294 272 Z" fill="#c9a26b" stroke="#7a5a2a" stroke-width="3"/>
        <ellipse cx="320" cy="208" rx="36" ry="7" fill="#7a5a2a"/>
        <path d="M290 208 Q320 150 350 208" fill="none" stroke="#7a5a2a" stroke-width="3"/></g>
      <g id="gts-lockbox" style="opacity:0;transition:opacity .5s">
        <g id="gts-shackle" style="transition:transform .6s"><path d="M308 212 V196 a12 12 0 0 1 24 0 V212" fill="none" stroke="#d4a017" stroke-width="5"/></g>
        <rect x="280" y="212" width="80" height="60" rx="8" fill="#3b4a63" stroke="#d4a017" stroke-width="3"/>
        <rect x="280" y="212" width="80" height="16" rx="8" fill="#2b374b"/><circle cx="320" cy="246" r="6" fill="#d4a017"/></g>
      <text id="gts-pot" x="320" y="292" text-anchor="middle" font-size="13" font-weight="700" fill="#7a5a2a"></text>
      <g id="gts-meter" style="opacity:0;transition:opacity .4s">
        ${Array.from({ length: 10 }, (_, i) => `<rect x="${250 + i * 14}" y="302" width="11" height="10" rx="2" fill="#e2e8f0"/>`).join('')}
        <text id="gts-metertxt" x="320" y="330" text-anchor="middle" font-size="11" fill="#64748b"></text></g>`;
    N.forEach((n, i) => {
      const p = this.pos[i];
      s += `<g class="av" data-i="${i}" transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})">
        <g class="avin"><circle class="ring" r="30" fill="#fff" stroke="#9aa5b1" stroke-width="4"/>
          <circle cy="-6" r="11" fill="${SK[i]}"/><path d="M-17 20 Q0 -2 17 20 Z" fill="${SH[i]}"/></g>
        <text y="48" text-anchor="middle" font-size="13" font-weight="700" fill="#334155">${n}</text>
        <text class="nt" y="62" text-anchor="middle" font-size="11" font-weight="700" fill="#64748b"></text></g>`;
    });
    N.forEach((n, i) => {
      s += `<g class="coin" data-i="${i}" style="transform:translate(${this.pos[i].x}px,${this.pos[i].y}px)">
        <circle r="8" fill="#f6c445" stroke="#b8860b" stroke-width="1.5"/><text y="3.5" text-anchor="middle" font-size="10" font-weight="800" fill="#7a5a2a">$</text></g>`;
    });
    s += `<text id="gts-burst" x="320" y="150" text-anchor="middle" font-size="30" font-weight="900" fill="#d4a017" stroke="#fff" stroke-width="4" paint-order="stroke" style="opacity:0;transition:opacity .5s"></text>
      <g id="gts-bubble" style="opacity:0;transition:opacity .3s"><rect rx="12" height="30" y="-16" fill="#fff" stroke="#334155" stroke-width="1.5"/><text y="4" text-anchor="middle" font-size="12" font-weight="600" fill="#1f2937"></text></g></svg>`;
    return s;
  }

  _bind() {
    this.root.querySelectorAll('.gts-ctl button').forEach(b => b.addEventListener('click', () => {
      const c = b.dataset.c;
      if (c === 'restart') { this.playing = false; this.goTo(0); }
      else if (c === 'prev') { this.playing = false; this.goTo(this.idx - 1); }
      else if (c === 'next') { this.playing = false; this.goTo(this.idx + 1); }
      else if (c === 'play') this._togglePlay();
      else if (c === 'replay') this._jumpAct(this.steps[this.idx].act);
      else if (c === 'art') this.el.prompts.hidden = !this.el.prompts.hidden;
    }));
    this.el.acts.forEach(b => b.addEventListener('click', () => this._jumpAct(+b.dataset.act)));
    this.el.scrub.addEventListener('input', () => { this.playing = false; this.goTo(+this.el.scrub.value); });
    this.el.speed.addEventListener('change', () => { this.speed = +this.el.speed.value; this._schedule(); });
    this._key = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'ArrowRight') { this.playing = false; this.goTo(this.idx + 1); }
      else if (e.key === 'ArrowLeft') { this.playing = false; this.goTo(this.idx - 1); }
      else if (e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); this._togglePlay(); }
    };
    document.addEventListener('keydown', this._key);
  }

  _jumpAct(a) { const i = this.steps.findIndex(s => s.act === a); this.goTo(i < 0 ? 0 : i); }
  _togglePlay() {
    if (!this.playing && this.idx >= this.steps.length - 1) this.idx = 0;
    this.playing = !this.playing; this.goTo(this.idx);
  }

  /* ---------------------------------------------------------- timeline */
  _world() {
    return { av: GameTheoryStory.NAMES.map(() => ({ status: 'grey', coin: 'hand', spot: false, bubble: '', note: '', coinLabel: '$' })),
      box: 'bucket', lock: 'open', meter: null, burst: '', tally: '', potText: '', panel: { type: 'none' }, who: 'narrator', bubble: null };
  }

  goTo(i) {
    i = Math.max(0, Math.min(this.steps.length - 1, i));
    this.idx = i;
    const w = this._world();
    for (let j = 0; j <= i; j++) {
      w.bubble = null; w.burst = '';
      w.av.forEach(a => { a.spot = false; a.note = ''; a.coinLabel = '$'; });
      w.who = this.steps[j].who;
      this.steps[j].fn(w);
    }
    this.world = w;
    this.render(w);
    this._ui();
    this._schedule();
  }

  _ui() {
    const st = this.steps[this.idx], e = this.el;
    e.who.textContent = GameTheoryStory.WHO[st.who];
    e.text.textContent = st.text;
    e.text.style.animation = 'none'; void e.text.offsetWidth; e.text.style.animation = '';
    const art = GameTheoryStory.ART[st.who];
    e.portrait.innerHTML = art ? `<img src="${art}" alt="">` : GameTheoryStory.FACES[st.who];
    e.acts.forEach(b => b.classList.toggle('on', +b.dataset.act === st.act));
    e.count.textContent = `${this.idx + 1} / ${this.steps.length}`;
    e.scrub.max = this.steps.length - 1; e.scrub.value = this.idx;
    e.play.textContent = this.playing ? '⏸ Pause' : '▶ Play';
  }

  _schedule() {
    clearTimeout(this.timer);
    if (!this.playing) return;
    if (this.idx >= this.steps.length - 1) { this.playing = false; this._ui(); return; }
    const t = (2800 + this.steps[this.idx].text.length * 50) / this.speed;
    this.timer = setTimeout(() => this.goTo(this.idx + 1), t);
  }

  /* ---------------------------------------------------------- rendering */
  _coinPos(i, state) {
    const p = this.pos[i];
    if (state === 'bucket') return { x: 320 + ((i % 5) - 2) * 10, y: 240 + Math.floor(i / 5) * 12 };
    return { x: p.x + (320 - p.x) * 0.38, y: p.y + (235 - p.y) * 0.38 };
  }

  render(w) {
    const C = GameTheoryStory.COLORS;
    const anySpot = w.av.some(a => a.spot);
    w.av.forEach((a, i) => {
      const e = this.avEls[i];
      e.ring.setAttribute('stroke', C[a.status]);
      e.ring.setAttribute('fill', a.status === 'grey' ? '#fff' : C[a.status]);
      e.ring.setAttribute('fill-opacity', a.status === 'grey' ? 1 : 0.18);
      e.inner.style.transform = `scale(${a.spot ? 1.3 : 1})`;
      e.root.style.opacity = anySpot && !a.spot ? 0.5 : 1;
      e.note.textContent = a.note;
      e.note.setAttribute('fill', a.note.startsWith('+') ? '#2e9e5b' : (a.status === 'orange' ? '#d9730d' : '#475569'));
      const c = this.coinEls[i], pos = this._coinPos(i, a.coin === 'bucket' ? 'bucket' : 'hand');
      c.g.style.transform = `translate(${pos.x}px,${pos.y}px)`;
      c.g.style.opacity = a.coin === 'gone' ? 0 : 1;
      c.label.textContent = a.coinLabel;
      c.ring.setAttribute('stroke-dasharray', a.status === 'gold' && a.coin === 'bucket' ? '3 2' : '0');
    });
    const lock = w.box === 'lock';
    this.s.bucket.style.opacity = lock ? 0 : 1;
    this.s.lockbox.style.opacity = lock ? 1 : 0;
    this.s.shackle.style.transform = w.lock === 'unlocked' ? 'translateY(-12px)' : 'translateY(0)';
    this.s.meterG.style.opacity = w.meter == null ? 0 : 1;
    this.s.meterRects.forEach((r, i) => r.setAttribute('fill', w.meter != null && i < w.meter ? '#d4a017' : '#e2e8f0'));
    this.s.meterTxt.textContent = w.meter == null ? '' : `Pledged ${w.meter}/10 · needs all 10`;
    this.s.pot.textContent = w.potText || '';
    this.s.burst.textContent = w.burst; this.s.burst.style.opacity = w.burst ? 1 : 0;
    this._bubble(w.bubble);
    this.el.tally.innerHTML = w.tally || '&nbsp;';
    this._panel(w);
  }

  _bubble(b) {
    const g = this.s.bubble;
    if (!b) { g.style.opacity = 0; return; }
    const p = this.pos[b.i], dx = p.x - 320, dy = p.y - 235, len = Math.hypot(dx, dy) || 1;
    const wd = Math.min(260, b.text.length * 6.6 + 24);
    let x = p.x + dx / len * 70, y = p.y + dy / len * 62;
    x = Math.max(wd / 2 + 8, Math.min(640 - wd / 2 - 8, x)); y = Math.max(26, Math.min(452, y));
    const r = g.querySelector('rect'); r.setAttribute('width', wd); r.setAttribute('x', -wd / 2);
    g.querySelector('text').textContent = b.text;
    g.setAttribute('transform', `translate(${x},${y})`);
    g.style.opacity = 1;
  }

  /* ---------------------------------------------------------- panels */
  _sg(v) { return (v < 0 ? '−$' : '+$') + Math.abs(v).toFixed(2); }

  _decisionSVG(k) {
    const W = 300, H = 190, L = 34, R = 12, T = 14, B = 30;
    const X = v => L + (v / 9) * (W - L - R), Y = v => T + (1 - (v + 0.5) / 5) * (H - T - B);
    const hold = v => 0.5 * v, give = v => 0.5 * v - 0.5;
    let s = '';
    [0, 1, 2, 3, 4].forEach(v => s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e5e7eb"/><text x="${L - 6}" y="${Y(v) + 3}" text-anchor="end" font-size="9" fill="#64748b">$${v}</text>`);
    for (let v = 0; v <= 9; v++) s += `<text x="${X(v)}" y="${H - 14}" text-anchor="middle" font-size="9" fill="#64748b">${v}</text>`;
    s += `<polyline fill="none" stroke="#d9730d" stroke-width="3" points="${Array.from({ length: 10 }, (_, v) => X(v) + ',' + Y(hold(v))).join(' ')}"/>`;
    s += `<polyline fill="none" stroke="#2e9e5b" stroke-width="3" points="${Array.from({ length: 10 }, (_, v) => X(v) + ',' + Y(give(v))).join(' ')}"/>`;
    s += `<line x1="${X(k)}" x2="${X(k)}" y1="${T}" y2="${H - B}" stroke="#334155" stroke-dasharray="3 3"/>`;
    s += `<circle cx="${X(k)}" cy="${Y(hold(k))}" r="5" fill="#d9730d"/><circle cx="${X(k)}" cy="${Y(give(k))}" r="5" fill="#2e9e5b"/>`;
    s += `<text x="${W - R}" y="${Y(hold(9)) - 6}" text-anchor="end" font-size="10" font-weight="700" fill="#d9730d">keep</text>`;
    s += `<text x="${W - R}" y="${Y(give(9)) + 14}" text-anchor="end" font-size="10" font-weight="700" fill="#2e9e5b">give</text>`;
    return s;
  }

  _lineChart(o) {
    const W = 300, H = o.h || 150, L = 30, R = 10, T = 16, B = 24, n = o.n;
    const X = i => L + (i / (n - 1)) * (W - L - R), Y = v => T + (1 - v / 10) * (H - T - B);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="gts-chart">`;
    [0, 5, 10].forEach(v => s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e5e7eb"/><text x="${L - 6}" y="${Y(v) + 3}" text-anchor="end" font-size="9" fill="#64748b">${v}</text>`);
    for (let i = 0; i < n; i++) s += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-size="9" fill="#64748b">${i + 1}</text>`;
    const pts = o.data.slice(0, o.upTo);
    if (pts.length) {
      s += `<polyline fill="none" stroke="${o.color}" stroke-width="3" points="${pts.map((v, i) => X(i) + ',' + Y(v)).join(' ')}"/>`;
      pts.forEach((v, i) => s += `<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="${o.color}"/>`);
    }
    s += `<text x="${L}" y="11" font-size="11" font-weight="700" fill="${o.color}">${o.title}</text></svg>`;
    return s;
  }

  _panel(w) {
    const p = w.panel, el = this.el.panel, sg = v => this._sg(v), N = GameTheoryStory.NAMES;
    const left = this._counts;
    switch (p.type) {
      case 'rules':
        el.innerHTML = `<h3 class="gts-h">The offer</h3><ol class="gts-rules">
          <li>Each person may put <b>$1</b> in the bucket, or keep it.</li>
          <li>Mr. Crane multiplies the bucket by <b>5</b>.</li>
          <li>It's split <b>evenly among all 10</b>, givers and keepers alike.</li></ol>
          <div class="gts-box">All ten give: $10 → $50 → <b>$5 each</b> (a $4 profit).</div>`;
        break;
      case 'decision': {
        el.innerHTML = `<h3 class="gts-h">${p.name}'s choice <small>net gain or loss, in dollars</small></h3>
          <svg viewBox="0 0 300 190" class="gts-chart"></svg>
          <div class="gts-axis">How many of the OTHER 9 put in a dollar?</div>
          <input type="range" class="gts-range" min="0" max="9" value="${this.k}"><div class="gts-read"></div>`;
        const svg = el.querySelector('svg'), rng = el.querySelector('input'), rd = el.querySelector('.gts-read');
        const upd = () => {
          const k = this.k;
          svg.innerHTML = this._decisionSVG(k);
          rd.innerHTML = `If <b>${k}</b> of the other 9 chip in:<br><span class="g">Give: ${sg(0.5 * k - 0.5)}</span> &nbsp; <span class="o">Keep: ${sg(0.5 * k)}</span><br><small>${k === 9 ? 'Even with everyone else in, keeping wins by $0.50.' : 'Keeping wins by $0.50.'}</small>`;
        };
        rng.addEventListener('input', () => { this.k = +rng.value; upd(); });
        upd();
        break;
      }
      case 'matrix': {
        const hl = c => (p.hl || []).includes(c) ? 'hl' : '';
        el.innerHTML = `<h3 class="gts-h">${p.name}: sign, or don't?</h3>
          <table class="gts-mx"><tr><th></th><th>The other 9 all sign</th><th>Someone else doesn't</th></tr>
          <tr><th>I sign</th><td class="${hl('00')}">+$3.75<br><small>after Barnaby's quarter</small></td><td class="${hl('01')}">$0<br><small>dollar refunded</small></td></tr>
          <tr><th>I don't</th><td class="${hl('10')}">$0<br><small>I killed the deal</small></td><td class="${hl('11')}">$0</td></tr></table>
          <div class="gts-read">Signing is never worse, and sometimes far better.</div>`;
        break;
      }
      case 'ledger': {
        const rows = w.av.map((a, i) => {
          const c = a.status === 'gold' ? 's' : a.status === 'refunded' ? 'r' : '';
          const t = a.status === 'gold' ? 'held ✔' : a.status === 'refunded' ? 'refunded ✔' : '—';
          return `<div class="${c}"><b>${N[i]}</b><span>${t}</span></div>`;
        }).join('');
        const held = w.av.filter(a => a.status === 'gold').length;
        el.innerHTML = `<h3 class="gts-h">Barnaby's ledger <small>receipts, stamped</small></h3><div class="gts-led">${rows}</div>
          <div class="gts-read">Held, not spent: <b>$${held}</b><br>Fee: <b>$0.25 each</b>, charged only if all ten sign.
          ${p.paid ? '<br>Fee collected: <b>$2.50</b>' : ''}</div>`;
        break;
      }
      case 'sim': {
        const c = left[p.upTo - 1], r = p.upTo;
        el.innerHTML = `<h3 class="gts-h">Contributors per round</h3>` +
          this._lineChart({ n: 7, data: left, upTo: p.upTo, color: '#2e9e5b', title: 'people who give' }) +
          `<div class="gts-read">Round ${r}: <b>${c}</b> give, so each person gets back <b>$${(c / 2).toFixed(2)}</b>.<br>
          <span class="g">Givers net ${sg(c / 2 - 1)}</span> &nbsp; <span class="o">Keepers net ${sg(c / 2)}</span></div>`;
        break;
      }
      case 'sbs': {
        const L = this._lineChart({ n: 7, data: left, upTo: p.show >= 1 ? 7 : 0, color: '#d9730d', title: 'No broker', h: 130 });
        const Rg = this._lineChart({ n: 7, data: [10, 10, 10, 10, 10, 10, 10], upTo: p.show >= 2 ? 7 : 0, color: '#2e9e5b', title: 'With Barnaby', h: 130 });
        el.innerHTML = `<h3 class="gts-h">Same people, same patience</h3>${L}${Rg}
          ${p.show >= 3 ? `<div class="gts-read">Total profit over 7 rounds:<br><span class="o">No broker: $104</span><br><span class="g">With Barnaby: $262.50</span> for the ten, plus $17.50 for him</div>` : ''}`;
        break;
      }
      case 'takeaway':
        el.innerHTML = `<h3 class="gts-h">Structures that make cooperating safe</h3>
          <ul class="gts-list"><li>All-or-nothing crowdfunding (Kickstarter)</li><li>Threshold petitions and strike pledges</li><li>Union cards that count only at a majority</li><li>Treaties that take effect when enough nations ratify</li></ul>
          ${p.fine ? `<div class="gts-fine"><b>Fine print.</b> "Nobody signs" is still a stable outcome unless someone sweetens the deal (a small bonus to signers if it fails). Trust also has to live somewhere, here in the contract, the ledger and the broker's fee.</div>` : ''}`;
        break;
      default:
        el.innerHTML = `<div class="gts-empty">Rules and decision cards appear here.</div>`;
    }
  }

  /* ---------------------------------------------------------- the script */
  _buildSteps() {
    const P = GameTheoryStory.PATIENCE, N = GameTheoryStory.NAMES;
    const roundCount = r => P.filter(p => p >= r).length;
    this._counts = [1, 2, 3, 4, 5, 6, 7].map(roundCount); // [8,7,5,3,2,1,0]
    const S = this.steps = [];
    const add = (act, who, text, fn) => S.push({ act, who, text, fn });
    const setAll = (w, status, coin) => w.av.forEach(a => { a.status = status; a.coin = coin; });
    const fresh = w => { setAll(w, 'grey', 'hand'); w.box = 'bucket'; w.lock = 'open'; w.meter = null; w.potText = ''; };
    const ben = 1, gus = 6, ana = 0, jo = 9;

    /* ---- ACT 0: setup ---- */
    add(0, 'narrator', 'Ten strangers. One empty bucket. And a man with far more money than he knows what to do with.',
      w => { fresh(w); w.tally = 'Contributors: 0 / 10 · Pot: $0'; });
    add(0, 'crane', '“Put a dollar in the bucket, or don’t. I’ll multiply whatever is in there by five and split it evenly among all ten of you, givers and keepers alike. I’m merely curious what you’ll do.”',
      w => { w.panel = { type: 'rules' }; });
    add(0, 'narrator', 'If all ten chip in, ten dollars becomes fifty. Everyone gets five dollars back for the one they gave: a four-dollar profit each.',
      w => { setAll(w, 'green', 'bucket'); w.potText = '$10'; w.burst = '×5 = $50'; w.av.forEach(a => a.note = '+$4');
        w.tally = 'Contributors: 10 / 10 · Pot: $10 → $50'; w.panel = { type: 'rules' }; });

    /* ---- ACT 1: the dilemma ---- */
    add(1, 'narrator', 'So everyone chips in, right? Zoom in on one person. Meet Ben. What does his dollar actually do?',
      w => { fresh(w); w.av[ben].spot = true; w.bubble = { i: ben, text: 'Should I give?' };
        w.tally = 'Ben has $1 and a choice.'; w.panel = { type: 'decision', name: 'Ben' }; });
    add(1, 'narrator', 'The fifty is split ten ways, so Ben’s dollar returns just fifty cents to him. The other forty-five of it goes to everyone else. Drag the slider: whatever the other nine do, keeping the dollar pays fifty cents better.',
      w => { fresh(w); w.av[ben].spot = true; w.panel = { type: 'decision', name: 'Ben' }; w.tally = 'Give: −$0.50 vs keep, every time.'; });
    add(1, 'narrator', 'That is the trap. Keeping is better for Ben no matter what anyone else does, and everyone else can run the same math.',
      w => { fresh(w); w.av[ben].status = 'orange'; w.av[ben].spot = true; w.bubble = { i: ben, text: 'Keep it. Always.' };
        w.panel = { type: 'decision', name: 'Ben' }; });
    const roundText = [
      'Round one. Most people start out generous. Ben and Gus keep their dollars from the start.',
      'The givers notice the keepers earning fifty cents more each round. For some, that is the last straw.',
      'The pot shrinks, so everyone’s share shrinks too. Giving starts to feel like being a sucker.',
      'Three left. They still come out ahead, but the keepers do better every single round.',
      'Two left, barely breaking even.',
      'One lone giver now loses fifty cents a round, for being decent.',
      'Round seven. Nobody gives anything. The bucket is empty.'];
    roundText.forEach((t, k) => add(1, 'narrator', t, w => {
      const r = k + 1, c = this._counts[k];
      fresh(w);
      w.av.forEach((a, i) => { const g = P[i] >= r; a.status = g ? 'green' : 'orange'; a.coin = g ? 'bucket' : 'hand'; });
      w.potText = '$' + c;
      w.tally = `Round ${r} · Contributors: ${c} / 10 · Pot: $${c}`;
      w.panel = { type: 'sim', upTo: r };
    }));
    add(1, 'narrator', 'Nobody here is a villain. Everyone did the math. And forty dollars of profit evaporated.',
      w => { fresh(w); setAll(w, 'orange', 'hand'); w.tally = 'Potential profit: $40 · Actual: $0'; w.panel = { type: 'sim', upTo: 7 }; });
    add(1, 'crane', '“Predictable. And I owe you nothing. Do carry on.”',
      w => { fresh(w); setAll(w, 'orange', 'hand'); w.tally = 'Mr. Crane pays out: $0'; w.panel = { type: 'sim', upTo: 7 }; });

    /* ---- ACT 2: the broker ---- */
    add(2, 'barnaby', '“Hold on, friends! Is that forty dollars I see lying on the ground?”',
      w => { fresh(w); w.tally = 'A stranger with a briefcase has entered.'; w.panel = { type: 'none' }; });
    add(2, 'barnaby', '“Hand me your dollar. Not to spend, just to hold. If all ten of you hand one over, I deliver the bucket. If even one of you doesn’t, every dollar goes right back to its owner, with a receipt.”',
      w => { fresh(w); w.box = 'lock'; w.lock = 'locked'; w.meter = 0; w.potText = ''; w.tally = 'Escrow: $0 held · needs all 10';
        w.panel = { type: 'ledger' }; });
    add(2, 'barnaby', '“For my trouble, a quarter from each of you. But only if the deal goes through. Fail, and I earn nothing.”',
      w => { fresh(w); w.box = 'lock'; w.lock = 'locked'; w.meter = 0; w.tally = 'Barnaby’s fee: $0.25 each, only on success'; w.panel = { type: 'ledger' }; });
    add(2, 'narrator', 'Notice what changed. Nobody was asked to be nicer. The rules of the choice changed. Here is Ben’s decision now.',
      w => { fresh(w); w.box = 'lock'; w.lock = 'locked'; w.meter = 0; w.av[ben].spot = true; w.panel = { type: 'matrix', name: 'Ben', hl: [] }; });
    add(2, 'narrator', 'If the other nine sign, Ben signing nets $3.75. Ben refusing nets nothing, because the deal collapses without him.',
      w => { fresh(w); w.box = 'lock'; w.lock = 'locked'; w.meter = 0; w.av[ben].spot = true; w.panel = { type: 'matrix', name: 'Ben', hl: ['00', '10'] }; });
    add(2, 'narrator', 'If someone else balks, it makes no difference: signing gets Ben’s dollar back anyway. Signing never costs him a thing.',
      w => { fresh(w); w.box = 'lock'; w.lock = 'locked'; w.meter = 0; w.av[ben].spot = true; w.panel = { type: 'matrix', name: 'Ben', hl: ['01', '11'] }; });
    add(2, 'narrator', 'Keeping your dollar used to mean freeloading on the others. Now it means sinking the whole deal, and your own payout with it.',
      w => { fresh(w); w.box = 'lock'; w.lock = 'locked'; w.meter = 0; w.av[ben].spot = true; w.bubble = { i: ben, text: 'Nothing left to free-ride on.' };
        w.panel = { type: 'matrix', name: 'Ben', hl: ['00', '10', '01', '11'] }; });
    const sign = (w, ids) => { ids.forEach(i => { w.av[i].status = 'gold'; w.av[i].coin = 'bucket'; }); w.meter = w.av.filter(a => a.status === 'gold').length; };
    const base = w => { w.box = 'lock'; w.lock = 'locked'; w.panel = { type: 'ledger' }; };
    add(2, 'narrator', 'Ana, the optimist, signs without a thought. Her dollar goes into the box, marked “held, not spent.”',
      w => { fresh(w); base(w); sign(w, [ana]); w.av[ana].spot = true; w.bubble = { i: ana, text: 'Costs me nothing.' }; w.tally = 'Escrow: $1 held · needs all 10'; });
    add(2, 'narrator', 'Even the two cynics, Ben and Gus, sign. Refusing now only hurts themselves.',
      w => { fresh(w); base(w); sign(w, [ana, ben, gus]); w.bubble = { i: ben, text: 'Fine. Nothing to lose.' }; w.tally = 'Escrow: $3 held · needs all 10'; });
    add(2, 'narrator', 'One by one the rest follow. Nine receipts are stamped. Only Jo is left.',
      w => { fresh(w); base(w); sign(w, [0, 1, 2, 3, 4, 5, 6, 7, 8]); w.av[jo].spot = true; w.bubble = { i: jo, text: 'Costs me nothing…' }; w.tally = 'Escrow: $9 held · needs all 10'; });
    add(2, 'narrator', 'Ten of ten. The lockbox clicks open.',
      w => { fresh(w); base(w); sign(w, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]); w.lock = 'unlocked'; w.tally = 'Escrow: $10 held · threshold reached!'; });
    add(2, 'narrator', 'Fifty dollars goes out. Each person gets five back, pays Barnaby his quarter, and keeps $3.75. Barnaby pockets $2.50. Everyone is richer, and nobody had to become a better person.',
      w => { fresh(w); w.box = 'lock'; w.lock = 'unlocked'; w.meter = 10; w.panel = { type: 'ledger', paid: true };
        w.av.forEach(a => { a.status = 'green'; a.coin = 'hand'; a.coinLabel = '5'; a.note = '+$3.75'; });
        w.burst = '×5 = $50'; w.tally = 'Each nets $3.75 · Barnaby earns $2.50 · Mr. Crane pays $40'; });
    add(2, 'narrator', 'Now rewind. Suppose Jo had refused.',
      w => { fresh(w); base(w); sign(w, [0, 1, 2, 3, 4, 5, 6, 7, 8]); w.av[jo].status = 'orange'; w.av[jo].spot = true;
        w.bubble = { i: jo, text: 'Not me.' }; w.tally = 'Escrow: $9 held · only 9 of 10'; });
    add(2, 'narrator', 'Nine signed, one didn’t. The deal is dead, so every dollar goes home, stamped “refunded.” The cost of trying was zero.',
      w => { fresh(w); w.box = 'lock'; w.lock = 'unlocked'; w.meter = null; w.panel = { type: 'ledger' };
        w.av.forEach((a, i) => { if (i === jo) { a.status = 'orange'; a.note = 'kept $1'; } else { a.status = 'refunded'; a.coin = 'hand'; a.note = 'refunded'; } });
        w.tally = 'Deal failed · all dollars returned · nobody lost anything'; });

    /* ---- ACT 3: the lesson ---- */
    add(3, 'narrator', 'Same ten people. Same patience. Same dollar. On the left, no broker: cooperation melts away.',
      w => { fresh(w); setAll(w, 'orange', 'hand'); w.tally = 'No broker'; w.panel = { type: 'sbs', show: 1 }; });
    add(3, 'narrator', 'On the right, with the lockbox, everyone is in, every round.',
      w => { fresh(w); w.box = 'lock'; w.lock = 'unlocked'; setAll(w, 'green', 'hand'); w.tally = 'With Barnaby'; w.panel = { type: 'sbs', show: 2 }; });
    add(3, 'narrator', 'Over seven rounds: $104 of profit without the broker. With him: $262.50 for the ten, plus $17.50 for Barnaby.',
      w => { fresh(w); w.box = 'lock'; w.lock = 'unlocked'; setAll(w, 'green', 'hand'); w.tally = 'Even after his fee, the group is far better off'; w.panel = { type: 'sbs', show: 3 }; });
    add(3, 'crane', '“Forty dollars. I’ve paid more for worse entertainment.”',
      w => { fresh(w); w.box = 'lock'; w.lock = 'unlocked'; setAll(w, 'green', 'hand'); w.panel = { type: 'sbs', show: 3 }; });
    add(3, 'barnaby', '“And I made two-fifty for a signature and a stamp. Everybody wins, except, perhaps, the gentleman who was hoping you’d fail.”',
      w => { fresh(w); w.box = 'lock'; w.lock = 'unlocked'; setAll(w, 'green', 'hand'); w.panel = { type: 'sbs', show: 3 }; });
    add(3, 'narrator', 'You can’t fix a dilemma by asking people to be better. You change what each choice does, so that cooperating is safe.',
      w => { fresh(w); w.box = 'lock'; w.lock = 'unlocked'; setAll(w, 'green', 'hand'); w.tally = 'Don’t change the people. Change the rules.'; w.panel = { type: 'takeaway' }; });
    add(3, 'narrator', 'One caution: trust has to live somewhere. Here it lives in a contract, a ledger, and a quarter-per-head fee for the man holding the box.',
      w => { fresh(w); w.box = 'lock'; w.lock = 'unlocked'; setAll(w, 'green', 'hand'); w.tally = 'The end.'; w.panel = { type: 'takeaway', fine: true }; });
  }
}

globalThis.GameTheoryStory = GameTheoryStory;
if (typeof module !== 'undefined' && module.exports) module.exports = GameTheoryStory;