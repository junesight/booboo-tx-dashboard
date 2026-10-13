const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const syncSource = section('// UI Interactivity & Sync Protection Flags', '// Connection Status Indicator Updater')
  + section('async function setupSupabaseRealtime()', '// Synchronize and maintain timestamps')
  + section('function pullStateFromSupabase(', '// Initialize on page load')
  + section('async function saveStateField(', '// Save all ward states');

function harness() {
  let now = 1000000;
  let modal = false;
  let socketConnected = true;
  let query = async () => ({ data: { data: { state: { female: { doctor: [1] } } } } });
  const calls = { reads: 0, renders: 0, removed: 0, flushes: 0, banners: 0 };
  const listeners = {};
  const intervals = new Map();
  const timeouts = new Map();
  const channels = [];
  const chain = {
    select() { return this; }, eq() { return this; },
    abortSignal(signal) { this.signal = signal; return this; },
    single() { calls.reads++; return query(this.signal); },
  };
  const context = vm.createContext({
    Date: { now: () => now }, navigator: { onLine: true },
    document: { hidden: false, getElementById: () => modal ? { classList: { contains: () => true } } : null },
    window: { addEventListener(name, callback) { (listeners[name] ||= []).push(callback); } },
    console: { log() {}, warn() {}, error() {} },
    setInterval(callback) { const id = intervals.size + 1; intervals.set(id, callback); return id; },
    clearInterval(id) { intervals.delete(id); }, AbortController,
    setTimeout(callback) { const id = Symbol(); timeouts.set(id, callback); return id; },
    clearTimeout(id) { timeouts.delete(id); },
    supabaseChannel: null,
    supabaseClient: {
      realtime: { isConnected: () => socketConnected },
      from(table) { assert.equal(table, 'clinic_state'); return chain; },
      async removeChannel(channel) { calls.removed++; channel.status('CLOSED'); },
      channel() {
        const channel = {
          state: 'joining', on(type, filter, callback) { this.event = callback; return this; },
          subscribe(callback) { this.status = callback; return this; },
        };
        channels.push(channel); return channel;
      },
    },
    state: {}, leaveTimes: {}, offDutyDirectors: {}, directorStatuses: {}, directorAutoStatus: {},
    rowDirectorsFloor1: {}, rowDirectorsFloor2: {}, entryTimes: {}, progressTimes: {}, reservedDoctorCalls: {},
    isLoadedFromSupabase: false, dragType: null,
    updateConnectionStatus() {}, sanitizeState() {}, checkAndTriggerReservedCalls() {},
    updateUI() { calls.renders++; }, hideOfflineBanner() {}, showOfflineBanner() { calls.banners++; },
    async flushPendingRpcQueue() { calls.flushes++; },
    maintainEntryTimes() {}, maintainProgressTimes() {}, localStorage: { setItem() {} },
    async safeRpcCall() { return true; },
  });
  vm.runInContext(syncSource, context);
  return {
    context, calls, channels, listeners,
    run: code => vm.runInContext(code, context),
    advance(ms) { now += ms; }, modal(value) { modal = value; }, socket(value) { socketConnected = value; },
    expireTimeouts() { for (const callback of timeouts.values()) callback(); },
    query(fn) { query = fn; },
    async tick() { for (const callback of intervals.values()) callback(); await settle(); },
    async connect() {
      await context.setupSupabaseRealtime();
      const channel = channels.at(-1); channel.state = 'joined'; channel.status('SUBSCRIBED');
      await settle(); return channel;
    },
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('idle healthy channel uses minute audits and stays connected beyond 25 seconds', async () => {
  const h = harness(); await h.connect(); h.context.startBackgroundSyncAndHeartbeat();
  for (let i = 0; i < 17; i++) { h.advance(3500); await h.tick(); }
  assert.equal(h.calls.reads, 1);
  assert.equal(h.channels.length, 1);
  h.advance(3500); await h.tick();
  assert.equal(h.calls.reads, 2);
  assert.equal(h.calls.removed, 0);
});

test('disconnected socket keeps 3.5-second fallback without replacing a joining channel', async () => {
  const h = harness(); await h.connect(); h.context.startBackgroundSyncAndHeartbeat();
  h.socket(false);
  for (let i = 0; i < 3; i++) { h.advance(3500); await h.tick(); }
  assert.equal(h.calls.reads, 4);
  assert.equal(h.channels.length, 1);
});

test('hidden and offline tabs avoid network work; resume immediately fetches current state', async () => {
  const h = harness(); await h.connect(); h.context.startBackgroundSyncAndHeartbeat();
  h.context.document.hidden = true; h.advance(70000); await h.tick();
  assert.equal(h.calls.reads, 1);
  h.context.document.hidden = false; h.context.navigator.onLine = false; await h.tick();
  await h.context.resumeSupabaseSync(); assert.equal(h.calls.reads, 1);
  h.context.navigator.onLine = true; await h.context.resumeSupabaseSync();
  assert.equal(h.calls.reads, 2);
});

test('connection listeners are installed once and healthy focus never rebuilds channels', async () => {
  const h = harness(); await h.connect();
  h.context.startBackgroundSyncAndHeartbeat(); h.context.startBackgroundSyncAndHeartbeat();
  assert.equal(h.listeners.online.length, 1); assert.equal(h.listeners.offline.length, 1);
  await h.context.resumeSupabaseSync(); await h.context.setupSupabaseRealtime();
  assert.equal(h.channels.length, 1);
});

test('Realtime updates state immediately with no additional GET and defers redraw during interaction', async () => {
  const h = harness(); const channel = await h.connect();
  const beforeReads = h.calls.reads, beforeRenders = h.calls.renders;
  h.modal(true);
  channel.event({ new: { data: { state: { female: { doctor: [2] } }, reservedDoctorCalls: {} } } });
  assert.equal(h.context.state.female.doctor[0], 2);
  assert.equal(h.calls.reads, beforeReads); assert.equal(h.calls.renders, beforeRenders);
  h.modal(false); h.context.flushPendingUIUpdateIfNeeded();
  assert.equal(h.calls.renders, beforeRenders + 1);
});

test('concurrent reads share one request and a newer Realtime event wins over the delayed response', async () => {
  const h = harness(); const channel = await h.connect(); let resolve;
  h.query(() => new Promise(r => { resolve = r; }));
  const first = h.context.pullStateFromSupabase(), second = h.context.pullStateFromSupabase();
  assert.equal(first, second); assert.equal(h.calls.reads, 2);
  channel.event({ new: { data: { state: { female: { doctor: [3] } } } } });
  resolve({ data: { data: { state: { female: { doctor: [0] } } } } });
  await first; assert.equal(h.context.state.female.doctor[0], 3);
});

test('delayed REST response cannot overwrite a local field edit', async () => {
  const h = harness(); await h.connect(); let resolve;
  h.query(() => new Promise(r => { resolve = r; }));
  const read = h.context.pullStateFromSupabase();
  h.context.state.female.doctor = [4];
  await h.context.saveStateField(['state', 'female', 'doctor'], [4]);
  resolve({ data: { data: { state: { female: { doctor: [0] } } } } });
  await read; assert.equal(h.context.state.female.doctor[0], 4);
});

test('failed channel replacements have a cooldown and obsolete callbacks are ignored', async () => {
  const h = harness(); const old = await h.connect(); h.context.startBackgroundSyncAndHeartbeat();
  old.state = 'errored'; old.status('CHANNEL_ERROR');
  h.advance(3500); await h.tick(); assert.equal(h.channels.length, 1);
  h.advance(15000); await h.tick(); assert.equal(h.channels.length, 2);
  const current = h.channels.at(-1); current.state = 'joined'; current.status('SUBSCRIBED'); await settle();
  old.status('CLOSED'); old.event({ new: { data: { state: { female: { doctor: [99] } } } } });
  assert(h.context.isRealtimeConnected()); assert.notEqual(h.context.state.female.doctor[0], 99);
});

test('failed reads are retried and pending offline edits are flushed before reading', async () => {
  const h = harness(); await h.connect(); h.context.startBackgroundSyncAndHeartbeat();
  h.query(async () => ({ error: new Error('network') }));
  h.socket(false); h.advance(3500); await h.tick(); assert.equal(h.calls.banners, 1);
  h.query(async () => ({ data: { data: { state: { female: { doctor: [5] } } } } }));
  h.advance(3500); await h.tick(); assert.equal(h.context.state.female.doctor[0], 5);
  h.run("pendingRpcQueue.push({path:['state'],value:{}})");
  const before = h.calls.reads;
  await h.context.resumeSupabaseSync(); assert.equal(h.calls.reads, before);
  h.context.flushPendingRpcQueue = async () => { h.run('pendingRpcQueue.length = 0'); };
  await h.context.resumeSupabaseSync(); assert.equal(h.calls.reads, before + 1);
});

test('a hung read times out and a subsequent request can proceed', async () => {
  const h = harness(); await h.connect();
  h.query(signal => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  const read = h.context.pullStateFromSupabase({ silent: true });
  h.expireTimeouts(); assert.equal(await read, false);
  h.query(async () => ({ data: { data: { state: { female: { doctor: [6] } } } } }));
  assert.equal(await h.context.pullStateFromSupabase(), true);
  assert.equal(h.context.state.female.doctor[0], 6);
});

test('a failed old read cannot mark a newer Realtime update as offline', async () => {
  const h = harness(); const channel = await h.connect(); let resolve;
  h.query(() => new Promise(r => { resolve = r; }));
  const read = h.context.pullStateFromSupabase();
  channel.event({ new: { data: { state: { female: { doctor: [7] } } } } });
  resolve({ error: new Error('old request failed') }); await read;
  assert.equal(h.context.isLoadedFromSupabase, true);
  assert.equal(h.calls.banners, 0);
});
