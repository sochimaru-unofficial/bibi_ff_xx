const JSON_URL = "streams_combined.json";

let allData = [];
let currentYear;
let currentMonth;

async function main() {
  const data = await fetch(JSON_URL).then(r => r.json());
  allData = Object.values(data).flat();

  // 初期表示は「最初の配信の年月」
  const firstDate = new Date(allData[0]["配信日時"]);
  currentYear = firstDate.getFullYear();
  currentMonth = firstDate.getMonth() + 1;

  renderCalendar(currentYear, currentMonth);

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
  const label = document.getElementById("current-month-label");
  label.textContent = `${year}年 ${month}月`;

  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  // --- 曜日ラベル ---
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  weekdays.forEach(w => {
    const wCell = document.createElement("div");
    wCell.className = "weekday";
    wCell.textContent = w;
    calendar.appendChild(wCell);
  });

  // 月初の曜日
  const first = new Date(year, month - 1, 1);
  const startDay = first.getDay();

  // 月末の日付
  const last = new Date(year, month, 0).getDate();

  // 空白セル
  for (let i = 0; i < startDay; i++) {
    const empty = document.createElement("div");
    calendar.appendChild(empty);
  }

  // 日付セル作成
  for (let day = 1; day <= last; day++) {
    const cell = document.createElement("div");
    cell.className = "day";

    const num = document.createElement("div");
    num.className = "day-number";
    num.textContent = day;

    cell.appendChild(num);

    // その日に該当する動画を取得
    const events = allData.filter(e => {
      const d = new Date(e["配信日時"]);
      return (
        d.getFullYear() === year &&
        d.getMonth() + 1 === month &&
        d.getDate() === day
      );
    });

    events.forEach(ev => {
      const item = document.createElement("div");
      item.className = "event-item";

      const youtube = `https://www.youtube.com/watch?v=${ev.videoId}`;

      item.innerHTML = `
        <a href="${youtube}" target="_blank">
          ${ev["タイトル"].slice(0, 20)}…
        </a>
      `;

      cell.appendChild(item);
    });

    calendar.appendChild(cell);
  }
}

main();
