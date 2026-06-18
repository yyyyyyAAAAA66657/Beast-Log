// 🐯 비스트로그 (Beast Log) v0.9.0 — 레트로 RPG (포켓몬 골드) : 마스코트 진화 + 상태바 + 모험일지 + 희귀도
// 버전 3곳 동시 갱신: (1) 이 주석, (2) BEASTLOG_VERSION, (3) manifest.json
//
// 제1원칙: 재밌음 + RP에 긍정적. 컨셉: "채팅 속 일상을 RPG 이벤트로 변환."
// OFF-SCREEN: 유저 속마음은 패널 전용. 저장: 게임=chat_metadata / 설정=extension_settings.
// 🐯 출현(WHO) / 🌦️ 상황(WHAT). 관계등급(터줏대감): 낯선→몇번본→아는사이일지도→친해진→죽마고우.
// 상태바(기분/배고픔/체력)는 지금 "표시 + 가벼운 반응"까지만 — 선택 영향 X (케어심 방지).

const BEASTLOG_VERSION = '0.9.0';
const MODULE = 'beast_log';

function getCtx() {
    try { if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) return SillyTavern.getContext(); }
    catch (e) { /* noop */ }
    return (typeof window !== 'undefined' && window.SillyTavern && window.SillyTavern.getContext)
        ? window.SillyTavern.getContext() : null;
}
function blDebug(...a) { if (window.__beastlogDebug) console.log('[비스트로그]', ...a); }
function cryptoId() {
    try { return crypto.randomUUID(); }
    catch (e) { return 'bl-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
}
function nowHHMM() { try { return new Date().toTimeString().slice(0, 5); } catch (e) { return '--:--'; } }

// ── 진화 단계 (마스코트) ──
const EVO = [
    { min: 10, emoji: '🦁', name: '백수의 왕' },
    { min: 5, emoji: '🐅', name: '호랑이' },
    { min: 1, emoji: '🐯', name: '새끼 호랑이' },
];
function evoStage(lv) { for (const e of EVO) { if (lv >= e.min) return e; } return EVO[EVO.length - 1]; }

// ── 희귀도 ──
const RARITY = { common: { label: '일반', dot: '⚪' }, rare: { label: '희귀', dot: '🟢' }, epic: { label: '영웅', dot: '🔵' }, legend: { label: '전설', dot: '🟣' } };
function rollRarity() { const r = Math.random(); if (r < 0.005) return 'legend'; if (r < 0.05) return 'epic'; if (r < 0.2) return 'rare'; return 'common'; }

// ── 관계 등급 ──
const REL_TIERS = [
    { min: 80, label: '죽마고우' }, { min: 50, label: '친해진 사이' },
    { min: 25, label: '아는 사이일지도?' }, { min: 10, label: '몇 번 본 사이' }, { min: 0, label: '낯선 사이' },
];
function relTier(aff) { for (const t of REL_TIERS) { if (aff >= t.min) return t.label; } return '낯선 사이'; }
function affinityDelta(kind) { return ({ help: 2, cooperate: 3, activity: 1, interact: 0, loot: 0, flee: 0, attack: 0 })[kind] || 0; }

// ── 전역 설정 ──
function defaultExt() { return { connectionProfile: '', autoDetect: false, cooldownTurns: 3 }; }
let EXT = defaultExt();
function loadExt() {
    const ctx = getCtx();
    if (!ctx || !ctx.extensionSettings) return defaultExt();
    ctx.extensionSettings[MODULE] = Object.assign(defaultExt(), ctx.extensionSettings[MODULE] || {});
    return ctx.extensionSettings[MODULE];
}
function saveExt() { const ctx = getCtx(); if (ctx && ctx.saveSettingsDebounced) ctx.saveSettingsDebounced(); }

// ── 채팅별 게임 상태 ──
const STATE_KEY = 'beast_log_state';
function defaultState() {
    return {
        uuid: cryptoId(), level: 1, xp: 0, title: '갓 들어온 손님', power: 0,
        mood: 3, hunger: 3, hp: 3,                 // 상태바 (표시 + 가벼운 반응)
        items: [], encounters: [], npcs: {},
        lastInjectTurn: -99, settings: { injectDefault: true },
    };
}
function loadState() {
    const ctx = getCtx();
    if (!ctx || !ctx.chatMetadata) return defaultState();
    const e = ctx.chatMetadata[STATE_KEY];
    if (e && typeof e === 'object') {
        const m = Object.assign(defaultState(), e);
        m.settings = Object.assign(defaultState().settings, e.settings || {});
        m.npcs = e.npcs || {};
        return m;
    }
    const fresh = defaultState();
    ctx.chatMetadata[STATE_KEY] = fresh;
    return fresh;
}
function saveState(s) {
    const ctx = getCtx();
    if (!ctx || !ctx.chatMetadata) return;
    ctx.chatMetadata[STATE_KEY] = s;
    if (ctx.saveMetadataDebounced) ctx.saveMetadataDebounced();
    else if (ctx.saveMetadata) ctx.saveMetadata();
}
let STATE = defaultState();

// ── 텀(쿨다운) ──
function getChatLen() { const c = getCtx(); return (c && Array.isArray(c.chat)) ? c.chat.length : 0; }
function injectRemaining() { return Math.max(0, (EXT.cooldownTurns || 0) - (getChatLen() - STATE.lastInjectTurn)); }
function canInject() { return injectRemaining() <= 0; }
function markInject() { STATE.lastInjectTurn = getChatLen(); saveState(STATE); renderAll(); }
function getLastMessageText() {
    const ctx = getCtx();
    if (!ctx || !Array.isArray(ctx.chat) || ctx.chat.length === 0) return '';
    const m = ctx.chat[ctx.chat.length - 1];
    return (m && (m.mes || (m.extra && m.extra.display_text))) || '';
}
function getProfiles() {
    const ctx = getCtx();
    const cm = (ctx && ctx.extensionSettings && ctx.extensionSettings.connectionManager) || null;
    return (cm && Array.isArray(cm.profiles)) ? cm.profiles : [];
}

// ── [STUB] 생성 / 판정 ──  TODO(3): generateQuietPrompt
function generateAppearStub(_s) {
    const pool = [
        { category: 'npc', emoji: '🪳', title: '야생의 바퀴벌레가 나타났다', foe: '바퀴벌레', difficulty: 2,
          choices: [{ label: '신문지로 내려친다', kind: 'attack' }, { label: '슬리퍼를 던진다', kind: 'attack' }, { label: '못 본 척한다', kind: 'flee' }] },
        { category: 'npc', emoji: '🧑‍💼', title: '옆자리 동료가 다가왔다', foe: '옆자리 동료', difficulty: 3,
          choices: [{ label: '같이 점심 먹자고 한다', kind: 'cooperate' }, { label: '먼저 인사한다', kind: 'help' }, { label: '눈을 피한다', kind: 'flee' }] },
        { category: 'npc', emoji: '🐕', title: '동네 개가 따라온다', foe: '동네 개', difficulty: 1,
          choices: [{ label: '쓰다듬는다', kind: 'activity' }, { label: '간식을 준다', kind: 'help' }, { label: '모른 척 걷는다', kind: 'flee' }] },
        { category: 'npc', emoji: '🥄', title: '길바닥에서 무언가 빛났다', foe: null, difficulty: 0,
          choices: [{ label: '줍는다', kind: 'loot' }, { label: '발로 차본다', kind: 'interact' }, { label: '그냥 지나친다', kind: 'flee' }] },
    ];
    return pool[Math.floor(Math.random() * pool.length)];
}
function generateSituationStub(_s) {
    const pool = [
        { category: 'situation', emoji: '📦', title: '택배가 도착했다', desc: '아무도 시킨 적 없는 택배다.',
          choices: [{ label: '열어본다', kind: 'loot' }, { label: '반송한다', kind: 'flee' }, { label: '모른 척한다', kind: 'interact' }] },
        { category: 'situation', emoji: '💡', title: '갑자기 정전이 됐다', desc: '세상이 잠깐 공평하게 어두워졌다.',
          choices: [{ label: '촛불을 켠다', kind: 'activity' }, { label: '그냥 잔다', kind: 'flee' }, { label: '두꺼비집을 본다', kind: 'interact' }] },
        { category: 'situation', emoji: '🌧️', title: '갑자기 비가 쏟아진다', desc: '우산은 당연히 없다.',
          choices: [{ label: '뛴다', kind: 'activity' }, { label: '비를 맞는다', kind: 'interact' }, { label: '어딘가로 피한다', kind: 'flee' }] },
    ];
    return pool[Math.floor(Math.random() * pool.length)];
}
function resolveByKind(item, kind) {
    if (kind === 'flee') return { result: '회피', exp: 1, drop: null, inner: { foe: '상대는 떠나는 뒷모습을 멀뚱히 바라봤다.', user: '당신은 현명한 판단이었다고... 아마 스스로 우겼을 것이다.' } };
    if (kind === 'help') return { result: '도움', exp: 3, drop: null, inner: { foe: '상대는 의외로 고마워하는 눈치였다.', user: '당신은 괜히 멋쩍었을지도 모른다.' } };
    if (kind === 'cooperate') return { result: '협력', exp: 4, drop: null, inner: { foe: '상대는 의외로 순순히 응했다.', user: '당신은 이게 될 줄 몰랐을 것이다.' } };
    if (kind === 'activity') return { result: '활동', exp: 2, drop: null, inner: { foe: '상대는 그 시간을 나쁘지 않게 보냈다.', user: '당신은 생각보다 즐거웠다고... 인정하긴 싫었을 것이다.' } };
    if (kind === 'loot') return { result: '획득', exp: 2, drop: { name: '녹슨 숟가락', emoji: '🥄', tier: '쓰레기', price: 0 }, inner: { foe: '아무도 그걸 줍지 않은 데는 이유가 있었다.', user: '당신은 왜 주웠는지 스스로도 몰랐을 것이다.' } };
    if (kind === 'interact') return { result: '상호작용', exp: 1, drop: null, inner: { foe: '그것은 별 반응이 없었다.', user: '당신은 괜히 건드렸다고 생각했을지도 모른다.' } };
    const win = STATE.power + 5 >= (item.difficulty || 0);
    return {
        result: win ? '승리' : '패배', exp: win ? 8 : 2,
        drop: win ? { name: '눅눅한 쿠폰', emoji: '🎟️', tier: '쓰레기', price: 0 } : null,
        inner: win ? { foe: '상대는 어딘가 뿌듯해 보였다.', user: '당신은... 내심 조금 미안했을지도 모른다.' }
                   : { foe: '상대도 별로 안 진지했다.', user: '당신은 그게 더 아팠을 것이다.' },
    };
}

function applyOutcome(item, choiceLabel, outcome, kind) {
    STATE.xp += outcome.exp || 0;
    const rarity = outcome.drop ? rollRarity() : 'common';
    const entry = {
        id: cryptoId(), no: STATE.encounters.length + 1, time: nowHHMM(), category: item.category || 'npc',
        emoji: item.emoji, title: item.title, desc: `${choiceLabel} — ${outcome.result}`,
        result: outcome.result, exp: outcome.exp, rarity: rarity,
        drop: outcome.drop ? outcome.drop.name : null, inner: outcome.inner,
    };
    STATE.encounters.unshift(entry);
    if (outcome.drop) { STATE.items.unshift(Object.assign({ id: cryptoId(), verdict: '', rarity }, outcome.drop)); STATE.power += 1; }

    // NPC 영속화 + 친밀도
    if (item.foe) {
        const reg = STATE.npcs[item.foe] || { name: item.foe, emoji: item.emoji, affinity: 0, metCount: 0, firstMet: getChatLen(), tier: '낯선 사이', terjut: false };
        const before = reg.tier;
        reg.metCount += 1; reg.affinity += affinityDelta(kind);
        reg.tier = relTier(reg.affinity); reg.terjut = reg.metCount >= 5;
        STATE.npcs[item.foe] = reg;
        if (reg.tier !== before) flash(`${reg.emoji} ${reg.name} — '${reg.tier}'!`);
        else if (reg.terjut && reg.metCount === 5) flash(`${reg.emoji} ${reg.name} 터줏대감 등극!`);
    }

    // 상태바 가벼운 반응 (선택엔 영향 X)
    const good = ['승리', '협력', '도움', '활동', '획득'].includes(outcome.result);
    STATE.mood = clamp03(STATE.mood + (good ? 1 : (outcome.result === '패배' ? -1 : 0)));
    if (STATE.encounters.length % 3 === 0) STATE.hunger = clamp03(STATE.hunger - 1);
    if (outcome.result === '패배') STATE.hp = clamp03(STATE.hp - 1);

    levelCheck();
    saveState(STATE);
    renderAll();
    if (STATE.settings.injectDefault) {
        const foeBeat = entry.inner && entry.inner.foe ? ' ' + entry.inner.foe : '';
        injectProse(`(${entry.desc}.${foeBeat})`);
    }
}
function clamp03(n) { return Math.max(0, Math.min(3, n)); }
function levelCheck() { const need = STATE.level * 100; if (STATE.xp >= need) { STATE.xp -= need; STATE.level += 1; flash(`⭐ 레벨업! Lv.${STATE.level}`); } }

// ── 주입 — TODO(3): sendMessageAsUser 등 확정 ──
function injectProse(prose) {
    if (!canInject()) { flash(`아직 텀 — ${injectRemaining()}턴 후 (패널엔 기록됨)`); return false; }
    blDebug('주입 stub:', prose); markInject(); flash('챗에 반영됨'); return true;
}
function injectItems() { const t = STATE.items[0]; if (!t) { flash('주울 게 없다'); return; } injectProse(`(가방에서 ${t.name}이(가) 굴러나왔다.)`); }
function injectCombat() {
    const e = STATE.encounters[0]; if (!e) { flash('아직 사건이 없다'); return; }
    const foeBeat = e.inner && e.inner.foe ? ' ' + e.inner.foe : '';
    injectProse(`(${e.desc}.${foeBeat})`);
}

// ── 컨트롤 동기화 ──
function setInjectDefault(v) { STATE.settings.injectDefault = v; saveState(STATE); renderAll(); syncControls(); }
function setAutoDetect(v) { EXT.autoDetect = v; saveExt(); syncControls(); }
function syncControls() {
    if (consoleEl) { const sw = consoleEl.querySelector('.bl-sw'); if (sw) sw.dataset.on = STATE.settings.injectDefault ? 'true' : 'false'; }
    if (fullEl) {
        const fi = fullEl.querySelector('.bl-t-inject'); if (fi) fi.checked = STATE.settings.injectDefault;
        const fa = fullEl.querySelector('.bl-t-auto'); if (fa) fa.checked = EXT.autoDetect;
    }
}
function pips(emoji, n) { return emoji.repeat(Math.max(0, n)) + '·'.repeat(Math.max(0, 3 - n)); }

// ── 미니 콘솔 ──
let consoleEl = null;
function buildConsole() {
    if (consoleEl) return;
    consoleEl = document.createElement('div');
    consoleEl.id = 'beastlog-console';
    consoleEl.innerHTML = `
      <div class="bl-topbar">
        <span class="bl-paw"></span><span class="bl-lv num"></span><span class="bl-xmini"><i></i></span>
        <span class="bl-spacer"></span>
        <span class="bl-inject"><span class="bl-lab">📤</span><span class="bl-sw" data-on="true"></span></span>
        <span class="bl-up" title="펼치기">⌃</span>
      </div>
      <div class="bl-panes">
        <div class="bl-pane bl-left">
          <div class="bl-pane-h">📦 가방 <span class="bl-cnt bl-itemcnt num"></span><button class="bl-pane-inject" data-src="items" title="챗에 반영">📤</button></div>
          <div class="bl-items"></div><div class="bl-pwr">⚔️ 전투력 <b class="num bl-power"></b></div>
        </div>
        <div class="bl-pane bl-right">
          <div class="bl-pane-h">⚔️ 결투창 <button class="bl-pane-inject" data-src="combat" title="챗에 반영">📤</button></div>
          <div class="bl-last"></div><button class="bl-roll">🐯 출현</button>
        </div>
      </div>
      <div class="bl-eventbar"><button class="bl-randevent">🌦️ 상황</button><span class="bl-cooldown num"></span></div>`;
    document.body.appendChild(consoleEl);
    consoleEl.querySelector('.bl-sw').addEventListener('click', () => setInjectDefault(!STATE.settings.injectDefault));
    consoleEl.querySelector('.bl-roll').addEventListener('click', onAppear);
    consoleEl.querySelector('.bl-randevent').addEventListener('click', onSituation);
    consoleEl.querySelectorAll('.bl-pane-inject').forEach(b => b.addEventListener('click', () => { b.dataset.src === 'items' ? injectItems() : injectCombat(); }));
    consoleEl.querySelector('.bl-up').addEventListener('click', showFull);
}
function renderConsole() {
    if (!consoleEl) return;
    consoleEl.querySelector('.bl-paw').textContent = evoStage(STATE.level).emoji;
    consoleEl.querySelector('.bl-lv').textContent = 'Lv.' + String(STATE.level).padStart(2, '0');
    const need = STATE.level * 100;
    consoleEl.querySelector('.bl-xmini i').style.width = Math.min(100, (STATE.xp / need) * 100) + '%';
    consoleEl.querySelector('.bl-sw').dataset.on = STATE.settings.injectDefault ? 'true' : 'false';
    consoleEl.querySelector('.bl-itemcnt').textContent = STATE.items.length;
    consoleEl.querySelector('.bl-power').textContent = STATE.power;
    consoleEl.querySelector('.bl-items').innerHTML = STATE.items.slice(0, 3).map(it =>
        `<div class="bl-item"><span>${RARITY[it.rarity] ? RARITY[it.rarity].dot : ''}</span><span>${it.emoji || '📦'}</span><span class="nm">${escapeHtml(it.name)}</span><span class="pr num">${it.price || 0}원</span></div>`
    ).join('') || '<div class="bl-empty">아직 주운 게 없다</div>';
    const last = STATE.encounters[0];
    consoleEl.querySelector('.bl-last').innerHTML = last
        ? `<div class="bl-foe"><div class="nm">${last.emoji} ${escapeHtml(last.title)}</div><div class="sub">직전 · ${escapeHtml(last.result)} · EXP +${last.exp}</div></div>`
        : `<div class="bl-foe"><div class="sub">조용하다.</div></div>`;
    const rem = injectRemaining();
    consoleEl.querySelector('.bl-cooldown').textContent = rem > 0 ? `💉 ${rem}턴 후` : '💉 준비됨';
    consoleEl.querySelectorAll('.bl-pane-inject').forEach(b => b.classList.toggle('locked', rem > 0));
}

// ── 풀버전 패널 ──
let fullEl = null;
function buildFull() {
    if (fullEl) return;
    fullEl = document.createElement('div');
    fullEl.id = 'beastlog-full';
    fullEl.style.display = 'none';
    fullEl.innerHTML = `
      <div class="bl-full-card">
        <div class="bl-full-sign">
          <div class="bl-full-logo">🐯 비스트로그</div>
          <div class="bl-full-actions"><button class="bl-min" title="작게">⊟</button><button class="bl-close" title="닫기">✕</button></div>
        </div>
        <div class="bl-full-body">
          <div class="bl-pet-card">
            <div class="bl-pet-top"><span class="bl-pet-name"></span><span class="bl-pet-lv">Lv.<b class="num bl-pet-lvnum"></b></span></div>
            <div class="bl-pet"><span class="bl-pet-emoji"></span></div>
            <div class="bl-status">
              <span class="bl-st">기분 <b class="bl-st-mood"></b></span>
              <span class="bl-st">배고픔 <b class="bl-st-hunger"></b></span>
              <span class="bl-st">체력 <b class="bl-st-hp"></b></span>
            </div>
            <div class="bl-pet-xptext num"></div><div class="bl-pet-xpbar"><i></i></div>
            <div class="bl-pet-pwr">⚔️ 전투력 <b class="num bl-pet-pwrnum"></b> · 칭호 <span class="bl-pet-title"></span></div>
          </div>
          <div class="bl-full-toggles">
            <label><span>📤 결과를 챗에 띄우기</span><input type="checkbox" class="bl-t-inject"></label>
            <label><span>📥 자동 감지 (입구)</span><input type="checkbox" class="bl-t-auto"></label>
          </div>
          <div class="bl-cd-row"><span>텀 (주입 간격)</span><input type="number" class="bl-cd-input" min="0" max="20"><span>턴</span></div>
          <div class="bl-full-rolls"><button class="bl-roll2">🐯 출현</button><button class="bl-rand2">🌦️ 상황</button></div>
          <div class="bl-acc">
            <div class="bl-acc-head"><h3>📜 모험일지</h3><span class="bl-rule"></span><span class="bl-enc-cnt num"></span><span class="bl-chev">▾</span></div>
            <div class="bl-acc-body"><div class="bl-enc-list"></div></div>
          </div>
          <div class="bl-acc">
            <div class="bl-acc-head"><h3>📖 인물 도감</h3><span class="bl-rule"></span><span class="bl-dex-cnt num"></span><span class="bl-chev">▾</span></div>
            <div class="bl-acc-body"><div class="bl-dex-list"></div></div>
          </div>
          <div class="bl-acc">
            <div class="bl-acc-head"><h3>🎒 가방</h3><span class="bl-rule"></span><span class="bl-junk-cnt num"></span><span class="bl-chev">▾</span></div>
            <div class="bl-acc-body"><div class="bl-junk-list"></div></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(fullEl);
    fullEl.querySelector('.bl-min').addEventListener('click', showMini);
    fullEl.querySelector('.bl-close').addEventListener('click', hideHud);
    fullEl.querySelector('.bl-t-inject').addEventListener('change', e => setInjectDefault(e.target.checked));
    fullEl.querySelector('.bl-t-auto').addEventListener('change', e => setAutoDetect(e.target.checked));
    fullEl.querySelector('.bl-cd-input').addEventListener('change', e => { EXT.cooldownTurns = Math.max(0, parseInt(e.target.value, 10) || 0); saveExt(); renderAll(); });
    fullEl.querySelector('.bl-roll2').addEventListener('click', onAppear);
    fullEl.querySelector('.bl-rand2').addEventListener('click', onSituation);
    fullEl.querySelectorAll('.bl-acc-head').forEach(h => h.addEventListener('click', () => h.parentElement.classList.toggle('collapsed')));
    fullEl.addEventListener('click', e => { if (e.target === fullEl) showMini(); });
}
function renderFull() {
    if (!fullEl) return;
    const evo = evoStage(STATE.level), need = STATE.level * 100;
    fullEl.querySelector('.bl-pet-emoji').textContent = evo.emoji;
    fullEl.querySelector('.bl-pet-name').textContent = evo.name;
    fullEl.querySelector('.bl-pet-lvnum').textContent = String(STATE.level).padStart(2, '0');
    fullEl.querySelector('.bl-st-mood').textContent = pips('😊', STATE.mood);
    fullEl.querySelector('.bl-st-hunger').textContent = pips('🍖', STATE.hunger);
    fullEl.querySelector('.bl-st-hp').textContent = pips('❤️', STATE.hp);
    fullEl.querySelector('.bl-pet-xptext').textContent = `${STATE.xp} / ${need} XP`;
    fullEl.querySelector('.bl-pet-xpbar i').style.width = Math.min(100, (STATE.xp / need) * 100) + '%';
    fullEl.querySelector('.bl-pet-pwrnum').textContent = STATE.power;
    fullEl.querySelector('.bl-pet-title').textContent = STATE.title;
    fullEl.querySelector('.bl-t-inject').checked = STATE.settings.injectDefault;
    fullEl.querySelector('.bl-t-auto').checked = EXT.autoDetect;
    fullEl.querySelector('.bl-cd-input').value = EXT.cooldownTurns;

    fullEl.querySelector('.bl-enc-cnt').textContent = STATE.encounters.length + '건';
    fullEl.querySelector('.bl-enc-list').innerHTML = STATE.encounters.length
        ? STATE.encounters.map(e => `
            <div class="bl-ticket bl-tk-${e.category || 'npc'}">
              <div class="bl-tk-head"><span class="bl-tk-time num">${e.time || ''}</span><span class="bl-tk-emoji">${e.emoji}</span><span class="bl-tk-title">${escapeHtml(e.title)}</span>${e.rarity && e.rarity !== 'common' ? `<span class="bl-tk-rar">${RARITY[e.rarity].dot}</span>` : ''}<span class="bl-tk-no num">#${e.no}</span></div>
              <div class="bl-tk-desc">${escapeHtml(e.desc)}</div>
              ${e.inner ? `<div class="bl-tk-inner"><div class="bl-in-foe">🎙️ ${escapeHtml(e.inner.foe)}</div><div class="bl-in-user">🫥 ${escapeHtml(e.inner.user)}</div></div>` : ''}
              <div class="bl-tk-foot"><span class="bl-chip">${escapeHtml(e.result)}</span><span class="bl-chip">EXP +${e.exp}</span>${e.drop ? `<span class="bl-chip">드롭 · ${escapeHtml(e.drop)}</span>` : ''}</div>
            </div>`).join('')
        : '<div class="bl-empty">아직 아무 일도 없었다. 조용한 하루다.</div>';

    const npcArr = Object.values(STATE.npcs);
    fullEl.querySelector('.bl-dex-cnt').textContent = '발견 ' + npcArr.length;
    fullEl.querySelector('.bl-dex-list').innerHTML = npcArr.length
        ? npcArr.map(n => `
            <div class="bl-dex">
              <span class="bl-dex-emoji">${n.emoji || '👤'}</span>
              <span class="bl-dex-nm">${escapeHtml(n.name)}${n.terjut ? ' <span class="bl-terjut">터줏대감</span>' : ''}</span>
              <span class="bl-dex-rel">${escapeHtml(n.tier)}</span>
              <span class="bl-dex-met num">${n.metCount}번</span>
            </div>`).join('')
        : '<div class="bl-empty">아직 아무도 못 만났다.</div>';

    fullEl.querySelector('.bl-junk-cnt').textContent = '곁들임 ' + STATE.items.length;
    fullEl.querySelector('.bl-junk-list').innerHTML = STATE.items.length
        ? STATE.items.map(it => `<span class="bl-jchip">${RARITY[it.rarity] ? RARITY[it.rarity].dot : ''} ${it.emoji || '📦'} ${escapeHtml(it.name)} <span class="num">${it.price || 0}원</span></span>`).join('')
        : '<div class="bl-empty">텅 비었다.</div>';
}

// ── 상태 전환 ──
function showMini() { if (consoleEl) consoleEl.style.display = ''; if (fullEl) fullEl.style.display = 'none'; renderConsole(); }
function showFull() { buildFull(); if (consoleEl) consoleEl.style.display = 'none'; fullEl.style.display = 'flex'; renderFull(); }
function hideHud() { if (consoleEl) consoleEl.style.display = 'none'; if (fullEl) fullEl.style.display = 'none'; }
function renderAll() { renderConsole(); if (fullEl) renderFull(); }

// ── 확장탭 설정창 (연결 프로필만) ──
function buildSettingsWithRetry(tries) {
    const c = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (c) { buildSettings(c); return; }
    if (tries > 0) setTimeout(() => buildSettingsWithRetry(tries - 1), 500);
}
function buildSettings(container) {
    if (document.getElementById('beastlog-settings')) return;
    const wrap = document.createElement('div');
    wrap.id = 'beastlog-settings'; wrap.className = 'beast-log-settings';
    wrap.innerHTML = `
      <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header"><b>🐯 비스트로그</b>
          <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
        <div class="inline-drawer-content">
          <label class="bls-row"><span>연결 프로필</span><select id="bls-profile" class="text_pole"></select></label>
          <div class="bls-ver">🐯 Beast Log v${BEASTLOG_VERSION} · 확장 메뉴(🪄) 또는 미니창 ⌃ 로 열기</div>
        </div>
      </div>`;
    container.appendChild(wrap);
    refreshProfileOptions();
    wrap.querySelector('#bls-profile').addEventListener('change', e => { EXT.connectionProfile = e.target.value; saveExt(); });
    setTimeout(refreshProfileOptions, 1500);
}
function refreshProfileOptions() {
    const sel = document.getElementById('bls-profile'); if (!sel) return;
    const profiles = getProfiles();
    sel.innerHTML = '<option value="">(메인 연결 사용)</option>' +
        profiles.map(p => `<option value="${escapeHtml(p.id || p.name)}">${escapeHtml(p.name || p.id)}</option>`).join('');
    sel.value = EXT.connectionProfile || '';
}

// ── 확장 메뉴(🪄) ──
function buildWandMenuWithRetry(tries) {
    const menu = document.getElementById('extensionsMenu');
    if (menu) { buildWandMenu(menu); return; }
    if (tries > 0) setTimeout(() => buildWandMenuWithRetry(tries - 1), 500);
}
function buildWandMenu(menu) {
    if (document.getElementById('beastlog-wand')) return;
    const item = document.createElement('div');
    item.id = 'beastlog-wand'; item.className = 'list-group-item interactable'; item.tabIndex = 0;
    item.innerHTML = `<div class="fa-fw bl-wand-ic">🐯</div><span>비스트로그</span>`;
    menu.appendChild(item);
    item.addEventListener('click', () => { showFull(); const m = document.getElementById('extensionsMenu'); if (m) m.style.display = 'none'; });
}

// ── 루프 ──
function onAppear() { const it = generateAppearStub(getLastMessageText()); if (it) showChoicePopup(it); }
function onSituation() { const it = generateSituationStub(getLastMessageText()); if (it) showChoicePopup(it); }
function showChoicePopup(item) {
    closePopup();
    const cat = item.category || 'npc';
    const choices = (item.choices && item.choices.length) ? item.choices : [{ label: '대응한다', kind: 'attack' }, { label: '지나친다', kind: 'flee' }];
    let relLine = '';
    if (item.foe && STATE.npcs[item.foe]) relLine = `<div class="bl-pop-rel">${escapeHtml(STATE.npcs[item.foe].tier)} · ${STATE.npcs[item.foe].metCount}번째 만남</div>`;
    const pop = document.createElement('div'); pop.id = 'beastlog-popup';
    pop.innerHTML = `
      <div class="bl-pop-card bl-cat-${cat}">
        <div class="bl-pop-badge">${cat === 'npc' ? '🐯 출현' : '🌦️ 상황'}</div>
        <div class="bl-pop-emoji">${item.emoji}</div>
        <div class="bl-pop-title">${escapeHtml(item.title)}${cat === 'npc' ? '!' : ''}</div>
        ${relLine}
        ${item.desc ? `<div class="bl-pop-desc">${escapeHtml(item.desc)}</div>` : ''}
        <div class="bl-pop-choices">${choices.map((c, i) => `<button data-i="${i}">${escapeHtml(c.label)}</button>`).join('')}</div>
        <button class="bl-pop-ignore" data-i="-1">무시</button>
      </div>`;
    document.body.appendChild(pop);
    pop.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.i, 10); closePopup();
        if (i < 0) return;
        const c = choices[i]; applyOutcome(item, c.label, resolveByKind(item, c.kind), c.kind);
    }));
}
function closePopup() { const p = document.getElementById('beastlog-popup'); if (p) p.remove(); }

let flashTimer = null;
function flash(msg) {
    const host = (fullEl && fullEl.style.display !== 'none') ? fullEl : consoleEl;
    if (!host) return;
    let f = host.querySelector('.bl-flash');
    if (!f) { f = document.createElement('div'); f.className = 'bl-flash'; host.appendChild(f); }
    f.textContent = msg; f.classList.add('show');
    clearTimeout(flashTimer); flashTimer = setTimeout(() => f.classList.remove('show'), 1900);
}
function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function registerEvents() {
    const ctx = getCtx();
    if (!ctx || !ctx.eventSource) return;
    const types = ctx.eventTypes || ctx.event_types || {};
    if (types.CHAT_CHANGED) ctx.eventSource.on(types.CHAT_CHANGED, () => { STATE = loadState(); renderAll(); });
    // TODO(자동 옵션): EXT.autoDetect && types.MESSAGE_RECEIVED → 텀 통과 시 onAppear()
}

function init() {
    EXT = loadExt(); STATE = loadState();
    buildConsole(); renderConsole();
    buildSettingsWithRetry(10); buildWandMenuWithRetry(10);
    registerEvents();
    blDebug('비스트로그', BEASTLOG_VERSION, '로드됨');
}
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
}
