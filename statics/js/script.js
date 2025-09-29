// config.jsonから設定を読み込み
let api_url = "";
let vote_url = "";
let api_key = "";
// let home = "";
// let visitor = "";

fetch("statics/json/config.json")
  .then(res => res.json())
  .then(config => {
    api_url = config.API_URL;
    vote_url = config.VOTE_URL;
    api_key = config.API_KEY;
    const home_all = config.HOME_TEAM;
    const visitor_all = config.VISITOR_TEAM;
    const home = home_all[0];
    const home_code = home_all[1];
    const visitor = visitor_all[0];
    const visitor_code = visitor_all[1];
    const match_date = config.MATCH_DATE;
    const arena = config.ARENA;

    // ★ 追記部分: Match DateとArenaをヘッダーに表示
    if (matchDateDisplayEl) {
        matchDateDisplayEl.textContent = `開催日: ${match_date}`;
    }
    if (arenaDisplayEl) {
        arenaDisplayEl.textContent = `会場: ${arena}`;
    }

    matchDisoplayEl.textContent = `HOME: ${home}　AWAY: ${visitor}`;
    // ★ 追記部分: ここまで

    loadData(api_url,home,visitor); // 初回ロード時にAPIを叩く
  })
  .catch(err => {
    console.error("config.json の読み込み失敗:", err);
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
   Data
   ------------------------- */
let samplePlayers = [];
async function loadData(api_url,home,visitor) {
  try {
    document.getElementById('loading').classList.remove('hidden');

    // 1. sessionStorageからキャッシュされたデータを取得
    const cachedData = sessionStorage.getItem('playersData');
    if (cachedData) {
      // キャッシュがあればそれを使用
      samplePlayers = JSON.parse(cachedData);
      // console.log('キャッシュされたデータを使用します。');
    } else {
      const url = `${api_url}?home=${encodeURIComponent(home)}&visitor=${encodeURIComponent(visitor)}`;
      // キャッシュがなければAPIからデータを取得
      // const playersRes = await fetch(api_url);
      const playersRes = await fetch(url);
      samplePlayers = await playersRes.json();
      
      // 取得したデータをsessionStorageに保存
      sessionStorage.setItem('playersData', JSON.stringify(samplePlayers));
      // console.log('APIからデータを取得してキャッシュしました。');
    }

    render();
  } catch (err) {
    console.error("API load error:", err);
    closeModal();
    showErrorMessage("データベース接続ができませんでした。時間をおいて再度お試しください。");
  } finally {
    document.getElementById('loading').classList.add('hidden');
  }
}

/* -------------------------
   State Management
   ------------------------- */
let state = {
  mode: 'players',
  q: '',
  division: '',
  numMax: '',
  viewGrid: true,
};

/* -------------------------
   DOM Elements
   ------------------------- */
const qEl = document.getElementById('q');
const divisionEl = document.getElementById('division');
const numMaxEl = document.getElementById('numMax');
const resultsArea = document.getElementById('resultsArea');
const countEl = document.getElementById('count');
const activeFiltersEl = document.getElementById('activeFilters');
const summaryEl = document.getElementById('summary');
const modalRoot = document.getElementById('modalRoot');
const tabs = document.querySelectorAll('.tab');
const resetBtn = document.getElementById('resetFilters');

// ★ 新規追加: Header要素を取得
const headerEl = document.querySelector('header'); 
// ★ 新規追加: Match DateとArenaの表示要素を取得
const matchDateDisplayEl = document.getElementById('matchDateDisplay'); // 追加
const arenaDisplayEl = document.getElementById('arenaDisplay');       // 追加
const matchDisoplayEl = document.getElementById('matchDisplay');
// 検索結果の開始位置として適切な要素も取得しておくと便利です
// const resultsSectionEl = document.querySelector('.search-section');

/* -------------------------
   Event Listeners
   ------------------------- */
tabs.forEach(t => {
  t.addEventListener('click', () => {
    if (t.dataset.target === 'players') {
      tabs.forEach(x => x.setAttribute('aria-selected', 'false'));
      t.setAttribute('aria-selected', 'true');
      state.mode = 'players';
      render();
    }
  });
});

[qEl, divisionEl, numMaxEl].forEach(el => {
  el.addEventListener('input', (e) => {
    state[e.target.id] = e.target.value;
    render(); // APIを叩かずフロントでフィルタ
  });
});

resetBtn.addEventListener('click', () => {
  qEl.value = '';
  divisionEl.value = '';
  numMaxEl.value = '';
  state.q = '';
  state.division = '';
  state.numMax = '';
  render();
});

// Keyboard shortcut
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    qEl.focus();
  }
});

/* -------------------------
   Search / Filter Logic
   ------------------------- */
function filterItems() {
  const q = state.q.trim().toLowerCase();
  let items = samplePlayers.slice();

  if (!q && !state.division && !state.numMax) {
    return []; // フィルタが何もない場合は空
  }

  if (state.division) {
    items = items.filter(it => (it.division || '').toLowerCase() === state.division.toLowerCase());
  }

  // 🔽 番号は完全一致
  if (state.numMax !== '' && state.numMax != null) {
    const target = String(state.numMax);
    // items = items.filter(it => String(it.number).includes(target));
    items = items.filter(it => String(it.number)===(target));
  }

  if (q) {
    const tokens = q.split(/\s+/);
    items = items.filter(it => {
      const hay = `${it.name || ''} ${it.name_en || ''}`.toLowerCase();
      return tokens.every(t => hay.includes(t));
    });
  }
    // 🔽 ここにソート処理を追加する
  items.sort((a, b) => a.number - b.number);

  return items;
}

/* -------------------------
   Rendering
   ------------------------- */
function render() {
  document.querySelectorAll('.tab').forEach(t => {
    t.setAttribute('aria-selected', t.dataset.target === 'players');
  });

  const filtered = filterItems();
  countEl.textContent = filtered.length;
  const hasFilters = state.q || state.division || state.numMax;

  /// 1. 選手データが全く登録されていない場合 (フィルタなし かつ 結果ゼロ)
  // これが「選手が登録されていません」のメッセージを出すべき状態です。
  if (hasFilters && filtered.length === 0) {
    summaryEl.innerHTML = ''; // 要約エリアをクリア
    
    // 結果エリアに専用メッセージを表示
    renderNoPlayersMessage(resultsArea);
    // updateActiveFiltersとrenderPlayersを実行せずに終了
    // ★ 修正: 検索結果がゼロの場合もスクロール処理を実行してから終了
    if (resultsArea && headerEl) {
        setTimeout(() => {
            window.scrollTo({
                top: 5,
                behavior: 'smooth'
            });
        }, 100);
    }
  // updateActiveFiltersとrenderPlayersを実行せずに終了
    return; 
  }


if (hasFilters) {
  if (filtered.length > 0) {
    summaryEl.innerHTML = `選手を表示中 — 全 <strong>${filtered.length}</strong> 件`;
  } else {
    summaryEl.innerHTML = `選手が登録されていません`;
  }
  } else {
    summaryEl.innerHTML = `選手を検索して投票してください`;
  }

  updateActiveFilters();
  renderPlayers(filtered);

  // ★ 修正: Headerの高さを考慮して、検索結果が表示されるセクションまでスクロール
  if (resultsArea && headerEl) {
      setTimeout(() => {
          window.scrollTo({
              top: 5,
              behavior: 'smooth'
          });
      }, 100);
  }
}

// ★ 新規追加: 選手が登録されていない場合の専用メッセージ表示関数
function renderNoPlayersMessage(container) {
    container.innerHTML = '';
    const noPlayersMessage = document.createElement('div');
    noPlayersMessage.className = 'no-players-message';
    noPlayersMessage.style.textAlign = 'center';
    noPlayersMessage.style.padding = '40px 20px';
    noPlayersMessage.innerHTML = `
        <strong>選手が登録されていません。</strong>
    `;
    container.appendChild(noPlayersMessage);
}

function updateActiveFilters() {
  const parts = [];
  if (state.q) parts.push(`検索："${state.q}"`);
  if (state.division) parts.push(`Division: ${state.division}`);
  if (state.numMax) parts.push(`番号に「${state.numMax}」を含む`);
  activeFiltersEl.textContent = parts.length ? `フィルタ： ${parts.join(' / ')}` : 'フィルタ：なし';
}

function renderPlayers(players) {
  const wrapper = document.createElement('div');
  wrapper.className = state.viewGrid ? 'result-grid' : '';
  if (!state.viewGrid) {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr><th>番号</th><th>選手名</th><th>チーム</th><th>生年月日</th><th>ポジション</th><th></th></tr>`;
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    players.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>#${p.number}</td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.team)}</td><td>${p.grade}</td><td>${p.position}</td><td><button class="btn small" data-id="${p.id}" data-type="player">詳細</button></td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);
  } else {
    players.forEach(p => {
      const team_code = p.id.slice(0,2);
      const playerImgSrc = `statics/img/players/${team_code}/${p.imgTemp}`;
      const c = document.createElement('article');
      c.className = 'card';
      c.tabIndex = 0;
      c.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center">
          <img src=${playerImgSrc} style="width:60px; height:100px; object-fit:cover; border-radius:8px;">
          <div>
            <div style="font-weight:700">${escapeHtml(p.name)}</div>
            <div class="muted">${p.team}</div>
            <div class="muted">ポジション: ${p.position}</div>
            <div class="muted">${p.height}cm / ${p.weight}kg</div>
          </div>
        </div>
      `;

      // <div class="team-badge">${escapeHtml(p.number)}</div>
      // <div class="meta">${escapeHtml(p.team)} ${p.position}</div> チーム名や生年月日を表示する場合はこれを上に挿入する
      // <div class="meta">生年月日:${p.grade}</div>

      c.addEventListener('click', () => openModalPlayer(p.id));
      c.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') openModalPlayer(p.id)
      });
      wrapper.appendChild(c);
    });
  }
  resultsArea.innerHTML = '';
  resultsArea.appendChild(wrapper);

  resultsArea.querySelectorAll('button[data-type="player"]').forEach(btn => {
    btn.addEventListener('click', (e) => openModalPlayer(e.currentTarget.dataset.id));
  });
}

/* -------------------------
   Modal (Details)
   ------------------------- */
// （既存の openModalPlayer / votePlayer / showThankYouMessage / showErrorMessage / closeModal / escHandler / escapeHtml をそのまま利用）

function openModalPlayer(id) {
  const p = samplePlayers.find(x => x.id === id);
  const team_code = p.id.slice(0,2);
  const playerImgSrc = `statics/img/players/${team_code}/${p.imgTemp}`;
  const calc_age = calcAge(p.grade)
  if (!p) return;
  modalRoot.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="選手詳細">
      <div class="modal">
        <div style="display:flex; align-items:flex-start; gap: 24px;">
            <div style="display:flex; flex-direction:column; align-items:center;">
                <img src=${playerImgSrc} style="width:120px; height:200px; object-fit:cover; border-radius:8px;">
                <br>
                  <button class="btn" id="voteBtn">投票する</button>
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
  window.addEventListener('keydown', escHandler);

  const voteBtn = document.getElementById("voteBtn");
  if (voteBtn) {
    voteBtn.addEventListener("click", () => {
      votePlayer(p.name,p.number,p.team);
    });
  }
}

async function votePlayer(playerName,playerNumber,playerTeam) {
  try {
     // 🔽 API呼び出し前にローディング表示
    document.getElementById('loading').classList.remove('hidden');
    const response = await fetch(vote_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // body: JSON.stringify({ name: playerName })
        body: JSON.stringify({ 
        team : playerTeam,
        number : playerNumber, 
        name: playerName,
        api_key: api_key // 例: リクエストボディに直接追加
        // api_key: "api_key"
      })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    closeModal();
    showThankYouMessage();
  } catch (error) {
    console.error("投票に失敗しました:", error);
    closeModal();
    showErrorMessage("投票ができませんでした。時間をおいて再度お試しください。");
  }
   finally {
    // 🔽 API応答が返ったらローディングを消す
    document.getElementById('loading').classList.add('hidden');
  }
}

function showThankYouMessage() {
  const messageArea = document.createElement("div");
  messageArea.id = "thankYouModal";
  messageArea.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="投票完了">
      <div class="modal" style="width: auto;">
        <div style="text-align: center;">
          <p>投票しました！</p>
          <button id="backBtn" class="btn">OK</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(messageArea);

  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      // 検索フォームと状態をリセット
      qEl.value = '';
      divisionEl.value = '';
      numMaxEl.value = '';
      state.q = '';
      state.division = '';
      state.numMax = '';
      
      // 画面を再描画して、検索結果をクリア
      render();

      // モーダルを削除
      document.body.removeChild(messageArea);
    });
  }
}

function showErrorMessage(message) {
    const messageArea = document.createElement("div");
    messageArea.id = "errorModal";
    messageArea.innerHTML = `
        <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="エラー">
          <div class="modal" style="width: auto;">
            <div style="text-align: center;">
              <p>${message}</p>
              <button id="backBtn" class="btn">OK</button>
            </div>
          </div>
        </div>
    `;
    document.body.appendChild(messageArea);

    const backBtn = document.getElementById("backBtn");
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            document.body.removeChild(messageArea);
        });
    }
}

function closeModal() {
  modalRoot.innerHTML = '';
  modalRoot.setAttribute('aria-hidden', 'true');
  window.removeEventListener('keydown', escHandler);
}

function escHandler(e) {
  if (e.key === 'Escape') closeModal();
}

/* -------------------------
   Utility Functions
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

/* Initial Rendering */
// loadData();
