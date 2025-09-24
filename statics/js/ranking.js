// config.jsonから設定を読み込み
let api_url = "";

document.addEventListener('DOMContentLoaded', () => {
    fetch("statics/json/config.json")
        .then(res => res.json())
        .then(config => {
            // APIのURLを、集計済みのランキングデータを返すエンドポイントに変更する
            ranking_url = config.RANKING_API_URL;
            loadRankingData();
        })
        .catch(err => {
            console.error("config.json の読み込み失敗:", err);
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('rankingContainer').innerHTML = "<p>設定ファイルの読み込みに失敗しました。</p>";
        });
});

/* -------------------------
   ランキングデータ取得
   ------------------------- */
async function loadRankingData() {
    try {
        // 集計済みのランキングデータをAPIから直接取得する
        const rankingRes = await fetch(ranking_url);
        if (!rankingRes.ok) {
            throw new Error(`HTTP error! Status: ${rankingRes.status}`);
        }
        const ranking = await rankingRes.json();
        
        renderRanking(ranking);
    } catch (err) {
        console.error("ランキングデータの取得に失敗:", err);
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('rankingContainer').innerHTML = "<p>データの取得に失敗しました。時間をおいて再度お試しください。</p>";
        document.getElementById('rankingContainer').classList.remove('hidden');
    }
}

/* -------------------------
   レンダリング
   ------------------------- */
function renderRanking(ranking) {
    const container = document.getElementById('rankingContainer');
    container.innerHTML = ''; // コンテナをクリア

    // 投票データがない場合の処理
    if (ranking.length === 0) {
        container.innerHTML = "<p>投票データがありません。</p>";
        container.classList.remove('hidden');
        document.getElementById('loading').classList.add('hidden');
        return; // これ以上処理しない
    }
    
    let currentRank = 0;
    let prevVotes = -1;
    
    ranking.forEach((player, index) => {
        // 同票数の場合は同順位にする
        if (player.votes !== prevVotes) {
            currentRank = index + 1;
        }
        prevVotes = player.votes;
        
        const item = document.createElement('div');
        item.className = 'ranking-item';
        item.innerHTML = `
            <div class="rank">${currentRank}位</div>
            <div class="rank-name">${escapeHtml(player.name)}</div>
            <div class="rank-number">#${player.number}</div>
            <div class="vote-count">${player.votes}</div>
        `;
        container.appendChild(item);
    });
    
    document.getElementById('loading').classList.add('hidden');
    container.classList.remove('hidden');
}

/* -------------------------
   ユーティリティ
   ------------------------- */
function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}
