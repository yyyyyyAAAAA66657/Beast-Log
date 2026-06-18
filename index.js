// 🐯 비스트로그 (Beast Log) v0.7.0 — 도트(다마고치) 리스킨 · 🐯출현(WHO) / 🌦️상황(WHAT) 분리 + 상황 선택지화
// 버전 3곳 동시 갱신: (1) 이 주석, (2) BEASTLOG_VERSION, (3) manifest.json
//
// 제1원칙: 재밌음 + RP에 긍정적. 구조: 세계가 던지고 → 유저가 고르고 → 확장은 중계.
// OFF-SCREEN: 유저 속마음은 패널 전용(주입 X). 저장: 게임=chat_metadata / 설정=extension_settings.
//
// 두 발생원 (이름=정체성):
//   🐯 출현 (WHO)  = NPC/생물/사물이 나타나 상호작용(싸움·협력·도움·활동·줍기). category:'npc'. 도감 먹임.
//   🌦️ 상황 (WHAT) = 상대 없는 환경/상황 사건(정전·택배·비). category:'situation'. 선택지로 반응.
//   → 둘 다 선택지 기반 + 0~1건 주입. 색/뱃지로 시각 분리.

const BEASTLOG_VERSION = '0.7.0';
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
        items: [], encounters: [], seenFoes: [],   // seenFoes → 나중에 터줏대감 도감
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

// ── [STUB] 🐯 출현 (WHO) ──  TODO(3): generateQuietPrompt 로 장면 맞춰 생성
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

// ── [STUB] 🌦️ 상황 (WHAT) ──  TODO(3): 채팅 맥락 맞춰 생성
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

// ── [STUB] 판정 + 양면 속마음 (kind 기반) ── foe=단정 / user=추측형(may/can)
function resolveByKind(item, kind) {
    if (kind === 'flee') return { result: '회피', exp: 1, drop: null, inner: {
        foe: '상황은 떠나는 뒷모습을 멀뚱히 바라봤다.', user: '당신은 현명한 판단이었다고... 아마 스스로 우겼을 것이다.' } };
    if (kind === 'help') return { result: '도움', exp: 3, drop: null, inner: {
        foe: '상대는 의외로 고마워하는 눈치였다.', user: '당신은 괜히 멋쩍었을지도 모른다.' } };
    if (kind === 'cooperate') return { result: '협력', exp: 4, drop: null, inner: {
        foe: '상대는 의외로 순순히 응했다.', user: '당신은 이게 될 줄 몰랐을 것이다.' } };
    if (kind === 'activity') return { result: '활동', exp: 2, drop: null, inner: {
        foe: '상대는 그 시간을 나쁘지 않게 보냈다.', user: '당신은 생각보다 즐거웠다고... 인정하긴 싫었을 것이다.' } };
    if (kind === 'loot') return { result: '획득', exp: 2, drop: { name: '녹슨 숟가락', emoji: '🥄', tier: '쓰레기', price: 0 }, inner: {
        foe: '아무도 그걸 줍지 않은 데는 이유가 있었다.', user: '당신은 왜 주웠는지 스스로도 몰랐을 것이다.' } };
    if (kind === 'interact') return { result: '상호작용', exp: 1, drop: null, inner: {
        foe: '그것은 별 반응이 없었다.', user: '당신은 괜히 건드렸다고 생각했을지도 모른다.' } };
    const win = STATE.power + 5 >= (item.difficulty || 0);
    return {
        result: win ? '승리' : '패배', exp: win ? 8 : 2,
        drop: win ? { name: '눅눅한 쿠폰', emoji: '🎟️', tier: '쓰레기', price: 0 } : null,
        inner: win ? { foe: '상대는 어딘가 뿌듯해 보였다.', user: '당신은... 내심 조금 미안했을지도 모른다.' }
                   : { foe: '상대도 별로 안 진지했다.', user: '당신은 그게 더 아팠을 것이다.' },
    };
}

function applyOutcome(item, choiceLabel, outcome) {
    STATE.xp += outcome.exp || 0;
    const entry = {
        id: cryptoId(), no: STATE.encounters.length + 1, category: item.category || 'npc',
        emoji: item.emoji, title: item.title, desc: `${choiceLabel} — ${outcome.result}`,
        result: outcome.result, exp: outcome.exp,
        drop: outcome.drop ? outcome.drop.name : null, inner: outcome.inner,
    };
    STATE.encounters.unshift(entry);
    if (outcome.drop) { STATE.items.unshift(Object.assign({ id: cryptoId(), verdict: '' }, outcome.drop)); STATE.power += 1; }
    if (item.foe && !STATE.seenFoes.includes(item.foe)) STATE.seenFoes.push(item.foe);   // 도감 씨앗
    levelCheck();
    saveState(STATE);
    renderAll();
    if (STATE.settings.injectDefault) {
        const foeBeat = entry.inner && entry.inner.foe ? ' ' + entry.inner.foe : '';
        injectProse(`(${entry.desc}.${foeBeat})`);
    }
}
function levelCheck() { const need = STATE.level * 100; if (STATE.xp >= need) { STATE.xp -= need; STATE.level += 1; } }

// ── 주입 (텀 게이트) — TODO(3): sendMessageAsUser 등 확정 ──
function injectProse(prose) {
    if (!canInject()) { flash(`아직 텀 — ${injectRemaining()}턴 후 (패널엔 기록됨)`); return false; }
    blDebug('주입 stub:', prose);
    markInject();
    flash('챗에 반영됨');
    return true;
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

// ── 미니 콘솔 ──
let consoleEl = null;
function buildConsole() {
    if (consoleEl) return;
    consoleEl = document.createElement('div');
    consoleEl.id = 'beastlog-console';
    consoleEl.innerHTML = `
      <div class="bl-topbar">
        <span class="bl-paw">🐯</span><span class="bl-lv num"></span><span class="bl-xmini"><i></i></span>
        <span class="bl-spacer"></span>
        <span class="bl-inject"><span class="bl-lab">📤 챗주입</span><span class="bl-sw" data-on="true"></span></span>
        <span class="bl-up" title="펼치기">⌃</span>
      </div>
      <div class="bl-panes">
        <div class="bl-pane bl-left">
          <div class="bl-pane-h">📦 템창 <span class="bl-cnt bl-itemcnt num"></span><button class="bl-pane-inject" data-src="items" title="챗에 반영">📤</button></div>
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
    consoleEl.querySelector('.bl-lv').textContent = 'Lv.' + String(STATE.level).padStart(2, '0');
    const need = STATE.level * 100;
    consoleEl.querySelector('.bl-xmini i').style.width = Math.min(100, (STATE.xp / need) * 100) + '%';
    consoleEl.querySelector('.bl-sw').dataset.on = STATE.settings.injectDefault ? 'true' : 'false';
    consoleEl.querySelector('.bl-itemcnt').textContent = STATE.items.length;
    consoleEl.querySelector('.bl-power').textContent = STATE.power;
    consoleEl.querySelector('.bl-items').innerHTML = STATE.items.slice(0, 3).map(it =>
        `<div class="bl-item"><span>${it.emoji || '📦'}</span><span class="nm">${escapeHtml(it.name)}</span><span class="pr num">${it.price || 0}원</span></div>`
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
          <div class="bl-reg">
            <div class="bl-reg-top"><span class="bl-reg-ctitle"></span><span class="bl-reg-lv">Lv.<b class="num bl-reg-lvnum"></b></span></div>
            <div class="bl-reg-xptext num"></div><div class="bl-reg-xpbar"><i></i></div>
            <div class="bl-reg-pwr">⚔️ 전투력 <b class="num bl-reg-pwrnum"></b></div>
          </div>
          <div class="bl-full-toggles">
            <label><span>📤 결과를 챗에 띄우기</span><input type="checkbox" class="bl-t-inject"></label>
            <label><span>📥 자동 감지 (입구)</span><input type="checkbox" class="bl-t-auto"></label>
          </div>
          <div class="bl-cd-row"><span>텀 (주입 간격)</span><input type="number" class="bl-cd-input" min="0" max="20"><span>턴</span></div>
          <div class="bl-full-rolls">
            <button class="bl-roll2">🐯 출현</button>
            <button class="bl-rand2">🌦️ 상황</button>
          </div>
          <div class="bl-sec"><h3>오늘의 기록</h3><span class="bl-rule"></span><span class="bl-enc-cnt num"></span></div>
          <div class="bl-enc-list"></div>
          <div class="bl-sec"><h3>잡템 보관함</h3><span class="bl-rule"></span><span class="bl-junk-cnt num"></span></div>
          <div class="bl-junk-list"></div>
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
    fullEl.addEventListener('click', e => { if (e.target === fullEl) showMini(); });
}
function renderFull() {
    if (!fullEl) return;
    const need = STATE.level * 100;
    fullEl.querySelector('.bl-reg-ctitle').textContent = STATE.title;
    fullEl.querySelector('.bl-reg-lvnum').textContent = String(STATE.level).padStart(2, '0');
    fullEl.querySelector('.bl-reg-xptext').textContent = `${STATE.xp} / ${need} XP`;
    fullEl.querySelector('.bl-reg-xpbar i').style.width = Math.min(100, (STATE.xp / need) * 100) + '%';
    fullEl.querySelector('.bl-reg-pwrnum').textContent = STATE.power;
    fullEl.querySelector('.bl-t-inject').checked = STATE.settings.injectDefault;
    fullEl.querySelector('.bl-t-auto').checked = EXT.autoDetect;
    fullEl.querySelector('.bl-cd-input').value = EXT.cooldownTurns;

    fullEl.querySelector('.bl-enc-cnt').textContent = STATE.encounters.length + '건';
    fullEl.querySelector('.bl-enc-list').innerHTML = STATE.encounters.length
        ? STATE.encounters.map(e => `
            <div class="bl-ticket bl-tk-${e.category || 'npc'}">
              <div class="bl-tk-head"><span class="bl-tk-emoji">${e.emoji}</span><span class="bl-tk-title">${escapeHtml(e.title)}</span><span class="bl-tk-no num">#${e.no}</span></div>
              <div class="bl-tk-desc">${escapeHtml(e.desc)}</div>
              ${e.inner ? `<div class="bl-tk-inner"><div class="bl-in-foe">🎙️ ${escapeHtml(e.inner.foe)}</div><div class="bl-in-user">🫥 ${escapeHtml(e.inner.user)}</div></div>` : ''}
              <div class="bl-tk-foot"><span class="bl-chip">${escapeHtml(e.result)}</span><span class="bl-chip">EXP +${e.exp}</span>${e.drop ? `<span class="bl-chip">드롭 · ${escapeHtml(e.drop)}</span>` : ''}</div>
            </div>`).join('')
        : '<div class="bl-empty">아직 아무 일도 없었다. 조용한 하루다.</div>';

    fullEl.querySelector('.bl-junk-cnt').textContent = '곁들임 ' + STATE.items.length;
    fullEl.querySelector('.bl-junk-list').innerHTML = STATE.items.length
        ? STATE.items.map(it => `<span class="bl-jchip">${it.emoji || '📦'} ${escapeHtml(it.name)} <span class="num">${it.price || 0}원</span></span>`).join('')
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
    wrap.id = 'beastlog-settings';
    wrap.className = 'beast-log-settings';
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

// ── 확장 메뉴(🪄) 등록 ──
function buildWandMenuWithRetry(tries) {
    const menu = document.getElementById('extensionsMenu');
    if (menu) { buildWandMenu(menu); return; }
    if (tries > 0) setTimeout(() => buildWandMenuWithRetry(tries - 1), 500);
}
function buildWandMenu(menu) {
    if (document.getElementById('beastlog-wand')) return;
    const item = document.createElement('div');
    item.id = 'beastlog-wand';
    item.className = 'list-group-item interactable';
    item.tabIndex = 0;
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
    const choices = (item.choices && item.choices.length) ? item.choices
        : [{ label: '대응한다', kind: 'attack' }, { label: '지나친다', kind: 'flee' }];
    const pop = document.createElement('div'); pop.id = 'beastlog-popup';
    pop.innerHTML = `
      <div class="bl-pop-card bl-cat-${cat}">
        <div class="bl-pop-badge">${cat === 'npc' ? '🐯 출현' : '🌦️ 상황'}</div>
        <div class="bl-pop-emoji">${item.emoji}</div>
        <div class="bl-pop-title">${escapeHtml(item.title)}${cat === 'npc' ? '!' : ''}</div>
        ${item.desc ? `<div class="bl-pop-desc">${escapeHtml(item.desc)}</div>` : ''}
        <div class="bl-pop-choices">${choices.map((c, i) => `<button data-i="${i}">${escapeHtml(c.label)}</button>`).join('')}</div>
        <button class="bl-pop-ignore" data-i="-1">무시</button>
      </div>`;
    document.body.appendChild(pop);
    pop.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.i, 10); closePopup();
        if (i < 0) return;
        const c = choices[i]; applyOutcome(item, c.label, resolveByKind(item, c.kind));
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
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => f.classList.remove('show'), 1800);
}
function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    buildSettingsWithRetry(10);
    buildWandMenuWithRetry(10);
    registerEvents();
    blDebug('비스트로그', BEASTLOG_VERSION, '로드됨');
}
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
}
