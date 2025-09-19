/* -------------------------
   サンプルデータ（実運用時はAPIから取得）
   ------------------------- */
let sampleTeams = [];
let samplePlayers = [];

// JSONファイルを読み込み
// async function loadData() {
//   try {
//     const playersRes = await fetch("statics/json/players.json");
//     samplePlayers = await playersRes.json();
//     render(); // データ取得後に初回描画
//   } catch (err) {
//     console.error("JSON load error:", err);
//   }
// }
/* -------------------------
   サンプルデータ（実運用時はAPIから取得）
   ------------------------- */

// JSONファイルを読み込み
async function loadData() {
  try {
    const playersRes = await fetch("http://127.0.0.1:5000/players"); // APIのエンドポイントに変更
    samplePlayers = await playersRes.json();
    render(); // データ取得後に初回描画
  } catch (err) {
    console.error("API load error:", err);
  }
}


/* -------------------------
   基本状態
   ------------------------- */
let state = {
  mode: 'players', // players | teams
  q: '',
  division: '',
  numMax: '',
  viewGrid: true,
};

/* -------------------------
   DOM
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
const toggleViewBtn = document.getElementById('toggleView');
const resetBtn = document.getElementById('resetFilters');

/* -------------------------
   イベント登録
   ------------------------- */
tabs.forEach(t => {
  t.addEventListener('click', () => {
    // 選手タブのみが機能する
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
    render();
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

toggleViewBtn.addEventListener('click', () => {
  state.viewGrid = !state.viewGrid;
  render();
});

/* キーボードショートカット */
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    qEl.focus();
  }
});

/* -------------------------
   検索 / フィルタ処理
   ------------------------- */
function filterItems() {
  const q = state.q.trim().toLowerCase();
  let items = samplePlayers.slice();

  if (!q && !state.division && !state.numMax) {
    return [];
  }

  if (state.division) items = items.filter(it => (it.division || '').toLowerCase() === state.division.toLowerCase());
  // 番号完全一致フィルタ
  if (state.numMax !== '' && state.numMax != null) {
    const target = Number(state.numMax);
    if (!isNaN(target)) {
      items = items.filter(it => Number(it.number) === target);
    }
  }

  // クエリ検索（名前、英語名のみ）
  if (q) {
    const tokens = q.split(/\s+/);
    items = items.filter(it => {
      const hay = `${it.name || ''} ${it.name_en || ''}`.toLowerCase();
      return tokens.every(t => hay.includes(t));
    });
  }

  return items;
}

/* -------------------------
   レンダリング
   ------------------------- */
function render() {
  document.querySelectorAll('.tab').forEach(t => {
    t.setAttribute('aria-selected', t.dataset.target === 'players');
  });

  const filtered = filterItems();
  countEl.textContent = filtered.length;
  summaryEl.innerHTML = `選手を表示中 — 全 <strong>${filtered.length}</strong> 件`;
  updateActiveFilters();

  renderPlayers(filtered);
}

function updateActiveFilters() {
  const parts = [];
  if (state.q) parts.push(`検索："${state.q}"`);
  if (state.division) parts.push(`Division: ${state.division}`);
  if (state.numMax) parts.push(`番号 = ${state.numMax}`);
  activeFiltersEl.textContent = parts.length ? `フィルタ： ${parts.join(' / ')}` : 'フィルタ：なし';
}

/* プレイヤー表示 */
function renderPlayers(players) {
  const wrapper = document.createElement('div');
  wrapper.className = state.viewGrid ? 'result-grid' : '';
  if (!state.viewGrid) {
    // テーブル表示
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
      const c = document.createElement('article');
      c.className = 'card';
      c.tabIndex = 0;
      c.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center">
          <div class="team-badge">${escapeHtml(p.number)}</div>
          <div>
            <div style="font-weight:700">${escapeHtml(p.name)}</div>
            <div class="meta">${escapeHtml(p.team)} ${p.position}</div>
            <div class="meta">生年月日:${p.grade}</div>
          </div>
        </div>
      `;
      c.addEventListener('click', () => openModalPlayer(p.id));
      c.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') openModalPlayer(p.id)
      });
      wrapper.appendChild(c);
    });
  }
  resultsArea.innerHTML = '';
  resultsArea.appendChild(wrapper);

  // attach detail buttons (for table view)
  resultsArea.querySelectorAll('button[data-type="player"]').forEach(btn => {
    btn.addEventListener('click', (e) => openModalPlayer(e.currentTarget.dataset.id));
  });
}

/* -------------------------
   モーダル（詳細）表示
   ------------------------- */
function openModalPlayer(id) {
  const p = samplePlayers.find(x => x.id === id);
  if (!p) return;
  modalRoot.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="選手詳細">
      <div class="modal">
        <div style="display:flex; align-items:flex-start; gap: 24px;">
            <div style="display:flex; flex-direction:column; align-items:center;">
                <img src="https://bleague.bl.kuroco-img.app/v=2025091914/files/user/roster/721/2025-26/30400_01.jpg" style="width:120px; height:200px; object-fit:cover; border-radius:8px;">
                <br>
                <button class="btn" id="modalClose">投票する</button>
            </div>
        <div>
        <h2>${escapeHtml(p.name)} #${p.number} <span class="muted">${p.captain}</span></h2>
        <div class="muted">チーム: ${escapeHtml(p.team)}</div>
        <div class="muted">ポジション: ${p.position}</div>
        <div class="muted">生年月日:${p.grade}</div>
        <hr style="border:none;height:1px;background:rgba(255,255,255,0.03);margin:12px 0">
        <div style="display:flex;gap:18px;flex-wrap:wrap">
          <div style="min-width:180px">
            <div class="muted">身長 / 体重</div>
            <div style="font-weight:700">${p.height} cm / ${p.weight} kg</div>
            <div class="muted" style="margin-top:8px">出身校 / 出身地</div>
            <div>${p.almaMater} / ${p.highSchoolClubActivities}</div>
          </div>
        </div>
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
  window.addEventListener('keydown', escHandler);
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

/* 初期レンダリング */
loadData(); // JSON読み込み後にrender()