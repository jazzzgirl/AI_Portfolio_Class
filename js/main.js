/* =========================================================
   AI활용 포트폴리오 웹페이지 만들기 - 동작
   ========================================================= */
(function () {
  "use strict";

  const { $, $$, esc, toast, copyText, reduceMotion } = UI;

  /* =======================================================
     1. 상단 메뉴
     ======================================================= */
  const nav = $("#nav");
  const navToggle = $("#navToggle");
  const navMenu = $("#navMenu");
  navToggle.addEventListener("click", () => {
    const open = navMenu.classList.toggle("open");
    navToggle.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", open);
  });
  $$("a", navMenu).forEach(a => a.addEventListener("click", () => {
    navMenu.classList.remove("open");
    navToggle.classList.remove("open");
    navToggle.setAttribute("aria-expanded", false);
  }));

  const toTop = $("#toTop");
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 20);
    toTop.classList.toggle("show", window.scrollY > 600);
  }, { passive: true });

  // 현재 보고 있는 메뉴 표시
  const links = $$(".nav-menu a");
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        links.forEach(l => l.classList.toggle("active", l.getAttribute("href") === "#" + en.target.id));
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("section.section").forEach(s => spy.observe(s));

  /* =======================================================
     2. HERO - PROMPT 카드 (마우스 반응 + 끌기)
     ======================================================= */
  const hero = $("#hero");
  if (window.matchMedia("(hover: none)").matches) {
    $(".hero-hint").textContent = "카드를 톡 눌러 보세요!";
  }
  const slots = $$(".slot");
  const baseRot = [-9, 6, -4, 8, -7, 5];
  const depth = [18, -12, 22, -16, 14, -20];

  const cards = slots.map((slot, i) => {
    const el = $(".pcard", slot);
    const st = { el, rot: baseRot[i], tx: 0, ty: 0, rx: 0, ry: 0, s: 1, lift: 0, drag: false };
    render(st);
    return st;
  });

  function render(st) {
    st.el.style.transform =
      `translate(${st.tx}px, ${st.ty + st.lift}px) rotate(${st.rot}deg) ` +
      `rotateX(${st.rx}deg) rotateY(${st.ry}deg) scale(${st.s})`;
  }

  // 화면 전체 마우스 위치에 따라 카드들이 서로 다르게 움직임 (깊이감)
  if (!reduceMotion) {
    hero.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      const r = hero.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width - 0.5;
      const my = (e.clientY - r.top) / r.height - 0.5;
      slots.forEach((slot, i) => {
        slot.style.transform = `translate(${mx * depth[i]}px, ${my * depth[i]}px)`;
      });
    });
    hero.addEventListener("pointerleave", () => slots.forEach(s => (s.style.transform = "")));
  }

  cards.forEach((st, i) => {
    const el = st.el;
    let startX = 0, startY = 0, moved = false;

    el.addEventListener("pointerenter", e => {
      if (e.pointerType !== "mouse") return;
      el.classList.add("hover");
      st.s = 1.14;
      st.lift = -14;
      st.rot = -baseRot[i] * 0.6; // 반대 방향으로 살짝 기울며 튀어오름
      render(st);
    });

    el.addEventListener("pointermove", e => {
      if (st.drag) {
        const dx = e.clientX - startX, dy = e.clientY - startY;
        if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
        st.tx = dx; st.ty = dy;
        st.rot = dx * 0.08; // 끄는 방향으로 기울기
        render(st);
        return;
      }
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      st.ry = px * 26;
      st.rx = -py * 26;
      el.style.setProperty("--gx", `${(px + 0.5) * 100}%`);
      el.style.setProperty("--gy", `${(py + 0.5) * 100}%`);
      render(st);
    });

    el.addEventListener("pointerleave", () => {
      if (st.drag) return;
      reset(st, i);
    });

    el.addEventListener("pointerdown", e => {
      if (e.pointerType !== "mouse") return;
      st.drag = true; moved = false;
      startX = e.clientX; startY = e.clientY;
      el.setPointerCapture(e.pointerId);
      el.classList.add("dragging");
      st.s = 1.2; st.rx = 0; st.ry = 0;
      render(st);
    });

    const end = () => {
      if (!st.drag) return;
      st.drag = false;
      el.classList.remove("dragging");
      st.tx = 0; st.ty = 0;
      reset(st, i, el.matches(":hover"));
      if (!moved) pop(el);
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);

    // 터치(휴대폰)에서는 톡 누르면 통통 튀기
    el.addEventListener("click", e => {
      if (e.pointerType && e.pointerType !== "mouse") pop(el);
    });
  });

  function reset(st, i, stillHover = false) {
    st.rx = 0; st.ry = 0;
    if (stillHover) { st.s = 1.14; st.lift = -14; st.rot = -baseRot[i] * 0.6; }
    else { st.s = 1; st.lift = 0; st.rot = baseRot[i]; st.el.classList.remove("hover"); }
    render(st);
  }
  function pop(el) {
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  /* =======================================================
     3. 작성 요령 (아코디언)
     ======================================================= */
  $("#tipsAcc").innerHTML = TIPS.map((t, i) => `
    <div class="acc-item ${i === 0 ? "open" : ""}">
      <button class="acc-head" aria-expanded="${i === 0}">
        <span class="acc-letter ${t.cls}">${t.letter}</span>
        <span class="acc-title">${esc(t.title)}</span>
        <span class="acc-arrow">＋</span>
      </button>
      <div class="acc-body"><div class="acc-inner">
        <ul class="acc-points">${t.points.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
        <div class="compare">
          <div class="cmp bad"><span class="cmp-tag">😥 아쉬운 예</span><p>${esc(t.bad)}</p></div>
          <div class="cmp good"><span class="cmp-tag">😊 좋은 예</span><p>${esc(t.good)}</p></div>
        </div>
      </div></div>
    </div>`).join("");

  $$(".acc-head").forEach(btn => btn.addEventListener("click", () => {
    const item = btn.parentElement;
    const open = item.classList.toggle("open");
    btn.setAttribute("aria-expanded", open);
  }));

  /* =======================================================
     4. 프롬프트 예시
     ======================================================= */
  // 학생 예시 탭 (STORIES)
  const rTabs = $("#rTabs"), rPanel = $("#rPanel");
  rTabs.innerHTML = STORIES.map((r, i) =>
    `<button class="tab ${i === 0 ? "on" : ""}" role="tab" aria-selected="${i === 0}" data-i="${i}">${esc(r.tab)}</button>`).join("");

  function showStory(i) {
    const st = STORIES[i];
    const { P, R } = PB.storyText(st);
    const p = PURPOSES[st.purpose];
    rPanel.innerHTML = `
      <div class="r-purpose"><span class="chip-el c-p1">P</span>
        <p><span class="r-goal">${p.ico} 목적: ${esc(p.name)}</span>${esc(P)}</p></div>
      <div class="r-box">
        <div class="r-box-btns">
          <button class="btn btn-sm btn-copy" data-act="copy">복사하기</button>
          <button class="btn btn-sm btn-put" data-act="put">작성 칸에 담기</button>
        </div>
        <pre>${esc(R)}</pre>
      </div>`;
    $('[data-act="copy"]', rPanel).onclick = () => copyText(`[P - 목적]\n${P}\n\n[R - 실제 내용]\n${R}`, "P·R 예시를 복사했어요!");
    $('[data-act="put"]', rPanel).onclick = () => {
      PB.loadStory(st);
      toast("'프롬프트 작성' 칸에 담았어요! 내 이야기로 고쳐 쓰세요 ✏️");
    };
  }
  rTabs.addEventListener("click", e => {
    const b = e.target.closest(".tab");
    if (!b) return;
    $$(".tab", rTabs).forEach(t => { t.classList.toggle("on", t === b); t.setAttribute("aria-selected", t === b); });
    showStory(+b.dataset.i);
  });
  showStory(0);

  // O 예시 (누르면 '프롬프트 작성'의 O 칸에 추가)
  $("#oGroups").innerHTML = O_GROUPS.map((g, gi) => `
    <div class="o-group${g.one ? " o-one" : ""}" data-g="${gi}">
      <h4>${esc(g.title)}${g.sub ? ` <small>${esc(g.sub)}</small>` : ""}</h4>
      ${g.note ? `<p class="o-note">${esc(g.note)}</p>` : ""}
      <div class="o-chips">
        ${g.items.map(it => {
          const t = typeof it === "string" ? it : it.t;
          const sw = it.c ? `<span class="sw">${it.c.map(c => `<i style="background:${c}"></i>`).join("")}</span>` : "";
          const wow = it.wow ? `<span class="wow">WOW</span>` : "";
          return `<button class="o-chip${it.wow ? " is-wow" : ""}" data-t="${esc(t)}">${wow}${sw}${esc(t)}<span class="plus">＋</span></button>`;
        }).join("")}
      </div>
    </div>`).join("");
  $("#oGroups").addEventListener("click", e => {
    const b = e.target.closest(".o-chip");
    if (!b) return;
    const g = O_GROUPS[+b.closest(".o-group").dataset.g];
    const line = "- " + b.dataset.t;
    // 색 조합처럼 하나만 고르는 묶음: 같은 묶음끼리 담긴 줄을 빼고 새로 담기
    const rivals = g.one
      ? O_GROUPS.filter(x => x.one === g.one).flatMap(x => x.items.map(it => "- " + (it.t || it)))
      : [];
    const res = PB.addO(line, rivals);
    if (!res) { toast("이미 담긴 표현이에요"); return; }
    b.classList.add("added");
    setTimeout(() => b.classList.remove("added"), 900);
    toast(res === "replaced" ? "색 조합을 바꿔 담았어요 🎨" : "O 칸에 담았어요 🎨");
  });

  // 완성된 프롬프트 예시 (첫 번째 학생 + 예시 디자인)
  $("#fullExample").textContent = PB.fullText(STORIES[0], SAMPLE_DESIGN);
  $$("[data-copy]").forEach(b => b.addEventListener("click", () => {
    copyText($("#" + b.dataset.copy).textContent, "완성 예시를 복사했어요!");
  }));

  // 다듬기 예시 (누르면 복사)
  $("#tuneGrid").innerHTML = TUNE_GROUPS.map(g => `
    <div class="tune-card">
      <h4>${esc(g.title)}</h4>
      <ul>${g.items.map(t => `<li><button class="tune-item" data-t="${esc(t)}">${esc(t)}</button></li>`).join("")}</ul>
    </div>`).join("");
  $("#tuneGrid").addEventListener("click", e => {
    const b = e.target.closest(".tune-item");
    if (b) copyText(b.dataset.t, "수정 요청 문장을 복사했어요!");
  });

  /* =======================================================
     5. 스크롤하면 나타나기
     ======================================================= */
  const revealEls = $$(".el-card, .merit, .tier, .flow li, .ex-block, .acc-item, .caution, .why, .gtip, .b-block, .b-out, .mnemonic, .url-demo, .dstep, .dx, .g-form");
  revealEls.forEach(el => el.classList.add("reveal"));
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(el => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  }
})();
