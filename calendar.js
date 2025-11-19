/* =========================================
   配信カレンダー 完全版 calendar.js
   仕様：
   - 月曜始まり
   - 左パネル 15% / 右パネル 85%
   - サムネ付きイベント
   - 配信時間表示
   - シリーズの最終回判定
   - シリーズクリックでハイライト
   - スクロールなし（画面固定）
========================================= */

const JSON_URL = "streams_combined.json";

let allData = [];
let currentYear;
let currentMonth;
let highlightedSeries = null;
let seriesLastIdMap = {};

/* =========================================
   初期処理
========================================= */
async function main() {
  const data = await fetch(JSON_URL).then(r => r.json());
  allData = Object.values(data).flat();

  // シリーズごとの「最終回 videoId」を算出
  seriesLastIdMap = computeSeriesLastMap(allData);

  // 最初の月へ移動
  const firstDate = new Date(allData[0]["配信日時"]);
  currentYear = firstDate.getFullYear();
  currentMonth = firstDate.getMonth() + 1;

  renderCalendar(currentYear, currentMonth);
  listenControls();
}

/* =========================================
   シリーズごとの最終回 videoId を取得
========================================= */
function computeSeriesLastMap(data) {
  const map = {};
  const grouped = {};

  data.forEach(item => {
    const s = item.series;
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(item);
  });

  Object.keys(grouped).forEach(s => {
    grouped[s].sort(
      (a, b) => new Date(b["配信日時"]) - new Date(a["配信日時"])
    );
    map[s] = grouped[s][0].videoId;
  });

  return map;
}

/* =========================================
   省略タイトル（FF1 #1 / FF1 最終回）
========================================= */
function getShortTitle(item) {
  const series = item.series;

  // 最終回判定
  if (seriesLastIdMap[series] === item.videoId) {
    return `${series} 最終回`;
  }

  // #番号抽出
  const match = item["タイトル"].match(/#\s?(\d+)/);
  if (match) {
    return `${series} #${match[1]}`;
  }

  // 番号ない場合
  return `${series}`;
}

/* =========================================
   月移動ボタン
========================================= */
function listenControls() {
  document.getElementById("prev-month").addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    renderCalendar(currentYear, currentMonth);
  });

  document.getElementById("next-month").addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    renderCalendar(currentYear, currentMonth);
  });
}

/* =========================================
   カレンダー描画：月曜始まり
========================================= */
function renderCalendar(year, month) {
  document.getElementById("current-month-label").textContent =
    `${year}年 ${month}月`;

  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  /* ---------- 曜日（月〜日） ---------- */
  const weekdays = ["月", "火", "水", "木", "金", "土", "日"];
  weekdays.forEach(w => {
    const wCell = document.createElement("div");
    wCell.className = "weekday";
    wCell.textContent = w;
    calendar.appendChild(wCell);
  });

  /* ---------- 日付計算 ---------- */
  const first = new Date(year, month - 1, 1);

  // JS は日曜=0、月曜始まりに補正
  let startDay = (first.getDay() + 6) % 7;

  const lastDay = new Date(year, month, 0).getDate();

  // 空白セル
  for (let i = 0; i < startDay; i++) {
    calendar.appendChild(document.createElement("div"));
  }

  /* ---------- 月データ抽出 ---------- */
  const monthData = allData.filter(e => {
    const d = new Date(e["配信日時"]);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  // 左パネル更新
  updateStats(monthData);

  /* ---------- 日付セル作成 ---------- */
  for (let day = 1; day <= lastDay; day++) {
    const cell = document.createElement("div");
    cell.className = "day";

    const num = document.createElement("div");
    num.className = "day-number";
    num.textContent = day;
    cell.appendChild(num);

    // その日の配信
    const events = monthData.filter(
      e => new Date(e["配信日時"]).getDate() === day
    );

    events.forEach(ev => {
      const item = document.createElement("div");
      item.className = "event-item";

      // ハイライト
      if (highlightedSeries && ev.series === highlightedSeries) {
        item.style.background = "#5A3E8F";
        item.style.borderColor = "#D7A7E9";
      }

      const shortTitle = getShortTitle(ev);
      const youtube = `https://www.youtube.com/watch?v=${ev.videoId}`;
      const thumb = `https://i.ytimg.com/vi/${ev.videoId}/hqdefault.jpg`;

      item.innerHTML = `
        <img class="event-thumb" src="${thumb}">
        <div class="event-text">
          <a class="event-title" href="${youtube}" target="_blank">
            ${shortTitle}
          </a>
          <span class="event-time">${ev["配信時間"]}</span>
        </div>
      `;

      cell.appendChild(item);
    });

    calendar.appendChild(cell);
  }
}

/* =========================================
   左パネル（統計）
========================================= */
function updateStats(list) {
  /* 総配信時間 */
  let totalSec = 0;

  list.forEach(item => {
    const [h, m, s] = item["配信時間"].split(":").map(Number);
    totalSec += h * 3600 + m * 60 + s;
  });

  const H = Math.floor(totalSec / 3600);
  const M = Math.floor((totalSec % 3600) / 60);

  document.getElementById("month-total-time").textContent =
    `${H}時間 ${M}分`;

  /* 配信回数 */
  document.getElementById("month-count").textContent =
    `${list.length} 回`;

  /* シリーズ一覧 */
  const seriesSet = [...new Set(list.map(i => i.series))];
  const sList = document.getElementById("series-list");
  sList.innerHTML = "";

  seriesSet.forEach(s => {
    const li = document.createElement("li");
    li.textContent = s;

    li.addEventListener("click", () => {
      highlightedSeries = s;
      renderCalendar(currentYear, currentMonth);
    });

    sList.appendChild(li);
  });
}

/* =========================================
   起動
========================================= */
main();
