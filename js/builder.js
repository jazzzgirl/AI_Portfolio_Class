/* =========================================================
   06 프롬프트 작성
   STEP 1 목적(+필수 항목, 목적 문장 P) · STEP 2 필수 5가지
   STEP 3 목적에 맞는 내용 · STEP 4 더하면 좋은 내용 → R
   STEP 5 O·M·P·T → 완성된 프롬프트
   다른 스크립트에서 쓸 수 있게 window.PB 로 내보냅니다.
   ========================================================= */
window.PB = (function () {
  "use strict";
  const { $, $$, esc, toast, copyText, store } = UI;
  const STORE_KEY = "portfolio-prompt-v2";

  /* ---------- 상태 ---------- */
  const emptyStory = () => ({ v: {}, purpose: "", exps: [{}, {}], pText: "", pEdited: false });
  const defaultDesign = () => Object.fromEntries(DESIGN_FIELDS.map(f => [f.key, f.def]));

  let story = emptyStory();
  let design = defaultDesign();
  const saved = store.get(STORE_KEY);
  if (saved && saved.story && saved.design) {
    story = Object.assign(emptyStory(), saved.story);
    design = Object.assign(defaultDesign(), saved.design);
  }
  if (!Array.isArray(story.exps) || story.exps.length < 2) story.exps = [{}, {}];
  const save = () => store.set(STORE_KEY, { story, design });

  /* ---------- 검사 ---------- */
  const val = (s, k) => (s.v[k] || "").trim();
  const expOK = e => (e.title || "").trim() &&
    EXP_FIELDS.filter(f => (e[f.e] || "").trim()).length >= 3;

  const NEED = [
    { id: "intro",    name: "이름·소개",  ok: s => ["name", "major", "tagline"].every(k => val(s, k)) },
    { id: "about",    name: "자기소개",   ok: s => !!val(s, "about") },
    { id: "strength", name: "강점 3",     ok: s => ["s1", "s2", "s3"].every(k => val(s, k)) },
    { id: "exp",      name: "경험 2+",    ok: s => s.exps.filter(expOK).length >= 2 },
    { id: "contact",  name: "이메일",     ok: s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val(s, "email")) }
  ];
  const purposeOK = s => {
    const p = PURPOSES[s.purpose];
    return !!p && p.fields.filter(f => f.req).every(f => val(s, f.k));
  };
  const hasPhone = s => /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/.test(
    JSON.stringify(s.v) + JSON.stringify(s.exps));

  /* ---------- P·R 만들기 (예시 탭에서도 사용) ---------- */
  function autoP(s) {
    const p = PURPOSES[s.purpose];
    if (!p) return "";
    const v = Object.fromEntries(Object.entries(s.v).map(([k, x]) => [k, String(x).trim()]));
    const who = v.major ? `${v.major}인 ` : "";
    return `${who}내가 ${p.lead(v)}${p.audience}에게 ${p.goal} 보여줄 포트폴리오 웹페이지를 만들고 싶어.`;
  }
  const pOf = s => (s.pEdited ? (s.pText || "").trim() : autoP(s));

  function rOf(s) {
    const L = [];
    const line = (label, x) => { if (x) L.push(`- ${label}: ${x}`); };
    const list = (label, x) => {               // 여러 줄로 쓴 칸은 한 줄씩 목록으로
      const rows = x.split("\n").map(t => t.trim()).filter(Boolean);
      if (rows.length > 1) L.push(`- ${label}`, ...rows.map(t => `  · ${t}`));
      else line(label, rows[0]);
    };

    line("이름", val(s, "name"));
    line("학과·학년", val(s, "major"));
    line("한 줄 소개", val(s, "tagline"));
    line("자기소개", val(s, "about"));

    const st = [1, 2, 3].filter(n => val(s, "s" + n))
      .map(n => `  · ${val(s, "s" + n)}${val(s, `s${n}why`) ? ": " + val(s, `s${n}why`) : ""}`);
    if (st.length) L.push("- 강점·역량", ...st);

    const ex = s.exps.filter(e => (e.title || "").trim())
      .map(e => "  · " + EXP_FIELDS.map(f => (e[f.e] || "").trim()).filter(Boolean).join(" / "));
    if (ex.length) L.push("- 경험·활동 (제목 / 기간 / 역할 / 한 일 / 결과)", ...ex);

    const p = PURPOSES[s.purpose];
    if (p) p.fields.forEach(f => list(f.label, val(s, f.k)));

    EXTRAS.forEach(f => {
      const x = val(s, f.k);
      if (f.k === "ex_photo") { if (x) L.push(`- 프로필 사진: ${x} 파일을 사용`); }
      else line(f.label, x);
    });

    line("연락처", [val(s, "email") && "이메일 " + val(s, "email"), val(s, "sns")].filter(Boolean).join(", "));
    return L.join("\n");
  }

  function sections(s, d) {                   // [라벨, 내용, 색] 목록
    const out = [];
    const P = pOf(s), R = rOf(s);
    if (P) out.push(["[P - 목적]", P, "p1"]);
    if (R) out.push(["[R - 실제 내용]", R, "r"]);
    if (d) DESIGN_FIELDS.forEach(f => { const x = (d[f.key] || "").trim(); if (x) out.push([f.label, x, f.cls.slice(2)]); });
    return out;
  }
  const toText = secs => secs.map(([l, x]) => `${l}\n${x}`).join("\n\n");

  /* ---------- 화면 그리기 ---------- */
  const form = $("#bForm");
  if (!form) return null;

  function fieldHTML(f) {
    const input = f.ta
      ? `<textarea data-k="${f.k}" rows="${f.rows || 2}" placeholder="${esc(f.ph)}"></textarea>`
      : `<input type="text" data-k="${f.k}" placeholder="${esc(f.ph)}" maxlength="150">`;
    const fmt = f.fmt
      ? `<p class="fmt"><span class="fmt-tag">쓰는 방법</span>${f.fmt.map(x => `<b>${esc(x)}</b>`).join("<i>/</i>")}
         <span class="fmt-note">위 순서대로 항목 사이를 <b class="slash">/</b>로 구분해 쓰고, 여러 개는 <b>줄을 바꿔</b> 쓰세요.</span></p>`
      : "";
    return `<div class="item sub">
      <div class="item-head"><label>${esc(f.label)}</label>
        ${f.req ? '<span class="req">필수</span>' : `<span class="opt">${esc(f.note || "선택")}</span>`}</div>
      ${fmt}${input}</div>`;
  }

  $("#purposeGrid").innerHTML = Object.entries(PURPOSES).map(([id, p]) =>
    `<button type="button" class="pp" data-p="${id}"><span class="ico">${p.ico}</span><b>${esc(p.name)}</b><small>${esc(p.desc)}</small></button>`).join("");
  $("#extraFields").innerHTML = EXTRAS.map(fieldHTML).join("");
  $("#designFields").innerHTML = DESIGN_FIELDS.map(f => `
    <div class="dfield">
      <div class="item-head">
        <span class="num ${f.cls}">${f.letter}</span>
        <label for="d-${f.key}">${esc(f.name)}</label>
        ${f.def ? `<button type="button" class="field-reset" data-reset="${f.key}">기본 문장</button>` : ""}
      </div>
      <p class="help">${esc(f.help)}</p>
      <div class="fields"><textarea id="d-${f.key}" data-d="${f.key}" rows="${f.key === "o" ? 5 : 3}" placeholder="${esc(f.ph)}"></textarea></div>
    </div>`).join("");

  function renderPurpose() {
    $$(".pp").forEach(b => b.classList.toggle("on", b.dataset.p === story.purpose));
    const p = PURPOSES[story.purpose];
    $("#purposeFields").innerHTML = p ? p.fields.filter(f => f.req).map(fieldHTML).join("") : "";
    $("#purposeMore").innerHTML = p
      ? p.fields.filter(f => !f.req).map(fieldHTML).join("")
      : `<p class="purpose-empty">STEP 1에서 목적을 고르면 맞춤 항목이 나타나요 👆</p>`;
    $("#moreName").textContent = p ? `· ${p.ico} ${p.name}` : "";
    fill($("#purposeFields"));
    fill($("#purposeMore"));
  }

  function renderExps() {
    $("#expList").innerHTML = story.exps.map((e, i) => {
      const inp = f => {
        const ex = EXP_PH[i] ? `  예) ${EXP_PH[i][f.e]}` : "";
        return `<input type="text" data-e="${f.e}" maxlength="${f.max}" placeholder="${esc(f.label + ex)}" value="${esc(e[f.e] || "")}">`;
      };
      const [title, period, ...more] = EXP_FIELDS;
      return `<div class="exp" data-i="${i}">
        <div class="exp-top"><span class="exp-no">No.${String(i + 1).padStart(2, "0")}</span>
          ${story.exps.length > 2 ? `<button type="button" class="x-btn" data-del="${i}">삭제</button>` : ""}</div>
        <div class="row row-2">${inp(title)}${inp(period)}</div>
        ${more.map(inp).join("")}
      </div>`;
    }).join("");
    $("#addExp").hidden = story.exps.length >= 4;
  }

  function fill(root = form) {
    $$("[data-k]", root).forEach(el => { el.value = story.v[el.dataset.k] || ""; });
    $$("[data-d]", root).forEach(el => { el.value = design[el.dataset.d] || ""; autoGrow(el); });
  }

  // 내용에 맞춰 높이 늘리기 (테두리 두께까지 더해야 스크롤바가 생기지 않음)
  function autoGrow(t) {
    if (t.dataset.fit) return;               // 기본 문장 칸은 높이 고정
    t.style.height = "auto";
    const border = t.offsetHeight - t.clientHeight;
    t.style.height = Math.min(t.scrollHeight + border, 480) + "px";
  }

  // 기본 문장 칸(M·Persona·T): 기본 문장이 딱 보이는 높이로 고정
  // → 기본 문장은 스크롤 없이 보이고, 사용자가 더 쓰면 그때 스크롤이 생김
  function fitDefaults() {
    DESIGN_FIELDS.filter(f => f.def).forEach(f => {
      const t = $("#d-" + f.key);
      const cur = t.value;
      t.dataset.fit = "";
      t.rows = 1;                              // 칸 높이는 글 양으로만 정해지게
      t.value = f.def;
      t.style.height = "auto";
      const border = t.offsetHeight - t.clientHeight;
      t.style.height = (t.scrollHeight + border) + "px";
      t.value = cur;
      t.dataset.fit = "1";
    });
  }

  /* ---------- 갱신 ---------- */
  const pBox = $("#f-pText");
  function update() {
    let n = 0;
    NEED.forEach(c => {
      const ok = c.ok(story);
      if (ok) n++;
      $(`.item[data-need="${c.id}"]`).classList.toggle("done", ok);
    });
    $("#needBar").style.width = (n / NEED.length * 100) + "%";
    $("#needText").textContent = `${n} / ${NEED.length}`;
    $('.item[data-need="contact"]').classList.toggle("pii", hasPhone(story));

    // 목적 문장: 직접 고치기 전까지는 자동으로 따라감
    if (!story.pEdited && document.activeElement !== pBox) pBox.value = autoP(story);
    autoGrow(pBox);
    $("#pReset").hidden = !story.pEdited;

    const p = PURPOSES[story.purpose];
    $("#bCheck").innerHTML = `<li class="${purposeOK(story) ? "ok" : ""}">목적${p ? " · " + esc(p.name) : ""}</li>` +
      NEED.map(c => `<li class="${c.ok(story) ? "ok" : ""}">${c.name}</li>`).join("");

    const secs = sections(story, design);
    const pv = $("#bPreview");
    pv.classList.toggle("empty", !secs.length);
    pv.innerHTML = secs.length
      ? secs.map(([l, x, c]) => `<span class="lbl lbl-${c}">${esc(l)}</span>\n${esc(x)}`).join("\n\n")
      : "왼쪽 칸을 채우면 여기에 프롬프트가 만들어져요.";
    $("#bCount").textContent = toText(secs).length.toLocaleString() + "자";
    save();
    return n;
  }

  /* ---------- 입력 ---------- */
  form.addEventListener("input", e => {
    const t = e.target;
    if (t === pBox) { story.pText = t.value; story.pEdited = true; }
    else if (t.dataset.k) story.v[t.dataset.k] = t.value;
    else if (t.dataset.e) story.exps[+t.closest(".exp").dataset.i][t.dataset.e] = t.value;
    else if (t.dataset.d) { design[t.dataset.d] = t.value; autoGrow(t); }
    update();
  });

  form.addEventListener("click", e => {
    const pp = e.target.closest(".pp");
    if (pp) { story.purpose = pp.dataset.p; renderPurpose(); update(); return; }
    const del = e.target.closest("[data-del]");
    if (del) { story.exps.splice(+del.dataset.del, 1); renderExps(); update(); return; }
    const rs = e.target.closest("[data-reset]");
    if (rs) {
      const f = DESIGN_FIELDS.find(x => x.key === rs.dataset.reset);
      design[f.key] = f.def; fill($("#designFields")); update(); toast("기본 문장을 넣었어요");
    }
  });

  $("#addExp").addEventListener("click", () => {
    if (story.exps.length >= 4) return;
    story.exps.push({});
    renderExps(); update();
    $$("#expList .exp").pop().querySelector("input").focus();
  });

  $("#pReset").addEventListener("click", () => {
    story.pEdited = false; story.pText = "";
    pBox.value = autoP(story); update();
    toast("자동 문장으로 되돌렸어요");
  });

  /* ---------- 버튼 ---------- */
  $("#bCopy").addEventListener("click", () => {
    const n = update();
    if (!purposeOK(story) || n < NEED.length) {
      form.classList.add("missing");
      const miss = purposeOK(story) ? NEED.find(c => !c.ok(story)) : null;
      const target = miss ? $(`.item[data-need="${miss.id}"]`) : $(".b-purpose");
      target.scrollIntoView({ behavior: UI.reduceMotion ? "auto" : "smooth", block: "center" });
      toast(miss ? `'${miss.name}'을(를) 먼저 채워 주세요 ✏️` : "STEP 1에서 목적을 고르고 필수 항목을 채워 주세요 ✏️");
      return;
    }
    form.classList.remove("missing");
    copyText(toText(sections(story, design)),
      hasPhone(story) ? "복사했어요! 단, 전화번호는 빼는 게 안전해요 ⚠️" : undefined);
  });

  $("#bSample").addEventListener("click", () => {
    const has = Object.values(story.v).some(x => String(x).trim());
    if (has && !confirm("작성 중인 내용 대신 예시를 불러올까요?")) return;
    loadStory(STORIES[0], true);
    toast("예시를 불러왔어요! 내 이야기로 바꿔 보세요 ✏️");
  });

  $("#bClear").addEventListener("click", () => {
    if (!confirm("작성한 내용을 지우고 처음 상태로 되돌릴까요?\n(M·P·T 칸에는 기본 문장이 다시 들어갑니다)")) return;
    story = emptyStory(); design = defaultDesign();
    form.classList.remove("missing");
    renderAll(); toast("처음 상태로 되돌렸어요");
  });

  /* ---------- 내보내는 기능 ---------- */
  function loadStory(s, withDesign = false) {
    story = Object.assign(emptyStory(), JSON.parse(JSON.stringify({ v: s.v, purpose: s.purpose, exps: s.exps })));
    if (withDesign) design = Object.assign(defaultDesign(), SAMPLE_DESIGN);
    form.classList.remove("missing");
    renderAll();
  }

  // O 칸에 한 줄 담기. rivals(같이 고를 수 없는 줄)가 있으면 빼고 담음
  function addO(line, rivals = []) {
    let rows = (design.o || "").split("\n").map(t => t.trimEnd()).filter(t => t.trim());
    if (rows.includes(line)) return false;
    const before = rows.length;
    rows = rows.filter(r => !rivals.includes(r));
    rows.push(line);
    design.o = rows.join("\n");
    fill($("#designFields")); update();
    return rows.length - 1 < before ? "replaced" : true;
  }

  function renderAll() { fill(); renderExps(); renderPurpose(); update(); }
  fitDefaults();
  renderAll();

  const refit = () => { fitDefaults(); $$("textarea", form).forEach(autoGrow); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
  let resizeTimer;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(refit, 200); });

  return {
    storyText: s => ({ P: autoP(s), R: rOf(s) }),
    fullText: (s, d) => toText(sections(s, Object.assign(defaultDesign(), d))),
    loadStory,
    addO
  };
})();
