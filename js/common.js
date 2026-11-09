/* =========================================================
   공통 도우미 - 다른 스크립트보다 먼저 불러옵니다.
   ========================================================= */
window.UI = (function () {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // 화면에 글자를 넣을 때 HTML로 해석되지 않게 바꾸기
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // 아래쪽 안내 메시지
  let timer;
  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove("show"), 2000);
  }

  // 클립보드 복사 (지원하지 않는 브라우저는 예전 방식으로)
  async function copyText(text, msg = "복사했어요! AI 채팅창에 붙여 넣으세요 ✨") {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (err) { /* 무시 */ }
      ta.remove();
    }
    if (msg) toast(msg);
  }

  // 브라우저 저장소 (사생활 보호 모드 등에서 실패해도 페이지는 동작)
  const store = {
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 무시 */ } }
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return { $, $$, esc, toast, copyText, store, reduceMotion };
})();
