(function () {
  var COUNT_KEY = "today_pomodoro_count";
  var lastAppliedText = "";
  var observer = null;

  function isRoomRoute() {
    return /^#\/room\/\d+/.test(location.hash || "");
  }

  function getTodayKey() {
    return new Date().toDateString();
  }

  function readSavedCount() {
    try {
      var raw = localStorage.getItem(COUNT_KEY);
      if (!raw) return 0;
      var parsed = JSON.parse(raw);
      return parsed && parsed.date === getTodayKey() ? Number(parsed.count || 0) : 0;
    } catch (error) {
      console.warn("[pomodoro-ui-enhancer] 读取今日番茄数失败:", error);
      return 0;
    }
  }

  function writeSavedCount(count) {
    var normalized = Math.max(0, Number(count || 0));
    localStorage.setItem(COUNT_KEY, JSON.stringify({
      date: getTodayKey(),
      count: normalized,
    }));
  }

  function parseCount(text) {
    var match = String(text || "").match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  function findCountNode() {
    var stats = document.querySelectorAll(".pomodoro-timer .timer-stats .stat-value");
    return stats.length ? stats[0] : null;
  }

  function syncCountNode() {
    if (!isRoomRoute()) return;
    var node = findCountNode();
    if (!node) return;

    var uiCount = parseCount(node.textContent);
    var savedCount = readSavedCount();

    if (uiCount > savedCount) {
      writeSavedCount(uiCount);
      lastAppliedText = uiCount + "个";
      return;
    }

    if (savedCount > uiCount) {
      var nextText = savedCount + "个";
      if (node.textContent !== nextText || lastAppliedText !== nextText) {
        node.textContent = nextText;
        lastAppliedText = nextText;
      }
    }
  }

  function bindDomObserver() {
    if (observer) return;
    observer = new MutationObserver(function () {
      syncCountNode();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function init() {
    bindDomObserver();
    window.setInterval(syncCountNode, 1000);
    window.addEventListener("hashchange", syncCountNode);
    window.addEventListener("focus", syncCountNode);
    syncCountNode();
  }

  init();
})();
