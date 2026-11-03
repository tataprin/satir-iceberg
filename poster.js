/* ---------- poster: a story-sized (9:16) mini iceberg drawn on canvas ----------
   shared by the game (the play's iceberg) and me.html (your own iceberg).
   drawPoster({title, sub, layers}) — layers top → bottom, each {emo, name, tint, core, text} */
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };

// break text into lines that fit, on Thai word boundaries when the browser can
const WORDS = window.Intl && Intl.Segmenter ? new Intl.Segmenter('th', {granularity:'word'}) : null;
const GRAPH = window.Intl && Intl.Segmenter ? new Intl.Segmenter('th', {granularity:'grapheme'}) : null;
const pieces = (sg, t) => sg ? [...sg.segment(t)].map(x => x.segment) : [...t];
function wrapText(g, text, maxW, maxLines){
  const lines = []; let cur = '';
  for(const p of pieces(WORDS, text)){
    const t = cur + p;
    if(g.measureText(t).width <= maxW){ cur = t; continue; }
    if(cur.trim()) lines.push(cur.trim());
    cur = p.trimStart();
    // a single very long word: split it by characters
    while(g.measureText(cur).width > maxW){
      const gs = pieces(GRAPH, cur); let k = gs.length;
      while(k > 1 && g.measureText(gs.slice(0, k).join('')).width > maxW) k--;
      lines.push(gs.slice(0, k).join('')); cur = gs.slice(k).join('');
    }
  }
  if(cur.trim()) lines.push(cur.trim());
  if(lines.length <= maxLines) return {lines, cut:false};
  const keep = lines.slice(0, maxLines);
  let last = keep[maxLines - 1];
  while(last && g.measureText(last + '…').width > maxW) last = pieces(GRAPH, last).slice(0, -1).join('');
  keep[maxLines - 1] = last + '…';
  return {lines:keep, cut:true};
}

// iceberg widths (% of poster) per layer, top → bottom
const P_WIDTHS = [[58,66],[66,75],[75,81],[81,85],[85,86],[86,82],[82,73],[73,60]];
const P_TOP = 420, P_BOTTOM = 1690;

// measure every layer at font scale s; returns heights + wrapped lines
function layoutAt(g, layers, s, maxLines){
  let cut = false;
  const rows = layers.map((l, k) => {
    const [wt, wb] = P_WIDTHS[k], maxW = Math.min(wt, wb) / 100 * 1080 - 90;
    if(l.core){
      const size = Math.round(48 * s); g.font = `${size}px Itim`;
      const r = wrapText(g, l.text, maxW, maxLines);
      cut = cut || r.cut;
      return {size, lh:size * 1.42, lines:r.lines, h:(134 + 40) * s + r.lines.length * size * 1.42};
    }
    const size = Math.round(40 * s); g.font = `700 ${size}px Mali`;
    const r = wrapText(g, l.text, maxW, maxLines);
    cut = cut || r.cut;
    return {size, lh:size * 1.5, lines:r.lines, h:(62 + 48) * s + r.lines.length * size * 1.5};
  });
  return {rows, cut, total:rows.reduce((t, r) => t + r.h, 0)};
}
// biggest font scale whose layers fit the iceberg; if even small text is too long,
// keep fewer lines (ending in …) rather than squashing; spare room is shared out evenly
function fitLayout(g, layers){
  const room = P_BOTTOM - P_TOP;
  let L = null;
  for(let s = 1; s >= 0.52; s -= 0.04){ L = layoutAt(g, layers, s, 4); L.s = s; if(L.total <= room && !L.cut) break; }
  if(L.total > room || L.cut){
    for(const n of [4, 3, 2, 1]){ L = layoutAt(g, layers, 0.52, n); L.s = 0.52; if(L.total <= room) break; }
  }
  const extra = Math.max(0, room - L.total) / L.rows.length;
  L.rows.forEach(r => r.h += extra);
  let y = P_TOP;
  L.rows.forEach(r => { r.y0 = y; y += r.h; r.y1 = y; });
  return L;
}

async function drawPoster({title, sub, layers}){
  const W = 1080, H = 1920;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  // iPhone Safari ignored textAlign:'center' here and drew every line from the middle
  // to the right, so all text is centred by measuring it instead
  const rawFill = g.fillText.bind(g), rawStroke = g.strokeText.bind(g);
  g.fillText = (t, x, y) => { g.textAlign = 'left'; rawFill(t, x - g.measureText(t).width / 2, y); };
  g.strokeText = (t, x, y) => { g.textAlign = 'left'; rawStroke(t, x - g.measureText(t).width / 2, y); };
  try{ await Promise.all(['40px Itim', '700 40px Mali', '600 40px Mali'].map(f => document.fonts.load(f))); }catch(e){}
  const X = p => p / 100 * W;
  const circle = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  const poly = pts => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(X(x), y) : g.moveTo(X(x), y)); g.closePath(); };
  const L = fitLayout(g, layers), WATER = L.rows[0].y1;

  // sky + sea
  let gr = g.createLinearGradient(0, 0, 0, WATER);
  gr.addColorStop(0, '#a9dcff'); gr.addColorStop(1, '#eef8ff');
  g.fillStyle = gr; g.fillRect(0, 0, W, WATER);
  gr = g.createLinearGradient(0, WATER, 0, H);
  gr.addColorStop(0, '#7fd0ff'); gr.addColorStop(.22, '#46a6ea'); gr.addColorStop(.6, '#2477cc'); gr.addColorStop(1, '#0d2a66');
  g.fillStyle = gr; g.fillRect(0, WATER, W, H - WATER);
  g.save(); g.globalAlpha = .07; g.fillStyle = '#fff';
  for(let i = 0; i < 7; i++){ const x = 60 + i * 170; g.beginPath(); g.moveTo(x, WATER); g.lineTo(x + 70, WATER); g.lineTo(x - 140, WATER + 800); g.lineTo(x - 230, WATER + 800); g.fill(); }
  g.restore();

  // sun + clouds
  g.fillStyle = '#ffe27a'; circle(940, 120, 62); g.fillStyle = '#fff6b0'; circle(940, 120, 44);
  g.fillStyle = 'rgba(255,255,255,.95)';
  [[150, 110, 1], [800, 330, .7], [120, 390, .55]].forEach(([x, y, s]) => { circle(x, y, 34 * s); circle(x + 40 * s, y - 18 * s, 44 * s); circle(x + 90 * s, y, 34 * s); g.fillRect(x, y - 10 * s, 90 * s, 44 * s); });

  // title
  g.lineJoin = 'round';
  g.font = '96px Itim'; g.lineWidth = 16; g.strokeStyle = '#fff';
  g.strokeText(title, W / 2, 160); g.fillStyle = '#1d2b53'; g.fillText(title, W / 2, 160);
  g.font = '600 38px Mali'; g.fillStyle = '#4a5a86';
  g.fillText(sub, W / 2, 222);

  const iceFill = (tint, y) => {
    const f = g.createLinearGradient(0, y, W, y);
    f.addColorStop(0, mix(tint, '#7fb6e0', .55)); f.addColorStop(.38, tint); f.addColorStop(.62, mix(tint, '#ffffff', .5)); f.addColorStop(1, mix(tint, '#76afdc', .55));
    return f;
  };
  // peak
  poly([[21,420],[31,366],[36,378],[50,300],[58,350],[64,340],[79,420]]);
  g.fillStyle = iceFill('#ffffff', 400); g.fill();
  g.font = `72px ${EMOJI}`; g.fillText('🐧', W / 2, 310);

  layers.forEach((l, k) => {
    const [wt, wb] = P_WIDTHS[k], {y0, y1, size, lh, lines} = L.rows[k], s = L.s;
    const mid = (wt + wb) / 4, j = k % 2 ? 1.2 : -1, ym = (y0 + y1) / 2;
    const shape = () => poly([[50 - wt/2, y0], [50 + wt/2, y0], [50 + mid + j, ym], [50 + wb/2, y1], [50 - wb/2, y1], [50 - mid - j, ym]]);
    shape();
    if(l.core){
      const rg = g.createRadialGradient(W / 2, y0 + 70, 20, W / 2, y0 + 90, 420);
      rg.addColorStop(0, '#fffbe0'); rg.addColorStop(.45, '#ffe9a0'); rg.addColorStop(.8, '#f5cf6a'); rg.addColorStop(1, '#d9a93e');
      g.fillStyle = rg;
    } else g.fillStyle = iceFill(l.tint, y0);
    g.fill();
    if(k > 0 && !l.core){ shape(); g.fillStyle = `rgba(30,100,200,${0.03 + k * 0.025})`; g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(X(50 - wt/2), y0); g.lineTo(X(50 + wt/2), y0); g.stroke();

    // content is centred as one block inside its layer
    if(l.core){
      const y = ym - (134 * s + lines.length * lh) / 2;
      g.font = `${Math.round(66 * s)}px ${EMOJI}`; g.fillText('💛', W / 2, y + 60 * s);
      g.font = `600 ${Math.round(30 * s)}px Mali`; g.fillStyle = '#7a5a10'; g.fillText('✨ ถึงตัวฉัน ✨', W / 2, y + 104 * s);
      g.font = `${size}px Itim`; g.fillStyle = '#4a3500';
      lines.forEach((t, i) => g.fillText(t, W / 2, y + 134 * s + (i + 1) * lh - lh * .22));
    } else {
      const y = ym - (58 * s + lines.length * lh) / 2;
      g.font = `600 ${Math.round(30 * s)}px Mali`; g.fillStyle = '#4a5a86';
      g.fillText(`${l.emo} ${l.name}`, W / 2, y + 28 * s);
      g.font = `700 ${size}px Mali`; g.fillStyle = '#1d2b53';
      lines.forEach((t, i) => g.fillText(t, W / 2, y + 58 * s + (i + 1) * lh - lh * .22));
    }
  });
  // bottom tip
  poly([[30,P_BOTTOM],[38,P_BOTTOM + 40],[43,P_BOTTOM + 70],[50,P_BOTTOM + 110],[57,P_BOTTOM + 68],[63,P_BOTTOM + 38],[70,P_BOTTOM]]);
  g.fillStyle = '#5f98cc'; g.fill();

  // water surface over the waterline
  g.fillStyle = 'rgba(168,225,255,.55)';
  g.beginPath(); g.moveTo(0, WATER + 26);
  for(let x = 0; x <= W; x += 10) g.lineTo(x, WATER + Math.sin(x / 60) * 9);
  g.lineTo(W, WATER + 26); g.closePath(); g.fill();

  // sea life, kept to the edges so it never covers answers
  g.font = `52px ${EMOJI}`; g.fillText('🐟', 50, 900); g.fillText('🐠', 1035, 1260);
  g.font = `44px ${EMOJI}`; g.fillText('🫧', 1040, 780); g.fillText('🐡', 45, 1580);
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 3;
  [[40,1100,14],[70,1040,9],[1040,1420,12],[1015,1500,8],[1045,990,10]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); });

  // footer
  g.font = '600 32px Mali'; g.fillStyle = 'rgba(255,255,255,.88)';
  g.fillText('🧊 ภูเขาน้ำแข็งในใจ', W / 2, 1878);
  return c;
}

// show a finished canvas in <img id>, and keep a blob for saving/sharing
function showPoster(c, img, done){
  img.src = c.toDataURL('image/png');
  c.toBlob(done, 'image/png');
  requestAnimationFrame(() => img.parentNode.classList.add('ready'));
}
function savePoster(blob, name){
  if(!blob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function sharePoster(blob, name, title, text){
  if(!blob) return;
  const file = new File([blob], name, {type:'image/png'});
  try{
    if(navigator.canShare && navigator.canShare({files:[file]})) await navigator.share({files:[file], title, text});
    else savePoster(blob, name);
  }catch(e){}
}
