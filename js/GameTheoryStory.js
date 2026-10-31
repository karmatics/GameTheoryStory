/*
 * ===================== DESIGN DECISIONS =====================
 * FORMAT   Scripted timeline of steps with deterministic goTo(n) rebuilding.
 * RECORD   • Focus Mode (F): hides chrome for pristine screen capture.
 *          • Presenter Prompter (P): floating teleprompter window with casual
 *            spoken riffs, stage direction cues, and retake controls.
 *          • Retake / Replay (R): instant step re-animation for voiceover takes.
 *          • Click-to-advance on stage for seamless wireless clicker/mouse recording.
 * KEYSTROKES Documented in-app via "⌨ Keys" button and the '?' / 'H' hotkey modal.
 * SANDBOX  Clicking avatars during dilemma/equilibrium steps lets users test defection
 *          live, watching payouts and the Nash stability test react in real time.
 * BRIDGE   Act 4 explicitly formalizes Mechanism Design (Reverse Game Theory),
 *          how voting/legislation is an Assurance Contract, and why post-labor
 *          coordination of automated abundance requires game-theoretic stability.
 * ============================================================
 */
class GameTheoryStory {
  static NAMES = ['Ana','Ben','Cora','Dev','Eli','Fay','Gus','Hana','Ivo','Jo'];
  static PATIENCE = [6,0,4,2,1,5,0,3,2,3];
  static SKIN = ['#f1c27d','#c68642','#8d5524','#e0ac69','#ffdbac','#a1665e','#f1c27d','#c68642','#e0ac69','#8d5524'];
  static SHIRT = ['#4a6fa5','#b5485d','#5b8c5a','#8e6bbf','#c9803c','#3d8b99','#7a5c58','#a35d8f','#5a7d3a','#c25b3a'];
  static COLORS = { grey:'#9aa5b1', green:'#2e9e5b', orange:'#f08a24', gold:'#d4a017', refunded:'#5b8def' };
  static ACTS = ['Setup','The Dilemma','Equilibrium','The Rule','The Post-Labor Lesson'];
  static WHO = { narrator:'Narrator', crane:'Mr. Crane', barnaby:'Barnaby Quill' };
  static WPM = 150;
  static NASH = {
    give: { name:'Everyone gives', pay:'+$4.00 each', test:'Switch to keeping, alone: +$0.50 gain', ok:false, badge:'HILLTOP (Unstable)' },
    keep: { name:'Nobody gives',   pay:'$0 each',     test:'Switch to giving, alone: −$0.50 loss', ok:true, badge:'NASH VALLEY (Stable)' },
    sign: { name:'Everyone signs', pay:'+$3.75 each', test:'Switch to refusing, alone: −$3.75 loss', ok:true, badge:'RULE EQUILIBRIUM (Stable)' }
  };
  static ART = { crane:'', barnaby:'', narrator:'', stage:'' };
  static PROMPTS = {
    style: 'Modern flat vector illustration, clean lines, friendly infographic style, soft pastel palette, minimalist tech aesthetic.',
    crane: 'A wealthy, curious eccentric gentleman in a tailored plum coat, top hat, monocle, sophisticated demeanor.',
    barnaby: 'An energetic traveling contract broker with a fedora, bowtie, pocket watch, holding a leather ledger and briefcase.',
    narrator: 'A vintage studio microphone icon or a modern broadcast narrator silhouette on a neutral slate backdrop.',
    stage: 'A quiet, modern open plaza with soft geometric tiling, warm ambient light, clean minimalist background.'
  };
  static FACES = {
    narrator: '<svg viewBox="0 0 72 72"><rect width="72" height="72" fill="#334155"/><rect x="29" y="14" width="14" height="26" rx="7" fill="#e2e8f0"/><path d="M22 34 Q22 50 36 50 Q50 50 50 34" fill="none" stroke="#e2e8f0" stroke-width="3"/><rect x="34" y="50" width="4" height="10" fill="#e2e8f0"/><rect x="26" y="60" width="20" height="4" rx="2" fill="#e2e8f0"/></svg>',
    crane: '<svg viewBox="0 0 72 72"><rect width="72" height="72" fill="#3b4a63"/><rect x="22" y="56" width="28" height="16" fill="#6b2d5c"/><circle cx="36" cy="40" r="16" fill="#f1c27d"/><rect x="25" y="12" width="22" height="18" rx="2" fill="#111"/><rect x="18" y="29" width="36" height="4" rx="2" fill="#111"/><circle cx="43" cy="38" r="5" fill="none" stroke="#d4a017" stroke-width="1.5"/><circle cx="30" cy="38" r="1.6" fill="#222"/><circle cx="43" cy="38" r="1.6" fill="#222"/><path d="M30 48 Q37 52 43 47" stroke="#7a3b2e" fill="none" stroke-width="1.6"/></svg>',
    barnaby: '<svg viewBox="0 0 72 72"><rect width="72" height="72" fill="#7a3b2e"/><rect x="20" y="56" width="32" height="16" fill="#2f3b52"/><circle cx="36" cy="40" r="16" fill="#e0ac69"/><path d="M20 32 Q36 6 52 32 Z" fill="#222"/><rect x="16" y="30" width="40" height="4" rx="2" fill="#222"/><circle cx="30" cy="39" r="1.7" fill="#222"/><circle cx="42" cy="39" r="1.7" fill="#222"/><path d="M28 46 Q36 55 44 46" stroke="#5a2a20" fill="#fff" stroke-width="1.6"/><path d="M30 44 Q36 42 42 44" stroke="#222" fill="none" stroke-width="2"/><path d="M36 56 L28 52 L28 60 Z M36 56 L44 52 L44 60 Z" fill="#c0392b"/></svg>'
  };

  static fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }

  async run(env) {
    if (!env || !env.container) throw new Error('[GameTheoryStory] run() requires env.container.');
    this.env = env;
    this.root = env.container;
    if (env.art) Object.assign(GameTheoryStory.ART, env.art);
    let m = env.mode;
    try { if (!m) m = new URLSearchParams(location.search).get('mode'); } catch (_) {}
    this.mode = m === 'short' ? 'short' : 'full';
    this.idx = 0; this.playing = false; this.speed = 1; this.k = 4; this.timer = null;
    this.focus = false; this.caps = true; this._lastPanel = null;
    this._sandboxOverrides = {}; // user interactive clicks { [avatarIndex]: 'bucket' | 'hand' }
    this._presenterDialog = null;

    const N = GameTheoryStory.NAMES;
    this.pos = N.map((_, i) => {
      const a = (-90 + i * 36) * Math.PI / 180;
      return { x: 320 + 235 * Math.cos(a), y: 235 + 165 * Math.sin(a) };
    });

    this._css();
    this._build();
    this._buildAll();
    this._setSteps(this.mode);
    this._labelModes();
    this._buildScript();
    this._bind();
    this._syncModeButtons();
    this.goTo(0);
  }

  destroy() {
    clearTimeout(this.timer);
    if (this._key) document.removeEventListener('keydown', this._key);
    if (this._presenterDialog && typeof this._presenterDialog.close === 'function') {
      this._presenterDialog.close();
    }
    if (this.root) { this.root.innerHTML = ''; this.root.classList.remove('gts-root', 'gts-focus', 'gts-nocap'); }
  }

  /* ---------------------------------------------------------- styles */
  _css() {
    const css = `
    .gts-root{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1f2937;padding:16px;max-width:1160px;margin:0 auto;box-sizing:border-box;background:#f4f6f9;min-height:100vh}
    .gts-root *{box-sizing:border-box}
    .gts-root button:focus-visible,.gts-root select:focus-visible,.gts-root input:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}
    .gts-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
    .gts-title{font-size:22px;font-weight:800;letter-spacing:-.01em}
    .gts-sub{font-size:13px;color:#64748b;margin-top:2px}
    .gts-tr{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .gts-mode{display:flex;border:1px solid #1e293b;border-radius:999px;overflow:hidden}
    .gts-mode button{border:0;background:#fff;padding:5px 14px;font-size:12px;font-weight:700;cursor:pointer;color:#1e293b}
    .gts-mode button.on{background:#1e293b;color:#fff}
    .gts-acts{display:flex;gap:6px;flex-wrap:wrap}
    .gts-acts button{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;color:#475569}
    .gts-acts button.on{background:#1e293b;color:#fff;border-color:#1e293b}
    .gts-main{display:flex;gap:14px;flex-wrap:wrap}
    .gts-stage{flex:1 1 480px;background:#fff;border:1px solid #dbe2ea;border-radius:14px;overflow:hidden;position:relative}
    .gts-svg{width:100%;height:auto;display:block;user-select:none;cursor:pointer}
    .gts-tally{padding:8px 14px;font-weight:600;color:#334155;background:#f8fafc;border-top:1px solid #e5eaf0;font-size:13px;min-height:38px;display:flex;justify-content:space-between;align-items:center}
    .gts-tally-hint{font-size:11px;color:#64748b;font-weight:500}
    .gts-panel{flex:0 1 360px;min-width:300px;background:#fff;border:1px solid #dbe2ea;border-radius:14px;padding:14px;min-height:300px}
    .gts-in{animation:gtsFade .35s}
    .gts-h{margin:0 0 8px;font-size:16px}
    .gts-h small{font-weight:400;color:#64748b;font-size:11px}
    .gts-empty{color:#94a3b8;font-size:13px;text-align:center;margin-top:90px}
    .gts-chart{width:100%;height:auto;display:block}
    .gts-axis{font-size:11px;color:#64748b;text-align:center;margin:2px 0 6px}
    .gts-range{width:100%}
    .gts-read{font-size:13px;line-height:1.5;margin-top:8px;color:#334155}
    .gts-read .g{color:#2e9e5b;font-weight:700}.gts-read .o{color:#d9730d;font-weight:700}.gts-read .r{color:#c0392b;font-weight:700}
    .gts-rules{padding-left:18px;margin:0 0 10px;font-size:14px;line-height:1.6}
    .gts-rules li{margin-bottom:6px}
    .gts-box{background:#f1f5f9;border-radius:8px;padding:8px 10px;font-size:13px}
    .gts-def{background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:8px 10px;font-size:13px;line-height:1.45;margin-bottom:10px}
    .gts-nr{border:1px solid #e2e8f0;border-left-width:5px;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:13px;line-height:1.4}
    .gts-nr.ok{border-left-color:#2e9e5b;background:#f0faf4}
    .gts-nr.no{border-left-color:#dc4c3e;background:#fdf2f0}
    .gts-nr.foc{box-shadow:0 0 0 2px rgba(30,41,59,.18)}
    .gts-nt{display:flex;justify-content:space-between;gap:8px}
    .gts-nt span{color:#64748b}
    .gts-ns{color:#334155;margin:2px 0}
    .gts-nb{font-weight:700;font-size:12px}
    .gts-nr.ok .gts-nb{color:#1f7a45}.gts-nr.no .gts-nb{color:#b73a2e}
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
    .gts-cap{margin-top:14px;display:flex;gap:14px;background:#1e293b;color:#f1f5f9;border-radius:14px;padding:14px 16px;align-items:center;min-height:96px}
    .gts-portrait{width:70px;height:70px;flex:none;border-radius:50%;overflow:hidden;background:#334155}
    .gts-portrait svg,.gts-portrait img{width:100%;height:100%;object-fit:cover;display:block}
    .gts-who{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#fbbf24;font-weight:700;margin-bottom:4px}
    .gts-text{font-size:17px;line-height:1.45;animation:gtsFade .4s}
    @keyframes gtsFade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
    .gts-ctl{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}
    .gts-ctl button,.gts-ctl select{border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:7px 12px;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
    .gts-ctl button:hover{background:#f1f5f9}
    .gts-ctl kbd{background:#f1f5f9;border:1px solid #cbd5e1;border-radius:4px;padding:1px 5px;font-size:10px;font-family:monospace;color:#64748b}
    .gts-scrub{flex:1 1 140px}
    .gts-count{font-size:12px;color:#64748b;min-width:54px;text-align:right}
    .gts-len{font-size:12px;color:#94a3b8;white-space:nowrap}
    .gts-prompts{margin-top:12px;background:#fff;border:1px solid #dbe2ea;border-radius:12px;padding:12px 14px;font-size:12px;line-height:1.5}
    .gts-prompts code{display:block;background:#f1f5f9;border-radius:6px;padding:6px 8px;margin:3px 0 8px;white-space:pre-wrap}
    .gts-script{margin-top:12px;position:relative;max-height:280px;overflow:auto;background:#fff;border:1px solid #dbe2ea;border-radius:12px;padding:0 6px 8px;font-size:13px;line-height:1.5}
    .gts-sbar{position:sticky;top:0;z-index:1;background:#fff;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 8px 6px;border-bottom:1px solid #e5eaf0}
    .gts-sbar span{font-size:12px;color:#64748b;font-weight:600}
    .gts-sbar button{border:1px solid #cbd5e1;background:#fff;border-radius:6px;padding:3px 10px;font-size:12px;cursor:pointer}
    .gts-sh{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:700;padding:10px 8px 2px}
    .gts-st{letter-spacing:0;text-transform:none;font-weight:500;color:#94a3b8}
    .gts-sl{padding:6px 8px;border-radius:8px;cursor:pointer}
    .gts-sl:hover{background:#f1f5f9}.gts-sl.on{background:#fef3c7}.gts-sl b{color:#92400e}
    .gts-exit{position:fixed;top:8px;right:8px;z-index:1000;border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.15)}
    .gts-focus .gts-top,.gts-focus .gts-ctl,.gts-focus .gts-script,.gts-focus .gts-prompts{display:none!important}
    .gts-nocap .gts-cap{display:none}
    .av{transition:opacity .35s;cursor:pointer}
    .av:hover .ring{stroke-width:6px}
    .avin{transition:transform .4s cubic-bezier(.3,.7,.3,1)}
    .ring{transition:stroke .35s,fill .35s}
    .coin{transition:transform .8s cubic-bezier(.3,.7,.3,1),opacity .4s}
    .gts-svg text{font-family:system-ui,sans-serif}
    .gts-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(3px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}
    .gts-modal-box{background:#fff;border-radius:14px;max-width:520px;width:100%;padding:20px;box-shadow:0 20px 40px rgba(0,0,0,0.3);border:1px solid #e2e8f0}
    .gts-modal-box h3{margin:0 0 12px;font-size:18px;display:flex;justify-content:space-between;align-items:center}
    .gts-kgrid{display:grid;grid-template-columns:auto 1fr;gap:8px 14px;align-items:center;font-size:13px;margin-bottom:16px}
    .gts-kgrid kbd{background:#f1f5f9;border:1px solid #cbd5e1;border-radius:4px;padding:3px 8px;font-family:monospace;font-weight:700;color:#1e293b;justify-self:start}
    @media (max-width:640px){
      .gts-root{padding:10px}
      .gts-title{font-size:19px}
      .gts-panel{flex-basis:100%}
      .gts-text{font-size:15px}
      .gts-portrait{width:50px;height:50px}
      .gts-cap{padding:10px;gap:10px}
      .gts-ctl button,.gts-ctl select{padding:5px 8px;font-size:12px}
    }
    @media (prefers-reduced-motion:reduce){
      .gts-root *,.gts-exit{animation:none!important;transition:none!important}
    }
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
      <button class="gts-exit" data-c="focus" hidden>🎬 Exit focus mode (F)</button>
      <div class="gts-top"><div><div class="gts-title">The Dollar in the Bucket</div>
        <div class="gts-sub">Game-Theoretic Stability, Mechanism Design & Post-Labor Coordination</div></div>
        <div class="gts-tr">
          <div class="gts-mode" role="group" aria-label="Version"><button data-mode="short" aria-pressed="false">Short</button><button data-mode="full" aria-pressed="false">Full</button></div>
          <div class="gts-acts" role="group" aria-label="Jump to act">${A.map((a, i) => `<button data-act="${i}">${a}</button>`).join('')}</div>
        </div></div>
      <div class="gts-main">
        <div class="gts-stage" title="Click stage to advance step (→), right click for (←)">${this._stageSVG()}
          <div class="gts-tally">
            <span class="gts-tally-main"></span>
            <span class="gts-tally-hint">💡 Tip: click any avatar to test defection</span>
          </div>
        </div>
        <div class="gts-panel"></div>
      </div>
      <div class="gts-cap"><div class="gts-portrait"></div>
        <div aria-live="polite" aria-atomic="true"><div class="gts-who"></div><div class="gts-text"></div></div></div>
      <div class="gts-ctl">
        <button data-c="restart" title="Restart (Home)" aria-label="Restart">⏮</button>
        <button data-c="prev" title="Back (← / Right Click)" aria-label="Previous step">◀</button>
        <button data-c="play" class="gts-play" title="Play / pause (Space)">▶ Play <kbd>Space</kbd></button>
        <button data-c="next" title="Forward (→ / Stage Click)" aria-label="Next step">▶| <kbd>→</kbd></button>
        <button data-c="replay" title="Replay current step animation (R)">↺ Retake <kbd>R</kbd></button>
        <input type="range" class="gts-scrub" min="0" max="0" value="0" aria-label="Story position">
        <span class="gts-count"></span>
        <span class="gts-len" title="Estimated read-aloud time at 150 WPM"></span>
        <select class="gts-speed" aria-label="Playback speed"><option value="0.7">0.7×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2.5">2.5×</option></select>
        <button data-c="prompter" style="font-weight:700;color:#0369a1;background:#f0f9ff;border-color:#bae6fd" title="Open floating teleprompter for video recording (P)">🎙 Prompter <kbd>P</kbd></button>
        <button data-c="focus" title="Hide controls for recording (F)">🎬 Focus <kbd>F</kbd></button>
        <button data-c="caps" title="Show / hide captions (C)">💬 Captions <kbd>C</kbd></button>
        <button data-c="keys" title="View keyboard shortcuts (?)">⌨ Keys <kbd>?</kbd></button>
        <button data-c="script">📜 Script</button>
        <button data-c="art">🎨 Prompts</button>
      </div>
      <div class="gts-script" hidden></div>
      <div class="gts-prompts" hidden></div>
      <div class="gts-keys-modal" hidden></div>`;

    const q = s => this.root.querySelector(s);
    this.el = { svg: q('.gts-svg'), tally: q('.gts-tally-main'), tallyWrap: q('.gts-tally'), panel: q('.gts-panel'), portrait: q('.gts-portrait'),
      who: q('.gts-who'), text: q('.gts-text'), count: q('.gts-count'), len: q('.gts-len'), scrub: q('.gts-scrub'), play: q('.gts-play'),
      speed: q('.gts-speed'), prompts: q('.gts-prompts'), script: q('.gts-script'), exit: q('.gts-exit'), keysModal: q('.gts-keys-modal'),
      acts: this.root.querySelectorAll('.gts-acts button'), modes: this.root.querySelectorAll('.gts-mode button') };

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
      bg: svg.querySelector('#gts-bg'), stabilityBadge: svg.querySelector('#gts-stability') };

    if (GameTheoryStory.ART.stage) this.s.bg.setAttribute('href', GameTheoryStory.ART.stage);
    const P = GameTheoryStory.PROMPTS || {};
    this.el.prompts.innerHTML = `<b>Art generation prompts:</b>
      <code>${P.style || 'Default clean vector style'}</code>` + ['crane', 'barnaby', 'narrator', 'stage'].map(k => `<b>${k}</b><code>${P[k] || 'Illustration of ' + k}</code>`).join('');
  }

  _labelModes() {
    const W = GameTheoryStory;
    this.el.modes.forEach(b => {
      const st = this._stats(b.dataset.mode);
      const name = b.dataset.mode === 'short' ? 'Short' : 'Full';
      b.textContent = `${name} · ${st.n}`;
      b.title = `${st.n} steps · about ${W.fmt(st.sec)} read aloud`;
    });
  }

  _buildScript() {
    const W = GameTheoryStory, box = this.el.script;
    box.innerHTML = '';
    this.scriptEls = [];
    const bar = document.createElement('div');
    bar.className = 'gts-sbar';
    const lab = document.createElement('span');
    lab.textContent = `Voiceover · ${this.mode === 'short' ? 'Short' : 'Full'} · ≈ ${W.fmt(this.totalSec)}`;
    const cp = document.createElement('button');
    cp.type = 'button';
    cp.textContent = 'Copy script';
    cp.addEventListener('click', () => this._copy(cp));
    bar.append(lab, cp);
    box.appendChild(bar);
    let last = -1;
    this.steps.forEach((s, i) => {
      if (s.act !== last) {
        last = s.act;
        const h = document.createElement('div');
        h.className = 'gts-sh';
        h.textContent = `Act ${s.act + 1} · ${W.ACTS[s.act]}`;
        const t = document.createElement('span');
        t.className = 'gts-st';
        t.textContent = ` · starts ≈ ${W.fmt(this.cum[i])}`;
        h.appendChild(t);
        box.appendChild(h);
      }
      const d = document.createElement('div');
      d.className = 'gts-sl';
      const b = document.createElement('b');
      b.textContent = W.WHO[s.who] + ': ';
      d.appendChild(b);
      d.appendChild(document.createTextNode(s.text));
      d.addEventListener('click', () => { this.playing = false; this.goTo(i); });
      box.appendChild(d);
      this.scriptEls.push(d);
    });
  }

  _scriptText() {
    const W = GameTheoryStory;
    let out = `THE DOLLAR IN THE BUCKET (${this.mode} version, about ${W.fmt(this.totalSec)} read aloud)\n`;
    let last = -1;
    this.steps.forEach(s => {
      if (s.act !== last) { last = s.act; out += `\n== ACT ${s.act + 1}: ${W.ACTS[s.act].toUpperCase()} ==\n`; }
      out += `${W.WHO[s.who]}: ${s.text}\n\n`;
    });
    return out;
  }

  async _copy(btn) {
    const t = this._scriptText();
    let ok = false;
    try { await navigator.clipboard.writeText(t); ok = true; }
    catch (_) {
      try {
        const ta = document.createElement('textarea');
        ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        ok = document.execCommand('copy'); ta.remove();
      } catch (__) {}
    }
    const old = 'Copy script';
    btn.textContent = ok ? 'Copied ✔' : 'Copy failed';
    setTimeout(() => { btn.textContent = old; }, 1600);
  }

  _stageSVG() {
    const N = GameTheoryStory.NAMES, SK = GameTheoryStory.SKIN, SH = GameTheoryStory.SHIRT;
    let s = `<svg class="gts-svg" viewBox="0 -24 640 504" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ten people around a bucket">
      <rect y="-24" width="640" height="504" fill="#fbfcfe"/>
      <image id="gts-bg" href="" x="0" y="-24" width="640" height="504" preserveAspectRatio="xMidYMid slice" opacity=".35"/>
      <ellipse cx="320" cy="235" rx="250" ry="180" fill="none" stroke="#dfe5ec" stroke-dasharray="4 8"/>
      <g id="gts-stability" style="opacity:0;transition:opacity .4s" transform="translate(320, 115)">
        <rect x="-120" y="-14" width="240" height="28" rx="14" fill="#1e293b" opacity=".92"/>
        <text y="4" text-anchor="middle" font-size="11" font-weight="800" fill="#f8fafc" letter-spacing=".04em"></text>
      </g>
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
        <text class="nt" y="62" text-anchor="middle" font-size="11" font-weight="800" fill="#64748b"></text></g>`;
    });
    N.forEach((n, i) => {
      s += `<g class="coin" data-i="${i}" style="transform:translate(${this.pos[i].x}px,${this.pos[i].y}px)">
        <circle r="8" fill="#f6c445" stroke="#b8860b" stroke-width="1.5"/><text y="3.5" text-anchor="middle" font-size="10" font-weight="800" fill="#7a5a2a">$</text></g>`;
    });
    s += `<text id="gts-burst" x="320" y="162" text-anchor="middle" font-size="24" font-weight="900" fill="#d4a017" stroke="#fff" stroke-width="4" paint-order="stroke" style="opacity:0;transition:opacity .5s"></text>
      <g id="gts-bubble" style="opacity:0;transition:opacity .3s"><rect rx="12" height="30" y="-16" fill="#fff" stroke="#334155" stroke-width="1.5"/><text y="4" text-anchor="middle" font-size="12" font-weight="600" fill="#1f2937"></text></g></svg>`;
    return s;
  }

  _bind() {
    this.root.querySelectorAll('button[data-c]').forEach(b => b.addEventListener('click', () => {
      const c = b.dataset.c;
      if (c === 'restart') { this.playing = false; this.goTo(0); }
      else if (c === 'prev') { this.playing = false; this.goTo(this.idx - 1); }
      else if (c === 'next') { this.playing = false; this.goTo(this.idx + 1); }
      else if (c === 'play') this._togglePlay();
      else if (c === 'replay') this.replayStep();
      else if (c === 'script') { this.el.script.hidden = !this.el.script.hidden; this._ui(); }
      else if (c === 'caps') this._toggleCaps();
      else if (c === 'focus') this._toggleFocus();
      else if (c === 'prompter') this._togglePresenterPrompter();
      else if (c === 'keys') this._toggleKeysModal();
      else if (c === 'art') this.el.prompts.hidden = !this.el.prompts.hidden;
    }));

    this.el.acts.forEach(b => b.addEventListener('click', () => this._jumpAct(+b.dataset.act)));
    this.el.modes.forEach(b => b.addEventListener('click', () => this._setMode(b.dataset.mode)));
    this.el.scrub.addEventListener('input', () => { this.playing = false; this.goTo(+this.el.scrub.value); });
    this.el.speed.addEventListener('change', () => { this.speed = +this.el.speed.value; this._schedule(); });

    // Stage Click-to-Advance (wireless presenter clicker & mouse workflow)
    this.el.svg.addEventListener('click', e => {
      const av = e.target.closest('.av');
      if (av) {
        e.stopPropagation();
        const id = +av.dataset.i;
        this._toggleAvatarSandbox(id);
        return;
      }
      this.playing = false;
      this.goTo(this.idx + 1);
    });

    this.el.svg.addEventListener('contextmenu', e => {
      e.preventDefault();
      this.playing = false;
      this.goTo(this.idx - 1);
    });

    // Keyboard events
    this._key = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const k = e.key;
      if (k === 'ArrowRight') { this.playing = false; this.goTo(this.idx + 1); }
      else if (k === 'ArrowLeft') { this.playing = false; this.goTo(this.idx - 1); }
      else if (k === 'Home') { this.playing = false; this.goTo(0); }
      else if (k === 'End') { this.playing = false; this.goTo(this.steps.length - 1); }
      else if (k === ' ' && tag !== 'BUTTON') { e.preventDefault(); this._togglePlay(); }
      else if (k === 'f' || k === 'F') this._toggleFocus();
      else if (k === 'c' || k === 'C') this._toggleCaps();
      else if (k === 'p' || k === 'P') this._togglePresenterPrompter();
      else if (k === 'r' || k === 'R') this.replayStep();
      else if (k === '?' || k === 'h' || k === 'H') this._toggleKeysModal();
      else if (k === 'Escape') {
        if (this._keysOpen) this._toggleKeysModal();
        else if (this.focus) this._toggleFocus();
      }
    };
    document.addEventListener('keydown', this._key);
  }

  replayStep() {
    this._sandboxOverrides = {};
    const cur = this.idx;
    this.idx = Math.max(0, cur - 1);
    this.goTo(cur);
  }

  _toggleAvatarSandbox(i) {
    const act = this.steps[this.idx].act;
    if (act !== 1 && act !== 2 && act !== 3) return;
    const curState = this.world.av[i].coin === 'bucket' ? 'bucket' : 'hand';
    const nextState = curState === 'bucket' ? 'hand' : 'bucket';
    this._sandboxOverrides[i] = nextState;
    this._applySandboxOverrides();
  }

  _applySandboxOverrides() {
    if (!this.world) return;
    const w = this.world;
    const overrides = this._sandboxOverrides;
    const act = this.steps[this.idx].act;

    Object.keys(overrides).forEach(idx => {
      const i = +idx;
      const to = overrides[i];
      if (act === 3) {
        w.av[i].status = to === 'bucket' ? 'gold' : 'orange';
        w.av[i].coin = to;
      } else {
        w.av[i].status = to === 'bucket' ? 'green' : 'orange';
        w.av[i].coin = to;
      }
    });

    const givers = w.av.filter(a => a.coin === 'bucket').length;
    if (act < 3) {
      w.potText = '$' + givers;
      const pot = givers * 5;
      const share = pot / 10;
      w.burst = `×5 = $${pot}`;
      w.tally = `[SANDBOX LIVE] Contributors: ${givers}/10 · Pot: $${pot} ($${share.toFixed(2)} split)`;
      w.av.forEach((a, idx) => {
        if (a.coin === 'bucket') {
          const net = share - 1;
          a.note = (net >= 0 ? '+$' : '−$') + Math.abs(net).toFixed(2);
          a.nc = net >= 0 ? '#2e9e5b' : '#c0392b';
        } else {
          a.note = `+$${share.toFixed(2)} (+1 kept)`;
          a.nc = '#d9730d';
        }
      });
    } else if (act === 3) {
      const signed = w.av.filter(a => a.status === 'gold').length;
      w.meter = signed;
      w.lock = signed === 10 ? 'unlocked' : 'locked';
      w.tally = signed === 10
        ? `[SANDBOX LIVE] 10 of 10 pledged! Threshold unlocked. Everyone nets +$3.75`
        : `[SANDBOX LIVE] ${signed}/10 pledged. Needs all 10. Deal inactive.`;
    }
    this.render(w);
  }

  _toggleKeysModal() {
    this._keysOpen = !this._keysOpen;
    const m = this.el.keysModal;
    if (!this._keysOpen) { m.hidden = true; m.innerHTML = ''; return; }
    m.hidden = false;
    m.className = 'gts-modal-overlay';
    m.innerHTML = `
      <div class="gts-modal-box">
        <h3><span>⌨ Keyboard Shortcuts</span><button type="button" class="gts-modal-close" style="border:0;background:none;font-size:20px;cursor:pointer">✕</button></h3>
        <div class="gts-kgrid">
          <kbd>Space</kbd><span>Play / Pause auto-advance</span>
          <kbd>→</kbd> / <kbd>Click Stage</kbd><span>Advance to next step</span>
          <kbd>←</kbd> / <kbd>Right Click</kbd><span>Go back one step</span>
          <kbd>R</kbd><span>Retake / Replay current step animation</span>
          <kbd>P</kbd><span>Toggle Presenter Teleprompter (for recording)</span>
          <kbd>F</kbd><span>Focus mode (clean screen capture)</span>
          <kbd>C</kbd><span>Toggle Captions</span>
          <kbd>Home</kbd> / <kbd>End</kbd><span>Jump to start / finish</span>
          <kbd>?</kbd> / <kbd>H</kbd><span>Show / hide this shortcut sheet</span>
        </div>
        <div style="font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px">
          💡 Click any avatar during Act 1 or 2 to test game-theoretic defection live.
        </div>
      </div>`;
    m.querySelector('.gts-modal-close').addEventListener('click', () => this._toggleKeysModal());
    m.addEventListener('click', e => { if (e.target === m) this._toggleKeysModal(); });
  }

  _togglePresenterPrompter() {
    if (this._presenterDialog) {
      if (typeof this._presenterDialog.close === 'function') this._presenterDialog.close();
      this._presenterDialog = null;
      return;
    }

    const pane = document.createElement('div');
    pane.className = 'gts-prompter-inner';
    pane.style.cssText = 'font-family:system-ui,sans-serif;color:#1e293b;padding:4px;';

    const updatePrompter = () => {
      const st = this.steps[this.idx];
      const W = GameTheoryStory;
      pane.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid rgba(0,0,0,0.08);padding-bottom:6px">
          <span style="font-size:11px;font-weight:700;color:#0284c7;text-transform:uppercase;letter-spacing:.06em">Act ${st.act + 1}: ${W.ACTS[st.act]} · Step ${this.idx + 1}/${this.steps.length}</span>
          <span style="font-size:11px;font-weight:600;color:#64748b">${W.fmt(this.cum[this.idx])}</span>
        </div>
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 12px;margin-bottom:10px">
          <div style="font-size:11px;font-weight:800;color:#0369a1;text-transform:uppercase;margin-bottom:4px">🎙 Spoken Riff (Casual Voiceover Delivery):</div>
          <div style="font-size:16px;line-height:1.45;color:#0c4a6e;font-weight:600">${st.riff || st.text}</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;margin-bottom:10px">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:3px">On-Screen Caption:</div>
          <div style="font-size:13px;line-height:1.4;color:#334155">${st.text}</div>
        </div>
        <div style="display:flex;gap:6px;justify-content:space-between;align-items:center;margin-top:10px;padding-top:6px;border-top:1px solid #e2e8f0">
          <div style="display:flex;gap:4px">
            <button class="gts-p-btn" data-a="prev" style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer">◀ Back</button>
            <button class="gts-p-btn" data-a="retake" style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer">↺ Retake (R)</button>
            <button class="gts-p-btn" data-a="next" style="padding:4px 12px;border-radius:6px;border:1px solid #0284c7;background:#0284c7;color:#fff;font-weight:700;cursor:pointer">Next ▶</button>
          </div>
          <button class="gts-p-btn" data-a="focus" style="padding:4px 8px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;font-size:11px;cursor:pointer">🎬 Focus (F)</button>
        </div>`;

      pane.querySelectorAll('button[data-a]').forEach(btn => {
        btn.addEventListener('click', () => {
          const a = btn.dataset.a;
          if (a === 'prev') { this.playing = false; this.goTo(this.idx - 1); }
          else if (a === 'next') { this.playing = false; this.goTo(this.idx + 1); }
          else if (a === 'retake') this.replayStep();
          else if (a === 'focus') this._toggleFocus();
        });
      });
    };

    if (typeof UITools !== 'undefined' && typeof UITools.makeDialog === 'function') {
      this._presenterDialog = UITools.makeDialog({
        title: 'Presenter Prompter (Teleprompter & Recording Companion)',
        content: pane,
        width: '440px',
        height: 'auto',
        position: [window.innerWidth > 900 ? window.innerWidth - 470 : 20, 40],
        allowMaximize: false,
        onClose: () => { this._presenterDialog = null; }
      });
    } else {
      const fallback = document.createElement('div');
      fallback.style.cssText = 'position:fixed;top:20px;right:20px;width:420px;background:#fff;border:2px solid #0284c7;border-radius:12px;padding:12px;box-shadow:0 12px 28px rgba(0,0,0,0.25);z-index:99999;';
      fallback.appendChild(pane);
      document.body.appendChild(fallback);
      this._presenterDialog = { close: () => fallback.remove() };
    }

    this._updatePrompter = updatePrompter;
    updatePrompter();
  }

  _toggleFocus() {
    this.focus = !this.focus;
    this.root.classList.toggle('gts-focus', this.focus);
    this.el.exit.hidden = !this.focus;
  }

  _toggleCaps() {
    this.caps = !this.caps;
    this.root.classList.toggle('gts-nocap', !this.caps);
  }

  _syncModeButtons() {
    this.el.modes.forEach(b => {
      const on = b.dataset.mode === this.mode;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  _setMode(m) {
    if (m === this.mode) return;
    const src = this.steps[this.idx].src;
    this.playing = false;
    this.mode = m;
    this._setSteps(m);
    this._buildScript();
    this._syncModeButtons();
    let j = 0;
    this.steps.forEach((s, i) => { if (s.src <= src) j = i; });
    this.goTo(j);
  }

  _jumpAct(a) { const i = this.steps.findIndex(s => s.act === a); this.goTo(i < 0 ? 0 : i); }
  _togglePlay() {
    if (!this.playing && this.idx >= this.steps.length - 1) this.idx = 0;
    this.playing = !this.playing; this.goTo(this.idx);
  }

  /* ---------------------------------------------------------- timeline */
  _world() {
    return { av: GameTheoryStory.NAMES.map(() => ({ status: 'grey', coin: 'hand', spot: false, bubble: '', note: '', nc: '', coinLabel: '$' })),
      box: 'bucket', lock: 'open', meter: null, burst: '', burstColor: '', tally: '', potText: '', panel: { type: 'none' }, who: 'narrator', bubble: null,
      stability: null };
  }

  goTo(i) {
    i = Math.max(0, Math.min(this.steps.length - 1, i));
    this.idx = i;
    this._sandboxOverrides = {};
    const w = this._world();
    for (let j = 0; j <= i; j++) {
      w.bubble = null; w.burst = ''; w.burstColor = ''; w.stability = null;
      w.av.forEach(a => { a.spot = false; a.note = ''; a.nc = ''; a.coinLabel = '$'; });
      w.who = this.steps[j].who;
      this.steps[j].fn(w);
    }
    this.world = w;
    this.render(w);
    this._ui();
    if (this._updatePrompter) this._updatePrompter();
    this._schedule();
  }

  _ui() {
    const W = GameTheoryStory, st = this.steps[this.idx], e = this.el;
    e.who.textContent = W.WHO[st.who];
    e.text.textContent = st.text;
    e.text.style.animation = 'none'; void e.text.offsetWidth; e.text.style.animation = '';
    const art = W.ART[st.who];
    e.portrait.innerHTML = art ? `<img src="${art}" alt="">` : W.FACES[st.who];
    e.acts.forEach(b => {
      const on = +b.dataset.act === st.act;
      b.classList.toggle('on', on);
      b.setAttribute('aria-current', on ? 'step' : 'false');
    });
    e.count.textContent = `${this.idx + 1} / ${this.steps.length}`;
    e.len.textContent = `≈ ${W.fmt(this.cum[this.idx])} / ${W.fmt(this.totalSec)}`;
    e.scrub.max = this.steps.length - 1; e.scrub.value = this.idx;
    e.play.innerHTML = this.playing ? '⏸ Pause' : (this.idx >= this.steps.length - 1 ? '↺ Replay' : '▶ Play <kbd>Space</kbd>');
    if (this.scriptEls) {
      this.scriptEls.forEach((d, k) => d.classList.toggle('on', k === this.idx));
      if (!e.script.hidden && this.scriptEls[this.idx]) e.script.scrollTop = Math.max(0, this.scriptEls[this.idx].offsetTop - 90);
    }
  }

  _schedule() {
    clearTimeout(this.timer);
    if (!this.playing) return;
    if (this.idx >= this.steps.length - 1) { this.playing = false; this._ui(); return; }
    const t = (2000 + this.steps[this.idx].text.length * 62) / this.speed;
    this.timer = setTimeout(() => this.goTo(this.idx + 1), t);
  }

  /* ---------------------------------------------------------- rendering */
  _coinPos(i, state) {
    const p = this.pos[i];
    if (state === 'bucket') return { x: 320 + ((i % 5) - 2) * 11, y: 236 + Math.floor(i / 5) * 12 };
    return { x: p.x + (320 - p.x) * 0.3, y: p.y + (235 - p.y) * 0.3 };
  }

  render(w) {
    const C = GameTheoryStory.COLORS;
    const anySpot = w.av.some(a => a.spot);

    w.av.forEach((a, i) => {
      const e = this.avEls[i];
      e.ring.setAttribute('stroke', C[a.status] || '#9aa5b1');
      e.ring.setAttribute('fill', a.status === 'grey' ? '#fff' : (C[a.status] || '#fff'));
      e.ring.setAttribute('fill-opacity', a.status === 'grey' ? 1 : 0.18);
      e.inner.style.transform = `scale(${a.spot ? 1.3 : 1})`;
      e.root.style.opacity = anySpot && !a.spot ? 0.45 : 1;
      e.note.textContent = a.note;
      e.note.setAttribute('fill', a.nc || (a.note.startsWith('+') ? '#2e9e5b' : (a.status === 'orange' ? '#d9730d' : '#475569')));
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
    this.s.burst.textContent = w.burst;
    this.s.burst.setAttribute('fill', w.burstColor || '#d4a017');
    this.s.burst.style.opacity = w.burst ? 1 : 0;

    // Stability Badge (Hilltop vs Nash Valley)
    if (w.stability) {
      this.s.stabilityBadge.style.opacity = 1;
      const t = this.s.stabilityBadge.querySelector('text');
      const r = this.s.stabilityBadge.querySelector('rect');
      t.textContent = w.stability.text;
      r.setAttribute('fill', w.stability.ok ? '#1e293b' : '#7f1d1d');
    } else {
      this.s.stabilityBadge.style.opacity = 0;
    }

    this._bubble(w.bubble);
    this.el.tally.innerHTML = w.tally || '&nbsp;';
    this.el.svg.setAttribute('aria-label', 'Ten people around a ' + (lock ? 'lockbox' : 'bucket') + (w.tally ? '. ' + w.tally : ''));
    this._panel(w);
  }

  _bubble(b) {
    const g = this.s.bubble;
    if (!b) { g.style.opacity = 0; return; }
    const p = this.pos[b.i], dx = p.x - 320, dy = p.y - 235, len = Math.hypot(dx, dy) || 1;
    const wd = Math.min(270, b.text.length * 6.8 + 24);
    let x = p.x + dx / len * 70, y = p.y + dy / len * 62;
    x = Math.max(wd / 2 + 8, Math.min(640 - wd / 2 - 8, x)); y = Math.max(4, Math.min(452, y));
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
    const changed = this._lastPanel !== p.type;
    this._lastPanel = p.type;
    switch (p.type) {
      case 'rules':
        el.innerHTML = `<h3 class="gts-h">The Offer</h3><ol class="gts-rules">
          <li>Each person may put <b>$1</b> in the bucket, or keep it.</li>
          <li>Mr. Crane multiplies the bucket by <b>5</b>.</li>
          <li>It's split <b>evenly among all 10</b>, givers and keepers alike.</li></ol>
          <div class="gts-box">All 10 give: $10 → $50 → <b>$5 each</b> (+$4 profit each).</div>`;
        break;
      case 'decision': {
        el.innerHTML = `<h3 class="gts-h">${p.name}'s Choice <small>net gain or loss, in dollars</small></h3>
          <svg viewBox="0 0 300 190" class="gts-chart"></svg>
          <div class="gts-axis">How many of the OTHER 9 put in a dollar?</div>
          <input type="range" class="gts-range" min="0" max="9" value="${this.k}" aria-label="How many of the other nine give"><div class="gts-read"></div>`;
        const svg = el.querySelector('svg'), rng = el.querySelector('input'), rd = el.querySelector('.gts-read');
        const upd = () => {
          const k = this.k;
          svg.innerHTML = this._decisionSVG(k);
          rd.innerHTML = `If <b>${k}</b> others chip in:<br><span class="g">Give: ${sg(0.5 * k - 0.5)}</span> &nbsp; <span class="o">Keep: ${sg(0.5 * k)}</span><br><b class="o">Keeping wins by $0.50 strictly every time.</b>`;
        };
        rng.addEventListener('input', () => { this.k = +rng.value; upd(); });
        upd();
        break;
      }
      case 'nash': {
        const NS = GameTheoryStory.NASH;
        const rows = (p.show || []).map(k => {
          const n = NS[k];
          return `<div class="gts-nr ${n.ok ? 'ok' : 'no'} ${k === p.focus ? 'foc' : ''}">
            <div class="gts-nt"><b>${n.name}</b><span>${n.pay}</span></div>
            <div class="gts-ns">${n.test}</div>
            <div class="gts-nb">${n.ok ? '✔ Stable · A Nash Equilibrium' : '✘ Unstable · Someone gains by defection'}</div></div>`;
        }).join('');
        el.innerHTML = `<h3 class="gts-h">Stability Check <small>can anyone gain by moving alone?</small></h3>
          ${p.def ? `<div class="gts-def"><b>Nash Equilibrium:</b> A state where no single person can gain by changing only their own choice. Systems settle <i>only</i> here.</div>` : ''}
          ${rows}`;
        break;
      }
      case 'matrix': {
        const hl = c => (p.hl || []).includes(c) ? 'hl' : '';
        el.innerHTML = `<h3 class="gts-h">${p.name}: Sign, or Don't?</h3>
          <table class="gts-mx"><tr><th></th><th>The other 9 all sign</th><th>Someone else balks</th></tr>
          <tr><th>I sign</th><td class="${hl('00')}">+$3.75<br><small>after Barnaby's fee</small></td><td class="${hl('01')}">$0<br><small>refunded</small></td></tr>
          <tr><th>I refuse</th><td class="${hl('10')}">$0<br><small>deal collapses</small></td><td class="${hl('11')}">$0<br><small>deal fails anyway</small></td></tr></table>
          <div class="gts-read">Refusing no longer lets you free-ride. It only torpedoes your own $3.75 payout.</div>`;
        break;
      }
      case 'ledger': {
        const rows = w.av.map((a, i) => {
          const c = a.status === 'gold' ? 's' : a.status === 'refunded' ? 'r' : '';
          const t = a.status === 'gold' ? 'held ✔' : a.status === 'refunded' ? 'refunded ✔' : '—';
          return `<div class="${c}"><b>${N[i]}</b><span>${t}</span></div>`;
        }).join('');
        const held = w.av.filter(a => a.status === 'gold').length;
        el.innerHTML = `<h3 class="gts-h">Barnaby's Ledger <small>escrow receipts</small></h3><div class="gts-led">${rows}</div>
          <div class="gts-read">Held in trust: <b>$${held} / $10</b><br>Fee: <b>$0.25</b>, charged <i>only if all 10 sign</i>.
          ${p.paid ? '<br>Fee collected: <b>$2.50</b>' : ''}</div>`;
        break;
      }
      case 'sim': {
        const c = left[p.upTo - 1], r = p.upTo;
        const txt = c === 0
          ? `Round ${r}: <b>Nobody</b> gives. Pot is $0.<br><span class="o">A lone giver would lose $0.50</span>`
          : `Round ${r}: <b>${c}</b> give. Each gets <b>$${(c / 2).toFixed(2)}</b>.<br>
          <span class="g">Givers net ${sg(c / 2 - 1)}</span> &nbsp; <span class="o">Free-riders net ${sg(c / 2)} (+1 kept)</span>`;
        el.innerHTML = `<h3 class="gts-h">Contributors Per Round</h3>` +
          this._lineChart({ n: 7, data: left, upTo: p.upTo, color: '#2e9e5b', title: 'Generous givers' }) +
          `<div class="gts-read">${txt}</div>`;
        break;
      }
      case 'sbs': {
        const L = this._lineChart({ n: 7, data: left, upTo: p.show >= 1 ? 7 : 0, color: '#d9730d', title: 'No broker (Altruism)', h: 130 });
        const Rg = this._lineChart({ n: 7, data: [10, 10, 10, 10, 10, 10, 10], upTo: p.show >= 2 ? 7 : 0, color: '#2e9e5b', title: 'With Lockbox (Mechanism)', h: 130 });
        el.innerHTML = `<h3 class="gts-h">Same People, Different Rules</h3>${L}${Rg}
          ${p.show >= 3 ? `<div class="gts-read">7-round profit:<br><span class="o">Altruism: $104 total</span><br><span class="g">Mechanism Design: $262.50 for the 10</span>, plus $17.50 broker fee</div>` : ''}`;
        break;
      }
      case 'takeaway':
        if (p.recap) {
          el.innerHTML = `<h3 class="gts-h">The Core Insight</h3>
            <ol class="gts-rules">
              <li><b>Systems settle strictly at equilibria:</b> Where no one can do better by moving alone.</li>
              <li><b>Rules rewrite payoffs:</b> An enforceable rule eliminates defection and shifts the stable point.</li>
              <li><b>Mechanism Design:</b> Don't try to change human nature. Build protocols where cooperation is the dominant move.</li></ol>`;
        } else {
          el.innerHTML = `<h3 class="gts-h">The Post-Labor & Voting Connection</h3>
            <ul class="gts-list">
              <li><b>Why Voting is an Assurance Contract:</b> When you vote for a tax or a public project, you agree to pay <i>if and only if</i> a quorum joins you. Voting removes the sucker's payoff!</li>
              <li><b>Post-Labor Abundance:</b> Automated abundance cannot be distributed through voluntary donation. Unaligned commons suffer immediate tragedy of defection.</li>
              <li><b>Game-Theoretic Stability:</b> In post-labor economies, protocols, smart contracts, and governance mechanisms must be mathematically stable.</li>
            </ul>
            ${p.fine ? `<div class="gts-fine"><b>Mechanism Design (Reverse Game Theory):</b> Instead of asking "how will people act?", we ask "what outcome do we need, and what incentive architecture makes that outcome the only stable equilibrium?"</div>` : ''}`;
        }
        break;
      default:
        el.innerHTML = `<div class="gts-empty">Interactive decision cards and stability checks appear here.</div>`;
    }
    if (changed) { el.classList.remove('gts-in'); void el.offsetWidth; el.classList.add('gts-in'); }
  }

  /* ---------------------------------------------------------- the script */
  _stepsFor(mode) {
    return this._all
      .filter(s => !s.only || s.only === mode)
      .map(s => ({ act: s.act, who: s.who, fn: s.fn, src: s.src, riff: s.riff, text: mode === 'short' && s.short ? s.short : s.text }));
  }

  _stats(mode) {
    const st = this._stepsFor(mode);
    const words = st.reduce((n, s) => n + s.text.trim().split(/\s+/).length, 0);
    return { n: st.length, sec: words / GameTheoryStory.WPM * 60 };
  }

  _setSteps(mode) {
    this.steps = this._stepsFor(mode);
    const wpm = GameTheoryStory.WPM;
    let acc = 0;
    this.cum = this.steps.map(s => { const t = acc / wpm * 60; acc += s.text.trim().split(/\s+/).length; return t; });
    this.totalSec = acc / wpm * 60;
  }

  _buildAll() {
    const P = GameTheoryStory.PATIENCE;
    const SHORT = () => this.mode === 'short';
    const roundCount = r => P.filter(p => p >= r).length;
    this._counts = [1, 2, 3, 4, 5, 6, 7].map(roundCount);
    const all = this._all = [];
    const add = (act, who, text, fn, o = {}) => all.push({ act, who, text, fn, only: o.only, short: o.short, riff: o.riff, src: all.length });
    const FULL = { only: 'full' };
    const setAll = (w, status, coin) => w.av.forEach(a => { a.status = status; a.coin = coin; });
    const fresh = w => { setAll(w, 'grey', 'hand'); w.box = 'bucket'; w.lock = 'open'; w.meter = null; w.potText = ''; };
    const lockBox = (w, st) => { w.box = 'lock'; w.lock = st || 'locked'; };
    const notes = (w, t, c) => w.av.forEach(a => { a.note = t; a.nc = c || ''; });
    const LOSS = '#c0392b', TEMPT = '#d9730d', GOOD = '#2e9e5b';
    const ben = 1, gus = 6, ana = 0, jo = 9;
    const sign = (w, ids) => { ids.forEach(i => { w.av[i].status = 'gold'; w.av[i].coin = 'bucket'; }); w.meter = w.av.filter(a => a.status === 'gold').length; };
    const base = w => { lockBox(w); w.panel = { type: 'ledger' }; };

    /* ---- ACT 0: setup ---- */
    add(0, 'narrator', 'Ten strangers. One empty bucket. And a very rich man who is curious what people will do.',
      w => { fresh(w); w.tally = 'Contributors: 0 / 10 · Pot: $0'; w.panel = { type: 'none' }; },
      { riff: 'Imagine ten people in a circle around an empty bucket, and an eccentric billionaire named Mr. Crane shows up with an experiment in human coordination.' });

    add(0, 'crane', '“Put a dollar in the bucket, or keep it. Whatever ends up in the bucket, I’ll multiply by five and split evenly among all ten of you, whether you gave or not. I’m merely curious.”',
      w => { fresh(w); w.panel = { type: 'rules' }; w.tally = 'Ten strangers · one bucket · $1 each'; },
      { riff: 'Crane makes an offer that sounds unbeatable: give a dollar, he multiplies the total pot by five, and splits it evenly among everyone—even those who gave nothing.' });

    add(0, 'narrator', 'If all ten give, ten dollars becomes fifty, and everyone gets five dollars back for the one they put in. That’s a four-dollar profit each.',
      w => { setAll(w, 'green', 'bucket'); w.box = 'bucket'; w.potText = '$10'; w.burst = '×5 = $50'; w.av.forEach(a => a.note = '+$4');
        w.tally = 'Contributors: 10 / 10 · Pot: $10 → $50'; w.panel = { type: 'rules' }; },
      { riff: 'If everyone cooperates, ten dollars turns into fifty. Everyone gets back five bucks. A clean four-dollar profit each. Cooperation looks like a no-brainer.' });

    /* ---- ACT 1: the dilemma ---- */
    add(1, 'narrator', 'So everyone chips in, right? Let’s zoom in on one person. This is Ben. What does his dollar actually do?',
      w => { fresh(w); w.av[ben].spot = true; w.bubble = { i: ben, text: 'Should I give?' };
        w.tally = 'Ben has $1 and a choice.'; w.panel = { type: 'decision', name: 'Ben' }; },
      { riff: 'It seems obvious they should all chip in. But game theory looks at individual incentives. Let’s sit in Ben’s seat and do the math on his single dollar.' });

    add(1, 'narrator', 'Ben’s dollar becomes five dollars in the bucket, but that gets split ten ways, so only fifty cents comes back to him. The other four-fifty goes to everyone else. Drag the slider: whatever the other nine do, keeping the dollar pays fifty cents more.',
      w => { fresh(w); w.av[ben].spot = true; w.panel = { type: 'decision', name: 'Ben' }; w.tally = 'Give: −$0.50 compared with keeping, every time.'; },
      { riff: 'Ben puts in a dollar. It becomes five in the pot. But that five gets split ten ways, so only fifty cents comes back into Ben’s pocket. The other $4.50 goes to the rest of the room. So holding on to his dollar always leaves him fifty cents richer.' });

    add(1, 'narrator', 'That’s the trap. Keeping is better for Ben no matter what anyone else does. And everyone else can run the same math.',
      w => { fresh(w); w.av[ben].status = 'orange'; w.av[ben].spot = true; w.bubble = { i: ben, text: 'Keep it. Always.' };
        w.panel = { type: 'decision', name: 'Ben' }; w.tally = 'Keeping wins, whatever the others do.'; },
      { ...FULL, riff: 'This is a dominant strategy trap: keeping strictly beats giving, no matter what everyone else decides. And every person in the room can do this exact math.' });

    // Round simulations with asymmetric free-rider visualization
    [
      [1, 'Now watch what happens over time. Round one: most people start out generous. Only Ben and Gus keep their dollar.',
        { riff: 'Round one: people start out well-meaning. Eight people chip in. But Ben and Gus keep their dollars and free-ride, pocketing more than anyone else.' }],
      [3, 'The givers notice that keepers earn fifty cents more every round. One by one, they stop giving. By round three, five are left.',
        { ...FULL, riff: 'The givers quickly realize they are being played for suckers. Keepers earn more every round. Givers drop out, and by round three the pot is bleeding out.' }],
      [5, 'Round five. The pot has shrunk, so everyone’s share has too. Two people are still giving, barely breaking even, while the keepers pocket a dollar each.',
        { ...FULL, riff: 'By round five, the pool has collapsed. Two loyal givers are barely breaking even, effectively subsidizing the eight free-riders.' }],
      [7, 'Round seven. Nobody gives. The bucket is empty.',
        { short: 'Seven rounds later, nobody gives and the bucket is empty. Nobody here is a villain. Everyone just did the math, and forty dollars of profit per round disappeared.',
          riff: 'By round seven, the bucket is bone dry. Nobody is evil here; nobody is stupid. They simply followed their incentives, and forty dollars of free wealth evaporated.' }]
    ].forEach(([r, t, o]) => add(1, 'narrator', t, w => {
      const c = this._counts[r - 1];
      fresh(w);
      const share = (c * 5) / 10;
      w.av.forEach((a, i) => {
        const g = P[i] >= r;
        a.status = g ? 'green' : 'orange';
        a.coin = g ? 'bucket' : 'hand';
        if (g) {
          const net = share - 1;
          a.note = (net >= 0 ? '+$' : '−$') + Math.abs(net).toFixed(2);
          a.nc = net >= 0 ? '#2e9e5b' : '#c0392b';
        } else {
          a.note = `+$${(share + 1).toFixed(2)}`;
          a.nc = '#d9730d';
        }
      });
      w.potText = '$' + c;
      w.tally = `Round ${r} · Contributors: ${c} / 10 · Pot: $${c}`;
      w.panel = { type: 'sim', upTo: r };
    }, o));

    add(1, 'narrator', 'Nobody here is a villain. Everyone just did the math, and the forty dollars of profit on the table every round disappeared.',
      w => { fresh(w); setAll(w, 'orange', 'hand'); w.tally = 'Potential profit per round: $40 · Actual: $0'; w.panel = { type: 'sim', upTo: 7 }; },
      { ...FULL, riff: 'This is the tragedy of uncoordinated public goods: a system of rational individuals settling on a collective disaster.' });

    add(1, 'crane', '“Predictable. This round, I owe you nothing. Do carry on.”',
      w => { fresh(w); setAll(w, 'orange', 'hand'); w.tally = 'Mr. Crane’s payout this round: $0'; w.panel = { type: 'sim', upTo: 7 }; },
      { ...FULL, riff: 'Crane sits back amused. He kept all his money because the group couldn’t solve their coordination problem.' });

    /* ---- ACT 2: equilibrium ---- */
    add(2, 'narrator', 'Look at where it settled. Now try to improve on it, one person at a time. If Ana alone put in a dollar, she’d get fifty cents back and lose the rest. The same is true for everyone. Nobody can do better by changing alone.',
      w => { const S = SHORT(); fresh(w); setAll(w, 'orange', 'hand'); notes(w, 'give: −$0.50', LOSS);
        w.burst = S ? 'Nash Equilibrium' : '✔ Stable'; w.burstColor = GOOD;
        w.stability = { text: 'NASH EQUILIBRIUM (Valley: Stable)', ok: true };
        w.tally = S ? 'Nash equilibrium = no one can gain by changing alone' : 'Nobody gives: no one gains by switching alone';
        w.panel = { type: 'nash', show: ['keep'], focus: 'keep', def: S }; },
      { riff: 'Look where they landed: zero dollars. Can anyone fix it alone? If Ana gallantly donates a dollar by herself, she gets fifty cents back and loses the rest. Nobody can improve their outcome by moving alone.' });

    add(2, 'narrator', 'Economists call this a Nash equilibrium: a situation where nobody can do better by changing only their own choice.',
      w => { fresh(w); setAll(w, 'orange', 'hand'); notes(w, 'give: −$0.50', LOSS);
        w.burst = 'Nash Equilibrium'; w.burstColor = GOOD; w.stability = { text: 'NASH EQUILIBRIUM (Stable)', ok: true };
        w.tally = 'Nash equilibrium = no one can gain by changing alone';
        w.panel = { type: 'nash', show: ['keep'], focus: 'keep', def: true }; },
      { ...FULL, riff: 'That is the definition of a Nash equilibrium. A state where nobody can gain by unilaterally switching strategies. Systems settle in equilibria like water settles at the bottom of a bowl.' });

    add(2, 'narrator', 'Now test the outcome everyone wanted, where all ten give. It looks wonderful, but can anyone do better alone? Yes. Keep the dollar, and gain fifty cents. So this outcome can’t last. It isn’t an equilibrium.',
      w => { fresh(w); setAll(w, 'green', 'bucket'); w.potText = '$10'; notes(w, 'keep: +$0.50', TEMPT);
        w.burst = '✘ Unstable'; w.burstColor = LOSS; w.stability = { text: 'UNSTABLE HILLTOP (Defection Wins)', ok: false };
        w.tally = 'Everyone gives: best for group, but unstable';
        w.panel = { type: 'nash', show: ['keep', 'give'], focus: 'give', def: true }; },
      { riff: 'Now test the cooperative ideal: everyone gives. It looks great, but is it stable? No! Anyone who sneaks their dollar back out gains fifty cents. It is a ball perched on top of a hill. It cannot hold.' });

    add(2, 'narrator', 'That’s the pattern. Outcomes that aren’t equilibria don’t last, because someone always has a reason to move. So groups slide toward a stable outcome, even when every single person would prefer somewhere else.',
      w => { fresh(w); setAll(w, 'orange', 'hand'); w.tally = 'Things settle where nobody can gain by moving alone.';
        w.stability = { text: 'NASH EQUILIBRIUM (Zero Profit)', ok: true };
        w.panel = { type: 'nash', show: ['keep', 'give'], def: true }; },
      { riff: 'Unstable outcomes roll downhill until they hit an equilibrium. Even if everyone hates where it lands, they are locked there unless the rules change.' });

    /* ---- ACT 3: the rule ---- */
    add(3, 'barnaby', '“Hold on, friends! Is that forty dollars I see lying on the ground?”',
      w => { fresh(w); w.tally = 'A stranger with a briefcase has entered.'; w.panel = { type: 'none' }; },
      { ...FULL, riff: 'Now comes Barnaby Quill. He is a traveling broker who realizes that leaving forty dollars on the table every round is pure economic waste.' });

    add(3, 'barnaby', '“Hand me your dollar. Not to spend, just to hold. If all ten of you hand one over, I deliver the bucket. If even one of you doesn’t, every dollar goes right back to its owner, with a receipt.”',
      w => { fresh(w); lockBox(w); w.meter = 0; w.tally = 'Escrow: $0 held · needs all 10'; w.panel = { type: 'ledger' }; },
      { riff: 'Barnaby introduces an assurance contract: Give him the dollar only into escrow. If all ten sign, the lockbox opens and goes to the bucket. If anyone balks, everyone gets their dollar back with zero penalty.' });

    add(3, 'barnaby', '“For my trouble, a quarter from each of you. But only if the deal goes through. Fail, and I earn nothing.”',
      w => { fresh(w); lockBox(w); w.meter = 0; w.tally = 'Barnaby’s fee: $0.25 each, only on success'; w.panel = { type: 'ledger' }; },
      { ...FULL, riff: 'Barnaby charges a quarter fee per head, but only upon successful completion. His incentive is aligned with making the deal work.' });

    add(3, 'narrator', 'Notice what changed. Nobody was asked to be nicer. The payoffs changed, meaning what each choice leads to. Here is Ben’s decision now.',
      w => { fresh(w); lockBox(w); w.meter = 0; w.av[ben].spot = true; w.panel = { type: 'matrix', name: 'Ben', hl: [] }; },
      { riff: 'Notice what just happened. Barnaby did not ask anyone to be a saint. He didn’t preach morality. He re-engineered the payoff matrix.' });

    add(3, 'narrator', 'If the other nine sign, Ben signing nets three seventy-five. Ben refusing nets nothing, because the deal collapses without him.',
      w => { fresh(w); lockBox(w); w.meter = 0; w.av[ben].spot = true;
        w.panel = { type: 'matrix', name: 'Ben', hl: SHORT() ? ['00', '10', '01', '11'] : ['00', '10'] }; },
      { riff: 'Look at Ben’s options now. If the other nine sign, Ben signing earns him $3.75 clean profit. Refusing doesn’t let him free-ride—it instantly kills the whole deal.' });

    add(3, 'narrator', 'If someone else balks, it makes no difference: signing gets Ben’s dollar back anyway. Signing never costs him a thing.',
      w => { fresh(w); lockBox(w); w.meter = 0; w.av[ben].spot = true; w.panel = { type: 'matrix', name: 'Ben', hl: ['01', '11'] }; },
      { ...FULL, riff: 'And if someone else refuses? Ben gets his dollar returned immediately. Signing is risk-free.' });

    add(3, 'narrator', 'Keeping your dollar used to mean freeloading on the others. Now it means sinking the whole deal, and your own payout with it.',
      w => { fresh(w); lockBox(w); w.meter = 0; w.av[ben].spot = true; w.bubble = { i: ben, text: 'Nothing left to free-ride on.' };
        w.panel = { type: 'matrix', name: 'Ben', hl: ['00', '10', '01', '11'] }; },
      { riff: 'The contract completely eliminated the sucker’s payoff. Refusing no longer lets you exploit the group; it just robs you of $3.75.' });

    add(3, 'narrator', 'Ana, the optimist, signs without a thought. Her dollar goes into the box, marked “held, not spent.”',
      w => { fresh(w); base(w); sign(w, [ana]); w.av[ana].spot = true; w.bubble = { i: ana, text: 'Costs me nothing.' }; w.tally = 'Escrow: $1 held · needs all 10'; }, FULL);

    add(3, 'narrator', 'Even the two cynics, Ben and Gus, sign. Refusing now only hurts themselves.',
      w => { fresh(w); base(w); sign(w, [ana, ben, gus]); w.bubble = { i: ben, text: 'Fine. Nothing to lose.' }; w.tally = 'Escrow: $3 held · needs all 10'; }, FULL);

    add(3, 'narrator', 'One by one the rest follow. Nine receipts are stamped. Only Jo is left.',
      w => { fresh(w); base(w); sign(w, [0, 1, 2, 3, 4, 5, 6, 7, 8]); w.av[jo].spot = true; w.bubble = { i: jo, text: 'Costs me nothing…' }; w.tally = 'Escrow: $9 held · needs all 10'; }, FULL);

    add(3, 'narrator', 'Ten of ten. The lockbox clicks open.',
      w => { fresh(w); base(w); sign(w, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]); w.lock = 'unlocked'; w.tally = 'Escrow: $10 held · threshold reached!'; },
      { riff: 'Ten of ten sign on. The contract threshold is reached, and the lockbox snaps open.' });

    add(3, 'narrator', 'Fifty dollars goes out. Each person gets five back, pays Barnaby his quarter, and keeps three seventy-five. Barnaby pockets two-fifty. Everyone is richer, and nobody had to become a better person.',
      w => { fresh(w); lockBox(w, 'unlocked'); w.meter = 10; w.panel = { type: 'ledger', paid: true };
        w.av.forEach(a => { a.status = 'green'; a.coin = 'hand'; a.coinLabel = '5'; a.note = '+$3.75'; });
        w.burst = '×5 = $50'; w.tally = 'Each nets $3.75 · Barnaby earns $2.50 · Mr. Crane pays $40'; },
      { riff: 'Fifty dollars pays out. Each person gets $5, pays Barnaby his quarter, and nets $3.75 profit. Barnaby pockets $2.50. Everyone wins, and nobody had to have a moral awakening.' });

    add(3, 'narrator', 'Now rewind. Suppose Jo had refused.',
      w => { fresh(w); base(w); sign(w, [0, 1, 2, 3, 4, 5, 6, 7, 8]); w.av[jo].status = 'orange'; w.av[jo].spot = true;
        w.bubble = { i: jo, text: 'Not me.' }; w.tally = 'Escrow: $9 held · only 9 of 10'; },
      { ...FULL, riff: 'Now test the failure mode: what if Jo refused?' });

    add(3, 'narrator', 'Nine signed, one didn’t. The deal is dead, so every dollar goes home, stamped “refunded.” The cost of trying was zero.',
      w => { fresh(w); lockBox(w, 'unlocked'); w.panel = { type: 'ledger' };
        w.av.forEach((a, i) => { if (i === jo) { a.status = 'orange'; a.note = 'kept $1'; } else { a.status = 'refunded'; a.coin = 'hand'; a.note = 'refunded'; } });
        w.tally = 'Deal failed · all dollars returned · nobody lost anything'; },
      { riff: 'Nine signed, one didn’t. The threshold failed, and all nine dollars go right back to their owners. The cost of trying was exactly zero.' });

    add(3, 'narrator', 'Now run the same stability test. Everyone signs. Could anyone do better by refusing alone? No. Refusing kills the deal and costs them three seventy-five. Nobody can gain by moving. It’s a Nash equilibrium again, and this time it’s the good one.',
      w => { fresh(w); lockBox(w, 'unlocked'); w.meter = 10; setAll(w, 'green', 'hand'); notes(w, 'refuse: −$3.75', LOSS);
        w.burst = '✔ Stable'; w.burstColor = GOOD; w.stability = { text: 'CONTRACT EQUILIBRIUM (Stable)', ok: true };
        w.tally = 'Everyone signs: stable, and better for all';
        w.panel = { type: 'nash', show: ['keep', 'give', 'sign'], focus: 'sign', def: true }; },
      { riff: 'Now check the stability: if everyone signs, can anyone gain by backing out alone? No, backing out costs you $3.75. So cooperation is now a true Nash equilibrium.' });

    /* ---- ACT 4: the lesson ---- */
    add(4, 'narrator', 'Same ten people. Same patience. Same dollar. First, with no broker: cooperation melts away.',
      w => { fresh(w); setAll(w, 'orange', 'hand'); w.tally = 'No broker (Altruism fails)'; w.panel = { type: 'sbs', show: 1 }; }, FULL);

    add(4, 'narrator', 'Now the same ten, with the lockbox. Everyone is in, every round.',
      w => { fresh(w); lockBox(w, 'unlocked'); setAll(w, 'green', 'hand'); w.tally = 'With Lockbox (Mechanism succeeds)'; w.panel = { type: 'sbs', show: 2 }; }, FULL);

    add(4, 'narrator', 'Over seven rounds: one hundred four dollars of profit without the broker. With him: two hundred sixty-two fifty for the ten, plus seventeen fifty for Barnaby.',
      w => { fresh(w); lockBox(w, 'unlocked'); setAll(w, 'green', 'hand'); w.tally = 'The contract created $176 of additional value'; w.panel = { type: 'sbs', show: 3 }; },
      { riff: 'Same people, same patience: $104 total under raw altruism versus $262.50 under the contract. The mechanism created over $170 of real wealth.' });

    add(4, 'crane', '“Two hundred eighty dollars over seven rounds. I’ve paid more for worse entertainment.”',
      w => { fresh(w); lockBox(w, 'unlocked'); setAll(w, 'green', 'hand'); w.tally = 'Mr. Crane pays $280 over seven rounds'; w.panel = { type: 'sbs', show: 3 }; }, FULL);

    add(4, 'barnaby', '“And I made seventeen-fifty for a signature and a stamp. Everybody wins, except, perhaps, the gentleman who was hoping you’d fail.”',
      w => { fresh(w); lockBox(w, 'unlocked'); setAll(w, 'green', 'hand'); w.panel = { type: 'sbs', show: 3 }; }, FULL);

    add(4, 'narrator', 'The lockbox is just one kind of rule. A contract with a penalty, a law with enforcement, a vote that binds everyone: each one changes what a choice costs, and that moves where the stable outcome is.',
      w => { fresh(w); lockBox(w, 'unlocked'); setAll(w, 'green', 'hand'); w.tally = 'Enforceable rules change the payoffs'; w.panel = { type: 'takeaway' }; },
      { riff: 'This lockbox is literally what a voting system or a law is: a contingent agreement where everyone commits only if enough people commit alongside them.' });

    add(4, 'narrator', 'This is the foundation of Mechanism Design and Post-Labor Economics. In an automated world of shared abundance, you cannot rely on good intentions. Systems must be engineered so that cooperation is mathematically stable.',
      w => { fresh(w); lockBox(w, 'unlocked'); setAll(w, 'green', 'hand'); w.tally = 'Mechanism design is the infrastructure of post-labor economics'; w.panel = { type: 'takeaway' }; },
      { riff: 'This connects directly to voting and post-labor economics. In a world of automated abundance, you can’t run society on good vibes. Mechanism design is the science of making abundance game-theoretically stable.' });

    add(4, 'narrator', 'You can’t fix a dilemma by asking people to be better. You change what each choice does, so that cooperating is the stable outcome. Don’t change the people. Change the rules.',
      w => { fresh(w); lockBox(w, 'unlocked'); setAll(w, 'green', 'hand'); w.tally = 'Don’t change the people. Change the rules.'; w.panel = { type: 'takeaway', recap: true }; },
      { riff: 'Never try to fix a coordination trap by asking people to be better. Change what the choices pay. Don’t change the people. Change the rules.' });
  }
}

globalThis.GameTheoryStory = GameTheoryStory;
if (typeof module !== 'undefined' && module.exports) module.exports = GameTheoryStory;