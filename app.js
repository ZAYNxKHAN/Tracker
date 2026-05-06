/* Zayn’s Streak Tracker — vanilla JS */

const LS = {
  settings: "zaynTracker_settings",
  streak: "zaynTracker_streak",
  tasks: "zaynTracker_tasks",
  today: "zaynTracker_today",
};

const DEFAULT_TOTAL_DAYS = 20;
const RESET_TO_DAY_ON_FAIL = 3;

const DEFAULT_TASKS = [
  { id: "study", name: "Study (1:30 hrs)", points: 12 },
  { id: "sleep", name: "Sleep at 3 AM", points: 8 },
  { id: "bath", name: "Bath before sleep", points: 4 },
  { id: "exercise", name: "Exercise/Running", points: 8 },
  { id: "pastpaper", name: "Cracked Past Paper", points: 12 },
  { id: "reels", name: "Avoided Reels", points: 8 },
  { id: "meals", name: "Dinner/Breakfast on time", points: 8 },
  { id: "vocab", name: "Vocabulary & Current Affairs (60 mins)", points: 8 },
  { id: "distractions", name: "Avoided Distractions", points: 8 },
  { id: "selfcontrol", name: "Self Control", points: 8 },
  { id: "water", name: "Water (12+ glasses)", points: 8 },
  { id: "office", name: "Arrived office at time", points: 8 },
];

const \$ = (sel) => document.querySelector(sel);

const els = {
  taskList: \$("#taskList"),
  calcBtn: \$("#calcBtn"),
  nextDayBtn: \$("#nextDayBtn"),
  resetDailyBtn: \$("#resetDailyBtn"),

  currentDay: \$("#currentDay"),
  totalDaysInput: \$("#totalDaysInput"),

  progressFill: \$("#progressFill"),
  progressLabel: \$("#progressLabel"),
  totalPointsLabel: \$("#totalPointsLabel"),
  pointsWarning: \$("#pointsWarning"),

  scoreValue: \$("#scoreValue"),
  scoreTotal: \$("#scoreTotal"),
  messageBox: \$("#messageBox"),

  milestoneBox: \$("#milestoneBox"),
  milestoneText: \$("#milestoneText"),
  dismissMilestoneBtn: \$("#dismissMilestoneBtn"),

  todayKey: \$("#todayKey"),
};

function getKarachiDateKey() {
  // Use Asia/Karachi to avoid timezone surprises.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find(p => p.type === "year").value;
  const m = parts.find(p => p.type === "month").value;
  const d = parts.find(p => p.type === "day").value;
  return `\${y}-\${m}-\${d}`;
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function clampInt(n, min, max) {
  const x = Number.parseInt(n, 10);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

let state = {
  settings: { totalDays: DEFAULT_TOTAL_DAYS },
  streak: { currentDay: 1 },
  tasks: structuredClone(DEFAULT_TASKS),
  today: { dateKey: getKarachiDateKey(), checked: {}, todayScore: 0 },
};

function ensureState() {
  state.settings = loadJSON(LS.settings, state.settings);
  state.streak = loadJSON(LS.streak, state.streak);
  state.tasks = loadJSON(LS.tasks, state.tasks);
  state.today = loadJSON(LS.today, state.today);

  if (!state.settings?.totalDays || state.settings.totalDays < 1) {
    state.settings.totalDays = DEFAULT_TOTAL_DAYS;
  }
  if (!state.streak?.currentDay || state.streak.currentDay < 1) {
    state.streak.currentDay = 1;
  }
  if (!Array.isArray(state.tasks) || state.tasks.length === 0) {
    state.tasks = structuredClone(DEFAULT_TASKS);
  }
  if (!state.today || typeof state.today !== "object") {
    state.today = { dateKey: getKarachiDateKey(), checked: {}, todayScore: 0 };
  }

  // Auto-clear daily checks if date changed (does NOT change streak).
  const nowKey = getKarachiDateKey();
  if (state.today.dateKey !== nowKey) {
    state.today = { dateKey: nowKey, checked: {}, todayScore: 0 };
    saveJSON(LS.today, state.today);
  }
}

function persistAll() {
  saveJSON(LS.settings, state.settings);
  saveJSON(LS.streak, state.streak);
  saveJSON(LS.tasks, state.tasks);
  saveJSON(LS.today, state.today);
}

function totalPossiblePoints() {
  return state.tasks.reduce((sum, t) => sum + (Number(t.points) || 0), 0);
}

function calculateScore() {
  let score = 0;
  for (const t of state.tasks) {
    if (state.today.checked[t.id]) score += Number(t.points) || 0;
  }
  state.today.todayScore = score;
  saveJSON(LS.today, state.today);
  return score;
}

function setMessage(kind, text) {
  els.messageBox.classList.remove("message--success", "message--danger", "message--neutral");
  if (kind === "success") els.messageBox.classList.add("message--success");
  else if (kind === "danger") els.messageBox.classList.add("message--danger");
  else els.messageBox.classList.add("message--neutral");
  els.messageBox.textContent = text;
}

function showMilestone(text) {
  els.milestoneText.textContent = text;
  els.milestoneBox.hidden = false;
}

function hideMilestone() {
  els.milestoneBox.hidden = true;
  els.milestoneText.textContent = "";
}

function updateScoreUI() {
  const total = totalPossiblePoints();
  els.scoreTotal.textContent = String(total);
  els.scoreValue.textContent = String(state.today.todayScore || 0);
}

function updateHeaderUI() {
  els.currentDay.textContent = String(state.streak.currentDay);
  els.totalDaysInput.value = String(state.settings.totalDays);

  const total = totalPossiblePoints();
  els.totalPointsLabel.textContent = `Total Possible: \${total}`;
  els.pointsWarning.hidden = (total === 100);

  els.todayKey.textContent = state.today.dateKey;
}

function updateProgressUI() {
  const cd = state.streak.currentDay;
  const td = state.settings.totalDays;

  els.progressLabel.textContent = `Progress: \${cd} / \${td}`;

  const pct = Math.max(0, Math.min(1, cd / td)) * 100;
  els.progressFill.style.width = `\${pct}%`;

  const pb = document.querySelector(".progress-bar");
  pb?.setAttribute("aria-valuemax", String(td));
  pb?.setAttribute("aria-valuenow", String(cd));
}

function renderTasks() {
  els.taskList.innerHTML = "";

  for (const t of state.tasks) {
    const li = document.createElement("li");
    li.className = "task";
    li.dataset.id = t.id;

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!state.today.checked[t.id];
    cb.addEventListener("change", () => {
      state.today.checked[t.id] = cb.checked;
      calculateScore();
      updateScoreUI();
      saveJSON(LS.today, state.today);
    });

    // Make row tappable (but avoid toggling when interacting with inputs)
    li.addEventListener("click", (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input") return;
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const nameWrap = document.createElement("div");
    nameWrap.className = "task-name";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = t.name;
    nameInput.setAttribute("aria-label", "Task name");
    nameInput.addEventListener("input", () => {
      t.name = nameInput.value;
      saveJSON(LS.tasks, state.tasks);
    });

    nameWrap.appendChild(nameInput);

    const pointsWrap = document.createElement("div");
    pointsWrap.className = "points";

    const ptsInput = document.createElement("input");
    ptsInput.type = "number";
    ptsInput.min = "0";
    ptsInput.step = "1";
    ptsInput.inputMode = "numeric";
    ptsInput.value = String(t.points);
    ptsInput.setAttribute("aria-label", "Points");

    let lastValid = Number(t.points) || 0;

    ptsInput.addEventListener("change", () => {
      const v = Number.parseInt(ptsInput.value, 10);
      if (Number.isNaN(v) || v < 0) {
        ptsInput.value = String(lastValid);
        return;
      }
      t.points = v;
      lastValid = v;

      calculateScore();
      updateScoreUI();
      updateHeaderUI();
      updateProgressUI();
      saveJSON(LS.tasks, state.tasks);
    });

    pointsWrap.appendChild(ptsInput);

    li.appendChild(cb);
    li.appendChild(nameWrap);
    li.appendChild(pointsWrap);

    els.taskList.appendChild(li);
  }
}

function applyDailyMessage(score) {
  if (score >= 95) {
    setMessage("success", "REWARD: 30 Mins Reels Time! 🗿");
  } else if (score >= 80 && score <= 94) {
    setMessage("neutral", "STREAK ALIVE: Good job, but do better. 🔥");
  } else {
    setMessage("danger", "PUNISHMENT: Study 30 Mins More! ❌");
  }
}

function resetDailyOnly() {
  state.today.checked = {};
  state.today.todayScore = 0;
  state.today.dateKey = getKarachiDateKey();
  saveJSON(LS.today, state.today);

  setMessage("neutral", "New day: check tasks and calculate your score.");
  hideMilestone();

  renderTasks();
  updateHeaderUI();
  updateScoreUI();
  updateProgressUI();
}

function handleNextDay() {
  const score = calculateScore();
  applyDailyMessage(score);

  const ok = confirm("Move to next day? This will reset today’s checkboxes.");
  if (!ok) return;

  if (score >= 80) state.streak.currentDay += 1;
  else state.streak.currentDay = RESET_TO_DAY_ON_FAIL;

  // Milestones: 7, 15, totalDays (default 20)
  const td = state.settings.totalDays;
  const cd = state.streak.currentDay;

  if (cd === 7) showMilestone("MILESTONE (7): Reward unlocked. Keep going.");
  else if (cd === 15) showMilestone("MILESTONE (15): Reward unlocked. Strong discipline.");
  else if (cd === td) showMilestone(`CHALLENGE COMPLETE (\${td}/\${td}): You did it.`);

  saveJSON(LS.streak, state.streak);

  // Reset daily for new day
  state.today = { dateKey: getKarachiDateKey(), checked: {}, todayScore: 0 };
  saveJSON(LS.today, state.today);

  renderTasks();
  updateHeaderUI();
  updateScoreUI();
  updateProgressUI();
}

function wireEvents() {
  els.calcBtn.addEventListener("click", () => {
    const score = calculateScore();
    updateScoreUI();
    applyDailyMessage(score);
  });

  els.nextDayBtn.addEventListener("click", handleNextDay);

  els.resetDailyBtn.addEventListener("click", () => {
    const ok = confirm("Reset today’s checkboxes and score? (Streak stays saved)");
    if (!ok) return;
    resetDailyOnly();
  });

  els.totalDaysInput.addEventListener("change", () => {
    const td = clampInt(els.totalDaysInput.value, 1, 999);
    state.settings.totalDays = td;
    saveJSON(LS.settings, state.settings);
    updateHeaderUI();
    updateProgressUI();
  });

  els.dismissMilestoneBtn.addEventListener("click", hideMilestone);
}

function init() {
  ensureState();
  calculateScore(); // sync score from checked
  renderTasks();
  updateHeaderUI();
  updateScoreUI();
  updateProgressUI();
  wireEvents();
}

init();
