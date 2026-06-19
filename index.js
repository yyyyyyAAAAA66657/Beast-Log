// 🐯 비스트로그 (Beast Log) v0.34.0-beta — 레벨 양방향(XP 깎이면 다운) + 스탯 0~5 확장 + 🍖밥주기(채움) + 출현·알바 텀 랜덤2~4(텀입력 제거) + 테마명 변경(민트→말차/딸기우유→벚꽃)
// 버전 3곳 동시 갱신: (1) 이 주석, (2) BEASTLOG_VERSION, (3) manifest.json

const BEASTLOG_VERSION = '0.34.0';
const MODULE = 'beast_log';
let LAST_ERROR = '';
try { console.log('[비스트로그] script loaded v' + BEASTLOG_VERSION); } catch (e) { /* noop */ }

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

// ── 마스코트 ──
const MASCOTS = {
    tiger: { label: '호랑이', stages: [{ min: 10, emoji: '🦁', name: '백수의 왕' }, { min: 5, emoji: '🐅', name: '호랑이' }, { min: 1, emoji: '🐯', name: '새끼 호랑이' }] },
    cat: { label: '고양이', stages: [{ min: 10, emoji: '🐈‍⬛', name: '밤의 지배자' }, { min: 5, emoji: '🐈', name: '고양이' }, { min: 1, emoji: '🐱', name: '새끼 고양이' }] },
    dog: { label: '강아지', stages: [{ min: 10, emoji: '🐺', name: '우두머리' }, { min: 5, emoji: '🐕', name: '개' }, { min: 1, emoji: '🐶', name: '강아지' }] },
    chick: { label: '병아리', stages: [{ min: 10, emoji: '🦅', name: '창공의 왕' }, { min: 5, emoji: '🐔', name: '닭' }, { min: 1, emoji: '🐤', name: '병아리' }] },
    hamster: { label: '햄스터', stages: [{ min: 10, emoji: '🐹', name: '대장 햄스터' }, { min: 5, emoji: '🐹', name: '통통 햄스터' }, { min: 1, emoji: '🐹', name: '햄스터' }] },
    rabbit: { label: '토끼', stages: [{ min: 10, emoji: '🐇', name: '달의 토끼' }, { min: 5, emoji: '🐰', name: '토끼' }, { min: 1, emoji: '🐰', name: '아기 토끼' }] },
    monkey: { label: '원숭이', stages: [{ min: 10, emoji: '🦍', name: '정글의 왕' }, { min: 5, emoji: '🐒', name: '원숭이' }, { min: 1, emoji: '🐵', name: '아기 원숭이' }] },
};
const MASCOT_KEYS = Object.keys(MASCOTS);

// ==== 마스코트 도트 스프라이트 (16x15, 런타임 SVG) ====
const BL_INK = '#2e2316';
const BL_SPRITES = {
  tiger: { w:16, h:15, pal:{O:'#f2a83c',B:'#6e3f18',C:'#fbf0d5'}, rows:['................','..KK........KK..','.KOCK......KCOK.','.KOOOKKKKKKOOOK.','.KOOOOOBBOOOOOK.','.KOOOOBBBBOOOOK.','.KOOOOOBBOOOOOK.','.KOOOOOOOOOOOOK.','.KOOKKOOOOKKOOK.','.KBOKKOOOOKKOBK.','.KBOOOOOOOOOOBK.','.KOOOOCKKCOOOOK.','.KOOOOCCCCOOOOK.','..KKKKCCCCKKKK..','................'] },
  cat: { w:16, h:15, pal:{O:'#b0a89c',C:'#f7f2e7',P:'#e99496'}, rows:['................','..KK........KK..','.KOPK......KPOK.','.KOOOKKKKKKOOOK.','.KOOOOOOOOOOOOK.','.KOOOOOOOOOOOOK.','.KOOOOOOOOOOOOK.','.KOOOOOOOOOOOOK.','.KOOKKOOOOKKOOK.','.KOOKKOOOOKKOOK.','.KOOOOOOOOOOOOK.','.KKOOOCPPCOOOKK.','.KOOOOCCCCOOOOK.','..KKKKCCCCKKKK..','................'] },
  dog: { w:16, h:15, pal:{O:'#d6b280',C:'#f8eed6',D:'#966836'}, rows:['................','..KK........KK..','.KODK......KDOK.','.KOOOKKKKKKOOOK.','.KOOOOOOOOOOOOK.','.KOOOOOOOOOOOOK.','.KOOOOOOOOOOOOK.','.KODDOOOOOOOOOK.','.KODKKOOOOKKOOK.','.KOOKKOOOOKKOOK.','.KOOOOOOOOOOOOK.','.KOOOOCKKCOOOOK.','.KOOOOCCCCOOOOK.','..KKKKCCCCKKKK..','................'] },
  hamster: { w:16, h:15, pal:{O:'#e9c468',C:'#fbf3dd'}, rows:['................','..KK........KK..','.KOCK......KCOK.','.KOOOKKKKKKOOOK.','.KOOOOOOOOOOOOK.','.KOOOOOOOOOOOOK.','.KOOOOOOOOOOOOK.','.KOOOOOOOOOOOOK.','.KOOKKOOOOKKOOK.','.KOOKKOOOOKKOOK.','.KCCOOOOOOOOCCK.','.KCOOOCKKCOOOCK.','.KOOOOCCCCOOOOK.','..KKKKCCCCKKKK..','................'] },
  chick: { w:16, h:15, pal:{O:'#f6d442',Y:'#ee882a',P:'#f09e9e'}, rows:['................','................','...KKKKKKKKKK...','..KOOOOOOOOOOK..','.KOOOOOOOOOOOOK.','.KOOOOOOOOOOOOK.','.KOOOOOOOOOOOOK.','.KOOOOOOOOOOOOK.','.KOOKKOOOOKKOOK.','.KPPKKOOOOKKPPK.','.KOOOOOOOOOOOOK.','.KOOOOYYYYOOOOK.','.KOOOOOYYOOOOOK.','..KKKKKKKKKKKK..','................'] },
  rabbit: { w:16, h:15, pal:{O:'#fbfbf7',P:'#f3a6a6'}, rows:['.KKKK......KKKK.','.KOPK......KPOK.','.KOPK......KPOK.','.KOPK......KPOK.','.KOOK......KOOK.','.KOOKKKKKKKKOOK.','.KOOOOOOOOOOOOK.','.KOOOOOOOOOOOOK.','.KOOKKOOOOKKOOK.','.KOOKKOOOOKKOOK.','.KOOOOOOOOOOOOK.','.KPOOOOKKOOOOPK.','.KOOOOOOOOOOOOK.','..KKKKKKKKKKKK..','................'] },
  monkey: { w:16, h:15, eyeBg:'C', pal:{O:'#aa7a4a',C:'#f7ebce'}, rows:['................','...KKKKKKKKKK...','..KOOOOOOOOOOK..','.KOOOOOOOOOOOOK.','.KOOOOOOOOOOOOK.','KKOOCCCCCCCCOOKK','KOKOCCCCCCCCOKOK','KKOCCCCCCCCCCOKK','.KOCKKCCCCKKCOK.','.KOCKKCCCCKKCOK.','.KOCCCCCCCCCCOK.','.KOCCCKKKKCCCOK.','.KOOCCCCCCCCOOK.','..KKOOOOOOOOKK..','...KKKKKKKKKK...'] },
};
const MONO_INK = new Set(['K', 'B', 'D', 'Y', 'P', 'N']);
// 표정: 눈 자리(2x2 기본)를 지우고 표정별 픽셀로 다시 그림
const EYE_BASE = [[4, 8], [5, 8], [4, 9], [5, 9], [10, 8], [11, 8], [10, 9], [11, 9]];
const EYE_EXPR = {
    open:  [[4, 8], [5, 8], [4, 9], [5, 9], [10, 8], [11, 8], [10, 9], [11, 9]],
    happy: [[5, 8], [4, 9], [6, 9], [10, 8], [9, 9], [11, 9]],            // ^ ^
    sad:   [[4, 8], [6, 8], [5, 9], [9, 8], [11, 8], [10, 9]],            // ︵ ︵
    tired: [[4, 9], [5, 9], [10, 9], [11, 9]],                            // - -
    blink: [[4, 9], [5, 9], [6, 9], [9, 9], [10, 9], [11, 9]],            // _ _
    wink:  [[4, 8], [5, 8], [4, 9], [5, 9], [9, 9], [10, 9], [11, 9]],    // ▣ _
};
function spriteSVG(key, size, mono, expr) {
    const s = BL_SPRITES[key] || BL_SPRITES.tiger;
    const grid = [];
    for (let y = 0; y < s.h; y++) {
        const row = s.rows[y]; const line = [];
        for (let x = 0; x < s.w; x++) {
            const c = row[x];
            let fill = null;
            if (c !== '.') {
                if (mono) fill = MONO_INK.has(c) ? BL_INK : null;
                else fill = (c === 'K') ? BL_INK : (s.pal[c] || BL_INK);
            }
            line.push(fill);
        }
        grid.push(line);
    }
    if (expr && expr !== 'open' && EYE_EXPR[expr]) {
        const body = mono ? null : (s.pal[s.eyeBg || 'O'] || s.pal.O || BL_INK);
        for (const [x, y] of EYE_BASE) grid[y][x] = body;          // 눈 지움(몸색)
        for (const [x, y] of EYE_EXPR[expr]) grid[y][x] = BL_INK;  // 표정 그림
    }
    let rects = '';
    for (let y = 0; y < s.h; y++) {
        let x = 0;
        while (x < s.w) {
            const f = grid[y][x];
            if (f === null) { x++; continue; }
            let run = 1;
            while (x + run < s.w && grid[y][x + run] === f) run++;
            rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${f}"/>`;
            x += run;
        }
    }
    const h = Math.round(size * s.h / s.w);
    return `<svg class="bl-sprite" width="${size}" height="${h}" viewBox="0 0 ${s.w} ${s.h}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}
function stateExpr() {
    if (STATE.hp <= 1) return 'tired';
    if (STATE.mood <= 1) return 'sad';
    if (STATE.mood >= 4 && STATE.hunger >= 3) return 'happy';
    return 'open';
}
function mascotSVG(size, expr) { return spriteSVG(EXT.mascot, size, EXT.spriteMono === true, expr || stateExpr()); }
function setMascotEls(expr) {
    const mono = EXT.spriteMono === true;
    if (consoleEl) { const e = consoleEl.querySelector('.bl-pet-emoji-mini'); if (e) e.innerHTML = spriteSVG(EXT.mascot, 30, mono, expr); }
    if (fullEl && fullEl.style.display !== 'none') { const e = fullEl.querySelector('.bl-pet-emoji'); if (e) e.innerHTML = spriteSVG(EXT.mascot, 72, mono, expr); }
    if (bubbleEl && bubbleEl.style.display !== 'none') bubbleEl.innerHTML = spriteSVG(EXT.mascot, 34, mono, expr);
}
let blinkTimer = null;
function startBlink() {
    if (blinkTimer) return;
    blinkTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        if (Math.random() > 0.5) return;
        setMascotEls('blink');
        setTimeout(() => setMascotEls(stateExpr()), 160);
    }, 3600);
}
function curMascot() { return MASCOTS[EXT.mascot] || MASCOTS.tiger; }
function evoStage(lv) { const st = curMascot().stages; for (const e of st) { if (lv >= e.min) return e; } return st[st.length - 1]; }

// ── 희귀도 / 아이템 타입 ──
const RARITY = { common: { label: '일반', dot: '⚪' }, rare: { label: '희귀', dot: '🟢' }, epic: { label: '영웅', dot: '🔵' }, legend: { label: '전설', dot: '🟣' } };
function rollRarity() { const r = Math.random(); if (r < 0.005) return 'legend'; if (r < 0.05) return 'epic'; if (r < 0.2) return 'rare'; return 'common'; }
const BAIT_CHANCE = { common: 0.10, rare: 0.40, epic: 0.70, legend: 1.0 };
function rollItemType(rarity) { return Math.random() < (BAIT_CHANCE[rarity] != null ? BAIT_CHANCE[rarity] : 0.10) ? 'bait' : 'junk'; }

// ── 관계 (양방향 "익숙함" 트랙, 내부 수치는 숨김) ──
const REL_TIERS = [
    { min: 24, label: '단골', tone: 'warm' },
    { min: 14, label: '친근함', tone: 'warm' },
    { min: 7, label: '익숙함', tone: 'warm' },
    { min: 3, label: '몇 번 본 사이', tone: 'mid' },
    { min: 0, label: '낯섦', tone: 'mid' },
    { min: -3, label: '경계', tone: 'cold' },
    { min: -8, label: '불신', tone: 'cold' },
    { min: -9999, label: '피함', tone: 'cold' },
];
function relTierObj(aff) { for (const t of REL_TIERS) { if (aff >= t.min) return t; } return REL_TIERS[REL_TIERS.length - 1]; }
function relTier(aff) { return relTierObj(aff).label; }
function affinityDelta(kind) { return ({ help: 2, cooperate: 3, activity: 1, interact: 0, loot: 0, flee: 0, attack: -2 })[kind] || 0; }

// ── 알바 / 돈 / 상점 ──
const MASCOT_PRICE = { tiger: 0, cat: 0, dog: 0, monkey: 200000, chick: 220000, hamster: 300000, rabbit: 320000 };
const JOB_LOAD = ['알바 뛰는 중…', '시급 계산 중…', '사장님 눈치 보는 중…', '진상 응대 중…', '허드렛일 처리 중…'];
function ownsMascot(k) { return (STATE.owned || []).includes(k); }
function fmtMoney(n) { return (n || 0).toLocaleString('ko-KR') + '원'; }
function jobRemaining() { const cd = (STATE.jobCD == null ? 3 : STATE.jobCD); return Math.max(0, cd - (getChatLen() - (STATE.lastJobTurn == null ? -99 : STATE.lastJobTurn))); }
function canWork() { return jobRemaining() <= 0; }
function buildJobPrompt() {
    return `너는 RP 주인공({{char}})이 잠깐 뛴 "알바"와 그 결과를 만든다.
${getScene()}규칙:
- {{char}}의 세계/처지에 맞는 알바를 골라라. 판타지면 용병·약초 채집·여관 설거지, 현대면 편의점·전단지, SF면 화물 하역 등. 장면에서 끌어내라. 세계관에 안 맞는 알바 금지(판타지에 편의점 X).
- 데드팬 코미디. 짧은 알바 후기 한 편.
- 보수는 짜다(현실 알바처럼 적게). 단위는 정수 '원' 환산값으로 pay에 넣어라(대략 20000~90000, 사건 나면 더 적거나 0).
- 가끔(30%) 사건/사고(incident)로 보수가 깎이거나 황당한 일.
형식(JSON만, 코드펜스 금지): {"job":"알바 이름/장소","report":"2~3문장 데드팬 후기","pay":정수,"incident":"한 줄 사건 또는 null","mood":"{{char}}의 한 줄 소감"}
[대화 맥락]
${getConvo()}`;
}
function normalizeJob(o) {
    o = o || {};
    let pay = parseInt(o.pay, 10); if (!Number.isFinite(pay)) pay = 30000;
    pay = Math.max(0, Math.min(200000, pay));
    return {
        job: String(o.job || '이름 모를 알바').slice(0, 40),
        report: String(o.report || '시간만 흘렀다.').slice(0, 400),
        pay,
        incident: (o.incident && o.incident !== 'null') ? String(o.incident).slice(0, 160) : null,
        mood: (o.mood && o.mood !== 'null') ? String(o.mood).slice(0, 120) : '',
    };
}
let _blBusy = false;
async function onWork() {
    if (_blBusy) return;
    if (!canWork()) { flash(`아직 지쳤다 — ${jobRemaining()}턴 쉬어야`); return; }
    _blBusy = true;
    showLoading(pick(JOB_LOAD));
    try {
        const txt = await llmGenerate(buildJobPrompt(), 4096);
        closePopup(); applyJob(normalizeJob(parseLLMJson(txt)));
    } catch (err) { closePopup(); if (!handleLlmError(err)) applyJob({ job: '벽돌 나르기', report: '허리만 나갔다. 사장은 어디론가 사라졌다.', pay: 15000, incident: '사장 잠적', mood: '...' }); }
    finally { _blBusy = false; }
}
function applyJob(job) {
    STATE.money = (STATE.money || 0) + job.pay;
    job.id = cryptoId(); job.time = nowHHMM();
    STATE.lastJob = job;
    STATE.jobs = STATE.jobs || [];
    STATE.jobs.unshift(job);
    if (STATE.jobs.length > 30) STATE.jobs.length = 30;
    STATE.lastJobTurn = getChatLen();
    STATE.jobCD = 2 + Math.floor(Math.random() * 3);   // 다음 알바까지 2~4회 랜덤
    STATE.hunger = clamp05((STATE.hunger == null ? 4 : STATE.hunger) - 1);   // 알바 → 배고파짐
    if (Math.random() < 0.35) STATE.hp = clamp05((STATE.hp == null ? 5 : STATE.hp) - 1);   // 가끔 고된 노동 → 체력↓
    saveState(STATE); renderAll();
    showJobResult(job);
}
function deleteJob(id) { STATE.jobs = (STATE.jobs || []).filter(j => j.id !== id); saveState(STATE); renderFull(); }
function clearJobs() { showConfirm('알바 내역 비우기', '알바 기록을 전부 지울까요? (돈은 그대로)', () => { STATE.jobs = []; STATE.lastJob = null; saveState(STATE); renderAll(); }); }
const FEED_FOOD = ['편의점 삼각김밥', '길에서 주운 붕어빵', '유통기한 임박 소시지', '수상한 통조림', '사장이 남긴 식은 치킨', '정체불명의 사료', '눅눅한 새우깡', '반쯤 녹은 아이스크림', '누가 흘린 호두과자'];
function onFeed() {
    if (STATE.hunger >= 5 && STATE.hp >= 5 && STATE.mood >= 5) { flash('이미 배부르고 쌩쌩하다'); return; }
    STATE.hunger = clamp05((STATE.hunger || 0) + 2);
    STATE.hp = clamp05((STATE.hp || 0) + 1);
    STATE.mood = clamp05((STATE.mood || 0) + 1);
    saveState(STATE); renderAll();
    flash(`🍖 '${pick(FEED_FOOD)}'을(를) 먹였다`);
}
function resetMoney() { showConfirm('돈 리셋', `보유 금액 ${fmtMoney(STATE.money)}을(를) 0원으로 되돌릴까요?`, () => { STATE.money = 0; saveState(STATE); renderAll(); flash('💰 0원으로 리셋'); }); }
const DONATE_TO = ['길고양이 급식소', '동네 비둘기 연합', '사장님 외제차 기름값', '익명의 너구리', '폐지 줍는 어르신', '유기견 보호소', '바다거북 구조대', '수상한 종교 단체', '나무 심기 운동', '정체불명의 모금함', '옆자리 다람쥐', '세계 평화 기금'];
function onDonate() {
    if ((STATE.money || 0) <= 0) { flash('후원할 돈이 없다… 빈손이다'); return; }
    const amt = STATE.money, to = pick(DONATE_TO);
    showConfirm('전 재산 후원', `보유한 ${fmtMoney(amt)}을(를) 전부 후원할까요?\n(돌려받지 못합니다)`, () => {
        STATE.money = 0; saveState(STATE); renderAll();
        flash(`💝 '${to}'에 ${fmtMoney(amt)} 후원됐습니다`);
    });
}
function buyMascot(k) {
    if (!MASCOTS[k]) return;
    if (ownsMascot(k)) { EXT.mascot = k; saveExt(); renderAll(); flash('이미 보유 — 선택됨'); return; }
    const price = MASCOT_PRICE[k] || 0;
    if ((STATE.money || 0) < price) { flash(`💸 ${fmtMoney(price - (STATE.money || 0))} 모자람`); return; }
    showConfirm('데려오기', `${MASCOTS[k].label}을(를) ${fmtMoney(price)}에 데려올까요?`, () => {
        STATE.money -= price;
        STATE.owned = Array.from(new Set([...(STATE.owned || []), k]));
        EXT.mascot = k; saveExt(); saveState(STATE); renderAll();
        flash(`🏪 ${MASCOTS[k].label} 데려옴!`);
    });
}
function shopListHtml() {
    return MASCOT_KEYS.map(k => {
        const owned = ownsMascot(k), price = MASCOT_PRICE[k] || 0, cur = EXT.mascot === k;
        let right;
        if (cur) right = '<span class="bl-shop-cur">사용중</span>';
        else if (owned) right = `<button class="bl-shop-buy" data-m="${k}">선택</button>`;
        else right = `<button class="bl-shop-buy${(STATE.money || 0) >= price ? '' : ' off'}" data-m="${k}">💰 ${fmtMoney(price)}</button>`;
        return `<div class="bl-shop-row${cur ? ' on' : ''}">${spriteSVG(k, 34, EXT.spriteMono === true)}<span class="bl-shop-nm">${MASCOTS[k].label}</span>${right}</div>`;
    }).join('');
}
function showJobResult(job) {
    closePopup();
    const pop = document.createElement('div'); pop.id = 'beastlog-popup';
    pop.innerHTML = `
      <div class="bl-pop-card bl-cat-npc">
        <div class="bl-pop-badge">🛠️ 알바 후기</div>
        <div class="bl-pop-title">${escapeHtml(job.job)}</div>
        <div class="bl-job-report">${escapeHtml(job.report)}</div>
        ${job.incident ? `<div class="bl-af-rare">⚠️ ${escapeHtml(job.incident)}</div>` : ''}
        <div class="bl-job-pay">💰 +${fmtMoney(job.pay)}</div>
        ${job.mood ? `<div class="bl-job-mood">💭 ${escapeHtml(job.mood)}</div>` : ''}
        <button class="bl-pop-ignore bl-result-ok">확인 · 보유 💰 ${fmtMoney(STATE.money)}</button>
      </div>`;
    mountPopup(pop);
    pop.querySelector('.bl-result-ok').addEventListener('click', closePopup);
}

// ── 로딩/후일담 풀 ──
const LOAD_APPEAR = ['두리번거리는 중...', '킁킁 냄새 맡는 중...', '골목을 기웃거리는 중...', '수상한 기척을 쫓는 중...', '풀숲을 헤집는 중...', '누군가 다가오는 중...', '뭔가 어슬렁대는 중...', '주변을 살피는 중...', '발소리를 듣는 중...', '고개를 갸웃하는 중...', '냄새의 출처를 찾는 중...'];
const LOAD_SIT = ['바람 냄새 맡는 중...', '하늘을 올려다보는 중...', '공기가 바뀌는 걸 느끼는 중...', '낌새를 살피는 중...', '뭔가 다가오는 중...', '분위기를 재는 중...', '먹구름을 보는 중...', '이상한 예감이 드는 중...', '곤란한 일이 다가오는 중...'];
const LOAD_RESOLVE = ['무슨 일이 벌어지는 중...', '눈치 보는 중...', '잠깐 숨 참는 중...', '상황이 흘러가는 중...', '결과를 지켜보는 중...', '두근대는 중...', '침을 꼴깍 삼키는 중...', '귀를 쫑긋 세우는 중...'];
const NO_NEWS = ['…별다른 뒷소문은 없었다.', '아무 일도 일어나지 않았다. 정말로.', '소문이 돌기엔 너무 사소했다.', '아무도 신경 쓰지 않았다.', '세상은 평소처럼 무심했다.'];
const AFTER_POOL = ['며칠 뒤, 그 사람은 당신을 꽤 괜찮은 사람으로 기억하고 있었다.', '소문은 며칠 만에 퍼졌다. 진실은 아무도 몰랐다.', '3일 뒤에도 누군가는 아직 그 일을 오해하고 있었다.', '그 장면은 한동안 누군가의 술자리 안주가 되었다.'];
function rollAfter() { return Math.random() < 0.18 ? pick(AFTER_POOL) : null; }

// ── 전역 설정 ──
function defaultExt() { return { connectionProfile: '', autoDetect: false, cooldownTurns: 3, mascot: 'tiger', contextDepth: 'balance', consolePos: null, chainOn: true, spriteMono: false, theme: 'pudding' }; }
let EXT = defaultExt();
function loadExt() {
    const ctx = getCtx();
    if (!ctx || !ctx.extensionSettings) return defaultExt();
    ctx.extensionSettings[MODULE] = Object.assign(defaultExt(), ctx.extensionSettings[MODULE] || {});
    return ctx.extensionSettings[MODULE];
}
function saveExt() { const ctx = getCtx(); if (ctx && ctx.saveSettingsDebounced) ctx.saveSettingsDebounced(); }

// ── 채팅별 상태 ──
const STATE_KEY = 'beast_log_state';
function defaultState() {
    return {
        uuid: cryptoId(), level: 1, xp: 0, title: '갓 들어온 손님', rep: 0,
        mood: 4, hunger: 4, hp: 5,
        items: [], encounters: [], npcs: {},
        currentNpc: null, currentSituation: null,
        money: 0, owned: ['tiger', 'cat', 'dog'], lastJobTurn: -99, lastJob: null, jobs: [], jobs: [],
        pins: [],
        lastInjectTurn: -99, settings: { injectDefault: false },
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

// ── 백업 / 복원 / 초기화 ──
function exportData() {
    try {
        const blob = { _beastlog: BEASTLOG_VERSION, exportedAt: new Date().toISOString(), state: STATE };
        const json = JSON.stringify(blob, null, 2);
        const a = document.createElement('a');
        a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
        a.download = `beastlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.documentElement.appendChild(a); a.click(); a.remove();
        flash('💾 백업 파일 저장됨');
    } catch (e) { flash('백업 실패'); blDebug('export', e); }
}
function importData() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.addEventListener('change', () => {
        const f = inp.files && inp.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => {
            try {
                const blob = JSON.parse(String(r.result));
                const s = blob && blob.state ? blob.state : blob;
                if (!s || typeof s !== 'object') throw new Error('형식 오류');
                showConfirm('백업 불러오기', '지금 데이터를 백업으로 덮어쓸까요? 되돌릴 수 없어요.', () => {
                    STATE = Object.assign(defaultState(), s);
                    STATE.settings = Object.assign(defaultState().settings, s.settings || {});
                    STATE.npcs = s.npcs || {};
                    saveState(STATE); renderAll(); refreshMemory();
                    flash('📂 백업 복원됨');
                });
            } catch (e) { flash('불러오기 실패 — 파일 확인'); blDebug('import', e); }
        };
        r.readAsText(f);
    });
    document.documentElement.appendChild(inp); inp.click(); inp.remove();
}
function resetAll() {
    showConfirm('완전 초기화', '레벨·돈·도감·일지·가방·관계 전부 처음으로 돌립니다. 되돌릴 수 없어요. 백업부터 받는 걸 권장!', () => {
        STATE = defaultState();
        EXT.mascot = 'tiger'; saveExt();
        saveState(STATE); renderAll(); refreshMemory();
        flash('🔄 처음으로 초기화됨');
    });
}

// ── 텀 ──
function getChatLen() { const c = getCtx(); return (c && Array.isArray(c.chat)) ? c.chat.length : 0; }
function injectRemaining() { const cd = (STATE.injectCD == null ? 3 : STATE.injectCD); return Math.max(0, cd - (getChatLen() - STATE.lastInjectTurn)); }
function canInject() { return injectRemaining() <= 0; }
function markInject() { STATE.lastInjectTurn = getChatLen(); STATE.injectCD = 2 + Math.floor(Math.random() * 3); saveState(STATE); renderAll(); }
function getProfiles() {
    const ctx = getCtx();
    const cm = (ctx && ctx.extensionSettings && ctx.extensionSettings.connectionManager) || null;
    return (cm && Array.isArray(cm.profiles)) ? cm.profiles : [];
}

// ── [STUB] 폴백 ──
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
function depthN() { return ({ balance: 6, '5': 5, '10': 10, '15': 15, all: 9999 })[EXT.contextDepth] || 6; }
function getConvo() {
    const ctx = getCtx();
    if (!ctx || !Array.isArray(ctx.chat)) return '(대화 없음)';
    const msgs = ctx.chat.filter(m => m && m.mes);
    const n = depthN();
    const slice = n >= 9999 ? msgs : msgs.slice(-n);
    const out = slice.map(m => `${m.is_user ? '유저' : (m.name || '상대')}: ${stripTags(m.mes)}`).join('\n');
    return (out || '(대화 없음)').slice(-6000);
}
function recentFoesHint() {
    const seen = [];
    for (const e of (STATE.encounters || [])) {
        if (e.foe && !seen.includes(e.foe)) seen.push(e.foe);
        if (seen.length >= 6) break;
    }
    if (!seen.length) return '';
    return `\n[최근 등장한 대상] ${seen.join(', ')}\n이것들과 같은 동물/종류를 반복하지 마라. 매번 다른 종류·다른 분위기의 새로운 대상으로 다양하게 내라(직전과 같은 동물 금지).`;
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
function getScene() {
    const ctx = getCtx(); if (!ctx) return '';
    const sub = s => stripTags(String(s || '')).replace(/\{\{user\}\}/gi, ctx.name1 || '유저').replace(/\{\{char\}\}/gi, ctx.name2 || '상대');
    const bits = [];
    try {
        if (ctx.name2) bits.push(`상대 캐릭터: ${ctx.name2}`);
        const char = ctx.characters && ctx.characters[ctx.characterId];
        if (char) {
            const d = char.data || {};
            const scen = sub(char.scenario || d.scenario).trim();
            const desc = sub(char.description || d.description).trim();
            const pers = sub(char.personality || d.personality).trim();
            const src = scen || desc;
            if (src) bits.push(`설정: ${src.slice(0, 300)}`);
            if (pers) bits.push(`${ctx.name2 || '상대'} 성격: ${pers.slice(0, 160)}`);
        }
        if (ctx.name1) bits.push(`유저(나): ${ctx.name1}`);
        // 유저 페르소나 설명(있으면 말투/성격 단서로)
        const persona = sub((ctx.power_user && ctx.power_user.persona_description) || ctx.personaDescription || '').trim();
        if (persona) bits.push(`유저 페르소나: ${persona.slice(0, 160)}`);
    } catch (e) {}
    bits.push('말투/문체: 위 캐릭터와 유저의 성격, 그리고 최근 대화의 어조·말투·분위기를 그대로 반영해라(진지하면 진지하게, 가벼우면 가볍게). 비스트로그 특유의 데드팬은 유지하되 장면의 톤을 거스르지 마라.');
    return `[장면/세계 정보]\n${bits.join('\n')}\n`;
}
const RULES_FIT = '반드시 현재 장면(장소/시대/세계관/등장인물/분위기/소품)에 어울려야 한다. 장면의 구체적 단서(나온 장소·물건·인물·사건)를 적극 활용해 거기서 끌어내라. 맥락이 빈약하더라도 아무 동물이나(특히 다람쥐·비둘기) 기계적으로 반복하지 마라 — 장면이 판타지면 판타지답게, 현대면 현대답게, SF면 SF답게. 맥락에 없는 뜬금없는 대상(예: 한국 회사원, 김대리)을 만들지 마라. 무겁지 않은 일상 + 데드팬 코미디. 한국어로만. JSON만, 설명/코드펜스 금지.';
function buildAppearPrompt() {
    return `너는 RP 채팅에 어울리는 "조우 이벤트"를 만든다. 이 장면에 자연스럽게 나타날 법한 대상(인물/생물/사물) 하나.
${RULES_FIT}
선택지 3개(서로 다른 대응), 각 kind는 help/cooperate/activity/loot/interact/flee/attack 중 하나. attack은 괜히 시비 거는 선택.
foeType은 대상이 사람이면 "person", 동물/생물이면 "creature", 물건/사물이면 "object".
place=이 조우가 일어나는 장소를 짧게(예: 중앙공원 / 강의실 / 선술집 / 골목). env=그 장소 환경 태그 2~4개(예: ["야외","공원","나무"] 또는 ["실내","학교"]). 이건 나중에 "비슷한 장소에서만 다시 떠오르게" 쓰는 값이니 정확히.
형식: {"category":"npc","emoji":"이모지 하나","title":"~가 나타났다/다가온다/보인다 류 한 문장","foe":"대상 이름(없으면 null)","foeType":"person|creature|object","place":"장소","env":["태그",...],"choices":[{"label":"...","kind":"..."},{"label":"...","kind":"..."},{"label":"...","kind":"flee"}]}
${knownNpcsHint()}${recentFoesHint()}
${getScene()}[대화 맥락]
${getConvo()}`;
}
function buildSituationPrompt() {
    return `너는 RP 채팅에 어울리는 "상황 이벤트"(환경/사건)를 만든다. 인물이 아니라 장면에 닥치는 일.
${RULES_FIT}
선택지 3개. 형식: {"category":"situation","emoji":"이모지 하나","title":"한 문장","desc":"짧은 묘사 한 줄","choices":[{"label":"...","kind":"activity"},{"label":"...","kind":"interact"},{"label":"...","kind":"flee"}]}

${getScene()}[대화 맥락]
${getConvo()}`;
}
function buildResolvePrompt(item, choiceLabel, kind, history) {
    const hist = (history && history.length)
        ? `이 조우는 여러 박자로 이어졌다:\n${history.map((h, i) => `${i + 1}. ${h.title} → 선택: ${h.choice}`).join('\n')}\n그리고 마지막 선택: ${choiceLabel}\n결과/후일담은 이 전체 흐름을 반영해라.\n`
        : '';
    let relCtx = '';
    const n = item.foe ? STATE.npcs[item.foe] : null;
    if (n && n.metCount > 0) {
        const d = daysSince(n.lastMetTs);
        relCtx = `[이 대상과의 기존 관계] ${n.nickname || n.name} · 관계: ${n.tier} · ${n.metCount}번째 만남${n.lastPlace ? ` · 주 출몰: ${n.lastPlace}` : ''}${n.state && n.state !== '평범함' ? ` · 최근 상태: ${n.state}` : ''}${n.memory ? ` · 기억: ${stripTags(n.memory)}` : ''}.
이 관계 단계에 맞게 반응해라 — 차가우면(경계/불신/피함) 상대가 거리를 두거나 경계/회피하고(예: 현금통을 끌어당김, 손을 피해 담장 위로 올라감), 따뜻하면(익숙함/단골) 반갑게 군다. inner.foe와 after에 그 온도가 묻어나야 한다.\n`;
    }
    return `RP 이벤트의 "결과"와 "뒷소문"을 만든다.
이벤트: ${item.title} / 선택: ${choiceLabel} (kind:${kind})
${relCtx}${hist}규칙: 데드팬 코미디, 한국어. exp=경험치 정수. rep=평판 변화 정수(좋은 행동 +, 괜히 시비/민폐 -). affDelta=관계 변화 정수(없으면 0).
inner.foe=상대/주변의 진짜 속내(수치와 어긋나도 됨, 그게 재미). inner.user=유저 속내 추측("~했을지도/~었을 것이다" 식 단정 금지).
after=가끔만(대개 null) 며칠 뒤 오해/뒷이야기 한 줄. drop=주운 물건 있으면 {name,emoji,price:0}, 없으면 null.
대상(인물/생물)이 있으면: npcMemory=그 대상에 대해 오래 남을 한 줄 기억(없으면 null), npcState=그 대상의 현재 상태 짧게(없으면 null).
summary=이 조우 전체를 짧게 요약한 한 줄(대상+무슨 일이 있었는지, 일지 제목용. 예: "이구아나를 쓰다듬으려다 경계당함", "붕어빵 아저씨에게 세금 얘기하다 미움삼"). 18자 안팎으로 짧게. JSON만.
형식: {"result":"짧은 결과 라벨","summary":"한 줄 요약","exp":정수,"rep":정수,"affDelta":정수,"drop":{...}또는null,"inner":{"foe":"...","user":"..."},"after":"..."또는null,"npcMemory":"..."또는null,"npcState":"..."또는null}

${getScene()}[대화 맥락]
${getConvo()}`;
}
function buildChainPrompt(item, history, choice, stage, max) {
    const hist = history.map((h, i) => `${i + 1}. ${h.title} → 선택: ${h.choice}`).join('\n');
    return `RP "조우"가 이어지는 중이다 (${stage}/${max}단계). 방금 선택을 받아 장면이 한 박자 전개된다 — 아직 결말이 아니다(결과/수치 금지).
대상: ${item.foe || item.title}
지금까지:
${hist}
이번 선택: ${choice.label} (kind:${choice.kind})
규칙: 데드팬 코미디, 한국어. 직전 선택의 자연스러운 반응으로 상황이 한 단계 더 꼬이거나 풀린다. 새 선택지 3개(서로 다른 대응, 마지막은 빠지기 kind:flee). ${RULES_FIT}
형식: {"beat":"전개 한두 문장","choices":[{"label":"...","kind":"..."},{"label":"...","kind":"..."},{"label":"...","kind":"flee"}]}

${getScene()}[대화 맥락]
${getConvo()}`;
}
function normalizeBeat(o) {
    o = o || {};
    let ch = Array.isArray(o.choices) ? o.choices.slice(0, 4) : [];
    ch = ch.filter(c => c && c.label).map(c => ({ label: String(c.label), kind: VALID_KINDS.includes(c.kind) ? c.kind : 'interact' }));
    if (!ch.length) ch = [{ label: '계속 지켜본다', kind: 'interact' }, { label: '물러난다', kind: 'flee' }];
    return { beat: String(o.beat || '상황이 한 박자 더 이어진다.'), choices: ch };
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
        place: (o.place && o.place !== 'null') ? String(o.place).slice(0, 24) : '',
        env: Array.isArray(o.env) ? o.env.map(s => String(s).replace(/[#\s]/g, '').slice(0, 12)).filter(Boolean).slice(0, 5) : [],
        choices,
    };
}
function normalizeOutcome(o, kind) {
    o = o || {};
    return {
        result: String(o.result || '결과'),
        summary: (o.summary && o.summary !== 'null') ? String(o.summary).slice(0, 40) : null,
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
        emoji: item.emoji, title: item.title, desc: `${choiceLabel} — ${outcome.result}`, summary: outcome.summary || null,
        result: outcome.result, exp: outcome.exp, rep: outcome.rep || 0, rarity, affDelta, foe: item.foe || null,
        drop: outcome.drop ? outcome.drop.name : null, dropBait: itemType === 'bait',
        inner: outcome.inner, after: (outcome.after || rollAfter()), _noNews: pick(NO_NEWS), revealed: false, open: false,
    };
    STATE.encounters.unshift(entry);
    if (STATE.encounters.length > 150) STATE.encounters.length = 150;
    if (outcome.drop) { STATE.items.unshift(Object.assign({ id: cryptoId(), rarity, itemType }, outcome.drop)); if (STATE.items.length > 80) STATE.items.length = 80; }

    if (item.foe) {
        const isNew = !STATE.npcs[item.foe];
        const reg = STATE.npcs[item.foe] || { name: item.foe, nickname: '', emoji: item.emoji, dexType: 'creature', affinity: 0, metCount: 0, firstMet: nowDate(), lastMet: nowDate(), tier: '낯섦', state: '평범함', memory: '', log: [], terjut: false, firstPlace: '', lastPlace: '', env: [] };
        const before = reg.tier;
        const disp = reg.nickname || reg.name;
        reg.metCount += 1; reg.affinity += affDelta; reg.lastMet = nowDate(); reg.lastMetTs = Date.now();
        if (isNew) { reg.firstMet = nowDate(); reg.firstMetTs = Date.now(); }
        if (item.foeType) reg.dexType = item.foeType;
        if (item.place) { if (!reg.firstPlace) reg.firstPlace = item.place; reg.lastPlace = item.place; }
        if (Array.isArray(item.env) && item.env.length) reg.env = Array.from(new Set([...(reg.env || []), ...item.env])).slice(0, 8);
        reg.tier = relTier(reg.affinity); reg.terjut = reg.metCount >= 5;
        const stateChanged = outcome.npcState && outcome.npcState !== reg.state;
        if (outcome.npcState) reg.state = outcome.npcState;
        if (outcome.npcMemory) reg.memory = outcome.npcMemory;
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

    // ── 스탯 변화 (조우) ──
    if (outcome.rep > 0) STATE.mood = clamp05(STATE.mood + 1);          // 좋은 조우 → 기분↑
    else if (outcome.rep < 0) STATE.mood = clamp05(STATE.mood - 1);     // 나쁜 조우 → 기분↓
    if (kind === 'attack') { STATE.hp = clamp05(STATE.hp - 1); STATE.mood = clamp05(STATE.mood - 1); }  // 싸움 → 체력·기분↓
    if (STATE.encounters.length % 3 === 0) STATE.hunger = clamp05(STATE.hunger - 1);                     // 활동하면 배고파짐
    if (STATE.hunger <= 0) { STATE.mood = clamp05(STATE.mood - 1); STATE.hp = clamp05(STATE.hp - 1); }   // 굶으면 방치 페널티

    levelCheck();
    saveState(STATE);
    renderAll();
    refreshMemory();
    showResultPopup(entry);
}
function clamp05(n) { return Math.max(0, Math.min(5, n)); }
function levelCheck() {
    let need = STATE.level * 100;
    while (STATE.xp >= need) { STATE.xp -= need; STATE.level += 1; flash(`⭐ 레벨업! Lv.${STATE.level}`); need = STATE.level * 100; }
    while (STATE.xp < 0 && STATE.level > 1) { STATE.level -= 1; STATE.xp += STATE.level * 100; flash(`💧 레벨 다운… Lv.${STATE.level}`); }
    if (STATE.xp < 0) STATE.xp = 0;   // Lv.1 바닥
}

// ── 정리/삭제 ──
function deleteEncounter(id) { STATE.encounters = STATE.encounters.filter(x => x.id !== id); saveState(STATE); renderFull(); refreshMemory(); }
function clearEncounters() { showConfirm('모험일지 비우기', '기록을 전부 지울까요? 되돌릴 수 없어요.', () => { STATE.encounters = []; saveState(STATE); renderAll(); refreshMemory(); }); }
function deleteItem(id) { STATE.items = STATE.items.filter(x => x.id !== id); saveState(STATE); renderAll(); }
function clearItems() { showConfirm('가방 비우기', '소지품을 전부 버릴까요?', () => { STATE.items = []; saveState(STATE); renderAll(); }); }
function deleteNpc(name) {
    const n = STATE.npcs[name]; if (!n) return;
    showConfirm('인물 삭제', `'${n.nickname || n.name}'을(를) 도감에서 지울까요? 되돌릴 수 없어요.`, () => {
        delete STATE.npcs[name];
        if (STATE.currentNpc === name) STATE.currentNpc = null;
        saveState(STATE); renderAll();
    });
}
function clearNpcs() { showConfirm('도감 전체 삭제', '인물 도감을 통째로 비울까요? 되돌릴 수 없어요.', () => { STATE.npcs = {}; STATE.currentNpc = null; saveState(STATE); renderAll(); }); }

// ── 앰비언트 기억 주입 (setExtensionPrompt) ──
// 보이는 메시지로 사건을 쑤셔넣지 않는다. 게다가 "현재 장면의 장소"와 맞는 주민만 떠올리게 한다.
const MEM_KEY = 'beastlog_traces';
function currentSceneText() {
    const ctx = getCtx();
    if (!ctx || !Array.isArray(ctx.chat)) return '';
    return ctx.chat.filter(m => m && m.mes).slice(-6).map(m => stripTags(m.mes)).join(' ').toLowerCase();
}
function sceneMatch(n, scene) {
    if (!scene) return false;
    const terms = [n.lastPlace, n.firstPlace, ...(n.env || [])].filter(t => t && String(t).length >= 2);
    return terms.some(t => scene.includes(String(t).toLowerCase()));
}
function daysSince(ts) { return ts ? Math.floor((Date.now() - ts) / 86400000) : null; }
function isPinned(key) { return (STATE.pins || []).includes(key); }
function pinBtn(key) {
    const off = STATE.settings.injectDefault ? '' : ' disabled';
    return `<button class="bl-pin${isPinned(key) ? ' on' : ''}" data-pin="${escapeHtml(key)}"${off} title="${STATE.settings.injectDefault ? '기억에 주입/해제' : '기억 흘리기를 켜야 활성화'}">📌</button>`;
}
function pinMemory(key) {
    if (!STATE.settings.injectDefault) { flash('세팅에서 🌱 기억 흘리기를 먼저 켜주세요'); return; }
    STATE.pins = STATE.pins || [];
    const i = STATE.pins.indexOf(key);
    if (i >= 0) STATE.pins.splice(i, 1); else STATE.pins.push(key);
    saveState(STATE); renderAll(); refreshMemory();
    flash(i >= 0 ? '기억에서 내림' : '📌 기억에 고정됨');
}
function pinnedLines() {
    const out = [];
    for (const key of (STATE.pins || [])) {
        const ci = key.indexOf(':'); const t = key.slice(0, ci); const id = key.slice(ci + 1);
        if (t === 'npc') {
            const n = STATE.npcs[id]; if (!n) continue;
            const d = daysSince(n.lastMetTs);
            out.push(`· ${n.emoji || ''} ${n.nickname || n.name} (${n.tier})${n.lastPlace ? ' · ' + n.lastPlace : ''}${n.state && n.state !== '평범함' ? ' · ' + n.state : ''}${n.memory ? ' · ' + stripTags(n.memory) : ''}${d != null && d >= 1 ? ` · ${d}일 전` : ''}`);
        } else if (t === 'enc') {
            const e = (STATE.encounters || []).find(x => x.id === id); if (!e) continue;
            out.push(`· ${e.emoji || ''} ${stripTags(e.after || e.desc || e.title)}`);
        } else if (t === 'item') {
            const it = (STATE.items || []).find(x => x.id === id); if (!it) continue;
            out.push(`· ${it.emoji || '📦'} ${it.name}`);
        }
    }
    return out;
}
function buildMemoryBlock() {
    const scene = currentSceneText();
    const auto = [];
    const pinnedKeys = new Set((STATE.pins || []).filter(k => k.startsWith('npc:')).map(k => k.slice(4)));
    for (const n of Object.values(STATE.npcs || {})) {
        if (pinnedKeys.has(n.name)) continue;            // 고정된 건 아래 핀 섹션에서
        if (!sceneMatch(n, scene)) continue;             // 장소 안 맞으면 제외
        const name = n.nickname ? `${n.name}(별명 ${n.nickname})` : n.name;
        const place = n.lastPlace || n.firstPlace || '';
        const bits = [`${n.emoji || ''} ${name} — 관계: ${n.tier}`];
        if (place) bits.push(`주로 ${place}에서 마주침`);
        if (n.state && n.state !== '평범함') bits.push(`최근 상태: ${n.state}`);
        if (n.memory) bits.push(`기억: ${stripTags(n.memory)}`);
        const d = daysSince(n.lastMetTs);
        if (d != null && d >= 1) bits.push(`마지막으로 본 지 ${d}일`);
        auto.push('· ' + bits.join(' / '));
        if (auto.length >= 4) break;
    }
    const pins = pinnedLines();
    if (!auto.length && !pins.length) return '';
    let s = '';
    if (auto.length) {
        s += `[비스트로그 — 지금 이 장소에서 떠오를 수 있는 것들]
※ 현재 장면의 환경과 맞아떨어지는, 이미 아는 대상들이다. 자연스러울 때 {{char}}가 먼저 알아보거나 떠올려도 좋다 ("저 다람쥐, 전에 본 놈 아니냐") — 관계 단계에 맞는 반응으로. 오랜만의 재회라면 그 감회(반가움/떨떠름함/경계 등)가 슬쩍 묻어나도 좋다.
※ 이건 장면을 끌고 가라는 지시가 아니다. 흐름을 해치지 않는 선에서 양념처럼 슬쩍 언급될 뿐. 강제 등장·장면 가로채기 절대 금지.
${auto.join('\n')}`;
    }
    if (pins.length) {
        if (s) s += '\n\n';
        s += `[비스트로그 — 특별히 기억하는 것들]
※ 유저가 직접 고정해 둔 기억이다. 장소와 무관하게, 흐름상 자연스러울 때 {{char}}가 떠올리거나 반영해도 좋다. 역시 강제하지 말 것.
${pins.join('\n')}`;
    }
    return s;
}
function refreshMemory() {
    const ctx = getCtx();
    if (!ctx || typeof ctx.setExtensionPrompt !== 'function') return;
    const block = (STATE.settings.injectDefault) ? buildMemoryBlock() : '';
    try { ctx.setExtensionPrompt(MEM_KEY, block, 1, 4); } catch (e) { blDebug('기억 주입 실패', e); }
}
function injectBait() {
    const bait = STATE.items.find(i => i.itemType === 'bait') || STATE.items[0];
    if (!bait) { flash('주울 게 없다'); return; }
    flash(`🎣 ${bait.name} 만지작…`);
}

// ── 동기화/헬퍼 ──
function setInjectDefault(v) { STATE.settings.injectDefault = v; saveState(STATE); renderAll(); refreshMemory(); syncControls(); }
function setAutoDetect(v) { EXT.autoDetect = v; saveExt(); syncControls(); }
function setChain(v) { EXT.chainOn = v; saveExt(); syncControls(); }
function setSpriteMono(v) { EXT.spriteMono = v; saveExt(); renderAll(); syncControls(); }
const BL_THEMES = [{ k: 'pudding', label: '🍮 푸딩' }, { k: 'mint', label: '🍵 말차' }, { k: 'strawberry', label: '🌸 벚꽃' }, { k: 'dawn', label: '🌌 새벽하늘' }];
function applyTheme() {
    const t = (EXT && EXT.theme) || 'pudding';
    const root = document.documentElement;
    if (!root) return;
    if (t === 'pudding') root.removeAttribute('data-bl-theme');
    else root.setAttribute('data-bl-theme', t);
}
function setTheme(v) { EXT.theme = v; saveExt(); applyTheme(); renderAll(); syncControls(); }
function syncControls() {
    if (consoleEl) { const sw = consoleEl.querySelector('.bl-sw'); if (sw) sw.dataset.on = STATE.settings.injectDefault ? 'true' : 'false'; }
    if (fullEl) {
        const fi = fullEl.querySelector('.bl-t-inject'); if (fi) fi.checked = STATE.settings.injectDefault;
        const fa = fullEl.querySelector('.bl-t-auto'); if (fa) fa.checked = EXT.autoDetect;
        const fc = fullEl.querySelector('.bl-t-chain'); if (fc) fc.checked = EXT.chainOn !== false;
        const fm = fullEl.querySelector('.bl-t-mono'); if (fm) fm.checked = EXT.spriteMono === true;
        const curTheme = EXT.theme || 'pudding';
        fullEl.querySelectorAll('.bl-theme-btn').forEach(b => b.classList.toggle('on', b.dataset.theme === curTheme));
    }
}
function pickMascot(key) { if (MASCOTS[key] && ownsMascot(key)) { EXT.mascot = key; saveExt(); renderAll(); } }
function cycleMascot() { const owned = MASCOT_KEYS.filter(ownsMascot); if (!owned.length) return; const i = owned.indexOf(EXT.mascot); EXT.mascot = owned[(i + 1) % owned.length]; saveExt(); renderAll(); }
function pips(emoji, n) { return emoji.repeat(Math.max(0, n)) + '·'.repeat(Math.max(0, 5 - n)); }
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
    if (!STATE.items.length) return '<div class="bl-empty">텅 비었다</div>';
    const baits = STATE.items.filter(i => i.itemType === 'bait');
    const junks = STATE.items.filter(i => i.itemType !== 'bait');
    const shown = baits.concat(junks).slice(0, limit);
    const rest = STATE.items.length - shown.length;
    let html = shown.map(itemChip).join('');
    if (rest > 0) html += `<span class="bl-bag-more">외 ${rest}개</span>`;
    return html;
}

// ── 미니 콘솔 (좌: 상태+소지품 / 우: 출현·상황) ──
let consoleEl = null;
function buildConsole() {
    if (consoleEl) return;
    consoleEl = document.createElement('div');
    consoleEl.id = 'beastlog-console';
    // CSS-독립 위치 폴백. bottom은 인라인으로 박지 않고 CSS env()에 위임(safe-area)
    Object.assign(consoleEl.style, { position: 'fixed', left: '12px', right: '12px', zIndex: '2147483000', maxWidth: '392px', margin: '0 auto' });
    consoleEl.innerHTML = `
      <div class="bl-topbar">
        <span class="bl-grip">⠿</span><span class="bl-title">비스트로그</span>
        <span class="bl-spacer"></span>
        <span class="bl-inject"><span class="bl-lab">🌱</span><span class="bl-sw" data-on="false"></span></span>
        <span class="bl-min" title="아이콘만">▁</span>
        <span class="bl-up" title="기록·설정 열기">📖</span>
      </div>
      <div class="bl-panes">
        <div class="bl-pane-l">
          <div class="bl-mini-status">
            <div class="bl-ms-row">
              <span class="bl-pet-emoji-mini" title="탭하면 마스코트 변경"></span>
              <span class="bl-ms-id"><b class="bl-pet-name"></b><span class="bl-lv num"></span></span>
            </div>
            <div class="bl-status"><span class="bl-st-mood"></span><span class="bl-st-hunger"></span><span class="bl-st-hp"></span></div>
            <div class="bl-xmini"><i></i></div>
            <div class="bl-ms-rep">⭐ <b class="num bl-rep"></b> · 💰 <b class="num bl-money"></b> · 🎒 <b class="num bl-itemcnt"></b></div>
          </div>
        </div>
        <div class="bl-pane-r">
          <button class="bl-roll">🐯 출현</button>
          <button class="bl-randevent">🌦️ 상황</button>
          <div class="bl-cooldown num"></div>
        </div>
      </div>
      <div class="bl-mini-slots">
        <div class="bl-mini-bag collapsed">
          <div class="bl-mb-h">🎒 소지품 <span class="bl-mb-cnt num"></span><button class="bl-bag-inject" title="떡밥 주입">📤</button><span class="bl-mb-chev">▾</span></div>
          <div class="bl-bag-list"></div>
        </div>
        <div class="bl-slot"><span class="bl-slot-h">📢 현재 상황</span><span class="bl-slot-v bl-sit-v"></span></div>
        <div class="bl-slot"><span class="bl-slot-h">👤 현재 조우</span><span class="bl-slot-v bl-npc-v"></span></div>
      </div>`;
    (document.documentElement || document.body).appendChild(consoleEl);
    consoleEl.querySelector('.bl-sw').addEventListener('click', () => setInjectDefault(!STATE.settings.injectDefault));
    consoleEl.querySelector('.bl-pet-emoji-mini').addEventListener('click', cycleMascot);
    consoleEl.querySelector('.bl-roll').addEventListener('click', onAppear);
    consoleEl.querySelector('.bl-randevent').addEventListener('click', onSituation);
    consoleEl.querySelector('.bl-up').addEventListener('click', showFull);
    consoleEl.querySelector('.bl-min').addEventListener('click', collapseToBubble);
    consoleEl.querySelector('.bl-bag-inject').addEventListener('click', injectBait);
    const mbh = consoleEl.querySelector('.bl-mb-h');
    mbh.addEventListener('click', e => { if (e.target.closest('.bl-bag-inject')) return; mbh.parentElement.classList.toggle('collapsed'); });
    wireDrag(consoleEl.querySelector('.bl-topbar'));
}
function wireDrag(bar) {
    if (!bar) return;
    let st = null;
    bar.addEventListener('pointerdown', e => {
        if (e.target.closest('button, .bl-sw, .bl-up, .bl-inject')) return;
        const r = consoleEl.getBoundingClientRect();
        st = { sx: e.clientX, sy: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
        try { bar.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    });
    bar.addEventListener('pointermove', e => {
        if (!st) return;
        if (!st.moved) {
            if (Math.abs(e.clientX - st.sx) < 6 && Math.abs(e.clientY - st.sy) < 6) return; // 임계값: 탭 보호
            st.moved = true;
            consoleEl.style.right = 'auto'; consoleEl.style.bottom = 'auto'; consoleEl.style.margin = '0';
        }
        const w = consoleEl.offsetWidth, h = consoleEl.offsetHeight;
        const nx = Math.max(4, Math.min(window.innerWidth - w - 4, e.clientX - st.dx));
        const ny = Math.max(4, Math.min(window.innerHeight - h - 4, e.clientY - st.dy));
        consoleEl.style.left = nx + 'px'; consoleEl.style.top = ny + 'px';
    });
    const end = () => {
        if (st && st.moved && window.innerWidth > 600) { EXT.consolePos = { left: parseInt(consoleEl.style.left, 10), top: parseInt(consoleEl.style.top, 10) }; saveExt(); }
        st = null;
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
}
function applyConsolePos() {
    if (!consoleEl) return;
    const mobile = window.innerWidth <= 600;
    const p = EXT.consolePos;
    // 모바일 or 저장좌표 없음 → 높이 계산해 top을 픽셀로 직접 박음 (bottom 기준 박스 뒤집힘 회피)
    if (mobile || !p || typeof p.left !== 'number') {
        const h = consoleEl.offsetHeight || 216;
        const top = Math.max(4, window.innerHeight - h - 14);
        consoleEl.style.left = '12px'; consoleEl.style.right = '12px';
        consoleEl.style.top = top + 'px'; consoleEl.style.bottom = 'auto'; consoleEl.style.margin = '0 auto';
        return;
    }
    const w = consoleEl.offsetWidth || 340, h = consoleEl.offsetHeight || 220;
    const left = Math.max(4, Math.min(window.innerWidth - w - 4, p.left));
    const top = Math.max(4, Math.min(window.innerHeight - h - 4, p.top));
    consoleEl.style.left = left + 'px'; consoleEl.style.top = top + 'px';
    consoleEl.style.right = 'auto'; consoleEl.style.bottom = 'auto'; consoleEl.style.margin = '0';
}
function ensureMounted() {
    try { const root = document.documentElement || document.body; if (consoleEl && root && !root.contains(consoleEl)) root.appendChild(consoleEl); }
    catch (e) { /* noop */ }
}
function renderConsole() {
    if (!consoleEl) return;
    const evo = evoStage(STATE.level), need = STATE.level * 100;
    consoleEl.querySelector('.bl-pet-emoji-mini').innerHTML = mascotSVG(30);
    consoleEl.querySelector('.bl-pet-name').textContent = evo.name;
    consoleEl.querySelector('.bl-lv').textContent = 'Lv.' + String(STATE.level).padStart(2, '0');
    consoleEl.querySelector('.bl-st-mood').textContent = pips('😊', STATE.mood);
    consoleEl.querySelector('.bl-st-hunger').textContent = pips('🍖', STATE.hunger);
    consoleEl.querySelector('.bl-st-hp').textContent = pips('❤️', STATE.hp);
    consoleEl.querySelector('.bl-xmini i').style.width = Math.min(100, (STATE.xp / need) * 100) + '%';
    consoleEl.querySelector('.bl-rep').textContent = (STATE.rep > 0 ? '+' : '') + STATE.rep;
    const mm = consoleEl.querySelector('.bl-money'); if (mm) mm.textContent = fmtMoney(STATE.money);
    consoleEl.querySelector('.bl-itemcnt').textContent = STATE.items.length;
    consoleEl.querySelector('.bl-sw').dataset.on = STATE.settings.injectDefault ? 'true' : 'false';
    consoleEl.querySelector('.bl-bag-list').innerHTML = bagPreviewHtml(3);
    consoleEl.querySelector('.bl-mb-cnt').textContent = STATE.items.length;
    const rem = injectRemaining();
    consoleEl.querySelector('.bl-cooldown').textContent = rem > 0 ? `💉 ${rem}턴` : '💉 준비';
    consoleEl.querySelector('.bl-sit-v').innerHTML = sitLine();
    consoleEl.querySelector('.bl-npc-v').innerHTML = npcLine();
}

// ── 풀버전 (리치) ──
let fullEl = null;
function buildFull() {
    if (fullEl) return;
    fullEl = document.createElement('div');
    fullEl.id = 'beastlog-full';
    Object.assign(fullEl.style, { position: 'fixed', top: '0', left: '0', right: 'auto', bottom: 'auto', width: '100vw', height: '100vh', zIndex: '2147483400', boxSizing: 'border-box' });
    fullEl.style.display = 'none';
    fullEl.innerHTML = `
      <div class="bl-full-card">
        <div class="bl-full-sign">
          <div class="bl-full-logo">🐯 비스트로그</div>
          <div class="bl-full-actions"><button class="bl-min" title="작게">⊟</button><button class="bl-close" title="닫기">✕</button></div>
        </div>
        <div class="bl-tabs">
          <button class="bl-tab on" data-tab="main">🏠 메인</button>
          <button class="bl-tab" data-tab="work">🛠️ 알바</button>
          <button class="bl-tab" data-tab="shop">🏪 상점</button>
          <button class="bl-tab" data-tab="set">⚙️ 세팅</button>
        </div>
        <div class="bl-full-body">
          <div class="bl-tab-panel" data-panel="main">
          <div class="bl-pet-card">
            <div class="bl-pet-top"><span class="bl-pet-name"></span><span class="bl-pet-lv">Lv.<b class="num bl-pet-lvnum"></b></span></div>
            <div class="bl-pet"><span class="bl-pet-emoji"></span></div>
            <div class="bl-status">
              <span class="bl-st">기분 <b class="bl-st-mood"></b></span>
              <span class="bl-st">배고픔 <b class="bl-st-hunger"></b></span>
              <span class="bl-st">체력 <b class="bl-st-hp"></b></span>
            </div>
            <div class="bl-pet-xptext num"></div><div class="bl-pet-xpbar"><i></i></div>
            <div class="bl-pet-stats">⭐ <b class="num bl-pet-rep"></b> · 💰 <b class="num bl-pet-money"></b> · 🎒 <b class="num bl-pet-items"></b> · <span class="bl-pet-title"></span></div>
            <button class="bl-feed">🍖 밥 주기</button>
            <div class="bl-pet-pick"></div>
          </div>
          <div class="bl-slots">
            <div class="bl-slot"><span class="bl-slot-h">📢 현재 상황</span><span class="bl-slot-v bl-sit-v"></span></div>
            <div class="bl-slot"><span class="bl-slot-h">👤 현재 조우</span><span class="bl-slot-v bl-npc-v"></span></div>
          </div>
          <div class="bl-full-rolls"><button class="bl-roll2">🐯 출현</button><button class="bl-rand2">🌦️ 상황</button></div>
          <div class="bl-acc">
            <div class="bl-acc-head"><h3>📜 모험일지</h3><span class="bl-rule"></span><span class="bl-enc-cnt num"></span><button class="bl-clear-btn bl-enc-clear" title="전체 비우기">🧹</button><span class="bl-chev">▾</span></div>
            <div class="bl-acc-body"><div class="bl-enc-list"></div></div>
          </div>
          <div class="bl-acc">
            <div class="bl-acc-head"><h3>📖 인물 도감</h3><span class="bl-rule"></span><span class="bl-dex-cnt num"></span><button class="bl-clear-btn bl-dex-clear" title="도감 전체 삭제">🧹</button><span class="bl-chev">▾</span></div>
            <div class="bl-acc-body"><div class="bl-dex-list"></div></div>
          </div>
          <div class="bl-acc">
            <div class="bl-acc-head"><h3>🎒 가방</h3><span class="bl-rule"></span><span class="bl-junk-cnt num"></span><button class="bl-clear-btn bl-bag-clear" title="전체 비우기">🧹</button><span class="bl-chev">▾</span></div>
            <div class="bl-acc-body"><div class="bl-junk-list"></div></div>
          </div>
          <button class="bl-main-reset">🔄 처음으로 (완전 초기화)</button>
          </div>
          <div class="bl-tab-panel" data-panel="work" hidden>
            <div class="bl-work">
              <div class="bl-money-bar">보유 <b class="num bl-work-money">0원</b><button class="bl-donate" title="전 재산 후원">💝 후원</button></div>
              <button class="bl-work-go">🛠️ 알바 뛰기</button>
              <div class="bl-work-cd"></div>
              <div class="bl-acc bl-work-acc collapsed">
                <div class="bl-acc-head"><h3>🛠️ 알바 내역</h3><span class="bl-rule"></span><span class="bl-job-cnt num"></span><button class="bl-clear-btn bl-jobs-clear" title="전체 비우기">🧹</button><span class="bl-chev">▾</span></div>
                <div class="bl-acc-body"><div class="bl-jobs-list"></div></div>
              </div>
              <div class="bl-work-tip">RP 주인공이 세계관에 맞는 알바를 뜀. 보수는 짜다. 가끔 사건 터짐. (알바하면 살짝 배고파짐)</div>
            </div>
          </div>
          <div class="bl-tab-panel" data-panel="shop" hidden>
            <div class="bl-shop">
              <div class="bl-money-bar">보유 <b class="num bl-shop-money">0원</b></div>
              <div class="bl-shop-list"></div>
              <div class="bl-work-tip">알바로 번 돈으로 새 동물을 데려와요. 시작 3종(호랑이·고양이·강아지)은 무료, 나머지는 구매.</div>
            </div>
          </div>
          <div class="bl-tab-panel" data-panel="set" hidden>
            <div class="bl-philo">기본은 <b>인게임에만</b> 쌓여요. RP는 안 건드림. 아래를 켜면 쌓인 기억을 캐릭터가 가끔 회상하게 됩니다 (선택).</div>
            <div class="bl-full-toggles">
              <label><span>🌱 기억을 RP에 흘리기 <small>(선택) — 켜면 쌓인 NPC·일지를 캐릭터가 대화 중 가끔 자연스럽게 떠올려요. 강제 등장 X, 그냥 슬쩍</small></span><input type="checkbox" class="bl-t-inject"></label>
              <label><span>🔗 조우 체인 <small>(켜면 조우가 랜덤 2~3단계로 이어짐 / 끄면 1번에 끝)</small></span><input type="checkbox" class="bl-t-chain"></label>
              <label><span>🎨 마스코트 흑백(도트라인)</span><input type="checkbox" class="bl-t-mono"></label>
              <label><span>📥 자동 출현 <small>(켜면 RP 상대 답장마다 랜덤 2~4회 간격으로 조우가 저절로 뜸 / 끄면 출현 버튼으로 직접)</small></span><input type="checkbox" class="bl-t-auto"></label>
            </div>
            <div class="bl-theme-row">
              <span class="bl-theme-lbl">🎨 테마</span>
              <div class="bl-theme-btns">
                ${BL_THEMES.map(t => `<button class="bl-theme-btn" data-theme="${t.k}">${t.label}</button>`).join('')}
              </div>
            </div>
            <div class="bl-cd-note">⏱️ 출현·알바 간격은 매번 <b>랜덤 2~4회</b>로 자동 조절돼요.</div>
            <div class="bl-data-sec">
              <div class="bl-data-ttl">💾 데이터</div>
              <div class="bl-data-btns">
                <button class="bl-data-export">백업 내보내기</button>
                <button class="bl-data-import">백업 불러오기</button>
              </div>
              <button class="bl-data-reset">🔄 완전 초기화</button>
            </div>
          </div>
        </div>
      </div>`;
    (document.documentElement || document.body).appendChild(fullEl);
    fullEl.querySelector('.bl-min').addEventListener('click', showMini);
    fullEl.querySelector('.bl-close').addEventListener('click', hideHud);
    fullEl.querySelectorAll('.bl-tab').forEach(t => t.addEventListener('click', () => {
        const tab = t.dataset.tab;
        fullEl.querySelectorAll('.bl-tab').forEach(x => x.classList.toggle('on', x === t));
        fullEl.querySelectorAll('.bl-tab-panel').forEach(p => { p.hidden = (p.dataset.panel !== tab); });
        fullEl.querySelector('.bl-full-body').scrollTop = 0;
    }));
    fullEl.querySelector('.bl-t-inject').addEventListener('change', e => setInjectDefault(e.target.checked));
    fullEl.querySelector('.bl-t-chain').addEventListener('change', e => setChain(e.target.checked));
    fullEl.querySelector('.bl-t-mono').addEventListener('change', e => setSpriteMono(e.target.checked));
    fullEl.querySelector('.bl-t-auto').addEventListener('change', e => setAutoDetect(e.target.checked));
    fullEl.querySelector('.bl-roll2').addEventListener('click', onAppear);
    fullEl.querySelector('.bl-rand2').addEventListener('click', onSituation);
    fullEl.querySelectorAll('.bl-acc-head').forEach(h => h.addEventListener('click', e => { if (e.target.closest('.bl-clear-btn')) return; h.parentElement.classList.toggle('collapsed'); }));
    fullEl.querySelector('.bl-enc-clear').addEventListener('click', e => { e.stopPropagation(); clearEncounters(); });
    fullEl.querySelector('.bl-dex-clear').addEventListener('click', e => { e.stopPropagation(); clearNpcs(); });
    fullEl.querySelector('.bl-bag-clear').addEventListener('click', e => { e.stopPropagation(); clearItems(); });
    fullEl.querySelector('.bl-pet-pick').addEventListener('click', e => { const b = e.target.closest('.bl-pick-btn'); if (b) pickMascot(b.dataset.m); });
    fullEl.querySelector('.bl-work-go').addEventListener('click', onWork);
    fullEl.querySelector('.bl-donate').addEventListener('click', onDonate);
    { const fb = fullEl.querySelector('.bl-feed'); if (fb) fb.addEventListener('click', onFeed); }
    fullEl.querySelector('.bl-jobs-clear').addEventListener('click', e => { e.stopPropagation(); clearJobs(); });
    fullEl.querySelector('.bl-jobs-list').addEventListener('click', e => { const b = e.target.closest('.bl-job-del'); if (b) deleteJob(b.dataset.id); });
    fullEl.querySelector('.bl-main-reset').addEventListener('click', resetAll);
    fullEl.querySelector('.bl-data-export').addEventListener('click', exportData);
    fullEl.querySelectorAll('.bl-theme-btn').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.theme)));
    fullEl.querySelector('.bl-data-import').addEventListener('click', importData);
    fullEl.querySelector('.bl-data-reset').addEventListener('click', resetAll);
    fullEl.querySelector('.bl-shop-list').addEventListener('click', e => { const b = e.target.closest('.bl-shop-buy'); if (b) buyMascot(b.dataset.m); });
    fullEl.querySelector('.bl-enc-list').addEventListener('click', e => {
        const rev = e.target.closest('.bl-reveal');
        if (rev) { const en = STATE.encounters.find(x => x.id === rev.dataset.id); if (en) { en.revealed = true; saveState(STATE); renderFull(); } return; }
        const pinb = e.target.closest('.bl-pin');
        if (pinb) { if (!pinb.disabled) pinMemory(pinb.dataset.pin); return; }
        const del = e.target.closest('.bl-tk-del');
        if (del) { e.stopPropagation(); deleteEncounter(del.dataset.id); return; }
        const head = e.target.closest('.bl-tk-head');
        if (head) {
            const tk = head.parentElement; tk.classList.toggle('collapsed');
            const en = STATE.encounters.find(x => x.id === tk.dataset.id);
            if (en) { en.open = !tk.classList.contains('collapsed'); saveState(STATE); }
        }
    });
    fullEl.querySelector('.bl-dex-list').addEventListener('click', e => {
        const pinb = e.target.closest('.bl-pin');
        if (pinb) { if (!pinb.disabled) pinMemory(pinb.dataset.pin); return; }
        const del = e.target.closest('.bl-dex-del');
        if (del) { deleteNpc(del.dataset.npc); return; }
        const rn = e.target.closest('.bl-dex-rename');
        if (rn) { renameNpc(rn.dataset.npc); return; }
        const head = e.target.closest('.bl-dex-head');
        if (head) {
            const card = head.parentElement; card.classList.toggle('collapsed');
            const n = STATE.npcs[card.dataset.npc];
            if (n) { n._open = !card.classList.contains('collapsed'); saveState(STATE); }
        }
    });
    fullEl.querySelector('.bl-junk-list').addEventListener('click', e => {
        const pinb = e.target.closest('.bl-pin');
        if (pinb) { if (!pinb.disabled) pinMemory(pinb.dataset.pin); return; }
        const del = e.target.closest('.bl-item-del'); if (!del) return;
        deleteItem(del.dataset.id);
    });
    fullEl.addEventListener('click', e => { if (e.target === fullEl) showMini(); });
}
function afterBlock(e) {
    const inner = e.inner || {};
    const foeLine = inner.foe ? `<div class="bl-af-line">💭 ${escapeHtml(inner.foe)}</div>` : '';
    const youLine = inner.user ? `<div class="bl-af-line bl-af-you">👤 ${escapeHtml(inner.user)}</div>` : '';
    const innerWrap = (foeLine || youLine) ? `<div class="bl-after">${foeLine}${youLine}</div>` : '';
    const rare = e.after
        ? `<div class="bl-af-rare">🗞️ 후일담 — ${escapeHtml(e.after)}</div>`
        : `<div class="bl-af-none">🗞️ ${escapeHtml(e._noNews || '별 소문 없었다.')}</div>`;
    return innerWrap + rare;
}
function chipsHtml(e) {
    return `${e.affDelta ? `<span class="bl-chip">❤️ ${e.affDelta > 0 ? '+' : ''}${e.affDelta}</span>` : ''}${e.rep ? `<span class="bl-chip">⭐ ${e.rep > 0 ? '+' : ''}${e.rep}</span>` : ''}<span class="bl-chip">EXP +${e.exp}</span>${e.drop ? `<span class="bl-chip">${e.dropBait ? '🎣 ' : ''}${escapeHtml(e.drop)}</span>` : ''}`;
}
function dexCard(n) {
    const disp = n.nickname || n.name;
    const logHtml = (n.log && n.log.length)
        ? `<div class="bl-dex-log"><div class="bl-dex-logttl">🕰️ 변화 로그</div>${n.log.map(l => `<div class="bl-dex-logrow"><span class="num">${escapeHtml(l.date)}</span> ${escapeHtml(l.note)}</div>`).join('')}</div>` : '';
    const place = n.lastPlace || n.firstPlace || '';
    const tagHtml = (n.env && n.env.length)
        ? `<div class="bl-dex-tags">${n.env.slice(0, 5).map(t => `<span class="bl-tag">#${escapeHtml(t)}</span>`).join('')}</div>` : '';
    const d = daysSince(n.lastMetTs);
    const tone = relTierObj(n.affinity || 0).tone;
    return `
      <div class="bl-dex${n._open ? '' : ' collapsed'}" data-npc="${escapeHtml(n.name)}">
        <div class="bl-dex-head">
          <span class="bl-dex-emoji">${n.emoji || '👤'}</span>
          <span class="bl-dex-nm">${escapeHtml(disp)}${n.terjut ? ' <span class="bl-terjut">터줏대감</span>' : ''}</span>
          <span class="bl-dex-rel bl-tone-${tone}">${escapeHtml(n.tier)}</span><span class="bl-dex-chev">▾</span>
        </div>
        <div class="bl-dex-body">
          ${place ? `<div class="bl-dex-row"><span>출몰 장소</span><b>${escapeHtml(place)}</b></div>` : ''}
          ${tagHtml}
          <div class="bl-dex-row"><span>첫 조우</span><b class="num">${escapeHtml(n.firstMet || '기록 없음')}</b></div>
          <div class="bl-dex-row"><span>최근 조우</span><b class="num">${escapeHtml(n.lastMet || '-')}${d != null && d >= 1 ? ` <span class="bl-dim">(${d}일 전)</span>` : ''}</b></div>
          <div class="bl-dex-row"><span>조우 횟수</span><b class="num">${n.metCount}번</b></div>
          <div class="bl-dex-row"><span>현재 상태</span><b>${escapeHtml(n.state || '평범함')}</b></div>
          <div class="bl-dex-mem">💭 특별 기억 — ${n.memory ? escapeHtml(n.memory) : '<span class="bl-dim">아직 없음</span>'}</div>
          ${logHtml}
          <div class="bl-dex-btns">${pinBtn('npc:' + n.name)}<button class="bl-dex-rename" data-npc="${escapeHtml(n.name)}">✏️ 이름 짓기</button><button class="bl-dex-del" data-npc="${escapeHtml(n.name)}" title="이 인물 삭제">🗑️ 삭제</button></div>
        </div>
      </div>`;
}
const DEX_GROUPS = [{ key: 'creature', label: '🐾 생물' }, { key: 'person', label: '👤 인물' }, { key: 'object', label: '📦 사물' }];
function tkLabel(e) {
    if (e && e.summary) return e.summary;               // 전체 내용 요약 한 줄 (우선)
    if (e && e.foe) return e.foe;                        // 없으면 대상 이름
    const t = stripTags((e && e.title) || '');
    return t.length > 20 ? t.slice(0, 19) + '…' : (t || '조우');
}
function renderFull() {
    if (!fullEl) return;
    const evo = evoStage(STATE.level), need = STATE.level * 100;
    fullEl.querySelector('.bl-pet-emoji').innerHTML = mascotSVG(72);
    fullEl.querySelector('.bl-pet-name').textContent = evo.name;
    fullEl.querySelector('.bl-pet-lvnum').textContent = String(STATE.level).padStart(2, '0');
    fullEl.querySelector('.bl-st-mood').textContent = pips('😊', STATE.mood);
    fullEl.querySelector('.bl-st-hunger').textContent = pips('🍖', STATE.hunger);
    fullEl.querySelector('.bl-st-hp').textContent = pips('❤️', STATE.hp);
    fullEl.querySelector('.bl-pet-xptext').textContent = `${STATE.xp} / ${need} XP`;
    fullEl.querySelector('.bl-pet-xpbar i').style.width = Math.min(100, (STATE.xp / need) * 100) + '%';
    fullEl.querySelector('.bl-pet-rep').textContent = (STATE.rep > 0 ? '+' : '') + STATE.rep;
    fullEl.querySelector('.bl-pet-money').textContent = fmtMoney(STATE.money);
    fullEl.querySelector('.bl-pet-items').textContent = STATE.items.length;
    fullEl.querySelector('.bl-pet-title').textContent = STATE.title;
    // 알바 탭
    const wm = fullEl.querySelector('.bl-work-money'); if (wm) wm.textContent = fmtMoney(STATE.money);
    const wcd = fullEl.querySelector('.bl-work-cd'); if (wcd) { const r = jobRemaining(); wcd.textContent = r > 0 ? `😮‍💨 ${r}턴 더 쉬어야` : '✅ 알바 가능'; }
    const jc = fullEl.querySelector('.bl-job-cnt'); if (jc) jc.textContent = (STATE.jobs || []).length + '건';
    const jl = fullEl.querySelector('.bl-jobs-list');
    if (jl) jl.innerHTML = (STATE.jobs && STATE.jobs.length)
        ? STATE.jobs.map(j => `<div class="bl-job-row" data-id="${j.id}"><div class="bl-job-rmain"><span class="bl-job-rttl">${escapeHtml(j.job)}</span><span class="bl-job-rpay num">+${fmtMoney(j.pay)}</span></div><div class="bl-job-rrep">${escapeHtml(j.report)}${j.incident ? ' ⚠️ ' + escapeHtml(j.incident) : ''}</div><button class="bl-job-del" data-id="${j.id}" title="삭제">🗑️</button></div>`).join('')
        : '<div class="bl-empty">아직 알바 안 함</div>';
    // 상점 탭
    const sm = fullEl.querySelector('.bl-shop-money'); if (sm) sm.textContent = fmtMoney(STATE.money);
    const sl = fullEl.querySelector('.bl-shop-list'); if (sl) sl.innerHTML = shopListHtml();
    fullEl.querySelector('.bl-pet-pick').innerHTML = MASCOT_KEYS.filter(ownsMascot).map(k => `<button class="bl-pick-btn${EXT.mascot === k ? ' on' : ''}" data-m="${k}" title="${MASCOTS[k].label}">${spriteSVG(k, 26, EXT.spriteMono === true)}</button>`).join('');
    fullEl.querySelector('.bl-sit-v').innerHTML = sitLine();
    fullEl.querySelector('.bl-npc-v').innerHTML = npcLine();
    fullEl.querySelector('.bl-t-inject').checked = STATE.settings.injectDefault;
    fullEl.querySelector('.bl-t-chain').checked = EXT.chainOn !== false;
    fullEl.querySelector('.bl-t-mono').checked = EXT.spriteMono === true;
    fullEl.querySelector('.bl-t-auto').checked = EXT.autoDetect;
    { const ct = EXT.theme || 'pudding'; fullEl.querySelectorAll('.bl-theme-btn').forEach(b => b.classList.toggle('on', b.dataset.theme === ct)); }

    fullEl.querySelector('.bl-enc-cnt').textContent = STATE.encounters.length + '건';
    fullEl.querySelector('.bl-enc-list').innerHTML = STATE.encounters.length
        ? STATE.encounters.map(e => `
            <div class="bl-ticket bl-tk-${e.category || 'npc'}${e.open ? '' : ' collapsed'}" data-id="${e.id}">
              <div class="bl-tk-head"><span class="bl-tk-time num">${e.time || ''}</span><span class="bl-tk-emoji">${e.emoji}</span><span class="bl-tk-title">${escapeHtml(tkLabel(e))}</span>${e.rarity && e.rarity !== 'common' ? `<span class="bl-tk-rar">${RARITY[e.rarity].dot}</span>` : ''}<span class="bl-tk-chev">▾</span></div>
              <div class="bl-tk-body">
                <div class="bl-tk-fulltitle">${escapeHtml(e.title)}</div>
                <div class="bl-tk-desc">${escapeHtml(e.desc)}</div>
                <div class="bl-tk-foot">${chipsHtml(e)}${pinBtn('enc:' + e.id)}<button class="bl-tk-del" data-id="${e.id}" title="삭제">🗑️</button></div>
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
        ? STATE.items.map(it => `<div class="bl-item-row">${itemChip(it)}${pinBtn('item:' + it.id)}<button class="bl-item-del" data-id="${it.id}" title="버리기">🗑️</button></div>`).join('')
        : '<div class="bl-empty">텅 비었다.</div>';
}

// ── 상태 전환 ──
function showMini() { if (bubbleEl) bubbleEl.style.display = 'none'; if (consoleEl) consoleEl.style.display = ''; if (fullEl) fullEl.style.display = 'none'; ensureMounted(); applyConsolePos(); renderConsole(); }
function showFull() { buildFull(); if (bubbleEl) bubbleEl.style.display = 'none'; if (consoleEl) consoleEl.style.display = 'none'; fullEl.style.display = 'flex'; renderFull(); }
function hideHud() { if (consoleEl) consoleEl.style.display = 'none'; if (fullEl) fullEl.style.display = 'none'; }
function renderAll() { renderConsole(); if (fullEl) renderFull(); if (bubbleEl) bubbleEl.innerHTML = mascotSVG(34); }

let bubbleEl = null;
function buildBubble() {
    if (bubbleEl) return;
    bubbleEl = document.createElement('div');
    bubbleEl.id = 'beastlog-bubble';
    bubbleEl.title = '비스트로그 열기';
    Object.assign(bubbleEl.style, { position: 'fixed', zIndex: '2147483000', display: 'none' });
    (document.documentElement || document.body).appendChild(bubbleEl);
    bubbleEl.addEventListener('click', showMini);
}
function positionBubble() {
    if (!bubbleEl) return;
    const sz = bubbleEl.offsetWidth || 52;
    bubbleEl.style.left = Math.max(4, window.innerWidth - sz - 12) + 'px';
    bubbleEl.style.top = Math.max(4, window.innerHeight - sz - 16) + 'px';
    bubbleEl.style.right = 'auto'; bubbleEl.style.bottom = 'auto';
}
function collapseToBubble() {
    buildBubble();
    bubbleEl.innerHTML = mascotSVG(34);
    if (consoleEl) consoleEl.style.display = 'none';
    if (fullEl) fullEl.style.display = 'none';
    bubbleEl.style.display = 'flex';
    positionBubble();
}

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
          <div class="bls-row"><span>🐞 디버그 (콘솔 없이 상태 확인)</span><button id="bls-diag" class="bls-diag-btn">진단 보기</button></div>
          <pre id="bls-diag-out" class="bls-diag-out" style="display:none"></pre>
        </div>
      </div>`;
    container.appendChild(wrap);
    refreshProfileOptions();
    wrap.querySelector('#bls-profile').addEventListener('change', e => { EXT.connectionProfile = e.target.value; saveExt(); });
    const dgb = wrap.querySelector('#bls-diag'); const dgo = wrap.querySelector('#bls-diag-out');
    if (dgb && dgo) dgb.addEventListener('click', () => { dgo.textContent = diagText(); dgo.style.display = 'block'; });
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
    item.addEventListener('click', () => { ensureMounted(); showMini(); const m = document.getElementById('extensionsMenu'); if (m) m.style.display = 'none'; });
}

// ── 루프 ──
async function onAppear() {
    if (_blBusy) return; _blBusy = true;
    showLoading(pick(LOAD_APPEAR));
    try {
        const txt = await llmGenerate(buildAppearPrompt(), 4096);
        const item = normalizeEvent(parseLLMJson(txt), 'npc');
        closePopup(); startEncounter(item);
    } catch (err) { closePopup(); if (!handleLlmError(err)) startEncounter(generateAppearStub()); }
    finally { _blBusy = false; }
}
async function onSituation() {
    if (_blBusy) return; _blBusy = true;
    showLoading(pick(LOAD_SIT));
    try {
        const txt = await llmGenerate(buildSituationPrompt(), 4096);
        const item = normalizeEvent(parseLLMJson(txt), 'situation');
        closePopup(); showChoicePopup(item, { stage: 1, max: 1, history: [], origItem: item });
    } catch (err) { closePopup(); if (!handleLlmError(err)) showChoicePopup(generateSituationStub()); }
    finally { _blBusy = false; }
}
function startEncounter(item) {
    // 조우(npc)는 체인 ON이면 3박자, 아니면 1박자. 상황은 onSituation에서 1박자.
    const max = (item.category === 'npc' && EXT.chainOn !== false) ? (2 + Math.floor(Math.random() * 2)) : 1;
    showChoicePopup(item, { stage: 1, max, history: [], origItem: item });
}
function showChoicePopup(item, chain) {
    closePopup();
    chain = chain || { stage: 1, max: 1, history: [], origItem: item };
    const cat = item.category || 'npc';
    const choices = (item.choices && item.choices.length) ? item.choices : [{ label: '대응한다', kind: 'interact' }, { label: '지나친다', kind: 'flee' }];
    const isBeat = chain.stage > 1; // 전개 단계: 비트 본문을 보여줌
    let relLine = '';
    if (chain.origItem.foe && STATE.npcs[chain.origItem.foe]) relLine = `<div class="bl-pop-rel">${escapeHtml(STATE.npcs[chain.origItem.foe].tier)} · ${STATE.npcs[chain.origItem.foe].metCount}번째 만남</div>`;
    const stageTag = chain.max > 1 ? `<span class="bl-pop-stage">${chain.stage}/${chain.max}</span>` : '';
    const pop = document.createElement('div'); pop.id = 'beastlog-popup';
    pop.innerHTML = `
      <div class="bl-pop-card bl-cat-${cat}">
        <div class="bl-pop-badge">${cat === 'npc' ? '🐯 조우' : '🌦️ 상황'}${stageTag}</div>
        ${isBeat ? '' : `<div class="bl-pop-emoji">${chain.origItem.emoji}</div>`}
        <div class="bl-pop-title">${escapeHtml(item.title)}${(!isBeat && cat === 'npc') ? '!' : ''}</div>
        ${relLine}
        ${item.desc ? `<div class="bl-pop-desc">${escapeHtml(item.desc)}</div>` : ''}
        <div class="bl-pop-choices">${choices.map((c, i) => `<button data-i="${i}">${escapeHtml(c.label)}</button>`).join('')}</div>
        <button class="bl-pop-ignore" data-i="-1">무시</button>
      </div>`;
    mountPopup(pop);
    pop.querySelectorAll('button').forEach(btn => btn.addEventListener('click', async () => {
        const i = parseInt(btn.dataset.i, 10);
        if (i < 0) { closePopup(); return; }
        const c = choices[i];
        const orig = chain.origItem;
        // flee로 빠지면 즉시 결말
        const bail = c.kind === 'flee';
        if (!bail && chain.stage < chain.max) {
            // 전개: 다음 박자 생성
            showLoading(pick(LOAD_RESOLVE));
            try {
                const txt = await llmGenerate(buildChainPrompt(orig, chain.history, c, chain.stage + 1, chain.max), 4096);
                const beat = normalizeBeat(parseLLMJson(txt));
                const nextHist = chain.history.concat([{ title: item.title, choice: c.label }]);
                closePopup();
                const nextItem = { category: orig.category, emoji: orig.emoji, foe: orig.foe, foeType: orig.foeType, title: beat.beat, desc: '', choices: beat.choices };
                showChoicePopup(nextItem, { stage: chain.stage + 1, max: chain.max, history: nextHist, origItem: orig });
            } catch (err) {
                // 전개 실패 → 곧장 결말로 마무리 (소프트락 방지)
                closePopup();
                if (!handleLlmError(err)) await resolveAndApply(orig, c, chain.history.concat([{ title: item.title, choice: c.label }]));
            }
            return;
        }
        // 결말
        await resolveAndApply(orig, c, chain.history.concat([{ title: item.title, choice: c.label }]));
    }));
}
async function resolveAndApply(orig, c, history) {
    showLoading(pick(LOAD_RESOLVE));
    try {
        const txt = await llmGenerate(buildResolvePrompt(orig, c.label, c.kind, history), 4096);
        const outcome = normalizeOutcome(parseLLMJson(txt), c.kind);
        closePopup(); applyOutcome(orig, c.label, outcome, c.kind);
    } catch (err) { closePopup(); if (!handleLlmError(err)) applyOutcome(orig, c.label, resolveByKind(orig, c.kind), c.kind); }
}
function showResultPopup(entry) {
    closePopup();
    entry.revealed = true;
    const en = STATE.encounters.find(x => x.id === entry.id); if (en) { en.revealed = true; saveState(STATE); }
    const pop = document.createElement('div'); pop.id = 'beastlog-popup';
    pop.innerHTML = `
      <div class="bl-pop-card bl-cat-${entry.category}">
        <div class="bl-pop-badge">🎭 결과</div>
        <div class="bl-pop-title">${escapeHtml(entry.result)}</div>
        <div class="bl-pop-chips">${chipsHtml(entry)}</div>
        ${afterBlock(entry)}
        <button class="bl-pop-ignore bl-result-ok">📒 일지에 저장됨 · 확인</button>
      </div>`;
    mountPopup(pop);
    pop.querySelector('.bl-result-ok').addEventListener('click', closePopup);
}
function closePopup() { document.querySelectorAll('#beastlog-popup').forEach(p => p.remove()); }
// 팝업을 CSS 없이도 최상위 전체화면으로 고정 + <html>에 붙여 body transform/서랍에 안 묻히게
function mountPopup(pop, dismissable) {
    Object.assign(pop.style, {
        position: 'fixed', top: '0', left: '0', right: 'auto', bottom: 'auto',
        width: '100vw', height: '100vh',
        zIndex: '2147483647', display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', overflowY: 'auto', padding: '16px',
        background: 'rgba(60,48,28,.32)', boxSizing: 'border-box',
    });
    if (dismissable !== false) pop.addEventListener('click', e => { if (e.target === pop) closePopup(); });
    (document.documentElement || document.body).appendChild(pop);
}
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
    mountPopup(pop);
    const input = pop.querySelector('.bl-rename-input');
    setTimeout(() => { try { input.focus(); } catch (e) { /* noop */ } }, 60);
    const commit = () => { n.nickname = stripTags(input.value).slice(0, 20); saveState(STATE); closePopup(); renderAll(); };
    pop.querySelector('.bl-rename-ok').addEventListener('click', commit);
    pop.querySelector('.bl-rename-cancel').addEventListener('click', closePopup);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
}
function showConfirm(title, msg, onYes) {
    closePopup();
    const pop = document.createElement('div'); pop.id = 'beastlog-popup';
    pop.innerHTML = `<div class="bl-pop-card bl-alarm">
        <div class="bl-alarm-title">${escapeHtml(title)}</div>
        <div class="bl-alarm-msg">${escapeHtml(msg)}</div>
        <div class="bl-rename-btns"><button class="bl-rename-cancel">취소</button><button class="bl-confirm-yes">확인</button></div>
      </div>`;
    mountPopup(pop);
    pop.querySelector('.bl-rename-cancel').addEventListener('click', closePopup);
    pop.querySelector('.bl-confirm-yes').addEventListener('click', () => { closePopup(); try { onYes(); } catch (e) { /* noop */ } });
}
function showLoading(msg) {
    closePopup();
    const pop = document.createElement('div'); pop.id = 'beastlog-popup';
    pop.innerHTML = `<div class="bl-pop-card bl-loading"><div class="bl-load-emoji">${mascotSVG(48)}</div><div class="bl-load-msg">${escapeHtml(msg)}</div><div class="bl-load-dots">. . .</div></div>`;
    mountPopup(pop, false);
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
    mountPopup(pop);
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

// ── 진단 ──
function diag() {
    const el = consoleEl;
    const cs = el ? getComputedStyle(el) : null;
    const r = el ? el.getBoundingClientRect() : null;
    let fontOk = false;
    try { fontOk = !!(document.fonts && document.fonts.check("12px 'Galmuri11'")); } catch (e) { /* noop */ }
    const d = {
        v: BEASTLOG_VERSION,
        inDom: !!(el && (document.documentElement && document.documentElement.contains(el))),
        pos: cs && cs.position, disp: cs && cs.display, vis: cs && cs.visibility, z: cs && cs.zIndex,
        rect: r ? { t: Math.round(r.top), l: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) } : null,
        vp: { w: window.innerWidth, h: window.innerHeight },
        cssLoaded: cs ? (cs.borderTopWidth !== '0px' && cs.borderTopWidth !== '') : false,
        fontLoaded: fontOk, ctx: !!getCtx(), profiles: getProfiles().length, lastError: LAST_ERROR || '(없음)',
    };
    try { console.log('[비스트로그] DIAG ' + JSON.stringify(d)); } catch (e) { /* noop */ }
    return d;
}
function diagText() {
    const d = diag();
    return [
        'Beast Log v' + d.v,
        '─────────────',
        'inDom      : ' + d.inDom,
        'position   : ' + d.pos,
        'display    : ' + d.disp,
        'zIndex     : ' + d.z,
        'rect       : ' + (d.rect ? `${d.rect.w}x${d.rect.h} @(${d.rect.l},${d.rect.t})` : 'null'),
        'viewport   : ' + d.vp.w + 'x' + d.vp.h,
        'cssLoaded  : ' + d.cssLoaded,
        'font(갈무리): ' + d.fontLoaded,
        'ctx        : ' + (d.ctx ? 'ok' : 'null'),
        'profiles   : ' + d.profiles,
        '─────────────',
        'lastError  :',
        d.lastError,
    ].join('\n');
}
function showDiagPopup() {
    closePopup();
    const pop = document.createElement('div'); pop.id = 'beastlog-popup';
    pop.innerHTML = `<div class="bl-pop-card bl-cat-npc">
        <div class="bl-pop-badge">🐞 진단</div>
        <div class="bl-diag-box">${escapeHtml(diagText())}</div>
        <button class="bl-pop-ignore bl-alarm-ok">닫기</button>
      </div>`;
    mountPopup(pop);
    pop.querySelector('.bl-alarm-ok').addEventListener('click', closePopup);
}

function registerEvents() {
    const ctx = getCtx();
    if (!ctx || !ctx.eventSource) return;
    const types = ctx.eventTypes || ctx.event_types || {};
    if (types.CHAT_CHANGED) ctx.eventSource.on(types.CHAT_CHANGED, () => { STATE = loadState(); ensureMounted(); renderAll(); refreshMemory(); });
    // 자동 출현: 상대 메시지가 올 때마다, 텀(쿨다운) 간격을 지키며 자동으로 조우 1건 생성
    const onMsg = () => {
        if (!EXT.autoDetect || _blBusy) return;
        if (!canInject()) return;
        markInject();
        setTimeout(() => { if (EXT.autoDetect && !_blBusy) onAppear(); }, 700);
    };
    if (types.MESSAGE_RECEIVED) ctx.eventSource.on(types.MESSAGE_RECEIVED, onMsg);
}

function init() {
    try {
        EXT = loadExt(); STATE = loadState();
        applyTheme();
        buildConsole(); renderConsole(); applyConsolePos();
        buildSettingsWithRetry(10); buildWandMenuWithRetry(10);
        registerEvents();
        startBlink();
        setTimeout(refreshMemory, 1200);
        setTimeout(() => { ensureMounted(); applyConsolePos(); }, 300);
        setTimeout(() => { ensureMounted(); applyConsolePos(); }, 1500);
        setTimeout(ensureMounted, 4000);
        setTimeout(diag, 800);
        window.addEventListener('resize', () => { ensureMounted(); applyConsolePos(); positionBubble(); });
        window.addEventListener('orientationchange', () => setTimeout(() => { applyConsolePos(); positionBubble(); }, 200));
        blDebug('비스트로그', BEASTLOG_VERSION, '로드됨');
    } catch (e) { LAST_ERROR = (e && (e.stack || e.message)) || String(e); console.error('[비스트로그] init 실패:', e); }
}
if (typeof window !== 'undefined') {
    window.beastlog = {
        show: () => { try { ensureMounted(); showMini(); } catch (e) { console.error(e); } },
        full: () => { try { showFull(); } catch (e) { console.error(e); } },
        remount: () => { try { ensureMounted(); } catch (e) { console.error(e); } },
        reset: () => { EXT.consolePos = null; saveExt(); applyConsolePos(); },
        diag: () => diag(),
    };
}
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
}
