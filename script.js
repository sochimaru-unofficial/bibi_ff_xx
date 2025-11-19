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

  let list = series === "all"
    ? flatList
    : data[series] || [];

  renderStats(list);
  renderCards(list);
}

function renderStats(list) {
  document.getElementById("count").textContent = list.length + " 回";

  // === 総配信時間（秒計算 → H/M/S） ===
  let totalSec = 0;

  list.forEach(item => {
    if (!item["配信時間"]) return;

    const [h, m, s] = item["配信時間"].split(":").map(Number);
    totalSec += h * 3600 + m * 60 + s;
  });

  const H = Math.floor(totalSec / 3600);
  const M = Math.floor((totalSec % 3600) / 60);
  const S = totalSec % 60;

  document.getElementById("total-time").textContent =
    `${H}時間 ${M}分 ${S}秒`;

  // === 期間 ===
  const dates = list
    .filter(i => i["配信日時"])
    .map(i => new Date(i["配信日時"]));

  if (dates.length) {
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));

    document.getElementById("range").textContent =
      `${fmt(min)} 〜 ${fmt(max)}`;
  } else {
    document.getElementById("range").textContent = "なし";
  }
}

// ★ 日付を「2025年3月22日12時開始」へ
function fmt(d) {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");

  return `${year}年${month}月${day}日${hour}時${min}分開始`;
}

function renderCards(list) {
  const container = document.getElementById("list");
  container.innerHTML = "";

  list.forEach(item => {
    const youtube = `https://www.youtube.com/watch?v=${item.videoId}`;
    const thumb = `https://i.ytimg.com/vi/${item.videoId}/maxresdefault.jpg`;

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <a class="thumb-wrapper" href="${youtube}" target="_blank">
        <img class="thumb" src="${thumb}" />
      </a>

      <div class="title">${item["タイトル"]}</div>
      <div class="meta">
        ${fmt(new Date(item["配信日時"]))}<br>
        配信時間：${item["配信時間"]}<br>
        <a href="${youtube}" target="_blank">YouTubeリンク</a>
      </div>
    `;

    container.appendChild(card);
  });
}

main();
