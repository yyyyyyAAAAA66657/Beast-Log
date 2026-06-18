// 🐯 비스트로그 (Beast Log) v0.16.0 — 모바일 마운트 복구(z-index·폴백·자가복구) + 미니창 드래그 이동
// 버전 3곳 동시 갱신: (1) 이 주석, (2) BEASTLOG_VERSION, (3) manifest.json
//
// 제1원칙: 재밌음 + RP에 긍정적. 컨셉: "채팅 속 일상 → 조우/상황/선택/소문/후일담."
// 다마고치+동숲 톤. 전투 용어(결투/전투력) 안 씀. 잡템=웃김 / 떡밥=RP연료(주입). 아이템 사용 메카닉 없음.
// OFF-SCREEN: 뒷소문(유저 쪽)은 패널 전용. 저장: 게임=chat_metadata / 설정=extension_settings.

const BEASTLOG_VERSION = '0.16.0';
const MODULE = 'beast_log';

function getCtx() {
    try { if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) return SillyTavern.getContext(); }
    catch (e) { /* noop */ }
    return (typeof window !== 'undefined' && window.SillyTavern && window.SillyTavern.getContext)
        ? window.SillyTavern.getContext() : null;
}
function blDebug(...a) { if (window.__beastlogDebug) console.log('[비스트로그]', ...a); }
function cryptoId() { try { return crypto.randomUUID(); } catch (e) { return 'bl-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); } }
function nowHHMM() { try { return new Date().toTimeString().slice(0, 5); } catch (e) { return '--:--'; } }
function nowDate() { try { const d = new Date(); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; } catch (e) { return '----.--.--'; } }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── 마스코트 (선택 · 라인별 진화) ──
const MASCOTS = {
    tiger: { label: '호랑이', stages: [{ min: 10, emoji: '🦁', name: '백수의 왕' }, { min: 5, emoji: '🐅', name: '호랑이' }, { min: 1, emoji: '🐯', name: '새끼 호랑이' }] },
    cat: { label: '고양이', stages: [{ min: 10, emoji: '🐈‍⬛', name: '밤의 지배자' }, { min: 5, emoji: '🐈', name: '고양이' }, { min: 1, emoji: '🐱', name: '새끼 고양이' }] },
    dog: { label: '강아지', stages: [{ min: 10, emoji: '🐺', name: '우두머리' }, { min: 5, emoji: '🐕', name: '개' }, { min: 1, emoji: '🐶', name: '강아지' }] },
    chick: { label: '병아리', stages: [{ min: 10, emoji: '🦅', name: '창공의 왕' }, { min: 5, emoji: '🐔', name: '닭' }, { min: 1, emoji: '🐤', name: '병아리' }] },
};
const MASCOT_KEYS = Object.keys(MASCOTS);
function curMascot() { return MASCOTS[EXT.mascot] || MASCOTS.tiger; }
function evoStage(lv) { const st = curMascot().stages; for (const e of st) { if (lv >= e.min) return e; } return st[st.length - 1]; }

// ── 희귀도 / 아이템 타입 ──
const RARITY = { common: { label: '일반', dot: '⚪' }, rare: { label: '희귀', dot: '🟢' }, epic: { label: '영웅', dot: '🔵' }, legend: { label: '전설', dot: '🟣' } };
function rollRarity() { const r = Math.random(); if (r < 0.005) return 'legend'; if (r < 0.05) return 'epic'; if (r < 0.2) return 'rare'; return 'common'; }
const BAIT_CHANCE = { common: 0.10, rare: 0.40, epic: 0.70, legend: 1.0 };
function rollItemType(rarity) { return Math.random() < (BAIT_CHANCE[rarity] != null ? BAIT_CHANCE[rarity] : 0.10) ? 'bait' : 'junk'; }

// ── 관계 등급 ──
const REL_TIERS = [{ min: 80, label: '죽마고우' }, { min: 50, label: '친해진 사이' }, { min: 25, label: '아는 사이일지도?' }, { min: 10, label: '몇 번 본 사이' }, { min: 0, label: '낯선 사이' }];
function relTier(aff) { for (const t of REL_TIERS) { if (aff >= t.min) return t.label; } return '낯선 사이'; }
function affinityDelta(kind) { return ({ help: 2, cooperate: 3, activity: 1, interact: 0, loot: 0, flee: 0, attack: -1 })[kind] || 0; }

// ── 로딩 멘트 풀 ──
const LOAD_APPEAR = ['두리번거리는 중...', '킁킁 냄새 맡는 중...', '골목을 기웃거리는 중...', '수상한 기척을 쫓는 중...', '풀숲을 헤집는 중...', '누군가 다가오는 중...', '뭔가 어슬렁대는 중...', '주변을 살피는 중...', '발소리를 듣는 중...', '고개를 갸웃하는 중...', '냄새의 출처를 찾는 중...'];
const LOAD_SIT = ['바람 냄새 맡는 중...', '하늘을 올려다보는 중...', '공기가 바뀌는 걸 느끼는 중...', '낌새를 살피는 중...', '뭔가 다가오는 중...', '분위기를 재는 중...', '먹구름을 보는 중...', '이상한 예감이 드는 중...', '곤란한 일이 다가오는 중...'];
const LOAD_RESOLVE = ['무슨 일이 벌어지는 중...', '눈치 보는 중...', '잠깐 숨 참는 중...', '상황이 흘러가는 중...', '결과를 지켜보는 중...', '두근대는 중...', '침을 꼴깍 삼키는 중...', '귀를 쫑긋 세우는 중...'];
const NO_NEWS = ['…별다른 뒷소문은 없었다.', '아무 일도 일어나지 않았다. 정말로.', '소문이 돌기엔 너무 사소했다.', '아무도 신경 쓰지 않았다.', '세상은 평소처럼 무심했다.'];
const AFTER_POOL = ['며칠 뒤, 그 사람은 당신을 꽤 괜찮은 사람으로 기억하고 있었다.', '소문은 며칠 만에 퍼졌다. 진실은 아무도 몰랐다.', '3일 뒤에도 누군가는 아직 그 일을 오해하고 있었다.', '그 장면은 한동안 누군가의 술자리 안주가 되었다.'];
function rollAfter() { return Math.random() < 0.18 ? pick(AFTER_POOL) : null; }

// ── 전역 설정 ──
function defaultExt() { return { connectionProfile: '', autoDetect: false, cooldownTurns: 3, mascot: 'tiger', contextDepth: 'balance', consolePos: null }; }
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
        uuid: cryptoId(), level: 1, xp: 0, title: '갓 들어온 손님', rep: 0,
        mood: 3, hunger: 3, hp: 3,
        items: [], encounters: [], npcs: {},
        currentNpc: null, currentSituation: null,
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
function getProfiles() {
    const ctx = getCtx();
    const cm = (ctx && ctx.extensionSettings && ctx.extensionSettings.connectionManager) || null;
    return (cm && Array.isArray(cm.profiles)) ? cm.profiles : [];
}

// ── [STUB] 폴백용 생성/판정 ──
function generateAppearStub() {
    const pool = [
        { category: 'npc', emoji: '🐕', title: '동네 개가 따라온다', foe: '동네 개', foeType: 'creature', choices: [{ label: '쓰다듬는다', kind: 'activity' }, { label: '간식을 준다', kind: 'help' }, { label: '모른 척 걷는다', kind: 'flee' }] },
        { category: 'npc', emoji: '🛋️', title: '버려진 소파가 보인다', foe: '버려진 소파', foeType: 'object', choices: [{ label: '앉아본다', kind: 'activity' }, { label: '살펴본다', kind: 'interact' }, { label: '지나친다', kind: 'flee' }] },
        { category: 'npc', emoji: '🐦', title: '새 한 마리가 빤히 본다', foe: '참견하는 새', foeType: 'creature', choices: [{ label: '말을 건다', kind: 'help' }, { label: '같이 본다', kind: 'activity' }, { label: '시비를 건다', kind: 'attack' }] },
    ];
    return pick(pool);
}
function generateSituationStub() {
    const pool = [
        { category: 'situation', emoji: '🌧️', title: '갑자기 비가 쏟아진다', desc: '우산은 당연히 없다.', choices: [{ label: '뛴다', kind: 'activity' }, { label: '비를 맞는다', kind: 'interact' }, { label: '피한다', kind: 'flee' }] },
        { category: 'situation', emoji: '📦', title: '택배가 도착했다', desc: '아무도 시킨 적 없는 택배다.', choices: [{ label: '열어본다', kind: 'loot' }, { label: '반송한다', kind: 'flee' }, { label: '모른 척한다', kind: 'interact' }] },
    ];
    return pick(pool);
}
function resolveByKind(item, kind) {
    const base = {
        flee: { result: '회피', exp: 1, rep: 0, drop: null, inner: { foe: '상대는 떠나는 뒷모습을 멀뚱히 봤다.', user: '당신은 현명했다고 우겼을 것이다.' } },
        help: { result: '도움', exp: 3, rep: 1, drop: null, inner: { foe: '고맙다곤 했지만, 동정인가 싶기도 했다.', user: '당신은 별 생각 없었을 것이다.' } },
        cooperate: { result: '협력', exp: 4, rep: 1, drop: null, inner: { foe: '주변은 둘을 꽤 가까운 사이로 봤다.', user: '당신은 효율만 따졌을 뿐이다.' } },
        activity: { result: '함께함', exp: 2, rep: 0, drop: null, inner: { foe: '그 시간을 나쁘지 않게 보냈다.', user: '당신은 즐거웠다고 인정하긴 싫었을 것이다.' } },
        loot: { result: '주움', exp: 2, rep: 0, drop: { name: '녹슨 숟가락', emoji: '🥄', price: 0 }, inner: { foe: '아무도 안 주운 데는 이유가 있었다.', user: '당신은 왜 주웠는지 모를 것이다.' } },
        interact: { result: '기웃', exp: 1, rep: 0, drop: null, inner: { foe: '별 반응이 없었다.', user: '당신은 괜히 건드렸다 싶었을 것이다.' } },
        attack: { result: '시비', exp: 2, rep: -1, drop: null, inner: { foe: '상대는 황당해했다. 뭐 이런 게 다 있나.', user: '당신은 왜 그랬는지 스스로도 몰랐을 것이다.' } },
    };
    return base[kind] || base.interact;
}

// ── LLM 엔진 ──
const VALID_KINDS = ['help', 'cooperate', 'activity', 'loot', 'interact', 'flee', 'attack'];
function stripTags(s) { return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }
function depthN() { return ({ balance: 2, '5': 5, '10': 10, '15': 15, all: 9999 })[EXT.contextDepth] || 2; }
function getConvo() {
    const ctx = getCtx();
    if (!ctx || !Array.isArray(ctx.chat)) return '(대화 없음)';
    const msgs = ctx.chat.filter(m => m && m.mes);
    const n = depthN();
    const slice = n >= 9999 ? msgs : msgs.slice(-n);
    const out = slice.map(m => `${m.is_user ? '유저' : (m.name || '상대')}: ${stripTags(m.mes)}`).join('\n');
    return (out || '(대화 없음)').slice(-6000);
}
function knownNpcsHint() {
    const arr = Object.values(STATE.npcs);
    if (!arr.length) return '';
    const names = arr.map(n => n.nickname ? `${n.name}(${n.nickname})` : n.name).slice(0, 12);
    return `\n[이미 만난 대상들] ${names.join(', ')}\n가끔(낮은 확률) 이 중 하나가 다시 나타나는 "재조우"로 만들어도 좋다. 그 경우 foe를 위 이름과 정확히 똑같이 써라.`;
}
function resolveProfile() {
    const id = EXT.connectionProfile;
    if (!id) return null;
    const p = getProfiles().find(x => (x.id || x.name) === id);
    return p ? id : '__missing__';
}
function extractText(res) {
    if (!res) return '';
    if (typeof res === 'string') return res.trim();
    const c = res.content
        || (res.choices && res.choices[0] && (res.choices[0].message ? res.choices[0].message.content : res.choices[0].text))
        || res.text || res.message || '';
    return String(c).trim();
}
function parseLLMJson(text) {
    let t = String(text).replace(/```json/gi, '').replace(/```/g, '').trim();
    const s = t.indexOf('{'), e = t.lastIndexOf('}');
    if (s >= 0 && e > s) t = t.slice(s, e + 1);
    return JSON.parse(t);
}
async function llmGenerate(prompt, maxTokens) {
    const ctx = getCtx();
    const cmrs = ctx && ctx.ConnectionManagerRequestService;
    const profileId = resolveProfile();
    if (profileId === '__missing__') throw { code: 'missing' };
    if (profileId && cmrs && typeof cmrs.sendRequest === 'function') {
        const res = await cmrs.sendRequest(profileId, prompt, maxTokens || 4096);
        const text = extractText(res);
        if (!text) throw { code: 'empty' };
        return text;
    }
    if (ctx && typeof ctx.generateQuietPrompt === 'function') {
        const text = await ctx.generateQuietPrompt(prompt, false, false);
        if (!text) throw { code: 'empty' };
        return String(text).trim();
    }
    throw { code: 'nogen' };
}
const RULES_FIT = '반드시 현재 대화 맥락(장소/시대/등장인물/분위기)에 어울려야 한다. 맥락에 없는 뜬금없는 대상(예: 한국 회사원, 김대리)을 만들지 마라. 무겁지 않은 일상 + 데드팬 코미디. 한국어로만. JSON만, 설명/코드펜스 금지.';
function buildAppearPrompt() {
    return `너는 RP 채팅에 어울리는 "조우 이벤트"를 만든다. 이 장면에 자연스럽게 나타날 법한 대상(인물/생물/사물) 하나.
${RULES_FIT}
선택지 3개(서로 다른 대응), 각 kind는 help/cooperate/activity/loot/interact/flee/attack 중 하나. attack은 괜히 시비 거는 선택.
foeType은 대상이 사람이면 "person", 동물/생물이면 "creature", 물건/사물이면 "object".
형식: {"category":"npc","emoji":"이모지 하나","title":"~가 나타났다/다가온다/보인다 류 한 문장","foe":"대상 이름(없으면 null)","foeType":"person|creature|object","choices":[{"label":"...","kind":"..."},{"label":"...","kind":"..."},{"label":"...","kind":"flee"}]}
${knownNpcsHint()}
[대화 맥락]
${getConvo()}`;
}
function buildSituationPrompt() {
    return `너는 RP 채팅에 어울리는 "상황 이벤트"(환경/사건)를 만든다. 인물이 아니라 장면에 닥치는 일.
${RULES_FIT}
선택지 3개. 형식: {"category":"situation","emoji":"이모지 하나","title":"한 문장","desc":"짧은 묘사 한 줄","choices":[{"label":"...","kind":"activity"},{"label":"...","kind":"interact"},{"label":"...","kind":"flee"}]}

[대화 맥락]
${getConvo()}`;
}
function buildResolvePrompt(item, choiceLabel, kind) {
    return `RP 이벤트의 "결과"와 "뒷소문"을 만든다.
이벤트: ${item.title} / 선택: ${choiceLabel} (kind:${kind})
규칙: 데드팬 코미디, 한국어. exp=경험치 정수. rep=평판 변화 정수(좋은 행동 +, 괜히 시비/민폐 -). affDelta=관계 변화 정수(없으면 0).
inner.foe=상대/주변의 진짜 속내(수치와 어긋나도 됨, 그게 재미). inner.user=유저 속내 추측("~했을지도/~었을 것이다" 식 단정 금지).
after=가끔만(대개 null) 며칠 뒤 오해/뒷이야기 한 줄. drop=주운 물건 있으면 {name,emoji,price:0}, 없으면 null.
대상(인물/생물)이 있으면: npcMemory=그 대상에 대해 오래 남을 한 줄 기억(없으면 null), npcState=그 대상의 현재 상태 짧게(예: 건강함/기분 좋음/지쳐 보임, 없으면 null). JSON만.
형식: {"result":"짧은 결과 라벨","exp":정수,"rep":정수,"affDelta":정수,"drop":{...}또는null,"inner":{"foe":"...","user":"..."},"after":"..."또는null,"npcMemory":"..."또는null,"npcState":"..."또는null}

[대화 맥락]
${getConvo()}`;
}
function normalizeEvent(o, cat) {
    o = o || {};
    let choices = Array.isArray(o.choices) ? o.choices.slice(0, 4) : [];
    choices = choices.filter(c => c && c.label).map(c => ({ label: String(c.label), kind: VALID_KINDS.includes(c.kind) ? c.kind : 'interact' }));
    if (!choices.length) choices = [{ label: '대응한다', kind: 'interact' }, { label: '지나친다', kind: 'flee' }];
    return {
        category: o.category === 'situation' ? 'situation' : cat,
        emoji: String(o.emoji || (cat === 'situation' ? '🌦️' : '❓')).slice(0, 4),
        title: String(o.title || (cat === 'situation' ? '무언가 일어났다' : '무언가 나타났다')),
        foe: (o.foe && o.foe !== 'null') ? String(o.foe) : null,
        foeType: ['person', 'creature', 'object'].includes(o.foeType) ? o.foeType : 'creature',
        desc: o.desc ? String(o.desc) : '',
        choices,
    };
}
function normalizeOutcome(o, kind) {
    o = o || {};
    return {
        result: String(o.result || '결과'),
        exp: Number.isFinite(o.exp) ? o.exp : 1,
        rep: Number.isFinite(o.rep) ? o.rep : 0,
        affDelta: Number.isFinite(o.affDelta) ? o.affDelta : affinityDelta(kind),
        drop: (o.drop && o.drop.name) ? { name: String(o.drop.name), emoji: String(o.drop.emoji || '📦'), price: o.drop.price || 0 } : null,
        inner: { foe: String((o.inner && o.inner.foe) || '별일 없었던 것 같다.'), user: String((o.inner && o.inner.user) || '당신도 잘 모르겠을 것이다.') },
        after: (o.after && o.after !== 'null') ? String(o.after) : null,
        npcMemory: (o.npcMemory && o.npcMemory !== 'null') ? String(o.npcMemory) : null,
        npcState: (o.npcState && o.npcState !== 'null') ? String(o.npcState) : null,
    };
}
function handleLlmError(err) {
    const code = err && err.code;
    if (code === 'nogen') return false;
    if (code === 'missing') showAlarm('엇... 고른 연결 프로필이 사라졌어요;;', '설정에서 프로필을 다시 골라주세요.');
    else if (code === 'empty') showAlarm('어어... 응답이 텅 비어서 왔어요;;', '모델이 잠깐 딴짓하나 봐요. 조금 뒤에 다시 눌러주세요.');
    else showAlarm('엇... 연결이 안 되네요;;', '고른 프로필 연결을 확인해 주세요. (그때까진 못 움직여요)');
    return true;
}

function applyOutcome(item, choiceLabel, outcome, kind) {
    STATE.xp += outcome.exp || 0;
    STATE.rep = (STATE.rep || 0) + (outcome.rep || 0);
    const rarity = outcome.drop ? rollRarity() : 'common';
    const itemType = outcome.drop ? rollItemType(rarity) : null;
    const affDelta = item.foe ? (Number.isFinite(outcome.affDelta) ? outcome.affDelta : affinityDelta(kind)) : 0;
    const entry = {
        id: cryptoId(), no: STATE.encounters.length + 1, time: nowHHMM(), category: item.category || 'npc',
        emoji: item.emoji, title: item.title, desc: `${choiceLabel} — ${outcome.result}`,
        result: outcome.result, exp: outcome.exp, rep: outcome.rep || 0, rarity, affDelta, foe: item.foe || null,
        drop: outcome.drop ? outcome.drop.name : null, dropBait: itemType === 'bait',
        inner: outcome.inner, after: (outcome.after || rollAfter()), _noNews: pick(NO_NEWS), revealed: false, open: false,
    };
    STATE.encounters.unshift(entry);
    if (outcome.drop) STATE.items.unshift(Object.assign({ id: cryptoId(), rarity, itemType }, outcome.drop));

    if (item.foe) {
        const isNew = !STATE.npcs[item.foe];
        const reg = STATE.npcs[item.foe] || { name: item.foe, nickname: '', emoji: item.emoji, dexType: 'creature', affinity: 0, metCount: 0, firstMet: nowDate(), lastMet: nowDate(), tier: '낯선 사이', state: '평범함', memory: '', log: [], terjut: false };
        const before = reg.tier;
        const disp = reg.nickname || reg.name;
        reg.metCount += 1; reg.affinity += affDelta; reg.lastMet = nowDate();
        if (isNew) reg.firstMet = nowDate();
        if (item.foeType) reg.dexType = item.foeType;
        reg.tier = relTier(reg.affinity); reg.terjut = reg.metCount >= 5;
        const stateChanged = outcome.npcState && outcome.npcState !== reg.state;
        if (outcome.npcState) reg.state = outcome.npcState;
        if (outcome.npcMemory) reg.memory = outcome.npcMemory;
        // 변화 로그 (타임라인)
        reg.log = reg.log || [];
        const note = isNew ? '처음 발견' : (outcome.npcMemory || (stateChanged ? `상태: ${outcome.npcState}` : (choiceLabel + ' — ' + outcome.result)));
        reg.log.unshift({ date: nowDate(), note: String(note).slice(0, 70) });
        if (reg.log.length > 14) reg.log.length = 14;
        STATE.npcs[item.foe] = reg;
        STATE.currentNpc = item.foe;
        if (reg.tier !== before) flash(`${reg.emoji} ${disp} — '${reg.tier}'!`);
        else if (reg.terjut && reg.metCount === 5) flash(`${reg.emoji} ${disp} 터줏대감 등극!`);
        else if (!isNew) flash(`${reg.emoji} ${disp} 재조우!`);
    }
    if (item.category === 'situation') STATE.currentSituation = { emoji: item.emoji, title: item.title };

    if (outcome.rep > 0) STATE.mood = clamp03(STATE.mood + 1);
    else if (outcome.rep < 0) STATE.mood = clamp03(STATE.mood - 1);
    if (kind === 'attack') STATE.hp = clamp03(STATE.hp - 1);
    if (STATE.encounters.length % 3 === 0) STATE.hunger = clamp03(STATE.hunger - 1);

    levelCheck();
    saveState(STATE);
    renderAll();
    if (STATE.settings.injectDefault) {
        const foeBeat = entry.inner && entry.inner.foe ? ' ' + entry.inner.foe : '';
        injectProse(`(${entry.desc}.${foeBeat})`);
    }
    showResultPopup(entry);
}
function clamp03(n) { return Math.max(0, Math.min(3, n)); }
function levelCheck() { const need = STATE.level * 100; if (STATE.xp >= need) { STATE.xp -= need; STATE.level += 1; flash(`⭐ 레벨업! Lv.${STATE.level}`); } }

// ── 주입 ──
function injectProse(prose) {
    if (!canInject()) { flash(`아직 텀 — ${injectRemaining()}턴 후 (일지엔 기록됨)`); return false; }
    blDebug('주입 stub:', prose); markInject(); flash('챗에 반영됨'); return true;
}
function injectBait() {
    const bait = STATE.items.find(i => i.itemType === 'bait') || STATE.items[0];
    if (!bait) { flash('주울 게 없다'); return; }
    injectProse(`(가방에서 ${bait.name}이(가) 굴러나왔다.)`);
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
function npcLine() {
    if (!STATE.currentNpc || !STATE.npcs[STATE.currentNpc]) return '<span class="bl-slot-empty">아무도 없음</span>';
    const n = STATE.npcs[STATE.currentNpc];
    return `${n.emoji} ${escapeHtml(n.nickname || n.name)} · <b>${escapeHtml(n.tier)}</b>`;
}
function sitLine() {
    if (!STATE.currentSituation) return '<span class="bl-slot-empty">평온함</span>';
    return `${STATE.currentSituation.emoji} ${escapeHtml(STATE.currentSituation.title)}`;
}
function itemChip(it) {
    return `<span class="bl-jchip${it.itemType === 'bait' ? ' bait' : ''}">${it.itemType === 'bait' ? '🎣 ' : ''}${RARITY[it.rarity] ? RARITY[it.rarity].dot : ''} ${it.emoji || '📦'} ${escapeHtml(it.name)}</span>`;
}
function bagPreviewHtml(limit) {
    if (!STATE.items.length) return '<div class="bl-empty">텅 비었다.</div>';
    const baits = STATE.items.filter(i => i.itemType === 'bait');
    const junks = STATE.items.filter(i => i.itemType !== 'bait');
    const shown = baits.concat(junks).slice(0, limit);
    const rest = STATE.items.length - shown.length;
    let html = shown.map(itemChip).join('');
    if (rest > 0) html += `<span class="bl-bag-more">외 잡템 ${rest}개</span>`;
    return html;
}

// ── 미니 콘솔 (올인원) ──
let consoleEl = null;
function buildConsole() {
    if (consoleEl) return;
    consoleEl = document.createElement('div');
    consoleEl.id = 'beastlog-console';
    consoleEl.innerHTML = `
      <div class="bl-topbar">
        <span class="bl-title">🐯 비스트로그</span>
        <span class="bl-spacer"></span>
        <span class="bl-inject"><span class="bl-lab">📤</span><span class="bl-sw" data-on="true"></span></span>
        <span class="bl-up" title="기록·설정 열기">📖</span>
      </div>
      <div class="bl-hero">
        <div class="bl-hero-pet" title="탭하면 마스코트 변경"><span class="bl-pet-emoji"></span></div>
        <div class="bl-hero-info">
          <div class="bl-hero-top"><span class="bl-pet-name"></span><span class="bl-lv num"></span></div>
          <div class="bl-status">
            <span class="bl-st">기분 <b class="bl-st-mood"></b></span>
            <span class="bl-st">배고픔 <b class="bl-st-hunger"></b></span>
            <span class="bl-st">체력 <b class="bl-st-hp"></b></span>
          </div>
          <div class="bl-xpbar"><i></i></div>
          <div class="bl-hero-stats">⭐ 평판 <b class="num bl-rep"></b> · 🎒 <b class="num bl-itemcnt"></b></div>
        </div>
      </div>
      <div class="bl-slots">
        <div class="bl-slot"><span class="bl-slot-h">📢 현재 상황</span><span class="bl-slot-v bl-sit-v"></span></div>
        <div class="bl-slot"><span class="bl-slot-h">👤 현재 조우</span><span class="bl-slot-v bl-npc-v"></span></div>
      </div>
      <div class="bl-actions">
        <button class="bl-roll">🐯 출현</button>
        <button class="bl-randevent">🌦️ 상황</button>
      </div>
      <div class="bl-acc bl-bag-acc collapsed">
        <div class="bl-acc-head"><h3>🎒 가방</h3><span class="bl-rule"></span><span class="bl-bag-cnt num"></span><button class="bl-bag-inject" title="떡밥 주입">📤</button><span class="bl-chev">▾</span></div>
        <div class="bl-acc-body"><div class="bl-bag-list"></div></div>
      </div>`;
    document.body.appendChild(consoleEl);
    consoleEl.querySelector('.bl-sw').addEventListener('click', () => setInjectDefault(!STATE.settings.injectDefault));
    consoleEl.querySelector('.bl-hero-pet').addEventListener('click', cycleMascot);
    consoleEl.querySelector('.bl-roll').addEventListener('click', onAppear);
    consoleEl.querySelector('.bl-randevent').addEventListener('click', onSituation);
    consoleEl.querySelector('.bl-up').addEventListener('click', showFull);
    const bagHead = consoleEl.querySelector('.bl-bag-acc .bl-acc-head');
    bagHead.addEventListener('click', e => {
        if (e.target.closest('.bl-bag-inject')) { injectBait(); return; }
        bagHead.parentElement.classList.toggle('collapsed');
    });
    wireDrag(consoleEl.querySelector('.bl-topbar'));
}
// 미니창 드래그 (경계 클램프 + 위치 저장)
function wireDrag(bar) {
    if (!bar) return;
    let st = null;
    bar.addEventListener('pointerdown', e => {
        if (e.target.closest('button, .bl-sw, .bl-up, .bl-inject')) return;
        const r = consoleEl.getBoundingClientRect();
        st = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
        consoleEl.style.left = r.left + 'px'; consoleEl.style.top = r.top + 'px';
        consoleEl.style.right = 'auto'; consoleEl.style.bottom = 'auto'; consoleEl.style.margin = '0';
        try { bar.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    });
    bar.addEventListener('pointermove', e => {
        if (!st) return;
        st.moved = true;
        const w = consoleEl.offsetWidth, h = consoleEl.offsetHeight;
        let nx = Math.max(4, Math.min(window.innerWidth - w - 4, e.clientX - st.dx));
        let ny = Math.max(4, Math.min(window.innerHeight - h - 4, e.clientY - st.dy));
        consoleEl.style.left = nx + 'px'; consoleEl.style.top = ny + 'px';
    });
    const end = () => {
        if (!st) return;
        if (st.moved) { EXT.consolePos = { left: parseInt(consoleEl.style.left, 10), top: parseInt(consoleEl.style.top, 10) }; saveExt(); }
        st = null;
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
}
function applyConsolePos() {
    if (!consoleEl) return;
    const p = EXT.consolePos;
    if (!p || typeof p.left !== 'number') { consoleEl.style.left = ''; consoleEl.style.top = ''; consoleEl.style.right = ''; consoleEl.style.bottom = ''; consoleEl.style.margin = ''; return; }
    const w = consoleEl.offsetWidth || 340, h = consoleEl.offsetHeight || 220;
    const left = Math.max(4, Math.min(window.innerWidth - w - 4, p.left));
    const top = Math.max(4, Math.min(window.innerHeight - h - 4, p.top));
    consoleEl.style.left = left + 'px'; consoleEl.style.top = top + 'px';
    consoleEl.style.right = 'auto'; consoleEl.style.bottom = 'auto'; consoleEl.style.margin = '0';
}
function ensureMounted() {
    try { if (consoleEl && document.body && !document.body.contains(consoleEl)) document.body.appendChild(consoleEl); }
    catch (e) { /* noop */ }
}
function cycleMascot() {
    const i = MASCOT_KEYS.indexOf(EXT.mascot);
    EXT.mascot = MASCOT_KEYS[(i + 1) % MASCOT_KEYS.length];
    saveExt(); renderAll();
    flash(`${evoStage(STATE.level).emoji} ${curMascot().label}(으)로 변경`);
}
function renderConsole() {
    if (!consoleEl) return;
    const evo = evoStage(STATE.level), need = STATE.level * 100;
    consoleEl.querySelector('.bl-pet-emoji').textContent = evo.emoji;
    consoleEl.querySelector('.bl-pet-name').textContent = evo.name;
    consoleEl.querySelector('.bl-lv').textContent = 'Lv.' + String(STATE.level).padStart(2, '0');
    consoleEl.querySelector('.bl-st-mood').textContent = pips('😊', STATE.mood);
    consoleEl.querySelector('.bl-st-hunger').textContent = pips('🍖', STATE.hunger);
    consoleEl.querySelector('.bl-st-hp').textContent = pips('❤️', STATE.hp);
    consoleEl.querySelector('.bl-xpbar i').style.width = Math.min(100, (STATE.xp / need) * 100) + '%';
    consoleEl.querySelector('.bl-rep').textContent = (STATE.rep > 0 ? '+' : '') + STATE.rep;
    consoleEl.querySelector('.bl-itemcnt').textContent = STATE.items.length;
    consoleEl.querySelector('.bl-sw').dataset.on = STATE.settings.injectDefault ? 'true' : 'false';
    consoleEl.querySelector('.bl-sit-v').innerHTML = sitLine();
    consoleEl.querySelector('.bl-npc-v').innerHTML = npcLine();
    consoleEl.querySelector('.bl-bag-cnt').textContent = STATE.items.length;
    consoleEl.querySelector('.bl-bag-list').innerHTML = bagPreviewHtml(3);
}

// ── 풀버전 (기록·설정 전용) ──
let fullEl = null;
function buildFull() {
    if (fullEl) return;
    fullEl = document.createElement('div');
    fullEl.id = 'beastlog-full';
    fullEl.style.display = 'none';
    fullEl.innerHTML = `
      <div class="bl-full-card">
        <div class="bl-full-sign">
          <div class="bl-full-logo">📖 기록 · 설정</div>
          <div class="bl-full-actions"><button class="bl-min" title="작게">⊟</button><button class="bl-close" title="닫기">✕</button></div>
        </div>
        <div class="bl-full-body">
          <div class="bl-full-toggles">
            <label><span>📤 결과를 챗에 띄우기</span><input type="checkbox" class="bl-t-inject"></label>
            <label><span>📥 자동 감지 (입구)</span><input type="checkbox" class="bl-t-auto"></label>
          </div>
          <div class="bl-cd-row"><span>텀 (주입 간격)</span><input type="number" class="bl-cd-input" min="0" max="20"><span>턴</span></div>
          <div class="bl-acc">
            <div class="bl-acc-head"><h3>📜 모험일지</h3><span class="bl-rule"></span><span class="bl-enc-cnt num"></span><span class="bl-chev">▾</span></div>
            <div class="bl-acc-body"><div class="bl-enc-list"></div></div>
          </div>
          <div class="bl-acc">
            <div class="bl-acc-head"><h3>📖 인물 도감</h3><span class="bl-rule"></span><span class="bl-dex-cnt num"></span><span class="bl-chev">▾</span></div>
            <div class="bl-acc-body"><div class="bl-dex-list"></div></div>
          </div>
          <div class="bl-acc">
            <div class="bl-acc-head"><h3>🎒 가방 (전체)</h3><span class="bl-rule"></span><span class="bl-junk-cnt num"></span><span class="bl-chev">▾</span></div>
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
    fullEl.querySelectorAll('.bl-acc-head').forEach(h => h.addEventListener('click', () => h.parentElement.classList.toggle('collapsed')));
    fullEl.querySelector('.bl-enc-list').addEventListener('click', e => {
        const rev = e.target.closest('.bl-reveal');
        if (rev) { const en = STATE.encounters.find(x => x.id === rev.dataset.id); if (en) { en.revealed = true; saveState(STATE); renderFull(); } return; }
        const head = e.target.closest('.bl-tk-head');
        if (head) {
            const tk = head.parentElement; tk.classList.toggle('collapsed');
            const en = STATE.encounters.find(x => x.id === tk.dataset.id);
            if (en) { en.open = !tk.classList.contains('collapsed'); saveState(STATE); }
        }
    });
    fullEl.querySelector('.bl-dex-list').addEventListener('click', e => {
        const rn = e.target.closest('.bl-dex-rename');
        if (rn) { renameNpc(rn.dataset.npc); return; }
        const head = e.target.closest('.bl-dex-head');
        if (head) {
            const card = head.parentElement; card.classList.toggle('collapsed');
            const n = STATE.npcs[card.dataset.npc];
            if (n) { n._open = !card.classList.contains('collapsed'); saveState(STATE); }
        }
    });
    fullEl.addEventListener('click', e => { if (e.target === fullEl) showMini(); });
}
function afterBlock(e) {
    const rare = e.after
        ? `<div class="bl-af-rare">🗞️ 희귀 후일담 — ${escapeHtml(e.after)}</div>`
        : `<div class="bl-af-none">🗞️ ${escapeHtml(e._noNews || '별 소문 없었다.')}</div>`;
    return `<div class="bl-after"><div class="bl-af-line">💭 ${escapeHtml(e.inner.foe)}</div><div class="bl-af-line bl-af-you">👤 ${escapeHtml(e.inner.user)}</div>${rare}</div>`;
}
function chipsHtml(e) {
    return `${e.affDelta ? `<span class="bl-chip">❤️ ${e.affDelta > 0 ? '+' : ''}${e.affDelta}</span>` : ''}${e.rep ? `<span class="bl-chip">⭐ ${e.rep > 0 ? '+' : ''}${e.rep}</span>` : ''}<span class="bl-chip">EXP +${e.exp}</span>${e.drop ? `<span class="bl-chip">${e.dropBait ? '🎣 ' : ''}${escapeHtml(e.drop)}</span>` : ''}`;
}
function dexCard(n) {
    const disp = n.nickname || n.name;
    const logHtml = (n.log && n.log.length)
        ? `<div class="bl-dex-log"><div class="bl-dex-logttl">🕰️ 변화 로그</div>${n.log.map(l => `<div class="bl-dex-logrow"><span class="num">${escapeHtml(l.date)}</span> ${escapeHtml(l.note)}</div>`).join('')}</div>` : '';
    return `
      <div class="bl-dex${n._open ? '' : ' collapsed'}" data-npc="${escapeHtml(n.name)}">
        <div class="bl-dex-head">
          <span class="bl-dex-emoji">${n.emoji || '👤'}</span>
          <span class="bl-dex-nm">${escapeHtml(disp)}${n.terjut ? ' <span class="bl-terjut">터줏대감</span>' : ''}</span>
          <span class="bl-dex-rel">${escapeHtml(n.tier)}</span>
          <span class="bl-dex-chev">▾</span>
        </div>
        <div class="bl-dex-body">
          <div class="bl-dex-row"><span>첫 조우</span><b class="num">${escapeHtml(n.firstMet || '기록 없음')}</b></div>
          <div class="bl-dex-row"><span>최근 조우</span><b class="num">${escapeHtml(n.lastMet || '-')}</b></div>
          <div class="bl-dex-row"><span>조우 횟수</span><b class="num">${n.metCount}번</b></div>
          <div class="bl-dex-row"><span>현재 상태</span><b>${escapeHtml(n.state || '평범함')}</b></div>
          <div class="bl-dex-mem">💭 특별 기억 — ${n.memory ? escapeHtml(n.memory) : '<span class="bl-dim">아직 없음</span>'}</div>
          ${logHtml}
          <button class="bl-dex-rename" data-npc="${escapeHtml(n.name)}">✏️ 이름 짓기</button>
        </div>
      </div>`;
}
const DEX_GROUPS = [{ key: 'creature', label: '🐾 생물' }, { key: 'person', label: '👤 인물' }, { key: 'object', label: '📦 사물' }];
function renderFull() {
    if (!fullEl) return;
    fullEl.querySelector('.bl-t-inject').checked = STATE.settings.injectDefault;
    fullEl.querySelector('.bl-t-auto').checked = EXT.autoDetect;
    fullEl.querySelector('.bl-cd-input').value = EXT.cooldownTurns;

    fullEl.querySelector('.bl-enc-cnt').textContent = STATE.encounters.length + '건';
    fullEl.querySelector('.bl-enc-list').innerHTML = STATE.encounters.length
        ? STATE.encounters.map(e => `
            <div class="bl-ticket bl-tk-${e.category || 'npc'}${e.open ? '' : ' collapsed'}" data-id="${e.id}">
              <div class="bl-tk-head"><span class="bl-tk-time num">${e.time || ''}</span><span class="bl-tk-emoji">${e.emoji}</span><span class="bl-tk-title">${escapeHtml(e.title)}</span>${e.rarity && e.rarity !== 'common' ? `<span class="bl-tk-rar">${RARITY[e.rarity].dot}</span>` : ''}<span class="bl-tk-chev">▾</span></div>
              <div class="bl-tk-body">
                <div class="bl-tk-desc">${escapeHtml(e.desc)}</div>
                <div class="bl-tk-foot">${chipsHtml(e)}</div>
                ${e.inner ? (e.revealed ? afterBlock(e) : `<button class="bl-reveal" data-id="${e.id}">🗞️ 뒷소문 보기</button>`) : ''}
              </div>
            </div>`).join('')
        : '<div class="bl-empty">아직 아무 일도 없었다. 조용한 하루다.</div>';

    const npcArr = Object.values(STATE.npcs);
    fullEl.querySelector('.bl-dex-cnt').textContent = '발견 ' + npcArr.length;
    fullEl.querySelector('.bl-dex-list').innerHTML = npcArr.length
        ? DEX_GROUPS.map(g => {
            const arr = npcArr.filter(n => (n.dexType || 'creature') === g.key);
            if (!arr.length) return '';
            return `<div class="bl-dex-grouphead">${g.label} <span class="num">${arr.length}</span></div>` + arr.map(dexCard).join('');
        }).join('') || '<div class="bl-empty">아직 아무도 못 만났다.</div>'
        : '<div class="bl-empty">아직 아무도 못 만났다.</div>';

    fullEl.querySelector('.bl-junk-cnt').textContent = STATE.items.length + '개';
    fullEl.querySelector('.bl-junk-list').innerHTML = STATE.items.length
        ? STATE.items.map(itemChip).join('')
        : '<div class="bl-empty">텅 비었다.</div>';
}

// ── 상태 전환 ──
function showMini() { if (consoleEl) consoleEl.style.display = ''; if (fullEl) fullEl.style.display = 'none'; ensureMounted(); applyConsolePos(); renderConsole(); }
function showFull() { buildFull(); if (consoleEl) consoleEl.style.display = 'none'; fullEl.style.display = 'flex'; renderFull(); }
function hideHud() { if (consoleEl) consoleEl.style.display = 'none'; if (fullEl) fullEl.style.display = 'none'; }
function renderAll() { renderConsole(); if (fullEl) renderFull(); }

// ── 확장탭 설정창 ──
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
          <label class="bls-row"><span>맥락 깊이</span><select id="bls-depth" class="text_pole">
            <option value="balance">균형 (최근 2개)</option>
            <option value="5">최근 5개</option>
            <option value="10">최근 10개</option>
            <option value="15">최근 15개</option>
            <option value="all">전체</option>
          </select></label>
          <div class="bls-ver">🐯 Beast Log v${BEASTLOG_VERSION} · 확장 메뉴(🪄) 또는 미니창 📖 로 열기</div>
        </div>
      </div>`;
    container.appendChild(wrap);
    refreshProfileOptions();
    wrap.querySelector('#bls-profile').addEventListener('change', e => { EXT.connectionProfile = e.target.value; saveExt(); });
    const dsel = wrap.querySelector('#bls-depth');
    if (dsel) { dsel.value = EXT.contextDepth || 'balance'; dsel.addEventListener('change', e => { EXT.contextDepth = e.target.value; saveExt(); }); }
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
    item.addEventListener('click', () => { showMini(); const m = document.getElementById('extensionsMenu'); if (m) m.style.display = 'none'; });
}

// ── 루프 ──
async function onAppear() {
    showLoading(pick(LOAD_APPEAR));
    try {
        const txt = await llmGenerate(buildAppearPrompt(), 4096);
        const item = normalizeEvent(parseLLMJson(txt), 'npc');
        closePopup(); showChoicePopup(item);
    } catch (err) {
        closePopup();
        if (!handleLlmError(err)) showChoicePopup(generateAppearStub());
    }
}
async function onSituation() {
    showLoading(pick(LOAD_SIT));
    try {
        const txt = await llmGenerate(buildSituationPrompt(), 4096);
        const item = normalizeEvent(parseLLMJson(txt), 'situation');
        closePopup(); showChoicePopup(item);
    } catch (err) {
        closePopup();
        if (!handleLlmError(err)) showChoicePopup(generateSituationStub());
    }
}
function showChoicePopup(item) {
    closePopup();
    const cat = item.category || 'npc';
    const choices = (item.choices && item.choices.length) ? item.choices : [{ label: '대응한다', kind: 'interact' }, { label: '지나친다', kind: 'flee' }];
    let relLine = '';
    if (item.foe && STATE.npcs[item.foe]) relLine = `<div class="bl-pop-rel">${escapeHtml(STATE.npcs[item.foe].tier)} · ${STATE.npcs[item.foe].metCount}번째 만남</div>`;
    const pop = document.createElement('div'); pop.id = 'beastlog-popup';
    pop.innerHTML = `
      <div class="bl-pop-card bl-cat-${cat}">
        <div class="bl-pop-badge">${cat === 'npc' ? '🐯 조우' : '🌦️ 상황'}</div>
        <div class="bl-pop-emoji">${item.emoji}</div>
        <div class="bl-pop-title">${escapeHtml(item.title)}${cat === 'npc' ? '!' : ''}</div>
        ${relLine}
        ${item.desc ? `<div class="bl-pop-desc">${escapeHtml(item.desc)}</div>` : ''}
        <div class="bl-pop-choices">${choices.map((c, i) => `<button data-i="${i}">${escapeHtml(c.label)}</button>`).join('')}</div>
        <button class="bl-pop-ignore" data-i="-1">무시</button>
      </div>`;
    document.body.appendChild(pop);
    pop.querySelectorAll('button').forEach(btn => btn.addEventListener('click', async () => {
        const i = parseInt(btn.dataset.i, 10);
        if (i < 0) { closePopup(); return; }
        const c = choices[i];
        showLoading(pick(LOAD_RESOLVE));
        try {
            const txt = await llmGenerate(buildResolvePrompt(item, c.label, c.kind), 4096);
            const outcome = normalizeOutcome(parseLLMJson(txt), c.kind);
            closePopup(); applyOutcome(item, c.label, outcome, c.kind);
        } catch (err) {
            closePopup();
            if (!handleLlmError(err)) applyOutcome(item, c.label, resolveByKind(item, c.kind), c.kind);
        }
    }));
}
function showResultPopup(entry) {
    closePopup();
    const pop = document.createElement('div'); pop.id = 'beastlog-popup';
    pop.innerHTML = `
      <div class="bl-pop-card bl-cat-${entry.category}">
        <div class="bl-pop-badge">🎭 결과</div>
        <div class="bl-pop-title">${escapeHtml(entry.result)}</div>
        <div class="bl-pop-chips">${chipsHtml(entry)}</div>
        <div class="bl-result-rumor"><button class="bl-reveal2">🗞️ 뒷소문 보기</button></div>
        <button class="bl-pop-ignore bl-result-ok">일지에 저장됨 · 확인</button>
      </div>`;
    document.body.appendChild(pop);
    pop.querySelector('.bl-reveal2').addEventListener('click', () => {
        pop.querySelector('.bl-result-rumor').innerHTML = afterBlock(entry);
        const en = STATE.encounters.find(x => x.id === entry.id); if (en) { en.revealed = true; saveState(STATE); }
    });
    pop.querySelector('.bl-result-ok').addEventListener('click', closePopup);
}
function closePopup() { const p = document.getElementById('beastlog-popup'); if (p) p.remove(); }
function renameNpc(key) {
    const n = STATE.npcs[key]; if (!n) return;
    closePopup();
    const pop = document.createElement('div'); pop.id = 'beastlog-popup';
    pop.innerHTML = `<div class="bl-pop-card bl-cat-npc">
        <div class="bl-pop-badge">✏️ 이름 짓기</div>
        <div class="bl-pop-title">${escapeHtml(n.emoji || '')} ${escapeHtml(n.name)}</div>
        <input class="bl-rename-input" type="text" maxlength="20" placeholder="예: 감자" value="${escapeHtml(n.nickname || '')}">
        <div class="bl-rename-btns"><button class="bl-rename-cancel">취소</button><button class="bl-rename-ok">확인</button></div>
      </div>`;
    document.body.appendChild(pop);
    const input = pop.querySelector('.bl-rename-input');
    setTimeout(() => { try { input.focus(); } catch (e) { /* noop */ } }, 60);
    const commit = () => { n.nickname = stripTags(input.value).slice(0, 20); saveState(STATE); closePopup(); renderAll(); };
    pop.querySelector('.bl-rename-ok').addEventListener('click', commit);
    pop.querySelector('.bl-rename-cancel').addEventListener('click', closePopup);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
}
function showLoading(msg) {
    closePopup();
    const pop = document.createElement('div'); pop.id = 'beastlog-popup';
    pop.innerHTML = `<div class="bl-pop-card bl-loading"><div class="bl-load-emoji">${evoStage(STATE.level).emoji}</div><div class="bl-load-msg">${escapeHtml(msg)}</div><div class="bl-load-dots">. . .</div></div>`;
    document.body.appendChild(pop);
}
function showAlarm(title, msg) {
    closePopup();
    const pop = document.createElement('div'); pop.id = 'beastlog-popup';
    pop.innerHTML = `<div class="bl-pop-card bl-alarm">
        <div class="bl-alarm-emoji">😵‍💫</div>
        <div class="bl-alarm-title">${escapeHtml(title)}</div>
        <div class="bl-alarm-msg">${escapeHtml(msg)}</div>
        <button class="bl-pop-ignore bl-alarm-ok">확인</button>
      </div>`;
    document.body.appendChild(pop);
    pop.querySelector('.bl-alarm-ok').addEventListener('click', closePopup);
}

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
    if (types.CHAT_CHANGED) ctx.eventSource.on(types.CHAT_CHANGED, () => { STATE = loadState(); ensureMounted(); renderAll(); });
    // TODO(자동 옵션): EXT.autoDetect && types.MESSAGE_RECEIVED → 텀 통과 시 onAppear()
}

function init() {
    try {
        EXT = loadExt(); STATE = loadState();
        buildConsole(); renderConsole(); applyConsolePos();
        buildSettingsWithRetry(10); buildWandMenuWithRetry(10);
        registerEvents();
        setTimeout(ensureMounted, 1500);
        setTimeout(ensureMounted, 4000);
        blDebug('비스트로그', BEASTLOG_VERSION, '로드됨');
    } catch (e) { console.error('[비스트로그] init 실패:', e); }
}
// 모바일 디버그용 강제 호출구
if (typeof window !== 'undefined') {
    window.beastlog = {
        show: () => { try { ensureMounted(); showMini(); } catch (e) { console.error(e); } },
        full: () => { try { showFull(); } catch (e) { console.error(e); } },
        remount: () => { try { ensureMounted(); } catch (e) { console.error(e); } },
        reset: () => { EXT.consolePos = null; saveExt(); applyConsolePos(); },
    };
}
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
}
