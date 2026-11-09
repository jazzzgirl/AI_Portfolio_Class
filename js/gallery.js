/* =========================================================
   08 자랑하기 - 학생 웹페이지 주소 갤러리
   - config.js 의 GALLERY_URL 이 있으면 구글 시트(공유)에 저장
   - 없으면 이 브라우저에만 저장(연습 모드)
   ========================================================= */
(function () {
  "use strict";

  const { $, esc, toast, store } = UI;
  const API = String(window.GALLERY_URL || "").trim();
  const SHARED = API.startsWith("https://");
  const LOCAL_KEY = "portfolio-gallery-local-v1";
  const NAME_KEY = "portfolio-gallery-name";
  const COLORS = ["p1", "r", "o", "m", "p2", "t"];

  const form = $("#gForm"), nameIn = $("#gName"), titleIn = $("#gTitle"), urlIn = $("#gUrl");
  const saveBtn = $("#gSave"), msg = $("#gMsg"), list = $("#gList"), count = $("#gCount");
  const modeEl = $("#gMode"), reloadBtn = $("#gReload");

  let items = [];
  let loading = false;


  function setMsg(text, type = "") {
    msg.textContent = text;
    msg.className = "g-msg " + type;
  }

  /* ---------- 주소 검사 ---------- */
  function normalizeUrl(raw) {
    let v = raw.trim();
    if (!v) return null;
    if (!/^https?:\/\//i.test(v)) v = "https://" + v;
    try {
      const u = new URL(v);
      if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return null;
      return u.href;
    } catch (e) {
      return null;
    }
  }
  function host(url) {
    try { return new URL(url).host; } catch (e) { return ""; }
  }

  /* ---------- 로컬 저장(연습 모드) ---------- */
  const localLoad = () => store.get(LOCAL_KEY) || [];
  const localSave = arr => store.set(LOCAL_KEY, arr);

  /* ---------- 불러오기 ---------- */
  async function load(showSpinner = true) {
    if (loading) return;
    loading = true;
    if (showSpinner && !items.length) list.innerHTML = `<p class="g-empty">작품을 불러오는 중…</p>`;
    try {
      if (SHARED) {
        const res = await fetch(API + (API.includes("?") ? "&" : "?") + "t=" + Date.now());
        const data = await res.json();
        if (!data.ok) throw new Error(data.message || "불러오기 실패");
        items = data.items || [];
      } else {
        items = localLoad();
      }
      render();
    } catch (e) {
      list.innerHTML = `<p class="g-empty">작품 목록을 불러오지 못했어요. 잠시 후 새로고침을 눌러 주세요.</p>`;
    } finally {
      loading = false;
    }
  }

  /* ---------- 그리기 ---------- */
  function timeText(t) {
    const d = new Date(t);
    if (isNaN(d)) return "";
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "방금 전";
    if (diff < 3600) return Math.floor(diff / 60) + "분 전";
    if (diff < 86400) return Math.floor(diff / 3600) + "시간 전";
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  function render() {
    const safe = items
      .filter(it => normalizeUrl(it.url || ""))
      .sort((a, b) => new Date(b.time) - new Date(a.time));
    count.textContent = safe.length;
    if (!safe.length) {
      list.innerHTML = `<p class="g-empty">아직 올라온 작품이 없어요.<br>첫 번째 주인공이 되어 보세요! ✨</p>`;
      return;
    }
    list.innerHTML = safe.map((it, i) => {
      const url = normalizeUrl(it.url);
      const c = COLORS[i % COLORS.length];
      const initial = esc((it.name || "?").trim().charAt(0));
      return `
        <a class="g-card g-${c}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
          <span class="g-no">No.${String(safe.length - i).padStart(2, "0")}</span>
          <span class="g-avatar">${initial}</span>
          <span class="g-name">${esc(it.name || "익명")}</span>
          ${it.title ? `<span class="g-title">${esc(it.title)}</span>` : `<span class="g-title g-title-empty">한 줄 소개 없음</span>`}
          <span class="g-foot"><span class="g-host">${esc(host(url))}</span><span class="g-time">${esc(timeText(it.time))}</span></span>
          <span class="g-go">보러 가기 ↗</span>
        </a>`;
    }).join("");
  }

  /* ---------- 저장하기 ---------- */
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const name = nameIn.value.trim();
    const title = titleIn.value.trim();
    const url = normalizeUrl(urlIn.value);

    if (!name) { setMsg("이름 또는 닉네임을 적어 주세요.", "err"); nameIn.focus(); return; }
    if (!url) { setMsg("주소를 확인해 주세요. 예) https://내아이디.github.io/portfolio/", "err"); urlIn.focus(); return; }
    if (items.some(it => normalizeUrl(it.url || "") === url)) {
      setMsg("이미 갤러리에 있는 주소예요.", "err"); return;
    }

    const item = { name, title, url, time: new Date().toISOString() };
    saveBtn.disabled = true;
    setMsg("저장하는 중…");

    try {
      if (SHARED) {
        // Content-Type 을 지정하지 않아야(text/plain) 구글 Apps Script 로 바로 전송됩니다.
        const res = await fetch(API, { method: "POST", body: JSON.stringify({ name, title, url }) });
        const data = await res.json();
        if (!data.ok) throw new Error(data.message || "저장 실패");
      } else {
        const arr = localLoad();
        arr.push(item);
        localSave(arr);
      }
      store.set(NAME_KEY, name);
      titleIn.value = "";
      urlIn.value = "";
      setMsg("저장했어요! 갤러리에 내 작품이 올라갔어요 🎉", "ok");
      toast("갤러리에 올렸어요 🎉");
      await load(false);
    } catch (err) {
      setMsg(err.message && err.message !== "Failed to fetch"
        ? err.message
        : "저장하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.", "err");
    } finally {
      saveBtn.disabled = false;
    }
  });

  reloadBtn.addEventListener("click", () => { load(); toast("새로 불러왔어요"); });

  /* ---------- 시작 ---------- */
  nameIn.value = store.get(NAME_KEY) || "";

  modeEl.innerHTML = SHARED
    ? `<span class="dot on"></span> 모두에게 공개되는 공유 갤러리입니다. 30초마다 새 작품을 불러와요.`
    : `<span class="dot"></span> 연습 모드: 아직 공유 저장소가 연결되지 않아 <b>이 브라우저에만</b> 저장됩니다.`;

  load();
  if (SHARED) {
    setInterval(() => { if (!document.hidden) load(false); }, 30000);
  }
})();
