// Supabase Client Initialization
const supabaseUrl = 'https://wfyuxxskwlczoyisdcmy.supabase.co';
const supabaseKey = 'sb_publishable_yUeE6ynEpbR3Eq-k3Gv1Ew_1DiaJHjz';
const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

// Real-time Treatment Sequence Tracker State
const state = {
  female: {
    '최보빈': [null, null, null, null, null, null, null, null],
    '김준현': [null, null, null, null, null, null, null, null],
    '김영윤': [null, null, null, null, null, null, null, null],
    '박지현': [null, null, null, null, null, null, null, null],
    '안태윤': [null, null, null, null, null, null, null, null],
    '황두호': [null, null, null, null, null, null, null, null],
  },
  male: {
    '최보빈': [null, null, null, null, null, null, null, null],
    '김준현': [null, null, null, null, null, null, null, null],
    '김영윤': [null, null, null, null, null, null, null, null],
    '박지현': [null, null, null, null, null, null, null, null],
    '안태윤': [null, null, null, null, null, null, null, null],
    '황두호': [null, null, null, null, null, null, null, null],
  },
  secondFloor: {
    '최보빈': [null, null, null, null, null, null, null, null],
    '김준현': [null, null, null, null, null, null, null, null],
    '김영윤': [null, null, null, null, null, null, null, null],
    '박지현': [null, null, null, null, null, null, null, null],
    '안태윤': [null, null, null, null, null, null, null, null],
    '황두호': [null, null, null, null, null, null, null, null],
  }
};

// Assigned Director Names per Row State (1 to 4) - Split for Floor 1 and Floor 2
const rowDirectorsFloor1 = {
  1: '최보빈',
  2: '김준현',
  3: '김영윤',
  4: '박지현'
};

const rowDirectorsFloor2 = {
  1: '최보빈',
  2: '김준현',
  3: '김영윤',
  4: '박지현'
};

// Track currently active slot for edit
let activeSlot = {
  ward: null,      // 'female' | 'male' | 'secondFloor'
  docName: null,   // '최보빈' | '김준현' etc
  index: null      // 0 ~ 7
};

// Track currently active row for doctor edit
let activeDirectorName = null;

// Track doctor leave times
let leaveTimes = {
  '최보빈': null,
  '김준현': null,
  '김영윤': null,
  '박지현': null,
  '안태윤': null,
  '황두호': null
};
let activeLeaveTimeDoc = null;

// Track off-duty state of directors
let offDutyDirectors = {
  '최보빈': false,
  '김준현': false,
  '김영윤': false,
  '박지현': false,
  '안태윤': false,
  '황두호': false
};

// Track drag source for Drag & Drop reordering
let dragSource = {
  ward: null,
  docName: null,
  index: null
};

// Track active revert timeout for waiting slot delete confirmation
let waitingRevertTimeout = null;

// Track drag type ('magnet' | 'row') and drag source row index/floor
let dragType = null; // 'magnet' | 'row'
let dragSourceRow = null; // 1 | 2 | 3 | 4
let dragSourceFloor = null; // 1 | 2
let longPressTimer = null;
let isLongPress = false;

// DOM Elements
const modalOverlay = document.getElementById('bed-modal');
const modalBedGrid = document.getElementById('modal-bed-grid');
const modalSpecialGrid = document.getElementById('modal-special-grid');
const modalEtcGrid = document.getElementById('modal-etc-grid');
const btnClearSlot = document.getElementById('btn-clear-slot');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const liveClockEl = document.getElementById('live-clock');

// Director Selection Modal Elements
const directorModalOverlay = document.getElementById('director-modal');
const modalDirectorGrid = document.getElementById('modal-director-grid');
const btnCancelDirectorModal = document.getElementById('btn-cancel-director-modal');
const btnDirectorOffDuty = document.getElementById('btn-director-off-duty');

// Leave Time Selection Modal Elements
const leaveTimeModalOverlay = document.getElementById('leave-time-modal');
const modalLeaveTimeGrid = document.getElementById('modal-leave-time-grid');
const btnCancelLeaveModal = document.getElementById('btn-cancel-leave-modal');

// Cancel Progress Confirmation Modal Elements
const cancelProgressModalOverlay = document.getElementById('cancel-progress-modal');
const cancelProgressInstruction = document.getElementById('cancel-progress-instruction');
const btnConfirmCancelProgress = document.getElementById('btn-confirm-cancel-progress');
const btnCancelProgressModal = document.getElementById('btn-cancel-progress-modal');
let activeCancelSlot = null;

// Load state from localStorage on init (helper)
function loadStateFromLocalStorage() {
  const savedState = localStorage.getItem('clinic_treatment_state');
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      // Migration check: if state is old (uses keys 1,2,3,4)
      if (parsed.female && (parsed.female['1'] || parsed.female[1])) {
        const oldDirectors = JSON.parse(localStorage.getItem('clinic_row_directors')) || {
          1: '최보빈', 2: '김준현', 3: '김영윤', 4: '박지현'
        };
        const oldLeave = JSON.parse(localStorage.getItem('clinic_leave_times')) || {};
        const oldOff = JSON.parse(localStorage.getItem('clinic_off_duty_directors')) || {};
        
        for (let r = 1; r <= 4; r++) {
          const dName = oldDirectors[r] || `의사${r}`;
          state.female[dName] = parsed.female[r] || Array(8).fill(null);
          state.male[dName] = parsed.male[r] || Array(8).fill(null);
          state.secondFloor[dName] = parsed.secondFloor ? (parsed.secondFloor[r] || Array(8).fill(null)) : Array(8).fill(null);
          leaveTimes[dName] = oldLeave[r] || null;
          offDutyDirectors[dName] = oldOff[r] || false;
        }
        saveState();
        localStorage.setItem('clinic_leave_times', JSON.stringify(leaveTimes));
        localStorage.setItem('clinic_off_duty_directors', JSON.stringify(offDutyDirectors));
      } else {
        if (parsed.female) state.female = parsed.female;
        if (parsed.male) state.male = parsed.male;
        if (parsed.secondFloor) state.secondFloor = parsed.secondFloor;
      }
    } catch (e) {
      console.error('Error parsing saved state:', e);
    }
  }

  // Load row directors for Floor 1 and Floor 2
  const savedDirectors1 = localStorage.getItem('clinic_row_directors_floor1') || localStorage.getItem('clinic_row_directors');
  if (savedDirectors1) {
    try {
      const parsed = JSON.parse(savedDirectors1);
      if (parsed[1]) Object.assign(rowDirectorsFloor1, parsed);
    } catch (e) {}
  }
  const savedDirectors2 = localStorage.getItem('clinic_row_directors_floor2') || localStorage.getItem('clinic_row_directors');
  if (savedDirectors2) {
    try {
      const parsed = JSON.parse(savedDirectors2);
      if (parsed[1]) Object.assign(rowDirectorsFloor2, parsed);
    } catch (e) {}
  }

  // Load doctor leave times
  const savedLeaveTimes = localStorage.getItem('clinic_leave_times');
  if (savedLeaveTimes) {
    try {
      const parsed = JSON.parse(savedLeaveTimes);
      Object.assign(leaveTimes, parsed);
    } catch (e) {
      console.error('Error parsing saved leave times:', e);
    }
  }

  // Load off-duty state
  const savedOffDuty = localStorage.getItem('clinic_off_duty_directors');
  if (savedOffDuty) {
    try {
      const parsed = JSON.parse(savedOffDuty);
      Object.assign(offDutyDirectors, parsed);
    } catch (e) {
      console.error('Error parsing saved off-duty state:', e);
    }
  }
}

// Load state from Supabase or localStorage on init
async function initApp() {
  document.body.setAttribute('data-active-tab', 'all');
  const allDocs = ['최보빈', '김준현', '김영윤', '박지현', '안태윤', '황두호'];
  
  if (supabaseClient) {
    try {
      const { data: dbRow, error } = await supabaseClient
        .from('clinic_state')
        .select('data')
        .eq('id', 'global')
        .single();
        
      if (!error && dbRow && dbRow.data) {
        const dbData = dbRow.data;
        if (dbData.state) Object.assign(state, dbData.state);
        if (dbData.leaveTimes) Object.assign(leaveTimes, dbData.leaveTimes);
        if (dbData.offDutyDirectors) Object.assign(offDutyDirectors, dbData.offDutyDirectors);
        if (dbData.rowDirectorsFloor1) Object.assign(rowDirectorsFloor1, dbData.rowDirectorsFloor1);
        if (dbData.rowDirectorsFloor2) Object.assign(rowDirectorsFloor2, dbData.rowDirectorsFloor2);
      } else {
        console.warn('Could not fetch state from Supabase, falling back to localStorage:', error);
        loadStateFromLocalStorage();
      }
    } catch (e) {
      console.error('Error fetching state from Supabase:', e);
      loadStateFromLocalStorage();
    }
  } else {
    loadStateFromLocalStorage();
  }

  // Normalize old placenta values ('자하거<br>디나' -> '자하거/디나')
  const wards = ['female', 'male', 'secondFloor'];
  wards.forEach(w => {
    if (state[w]) {
      Object.keys(state[w]).forEach(d => {
        if (Array.isArray(state[w][d])) {
          state[w][d] = state[w][d].map(val => {
            if (val === '자하거<br>디나') return '자하거/디나';
            if (val === '자하거<br>디나_progress') return '자하거/디나_progress';
            return val;
          });
        }
      });
    }
  });

  // Ensure all doctor name keys are present in slots, leave times, off duty status
  allDocs.forEach(d => {
    if (!state.female[d]) state.female[d] = Array(8).fill(null);
    if (!state.male[d]) state.male[d] = Array(8).fill(null);
    if (!state.secondFloor[d]) state.secondFloor[d] = Array(8).fill(null);
    if (leaveTimes[d] === undefined) leaveTimes[d] = null;
    if (offDutyDirectors[d] === undefined) offDutyDirectors[d] = false;
  });

  // Ensure all rows are properly compacted and padded
  allDocs.forEach(d => {
    compactRowState('female', d);
    compactRowState('male', d);
    compactRowState('secondFloor', d);
  });

  sanitizeState(true);

  setupEventListeners();
  setupSupabaseRealtime();
  updateUI();
  startClock();

  // Auto-sync schedule if it's a new day (when dashboard is opened for the first time today)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${date}`;
  
  const lastSyncDate = localStorage.getItem('clinic_last_sync_date');
  if (lastSyncDate !== todayStr) {
    // Silently sync schedules from Supabase on load
    syncScheduleFromSupabase({ silent: true });
  }
}

// Setup Supabase Realtime channel subscription to receive live updates
function setupSupabaseRealtime() {
  if (!supabaseClient) return;

  supabaseClient
    .channel('public:clinic_state')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'clinic_state',
        filter: 'id=eq.global'
      },
      (payload) => {
        const newData = payload.new.data;
        if (newData) {

          if (newData.state) Object.assign(state, newData.state);
          if (newData.leaveTimes) Object.assign(leaveTimes, newData.leaveTimes);
          if (newData.offDutyDirectors) Object.assign(offDutyDirectors, newData.offDutyDirectors);
          if (newData.rowDirectorsFloor1) Object.assign(rowDirectorsFloor1, newData.rowDirectorsFloor1);
          if (newData.rowDirectorsFloor2) Object.assign(rowDirectorsFloor2, newData.rowDirectorsFloor2);
          
          sanitizeState(false);
          updateUI();
        }
      }
    )
    .subscribe();
}

// Save current state to localStorage and Supabase
async function saveState() {
  localStorage.setItem('clinic_treatment_state', JSON.stringify(state));
  localStorage.setItem('clinic_leave_times', JSON.stringify(leaveTimes));
  localStorage.setItem('clinic_off_duty_directors', JSON.stringify(offDutyDirectors));
  localStorage.setItem('clinic_row_directors_floor1', JSON.stringify(rowDirectorsFloor1));
  localStorage.setItem('clinic_row_directors_floor2', JSON.stringify(rowDirectorsFloor2));

  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('clinic_state')
        .upsert({
          id: 'global',
          data: {
            state,
            leaveTimes,
            offDutyDirectors,
            rowDirectorsFloor1,
            rowDirectorsFloor2
          },
          updated_at: new Date().toISOString()
        });
      if (error) {
        console.error('Error saving state to Supabase:', error);
      }
    } catch (e) {
      console.error('Exception saving state to Supabase:', e);
    }
  }
}

// Compact row state to remove nulls and pad/keep size accordingly
function compactRowState(ward, docName) {
  if (!state[ward] || !state[ward][docName]) return;
  const occupied = state[ward][docName].filter(v => v !== null && v !== undefined && v !== '');
  state[ward][docName] = [...occupied, ...Array(8 - occupied.length).fill(null)];
}

// Sanitize state by removing _progress suffix from slots at index >= 1
function sanitizeState(shouldSave = true) {
  const wards = ['female', 'male', 'secondFloor'];
  let modified = false;
  
  wards.forEach(w => {
    if (state[w]) {
      Object.keys(state[w]).forEach(d => {
        if (Array.isArray(state[w][d])) {
          state[w][d] = state[w][d].map((val, idx) => {
            if (idx >= 1 && typeof val === 'string' && val.endsWith('_progress')) {
              modified = true;
              const clean = val.substring(0, val.length - 9);
              const parsed = parseInt(clean, 10);
              return (!isNaN(parsed) && String(parsed) === clean) ? parsed : clean;
            }
            return val;
          });
        }
      });
    }
  });
  
  if (modified && shouldSave) {
    console.log('[Sanitize] Cleaned up phantom _progress suffixes from index >= 1 slots.');
    saveState();
  }
}

// Helper to apply doctor-specific CSS classes
function applyDoctorClass(element, cell, docName) {
  if (docName === '최보빈') { element.classList.add('dr-bobin'); if (cell) cell.classList.add('dr-bobin'); }
  else if (docName === '김준현') { element.classList.add('dr-junhyun'); if (cell) cell.classList.add('dr-junhyun'); }
  else if (docName === '김영윤') { element.classList.add('dr-youngyun'); if (cell) cell.classList.add('dr-youngyun'); }
  else if (docName === '박지현') { element.classList.add('dr-jihyun'); if (cell) cell.classList.add('dr-jihyun'); }
  else if (docName === '안태윤') { element.classList.add('dr-taeyun'); if (cell) cell.classList.add('dr-taeyun'); }
  else if (docName === '황두호') { element.classList.add('dr-duho'); if (cell) cell.classList.add('dr-duho'); }
}

// Update the full interface based on state
function updateUI() {
  const activeTab = document.body.getAttribute('data-active-tab') || 'all';
  const priorityOrder = ['최보빈', '김준현', '김영윤', '박지현', '안태윤', '황두호'];
  
  let renderDirectorsFloor1 = { ...rowDirectorsFloor1 };
  let renderDirectorsFloor2 = { ...rowDirectorsFloor2 };
  
  if (activeTab === 'all') {
    const sorted1 = Object.values(rowDirectorsFloor1).filter(Boolean).sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b));
    renderDirectorsFloor1 = {};
    sorted1.forEach((name, idx) => {
      renderDirectorsFloor1[idx + 1] = name;
    });
    
    const sorted2 = Object.values(rowDirectorsFloor2).filter(Boolean).sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b));
    renderDirectorsFloor2 = {};
    sorted2.forEach((name, idx) => {
      renderDirectorsFloor2[idx + 1] = name;
    });
  }

  // 1. Reorder Floor 1 rows based on off-duty status using CSS order
  let activeCount1 = 0;
  let offDutyCount1 = 0;
  for (let r = 1; r <= 4; r++) {
    const docName = renderDirectorsFloor1[r];
    const isOff = offDutyDirectors[docName];
    let orderVal = 0;
    if (!isOff) {
      activeCount1++;
      orderVal = activeCount1;
    } else {
      offDutyCount1++;
      orderVal = 10 + offDutyCount1;
    }
    
    const cell = document.querySelector(`#panel-floor1 .director-left-cell[data-row="${r}"]`);
    const fContainer = document.querySelector(`.slots-container[data-ward="female"][data-director="${r}"]`);
    const mContainer = document.querySelector(`.slots-container[data-ward="male"][data-director="${r}"]`);
    
    if (cell) {
      cell.style.order = orderVal;
      cell.setAttribute('draggable', activeTab !== 'all' ? 'true' : 'false');
    }
    if (fContainer) fContainer.style.order = orderVal;
    if (mContainer) mContainer.style.order = orderVal;
  }

  // 2. Reorder Floor 2 rows based on off-duty status using CSS order
  let activeCount2 = 0;
  let offDutyCount2 = 0;
  for (let r = 1; r <= 4; r++) {
    const docName = renderDirectorsFloor2[r];
    const isOff = offDutyDirectors[docName];
    let orderVal = 0;
    if (!isOff) {
      activeCount2++;
      orderVal = activeCount2;
    } else {
      offDutyCount2++;
      orderVal = 10 + offDutyCount2;
    }
    
    const cell = document.querySelector(`#panel-floor2 .director-left-cell[data-row="${r}"]`);
    const sContainer = document.querySelector(`.slots-container[data-ward="secondFloor"][data-director="${r}"]`);
    
    if (cell) {
      cell.style.order = orderVal;
      cell.setAttribute('draggable', activeTab !== 'all' ? 'true' : 'false');
    }
    if (sContainer) sContainer.style.order = orderVal;
  }

  // 3. Update 1st Floor tags and leave time buttons
  for (let r = 1; r <= 4; r++) {
    const tag = document.querySelector(`#panel-floor1 .director-tag[data-row="${r}"]`);
    const leaveBtn = document.querySelector(`#panel-floor1 .leave-time-btn[data-row="${r}"]`);
    const docName = renderDirectorsFloor1[r];
    const isOff = offDutyDirectors[docName];
    const cell = tag?.closest('.director-left-cell');
    
    if (tag) {
      tag.classList.remove('dr-bobin', 'dr-junhyun', 'dr-youngyun', 'dr-jihyun', 'dr-taeyun', 'dr-duho', 'off-duty');
      if (cell) cell.classList.remove('dr-bobin', 'dr-junhyun', 'dr-youngyun', 'dr-jihyun', 'dr-taeyun', 'dr-duho', 'off-duty');
      
      if (isOff) {
        tag.innerHTML = `${docName}<br><span style="font-size: 0.8rem; font-weight: 500; opacity: 0.85;">(퇴근)</span>`;
        tag.classList.add('off-duty');
        if (cell) cell.classList.add('off-duty');
      } else {
        tag.textContent = docName;
        applyDoctorClass(tag, cell, docName);
      }
    }
    
    if (leaveBtn) {
      const val = leaveTimes[docName];
      leaveBtn.textContent = val ? val : '퇴근시간';
      leaveBtn.classList.remove('active', 'off-duty');
      if (isOff) {
        leaveBtn.classList.add('off-duty');
      } else if (val) {
        leaveBtn.classList.add('active');
      }
    }
  }

  // 4. Update 2nd Floor tags and leave time buttons
  for (let r = 1; r <= 4; r++) {
    const tag = document.querySelector(`#panel-floor2 .director-tag[data-row="${r}"]`);
    const leaveBtn = document.querySelector(`#panel-floor2 .leave-time-btn[data-row="${r}"]`);
    const docName = renderDirectorsFloor2[r];
    const isOff = offDutyDirectors[docName];
    const cell = tag?.closest('.director-left-cell');
    
    if (tag) {
      tag.classList.remove('dr-bobin', 'dr-junhyun', 'dr-youngyun', 'dr-jihyun', 'dr-taeyun', 'dr-duho', 'off-duty');
      if (cell) cell.classList.remove('dr-bobin', 'dr-junhyun', 'dr-youngyun', 'dr-jihyun', 'dr-taeyun', 'dr-duho', 'off-duty');
      
      if (isOff) {
        tag.innerHTML = `${docName}<br><span style="font-size: 0.8rem; font-weight: 500; opacity: 0.85;">(퇴근)</span>`;
        tag.classList.add('off-duty');
        if (cell) cell.classList.add('off-duty');
      } else {
        tag.textContent = docName;
        applyDoctorClass(tag, cell, docName);
      }
    }
    
    if (leaveBtn) {
      const val = leaveTimes[docName];
      leaveBtn.textContent = val ? val : '퇴근시간';
      leaveBtn.classList.remove('active', 'off-duty');
      if (isOff) {
        leaveBtn.classList.add('off-duty');
      } else if (val) {
        leaveBtn.classList.add('active');
      }
    }
  }

  // 5. Update female ward slots
  for (let director = 1; director <= 4; director++) {
    const container = document.querySelector(`.slots-container[data-ward="female"][data-director="${director}"]`);
    if (container) {
      const docName = renderDirectorsFloor1[director];
      const isOff = offDutyDirectors[docName];
      if (isOff) {
        container.classList.add('off-duty');
      } else {
        container.classList.remove('off-duty');
      }
      
      container.classList.remove('dr-bobin', 'dr-junhyun', 'dr-youngyun', 'dr-jihyun', 'dr-taeyun', 'dr-duho');
      applyDoctorClass(container, null, docName);
      
      container.innerHTML = '';
      const arr = state.female[docName];
      const occupied = arr.filter(v => v !== null);
      
      let renderVals = [];
      if (occupied.length < 8) {
        renderVals = [...occupied, ...Array(8 - occupied.length).fill(null)];
      } else {
        renderVals = [...occupied, null];
      }
      
      renderVals.forEach((bedNum, idx) => {
        const slotEl = document.createElement('div');
        slotEl.className = 'slot';
        slotEl.setAttribute('data-doc', docName);
        slotEl.setAttribute('data-ward', 'female');
        slotEl.setAttribute('data-index', idx);
        updateSlotDisplay(slotEl, bedNum, idx);
        container.appendChild(slotEl);
      });
    }
  }

  // 6. Update male ward slots
  for (let director = 1; director <= 4; director++) {
    const container = document.querySelector(`.slots-container[data-ward="male"][data-director="${director}"]`);
    if (container) {
      const docName = renderDirectorsFloor1[director];
      const isOff = offDutyDirectors[docName];
      if (isOff) {
        container.classList.add('off-duty');
      } else {
        container.classList.remove('off-duty');
      }
      
      container.classList.remove('dr-bobin', 'dr-junhyun', 'dr-youngyun', 'dr-jihyun', 'dr-taeyun', 'dr-duho');
      applyDoctorClass(container, null, docName);
      
      container.innerHTML = '';
      const arr = state.male[docName];
      const occupied = arr.filter(v => v !== null);
      
      let renderVals = [];
      if (occupied.length < 8) {
        renderVals = [...occupied, ...Array(8 - occupied.length).fill(null)];
      } else {
        renderVals = [...occupied, null];
      }
      
      renderVals.forEach((bedNum, idx) => {
        const slotEl = document.createElement('div');
        slotEl.className = 'slot';
        slotEl.setAttribute('data-doc', docName);
        slotEl.setAttribute('data-ward', 'male');
        slotEl.setAttribute('data-index', idx);
        updateSlotDisplay(slotEl, bedNum, idx);
        container.appendChild(slotEl);
      });
    }
  }

  // 7. Update second floor slots
  for (let director = 1; director <= 4; director++) {
    const container = document.querySelector(`.slots-container[data-ward="secondFloor"][data-director="${director}"]`);
    if (container) {
      const docName = renderDirectorsFloor2[director];
      const isOff = offDutyDirectors[docName];
      if (isOff) {
        container.classList.add('off-duty');
      } else {
        container.classList.remove('off-duty');
      }
      
      container.classList.remove('dr-bobin', 'dr-junhyun', 'dr-youngyun', 'dr-jihyun', 'dr-taeyun', 'dr-duho');
      applyDoctorClass(container, null, docName);
      
      container.innerHTML = '';
      const arr = state.secondFloor[docName];
      const occupied = arr.filter(v => v !== null);
      
      let renderVals = [];
      if (occupied.length < 8) {
        renderVals = [...occupied, ...Array(8 - occupied.length).fill(null)];
      } else {
        renderVals = [...occupied, null];
      }
      
      renderVals.forEach((bedNum, idx) => {
        const slotEl = document.createElement('div');
        slotEl.className = 'slot';
        slotEl.setAttribute('data-doc', docName);
        slotEl.setAttribute('data-ward', 'secondFloor');
        slotEl.setAttribute('data-index', idx);
        updateSlotDisplay(slotEl, bedNum, idx);
        container.appendChild(slotEl);
      });
    }
  }
}

// Update individual slot element
function updateSlotDisplay(slotEl, val, index) {
  // Reset all classes related to value rendering
  slotEl.classList.remove('occupied', 'opt-ultrasound', 'opt-consultation', 'opt-chuna', 'opt-diet', 'opt-divider', 'opt-arrow', 'opt-meal', 'opt-placenta', 'in-progress');
  
  if (val !== null) {
    let isProgress = false;
    let cleanVal = val;
    if (typeof val === 'string' && val.endsWith('_progress')) {
      isProgress = true;
      cleanVal = val.substring(0, val.length - 9);
      const parsed = parseInt(cleanVal, 10);
      if (!isNaN(parsed) && String(parsed) === cleanVal) {
        cleanVal = parsed;
      }
    }

    slotEl.classList.add('occupied');
    
    // Only show visual in-progress blinking/pulse if index is 0 (the leftmost slot)
    const showProgressVisuals = isProgress && (index === 0);
    
    if (showProgressVisuals) {
      slotEl.classList.add('in-progress');
    }
    
    let magnetClass = 'slot-magnet';
    if (showProgressVisuals) {
      magnetClass += ' in-progress';
    }
    
    let displayVal = cleanVal;
    // Match special string options
    if (cleanVal === '초음파') {
      slotEl.classList.add('opt-ultrasound');
      magnetClass += ' text-magnet';
    } else if (cleanVal === '상담') {
      slotEl.classList.add('opt-consultation');
      magnetClass += ' text-magnet';
    } else if (cleanVal === '추나') {
      slotEl.classList.add('opt-chuna');
      magnetClass += ' text-magnet';
    } else if (cleanVal === '린다이어트') {
      slotEl.classList.add('opt-diet');
      magnetClass += ' text-magnet';
      displayVal = '린다';
    } else if (cleanVal === '자하거/디나') {
      slotEl.classList.add('opt-placenta');
      magnetClass += ' text-magnet';
      displayVal = '자하거<br>디나';
    } else if (cleanVal === '식사') {
      slotEl.classList.add('opt-meal');
      magnetClass += ' text-magnet';
    } else if (cleanVal === '/') {
      slotEl.classList.add('opt-divider');
      magnetClass += ' text-magnet';
    } else if (cleanVal === '▶' || cleanVal === '◀' || cleanVal === '▲' || cleanVal === '▼' || cleanVal === '▼여' || cleanVal === '▼남' || cleanVal === '➡️' || cleanVal === '⬅️' || cleanVal === '⬆️' || cleanVal === '⬇️' || cleanVal === '→' || cleanVal === '←' || cleanVal === '↑' || cleanVal === '↓') {
      slotEl.classList.add('opt-arrow');
      magnetClass += ' text-magnet';
      if (cleanVal === '▶' || cleanVal === '➡️' || cleanVal === '→') {
        displayVal = '▶<br><span class="arrow-subtext">남치</span>';
      } else if (cleanVal === '◀' || cleanVal === '⬅️' || cleanVal === '←') {
        displayVal = '◀<br><span class="arrow-subtext">여치</span>';
      } else if (cleanVal === '▲' || cleanVal === '⬆️' || cleanVal === '↑') {
        displayVal = '▲<br><span class="arrow-subtext">2층</span>';
      } else if (cleanVal === '▼' || cleanVal === '⬇️' || cleanVal === '↓') {
        displayVal = '▼<br><span class="arrow-subtext">1층</span>';
      } else if (cleanVal === '▼여') {
        displayVal = '▼<br><span class="arrow-subtext">1층 여치</span>';
      } else if (cleanVal === '▼남') {
        displayVal = '▼<br><span class="arrow-subtext">1층 남치</span>';
      }
    }
    
    slotEl.innerHTML = `<div class="${magnetClass}" draggable="true">${displayVal}</div>`;
    
  } else {
    slotEl.innerHTML = '';
  }
}

// Clear progress status from other wards for the same doctor to ensure only one is active at a time
function clearOtherWardsProgress(docName, activeWard) {
  const wards = ['female', 'male', 'secondFloor'];
  wards.forEach(w => {
    if (w !== activeWard && state[w] && state[w][docName]) {
      state[w][docName] = state[w][docName].map(val => {
        if (typeof val === 'string' && val.endsWith('_progress')) {
          const clean = val.substring(0, val.length - 9);
          const parsed = parseInt(clean, 10);
          return (!isNaN(parsed) && String(parsed) === clean) ? parsed : clean;
        }
        return val;
      });
    }
  });
}

// Handle cross-ward routing and standard queue shifts when an item is cleared from index 0
function handleQueueShift(ward, docName, index, clearedValue) {
  if (index !== 0 || !clearedValue) return;
  
  let cleanVal = clearedValue;
  if (typeof clearedValue === 'string' && clearedValue.endsWith('_progress')) {
    cleanVal = clearedValue.substring(0, clearedValue.length - 9);
  }
  
  // 1. Cross-ward routing trigger if a transfer button was clicked
  let targetWard = null;
  if (cleanVal === '▶' || cleanVal === '➡️' || cleanVal === '→') {
    targetWard = 'male';
  } else if (cleanVal === '◀' || cleanVal === '⬅️' || cleanVal === '←') {
    targetWard = 'female';
  } else if (cleanVal === '▲' || cleanVal === '⬆️' || cleanVal === '↑') {
    targetWard = 'secondFloor';
  } else if (cleanVal === '▼' || cleanVal === '⬇️' || cleanVal === '↓') {
    targetWard = 'female'; // Default to female ward for 1st floor
  } else if (cleanVal === '▼여') {
    targetWard = 'female';
  } else if (cleanVal === '▼남') {
    targetWard = 'male';
  }
  
  if (targetWard) {
    const targetItem = state[targetWard][docName][0];
    if (targetItem !== null && targetItem !== undefined) {
      if (typeof targetItem !== 'string' || !targetItem.endsWith('_progress')) {
        console.log(`[Queue Routing] Routing in-progress from ${ward} to ${targetWard} for ${docName}. Setting item ${targetItem} to progress.`);
        state[targetWard][docName][0] = String(targetItem) + '_progress';
        clearOtherWardsProgress(docName, targetWard);
        return; // Return early so we do NOT auto-start the next patient in the current ward!
      }
    }
  }
  
  // 2. Standard auto-transition for the current ward's next item
  const nextItem = state[ward][docName][0];
  if (nextItem !== null && nextItem !== undefined) {
    if (typeof nextItem !== 'string' || !nextItem.endsWith('_progress')) {
      console.log(`[Queue Routing] Auto-transitioning next item ${nextItem} to progress in current ward ${ward}.`);
      state[ward][docName][0] = String(nextItem) + '_progress';
      clearOtherWardsProgress(docName, ward);
    }
  }
}

// Triggered when a slot is long-pressed (reverts progress back to waiting)
function triggerLongPress(slot) {
  const docName = slot.dataset.doc;
  const ward = slot.dataset.ward;
  const index = parseInt(slot.dataset.index, 10);
  
  const currentVal = state[ward][docName][index];
  if (currentVal !== null && currentVal !== undefined && typeof currentVal === 'string' && currentVal.endsWith('_progress')) {
    // Vibrate device if supported
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    const cleanVal = currentVal.substring(0, currentVal.length - 9);
    activeCancelSlot = { ward, docName, index, cleanVal };
    
    // Display cleaner option names in confirmation
    let displayConfirmVal = cleanVal;
    if (cleanVal === '자하거/디나') displayConfirmVal = '자하거/디나';
    
    cancelProgressInstruction.innerHTML = `<span style="font-weight:700; color:var(--text-primary);">'${displayConfirmVal}'</span> 배드의 치료 진행을 취소하고 대기 상태로 되돌리시겠습니까?`;
    
    // Open custom modal
    cancelProgressModalOverlay.classList.add('active');
  }
}

// Close Cancel Progress Modal
function closeCancelProgressModal() {
  cancelProgressModalOverlay.classList.remove('active');
  activeCancelSlot = null;
}

// Confirm and process the Cancel Progress action
function confirmCancelProgress() {
  if (activeCancelSlot) {
    const { ward, docName, index, cleanVal } = activeCancelSlot;
    const parsed = parseInt(cleanVal, 10);
    state[ward][docName][index] = (!isNaN(parsed) && String(parsed) === cleanVal) ? parsed : cleanVal;
    saveState();
    updateUI();
    closeCancelProgressModal();
    console.log(`[Long Press Debug] Reverted slot via custom modal: ${ward} | ${docName} | index ${index} back to waiting.`);
  }
}

// Setup Event Listeners
function setupEventListeners() {
  const boardWrapper = document.querySelector('.board-wrapper');
  
  // Long press gesture detection to cancel "진행중 (In-Progress)" state
  const startLongPress = (e) => {
    const slot = e.target.closest('.slot');
    if (slot) {
      const docName = slot.dataset.doc;
      const ward = slot.dataset.ward;
      const index = parseInt(slot.dataset.index, 10);
      
      const val = state[ward][docName][index];
      if (val !== null && val !== undefined && typeof val === 'string' && val.endsWith('_progress')) {
        isLongPress = false;
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
          isLongPress = true;
          triggerLongPress(slot);
        }, 600); // 600ms hold sweet spot
      }
    }
  };

  const cancelLongPress = () => {
    clearTimeout(longPressTimer);
  };

  boardWrapper.addEventListener('mousedown', startLongPress);
  boardWrapper.addEventListener('touchstart', startLongPress, { passive: true });
  
  boardWrapper.addEventListener('mouseup', cancelLongPress);
  boardWrapper.addEventListener('mouseleave', cancelLongPress);
  boardWrapper.addEventListener('touchend', cancelLongPress, { passive: true });
  boardWrapper.addEventListener('touchcancel', cancelLongPress, { passive: true });
  
  // Tab buttons click listeners
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      
      // Set active tab attribute on body
      document.body.setAttribute('data-active-tab', tab);
      
      // Update active class
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const panel1 = document.getElementById('panel-floor1');
      const panel2 = document.getElementById('panel-floor2');
      
      if (tab === 'all') {
        panel1.style.display = 'block';
        panel2.style.display = 'block';
      } else if (tab === 'floor1') {
        panel1.style.display = 'block';
        panel2.style.display = 'none';
      } else if (tab === 'floor2') {
        panel1.style.display = 'none';
        panel2.style.display = 'block';
      }
      
      // Update UI to apply correct doctor order and draggable settings for the active tab
      updateUI();
    });
  });

// Helper to check if an item is a space transition arrow
function isArrowItem(val) {
  if (typeof val !== 'string') return false;
  const arrows = ['▶', '◀', '▲', '▼', '▼여', '▼남', '➡️', '⬅️', '⬆️', '⬇️', '→', '←', '↑', '↓'];
  return arrows.includes(val);
}

  // Slot and Director tag clicking (using event delegation on main container)
  boardWrapper.addEventListener('click', (e) => {
    const slot = e.target.closest('.slot');
    if (slot) {
      if (isLongPress) {
        isLongPress = false;
        return; // Skip click action if handled by long press
      }
      const docName = slot.dataset.doc;
      const ward = slot.dataset.ward;
      const index = parseInt(slot.dataset.index, 10);
      
      const currentVal = state[ward][docName][index];
      console.log(`[Click Debug] Clicked slot: ${ward} | ${docName} | index ${index} | currentVal: ${currentVal}`);
      
      if (currentVal !== null && currentVal !== undefined) {
        const isProgress = typeof currentVal === 'string' && currentVal.endsWith('_progress');
        
        if (index === 0) {
          // INDEX 0: Original immediate behavior (no confirmation needed)
          if (isProgress) {
            console.log(`[Click Debug] Click on progress item at index 0. Immediate delete.`);
            const clearedVal = state[ward][docName][index];
            if (state[ward][docName][1] && isArrowItem(state[ward][docName][1])) {
              const arrowVal = state[ward][docName][1];
              state[ward][docName].splice(0, 2);
              compactRowState(ward, docName);
              handleQueueShift(ward, docName, 0, arrowVal);
            } else {
              state[ward][docName].splice(index, 1);
              compactRowState(ward, docName);
              handleQueueShift(ward, docName, index, clearedVal);
            }
          } else {
            console.log(`[Click Debug] Click on normal item at index 0. Transitioning to progress.`);
            state[ward][docName][index] = String(currentVal) + '_progress';
            clearOtherWardsProgress(docName, ward);
          }
          saveState();
          updateUI();
        } else {
          // INDEX >= 1: Requires double-click within 3 seconds to delete (indicated visually by red styling)
          const isConfirming = slot.classList.contains('delete-confirm');
          
          if (isConfirming) {
            console.log(`[Click Debug] Second click on waiting item at index ${index} while red. Deleting.`);
            if (waitingRevertTimeout) {
              clearTimeout(waitingRevertTimeout);
              waitingRevertTimeout = null;
            }
            
            // Delete patient
            state[ward][docName].splice(index, 1);
            compactRowState(ward, docName);
            saveState();
            updateUI();
          } else {
            console.log(`[Click Debug] First click on waiting item at index ${index}. Activating 3s red confirmation.`);
            
            // Clear any other active confirmations
            document.querySelectorAll('.slot.delete-confirm').forEach(el => {
              el.classList.remove('delete-confirm');
            });
            if (waitingRevertTimeout) {
              clearTimeout(waitingRevertTimeout);
            }
            
            // Turn this slot red
            slot.classList.add('delete-confirm');
            
            // Start 3 second timer to revert back to normal
            waitingRevertTimeout = setTimeout(() => {
              console.log(`[Click Debug] Confirmation expired. Removing red class.`);
              slot.classList.remove('delete-confirm');
              waitingRevertTimeout = null;
            }, 3000);
          }
        }
        console.log(`[Click Debug] State after click:`, JSON.stringify(state[ward][docName]));
      } else {
        // Open modal for empty slots
        openModal(ward, docName, index);
      }
      return;
    }

    const dirTag = e.target.closest('.director-tag');
    if (dirTag) {
      const panel = dirTag.closest('.board-panel');
      const isFloor1 = panel.id === 'panel-floor1';
      const row = parseInt(dirTag.dataset.row, 10);
      const docName = isFloor1 ? rowDirectorsFloor1[row] : rowDirectorsFloor2[row];
      openDirectorModal(docName, isFloor1 ? 1 : 2, row);
    }

    const leaveBtn = e.target.closest('.leave-time-btn');
    if (leaveBtn) {
      const panel = leaveBtn.closest('.board-panel');
      const isFloor1 = panel.id === 'panel-floor1';
      const row = parseInt(leaveBtn.dataset.row, 10);
      const docName = isFloor1 ? rowDirectorsFloor1[row] : rowDirectorsFloor2[row];
      openLeaveTimeModal(docName);
    }
  });

  // Drag start
  boardWrapper.addEventListener('dragstart', (e) => {
    clearTimeout(longPressTimer);
    isLongPress = false;
    
    
    const magnet = e.target.closest('.slot-magnet');
    const cell = e.target.closest('.director-left-cell');
    
    if (magnet) {
      dragType = 'magnet';
      const slot = magnet.closest('.slot');
      
      dragSource = {
        ward: slot.dataset.ward,
        docName: slot.dataset.doc,
        index: parseInt(slot.dataset.index, 10)
      };
      
      magnet.classList.add('dragging');
      e.dataTransfer.setData('text/plain', ''); // Required for Firefox drag support
    } else if (cell) {
      const activeTab = document.body.getAttribute('data-active-tab') || 'all';
      if (activeTab === 'all') {
        e.preventDefault();
        return;
      }
      dragType = 'row';
      const panel = cell.closest('.board-panel');
      dragSourceFloor = panel.id === 'panel-floor1' ? 1 : 2;
      dragSourceRow = parseInt(cell.dataset.row, 10);
      cell.classList.add('dragging-row');
      e.dataTransfer.setData('text/plain', '');
    }
  });

  // Drag end
  boardWrapper.addEventListener('dragend', (e) => {
    if (dragType === 'magnet') {
      const magnet = e.target.closest('.slot-magnet');
      if (magnet) {
        magnet.classList.remove('dragging');
      }
    } else if (dragType === 'row') {
      document.querySelectorAll('.director-left-cell').forEach(c => {
        c.classList.remove('dragging-row', 'drag-over-row');
      });
    }
    dragType = null;
    dragSourceRow = null;
    dragSourceFloor = null;
    dragSource = { ward: null, docName: null, index: null };
  });

  // Drag over (allow drop)
  boardWrapper.addEventListener('dragover', (e) => {
    if (dragType === 'magnet') {
      const slot = e.target.closest('.slot');
      const container = e.target.closest('.slots-container');
      const cell = e.target.closest('.director-left-cell');
      
      if (slot || container || cell) {
        let targetDoc = null;
        if (slot) {
          targetDoc = slot.dataset.doc;
        } else if (container) {
          const directorId = container.dataset.director;
          const isFloor1 = container.dataset.ward !== 'secondFloor';
          const panelId = isFloor1 ? '#panel-floor1' : '#panel-floor2';
          const tag = document.querySelector(`${panelId} .director-tag[data-row="${directorId}"]`);
          targetDoc = tag ? tag.textContent.replace('(퇴근)', '').trim() : null;
        } else if (cell) {
          const tag = cell.querySelector('.director-tag');
          targetDoc = tag ? tag.textContent.replace('(퇴근)', '').trim() : null;
        }
        
        // If target doctor is off-duty, do not allow drop
        if (targetDoc && offDutyDirectors[targetDoc]) {
          return;
        }

        e.preventDefault();
        if (dragSource.ward) {
          // Clear other drag-overs first
          document.querySelectorAll('.slot.drag-over').forEach(el => el.classList.remove('drag-over'));
          document.querySelectorAll('.slots-container.drag-over-container').forEach(el => el.classList.remove('drag-over-container'));
          
          if (slot) {
            slot.classList.add('drag-over');
          } else if (container) {
            container.classList.add('drag-over-container');
          }
        }
      }
    } else if (dragType === 'row') {
      const cell = e.target.closest('.director-left-cell');
      if (cell) {
        const panel = cell.closest('.board-panel');
        const targetFloor = panel.id === 'panel-floor1' ? 1 : 2;
        if (targetFloor === dragSourceFloor) {
          const cellRow = parseInt(cell.dataset.row, 10);
          if (cellRow !== dragSourceRow) {
            e.preventDefault();
            cell.classList.add('drag-over-row');
          }
        }
      }
    }
  });

  // Drag leave
  boardWrapper.addEventListener('dragleave', (e) => {
    if (dragType === 'magnet') {
      const slot = e.target.closest('.slot');
      const container = e.target.closest('.slots-container');
      if (slot) {
        slot.classList.remove('drag-over');
      }
      if (container) {
        container.classList.remove('drag-over-container');
      }
    } else if (dragType === 'row') {
      const cell = e.target.closest('.director-left-cell');
      if (cell) {
        cell.classList.remove('drag-over-row');
      }
    }
  });

  // Drop
  boardWrapper.addEventListener('drop', (e) => {
    if (dragType === 'magnet') {
      let targetDoc = null;
      let targetWard = null;
      let targetIndex = null;

      const slot = e.target.closest('.slot');
      const container = e.target.closest('.slots-container');
      const cell = e.target.closest('.director-left-cell');

      if (slot) {
        targetDoc = slot.dataset.doc;
        targetWard = slot.dataset.ward;
        targetIndex = parseInt(slot.dataset.index, 10);
        slot.classList.remove('drag-over');
      } else if (container) {
        targetWard = container.dataset.ward;
        const directorId = container.dataset.director;
        const isFloor1 = targetWard !== 'secondFloor';
        const panelId = isFloor1 ? '#panel-floor1' : '#panel-floor2';
        const tag = document.querySelector(`${panelId} .director-tag[data-row="${directorId}"]`);
        targetDoc = tag ? tag.textContent.replace('(퇴근)', '').trim() : null;
        
        if (targetDoc && targetWard) {
          const activeTarget = state[targetWard][targetDoc].filter(v => v !== null);
          targetIndex = activeTarget.length;
        }
        container.classList.remove('drag-over-container');
      } else if (cell) {
        const directorId = cell.dataset.row;
        const panel = cell.closest('.board-panel');
        const isFloor1 = panel.id === 'panel-floor1';
        targetWard = isFloor1 ? dragSource.ward : 'secondFloor';
        const tag = cell.querySelector('.director-tag');
        targetDoc = tag ? tag.textContent.replace('(퇴근)', '').trim() : null;
        
        if (targetDoc && targetWard) {
          const activeTarget = state[targetWard][targetDoc].filter(v => v !== null);
          targetIndex = activeTarget.length;
        }
      }

      if (targetDoc && targetWard && targetIndex !== null && dragSource.ward) {
        e.preventDefault();
        
        // Block dropping on off-duty doctors
        if (offDutyDirectors[targetDoc]) {
          return;
        }

        const sourceWard = dragSource.ward;
        const sourceDoc = dragSource.docName;
        const sourceIndex = dragSource.index;

        const sourceArr = state[sourceWard][sourceDoc];
        const targetArr = state[targetWard][targetDoc];
        
        const item = sourceArr[sourceIndex];
        if (item !== null) {
          if (sourceWard === targetWard && sourceDoc === targetDoc) {
            // Reordering in the same row
            const activeList = sourceArr.filter(v => v !== null);
            const activeSourceIdx = sourceIndex;
            let activeTargetIdx = targetIndex;
            
            if (activeTargetIdx >= activeList.length) {
              activeTargetIdx = activeList.length - 1;
            }

            // Reorder
            activeList.splice(activeSourceIdx, 1);
            activeList.splice(activeTargetIdx, 0, item);

            state[sourceWard][sourceDoc] = activeList;
            compactRowState(sourceWard, sourceDoc);
          } else {
            // Reordering across different rows/doctors
            const activeSource = sourceArr.filter(v => v !== null);
            const activeTarget = targetArr.filter(v => v !== null);

            activeSource.splice(sourceIndex, 1);
            
            let activeTargetIdx = targetIndex;
            if (activeTargetIdx > activeTarget.length) {
              activeTargetIdx = activeTarget.length;
            }
            activeTarget.splice(activeTargetIdx, 0, item);

            state[sourceWard][sourceDoc] = activeSource;
            state[targetWard][targetDoc] = activeTarget;

            compactRowState(sourceWard, sourceDoc);
            compactRowState(targetWard, targetDoc);
          }
          
          saveState();
          updateUI();
        }
      }
    } else if (dragType === 'row') {
      const cell = e.target.closest('.director-left-cell');
      if (cell) {
        cell.classList.remove('drag-over-row');
        const panel = cell.closest('.board-panel');
        const targetFloor = panel.id === 'panel-floor1' ? 1 : 2;
        const targetRow = parseInt(cell.dataset.row, 10);
        if (dragSourceRow !== null && targetRow !== null && dragSourceRow !== targetRow && targetFloor === dragSourceFloor) {
          e.preventDefault();
          swapRows(targetFloor, dragSourceRow, targetRow);
        }
      }
    }
  });

  // Modal interactions
  btnCancelModal.addEventListener('click', closeModal);
  btnClearSlot.addEventListener('click', clearActiveSlot);
  
  // Director Modal interactions
  btnCancelDirectorModal.addEventListener('click', closeDirectorModal);
  btnDirectorOffDuty.addEventListener('click', () => {
    if (activeDirectorName !== null) {
      // Toggle off-duty state
      offDutyDirectors[activeDirectorName] = !offDutyDirectors[activeDirectorName];
      saveState();
      updateUI();
      closeDirectorModal();
    }
  });
  directorModalOverlay.addEventListener('click', (e) => {
    if (e.target === directorModalOverlay) {
      closeDirectorModal();
    }
  });

  // Leave Time Modal interactions
  btnCancelLeaveModal.addEventListener('click', closeLeaveTimeModal);
  leaveTimeModalOverlay.addEventListener('click', (e) => {
    if (e.target === leaveTimeModalOverlay) {
      closeLeaveTimeModal();
    }
  });

  // Reset All Button
  const btnResetAll = document.getElementById('btn-reset-all');
  if (btnResetAll) {
    btnResetAll.addEventListener('click', () => {
      if (confirm('모든 베드 배치를 초기화(비우기)하시겠습니까?')) {
        resetAllSlots();
      }
    });
  }

  // Sync Schedule Button
  const btnSyncSchedule = document.getElementById('btn-sync-schedule');
  if (btnSyncSchedule) {
    btnSyncSchedule.addEventListener('click', () => {
      if (confirm('오늘의 의료진 근무 및 퇴근 시간을 Supabase에서 자동으로 가져오시겠습니까?')) {
        syncScheduleFromSupabase();
      }
    });
  }
  
  // Close modal when clicking overlay
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  // Cancel Progress Confirmation Modal interactions
  btnConfirmCancelProgress.addEventListener('click', confirmCancelProgress);
  btnCancelProgressModal.addEventListener('click', closeCancelProgressModal);
  cancelProgressModalOverlay.addEventListener('click', (e) => {
    if (e.target === cancelProgressModalOverlay) {
      closeCancelProgressModal();
    }
  });

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalOverlay.classList.contains('active')) {
        closeModal();
      }
      if (directorModalOverlay.classList.contains('active')) {
        closeDirectorModal();
      }
      if (leaveTimeModalOverlay.classList.contains('active')) {
        closeLeaveTimeModal();
      }
      if (cancelProgressModalOverlay.classList.contains('active')) {
        closeCancelProgressModal();
      }
    }
  });
}

// Open Selection Modal
function openModal(ward, docName, index) {
  activeSlot = { ward, docName, index };
  
  // Collect all assigned numbers in the current ward to prevent duplicates
  const assignedNumbers = new Set();
  const availableDoctors = ['최보빈', '김준현', '김영윤', '박지현', '안태윤', '황두호'];
  availableDoctors.forEach(d => {
    state[ward][d].forEach(val => {
      if (val !== null && val !== undefined) {
        let cleanVal = val;
        if (typeof val === 'string' && val.endsWith('_progress')) {
          cleanVal = val.substring(0, val.length - 9);
        }
        const parsed = parseInt(cleanVal, 10);
        if (!isNaN(parsed) && String(parsed) === String(cleanVal)) {
          assignedNumbers.add(parsed);
        }
      }
    });
  });
  
  // Generate bed number buttons
  modalBedGrid.innerHTML = '';
  const currentVal = state[ward][docName][index];
  let cleanCurrentVal = currentVal;
  if (currentVal !== null && currentVal !== undefined && typeof currentVal === 'string' && currentVal.endsWith('_progress')) {
    cleanCurrentVal = currentVal.substring(0, currentVal.length - 9);
    const parsed = parseInt(cleanCurrentVal, 10);
    if (!isNaN(parsed) && String(parsed) === cleanCurrentVal) {
      cleanCurrentVal = parsed;
    }
  }
  
  let minBed = 1;
  let maxBed = 12;
  if (ward === 'male') {
    minBed = 21;
    maxBed = 28;
  } else if (ward === 'secondFloor') {
    minBed = 31;
    maxBed = 38;
  }

  for (let i = minBed; i <= maxBed; i++) {
    const btn = document.createElement('button');
    btn.className = 'bed-btn';
    if (cleanCurrentVal === i) {
      btn.classList.add('active');
    }
    btn.textContent = i;
    
    // Dim if already assigned in this ward to prevent duplicates
    if (assignedNumbers.has(i)) {
      btn.classList.add('disabled');
      btn.style.opacity = '0.35';
      btn.style.pointerEvents = 'none';
      btn.style.cursor = 'not-allowed';
    } else {
      btn.addEventListener('click', () => selectBedNumber(i));
    }
    modalBedGrid.appendChild(btn);
  }

  // Generate special options buttons
  modalSpecialGrid.innerHTML = '';
  const specialOptions = [
    { name: '상담', class: 'btn-consultation' },
    { name: '추나', class: 'btn-chuna' },
    { name: '초음파', class: 'btn-ultrasound' },
    { name: '자하거/디나', class: 'btn-placenta', displayName: '자하거<br>디나' },
    { name: '린다이어트', class: 'btn-diet' }
  ];

  specialOptions.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = `special-btn ${opt.class}`;
    if (cleanCurrentVal === opt.name) {
      btn.classList.add('active');
    }
    btn.innerHTML = opt.displayName ? opt.displayName : opt.name;
    btn.addEventListener('click', () => selectBedNumber(opt.name));
    modalSpecialGrid.appendChild(btn);
  });

  // Generate etc options buttons
  modalEtcGrid.innerHTML = '';
  const etcOptions = [];

  if (ward === 'female') {
    etcOptions.push({ 
      name: '▶', 
      class: 'btn-arrow', 
      displayName: '▶<br><span class="arrow-subtext">남치</span>' 
    });
    etcOptions.push({ 
      name: '▲', 
      class: 'btn-arrow', 
      displayName: '▲<br><span class="arrow-subtext">2층</span>' 
    });
  } else if (ward === 'male') {
    etcOptions.push({ 
      name: '◀', 
      class: 'btn-arrow', 
      displayName: '◀<br><span class="arrow-subtext">여치</span>' 
    });
    etcOptions.push({ 
      name: '▲', 
      class: 'btn-arrow', 
      displayName: '▲<br><span class="arrow-subtext">2층</span>' 
    });
  } else if (ward === 'secondFloor') {
    etcOptions.push({ 
      name: '▼여', 
      class: 'btn-arrow', 
      displayName: '▼<br><span class="arrow-subtext">1층 여치</span>' 
    });
    etcOptions.push({ 
      name: '▼남', 
      class: 'btn-arrow', 
      displayName: '▼<br><span class="arrow-subtext">1층 남치</span>' 
    });
  }

  // Send '식사' to the far right
  etcOptions.push({ name: '식사', class: 'btn-meal' });

  etcOptions.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = `special-btn ${opt.class}`;
    if (cleanCurrentVal === opt.name) {
      btn.classList.add('active');
    }
    btn.innerHTML = opt.displayName ? opt.displayName : opt.name;
    btn.addEventListener('click', () => selectBedNumber(opt.name));
    modalEtcGrid.appendChild(btn);
  });

  // Show "Clear" button only if slot is occupied
  if (currentVal !== null && currentVal !== undefined) {
    btnClearSlot.style.display = 'block';
  } else {
    btnClearSlot.style.display = 'none';
  }

  // Open modal animation trigger
  modalOverlay.classList.add('active');
}

// Close Modal
function closeModal() {
  modalOverlay.classList.remove('active');
}

// Select Bed Number (Left-aligned FIFO insertion)
function selectBedNumber(num) {
  const { ward, docName, index } = activeSlot;
  if (ward && docName && index !== null) {
    const currentVal = state[ward][docName][index];
    if (currentVal === null || currentVal === undefined) {
      // Adding a new patient: append to the active list
      const activeList = state[ward][docName].filter(val => val !== null);
      activeList.push(num);
      state[ward][docName] = activeList;
    } else {
      // Editing an existing patient at the clicked index
      state[ward][docName][index] = num;
    }
    compactRowState(ward, docName);
    saveState();
    updateUI();
    closeModal();
  }
}

// Clear selected slot (remove magnet and shift remaining left)
function clearActiveSlot() {
  const { ward, docName, index } = activeSlot;
  if (ward && docName && index !== null) {
    const clearedVal = state[ward][docName][index];
    const wasProgress = typeof clearedVal === 'string' && clearedVal.endsWith('_progress');
    state[ward][docName].splice(index, 1);
    compactRowState(ward, docName);
    
    if (wasProgress) {
      handleQueueShift(ward, docName, index, clearedVal);
    }
    
    saveState();
    updateUI();
    closeModal();
  }
}

// Reset All Slots
function resetAllSlots() {
  const availableDoctors = ['최보빈', '김준현', '김영윤', '박지현', '안태윤', '황두호'];
  availableDoctors.forEach(d => {
    state.female[d] = Array(8).fill(null);
    state.male[d] = Array(8).fill(null);
    state.secondFloor[d] = Array(8).fill(null);
  });
  saveState();
  updateUI();
}

// Start Clock
function startClock() {
  function tick() {
    const now = new Date();
    
    // Formatting date: 2026년 6월 30일 (화) 오전 08:44:00
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    const day = weekDays[now.getDay()];
    
    let hours = now.getHours();
    const ampm = hours >= 12 ? '오후' : '오전';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const formattedHours = String(hours).padStart(2, '0');
    
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    liveClockEl.textContent = `${year}년 ${month}월 ${date}일 (${day}) ${ampm} ${formattedHours}:${minutes}:${seconds}`;
  }
  
  tick();
  setInterval(tick, 1000);
}

// Open Director Selection Modal
let activeDirectorFloor = null;
function openDirectorModal(docName, floor, row) {
  activeDirectorName = docName;
  activeDirectorFloor = floor;
  activeDirectorRow = row;
  
  modalDirectorGrid.innerHTML = '';
  const availableDoctors = ['최보빈', '김준현', '김영윤', '박지현', '안태윤', '황두호'];
  
  availableDoctors.forEach(d => {
    const btn = document.createElement('button');
    btn.className = 'bed-btn';
    applyDoctorClass(btn, null, d);
    
    if (docName === d) {
      btn.classList.add('active');
    }
    btn.textContent = d;
    btn.addEventListener('click', () => selectDoctor(d));
    modalDirectorGrid.appendChild(btn);
  });
  
  // Set off-duty toggle button state
  if (offDutyDirectors[docName]) {
    btnDirectorOffDuty.textContent = '퇴근 취소';
    btnDirectorOffDuty.classList.add('btn-return-work');
  } else {
    btnDirectorOffDuty.textContent = '퇴근';
    btnDirectorOffDuty.classList.remove('btn-return-work');
  }
  
  directorModalOverlay.classList.add('active');
}

// Select Doctor for assigned row
function selectDoctor(docName) {
  if (activeDirectorFloor !== null && activeDirectorRow !== null) {
    const directors = activeDirectorFloor === 1 ? rowDirectorsFloor1 : rowDirectorsFloor2;
    directors[activeDirectorRow] = docName;
    offDutyDirectors[docName] = false; // Turn off off-duty state!
    
    saveState();
    updateUI();
    closeDirectorModal();
  }
}

// Close Director Modal
function closeDirectorModal() {
  directorModalOverlay.classList.remove('active');
  activeDirectorFloor = null;
  activeDirectorRow = null;
  activeDirectorName = null;
}

// Open Leave Time Selection Modal
function openLeaveTimeModal(docName) {
  activeLeaveTimeDoc = docName;
  
  modalLeaveTimeGrid.innerHTML = '';
  const options = ['4시', '5시', '6시', '7시', '야간', '초기화'];
  
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'bed-btn';
    if (opt === '초기화') {
      btn.classList.add('btn-clear-opt');
    }
    
    // Check if active
    const currentVal = leaveTimes[docName];
    if (currentVal === opt || (opt === '초기화' && currentVal === null)) {
      btn.classList.add('active');
    }
    
    btn.textContent = opt;
    btn.addEventListener('click', () => selectLeaveTime(opt === '초기화' ? null : opt));
    modalLeaveTimeGrid.appendChild(btn);
  });
  
  leaveTimeModalOverlay.classList.add('active');
}

// Select Leave Time for doctor
function selectLeaveTime(val) {
  if (activeLeaveTimeDoc !== null) {
    leaveTimes[activeLeaveTimeDoc] = val;
    saveState();
    updateUI();
    closeLeaveTimeModal();
  }
}

// Close Leave Time Modal
function closeLeaveTimeModal() {
  leaveTimeModalOverlay.classList.remove('active');
  activeLeaveTimeDoc = null;
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', initApp);

// Automatically fetch today's doctor names and leave times from Supabase REST API
async function syncScheduleFromSupabase({ silent = false } = {}) {
  const syncBtn = document.getElementById('btn-sync-schedule');
  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.innerHTML = '🔄 가져오는 중...';
  }
  
  try {
    // Get today's date in YYYY-MM-DD format (local timezone)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${date}`;
    
    // Fetch from Supabase REST API
    const url = `https://wfyuxxskwlczoyisdcmy.supabase.co/rest/v1/schedules?date=eq.${todayStr}&select=*`;
    const response = await fetch(url, {
      headers: {
        "apikey": "sb_publishable_yUeE6ynEpbR3Eq-k3Gv1Ew_1DiaJHjz",
        "Authorization": "Bearer sb_publishable_yUeE6ynEpbR3Eq-k3Gv1Ew_1DiaJHjz"
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const schedules = await response.json();
    if (!schedules || schedules.length === 0) {
      if (!silent) {
        alert(`오늘(${todayStr}) 스케쥴 데이터가 Supabase에 없습니다.`);
      }
      return;
    }
    
    // Map of doctor_id to Korean names
    const doctorMap = {
      'choi': '최보빈',
      'kim-jun': '김준현',
      'kim-young': '김영윤',
      'park': '박지현',
      'ahn': '안태윤',
      'hwang': '황두호'
    };
    
    // Process schedules
    const workingDoctors = [];
    const offDutyDoctorsList = [];
    
    // Sort according to DOCTOR_ORDER
    const doctorOrder = ['choi', 'kim-jun', 'kim-young', 'park', 'ahn', 'hwang'];
    
    // Create a dictionary of results for easy lookup
    const schedLookup = {};
    schedules.forEach(s => {
      schedLookup[s.doctor_id] = s;
    });
    
    doctorOrder.forEach(docId => {
      const s = schedLookup[docId];
      if (s) {
        const docName = doctorMap[s.doctor_id];
        if (!docName) return;
        
        const status = s.status ? s.status.trim() : '';
        const isOff = status === '휴무' || status === '연차사용' || status === '반차' || status === '반휴';
        
        let leaveTime = null;
        if (!isOff) {
          if (status === '4' || status === '4시') leaveTime = '4시';
          else if (status === '5' || status === '5시') leaveTime = '5시';
          else if (status === '6' || status === '6시') leaveTime = '6시';
          else if (status === '7' || status === '7시') leaveTime = '7시';
          else if (status === '8' || status === '8시' || status === '야간') leaveTime = '야간';
        }
        
        const info = {
          name: docName,
          isOff: isOff,
          leaveTime: leaveTime
        };
        
        if (isOff) {
          offDutyDoctorsList.push(info);
        } else {
          workingDoctors.push(info);
        }
      }
    });
    
    // We have 4 rows to populate.
    // Prioritize working doctors first, then off-duty doctors.
    const allSorted = [...workingDoctors, ...offDutyDoctorsList];
    
    // Map them to row 1 to 4 for both Floor 1 and Floor 2
    for (let r = 1; r <= 4; r++) {
      if (r <= allSorted.length) {
        const info = allSorted[r - 1];
        rowDirectorsFloor1[r] = info.name;
        rowDirectorsFloor2[r] = info.name;
      }
    }
    
    // Save leave times and off duty status keyed by doctor name
    allSorted.forEach(info => {
      leaveTimes[info.name] = info.leaveTime;
      offDutyDirectors[info.name] = info.isOff;
    });
    
    // Save to Supabase and localStorage
    saveState();
    
    // Record last sync date
    localStorage.setItem('clinic_last_sync_date', todayStr);
    
    updateUI();
    
    if (!silent) {
      alert(`오늘(${todayStr}) 일정 가져오기 완료!\n\n진료 원장님: ${workingDoctors.map(d => d.name).join(', ')}\n휴무 원장님: ${offDutyDoctorsList.map(d => d.name).join(', ')}`);
    }
    
  } catch (error) {
    console.error('Error syncing schedules:', error);
    if (!silent) {
      alert('일정을 가져오는데 실패했습니다: ' + error.message);
    }
  } finally {
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.innerHTML = '📅 일정 가져오기';
    }
  }
}

// Swap row designations between two rows on a specific floor
function swapRows(floor, rowA, rowB) {
  const directors = floor === 1 ? rowDirectorsFloor1 : rowDirectorsFloor2;
  
  const temp = directors[rowA];
  directors[rowA] = directors[rowB];
  directors[rowB] = temp;
  
  saveState();
  
  updateUI();
}
