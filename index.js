// 🐯 비스트로그 (Beast Log) v0.12.0 — LLM 연결 엔진 (맥락 일치 + 프로필 알람 + 뒷소문 생성)
// 버전 3곳 동시 갱신: (1) 이 주석, (2) BEASTLOG_VERSION, (3) manifest.json
//
// 제1원칙: 재밌음 + RP에 긍정적. 컨셉: "채팅 속 일상을 RPG 이벤트로 변환 → 선택 → 결과 → 뒷소문."
// 메인 질문은 "누구 만날까"지 "누구랑 싸울까"가 아니다. 결투는 attack 선택의 언쟁 분기로만.
// OFF-SCREEN: 뒷소문(유저 쪽)은 패널 전용. 저장: 게임=chat_metadata / 설정=extension_settings.

const BEASTLOG_VERSION = '0.12.0';
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

// ── 진화 / 희귀도 / 관계 ──
// ── 마스코트 (선택 가능 · 라인별 진화) ──
const MASCOTS = {
    tiger: { label: '호랑이', stages: [{ min: 10, emoji: '🦁', name: '백수의 왕' }, { min: 5, emoji: '🐅', name: '호랑이' }, { min: 1, emoji: '🐯', name: '새끼 호랑이' }] },
    cat: { label: '고양이', stages: [{ min: 10, emoji: '🐈‍⬛', name: '밤의 지배자' }, { min: 5, emoji: '🐈', name: '고양이' }, { min: 1, emoji: '🐱', name: '새끼 고양이' }] },
    dog: { label: '강아지', stages: [{ min: 10, emoji: '🐺', name: '우두머리' }, { min: 5, emoji: '🐕', name: '개' }, { min: 1, emoji: '🐶', name: '강아지' }] },
    chick: { label: '병아리', stages: [{ min: 10, emoji: '🦅', name: '창공의 왕' }, { min: 5, emoji: '🐔', name: '닭' }, { min: 1, emoji: '🐤', name: '병아리' }] },
};
function curMascot() { return MASCOTS[EXT.mascot] || MASCOTS.tiger; }
function evoStage(lv) { const st = curMascot().stages; for (const e of st) { if (lv >= e.min) return e; } return st[st.length - 1]; }
const RARITY = { common: { label: '일반', dot: '⚪' }, rare: { label: '희귀', dot: '🟢' }, epic: { label: '영웅', dot: '🔵' }, legend: { label: '전설', dot: '🟣' } };
function rollRarity() { const r = Math.random(); if (r < 0.005) return 'legend'; if (r < 0.05) return 'epic'; if (r < 0.2) return 'rare'; return 'common'; }
const REL_TIERS = [{ min: 80, label: '죽마고우' }, { min: 50, label: '친해진 사이' }, { min: 25, label: '아는 사이일지도?' }, { min: 10, label: '몇 번 본 사이' }, { min: 0, label: '낯선 사이' }];
function relTier(aff) { for (const t of REL_TIERS) { if (aff >= t.min) return t.label; } return '낯선 사이'; }
function affinityDelta(kind) { return ({ help: 2, cooperate: 3, activity: 1, interact: 0, loot: 0, flee: 0, attack: -1 })[kind] || 0; }

// 희귀 후일담 풀 (stub — TODO LLM)
const AFTER_POOL = [
    '며칠 뒤, 그 사람은 당신을 꽤 괜찮은 사람으로 기억하고 있었다.',
    '소문은 며칠 만에 부서 전체에 퍼졌다. 진실은 아무도 몰랐다.',
    '3일 뒤에도 누군가는 아직 그 일을 오해하고 있었다.',
];
function rollAfter() { return Math.random() < 0.18 ? AFTER_POOL[Math.floor(Math.random() * AFTER_POOL.length)] : null; }

// ── 전역 설정 ──
function defaultExt() { return { connectionProfile: '', autoDetect: false, cooldownTurns: 3, mascot: 'tiger', contextDepth: 'balance' }; }
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
        { category: 'npc', emoji: '🪳', title: '야생의 바퀴벌레가 나타났다', foe: '바퀴벌레',
          choices: [{ label: '신문지로 내려친다', kind: 'attack' }, { label: '슬리퍼를 던진다', kind: 'attack' }, { label: '못 본 척한다', kind: 'flee' }] },
        { category: 'npc', emoji: '🧑‍💼', title: '옆자리 동료가 다가왔다', foe: '옆자리 동료',
          choices: [{ label: '같이 점심 먹자고 한다', kind: 'cooperate' }, { label: '먼저 인사한다', kind: 'help' }, { label: '눈을 피한다', kind: 'flee' }] },
        { category: 'npc', emoji: '🐕', title: '동네 개가 따라온다', foe: '동네 개',
          choices: [{ label: '쓰다듬는다', kind: 'activity' }, { label: '간식을 준다', kind: 'help' }, { label: '모른 척 걷는다', kind: 'flee' }] },
        { category: 'npc', emoji: '🥄', title: '길바닥에서 무언가 빛났다', foe: null,
          choices: [{ label: '줍는다', kind: 'loot' }, { label: '발로 차본다', kind: 'interact' }, { label: '그냥 지나친다', kind: 'flee' }] },
    ];
    return pool[Math.floor(Math.random() * pool.length)];
}
function generateSituationStub(_s) {
    const pool = [
        { category: 'situation', emoji: '🌧️', title: '갑자기 비가 쏟아진다', desc: '우산은 당연히 없다.',
          choices: [{ label: '뛴다', kind: 'activity' }, { label: '비를 맞는다', kind: 'interact' }, { label: '어딘가로 피한다', kind: 'flee' }] },
        { category: 'situation', emoji: '📦', title: '택배가 도착했다', desc: '아무도 시킨 적 없는 택배다.',
          choices: [{ label: '열어본다', kind: 'loot' }, { label: '반송한다', kind: 'flee' }, { label: '모른 척한다', kind: 'interact' }] },
        { category: 'situation', emoji: '💡', title: '갑자기 정전이 됐다', desc: '세상이 잠깐 공평하게 어두워졌다.',
          choices: [{ label: '촛불을 켠다', kind: 'activity' }, { label: '그냥 잔다', kind: 'flee' }, { label: '두꺼비집을 본다', kind: 'interact' }] },
    ];
    return pool[Math.floor(Math.random() * pool.length)];
}
// 수치와 진짜 감정이 어긋날 수 있게 (뒷소문의 묘미)
function resolveByKind(item, kind) {
    if (kind === 'flee') return { result: '회피', exp: 1, drop: null, inner: { foe: '상대는 떠나는 뒷모습을 멀뚱히 바라봤다.', user: '당신은 현명한 판단이었다고... 아마 스스로 우겼을 것이다.' } };
    if (kind === 'help') return { result: '도움', exp: 3, drop: null, inner: { foe: '상대는 고맙다고 했다. 하지만 속으로는 동정받은 건 아닌지 신경 썼다.', user: '당신은 별 생각 없었을 것이다.' } };
    if (kind === 'cooperate') return { result: '협력', exp: 4, drop: null, inner: { foe: '주변 사람들은 둘을 꽤 가까운 사이로 봤다.', user: '당신은 그냥 효율을 따졌을 뿐이었다.' } };
    if (kind === 'activity') return { result: '활동', exp: 2, drop: null, inner: { foe: '상대는 그 시간을 나쁘지 않게 보냈다.', user: '당신은 생각보다 즐거웠다고... 인정하긴 싫었을 것이다.' } };
    if (kind === 'loot') return { result: '획득', exp: 2, drop: { name: '녹슨 숟가락', emoji: '🥄', tier: '쓰레기', price: 0 }, inner: { foe: '아무도 그걸 줍지 않은 데는 이유가 있었다.', user: '당신은 왜 주웠는지 스스로도 몰랐을 것이다.' } };
    if (kind === 'interact') return { result: '상호작용', exp: 1, drop: null, inner: { foe: '그것은 별 반응이 없었다.', user: '당신은 괜히 건드렸다고 생각했을지도 모른다.' } };
    // attack = 언쟁 분기 (결투 격하)
    const win = STATE.power + 5 >= 3 + Math.floor(Math.random() * 4);
    return {
        result: win ? '언쟁 승' : '언쟁 패', exp: win ? 6 : 2,
        drop: win ? { name: '눅눅한 쿠폰', emoji: '🎟️', tier: '쓰레기', price: 0 } : null,
        inner: win ? { foe: '상대는 졌지만, 당신이 솔직하다는 건 마음에 들었다.', user: '당신은 이긴 게 맞나 싶었을 것이다.' }
                   : { foe: '상대는 이겼지만 별로 기쁘지 않았다.', user: '당신은 그게 더 분했을 것이다.' },
    };
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
// 선택 프로필: null=메인 의도적 사용, id=정상, '__missing__'=골랐는데 사라짐
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
    return `너는 RP 채팅에 어울리는 "출현 이벤트"를 만든다. 이 장면에 자연스럽게 등장할 법한 대상(NPC/생물/사물) 하나를 만들어라.
${RULES_FIT}
선택지 3개(서로 다른 대응), 각 kind는 help/cooperate/activity/loot/interact/flee/attack 중 하나. 마지막 하나는 보통 flee.
형식: {"category":"npc","emoji":"이모지 하나","title":"~가 나타났다 류 한 문장","foe":"대상 이름(사물이면 null)","choices":[{"label":"...","kind":"..."},{"label":"...","kind":"..."},{"label":"...","kind":"flee"}]}

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
규칙: 데드팬 코미디, 한국어. inner.foe=상대/주변의 진짜 속내(수치와 어긋나도 됨, 그게 재미). inner.user=유저의 속내 추측("~했을지도/~었을 것이다" 식 단정 금지). after=가끔만(대개 null) 며칠 뒤 오해/뒷이야기 한 줄. JSON만.
형식: {"result":"짧은 결과 라벨","exp":정수,"affDelta":관계변화 정수(없으면 0),"drop":{"name":"...","emoji":"...","price":0} 또는 null,"inner":{"foe":"...","user":"..."},"after":"..." 또는 null}

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
        desc: o.desc ? String(o.desc) : '',
        choices,
    };
}
function normalizeOutcome(o, kind) {
    o = o || {};
    return {
        result: String(o.result || '결과'),
        exp: Number.isFinite(o.exp) ? o.exp : 1,
        affDelta: Number.isFinite(o.affDelta) ? o.affDelta : affinityDelta(kind),
        drop: (o.drop && o.drop.name) ? { name: String(o.drop.name), emoji: String(o.drop.emoji || '📦'), tier: o.drop.tier || '', price: o.drop.price || 0 } : null,
        inner: { foe: String((o.inner && o.inner.foe) || '별일 없었던 것 같다.'), user: String((o.inner && o.inner.user) || '당신도 잘 모르겠을 것이다.') },
        after: (o.after && o.after !== 'null') ? String(o.after) : null,
    };
}
// 도트 알람 (당황 말투) — 선택 프로필 실패 시. 메인으로 몰래 폴백 안 함.
function handleLlmError(err) {
    const code = err && err.code;
    if (code === 'nogen') return false; // 생성기 자체가 없음(테스트 등) → 조용히 stub
    if (code === 'missing') showAlarm('엇... 고른 연결 프로필이 사라졌어요;;', '설정에서 프로필을 다시 골라주세요.');
    else if (code === 'empty') showAlarm('어어... 응답이 텅 비어서 왔어요;;', '모델이 잠깐 딴짓하나 봐요. 조금 뒤에 다시 눌러주세요.');
    else showAlarm('엇... 연결이 안 되네요;;', '고른 프로필 연결을 확인해 주세요. (그때까진 못 움직여요)');
    return true;
}

function applyOutcome(item, choiceLabel, outcome, kind) {
    STATE.xp += outcome.exp || 0;
    const rarity = outcome.drop ? rollRarity() : 'common';
    const affDelta = item.foe ? (Number.isFinite(outcome.affDelta) ? outcome.affDelta : affinityDelta(kind)) : 0;
    const entry = {
        id: cryptoId(), no: STATE.encounters.length + 1, time: nowHHMM(), category: item.category || 'npc',
        emoji: item.emoji, title: item.title, desc: `${choiceLabel} — ${outcome.result}`,
        result: outcome.result, exp: outcome.exp, rarity, affDelta, foe: item.foe || null,
        drop: outcome.drop ? outcome.drop.name : null, inner: outcome.inner, after: (outcome.after || rollAfter()), revealed: false,
    };
    STATE.encounters.unshift(entry);
    if (outcome.drop) { STATE.items.unshift(Object.assign({ id: cryptoId(), verdict: '', rarity }, outcome.drop)); STATE.power += 1; }

    if (item.foe) {
        const reg = STATE.npcs[item.foe] || { name: item.foe, emoji: item.emoji, affinity: 0, metCount: 0, firstMet: getChatLen(), tier: '낯선 사이', terjut: false };
        const before = reg.tier;
        reg.metCount += 1; reg.affinity += affDelta;
        reg.tier = relTier(reg.affinity); reg.terjut = reg.metCount >= 5;
        STATE.npcs[item.foe] = reg;
        STATE.currentNpc = item.foe;
        if (reg.tier !== before) flash(`${reg.emoji} ${reg.name} — '${reg.tier}'!`);
        else if (reg.terjut && reg.metCount === 5) flash(`${reg.emoji} ${reg.name} 터줏대감 등극!`);
    }
    if (item.category === 'situation') STATE.currentSituation = { emoji: item.emoji, title: item.title };

    const good = ['언쟁 승', '협력', '도움', '활동', '획득'].includes(outcome.result);
    STATE.mood = clamp03(STATE.mood + (good ? 1 : (outcome.result === '언쟁 패' ? -1 : 0)));
    if (STATE.encounters.length % 3 === 0) STATE.hunger = clamp03(STATE.hunger - 1);
    if (outcome.result === '언쟁 패') STATE.hp = clamp03(STATE.hp - 1);

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

// ── 주입 — TODO(3) ──
function injectProse(prose) {
    if (!canInject()) { flash(`아직 텀 — ${injectRemaining()}턴 후 (일지엔 기록됨)`); return false; }
    blDebug('주입 stub:', prose); markInject(); flash('챗에 반영됨'); return true;
}
function injectLastEncounter() {
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
function npcLine() {
    if (!STATE.currentNpc || !STATE.npcs[STATE.currentNpc]) return '<span class="bl-slot-empty">아무도 없음</span>';
    const n = STATE.npcs[STATE.currentNpc];
    return `${n.emoji} ${escapeHtml(n.name)} · <b>${escapeHtml(n.tier)}</b>`;
}
function sitLine() {
    if (!STATE.currentSituation) return '<span class="bl-slot-empty">평온함</span>';
    return `${STATE.currentSituation.emoji} ${escapeHtml(STATE.currentSituation.title)}`;
}

// ── 미니 콘솔 (살아있는 세계 정보창) ──
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
      <div class="bl-slots">
        <div class="bl-slot"><span class="bl-slot-h">📢 현재 상황</span><span class="bl-slot-v bl-sit-v"></span></div>
        <div class="bl-slot"><span class="bl-slot-h">👤 현재 조우</span><span class="bl-slot-v bl-npc-v"></span></div>
      </div>
      <div class="bl-actions">
        <button class="bl-roll">🐯 출현</button>
        <button class="bl-randevent">🌦️ 상황</button>
      </div>
      <div class="bl-footer">
        <span class="bl-foot">🎒 <b class="bl-itemcnt num"></b></span>
        <span class="bl-foot">⚔️ <b class="bl-power num"></b></span>
        <button class="bl-foot-inject">📤 반영</button>
        <span class="bl-cooldown num"></span>
      </div>`;
    document.body.appendChild(consoleEl);
    consoleEl.querySelector('.bl-sw').addEventListener('click', () => setInjectDefault(!STATE.settings.injectDefault));
    consoleEl.querySelector('.bl-roll').addEventListener('click', onAppear);
    consoleEl.querySelector('.bl-randevent').addEventListener('click', onSituation);
    consoleEl.querySelector('.bl-foot-inject').addEventListener('click', injectLastEncounter);
    consoleEl.querySelector('.bl-up').addEventListener('click', showFull);
}
function renderConsole() {
    if (!consoleEl) return;
    consoleEl.querySelector('.bl-paw').textContent = evoStage(STATE.level).emoji;
    consoleEl.querySelector('.bl-lv').textContent = 'Lv.' + String(STATE.level).padStart(2, '0');
    const need = STATE.level * 100;
    consoleEl.querySelector('.bl-xmini i').style.width = Math.min(100, (STATE.xp / need) * 100) + '%';
    consoleEl.querySelector('.bl-sw').dataset.on = STATE.settings.injectDefault ? 'true' : 'false';
    consoleEl.querySelector('.bl-sit-v').innerHTML = sitLine();
    consoleEl.querySelector('.bl-npc-v').innerHTML = npcLine();
    consoleEl.querySelector('.bl-itemcnt').textContent = STATE.items.length;
    consoleEl.querySelector('.bl-power').textContent = STATE.power;
    const rem = injectRemaining();
    consoleEl.querySelector('.bl-cooldown').textContent = rem > 0 ? `💉 ${rem}턴` : '💉 준비';
    consoleEl.querySelector('.bl-foot-inject').classList.toggle('locked', rem > 0);
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
            <div class="bl-pet-pick"></div>
          </div>
          <div class="bl-slots bl-slots-full">
            <div class="bl-slot"><span class="bl-slot-h">📢 현재 상황</span><span class="bl-slot-v bl-sit-v"></span></div>
            <div class="bl-slot"><span class="bl-slot-h">👤 현재 조우</span><span class="bl-slot-v bl-npc-v"></span></div>
          </div>
          <div class="bl-full-rolls"><button class="bl-roll2">🐯 출현</button><button class="bl-rand2">🌦️ 상황</button></div>
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
    fullEl.querySelector('.bl-pet-pick').addEventListener('click', e => {
        const b = e.target.closest('.bl-pick-btn'); if (!b) return;
        EXT.mascot = b.dataset.m; saveExt(); renderAll();
    });
    fullEl.addEventListener('click', e => { if (e.target === fullEl) showMini(); });
}
function afterBlock(e) {
    return `<div class="bl-after">
        <div class="bl-af-line">💭 ${escapeHtml(e.inner.foe)}</div>
        <div class="bl-af-line bl-af-you">👤 ${escapeHtml(e.inner.user)}</div>
        ${e.after ? `<div class="bl-af-rare">🗞️ 희귀 후일담 — ${escapeHtml(e.after)}</div>` : ''}
      </div>`;
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
    fullEl.querySelector('.bl-pet-pick').innerHTML = Object.keys(MASCOTS).map(k => {
        const baby = MASCOTS[k].stages[MASCOTS[k].stages.length - 1].emoji;
        return `<button class="bl-pick-btn${EXT.mascot === k ? ' on' : ''}" data-m="${k}" title="${MASCOTS[k].label}">${baby}</button>`;
    }).join('');
    fullEl.querySelector('.bl-sit-v').innerHTML = sitLine();
    fullEl.querySelector('.bl-npc-v').innerHTML = npcLine();
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
                <div class="bl-tk-foot">${e.affDelta ? `<span class="bl-chip">❤️ ${e.affDelta > 0 ? '+' : ''}${e.affDelta}</span>` : ''}<span class="bl-chip">EXP +${e.exp}</span>${e.drop ? `<span class="bl-chip">드롭 · ${escapeHtml(e.drop)}</span>` : ''}</div>
                ${e.inner ? (e.revealed ? afterBlock(e) : `<button class="bl-reveal" data-id="${e.id}">🗞️ 뒷소문 보기</button>`) : ''}
              </div>
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
          <div class="bls-ver">🐯 Beast Log v${BEASTLOG_VERSION} · 확장 메뉴(🪄) 또는 미니창 ⌃ 로 열기</div>
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
    item.addEventListener('click', () => { showFull(); const m = document.getElementById('extensionsMenu'); if (m) m.style.display = 'none'; });
}

// ── 루프 ──
async function onAppear() {
    showLoading('두리번거리는 중...');
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
    showLoading('바람 냄새 맡는 중...');
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
    pop.querySelectorAll('button').forEach(btn => btn.addEventListener('click', async () => {
        const i = parseInt(btn.dataset.i, 10);
        if (i < 0) { closePopup(); return; }
        const c = choices[i];
        showLoading('무슨 일이 벌어지는 중...');
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
// 결과창: 수치 즉시 + 뒷소문은 [보기]로 가림
function showResultPopup(entry) {
    closePopup();
    const chips = `${entry.affDelta ? `<span class="bl-chip">❤️ ${entry.affDelta > 0 ? '+' : ''}${entry.affDelta}</span>` : ''}<span class="bl-chip">EXP +${entry.exp}</span>${entry.drop ? `<span class="bl-chip">드롭 · ${escapeHtml(entry.drop)}</span>` : ''}${entry.rarity && entry.rarity !== 'common' ? `<span class="bl-chip">${RARITY[entry.rarity].dot} ${RARITY[entry.rarity].label}</span>` : ''}`;
    const pop = document.createElement('div'); pop.id = 'beastlog-popup';
    pop.innerHTML = `
      <div class="bl-pop-card bl-cat-${entry.category}">
        <div class="bl-pop-badge">🎭 결과</div>
        <div class="bl-pop-title">${escapeHtml(entry.result)}</div>
        <div class="bl-pop-chips">${chips}</div>
        <div class="bl-result-rumor"><button class="bl-reveal2">🗞️ 뒷소문 보기</button></div>
        <button class="bl-pop-ignore bl-result-ok">일지에 저장됨 · 확인</button>
      </div>`;
    document.body.appendChild(pop);
    pop.querySelector('.bl-reveal2').addEventListener('click', () => {
        const slot = pop.querySelector('.bl-result-rumor');
        slot.innerHTML = afterBlock(entry);
        const en = STATE.encounters.find(x => x.id === entry.id); if (en) { en.revealed = true; saveState(STATE); }
    });
    pop.querySelector('.bl-result-ok').addEventListener('click', closePopup);
}
function closePopup() { const p = document.getElementById('beastlog-popup'); if (p) p.remove(); }
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
