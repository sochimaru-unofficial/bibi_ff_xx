const JSON_URL = "streams_combined.json";

let data = {};
let flatList = [];

async function main() {
  data = await fetch(JSON_URL).then(res => res.json());
  flatList = Object.values(data).flat();

  document.getElementById("series-select").addEventListener("change", () => {
    updateView();
  });

  updateView();
}

function updateView() {
  const series = document.getElementById("series-select").value;

  let list = [];
  if (series === "all") {
    list = flatList;
  } else {
    list = data[series] || [];
  }

  renderStats(list);
  renderCards(list);
}

function renderStats(list) {
  const count = list.length;
  document.getElementById("count").textContent = count + " 回";

  // 総配信時間
  let totalMinutes = 0;
  list.forEach(item => {
    if (item.duration) {
      const parts = item.duration.split(":");
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      totalMinutes += h * 60 + m;
    }
  });
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;

  document.getElementById("total-time").textContent = `${hh}時間${mm}分`;

  // 期間
  const dates = list
    .filter(i => i.start_time)
    .map(i => new Date(i.start_time));

  if (dates.length > 0) {
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    document.getElementById("range").textContent =
      `${formatDate(min)} 〜 ${formatDate(max)}`;
  } else {
    document.getElementById("range").textContent = "なし";
  }
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = ("0" + (date.getMonth() + 1)).slice(0 - 2);
  const d = ("0" + date.getDate()).slice(0 - 2);
  return `${y}/${m}/${d}`;
}

function renderCards(list) {
  const container = document.getElementById("list");
  container.innerHTML = "";

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img class="thumb" src="${item.thumbnail_url}" />

      <div class="info">
        <div class="title">${item.title}</div>
        <div class="meta">
          日付：${item.start_time}<br>
          配信時間：${item.duration}<br>
          <a href="${item.youtube_url}" target="_blank">YouTubeリンク</a>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

main();
