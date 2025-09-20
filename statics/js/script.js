// config.jsonから設定を読み込み
let api_url = "";

fetch("statics/json/config.json")
  .then(res => res.json())
  .then(config => {
    api_url = config.API_URL;
    loadData();
  })
  .catch(err => {
    console.error("config.json の読み込み失敗:", err);
  });

/* -------------------------
   Sample Data (In production, this is fetched from the API)
   ------------------------- */
let samplePlayers = [];

// Fetch player data from MongoDB
async function loadData() {
  try {
    const playersRes = await fetch(api_url);
    samplePlayers = await playersRes.json();
    render();
  }
  catch (err) {
    // console.error("API load error:", err);
  }
  finally {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('content').style.display = 'block';
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
    return []; // フィルタが何もない場合は空の配列を返す
  }

  if (state.division) items = items.filter(it => (it.division || '').toLowerCase() === state.division.toLowerCase());
  if (state.numMax !== '' && state.numMax != null) {
    const target = Number(state.numMax);
    if (!isNaN(target)) {
      items = items.filter(it => Number(it.number) === target);
    }
  }

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
   Rendering
   ------------------------- */
function render() {
  document.querySelectorAll('.tab').forEach(t => {
    t.setAttribute('aria-selected', t.dataset.target === 'players');
  });

  const filtered = filterItems();
  countEl.textContent = filtered.length;
  
  // フィルタがない場合はテキストを変更
  const hasFilters = state.q || state.division || state.numMax;
  if (hasFilters) {
    summaryEl.innerHTML = `選手を表示中 — 全 <strong>${filtered.length}</strong> 件`;
  } else {
    summaryEl.innerHTML = `検索条件を入力してください`;
  }

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

  resultsArea.querySelectorAll('button[data-type="player"]').forEach(btn => {
    btn.addEventListener('click', (e) => openModalPlayer(e.currentTarget.dataset.id));
  });
}

/* -------------------------
   Modal (Details)
   ------------------------- */
function openModalPlayer(id) {
  const p = samplePlayers.find(x => x.id === id);
  if (!p) return;
  modalRoot.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="選手詳細">
      <div class="modal">
        <div style="display:flex; align-items:flex-start; gap: 24px;">
            <div style="display:flex; flex-direction:column; align-items:center;">
                <img src=${p.img} style="width:120px; height:200px; object-fit:cover; border-radius:8px;">
                <br>
                  <button class="btn" id="voteBtn">投票する</button>

                  <div id="thankyouMessage" style="display:none; padding:20px; border:1px solid #ccc; margin-top:10px; background:#f9f9f9;">
                    <p>投票ありがとう！</p>
                    <button id="backBtn">初期画面へ戻る</button>
                  </div>
            </div>
        <div>

        <button class="btn" id="modalClose">閉じる</button>
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
  
  const voteBtn = document.getElementById("voteBtn");
  if (voteBtn) {
      voteBtn.addEventListener("click", () => {
          votePlayer(p.name);
      });
  }
}

async function votePlayer(playerName) {
    try {
        const response = await fetch(api_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: playerName })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("投票成功:", result.message);
        
        closeModal();
        showThankYouMessage();
    } catch (error) {
        console.error("投票失敗:", error);
        closeModal();
        showErrorMessage();
    }
}

function showThankYouMessage() {
  const messageArea = document.createElement("div");
  messageArea.id = "thankYouModal";
  messageArea.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="投票完了">
      <div class="modal" style="width: auto;">
        <div style="text-align: center;">
          <p>投票ありがとうございます！</p>
          <button id="backBtn" class="btn">OK</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(messageArea);
  
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.reload();
    });
  }
}

function showErrorMessage() {
    const messageArea = document.createElement("div");
    messageArea.id = "errorModal";
    messageArea.innerHTML = `
        <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="エラー">
          <div class="modal" style="width: auto;">
            <div style="text-align: center;">
              <p>投票に失敗しました。時間をおいて再度お試しください。</p>
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
loadData();
