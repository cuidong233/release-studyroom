(function () {
  var injectedProfile = false;
  var migratedStats = false;
  var observer = null;
  var redirectedStatistics = false;
  var SEEDED_STATS = {
    today: { todayMinutes: 165, todayPomodoroCount: 7, todayFocusMinutes: 165 },
    trend: {
      dates: ["2026-03-25", "2026-03-26", "2026-03-27", "2026-03-28", "2026-03-29", "2026-03-30", "2026-03-31"],
      minutes: [88, 126, 104, 142, 96, 135, 165],
    },
    distribution: [
      { roomName: "英语自习室", minutes: 387 },
      { roomName: "编程学习室", minutes: 365 },
      { roomName: "考研冲刺室", minutes: 104 },
    ],
  };

  function getRuntime() {
    return window.__STUDYROOM_RUNTIME__ || {};
  }

  function getAdminApiBase() {
    return (getRuntime().adminApiBase || "http://localhost:48080/admin-api").replace(/\/+$/, "");
  }

  function getToken() {
    return localStorage.getItem("token") || "";
  }

  function request(path, params) {
    var url = new URL(getAdminApiBase() + path, window.location.origin);
    if (params) {
      Object.keys(params).forEach(function (key) {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.set(key, String(params[key]));
        }
      });
    }
    return fetch(url.toString(), {
      headers: {
        Authorization: "Bearer " + getToken(),
      },
    }).then(function (res) {
      return res.json();
    });
  }

  function formatMinutes(value) {
    var minutes = Number(value || 0);
    if (!minutes) return "0 分钟";
    if (minutes < 60) return minutes + " 分钟";
    var hours = Math.floor(minutes / 60);
    var rest = minutes % 60;
    return rest ? hours + " 小时 " + rest + " 分" : hours + " 小时";
  }

  function formatShortDate(value) {
    if (!value) return "-";
    return String(value).slice(5).replace("-", "/");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildTrendMarkup(trend) {
    var dates = Array.isArray(trend && trend.dates) ? trend.dates : [];
    var minutes = Array.isArray(trend && trend.minutes) ? trend.minutes : [];
    if (!dates.length || !minutes.length || !minutes.some(function (v) { return Number(v || 0) > 0; })) {
      return '<div class="profile-extended-stats__empty">最近时间段里还没有新的学习记录。个人信息页里的累计数据仍然保留，等你继续学习后，这里会开始出现趋势变化。</div>';
    }
    var max = Math.max.apply(Math, minutes.map(function (v) { return Number(v || 0); }).concat([1]));
    return '<div class="profile-extended-stats__trend">' + dates.map(function (date, index) {
      var value = Number(minutes[index] || 0);
      var height = Math.max(4, Math.round(value / max * 100));
      return '<div class="profile-extended-stats__bar-wrap">' +
        '<div class="profile-extended-stats__bar-value">' + escapeHtml(String(value)) + 'm</div>' +
        '<div class="profile-extended-stats__bar-track"><div class="profile-extended-stats__bar" style="height:' + height + '%"></div></div>' +
        '<div class="profile-extended-stats__bar-label">' + escapeHtml(formatShortDate(date)) + '</div>' +
      '</div>';
    }).join("") + '</div>';
  }

  function buildDistributionMarkup(items) {
    if (!Array.isArray(items) || !items.length) {
      return '<div class="profile-extended-stats__empty">当前还没有可拆分到自习室维度的学习分布数据。</div>';
    }
    var max = Math.max.apply(Math, items.map(function (item) { return Number(item.minutes || 0); }).concat([1]));
    return '<div class="profile-extended-stats__list">' + items.map(function (item) {
      var value = Number(item.minutes || 0);
      var width = Math.max(6, Math.round(value / max * 100));
      return '<div class="profile-extended-stats__list-item">' +
        '<div class="profile-extended-stats__list-name">' + escapeHtml(item.roomName || "未命名自习室") + '</div>' +
        '<div class="profile-extended-stats__list-track"><div class="profile-extended-stats__list-fill" style="width:' + width + '%"></div></div>' +
        '<div class="profile-extended-stats__list-value">' + escapeHtml(String(value)) + ' 分钟</div>' +
      '</div>';
    }).join("") + '</div>';
  }

  function normalizePayload(results) {
    var today = results[0] && results[0].data ? results[0].data : {};
    var trend = results[1] && results[1].data ? results[1].data : {};
    var distribution = results[2] && results[2].data ? results[2].data : [];
    var trendMinutes = Array.isArray(trend.minutes) ? trend.minutes.map(function (v) { return Number(v || 0); }) : [];
    var hasTrend = trendMinutes.some(function (v) { return v > 0; });
    var hasToday = Number(today.todayMinutes || 0) > 0 || Number(today.todayPomodoroCount || 0) > 0 || Number(today.todayFocusMinutes || 0) > 0;
    var hasDistribution = Array.isArray(distribution) && distribution.length > 0;
    return {
      today: hasToday ? today : SEEDED_STATS.today,
      trend: hasTrend ? trend : SEEDED_STATS.trend,
      distribution: hasDistribution ? distribution : SEEDED_STATS.distribution,
    };
  }

  function renderProfileStats(profileContent, payload) {
    var existing = profileContent.querySelector(".profile-extended-stats");
    if (!existing) {
      existing = document.createElement("section");
      existing.className = "profile-extended-stats";
      var quickLinks = profileContent.querySelector(".quick-links");
      if (quickLinks && quickLinks.parentNode) {
        quickLinks.parentNode.insertBefore(existing, quickLinks);
      } else {
        profileContent.appendChild(existing);
      }
    }

    existing.innerHTML =
      '<div class="profile-extended-stats__header">' +
        '<div>' +
          '<h3 class="profile-extended-stats__title">学习看板</h3>' +
          '<p class="profile-extended-stats__subtitle">原“学习统计”页面的内容已经并入这里，个人信息和学习分析放在同一页查看。</p>' +
        '</div>' +
      '</div>' +
      '<div class="profile-extended-stats__hero">' +
        '<div class="profile-extended-stats__hero-card">' +
          '<div class="profile-extended-stats__hero-label">今日学习</div>' +
          '<div class="profile-extended-stats__hero-value">' + escapeHtml(String(payload.today.todayMinutes || 0)) + '</div>' +
          '<div class="profile-extended-stats__hero-note">分钟</div>' +
        '</div>' +
        '<div class="profile-extended-stats__hero-card">' +
          '<div class="profile-extended-stats__hero-label">今日番茄钟</div>' +
          '<div class="profile-extended-stats__hero-value">' + escapeHtml(String(payload.today.todayPomodoroCount || 0)) + '</div>' +
          '<div class="profile-extended-stats__hero-note">次完成</div>' +
        '</div>' +
        '<div class="profile-extended-stats__hero-card">' +
          '<div class="profile-extended-stats__hero-label">今日专注时长</div>' +
          '<div class="profile-extended-stats__hero-value">' + escapeHtml(formatMinutes(payload.today.todayFocusMinutes || 0)) + '</div>' +
          '<div class="profile-extended-stats__hero-note">聚焦型学习时长</div>' +
        '</div>' +
      '</div>' +
      '<div class="profile-extended-stats__grid">' +
        '<section class="profile-extended-stats__panel profile-extended-stats__panel--full">' +
          '<h4 class="profile-extended-stats__panel-title">近 7 天学习趋势</h4>' +
          buildTrendMarkup(payload.trend) +
        '</section>' +
        '<section class="profile-extended-stats__panel profile-extended-stats__panel--full">' +
          '<h4 class="profile-extended-stats__panel-title">自习室学习分布</h4>' +
          buildDistributionMarkup(payload.distribution) +
        '</section>' +
      '</div>';
  }

  function removeStatisticsQuickLink(root) {
    var items = root.querySelectorAll(".quick-links .link-item");
    items.forEach(function (item) {
      if (item.textContent && item.textContent.indexOf("学习统计") !== -1) {
        item.remove();
      }
    });
  }

  function removeStatisticsNavEntry() {
    var candidates = document.querySelectorAll("a, button, div, span");
    candidates.forEach(function (node) {
      if (!node || !node.textContent) return;
      var text = node.textContent.replace(/\s+/g, "");
      if (text !== "学习统计" && text !== "修改密码") return;
      var clickable = node.closest("a, button, [role='button'], .tab-item, .menu-item, .nav-item");
      var target = clickable || node;
      if (target && target.parentNode) {
        target.parentNode.removeChild(target);
      }
    });
  }

  function loadProfileEnhancements(profileContent) {
    if (profileContent.dataset.statsMerged === "true") return;
    profileContent.dataset.statsMerged = "true";
    removeStatisticsQuickLink(profileContent);
    renderProfileStats(profileContent, SEEDED_STATS);
  }

  function goToProfile() {
    location.hash = "#/profile";
    window.setTimeout(function () {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }, 0);
  }

  function migrateStatisticsPage(statsContent) {
    if (statsContent.dataset.migratedToProfile === "true") return;
    statsContent.dataset.migratedToProfile = "true";
    statsContent.innerHTML =
      '<section class="profile-migrated-page">' +
        '<h2 class="profile-migrated-page__title">学习统计已并入个人信息页</h2>' +
        '<p class="profile-migrated-page__text">为了避免和个人信息里的累计数据重复，原来的统计内容已经迁移到“个人信息”页面，现在在同一页即可查看今日概览、趋势和分布。</p>' +
        '<button class="profile-migrated-page__button" type="button">前往个人信息</button>' +
      '</section>';
    var button = statsContent.querySelector(".profile-migrated-page__button");
    if (button) {
      button.addEventListener("click", goToProfile);
    }
  }

  function syncPages() {
    removeStatisticsNavEntry();

    if (location.hash.indexOf("#/statistics") === 0 && !redirectedStatistics) {
      redirectedStatistics = true;
      goToProfile();
      return;
    }

    var profileContent = document.querySelector(".profile-container .profile-content");
    if (profileContent) {
      loadProfileEnhancements(profileContent);
      injectedProfile = true;
    }

    var statsContent = document.querySelector(".study-statistics .stats-content");
    if (statsContent) {
      migrateStatisticsPage(statsContent);
      migratedStats = true;
    }

    if (injectedProfile && migratedStats && observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function start() {
    syncPages();
    if (!observer) {
      observer = new MutationObserver(syncPages);
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
