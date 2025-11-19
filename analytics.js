const JSON_URL = "streams_combined.json";

let allData = [];

/* ========== 初期処理 ========== */
async function main() {
  const data = await fetch(JSON_URL).then(r => r.json());
  allData = Object.values(data).flat();

  renderGlobalStats();
  renderSeriesStats();
  renderCharts();
  setupAnimations();
}


/* =====================================================
   ① 全体統計
===================================================== */
function renderGlobalStats() {
  let totalSec = 0;
  let count = allData.length;

  allData.forEach(item => {
    const [h, m, s] = item["配信時間"].split(":").map(Number);
    totalSec += h * 3600 + m * 60 + s;
  });

  const H = Math.floor(totalSec / 3600);
  const M = Math.floor((totalSec % 3600) / 60);

  document.getElementById("total-time").textContent = `${H}時間 ${M}分`;
  document.getElementById("total-count").textContent = `${count} 回`;

  const avgSec = totalSec / count;
  const avgH = Math.floor(avgSec / 3600);
  const avgM = Math.floor((avgSec % 3600) / 60);

  document.getElementById("avg-time").textContent = `${avgH}時間 ${avgM}分`;
}

/* =====================================================
   ② シリーズ別分析
===================================================== */
function renderSeriesStats() {
  const grouped = {};

  allData.forEach(item => {
    const s = item.series;
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(item);
  });

  const container = document.getElementById("series-cards");

  Object.keys(grouped).forEach(series => {
    const list = grouped[series];

    // 時間集計
    let sec = 0;
    list.forEach(item => {
      const [h, m, s] = item["配信時間"].split(":").map(Number);
      sec += h * 3600 + m * 60 + s;
    });

    const H = Math.floor(sec / 3600);
    const M = Math.floor((sec % 3600) / 60);

    // 期間
    const dates = list.map(i => new Date(i["配信日時"]));
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    const days =
      Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1;

    const card = document.createElement("div");
    card.className = "series-card fade-up";

    card.innerHTML = `
      <div class="series-title">${series}</div>
      <div class="series-item">総時間：${H}時間 ${M}分</div>
      <div class="series-item">回数：${list.length} 回</div>
      <div class="series-item">平均：${Math.floor(H/list.length)}時間 ${
      Math.floor((sec/list.length)%3600/60)
    }分</div>
      <div class="series-item">プレイ期間：${format(min)} 〜 ${format(max)}（${days}日）</div>
    `;

    container.appendChild(card);
  });
}

function format(d) {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/* =====================================================
   ⑤ グラフ描画（Chart.js）
===================================================== */
function renderCharts() {
  const seriesTime = {};
  const monthTime = {};
  let totalSec = 0;

  allData.forEach(item => {
    const s = item.series;
    const d = new Date(item["配信日時"]);
    const ym = `${d.getFullYear()}-${d.getMonth() + 1}`;

    const [h, m, sec] = item["配信時間"].split(":").map(Number);
    const t = h * 3600 + m * 60 + sec;
    totalSec += t;

    seriesTime[s] = (seriesTime[s] || 0) + t;
    monthTime[ym] = (monthTime[ym] || 0) + t;
  });

  /* --- 円グラフ --- */
  new Chart(document.getElementById("pie-chart"), {
    type: "pie",
    data: {
      labels: Object.keys(seriesTime),
      datasets: [
        {
          data: Object.values(seriesTime),
          backgroundColor: [
            "#C084FC", "#A78BFA", "#818CF8", "#60A5FA",
            "#34D399", "#F472B6", "#FACC15", "#FB923C"
          ]
        }
      ]
    }
  });

  /* --- 棒グラフ --- */
  new Chart(document.getElementById("bar-chart"), {
    type: "bar",
    data: {
      labels: Object.keys(monthTime),
      datasets: [
        {
          label: "月別配信時間（秒）",
          data: Object.values(monthTime),
          backgroundColor: "#A78BFA"
        }
      ]
    }
  });

  /* --- 折れ線グラフ（累計時間） --- */
  let cumulative = [];
  let running = 0;
  Object.values(monthTime).forEach(v => {
    running += v;
    cumulative.push(running);
  });

  new Chart(document.getElementById("line-chart"), {
    type: "line",
    data: {
      labels: Object.keys(monthTime),
      datasets: [
        {
          label: "累計配信時間",
          data: cumulative,
          borderColor: "#C084FC"
        }
      ]
    }
  });
}

/* =====================================================
   スクロールアニメーション
===================================================== */
function setupAnimations() {
  const targets = document.querySelectorAll(".fade-up");

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("show");
      }
    });
  }, { threshold: 0.2 });

  targets.forEach(el => observer.observe(el));
}

/* 起動 */
main();
