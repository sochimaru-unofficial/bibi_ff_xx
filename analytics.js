const JSON_URL = "streams_combined.json";

let allData = [];
let groupedBySeries = {};
let charts = {};
const SERIES_LIST = [
  "FF1","FF2","FF3","FF4","FF5","FF6","FF7",
  "FF8","FF9","FF10","FF12","FF13","FF14","FF15","FF16"
];

async function main() {
  const data = await fetch(JSON_URL).then(r => r.json());
  allData = Object.values(data).flat();

  // シリーズごとにグループ化
  groupedBySeries = {};
  allData.forEach(item => {
    const s = item.series;
    if (!groupedBySeries[s]) groupedBySeries[s] = [];
    groupedBySeries[s].push(item);
  });

  setupTabs();
  renderTotalTab();   // デフォルト：トータル
  setupObserver();
}

/* ========== ユーティリティ ========== */

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

/* ========== タブ ========== */

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

  // まず完全にアニメ状態をリセット
  document.querySelectorAll(".fade-slide").forEach(el => {
    el.classList.remove("show");
  });

  if (series === "total") {
    totalPanel.classList.remove("hidden");
    seriesPanel.classList.add("hidden");

    // 再描画
    renderTotalTab();

    // アニメ再実行
    triggerFadeSlide(totalPanel);

  } else {
    totalPanel.classList.add("hidden");
    seriesPanel.classList.remove("hidden");

    // 再描画
    renderSeriesTab(series);

    // アニメ再実行
    triggerFadeSlide(seriesPanel);
  }
}

function triggerFadeSlide(panel) {
  // 再度 Observer 発火させてアニメ開始
  const targets = panel.querySelectorAll(".fade-slide");
  targets.forEach(el => {
    // アニメを少し遅らせる
    setTimeout(() => el.classList.add("show"), 30);
  });
}


/* ========== トータルタブ ========== */

function renderTotalTab() {
  let totalSec = 0;
  let totalCount = allData.length;

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

    seriesStats.push({
      series: s,
      count: list.length,
      sec,
      periodMs,
      firstItem: list.slice().sort((a,b)=>new Date(a["配信日時"]) - new Date(b["配信日時"]))[0]
    });

    totalSec += sec;
  });

  // まとめ
  document.getElementById("sum-total-time").textContent = formatHMS(totalSec);
  document.getElementById("sum-total-count").textContent = `${totalCount} 回`;
  const avgSec = totalCount ? Math.floor(totalSec / totalCount) : 0;
  document.getElementById("sum-avg-time").textContent = formatHMS(avgSec);

  // ランキング生成
  renderTotalRankings(seriesStats);

  // グラフ生成
  renderTotalCharts(seriesStats);
}

function renderTotalRankings(seriesStats) {
  const mostCountBox = document.getElementById("ranking-most-count");
  const mostTimeBox = document.getElementById("ranking-most-time");
  const longestPeriodBox = document.getElementById("ranking-longest-period");

  mostCountBox.innerHTML = "";
  mostTimeBox.innerHTML = "";
  longestPeriodBox.innerHTML = "";

  // 最多配信回数
  const byCount = seriesStats.slice().sort((a,b)=>b.count - a.count).slice(0,3);
  byCount.forEach((st, idx) => {
    mostCountBox.appendChild(createSeriesRankingCard(st, idx, `配信回数：${st.count} 回`));
  });

  // 最長総時間
  const bySec = seriesStats.slice().sort((a,b)=>b.sec - a.sec).slice(0,3);
  bySec.forEach((st, idx) => {
    mostTimeBox.appendChild(createSeriesRankingCard(st, idx, `総配信時間：${formatHMS(st.sec)}`));
  });

  // 最長期間
  const byPeriod = seriesStats.slice().sort((a,b)=>b.periodMs - a.periodMs).slice(0,3);
  byPeriod.forEach((st, idx) => {
    const dates = groupedBySeries[st.series].map(i=>new Date(i["配信日時"]));
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    const periodText = `${formatDate(min)} 〜 ${formatDate(max)}`;
    longestPeriodBox.appendChild(createSeriesRankingCard(st, idx, `期間：${periodText}`));
  });
}

function createSeriesRankingCard(stat, index, lineText) {
  const card = document.createElement("div");
  card.className = "ranking-card fade-slide";

  const rankBadge = document.createElement("div");
  rankBadge.className = "rank-badge";
  rankBadge.textContent = `${index + 1}位`;

  const thumb = document.createElement("img");
  thumb.className = "ranking-thumb";
  const vid = stat.firstItem.videoId;
  thumb.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

  const body = document.createElement("div");
  body.className = "ranking-body";

  const title = document.createElement("div");
  title.className = "ranking-title";
  title.textContent = stat.series;

  const meta = document.createElement("div");
  meta.className = "ranking-meta";
  meta.textContent = lineText;

  body.appendChild(title);
  body.appendChild(meta);

  card.appendChild(rankBadge);
  card.appendChild(thumb);
  card.appendChild(body);

  return card;
}

/* ========== トータル グラフ ========== */

function renderTotalCharts(seriesStats) {
  const labels = seriesStats.map(s=>s.series);
  const timeData = seriesStats.map(s=>s.sec);
  const countData = seriesStats.map(s=>s.count);

  const commonOptions = {
    plugins: {
      legend: {
        labels: {
          color: "#F9FAFB"
        }
      },
      tooltip: {
        callbacks: {
          label: ctx => {
            if (ctx.dataset.label.includes("時間")) {
              const sec = ctx.raw;
              return `${ctx.dataset.label}: ${formatHMS(sec)}`;
            } else {
              return `${ctx.dataset.label}: ${ctx.raw}`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: "#E5E7EB" },
        grid: { color: "rgba(55, 65, 81, 0.4)" }
      },
      y: {
        ticks: { color: "#E5E7EB" },
        grid: { color: "rgba(55, 65, 81, 0.4)" }
      }
    }
  };

  // 時間（棒グラフ）
  const ctxTime = document.getElementById("series-time-bar").getContext("2d");
  if (charts.timeBar) charts.timeBar.destroy();
  charts.timeBar = new Chart(ctxTime, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "シリーズ別配信時間",
        data: timeData,
        backgroundColor: "#F59E0B"
      }]
    },
    options: commonOptions
  });

  // 回数（棒グラフ）
  const ctxCount = document.getElementById("series-count-bar").getContext("2d");
  if (charts.countBar) charts.countBar.destroy();
  charts.countBar = new Chart(ctxCount, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "シリーズ別配信回数",
        data: countData,
        backgroundColor: "#6366F1"
      }]
    },
    options: commonOptions
  });
}

/* ========== シリーズタブ ========== */

function renderSeriesTab(series) {
  const list = groupedBySeries[series];

  const heading = document.getElementById("series-title-heading");
  heading.textContent = `${series} の分析`;

  if (!list || list.length === 0) {
    document.getElementById("series-total-time").textContent = "データなし";
    document.getElementById("series-total-count").textContent = "-";
    document.getElementById("series-max-time").textContent = "-";
    document.getElementById("series-avg-time").textContent = "-";
    document.getElementById("series-period").textContent = "-";
    document.getElementById("series-top3-cards").innerHTML = "<p>データがありません。</p>";
    return;
  }

  // 時間系
  let totalSec = 0;
  list.forEach(item => totalSec += parseDurationSeconds(item["配信時間"]));
  const count = list.length;
  const avgSec = count ? Math.floor(totalSec / count) : 0;

  // 最長配信
  const sortedByDuration = list.slice().sort(
    (a,b)=>parseDurationSeconds(b["配信時間"]) - parseDurationSeconds(a["配信時間"])
  );
  const maxItem = sortedByDuration[0];

  // 期間
  const dates = list.map(i=>new Date(i["配信日時"]));
  const min = new Date(Math.min(...dates));
  const max = new Date(Math.max(...dates));

  document.getElementById("series-total-time").textContent = formatHMS(totalSec);
  document.getElementById("series-total-count").textContent = `${count} 回`;
  document.getElementById("series-max-time").textContent = formatHMS(parseDurationSeconds(maxItem["配信時間"]));
  document.getElementById("series-avg-time").textContent = formatHMS(avgSec);
  document.getElementById("series-period").textContent =
    `${formatDate(min)} 〜 ${formatDate(max)}`;

  // 最長配信TOP3
  const top3Box = document.getElementById("series-top3-cards");
  top3Box.innerHTML = "";
  sortedByDuration.slice(0,3).forEach((item, idx) => {
    top3Box.appendChild(createEpisodeRankingCard(item, idx));
  });
}

function createEpisodeRankingCard(item, index) {
  const card = document.createElement("div");
  card.className = "ranking-card fade-slide";

  const rankBadge = document.createElement("div");
  rankBadge.className = "rank-badge";
  rankBadge.textContent = `${index + 1}位`;

  const thumb = document.createElement("img");
  thumb.className = "ranking-thumb";
  thumb.src = `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;

  const body = document.createElement("div");
  body.className = "ranking-body";

  const short = getShortTitle(item);
  const full = item["タイトル"];

  const titleDiv = document.createElement("div");
  titleDiv.className = "ranking-title";
  titleDiv.textContent = short;
  titleDiv.title = full; // hover でフルタイトル

  const meta = document.createElement("div");
  meta.className = "ranking-meta";
  const dt = new Date(item["配信日時"]);
  const timeText = formatHMS(parseDurationSeconds(item["配信時間"]));
  meta.textContent = `${formatDateTime(dt)} ／ ${timeText}`;

  body.appendChild(titleDiv);
  body.appendChild(meta);

  card.appendChild(rankBadge);
  card.appendChild(thumb);
  card.appendChild(body);

  card.addEventListener("click", () => {
    window.open(`https://www.youtube.com/watch?v=${item.videoId}`, "_blank");
  });

  return card;
}

/* ========== スクロール・アニメーション ========== */

function setupObserver() {
  const targets = document.querySelectorAll(".fade-slide");
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("show");
      }
    });
  }, { threshold: 0.2 });

  targets.forEach(t => observer.observe(t));
}

/* 起動 */
main();
