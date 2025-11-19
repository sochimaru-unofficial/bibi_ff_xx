const JSON_URL = "streams_combined.json";

let data = {};
let flatList = [];

async function main() {
  data = await fetch(JSON_URL).then(res => res.json());

  // 全シリーズをフラットにまとめる
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
  // 配信回数
  document.getElementById("count").textContent = list.length + " 回";

  // ------- 総配信時間 -------
  let totalSeconds = 0;
  list.forEach(item => {
    if (!item["配信時間"]) return;

    // "HH:MM:SS" → 秒に変換
    const [h, m, s] = item["配信時間"].split(":").map(Number);
    totalSeconds += h * 3600 + m * 60 + s;
  });

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  document.getElementById("total-time").textContent =
    `${hours}時間 ${minutes}分 ${seconds}秒`;

  // ------- 配信期間 -------
  const dates = list
    .filter(i => i["配信日時"])
    .map(i => new Date(i["配信日時"]));

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
  const m = ("0" + (date.getMonth() + 1)).slice(-2);
  const d = ("0" + date.getDate()).slice(-2);
  return `${y}/${m}/${d}`;
}

function renderCards(list) {
  const container = document.getElementById("list");
  container.innerHTML = "";

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    // YouTube URL とサムネ
    const youtube = `https://www.youtube.com/watch?v=${item.videoId}`;
    const thumb = `https://i.ytimg.com/vi/${item.videoId}/maxresdefault.jpg`;

    card.innerHTML = `
      <img class="thumb" src="${thumb}" />

      <div class="info">
        <div class="title">${item["タイトル"]}</div>
        <div class="meta">
          日付：${item["配信日時"]}<br>
          配信時間：${item["配信時間"]}<br>
          <a href="${youtube}" target="_blank">YouTubeリンク</a>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

main();
