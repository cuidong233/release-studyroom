(() => {
  const API_BASE = window.__STUDYROOM_RUNTIME__.apiBase;
  const STORAGE_KEYS = {
    goalState: "studyroom_weekly_goal_state_v1",
    goalTemplate: "studyroom_weekly_goal_template_v1",
    currentRoomId: "studyroom_current_room_id_v1",
    nickname: "studyroom_profile_nickname_v1",
  };
  const DEFAULT_TEMPLATE = { minutes: 1200, pomodoros: 20, days: 5 };
  const MILESTONES = [25, 50, 100];
  const MILESTONE_REWARDS = {
    25: {
      title: "25% 里程碑达成",
      reward: "解锁「专注热身包」",
      detail: "系统已点亮第一枚周目标徽章。",
    },
    50: {
      title: "50% 里程碑达成",
      reward: "解锁「节奏稳定器」",
      detail: "学习节奏已经跑起来了，继续压实本周输出。",
    },
    100: {
      title: "100% 里程碑达成",
      reward: "解锁「本周满贯勋章」",
      detail: "本周目标满贯完成，房间会收到你的冲刺播报。",
    },
  };

  const runtime = {
    stats: null,
    goalState: null,
    nickname: "",
    formOpen: false,
    refreshTimer: null,
    renderTimer: null,
    initialized: false,
    refreshing: false,
    observer: null,
  };

  function init() {
    if (runtime.initialized) {
      return;
    }
    runtime.initialized = true;
    syncCurrentRoomId();
    ensureToastContainer();
    bindGlobalEvents();
    observeApp();
    renderCurrentRoute();
    refreshAndRender();
  }

  function bindGlobalEvents() {
    window.addEventListener("hashchange", () => {
      syncCurrentRoomId();
      renderCurrentRoute();
      refreshAndRender();
    });
    window.addEventListener("focus", refreshAndRender);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        refreshAndRender();
      }
    });
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("submit", handleDocumentSubmit);
  }

  function observeApp() {
    runtime.observer = new MutationObserver(() => {
      clearTimeout(runtime.renderTimer);
      runtime.renderTimer = window.setTimeout(renderCurrentRoute, 120);
    });
    runtime.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function handleDocumentClick(event) {
    const actionTarget = event.target.closest("[data-goal-action]");
    if (!actionTarget) {
      return;
    }
    const action = actionTarget.getAttribute("data-goal-action");
    if (action === "toggle-form") {
      runtime.formOpen = !runtime.formOpen;
      renderCurrentRoute();
      return;
    }
    if (action === "set-goal") {
      location.hash = "#/statistics";
      runtime.formOpen = true;
      window.setTimeout(renderCurrentRoute, 50);
      return;
    }
    if (action === "reset-template") {
      localStorage.setItem(STORAGE_KEYS.goalTemplate, JSON.stringify(DEFAULT_TEMPLATE));
      renderCurrentRoute();
    }
  }

  async function handleDocumentSubmit(event) {
    const form = event.target.closest("[data-goal-form]");
    if (!form) {
      return;
    }
    event.preventDefault();

    const formData = new FormData(form);
    const goals = {
      minutes: toPositiveInteger(formData.get("minutes")),
      pomodoros: toPositiveInteger(formData.get("pomodoros")),
      days: toPositiveInteger(formData.get("days")),
    };

    if (!goals.minutes || !goals.pomodoros || !goals.days) {
      showToast("目标保存失败", "目标值必须是大于 0 的整数。", "warn");
      return;
    }

    localStorage.setItem(STORAGE_KEYS.goalTemplate, JSON.stringify(goals));
    runtime.goalState = {
      weekKey: getWeekMeta().key,
      goals,
      achievedMilestones: [],
      milestoneHistory: [],
      pendingBroadcasts: [],
      broadcastedMilestones: [],
      savedAt: new Date().toISOString(),
    };
    saveGoalState(runtime.goalState);
    runtime.formOpen = false;
    showToast("本周目标已更新", "系统开始追踪学习分钟、番茄数和到馆天数。", "success");
    renderCurrentRoute();
    await refreshAndRender();
  }

  async function refreshAndRender() {
    if (runtime.refreshing || !shouldRunEnhancer()) {
      scheduleNextRefresh();
      return;
    }
    runtime.refreshing = true;
    try {
      runtime.goalState = loadGoalState();
      runtime.nickname = await ensureNickname();
      runtime.stats = await loadWeeklyStats();
      await flushPendingBroadcasts();
      await evaluateMilestones();
    } catch (error) {
      console.warn("[goal-enhancer] 刷新失败:", error);
    } finally {
      runtime.refreshing = false;
      renderCurrentRoute();
      scheduleNextRefresh();
    }
  }

  function scheduleNextRefresh() {
    clearTimeout(runtime.refreshTimer);
    if (!shouldRunEnhancer()) {
      return;
    }
    runtime.refreshTimer = window.setTimeout(refreshAndRender, 30000);
  }

  function shouldRunEnhancer() {
    return isStatisticsRoute() || isRoomRoute();
  }

  function getRoutePath() {
    const raw = (location.hash || "#/").slice(1);
    return (raw.split("?")[0] || "/").trim();
  }

  function isStatisticsRoute() {
    return getRoutePath() === "/statistics";
  }

  function isRoomRoute() {
    return /^\/room\/\d+/.test(getRoutePath());
  }

  function getCurrentRoomId() {
    const match = getRoutePath().match(/^\/room\/(\d+)/);
    if (match) {
      return Number(match[1]);
    }
    const cached = Number(localStorage.getItem(STORAGE_KEYS.currentRoomId));
    return Number.isFinite(cached) && cached > 0 ? cached : null;
  }

  function syncCurrentRoomId() {
    const roomId = getCurrentRoomIdFromRoute();
    if (roomId) {
      localStorage.setItem(STORAGE_KEYS.currentRoomId, String(roomId));
    }
  }

  function getCurrentRoomIdFromRoute() {
    const match = getRoutePath().match(/^\/room\/(\d+)/);
    return match ? Number(match[1]) : null;
  }

  function getHeaders(includeJson = false) {
    const headers = { "tenant-id": "1" };
    const userId = localStorage.getItem("userId");
    if (userId && userId !== "null" && userId !== "undefined") {
      headers["X-User-Id"] = userId;
    }
    if (includeJson) {
      headers["Content-Type"] = "application/json;charset=utf-8";
    }
    return headers;
  }

  async function requestJson(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method || "GET",
      headers: { ...getHeaders(Boolean(options.body)), ...(options.headers || {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.code !== 0) {
      const error = new Error(payload.msg || `Request failed: ${response.status}`);
      error.payload = payload;
      throw error;
    }
    return payload.data;
  }

  async function ensureNickname() {
    if (runtime.nickname) {
      return runtime.nickname;
    }
    const cached = localStorage.getItem(STORAGE_KEYS.nickname);
    if (cached) {
      runtime.nickname = cached;
      return cached;
    }
    try {
      const profile = await requestJson("/admin-api/studyroom/profile/get");
      const nickname = profile && profile.nickname ? profile.nickname : "有同学";
      runtime.nickname = nickname;
      localStorage.setItem(STORAGE_KEYS.nickname, nickname);
      return nickname;
    } catch (error) {
      runtime.nickname = "有同学";
      return runtime.nickname;
    }
  }

  function getWeekMeta(referenceDate = new Date()) {
    const now = new Date(referenceDate);
    const day = now.getDay() === 0 ? 7 : now.getDay();
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - day + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      key: formatDateKey(monday),
      start: monday,
      end: sunday,
      spanDays: day,
      label: `${formatMonthDay(monday)} - ${formatMonthDay(sunday)}`,
    };
  }

  function loadGoalState() {
    const currentWeek = getWeekMeta();
    const parsed = safeParse(localStorage.getItem(STORAGE_KEYS.goalState));
    if (!parsed || parsed.weekKey !== currentWeek.key) {
      return {
        weekKey: currentWeek.key,
        goals: null,
        achievedMilestones: [],
        milestoneHistory: [],
        pendingBroadcasts: [],
        broadcastedMilestones: [],
      };
    }
    return {
      weekKey: parsed.weekKey,
      goals: parsed.goals || null,
      achievedMilestones: Array.isArray(parsed.achievedMilestones) ? parsed.achievedMilestones : [],
      milestoneHistory: Array.isArray(parsed.milestoneHistory) ? parsed.milestoneHistory : [],
      pendingBroadcasts: Array.isArray(parsed.pendingBroadcasts) ? parsed.pendingBroadcasts : [],
      broadcastedMilestones: Array.isArray(parsed.broadcastedMilestones) ? parsed.broadcastedMilestones : [],
      savedAt: parsed.savedAt,
    };
  }

  function saveGoalState(state) {
    localStorage.setItem(STORAGE_KEYS.goalState, JSON.stringify(state));
  }

  function loadGoalTemplate() {
    const parsed = safeParse(localStorage.getItem(STORAGE_KEYS.goalTemplate));
    return {
      minutes: toPositiveInteger(parsed && parsed.minutes) || DEFAULT_TEMPLATE.minutes,
      pomodoros: toPositiveInteger(parsed && parsed.pomodoros) || DEFAULT_TEMPLATE.pomodoros,
      days: toPositiveInteger(parsed && parsed.days) || DEFAULT_TEMPLATE.days,
    };
  }

  async function loadWeeklyStats() {
    const week = getWeekMeta();
    const [trendResult, todayResult] = await Promise.allSettled([
      requestJson(`/admin-api/studyroom/statistics/trend?days=${week.spanDays}`),
      requestJson("/admin-api/studyroom/statistics/today"),
    ]);

    const trend = trendResult.status === "fulfilled" ? trendResult.value : { dates: [], minutes: [] };
    const today = todayResult.status === "fulfilled" ? todayResult.value : {};

    const trendMinutes = Array.isArray(trend.minutes)
      ? trend.minutes.map((item) => Number(item) || 0)
      : [];
    const trendDates = Array.isArray(trend.dates) ? trend.dates : [];

    const localTodayPomodoros = readTodayPomodorosFromLocal();
    const localWorkDuration = readCurrentWorkDuration();
    const apiTodayMinutes = Number(today.todayMinutes) || 0;
    const apiTodayPomodoros = Number(today.todayPomodoroCount) || 0;
    const todayMinutes = Math.max(apiTodayMinutes, localTodayPomodoros * localWorkDuration);
    const todayPomodoros = Math.max(apiTodayPomodoros, localTodayPomodoros);

    const normalizedMinutes = trendMinutes.slice();
    if (normalizedMinutes.length === 0 && todayMinutes > 0) {
      normalizedMinutes.push(todayMinutes);
    } else if (normalizedMinutes.length > 0) {
      normalizedMinutes[normalizedMinutes.length - 1] = Math.max(
        normalizedMinutes[normalizedMinutes.length - 1],
        todayMinutes
      );
    }

    const totalMinutes = normalizedMinutes.reduce((sum, value) => sum + value, 0);
    const otherMinutes = Math.max(0, totalMinutes - todayMinutes);
    const studyDays = normalizedMinutes.filter((value) => value > 0).length;
    const estimatedPomodoros = Math.max(todayPomodoros, Math.round(otherMinutes / 25) + todayPomodoros);

    return {
      week,
      dates: trendDates,
      minutes: normalizedMinutes,
      totalMinutes,
      totalPomodoros: estimatedPomodoros,
      studyDays,
      todayMinutes,
      todayPomodoros,
      apiAvailable: trendResult.status === "fulfilled" || todayResult.status === "fulfilled",
    };
  }

  async function evaluateMilestones() {
    if (!runtime.goalState || !runtime.goalState.goals || !runtime.stats) {
      return;
    }

    const progress = buildProgress(runtime.stats, runtime.goalState.goals);
    const pendingLevels = MILESTONES.filter((level) => {
      const alreadyHit = runtime.goalState.achievedMilestones.some((item) => item.level === level);
      return progress.overall >= level && !alreadyHit;
    });

    if (pendingLevels.length === 0) {
      return;
    }

    for (const level of pendingLevels) {
      const rewardConfig = MILESTONE_REWARDS[level];
      const milestone = {
        level,
        reachedAt: new Date().toISOString(),
        reward: rewardConfig.reward,
      };
      runtime.goalState.achievedMilestones.push(milestone);
      runtime.goalState.milestoneHistory.unshift(milestone);
      runtime.goalState.pendingBroadcasts.push({
        level,
        createdAt: milestone.reachedAt,
      });
      showToast(rewardConfig.title, `${rewardConfig.reward} · ${rewardConfig.detail}`, level === 100 ? "success" : "info");
    }

    saveGoalState(runtime.goalState);
    await flushPendingBroadcasts();
  }

  async function flushPendingBroadcasts() {
    if (!runtime.goalState || !Array.isArray(runtime.goalState.pendingBroadcasts) || runtime.goalState.pendingBroadcasts.length === 0) {
      return;
    }

    const roomId = getCurrentRoomId();
    if (!roomId) {
      return;
    }

    const progress = runtime.stats && runtime.goalState.goals ? buildProgress(runtime.stats, runtime.goalState.goals) : null;
    const remaining = [];
    for (const item of runtime.goalState.pendingBroadcasts) {
      try {
        await broadcastMilestone(roomId, item.level, progress);
        runtime.goalState.broadcastedMilestones.push({
          level: item.level,
          roomId,
          sentAt: new Date().toISOString(),
        });
      } catch (error) {
        remaining.push(item);
      }
    }
    runtime.goalState.pendingBroadcasts = remaining;
    saveGoalState(runtime.goalState);
  }

  async function broadcastMilestone(roomId, level, progress) {
    const reward = MILESTONE_REWARDS[level];
    const goals = runtime.goalState && runtime.goalState.goals ? runtime.goalState.goals : DEFAULT_TEMPLATE;
    const stats = runtime.stats || { totalMinutes: 0, totalPomodoros: 0, studyDays: 0 };
    const overall = progress ? progress.overall : 0;
    const content = [
      "🎯 周目标里程碑播报",
      `${runtime.nickname || "有同学"} 已完成本周目标 ${level}%`,
      `学习 ${stats.totalMinutes}/${goals.minutes} 分钟`,
      `番茄 ${stats.totalPomodoros}/${goals.pomodoros} 个`,
      `到馆 ${stats.studyDays}/${goals.days} 天`,
      `当前总进度 ${overall}%`,
      reward.reward,
    ].join("｜");

    await requestJson("/studyroom/chat/send", {
      method: "POST",
      body: {
        roomId,
        content,
        messageType: "text",
      },
    });
    showToast("房间广播已发送", `${runtime.nickname || "有同学"} 的 ${level}% 里程碑已同步到当前房间。`, "success");
  }

  function buildProgress(stats, goals) {
    const items = [
      {
        key: "minutes",
        label: "学习分钟",
        value: stats.totalMinutes,
        target: goals.minutes,
        unit: "分钟",
      },
      {
        key: "pomodoros",
        label: "番茄数",
        value: stats.totalPomodoros,
        target: goals.pomodoros,
        unit: "个",
      },
      {
        key: "days",
        label: "到馆天数",
        value: stats.studyDays,
        target: goals.days,
        unit: "天",
      },
    ].map((item) => {
      const ratio = item.target > 0 ? clamp(item.value / item.target, 0, 1.2) : 0;
      return {
        ...item,
        ratio,
        percent: Math.round(clamp(item.value / item.target, 0, 1) * 100),
      };
    });

    const overallRatio = items.reduce((sum, item) => sum + Math.min(item.ratio, 1), 0) / items.length;
    return {
      items,
      overall: Math.round(overallRatio * 100),
      achievedCount: runtime.goalState && Array.isArray(runtime.goalState.achievedMilestones)
        ? runtime.goalState.achievedMilestones.length
        : 0,
    };
  }

  function renderCurrentRoute() {
    runtime.goalState = loadGoalState();
    renderStatisticsPanel();
    renderRoomWidget();
  }

  function renderStatisticsPanel() {
    const existing = document.getElementById("goal-dashboard-enhancer");
    if (!isStatisticsRoute()) {
      if (existing) {
        existing.remove();
      }
      return;
    }

    const content = document.querySelector(".study-statistics .stats-content");
    if (!content) {
      return;
    }

    const root = existing || document.createElement("section");
    root.id = "goal-dashboard-enhancer";
    root.className = "goal-enhancer goal-enhancer--statistics";

    const anchor = content.querySelector(".stats-overview");
    if (!existing) {
      if (anchor && anchor.parentNode) {
        anchor.insertAdjacentElement("afterend", root);
      } else {
        content.prepend(root);
      }
    }

    const template = loadGoalTemplate();
    const goals = runtime.goalState && runtime.goalState.goals ? runtime.goalState.goals : null;
    const displayGoals = goals || template;
    const progress = runtime.stats && goals ? buildProgress(runtime.stats, goals) : null;
    const nextMilestone = getNextMilestone(progress ? progress.overall : 0);
    const stats = runtime.stats || {
      week: getWeekMeta(),
      totalMinutes: 0,
      totalPomodoros: 0,
      studyDays: 0,
      apiAvailable: false,
    };
    const history = runtime.goalState && Array.isArray(runtime.goalState.milestoneHistory)
      ? runtime.goalState.milestoneHistory.slice(0, 3)
      : [];

    const statusNote = goals
      ? stats.apiAvailable
        ? "系统正在按本周实时学习数据刷新进度。"
        : "后端不可用，当前进度已回退为本地可读数据。"
      : "先设定本周目标，系统才会开始追踪 25% / 50% / 100% 里程碑。";

    root.innerHTML = `
      <div class="goal-card">
        <div class="goal-card__head">
          <div>
            <p class="goal-card__eyebrow">目标驱动学习系统</p>
            <h3 class="goal-card__title">本周目标 + 里程碑反馈</h3>
            <p class="goal-card__subtitle">${escapeHtml(stats.week.label)} · ${escapeHtml(statusNote)}</p>
          </div>
          <button class="goal-card__button" data-goal-action="toggle-form">
            ${runtime.formOpen || !goals ? "收起设置" : "编辑目标"}
          </button>
        </div>
        <div class="goal-card__summary">
          <div class="goal-total">
            <div class="goal-total__ring">
              <strong>${progress ? progress.overall : 0}%</strong>
              <span>总体进度</span>
            </div>
            <p class="goal-total__meta">
              ${goals ? `已解锁 ${progress.achievedCount} / ${MILESTONES.length} 个里程碑` : "尚未开始追踪"}
            </p>
            <p class="goal-total__next">
              ${goals
                ? nextMilestone
                  ? `下一节点：${nextMilestone}%`
                  : "本周满贯达成"
                : "保存目标后自动点亮进度"}
            </p>
          </div>
          <div class="goal-stats">
            ${renderMiniStat("本周学习", stats.totalMinutes, "分钟")}
            ${renderMiniStat("本周番茄", stats.totalPomodoros, "个")}
            ${renderMiniStat("本周到馆", stats.studyDays, "天")}
          </div>
        </div>
        <form class="goal-form ${runtime.formOpen || !goals ? "is-open" : ""}" data-goal-form>
          <label class="goal-field">
            <span>学习分钟</span>
            <input type="number" name="minutes" min="1" value="${displayGoals.minutes}" />
          </label>
          <label class="goal-field">
            <span>番茄数</span>
            <input type="number" name="pomodoros" min="1" value="${displayGoals.pomodoros}" />
          </label>
          <label class="goal-field">
            <span>到馆天数</span>
            <input type="number" name="days" min="1" value="${displayGoals.days}" />
          </label>
          <div class="goal-form__actions">
            <button type="submit" class="goal-card__button goal-card__button--primary">保存本周目标</button>
            <button type="button" class="goal-card__button" data-goal-action="reset-template">恢复建议值</button>
          </div>
        </form>
        ${
          goals
            ? `
          <div class="goal-progress-list">
            ${progress.items.map(renderProgressRow).join("")}
          </div>
          <div class="goal-milestones">
            ${renderMilestones(runtime.goalState)}
          </div>
        `
            : `
          <div class="goal-empty">
            <strong>建议起步值</strong>
            <span>1200 分钟 / 20 个番茄 / 5 天到馆。保存后会在达成 25%、50%、100% 时自动发奖励并向房间广播。</span>
          </div>
        `
        }
        <div class="goal-history">
          ${
            history.length
              ? history
                  .map(
                    (item) => `
                <div class="goal-history__item">
                  <span class="goal-history__badge">${item.level}%</span>
                  <span>${escapeHtml(item.reward || "")}</span>
                  <time>${escapeHtml(formatDateTime(item.reachedAt))}</time>
                </div>
              `
                  )
                  .join("")
              : `<div class="goal-history__item is-muted">
                  <span class="goal-history__badge">等待触发</span>
                  <span>达成里程碑后，这里会记录你的奖励节点。</span>
                  <time>${escapeHtml(stats.week.label)}</time>
                </div>`
          }
        </div>
      </div>
    `;
  }

  function renderRoomWidget() {
    const existing = document.getElementById("goal-room-widget");
    if (!isRoomRoute()) {
      if (existing) {
        existing.remove();
      }
      return;
    }

    const panel = document.querySelector(".study-room-detail .right-panel");
    if (!panel) {
      return;
    }

    const root = existing || document.createElement("section");
    root.id = "goal-room-widget";
    root.className = "goal-enhancer goal-enhancer--room";
    if (!existing) {
      panel.prepend(root);
    }

    const stats = runtime.stats || {
      week: getWeekMeta(),
      totalMinutes: 0,
      totalPomodoros: 0,
      studyDays: 0,
    };
    const goals = runtime.goalState && runtime.goalState.goals ? runtime.goalState.goals : null;
    const progress = runtime.stats && goals ? buildProgress(runtime.stats, goals) : null;
    const nextMilestone = getNextMilestone(progress ? progress.overall : 0);
    const pendingCount = runtime.goalState && Array.isArray(runtime.goalState.pendingBroadcasts)
      ? runtime.goalState.pendingBroadcasts.length
      : 0;

    root.innerHTML = goals
      ? `
        <div class="goal-room-card">
          <div class="goal-room-card__head">
            <div>
              <p class="goal-card__eyebrow">本周冲刺</p>
              <h4>目标进度看板</h4>
            </div>
            <span class="goal-room-card__percent">${progress.overall}%</span>
          </div>
          <div class="goal-room-card__bar">
            <span style="width:${progress.overall}%"></span>
          </div>
          <div class="goal-room-card__grid">
            ${renderRoomStat("分钟", `${stats.totalMinutes}/${goals.minutes}`)}
            ${renderRoomStat("番茄", `${stats.totalPomodoros}/${goals.pomodoros}`)}
            ${renderRoomStat("到馆", `${stats.studyDays}/${goals.days}`)}
          </div>
          <div class="goal-room-card__foot">
            <span>${nextMilestone ? `下一节点 ${nextMilestone}%` : "本周目标已满贯"}</span>
            <span>${pendingCount > 0 ? `待广播 ${pendingCount} 条` : "里程碑将自动播报到本房间"}</span>
          </div>
        </div>
      `
      : `
        <div class="goal-room-card is-empty">
          <p class="goal-card__eyebrow">本周冲刺</p>
          <h4>还没设置周目标</h4>
          <p>去学习统计页设定学习分钟、番茄数和到馆天数后，这里会实时显示进度，并在达成时自动广播。</p>
          <button class="goal-card__button goal-card__button--primary" data-goal-action="set-goal">立即去设置</button>
        </div>
      `;
  }

  function renderProgressRow(item) {
    return `
      <div class="goal-progress">
        <div class="goal-progress__meta">
          <span>${escapeHtml(item.label)}</span>
          <strong>${item.value} / ${item.target} ${escapeHtml(item.unit)}</strong>
        </div>
        <div class="goal-progress__track">
          <span style="width:${Math.min(item.percent, 100)}%"></span>
        </div>
        <div class="goal-progress__text">${item.percent}%</div>
      </div>
    `;
  }

  function renderMilestones(goalState) {
    return MILESTONES.map((level) => {
      const reached = goalState.achievedMilestones.some((item) => item.level === level);
      return `
        <div class="goal-milestone ${reached ? "is-reached" : ""}">
          <span>${level}%</span>
          <strong>${escapeHtml(MILESTONE_REWARDS[level].reward)}</strong>
        </div>
      `;
    }).join("");
  }

  function renderMiniStat(label, value, unit) {
    return `
      <div class="goal-stat">
        <span class="goal-stat__label">${escapeHtml(label)}</span>
        <strong class="goal-stat__value">${value}</strong>
        <small class="goal-stat__unit">${escapeHtml(unit)}</small>
      </div>
    `;
  }

  function renderRoomStat(label, value) {
    return `
      <div class="goal-room-card__stat">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `;
  }

  function getNextMilestone(currentPercent) {
    return MILESTONES.find((level) => currentPercent < level) || null;
  }

  function readTodayPomodorosFromLocal() {
    const parsed = safeParse(localStorage.getItem("today_pomodoro_count"));
    if (!parsed || parsed.date !== new Date().toDateString()) {
      return 0;
    }
    return toPositiveInteger(parsed.count) || 0;
  }

  function readCurrentWorkDuration() {
    const parsed = safeParse(localStorage.getItem("pomodoro_durations"));
    return toPositiveInteger(parsed && parsed.work) || 25;
  }

  function ensureToastContainer() {
    if (document.getElementById("goal-toast-container")) {
      return;
    }
    const container = document.createElement("div");
    container.id = "goal-toast-container";
    document.body.appendChild(container);
  }

  function showToast(title, message, tone = "info") {
    const container = document.getElementById("goal-toast-container");
    if (!container) {
      return;
    }
    const toast = document.createElement("div");
    toast.className = `goal-toast is-${tone}`;
    toast.innerHTML = `
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.add("is-visible");
    });
    window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => toast.remove(), 260);
    }, 3400);
  }

  function safeParse(value) {
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function toPositiveInteger(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return Math.max(0, Math.round(parsed));
  }

  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatMonthDay(date) {
    return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return `${formatMonthDay(date)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
