const JSON_URL = "streams_combined.json";

async function main() {
  const data = await fetch(JSON_URL).then(res => res.json());
  const flat = Object.values(data).flat();

  // 配信日時の昇順でソート
  flat.sort((a, b) => new Date(a["配信日時"]) - new Date(b["配信日時"]));

  // 年 → 月 → 日ごとに分類する Map
  const grouped = {};

  flat.forEach(item => {
    const date = new Date(item["配信日時"]);

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if (!grouped[year]) grouped[year] = {};
    if (!grouped[year][month]) grouped[year][month] = {};
    if (!grouped[year][month][day]) grouped[year][month][day] = [];

    grouped[year][month][day].push(item);
  });

  renderTimeline(grouped);
}

function renderTimeline(grouped) {
  const container = document.getElementById("timeline");

  Object.keys(grouped).sort().forEach(year => {
    const yBlock = document.createElement("div");
    yBlock.className = "year-block";
    yBlock.innerHTML = `<div class="year-title">${year}年</div>`;

    const months = grouped[year];

    Object.keys(months).sort((a, b) => a - b).forEach(month => {
      const mBlock = document.createElement("div");
      mBlock.className = "month-block";
      mBlock.innerHTML = `<div class="month-title">${month}月</div>`;

      const days = months[month];

      Object.keys(days).sort((a, b) => a - b).forEach(day => {
        const dBlock = document.createElement("div");
        dBlock.className = "day-block";

        const items = days[day];

        dBlock.innerHTML = `<strong>${day}日</strong>`;

        items.forEach(item => {
          const youtube = `https://www.youtube.com/watch?v=${item.videoId}`;
          const v = document.createElement("div");
          v.className = "video-item";

          v.innerHTML = `
            <a href="${youtube}" target="_blank">${item["タイトル"]}</a><br>
            <span style="color:#C5BAD5;">
              ${formatDate(item["配信日時"])} ／ ${item["配信時間"]}
            </span>
          `;

          dBlock.appendChild(v);
        });

        mBlock.appendChild(dBlock);
      });

      yBlock.appendChild(mBlock);
    });

    container.appendChild(yBlock);
  });
}

// 日本語日付フォーマット
function formatDate(str) {
  const d = new Date(str);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const mi = String(d.getMinutes()).padStart(2, "0");

  return `${y}年${m}月${day}日 ${h}時${mi}分`;
}

main();
