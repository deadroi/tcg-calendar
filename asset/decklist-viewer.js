(() => {
const DATA_BASE = 'data/';
const decklistCache = {};
function escapeHtml(s){return String(s==null?"":s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
async function loadDeck(rid) {
  if (rid in decklistCache) return decklistCache[rid];
  try {
    const r = await fetch(DATA_BASE + 'decklists/' + rid + '.json?v=' + (window._cacheVer || Date.now()));
    decklistCache[rid] = r.ok ? await r.json() : null;
  } catch (_) { decklistCache[rid] = null; }
  return decklistCache[rid];
}
function visibleDeckCards(cards) {
  const confirmed = cards.filter(c => c.확정);
  if (!confirmed.some(c => c.카드종류 === '캐릭터' || c.카드종류 === '액션')) return confirmed;
  const compareText = (a,b) => String(a||'').localeCompare(String(b||''),'ko',{numeric:true});
  const characterCounts = new Map();
  for (const c of confirmed.filter(c => c.카드종류 === '액션')) {
    const name = String(c.캐릭터 || '').trim();
    if (!name || name === '일반' || name === '-') continue;
    if (!characterCounts.has(name)) characterCounts.set(name, new Set());
    characterCounts.get(name).add(c.번호 || c.이름);
  }
  // 표시용 요약: 실제 검출된 캐릭터 카드나 장수를 의미하지 않는다.
  const characters = [...characterCounts.entries()]
    .sort((a,b)=>b[1].size-a[1].size || compareText(a[0],b[0])).slice(0,3)
    .map(([name,numbers])=>({카드종류:'캐릭터',캐릭터:name,이름:name,action_type_count:numbers.size}));
  const colors = {'적색':0,'청색':1,'녹색':2};
  const actions = confirmed.filter(c=>c.카드종류 !== '캐릭터').sort((a,b)=>
    compareText(a.캐릭터,b.캐릭터)
    || (colors[a.색상] ?? 3) - (colors[b.색상] ?? 3)
    || compareText(a.색상,b.색상)
    || (a.COST == null ? Infinity : Number(a.COST)) - (b.COST == null ? Infinity : Number(b.COST))
    || compareText(a.번호,b.번호));
  return [...characters,...actions];
}
function deckListHtml(entry) {
  if (!entry || !entry.decks || !entry.decks.length) return "";
  let html = "";
  const decks = entry.decks.filter(d => d.cards.some(c => c.확정));  // 확정 카드 있는 덱만
  for (const deck of decks) {
    const title = decks.length > 1 ? `<div class="deck-sub">덱 ${deck.deck_no}</div>` : "";
    const confirmed = visibleDeckCards(deck.cards);
    if (confirmed.some(c => c.카드종류 === '캐릭터' || c.카드종류 === '액션')) {
      const cardRow = c => `<li><span class="deck-kind">${escapeHtml(c.카드종류||'미분류')}</span>`
        + `<span class="deck-no">${escapeHtml(c.번호||'')}</span>`
        + (c.카드종류 === '액션'
          ? `<span class="deck-character">${escapeHtml(c.캐릭터||'—')}</span>`
            + `<span class="deck-color deck-color-${escapeHtml(c.색상||'')}">${escapeHtml(c.색상||'—')}</span>`
          : '')
        + (c.카드종류 === '캐릭터'
          ? `<span class="deck-meta">LV ${escapeHtml(String(c.LV ?? '—'))}</span>`
          : `<span class="deck-meta">COST ${escapeHtml(String(c.COST ?? '—'))}</span>`)
        + `<span class="deck-name">${escapeHtml(c.이름||'')}</span></li>`;
      const characters = confirmed.filter(c => c.카드종류 === '캐릭터');
      const actions = confirmed.filter(c => c.카드종류 !== '캐릭터');
      html += title
        + (characters.length ? `<ul class="decklist deck-characters">${characters.map(c=>
            `<li><span class="deck-character" title="확정 액션 카드 ${c.action_type_count}종 기준">${escapeHtml(c.캐릭터)}</span></li>`).join('')}</ul>` : '')
        + (characters.length && actions.length ? '<hr class="deck-divider">' : '')
        + (actions.length ? `<ul class="decklist deck-actions">${actions.map(cardRow).join('')}</ul>` : '');
      continue;
    }
    const rows = deck.cards.filter(c => c.확정).map(c =>    // 불확실 카드는 표시 안 함
      `<li>`
      + (c.속성 ? `<span class="deck-attr attr-${escapeHtml(c.속성)}">${escapeHtml(c.속성)}</span>` : "")
      + `<span class="deck-no">${escapeHtml(c.번호)}</span>`
      + (c.레어도 ? `<span class="deck-rar">${escapeHtml(c.레어도)}</span>` : "")
      + `<span class="deck-name">${escapeHtml(c.이름||"")}</span>`
      + (c.카드종류 ? `<span class="deck-meta">${escapeHtml([c.카드종류,c.캐릭터,c.색상].filter(Boolean).join(' · '))}</span>` : "")
      + `<span class="deck-cnt">${c.장수 == null ? '미집계' : 'x'+c.장수}</span></li>`).join("");
    html += `${title}<ul class="decklist">${rows}</ul>`;
  }
  if (!html) return "";
  return `<div class="deck-wrap"><div class="deck-head">🃏 덱리스트</div>${html}</div>`;
}
function openDeckWindow(rid, sid, header, subtitle, xUrl) {
  // 팝업은 클릭 즉시(동기) 열어야 차단되지 않음 → 먼저 열고 나서 데이터 주입
  // 현재 창이 있는 모니터 기준 화면 중앙에 위치
  const W = 620, H = 880;
  const dualLeft = window.screenLeft != null ? window.screenLeft : window.screenX;
  const dualTop = window.screenTop != null ? window.screenTop : window.screenY;
  const vw = window.outerWidth || document.documentElement.clientWidth || screen.width;
  const vh = window.outerHeight || document.documentElement.clientHeight || screen.height;
  const left = Math.max(0, Math.round(dualLeft + (vw - W) / 2));
  const top = Math.max(0, Math.round(dualTop + (vh - H) / 2));
  const feat = `width=${W},height=${H},left=${left},top=${top},scrollbars=yes,resizable=yes`;
  const w = window.open("", "deck_" + rid, feat);
  if (!w) { alert("팝업이 차단되었습니다. 이 사이트의 팝업을 허용한 뒤 다시 눌러주세요."); return; }
  w.document.write('<!doctype html><meta charset="utf-8"><title>덱리스트</title>'
    + '<body style="font:14px system-ui,sans-serif;padding:16px;color:#182335">불러오는 중…</body>');
  w.document.close();
  loadDeck(rid).then(entry => {
    const deckHtml = deckListHtml(entry) || '<p style="color:#999">확정된 덱리스트가 없습니다.</p>';
    // 엑셀 추출용: 확정 카드만 담은 덱 데이터 + 파일명
    const confirmedDecks = (entry && entry.decks ? entry.decks : [])
      .map(d => ({ deck_no: d.deck_no, cards: visibleDeckCards(d.cards) }))
      .filter(d => d.cards.length);
    const hasDeck = confirmedDecks.length > 0;
    const fileBase = ((header || '덱리스트') + (subtitle ? '_' + subtitle : ''))
      .replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, '_').slice(0, 80);
    const dataJson = JSON.stringify({ file: fileBase, multi: confirmedDecks.length > 1, decks: confirmedDecks }).replace(/</g, "\\u003c");
    const css = `
      body{font:14px system-ui,'Malgun Gothic',sans-serif;margin:0;padding:16px;color:#182335;background:#f8f9fa}
      .pop-head{font-weight:800;font-size:15px;margin:0 0 2px}
      .pop-sub{font-size:12px;color:#666;margin:0 0 12px}
      .tweet-embed{margin:0 0 12px}
      .link{font-size:12px;color:#c2410c;text-decoration:none}
      .deck-wrap{margin:8px 0;padding:10px 12px;background:#fff;border:1px solid #f6c477;border-radius:8px}
      .deck-head{font-size:12px;font-weight:700;color:#e8590c;margin-bottom:6px}
      .deck-sub{font-size:11px;font-weight:700;color:#555;margin:6px 0 2px}
      ul.decklist{list-style:none;margin:0;padding:0}
      ul.decklist li{margin:2px 0;display:flex;gap:6px;align-items:center;font-size:13px}
      .deck-cnt{font-weight:700;min-width:24px;margin-left:auto;text-align:right}
      .deck-attr{font-size:10px;padding:1px 5px;border-radius:6px;color:#fff;min-width:28px;text-align:center;background:#888}
      .attr-화염{background:#e03131}.attr-파도{background:#1971c2}.attr-대지{background:#2f9e44}
      .attr-번개{background:#f59f00}.attr-폭풍{background:#9c36b5}
      .deck-no{font-size:11px;color:#888;min-width:64px}
      .deck-rar{font-size:10px;font-weight:700;color:#5b4a1a;background:#fdf1cf;border:1px solid #f0d98a;border-radius:5px;padding:0 4px;min-width:30px;text-align:center}
      .deck-name{color:#222}
      .deck-meta{font-size:11px;color:#536175}
      .deck-kind,.deck-character,.deck-color{font-size:11px;padding:1px 5px;border-radius:4px;background:#eef1f5;color:#39465a;white-space:nowrap}
      .deck-color-적색{background:#ffe3e3;color:#c92a2a}
      .deck-color-청색{background:#dbeafe;color:#1d4ed8}
      .deck-color-녹색{background:#dcfce7;color:#15803d}
      .deck-divider{border:0;border-top:1px dashed #aeb8c5;margin:12px 0}
      ul.deck-characters{display:flex;flex-wrap:nowrap;gap:8px;align-items:center}
      ul.decklist li{flex-wrap:wrap}
      .xlsx-btn{margin:10px 0 0;padding:6px 12px;font-size:13px;font-weight:700;color:#fff;background:#1d6f42;border:0;border-radius:6px;cursor:pointer}
      .xlsx-btn:hover{background:#155c36}`;
    const embedBlock = sid ? '<div class="tweet-embed" id="tw"></div>' : "";
    const embedScript = sid
      ? '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8" '
        + 'onload="twttr.ready(function(){twttr.widgets.createTweet(\'' + sid
        + '\',document.getElementById(\'tw\'),{theme:\'light\',conversation:\'none\',align:\'center\'});});"><\/script>'
      : "";
    const linkBlock = xUrl ? `<a class="link" href="${xUrl}" target="_blank" rel="noopener">🔗 X 원문 보기</a>` : "";
    // 엑셀(.xlsx) 추출: 확정 덱 데이터 주입 + SheetJS + 클릭 핸들러
    const xlsxBtn = hasDeck ? '<div><button id="xlsxBtn" class="xlsx-btn">⬇ 엑셀 추출</button></div>' : "";
    const xlsxScript = hasDeck
      ? '<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"><\/script>'
        + '<script>var DECK_DATA=' + dataJson + ';'
        + "document.getElementById('xlsxBtn').addEventListener('click',function(){"
        + "if(typeof XLSX==='undefined'){alert('엑셀 라이브러리를 불러오는 중입니다. 잠시 후 다시 눌러주세요.');return;}"
        + "var m=DECK_DATA.multi,extra=DECK_DATA.decks.some(function(d){return d.cards.some(function(c){return c.카드종류;});}),aoa=[(m?['덱']:[]).concat(['속성','번호','레어도','이름'],extra?['카드종류','캐릭터','색상','LV','COST']:[],['장수'])];"
        + "DECK_DATA.decks.forEach(function(d){d.cards.forEach(function(c){"
        + "aoa.push((m?[d.deck_no]:[]).concat([c.속성||'',c.번호||'',c.레어도||'',c.이름||''],extra?[c.카드종류||'',c.캐릭터||'',c.색상||'',c.LV??'',c.COST??'']:[],[c.장수==null?'미집계':c.장수]));});});"
        + "var ws=XLSX.utils.aoa_to_sheet(aoa),wb=XLSX.utils.book_new();"
        + "XLSX.utils.book_append_sheet(wb,ws,'덱리스트');XLSX.writeFile(wb,DECK_DATA.file+'.xlsx');});<\/script>"
      : "";
    const doc = `<!doctype html><html lang="ko"><head><meta charset="utf-8">`
      + `<meta name="viewport" content="width=device-width,initial-scale=1">`
      + `<title>${escapeHtml(header)}</title><style>${css}</style></head><body>`
      + `<p class="pop-head">${escapeHtml(header)}</p>`
      + (subtitle ? `<p class="pop-sub">${escapeHtml(subtitle)}</p>` : "")
      + embedBlock + deckHtml + xlsxBtn + `<p style="margin-top:12px">${linkBlock}</p>`
      + embedScript + xlsxScript + `</body></html>`;
    try { w.document.open(); w.document.write(doc); w.document.close(); }
    catch (_) { /* 사용자가 창을 닫은 경우 무시 */ }
  });
}

window.openDeckWindow = openDeckWindow;
})();
