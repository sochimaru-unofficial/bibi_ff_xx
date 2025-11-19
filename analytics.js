const JSON_URL = "streams_combined.json";

let allData = [];
let groupedBySeries = {};
let charts = {};
let seriesStatsCache = null;

const SERIES_LIST = [
  "FF1","FF2","FF3","FF4","FF5","FF6","FF7",
  "FF8","FF9","FF10","FF12","FF13","FF14","FF15","FF16"
];

/* ▼ シリーズカラー */
const SERIES_COLORS = {
  FF1:  "#3BA3FF",
  FF2:  "#D9473C",
  FF3:  "#E0E0E0",
  FF4:  "#6A4FBF",
  FF5:  "#E35D9C",
  FF6:  "#6F7A8A",
  FF7:  "#C93131",
  FF8:  "#7D2A35",
  FF9:  "#D8A436",
  FF10: "#4FC4E8",
  FF12: "#D6C49E",
  FF13: "#8DE8C0",
  FF14: "#7F45D0",
  FF15: "#1A2340",
  FF16: "#A32020"
};

async function main() {
  const data = await fetch(JSON_URL).then(r => r.json());
  allData = Object.values(data).flat();

  groupedBySeries = {};
  allData.forEach(item => {
    const s = item.series;
    if (!groupedBySeries[s]) groupedBySeries[s] = [];
    groupedBySeries[s].push(item);
  });

  setupTabs();
  setupToggleButtons();

  document.querySelectorAll(".fade-slide").forEach(el => {
    if (el.id === "total-graph-time-body" || el.id === "total-graph-count-body") return;
    el.classList.add("show");
  });

  renderTotalTab();
}

/* ========= ユーティリティ ========= */

function parseDurationSeconds(str) {
  if (!str) return 0;
  const parts = str.split(":").map(Number);
  let h = 0, m = 0, s = 0;
  if (parts.length === 3) [h, m, s] = parts;
  if (parts.length === 2) [m, s] = parts;
  if (parts.length === 1) [s] = parts;
  return h * 3600 + m * 60 + s;
}

function formatHMS(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}時間 ${m}分 ${s}秒`;
}

function formatDate(d) {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateMD(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateTime(d) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(d)} ${hh}:${mm} 開始`;
}

function getShortTitle(item) {
  const series = item.series;
  const title = item["タイトル"];
  const m = title.match(/#\s?(\d+)/);
  if (m) return `${series} #${m[1]}`;
  if (title.includes("最終回")) return `${series} 最終回`;
  return series;
}

/* ========= タブ ========= */

function setupTabs() {
  const tabs = document.querySelectorAll("#series-tabs .tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const series = tab.dataset.series;
      switchTab(series);
    });
  });
}

function switchTab(series) {
  const totalPanel = document.getElementById("tab-total");
  const seriesPanel = document.getElementById("tab-series");

  resetToggleBodies();

  if (series === "total") {
    totalPanel.classList.remove("hidden");
    seriesPanel.classList.add("hidden");
    renderTotalTab();
    triggerFadeIn(totalPanel);
  } else {
    totalPanel.classList.add("hidden");
    seriesPanel.classList.remove("hidden");
    renderSeriesTab(series);
    triggerFadeIn(seriesPanel);
  }
}

/* ========= トグルボタン ========= */

function setupToggleButtons() {
  const buttons = document.querySelectorAll(".toggle-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const body = document.getElementById(targetId);
      if (!body) return;

      // ▼ グラフ専用
      if (
        targetId === "total-graph-time-body" ||
        targetId === "total-graph-count-body"
      ) {
        const isShown = body.classList.contains("show-graph");

        if (isShown) {
          body.classList.remove("show-graph");
          btn.textContent = "表示";
        } else {
          if (!body.dataset.loaded) {
            if (!seriesStatsCache) seriesStatsCache = buildSeriesStats();

            if (targetId === "total-graph-time-body") renderTimeGraph(seriesStatsCache);
            if (targetId === "total-graph-count-body") renderCountGraph(seriesStatsCache);

            body.dataset.loaded = "true";
          }

          body.classList.add("show-graph");
          btn.textContent = "非表示";
        }
        return;
      }

      // ▼ 通常トグル
      const isCollapsed = body.classList.contains("collapsed");
      if (isCollapsed) {
        body.classList.remove("collapsed");
        body.classList.remove("blow");
        setTimeout(() => body.classList.add("blow"), 10);
        btn.textContent = "非表示";

        body.querySelectorAll(".fade-slide").forEach(el => el.classList.add("show"));
      } else {
        body.classList.add("collapsed");
        body.classList.remove("blow");
        btn.textContent = "表示";
      }
    });
  });
}

function resetToggleBodies() {
  const bodies = document.querySelectorAll(".toggle-body");
  const buttons = document.querySelectorAll(".toggle-btn");

  bodies.forEach(b => {
    if (
      b.id === "total-graph-time-body" ||
      b.id === "total-graph-count-body"
    ) {
      b.classList.remove("show-graph");
      return;
    }

    b.classList.add("collapsed");
    b.classList.remove("blow");
  });

  buttons.forEach(btn => btn.textContent = "表示");
}

function triggerFadeIn(panel) {
  const targets = panel.querySelectorAll(".fade-slide");
  targets.forEach(el => el.classList.add("show"));
}

/* ========= トータルタブ ========= */

function buildSeriesStats() {
  const seriesStats = [];

  SERIES_LIST.forEach(s => {
    const list = groupedBySeries[s];
    if (!list || list.length === 0) return;

    let sec = 0;
    list.forEach(item => sec += parseDurationSeconds(item["配信時間"]));

    const dates = list.map(i => new Date(i["配信日時"]));
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    const periodMs = max - min;

    const firstItem = list.slice().sort(
      (a, b) => new Date(a["配信日時"]) - new Date(b["配信日時"])
    )[0];

    seriesStats.push({
      series: s,
      count: list.length,
      sec,
      periodMs,
      firstItem
    });
  });

  return seriesStats;
}

function renderTotalTab() {
  let totalSec = 0;
  let totalCount = allData.length;
  let allDates = [];

  const seriesStats = buildSeriesStats();
  seriesStatsCache = seriesStats;

  seriesStats.forEach(stat => {
    totalSec += stat.sec;

    const list = groupedBySeries[stat.series];
    if (list && list.length > 0) {
      const dates = list.map(i => new Date(i["配信日時"]));
      allDates.push(...dates);
    }
  });

  document.getElementById("sum-total-time").textContent = formatHMS(totalSec);
  document.getElementById("sum-total-count").textContent = `${totalCount} 回`;
  const avgSec = totalCount ? Math.floor(totalSec / totalCount) : 0;
  document.getElementById("sum-avg-time").textContent = formatHMS(avgSec);

  if (allDates.length > 0) {
    const min = new Date(Math.min(...allDates));
    const max = new Date(Math.max(...allDates));
    document.getElementById("sum-total-period").textContent =
      `${formatDate(min)} 〜 ${formatDate(max)}`;
  } else {
    document.getElementById("sum-total-period").textContent = "-";
  }

  renderTotalRankings(seriesStats);
}

function renderTotalRankings(seriesStats) {
  const mostCountBox = document.getElementById("ranking-most-count");
  const mostTimeBox = document.getElementById("ranking-most-time");
  const longestPeriodBox = document.getElementById("ranking-longest-period");

  mostCountBox.innerHTML = "";
  mostTimeBox.innerHTML = "";
  longestPeriodBox.innerHTML = "";

  const byCount = seriesStats.slice().sort((a,b) => b.count - a.count).slice(0, 3);
  byCount.forEach((st, idx) => {
    const card = createSeriesRankingCard(st, idx, "配信回数", `${st.count}回`);
    mostCountBox.appendChild(card);
  });

  const bySec = seriesStats.slice().sort((a,b) => b.sec - a.sec).slice(0, 3);
  bySec.forEach((st, idx) => {
    const card = createSeriesRankingCard(st, idx, "総配信時間", formatHMS(st.sec));
    mostTimeBox.appendChild(card);
  });

  const byPeriod = seriesStats.slice().sort((a,b) => b.periodMs - a.periodMs).slice(0, 3);
  byPeriod.forEach((st, idx) => {
    const list = groupedBySeries[st.series];
    const dates = list.map(i => new Date(i["配信日時"]));
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    const periodText = `${formatDateMD(min)} 〜 ${formatDateMD(max)}`;
    const card = createSeriesRankingCard(st, idx, "期間", periodText);
    longestPeriodBox.appendChild(card);
  });

  document.querySelectorAll("#total-rankings .ranking-card").forEach(card => {
    card.classList.add("show");
  });
}

function createSeriesRankingCard(stat, index, label, value) {
  const card = document.createElement("div");
  card.className = "ranking-card fade-slide";

  const badge = document.createElement("div");
  badge.className = "rank-badge";
  badge.textContent = `${index + 1}位`;

  const thumb = document.createElement("img");
  thumb.className = "ranking-thumb";
  thumb.src = `https://i.ytimg.com/vi/${stat.firstItem.videoId}/hqdefault.jpg`;

  const seriesName = document.createElement("div");
  seriesName.className = "ranking-series";
  seriesName.textContent = stat.series;

  const meta = document.createElement("div");
  meta.className = "ranking-meta";
  meta.innerHTML = `
    <div class="ranking-meta-line">${label}</div>
    <div class="ranking-meta-line">${value}</div>
  `;

  card.appendChild(badge);
  card.appendChild(thumb);
  card.appendChild(seriesName);
  card.appendChild(meta);

  return card;
}

/* ========= グラフ描画 ========= */

function renderTimeGraph(seriesStats) {
  const labels = seriesStats.map(s => s.series);
  const timeData = seriesStats.map(s => s.sec);
  const colors = labels.map(s => SERIES_COLORS[s] || "#888");

  const canvas = document.getElementById("series-time-bar");
  if (!canvas) return;
  const ctxTime = canvas.getContext("2d");

  if (charts.timeBar) charts.timeBar.destroy();

  charts.timeBar = new Chart(ctxTime, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "シリーズ別配信時間",
        data: timeData,
        backgroundColor: colors
      }]
    },
    options: {
      plugins: {
        legend: { labels: { color: "#F9FAFB" } },
        tooltip: { callbacks: { label: c => formatHMS(c.raw) } }
      },
      scales: {
        x: { ticks: { color: "#E5E7EB" } },
        y: {
          ticks: {
            color: "#E5E7EB",
            stepSize: 36000,
            callback: v => formatHMS(v)
          }
        }
      }
    }
  });
}

function renderCountGraph(seriesStats) {
  const labels = seriesStats.map(s => s.series);
  const countData = seriesStats.map(s => s.count);
  const colors = labels.map(s => SERIES_COLORS[s] || "#888");

  const canvas = document.getElementById("series-count-bar");
  if (!canvas) return;
  const ctxCount = canvas.getContext("2d");

  if (charts.countBar) charts.countBar.destroy();

  charts.countBar = new Chart(ctxCount, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "シリーズ別配信回数",
        data: countData,
        backgroundColor: colors
      }]
    },
    options: {
      plugins: {
        legend: { labels: { color: "#F9FAFB" } },
        tooltip: { callbacks: { label: c => `${c.raw}回` } }
      },
      scales: {
        x: { ticks: { color: "#E5E7EB" } },
        y: {
          ticks: {
            color: "#E5E7EB",
            stepSize: 1,
            callback: v => `${v}回`
          }
        }
      }
    }
  });
}

/* ========= シリーズタブ ========= */

function renderSeriesTab(series) {
  const list = groupedBySeries[series];
  const heading = document.getElementById("series-title-heading");
  heading.textContent = `${series} のまとめ`;

  if (!list || list.length === 0) {
    document.getElementById("series-total-time").textContent = "-";
    document.getElementById("series-total-count").textContent = "-";
    document.getElementById("series-max-time").textContent = "-";
    document.getElementById("series-avg-time").textContent = "-";
    document.getElementById("series-period").textContent = "-";
    document.getElementById("series-top3-cards").innerHTML = "<p>データがありません。</p>";
    return;
  }

  let totalSec = 0;
  list.forEach(item => totalSec += parseDurationSeconds(item["配信時間"]));
  const count = list.length;
  const avgSec = count ? Math.floor(totalSec / count) : 0;

  const sortedByDuration = list.slice().sort(
    (a,b) => parseDurationSeconds(b["配信時間"]) - parseDurationSeconds(a["配信時間"])
  );
  const maxItem = sortedByDuration[0];

  const dates = list.map(i => new Date(i["配信日時"]));
  const min = new Date(Math.min(...dates));
  const max = new Date(Math.max(...dates));

  document.getElementById("series-total-time").textContent = formatHMS(totalSec);
  document.getElementById("series-total-count").textContent = `${count} 回`;
  document.getElementById("series-max-time").textContent = formatHMS(parseDurationSeconds(maxItem["配信時間"]));
  document.getElementById("series-avg-time").textContent = formatHMS(avgSec);
  document.getElementById("series-period").textContent = `${formatDate(min)} 〜 ${formatDate(max)}`;

  const top3Box = document.getElementById("series-top3-cards");
  top3Box.innerHTML = "";
  sortedByDuration.slice(0, 3).forEach((item, idx) => {
    const card = createEpisodeRankingCard(item, idx);
    top3Box.appendChild(card);
  });

  document.querySelectorAll("#series-top3-section .ranking-card").forEach(card => {
    card.classList.add("show");
  });
}

function createEpisodeRankingCard(item, index) {
  const card = document.createElement("div");
  card.className = "ranking-card fade-slide clickable";

  const badge = document.createElement("div");
  badge.className = "rank-badge";
  badge.textContent = `${index + 1}位`;

  const thumb = document.createElement("img");
  thumb.className = "ranking-thumb";
  thumb.src = `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;

  const titleDiv = document.createElement("div");
  titleDiv.className = "ranking-series";
  const short = getShortTitle(item);
  titleDiv.textContent = short;
  titleDiv.title = item["タイトル"];

  const meta = document.createElement("div");
  meta.className = "ranking-meta";
  const dt = new Date(item["配信日時"]);
  const timeText = formatHMS(parseDurationSeconds(item["配信時間"]));
  meta.innerHTML = `
    <div class="ranking-meta-line">配信日時</div>
    <div class="ranking-meta-line">${formatDateTime(dt)}</div>
    <div class="ranking-meta-line">配信時間</div>
    <div class="ranking-meta-line">${timeText}</div>
  `;

  card.appendChild(badge);
  card.appendChild(thumb);
  card.appendChild(titleDiv);
  card.appendChild(meta);

  card.addEventListener("click", () => {
    window.open(`https://www.youtube.com/watch?v=${item.videoId}`, "_blank");
  });

  return card;
}

/* 起動 */
main();
