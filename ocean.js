// shared helpers: iceberg slice shapes, eased scrolling, sea life, page fades
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

// phones get a chubbier iceberg so text has room
const NARROW = matchMedia('(max-width: 560px)');
const shapeW = w => NARROW.matches ? 100 - (100 - w) * 0.45 : w;

function clipFor(wt, wb, k){
  wt = shapeW(wt); wb = shapeW(wb);
  const j = k % 2 ? 1.4 : -1.2, mid = (wt + wb) / 4;
  return `polygon(${50-wt/2}% 0,${50+wt/2}% 0,${50+mid+j}% 50%,${50+wb/2}% 100%,${50-wb/2}% 100%,${50-mid-j}% 50%)`;
}
function shapeSlice(el){
  const wt = +el.dataset.wt, wb = +el.dataset.wb, k = +el.dataset.k;
  el.style.setProperty('--clip', clipFor(wt, wb, k));
  el.style.setProperty('--cw', Math.min(shapeW(wt), shapeW(wb)) - 9);
}
NARROW.addEventListener('change', () => document.querySelectorAll('.slice[data-wt]').forEach(shapeSlice));

// builds one iceberg slice; the first one sits above water
function makeSlice(l, k, extraClass){
  const el = document.createElement('section');
  el.className = 'slice' + (k === 0 ? ' above' : '') + (extraClass || '');
  el.id = 'L-' + l.id;
  el.style.setProperty('--k', k);
  Object.assign(el.dataset, {wt:l.wt, wb:l.wb, k});
  shapeSlice(el);
  el.style.setProperty('--tint', l.tint);
  el.style.setProperty('--deep0', (0.04 + k * 0.03).toFixed(2));
  el.style.setProperty('--deep1', (0.08 + k * 0.035).toFixed(2));
  el.innerHTML = '<div class="ice"><div class="lit"></div><div class="tintl"></div><div class="glow"></div><div class="shine"></div><div class="in"></div></div>';
  return el;
}

// swap a slice's content: fade out, resize the ice smoothly, fade in
function morph(el, apply){
  const ice = el.querySelector('.ice'), inn = el.querySelector('.in');
  const h0 = ice.offsetHeight;
  inn.classList.add('out');
  setTimeout(() => {
    apply();
    ice.style.transition = 'none'; ice.style.height = '';
    const h1 = ice.offsetHeight;
    ice.style.height = h0 + 'px'; void ice.offsetHeight;
    ice.style.transition = '';
    ice.style.height = h1 + 'px';
    requestAnimationFrame(() => inn.classList.remove('out'));
    setTimeout(() => { ice.style.height = ''; }, 750);
  }, 260);
}

// tiny vibration on phones that support it
const buzz = p => { try{ navigator.vibrate && navigator.vibrate(p); }catch(e){} };

function shine(el){
  const s = el && el.querySelector('.shine'); if(!s) return;
  s.classList.remove('run'); void s.offsetWidth; s.classList.add('run');
}

// eased scroll that centres an element (stops if the user scrolls themselves)
let glideRaf = 0;
function glide(el){
  if(!el) return;
  const r = el.getBoundingClientRect(), vh = innerHeight;
  const pad = r.height > vh - 140 ? 70 : (vh - r.height) / 2;
  const max = document.documentElement.scrollHeight - vh;
  const y1 = Math.max(0, Math.min(max, scrollY + r.top - pad)), y0 = scrollY, d = y1 - y0;
  if(Math.abs(d) < 4) return;
  if(REDUCE){ scrollTo(0, y1); return; }
  const dur = Math.min(1500, 550 + Math.abs(d) * 0.55), t0 = performance.now();
  const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
  cancelAnimationFrame(glideRaf);
  const step = now => {
    const t = Math.min(1, (now - t0) / dur);
    scrollTo(0, y0 + d * ease(t));
    if(t < 1) glideRaf = requestAnimationFrame(step);
  };
  glideRaf = requestAnimationFrame(step);
}
['wheel','touchstart','keydown'].forEach(ev => addEventListener(ev, () => cancelAnimationFrame(glideRaf), {passive:true}));

function sealife(box){
  [['🐟',12,26],['🐠',30,34],['🐡',52,40],['🐟',70,30],['🐠',86,45]].slice(0, NARROW.matches ? 3 : 5).forEach(([e, top, dur], i) => {
    const f = document.createElement('span'); f.className = 'fish';
    f.innerHTML = `<i>${e}</i>`;
    f.style.cssText = `top:${top}%;animation-duration:${dur}s;animation-delay:-${i * 7}s;font-size:${20 + (i % 3) * 6}px`;
    box.appendChild(f);
  });
  for(let i = 0; i < (NARROW.matches ? 8 : 14); i++){
    const b = document.createElement('span'); b.className = 'bub';
    const s = 6 + Math.random() * 12, left = i % 2 ? 2 + Math.random() * 10 : 88 + Math.random() * 10;
    b.style.cssText = `left:${left}%;width:${s}px;height:${s}px;animation-duration:${9 + Math.random() * 8}s;animation-delay:-${Math.random() * 12}s`;
    box.appendChild(b);
  }
}

// fade the page out before following links marked data-fade
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-fade]'); if(!a || REDUCE) return;
  e.preventDefault();
  document.body.classList.add('leaving');
  setTimeout(() => { location.href = a.href; }, 280);
});
addEventListener('pageshow', () => document.body.classList.remove('leaving'));

// app-style tab bar shared by every page: <nav class="tabbar" data-on="game"></nav>
const TABS = [['game','index.html','🎮','เล่น'],['me','me.html','🧊','ของฉัน'],['info','info.html','📖','ความรู้'],['script','script.html','🎭','บทละคร']];
document.querySelectorAll('nav.tabbar').forEach(nav => {
  nav.innerHTML = TABS.map(([id, href, e, t]) => id === nav.dataset.on
    ? `<a class="on" href="${href}" aria-current="page"><b>${e}</b>${t}</a>`
    : `<a href="${href}" data-fade><b>${e}</b>${t}</a>`).join('');
});
