// ===============================================
// グローバル変数と定数
// ===============================================
let ranking_url = ""; 
let allRankingData = [];
let allGameData = []; // 全イベントデータを格納
let home = "";
let visitor = "";
let selected_match_date = ""; // 選択中の日付
let arena = "";
let home_code = "";
let visitor_code = "";
let home_score = "";
let visitor_score = "";

const TEAM_NAMES = {
    'home': '',
    'visitor': ''
};

const matchDisoplayEl = document.getElementById('matchDisplay');
const arenaDisplayEl = document.getElementById('arenaDisplay');
const scoreDisplayEL = document.getElementById('scoreDisplay');
const modalRoot = document.getElementById('modalRoot');
const loadingEl = document.getElementById('loading');
const rankingContainerEl = document.getElementById('rankingContainer');
const today = new Date(); // ローカル時刻の取得

// ===============================================
// ユーティリティ関数
// ===============================================

/**
 * Dateオブジェクトを 'YYYY年MM月DD日' 形式に整形する
 */
function formatToJapaneseDate(date) {
    // 年を取得
    const year = date.getFullYear();
    // 月と日を2桁にパディング
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}年${month}月${day}日`;
}

/**
 * 選手生年月日文字列から年齢を計算する
 * @param {string} birthStr - 'YYYY年M月D日' 形式の文字列
 * @returns {number} 年齢
 */
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

/**
 * HTMLのエスケープ処理
 * @param {string} s 
 * @returns {string} エスケープされた文字列
 */
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


// ===============================================
// 初期ロード処理
// ===============================================
document.addEventListener('DOMContentLoaded', () => {
    fetch("statics/json/config.json")
        .then(res => res.json())
        .then(async config => { // ★ ここを async に変更
            ranking_url = config.RANKING_API_URL;
            allGameData = config.GAME_DATA; 
            
            // 1. 日付選択肢を生成し、初期選択日付を取得
            // setupDateSelect内で selected_match_date がグローバル設定され、HTMLの<select>値も設定される
            selected_match_date = setupDateSelect(allGameData); 
            
            // 2. 初期選択された日付に基づいてUIを構築
            if (selected_match_date) {
                await updateMatchInfoAndRanking(selected_match_date, true); // ★ await を追加
            } else {
                // 日付データがない場合の処理
                loadingEl.classList.add('hidden');
                rankingContainerEl.innerHTML = "<p>試合データが設定ファイルに見つかりませんでした。</p>";
                rankingContainerEl.classList.remove('hidden');
            }

            // フィルタボタンのイベントリスナーを設定
            setupFilterButtons(); 
        })
        .catch(err => {
            console.error("config.json の読み込み失敗:", err);
            loadingEl.classList.add('hidden');
            rankingContainerEl.innerHTML = "<p>設定ファイルの読み込みに失敗しました。</p>";
            rankingContainerEl.classList.remove('hidden');
        });
});


// ===============================================
// 日付選択と情報更新
// ===============================================

/**
 * 日付選択肢を生成し、初期選択日付を返す
 * @param {Array} gameData - 全試合データ
 * @returns {string} 初期選択された日付
 */
function setupDateSelect(gameData) {
    const dateSelectEl = document.getElementById('dateSelect');
    
    // 日付を降順にソート（最新の日付を最初に）
    const sortedDates = gameData
        .map(item => item.match_date) 
        // 'YYYY年MM月DD日'をDateオブジェクトに変換して比較
        .sort((a, b) => new Date(b.replace(/年|月/g, '-').replace(/日/g, '')) - new Date(a.replace(/年|月/g, '-').replace(/日/g, ''))); 
        
    sortedDates.forEach(dateStr => {
        const option = document.createElement('option');
        option.value = dateStr;
        option.textContent = dateStr;
        dateSelectEl.appendChild(option);
    });

    const initialDate = sortedDates.length > 0 ? sortedDates[0] : "";
    dateSelectEl.value = initialDate;

    // 選択肢変更時のイベントリスナーを設定
    dateSelectEl.addEventListener('change', async (event) => { // ★ ここを async に変更
        // グローバル変数 selected_match_date を更新
        selected_match_date = event.target.value; 
        // 選択された日付に基づいてUIを更新し、ランキングを再取得
        await updateMatchInfoAndRanking(selected_match_date); // ★ await を追加
    });
    
    return initialDate; 
}

/**
 * 日付変更時または初期ロード時に試合情報を更新し、ランキングデータを再取得する
 * @param {string} newDate - 新しく選択された日付
 * @param {boolean} [isInitialLoad=false] - 初期ロードかどうか
 */
async function updateMatchInfoAndRanking(newDate, isInitialLoad = false) { // ★ ここを async に変更
    // UIをリセット
    loadingEl.classList.remove('hidden'); // スピナーを表示
    rankingContainerEl.classList.add('hidden');
    
    // 新しい日付のイベント情報を検索
    const selectedEvent = allGameData.find(item => item.match_date === newDate);

    if (selectedEvent) {
        // グローバル変数と表示の更新
        arena = selectedEvent.arena;
        home = selectedEvent.home.team_name;
        visitor = selectedEvent.visitor.team_name;
        home_code = selectedEvent.home.team_cd;
        visitor_code = selectedEvent.visitor.team_cd;
        home_score = selectedEvent.home.score;
        visitor_score = selectedEvent.visitor.score;
        
        TEAM_NAMES["home"] = home;
        TEAM_NAMES["visitor"] = visitor; 
        
        matchDisoplayEl.textContent = `HOME: ${home}　AWAY: ${visitor}`;
        arenaDisplayEl.textContent = `開催日: ${newDate} 会場: ${arena}`;
        scoreDisplayEL.textContent = `${home} ${home_score}  -  ${visitor_score} ${visitor}`;

        // ランキングデータを再取得（完了を待つ）
        await loadRankingData(); // ★ await を追加
        
        // 初回ロードでない場合は、フィルタボタンを ALL にリセット
        if (!isInitialLoad) {
            document.getElementById('showAll').click();
        }
    } else {
        // イベントが見つからない場合の表示
        matchDisoplayEl.textContent = `HOME: -　AWAY: -`;
        arenaDisplayEl.textContent = `開催日: ${newDate} 会場: イベント情報なし`;
        loadingEl.classList.add('hidden'); // イベントデータがない場合はここで非表示
        rankingContainerEl.innerHTML = "<p>この日付の試合情報はJSONファイルに見つかりませんでした。</p>";
        rankingContainerEl.classList.remove('hidden');
    }
}


// ===============================================
// ランキングデータ取得とフィルタリング
// ===============================================

async function loadRankingData() {
    try {
        // 選択中の日付をクエリパラメータとしてAPIに渡す
        const rankingRes = await fetch(`${ranking_url}?match_date=${selected_match_date}`); 
        if (!rankingRes.ok) {
            throw new Error(`HTTP error! Status: ${rankingRes.status}`);
        }
        const ranking = await rankingRes.json();

        allRankingData = ranking;
        
        // 初期表示は「全体」のデータをレンダリング
        filterAndRenderRanking('all');
        
    } catch (err) {
        console.error("ランキングデータの取得に失敗:", err);
        loadingEl.classList.add('hidden');
        rankingContainerEl.innerHTML = "<p>データの取得に失敗しました。時間をおいて再度お試しください。</p>";
        rankingContainerEl.classList.remove('hidden');
    }
}

/**
 * @param {string} team_type - フィルタリングするチームタイプ ('all', 'home', 'visitor')
 */
function filterAndRenderRanking(team_type) {
    let filteredRanking = [];

    if (team_type === 'all') {
        // 'all' の場合は全データを使用
        filteredRanking = allRankingData;
    } else {
        // ボタンのID（'home' or 'visitor'）から、実際の日本語チーム名を取得
        const targetTeamName = TEAM_NAMES[team_type];
        // 'home' または 'visitor' の場合はデータをフィルタリング
        filteredRanking = allRankingData.filter(player => player.team === targetTeamName);
    }

    // フィルタリングされたデータでレンダリング関数を呼び出し
    renderRanking(filteredRanking);
}

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

// ===============================================
// UIレンダリングとモーダル表示
// ===============================================

function renderRanking(ranking) {
    const container = rankingContainerEl;
    container.innerHTML = ''; // コンテナをクリア

    // 投票データがない場合の処理
    if (ranking.length === 0) {
        container.innerHTML = "<p>投票データがありません。</p>";
        container.classList.remove('hidden');
        loadingEl.classList.add('hidden'); // スピナーを非表示
        return; 
    }
    
    // ビジターチーム用の背景色を定義
    const VISITOR_TEAM_NAME = visitor; 
    const VISITOR_BG_COLOR = '#edededff'; 

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
        // ビジターチームの場合にインラインスタイルを設定
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
    
    loadingEl.classList.add('hidden'); // スピナーを非表示
    container.classList.remove('hidden');
}

function openModalPlayer(id,ranking) {
  const p = ranking.find(x => x.id === id);
  
  // チーム名に応じてコードを切り替える
  let teamCodeForHA = '';
  if (p.team === home) {
      teamCodeForHA = "H"; // HOMEチームならH
  } else if (p.team === visitor) {
      teamCodeForHA = "A"; // AWAYチームならA
  }
  
  const team_code = p.id.slice(0,2);
  const playerImgSrc = `img/players/${team_code}/${teamCodeForHA}/${p.imgTemp}`;
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

  modalRoot.setAttribute('aria-hidden', 'false');
  const backdrop = modalRoot.querySelector('.modal-backdrop');
  const close = modalRoot.querySelector('#modalClose');
  close.focus();
  close.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  const voteBtn = document.getElementById("voteBtn");
  if (voteBtn) {
    // votePlayer関数は定義されていないためコメントアウト
    // voteBtn.addEventListener("click", () => {
    //   votePlayer(p.name,p.number,p.team);
    // });
  }
}

function closeModal() {
  modalRoot.innerHTML = '';
  modalRoot.setAttribute('aria-hidden', 'true');
}