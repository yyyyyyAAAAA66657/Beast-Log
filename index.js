// 🐾 비스트로그 (Beast Log) v0.1.0 — 뼈대 + 루프 stub
// 버전은 3곳 동시 갱신: (1) 이 주석, (2) BEASTLOG_VERSION, (3) manifest.json
//
// 제1원칙: 재밌음 + RP에 긍정적. (방해되면 게이트하거나 컷)
// 구조: 세계가 사건을 던지고 → 유저가 고르고 → 비스트로그는 중계한다.
//   - 세계/캐릭터 = 사건 발생원
//   - 유저 = 활성화(감지 버튼) + 선택(팝업)
//   - 확장 = 감지/기록/중계만. 절대 유저 행동을 대신 정하지 않음 (OFF-SCREEN 원칙).

const BEASTLOG_VERSION = '0.1.0';
const MODULE = 'beast_log';

// ── ST 컨텍스트 멀티패스 (버전별 차이 흡수, Hot Mic getCMRS 방식) ──
function getCtx() {
    try {
        if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) return SillyTavern.getContext();
    } catch (e) { /* noop */ }
    return (typeof window !== 'undefined' && window.SillyTavern && window.SillyTavern.getContext)
        ? window.SillyTavern.getContext()
        : null;
}

function blDebug(...args) {
    if (window.__beastlogDebug) console.log('[비스트로그]', ...args);
}

// ── 상태 스키마 (chat_metadata UUID 격리, 곽두철 방식) ──
const STATE_KEY = 'beast_log_state';

function defaultState() {
    return {
        uuid: cryptoId(),
        level: 1,
        xp: 0,
        title: '갓 들어온 손님',
        power: 0,                 // 들고 다니는 쓰레기 = 전투력 (농담)
        items: [],                // {id, name, emoji, tier, price, verdict}  tier: 쓰레기|흔함|희귀|전설
        encounters: [],           // {id, no, emoji, title, desc, result, exp, drop, inner:{foe,user}}  ← 양면 속마음(패널 전용)
        seenFoes: [],             // 조우 도감
        settings: {
            injectDefault: true,  // 📤 선택을 챗에 반영 (기본값) — 켜도 이벤트당 0~1건
            autoDetect: false,    // 입구: 수동 기본 + 자동 옵션
            frequency: 55,        // 사건 빈도 (자동 모드일 때)
        },
    };
}

function cryptoId() {
    try { return crypto.randomUUID(); }
    catch (e) { return 'bl-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
}

// ── 상태 로드/저장 ──
function loadState() {
    const ctx = getCtx();
    if (!ctx || !ctx.chatMetadata) return defaultState();
    const existing = ctx.chatMetadata[STATE_KEY];
    if (existing && typeof existing === 'object') return Object.assign(defaultState(), existing);
    const fresh = defaultState();
    ctx.chatMetadata[STATE_KEY] = fresh;
    return fresh;
}

function saveState(state) {
    const ctx = getCtx();
    if (!ctx || !ctx.chatMetadata) return;
    ctx.chatMetadata[STATE_KEY] = state;
    if (ctx.saveMetadataDebounced) ctx.saveMetadataDebounced();
    else if (ctx.saveMetadata) ctx.saveMetadata();
}

let STATE = defaultState();

// ── 최근 메시지 텍스트 추출 (감지 입력, getCMRS 멀티셰이프 방식) ──
function getLastMessageText() {
    const ctx = getCtx();
    if (!ctx || !Array.isArray(ctx.chat) || ctx.chat.length === 0) return '';
    const msg = ctx.chat[ctx.chat.length - 1];
    return (msg && (msg.mes || msg.extra?.display_text)) || '';
}

// ── [STUB] 감지: 장면에서 조우 뽑기 ───────────────────────────
// TODO(3단계): ctx.generateQuietPrompt 로 LLM 분류/생성 교체.
//   - 한국어 강제, 토큰 4096, "싸울 만한 조우" 쪽으로 가리키기(금지 말고).
//   - 톤 인지: 무거운 씬이면 null 반환(안 끼어듦).
function detectEncounterStub(_sceneText) {
    const pool = [
        { emoji: '🪳', title: '야생의 바퀴벌레가 나타났다', foe: '바퀴벌레', difficulty: 2 },
        { emoji: '🧑‍💼', title: '옆자리 동료와 조우', foe: '옆자리 동료', difficulty: 3 },
        { emoji: '🥄', title: '길바닥에서 무언가 빛났다', foe: null, difficulty: 0 },
    ];
    return pool[Math.floor(Math.random() * pool.length)];
}

// ── [STUB] 판정 + 뒷얘기 ──────────────────────────────────────
// TODO(3단계): 전투력 vs 난이도 굴림 + LLM 뒷얘기 생성으로 교체.
function resolveChoiceStub(encounter, choice) {
    if (choice === '도망간다') {
        return { result: '도주', exp: 1, drop: null, inner: {
            foe: '상대는 도망치는 뒷모습을 멀뚱히 바라봤다.',
            user: '당신은 현명한 판단이었다고... 아마 스스로 우겼을 것이다.' } };
    }
    if (choice === '도움을 요청한다') {
        return { result: '협동', exp: 3, drop: null, inner: {
            foe: '아무도 안 도와줬다. 다들 자기 바퀴벌레 잡느라 바빴다.',
            user: '당신은 살짝 민망했을지도 모른다.' } };
    }
    // 선빵친다
    const win = STATE.power + 5 >= (encounter.difficulty || 0);
    return {
        result: win ? '승리' : '패배',
        exp: win ? 8 : 2,
        drop: win ? { name: '눅눅한 쿠폰', emoji: '🎟️', tier: '쓰레기', price: 0 } : null,
        // foe = 단정(상대는 AI 소유) / user = 추측형(may/can 원칙)
        inner: win
            ? { foe: '상대는 어딘가 뿌듯해 보였다.', user: '당신은... 내심 조금 미안했을지도 모른다.' }
            : { foe: '상대도 별로 안 진지했다.', user: '당신은 그게 더 아팠을 것이다.' },
    };
}

// ── 선택 처리: 상태 갱신 + 로그 + (선택 시) 반영 ──
function applyOutcome(encounter, choice, outcome) {
    STATE.xp += outcome.exp || 0;
    const entry = {
        id: cryptoId(),
        no: STATE.encounters.length + 1,
        emoji: encounter.emoji,
        title: encounter.title,
        desc: `${choice} — ${outcome.result}`,
        result: outcome.result,
        exp: outcome.exp,
        drop: outcome.drop ? outcome.drop.name : null,
        inner: outcome.inner,   // 🎙️ Hot Mic DNA: {foe, user} 양면 속마음 — 패널 전용
    };
    STATE.encounters.unshift(entry);

    if (outcome.drop) {
        STATE.items.unshift(Object.assign({ id: cryptoId(), verdict: '' }, outcome.drop));
        STATE.power += 1;
    }
    if (encounter.foe && !STATE.seenFoes.includes(encounter.foe)) STATE.seenFoes.push(encounter.foe);

    levelCheck();
    saveState(STATE);
    renderConsole();

    // 출구: 이벤트당 0 또는 1건. 📤 기본값이 ON일 때만 1건 주입.
    if (STATE.settings.injectDefault) injectToChat(entry);
}

function levelCheck() {
    const need = STATE.level * 100;
    if (STATE.xp >= need) {
        STATE.xp -= need;
        STATE.level += 1;
        // TODO(4단계): 레벨 = 장식. 칭호 갱신 + 웃김 에스컬레이션 + 칭호 RP 반영.
    }
}

// ── [STUB] 챗 반영: 산문 연료로 주입 (시스템 문자열 X) ─────────
// TODO(2~3단계): ctx.sendMessageAsUser / addOneMessage / generate 트리거 확정.
//   원칙: RP가 바로 이어쓸 수 있는 '장면 훅'으로. 절대 [WIN +8XP] 같은 raw 금지.
function injectToChat(entry) {
    const ctx = getCtx();
    // OFF-SCREEN: 주입엔 세계+상대 반응(inner.foe)만. 유저 속마음(inner.user)은 절대 주입 X — 패널 전용.
    const foeBeat = entry.inner && entry.inner.foe ? ' ' + entry.inner.foe : '';
    const prose = `(${entry.desc}.${foeBeat})`.trim();
    blDebug('주입 stub:', prose);
    // 예시 경로 (버전 확정 후 1개로 고정):
    // if (ctx?.sendMessageAsUser) await ctx.sendMessageAsUser(prose);
    // else if (ctx?.addOneMessage) ctx.addOneMessage({ is_user: true, mes: prose, name: ctx.name1 });
}

// ── UI: 미니 콘솔 (직사각형, 챗주입바 + 템창 + 결투창) ──
let consoleEl = null;
let pendingEncounter = null;

function buildConsole() {
    if (consoleEl) return;
    consoleEl = document.createElement('div');
    consoleEl.id = 'beastlog-console';
    consoleEl.innerHTML = `
      <div class="bl-topbar">
        <span class="bl-paw">🐾</span>
        <span class="bl-lv num"></span>
        <span class="bl-xmini"><i></i></span>
        <span class="bl-spacer"></span>
        <span class="bl-inject">
          <span class="bl-lab">📤 챗주입</span>
          <span class="bl-sw" data-on="true"></span>
        </span>
        <span class="bl-up" title="펼치기">⌃</span>
      </div>
      <div class="bl-panes">
        <div class="bl-pane bl-left">
          <div class="bl-pane-h">📦 템창 <span class="bl-cnt bl-itemcnt num"></span></div>
          <div class="bl-items"></div>
          <div class="bl-pwr">⚔️ 전투력 <b class="num bl-power"></b></div>
        </div>
        <div class="bl-pane bl-right">
          <div class="bl-pane-h">⚔️ 결투창</div>
          <div class="bl-last"></div>
          <button class="bl-roll">🎲 조우 굴리기</button>
          <button class="bl-fight">⚔️ 결투 시작</button>
        </div>
      </div>`;
    document.body.appendChild(consoleEl);

    consoleEl.querySelector('.bl-sw').addEventListener('click', (e) => {
        STATE.settings.injectDefault = !STATE.settings.injectDefault;
        e.currentTarget.dataset.on = STATE.settings.injectDefault ? 'true' : 'false';
        saveState(STATE);
    });
    consoleEl.querySelector('.bl-roll').addEventListener('click', onDetect);
    consoleEl.querySelector('.bl-fight').addEventListener('click', onDetect);
    consoleEl.querySelector('.bl-up').addEventListener('click', () => {
        // TODO(4단계): 펼침 상태(조우 로그 표시) 토글
        blDebug('펼치기 — 미구현');
    });
}

function renderConsole() {
    if (!consoleEl) return;
    consoleEl.querySelector('.bl-lv').textContent = 'Lv.' + String(STATE.level).padStart(2, '0');
    const need = STATE.level * 100;
    consoleEl.querySelector('.bl-xmini i').style.width = Math.min(100, (STATE.xp / need) * 100) + '%';
    consoleEl.querySelector('.bl-sw').dataset.on = STATE.settings.injectDefault ? 'true' : 'false';
    consoleEl.querySelector('.bl-itemcnt').textContent = STATE.items.length;
    consoleEl.querySelector('.bl-power').textContent = STATE.power;

    const itemsEl = consoleEl.querySelector('.bl-items');
    itemsEl.innerHTML = STATE.items.slice(0, 3).map(it =>
        `<div class="bl-item"><span>${it.emoji || '📦'}</span><span class="nm">${escapeHtml(it.name)}</span><span class="pr num">${it.price || 0}원</span></div>`
    ).join('') || '<div class="bl-empty">아직 주운 게 없다</div>';

    const last = STATE.encounters[0];
    consoleEl.querySelector('.bl-last').innerHTML = last
        ? `<div class="bl-foe"><div class="nm">${last.emoji} ${escapeHtml(last.title)}</div><div class="sub">직전 · ${escapeHtml(last.result)} · EXP +${last.exp}</div></div>`
        : `<div class="bl-foe"><div class="sub">조용하다.</div></div>`;
}

// ── 루프: 감지 → 팝업 → 선택 → 반영 ──
function onDetect() {
    const encounter = detectEncounterStub(getLastMessageText());
    if (!encounter) return; // 톤 인지: 안 끼어들 때
    pendingEncounter = encounter;
    showEncounterPopup(encounter);
}

function showEncounterPopup(encounter) {
    const old = document.getElementById('beastlog-popup');
    if (old) old.remove();
    const pop = document.createElement('div');
    pop.id = 'beastlog-popup';
    pop.innerHTML = `
      <div class="bl-pop-card">
        <div class="bl-pop-title">${encounter.emoji} ${escapeHtml(encounter.title)}!</div>
        <div class="bl-pop-choices">
          <button data-c="선빵친다">⚔️ 선빵친다</button>
          <button data-c="도망간다">🏃 도망간다</button>
          <button data-c="도움을 요청한다">🙋 도움을 요청한다</button>
        </div>
        <button class="bl-pop-ignore" data-c="">무시</button>
      </div>`;
    document.body.appendChild(pop);
    pop.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            const choice = btn.dataset.c;
            pop.remove();
            if (!choice) return; // 무시 = 0건 (주입 안 함)
            const outcome = resolveChoiceStub(encounter, choice);
            applyOutcome(encounter, choice, outcome);
        });
    });
}

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ── 이벤트 훅 ──
function registerEvents() {
    const ctx = getCtx();
    if (!ctx || !ctx.eventSource) return;
    const types = ctx.eventTypes || ctx.event_types || {};
    if (types.CHAT_CHANGED) {
        ctx.eventSource.on(types.CHAT_CHANGED, () => { STATE = loadState(); renderConsole(); });
    }
    // TODO(자동 옵션): types.MESSAGE_RECEIVED 구독 → 빈도 게이트 통과 시 onDetect()
}

// ── init ──
function init() {
    STATE = loadState();
    buildConsole();
    renderConsole();
    registerEvents();
    blDebug('비스트로그', BEASTLOG_VERSION, '로드됨');
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
}
