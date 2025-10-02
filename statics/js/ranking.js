// config.jsonから設定を読み込み
let api_url = "";
let allRankingData = [];
let match_date = "";
let arena = "";

const TEAM_NAMES = {
    'home': '',  // 例: 'ライオンズ'
    'visitor': '' // 例: 'ドラゴンズ'
};
const matchDisoplayEl = document.getElementById('matchDisplay');
const arenaDisplayEl = document.getElementById('arenaDisplay');
const modalRoot = document.getElementById('modalRoot');

document.addEventListener('DOMContentLoaded', () => {
    fetch("statics/json/config.json")
        .then(res => res.json())
        .then(config => {
            // APIのURLを、集計済みのランキングデータを返すエンドポイントに変更する
            ranking_url = config.RANKING_API_URL;
            match_date = config.MATCH_DATE;
            arena = config.ARENA;
            TEAM_NAMES.home = config.HOME_TEAM[0];
            TEAM_NAMES.visitor = config.VISITOR_TEAM[0];
            matchDisoplayEl.textContent = `HOME: ${TEAM_NAMES.home}　AWAY: ${TEAM_NAMES.visitor}`;
            arenaDisplayEl.textContent = `開催日: ${match_date} 会場: ${arena}`;
            loadRankingData();
            // ボタンのイベントリスナーを設定
            setupFilterButtons(); 
        })
        .catch(err => {
            console.error("config.json の読み込み失敗:", err);
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('rankingContainer').innerHTML = "<p>設定ファイルの読み込みに失敗しました。</p>";
        });
});

function calcAge(birthStr) {
  // "2025年1月1日" → "2025-01-01" に変換
  const normalized = birthStr.replace("年", "-").replace("月", "-").replace("日", "");
  const birthDate = new Date(normalized);

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();

  // 誕生日がまだ来ていなければ1歳引く
  const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (today < thisYearBirthday) {
    age--;
  }

  return age;
}

/* -------------------------
   ランキングデータ取得
   ------------------------- */
async function loadRankingData() {
    try {
        // 集計済みのランキングデータをAPIから直接取得する
        // const rankingRes = await fetch(ranking_url);
        const rankingRes = await fetch(`${ranking_url}?match_date=${match_date}`);
        if (!rankingRes.ok) {
            throw new Error(`HTTP error! Status: ${rankingRes.status}`);
        }
        const ranking = await rankingRes.json();

        // 【変更】取得した全データをグローバル変数に保存
        allRankingData = ranking;
        // console.log(allRankingData)
        
        // 初期表示は「全体」のデータをレンダリング
        filterAndRenderRanking('all');
        
        renderRanking(ranking);
    } catch (err) {
        console.error("ランキングデータの取得に失敗:", err);
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('rankingContainer').innerHTML = "<p>データの取得に失敗しました。時間をおいて再度お試しください。</p>";
        document.getElementById('rankingContainer').classList.remove('hidden');
    }
}
/* -------------------------
   【新規】ランキングのフィルタリングとレンダリング
   ------------------------- */
/**
 * @param {string} team_type - フィルタリングするチームタイプ ('all', 'home', 'visitor')
 */
function filterAndRenderRanking(team_type) {
    let filteredRanking = [];

    if (team_type === 'all') {
        // 'all' の場合は全データを使用
        filteredRanking = allRankingData;
        // console.log("all");
    } else {
        // ボタンのID（'home' or 'visitor'）から、実際の日本語チーム名を取得
        const targetTeamName = TEAM_NAMES[team_type];
        // console.log(team_type);
        // console.log(allRankingData);
        // 'home' または 'visitor' の場合はデータをフィルタリング
        // プレイヤーオブジェクトの 'team' プロパティが targetTeamName と一致するものを抽出します
        filteredRanking = allRankingData.filter(player => player.team === targetTeamName);
    }

    // フィルタリングされたデータでレンダリング関数を呼び出し
    renderRanking(filteredRanking);
}

/* -------------------------
   【新規】ボタンのイベントリスナー設定
   ------------------------- */
function setupFilterButtons() {
    const showAllButton = document.getElementById('showAll');
    const showHomeButton = document.getElementById('showHome');
    const showVisitorButton = document.getElementById('showVisitor');
    const buttons = [showAllButton, showHomeButton, showVisitorButton];

    buttons.forEach(button => {
        button.addEventListener('click', (event) => {
            // 全てのボタンから 'active' クラスを削除して、クリックされたボタンに 'active' を付与
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            let teamType = 'all';
            if (event.target.id === 'showHome') {
                teamType = 'home';
            } else if (event.target.id === 'showVisitor') {
                teamType = 'visitor';
            }
            
            // フィルタリングとレンダリングを実行
            filterAndRenderRanking(teamType);
        });
    });
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
    // 【新規】ビジターチームのチーム名を取得
    const VISITOR_TEAM_NAME = TEAM_NAMES.visitor; 
    // 【新規】ビジターチーム用の背景色を定義
    const VISITOR_BG_COLOR = '#edededff'; // 少し暗い色 (例: 薄いグレー)


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
        // 【修正点】ビジターチームの場合にインラインスタイルを設定
        if (player.team === VISITOR_TEAM_NAME) {
            item.style.backgroundColor = VISITOR_BG_COLOR;
        }
        item.innerHTML = `
            <div class="rank">${currentRank}位</div>
            <div class="rank-name">${escapeHtml(player.name)}</div>
            <div class="rank-number">#${player.number}</div>
            <div class="vote-count">${player.votes}</div>
        `;
        item.addEventListener('click', () => openModalPlayer(player.id,ranking));
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') openModalPlayer(player.id,ranking)
        });
        container.appendChild(item);
    });
    
    document.getElementById('loading').classList.add('hidden');
    container.classList.remove('hidden');
}

function openModalPlayer(id,ranking) {
  const p = ranking.find(x => x.id === id);
  // ★ 修正: チーム名に応じてコードを切り替える
  let teamCodeForHA = '';
  if (p.team === TEAM_NAMES.home) {
      teamCodeForHA = "H"; // HOMEチームならHOMEコードを使用
  } else if (p.team === TEAM_NAMES.visitor) {
      teamCodeForHA = "A"; // AWAYチームならAWAYコードを使用
  }
  const team_code = p.id.slice(0,2);
  const playerImgSrc = `statics/img/players/${team_code}/${teamCodeForHA}/${p.imgTemp}`;
  const calc_age = calcAge(p.grade)
  if (!p) return;
  modalRoot.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="選手詳細">
      <div class="modal">
        <div style="display:flex; align-items:flex-start; gap: 24px;">
            <div style="display:flex; flex-direction:column; align-items:center;">
                <img src=${playerImgSrc} style="width:120px; height:200px; object-fit:cover; border-radius:8px;">
            </div>
        <div>

        <button class="btn" id="modalClose">もどる</button>
        <h2>${escapeHtml(p.name)} #${p.number} <span class="muted">${p.captain}</span></h2>
        <div class="muted">${p.team}</div>
        <div class="">${p.height}cm / ${p.weight}kg</div>
        <div class="muted">ポジション: ${p.position}</div>
        <div class="muted">生年月日:${p.grade}</div>
        <div class="muted">年齢:${calc_age}歳</div>

        <div class="muted">出身地:${p.highSchoolClubActivities} / 出身校:${p.almaMater}</div>
      </div>
    </div>
  `;

  // <div class="muted">チーム: ${escapeHtml(p.team)}</div> //チーム名が必要なときにはこれ選手詳細に挿入する
  
  modalRoot.setAttribute('aria-hidden', 'false');
  const backdrop = modalRoot.querySelector('.modal-backdrop');
  const close = modalRoot.querySelector('#modalClose');
  close.focus();
  close.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
//   window.addEventListener('keydown', escHandler);

  const voteBtn = document.getElementById("voteBtn");
  if (voteBtn) {
    voteBtn.addEventListener("click", () => {
      votePlayer(p.name,p.number,p.team);
    });
  }
}

function closeModal() {
  modalRoot.innerHTML = '';
  modalRoot.setAttribute('aria-hidden', 'true');
//   window.removeEventListener('keydown', escHandler);
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
