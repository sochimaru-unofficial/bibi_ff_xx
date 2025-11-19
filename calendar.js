const JSON_URL = "streams_combined.json";

let allData = [];
let currentYear;
let currentMonth;
let highlightedSeries = null;

async function main() {
  const data = await fetch(JSON_URL).then(r => r.json());
  allData = Object.values(data).flat();

  const firstDate = new Date(allData[0]["配信日時"]);
  currentYear = firstDate.getFullYear();
  currentMonth = firstDate.getMonth() + 1;

  renderCalendar(currentYear, currentMonth);
  listenControls();
}

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

function renderCalendar(year, month) {
  document.getElementById("current-month-label").textContent =
    `${year}年 ${month}月`;

  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  /* ===== 曜日ラベル（月曜始まり） ===== */
  const weekdays = ["月", "火", "水", "木", "金", "土", "日"];
  weekdays.forEach(w => {
    const wCell = document.createElement("div");
    wCell.className = "weekday";
    wCell.textContent = w;
    calendar.appendChild(wCell);
  });

  /* ===== 日付計算 ===== */
  const first = new Date(year, month - 1, 1);
  let startDay = first.getDay(); // 0=日
  startDay = (startDay + 6) % 7; // 月曜始まりに調整

  const lastDay = new Date(year, month, 0).getDate();

  for (let i = 0; i < startDay; i++) {
    calendar.appendChild(document.createElement("div"));
  }

  /* ===== 日付セル生成 ===== */
  const monthData = allData.filter(e => {
    const d = new Date(e["配信日時"]);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  // ▼ 左パネルに統計を反映
  updateStats(monthData);

  for (let day = 1; day <= lastDay; day++) {
    const cell = document.createElement("div");
    cell.className = "day";

    const num = document.createElement("div");
    num.className = "day-number";
    num.textContent = day;
    cell.appendChild(num);

    const events = monthData.filter(e => new Date(e["配信日時"]).getDate() === day);

    events.forEach(ev => {
      const item = document.createElement("div");
      item.className = "event-item";

      if (highlightedSeries && ev.series === highlightedSeries) {
        item.style.background = "#5A3E8F";
        item.style.borderColor = "#D7A7E9";
      }

      item.innerHTML =
        `<a href="https://www.youtube.com/watch?v=${ev.videoId}" target="_blank">
          ${ev["タイトル"].slice(0, 12)}…
        </a>`;

      cell.appendChild(item);
    });

    calendar.appendChild(cell);
  }
}

/* ===== 左パネル更新 ===== */
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

main();
