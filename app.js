(() => {
"use strict";

const app = document.getElementById("app");
const STATES = { "": "To do", done: "Done", swap: "Swapped", skip: "Skipped" };
const RIDE_KINDS = ["ride", "long"];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

let sb = null, user = null, profile = null, plan = null, logs = {}, zwoIndex = new Set();

/* ---------- boot ---------- */
const cfg = window.RIDE_CONFIG || {};
if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
  showMessage("Setup needed", "Add your Supabase URL and anon key to <code>config.js</code>. The README walks through it.");
  return;
}
if (!window.supabase?.createClient) {
  showMessage("Couldn't load", "The sign-in library didn't load. Check your connection and reload.");
  return;
}
sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

fetch("zwo/index.json").then(r => r.ok ? r.json() : []).then(list => { zwoIndex = new Set(list); if (plan) renderPlan(); }).catch(() => {});

sb.auth.onAuthStateChange((_evt, session) => {
  const next = session?.user || null;
  if (next?.id === user?.id) return;
  user = next;
  user ? loadUser() : renderSignIn();
});
sb.auth.getSession().then(({ data }) => {
  if (!data.session) { renderSignIn(); return; }
  if (!user) { user = data.session.user; loadUser(); }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && user && plan) loadLogs().then(refreshStatus);
});

/* ---------- screens ---------- */
function showMessage(title, html) {
  app.innerHTML = `<section class="card auth"><h1>${esc(title)}</h1><p class="sub">${html}</p></section>`;
}

function renderSignIn(stage = "email", email = "") {
  document.body.dataset.plan = "";
  app.innerHTML = `
    <section class="card auth" aria-labelledby="si-h">
      <div><div class="label">Zwift training plans</div><h1 id="si-h">Ride Plans</h1></div>
      ${stage === "email" ? `
      <p class="sub">Sign in with your email. We'll send a link and a 6-digit code.</p>
      <form id="f-email">
        <label for="si-email">Email<input id="si-email" type="email" autocomplete="email" required value="${esc(email)}"></label>
        <button class="btn" type="submit">Send sign-in email</button>
        <p class="msg" id="si-msg" role="status"></p>
      </form>` : `
      <p class="sub">Check <b>${esc(email)}</b>. Tap the link, or type the code here (handy if you've added this to your home screen).</p>
      <form id="f-code">
        <label for="si-code">6-digit code<input id="si-code" class="num" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>
        <button class="btn" type="submit">Sign in</button>
        <button class="linkbtn" type="button" id="si-back">Use a different email</button>
        <p class="msg" id="si-msg" role="status"></p>
      </form>`}
    </section>`;
  if (stage === "email") {
    $("#f-email").addEventListener("submit", async e => {
      e.preventDefault();
      const addr = $("#si-email").value.trim(); const msg = $("#si-msg"); const btn = $("#f-email .btn");
      btn.disabled = true; msg.textContent = "Sending…";
      const { error } = await sb.auth.signInWithOtp({ email: addr, options: { emailRedirectTo: location.origin + location.pathname } });
      btn.disabled = false;
      if (error) { msg.textContent = friendlyAuthError(error); return; }
      renderSignIn("code", addr);
    });
  } else {
    $("#si-back").addEventListener("click", () => renderSignIn("email", email));
    $("#f-code").addEventListener("submit", async e => {
      e.preventDefault();
      const token = $("#si-code").value.trim(); const msg = $("#si-msg"); const btn = $("#f-code .btn");
      btn.disabled = true; msg.textContent = "Checking…";
      const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
      btn.disabled = false;
      if (error) msg.textContent = "That code didn't work. Check it, or request a new email.";
    });
  }
}

function friendlyAuthError(err) {
  const m = (err?.message || "").toLowerCase();
  if (m.includes("signups not allowed") || m.includes("not allowed")) return "This email isn't set up for Ride Plans.";
  if (m.includes("rate")) return "Too many emails sent. Wait a minute and try again.";
  return "Couldn't send the email. Check the address and try again.";
}

async function loadUser() {
  app.innerHTML = `<p class="note">Loading your plan…</p>`;
  const { data, error } = await sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (error) { showMessage("Couldn't load", "Your plan didn't load. Reload to try again."); return; }
  profile = data;
  if (!profile) { renderPicker(); return; }
  plan = window.PLANS[profile.plan];
  await loadLogs();
  renderPlan();
}

function renderPicker() {
  document.body.dataset.plan = "";
  const opts = Object.values(window.PLANS).map(p =>
    `<button class="choice" type="button" data-plan="${p.id}"><b>${esc(p.owner)}</b><span>${esc(p.name)}</span><span>${p.weeks.length} weeks</span></button>`).join("");
  app.innerHTML = `
    <section class="card auth">
      <div><div class="label">One-time setup</div><h1>Whose plan is this?</h1></div>
      <p class="sub">Signed in as ${esc(user.email)}. Pick your plan. Your logs stay private to you.</p>
      <div class="choices">${opts}</div>
      <p class="msg" id="pk-msg" role="status"></p>
      <button class="linkbtn" type="button" id="pk-out">Sign out</button>
    </section>`;
  $$(".choice").forEach(b => b.addEventListener("click", async () => {
    $("#pk-msg").textContent = "Saving…";
    const row = { user_id: user.id, plan: b.dataset.plan, ftp: profile?.ftp ?? null, updated_at: new Date().toISOString() };
    const { error } = await sb.from("profiles").upsert(row);
    if (error) { $("#pk-msg").textContent = "Couldn't save your choice. Try again."; return; }
    profile = row; plan = window.PLANS[row.plan];
    await loadLogs(); renderPlan();
  }));
  $("#pk-out").addEventListener("click", signOut);
}

async function loadLogs() {
  const { data, error } = await sb.from("logs").select("session_key,data").eq("user_id", user.id);
  if (error) { setStatus("Couldn't load your logs. Reload to try again.", true); return; }
  logs = {};
  (data || []).forEach(r => { logs[r.session_key] = r.data || {}; });
}

async function signOut() { await sb.auth.signOut(); user = null; profile = null; plan = null; logs = {}; renderSignIn(); }

/* ---------- plan helpers ---------- */
const startDate = () => { const [y, m, d] = plan.start.split("-").map(Number); return new Date(y, m - 1, d); };
const weekDate = (i, off = 0) => { const d = startDate(); d.setDate(d.getDate() + i * 7 + off); return d; };
const fmt = d => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const started = () => new Date() >= startDate();
function currentWeek() {
  const i = Math.floor((new Date() - startDate()) / (7 * 864e5));
  return i < 0 ? 0 : Math.min(i, plan.weeks.length - 1);
}
const key = (i, k) => `${plan.id}-w${String(i + 1).padStart(2, "0")}-${k}`;
const zwoFile = (i, slot) => `W${String(i + 1).padStart(2, "0")}-${slot.day}`;

function withWatts(txt) {
  const ftp = profile?.ftp;
  if (!ftp) return esc(txt);
  return esc(txt).replace(/(\d+)–(\d+)%|(\d+)%/g, (m, a, b, c) => {
    if (c) return `${m} <span class="num">(${Math.round(ftp * c / 100)}W)</span>`;
    return `${m} <span class="num">(${Math.round(ftp * a / 100)}–${Math.round(ftp * b / 100)}W)</span>`;
  });
}

function slotMinutes(w, slot) {
  if (!RIDE_KINDS.includes(slot.kind)) return 0;
  if (slot.minutes) return w[slot.minutes] || 0;
  return plan.tueMinutes || 0;
}

function sessionInfo(w, i, slot) {
  const L = plan.labels;
  if (!RIDE_KINDS.includes(slot.kind)) {
    const f = L[slot.kind]; return f ? f(w) : { t: slot.kind, p: "" };
  }
  const txt = w[slot.field];
  const mins = slotMinutes(w, slot);
  const isLastRide = slot === [...plan.template].reverse().find(s => RIDE_KINDS.includes(s.kind));
  let tag = null;
  if (w.test === slot.field) tag = "Test";
  if (w.drift && slot.kind === "long") tag = "Drift test";
  if (w.target && isLastRide) tag = "Target";
  const info = {
    t: slot.kind === "long" ? L.long : L.ride, tag,
    p: `${withWatts(txt)}${mins ? ` · <span class="num">${mins}′</span>` : ""}`
  };
  if (slot.fallback) info.fb = `${esc(L.fallbackLabel)}: ${withWatts(w[slot.fallback])}`;
  else if (L.extension) info.fb = esc(L.extension);
  return info;
}

function driftText(d) {
  if (!d || !d.hr1 || !d.hr2) return "After the ride, log average HR for minutes 15–45 and 45–75 to see your drift.";
  const pct = (d.hr2 - d.hr1) / d.hr1 * 100; const p = d.dp ? ` at ${d.dp}W` : "";
  return pct < 5
    ? `Drift ${pct.toFixed(1)}%${p}: at or below your aerobic threshold. Zone 2 runs up to here, HR up to about ${d.hr2} bpm. Retest 5–10W higher in a few weeks.`
    : `Drift ${pct.toFixed(1)}%${p}: above your aerobic threshold. Retest 5–10W lower.`;
}

/* ---------- main view ---------- */
function renderPlan() {
  document.body.dataset.plan = plan.id;
  document.title = `${plan.name} · Ride Plans`;
  const last = weekDate(plan.weeks.length - 1, 6);
  const openWeeks = new Set($$("details.week[open]").map(d => d.dataset.week));
  const first = !$("#weeks");
  app.innerHTML = `
    <header class="topbar">
      <div>
        <div class="label">${esc(plan.owner)} · ${fmt(startDate())} – ${fmt(last)} ${last.getFullYear()}</div>
        <h1>${esc(plan.name)}</h1>
        <p class="sub">${esc(plan.goal)}</p>
      </div>
    </header>
    <section class="card profile" aria-label="Weekly ride minutes">
      <div class="label">Ride minutes per week · planned vs logged</div>
      <svg id="chart" viewBox="0 0 700 170" role="img" aria-label="Bar chart of planned and logged ride minutes for each week"></svg>
      <div class="legend">
        ${plan.phases.map((p, n) => `<span><i style="background:var(--p${n + 1})"></i>${esc(p.name)}</span>`).join("")}
        <span><i style="border:1.5px dashed var(--muted);background:transparent"></i>Planned</span>
      </div>
    </section>
    <section class="stats">
      <div class="stat"><span class="label">This week</span><b class="num" id="s-week">—</b></div>
      <div class="stat"><span class="label">Sessions done</span><b class="num" id="s-done">0</b></div>
      <div class="stat"><span class="label">Ride hours logged</span><b class="num" id="s-hrs">0.0</b></div>
      <div class="stat"><span class="label">FTP</span>
        <div class="ftp"><input id="ftp" class="num" type="number" inputmode="numeric" min="50" max="600" placeholder="watts" aria-label="FTP in watts" value="${profile.ftp ?? ""}"><span class="msg" id="ftp-msg"></span></div>
      </div>
    </section>
    <p class="note" id="status" role="status">${profile.ftp ? "Tap a session to log it." : "Tap a session to log it. Set your FTP after your ramp test to see watt targets."}</p>
    <main class="weeks" id="weeks"></main>
    <footer>
      <a href="zwo/${plan.id}.zip" download style="color:var(--accent)">All Zwift workouts (.zip)</a>
      <span>Signed in as ${esc(user.email)}</span>
      <button class="linkbtn" type="button" id="b-plan">Switch plan</button>
      <button class="linkbtn" type="button" id="b-out">Sign out</button>
    </footer>`;

  const cur = currentWeek(); const root = $("#weeks");
  plan.phases.forEach((ph, pi) => {
    const pc = `var(--p${pi + 1})`;
    const h = document.createElement("div"); h.className = "phase-h"; h.style.setProperty("--pc", pc);
    h.innerHTML = `<h2>${esc(ph.name)}</h2><span>${esc(ph.range)} · ${esc(ph.blurb)}</span>`;
    root.appendChild(h);
    plan.weeks.forEach((w, i) => {
      if (w.ph !== ph.id) return;
      const det = document.createElement("details");
      det.className = "week" + (i === cur ? " now" : ""); det.style.setProperty("--pc", pc); det.dataset.week = i;
      det.open = first ? i === cur : openWeeks.has(String(i));
      const firstRide = plan.template.find(s => RIDE_KINDS.includes(s.kind));
      const pips = plan.template.map(s => `<span class="pip ${logs[key(i, s.k)]?.status || ""}" data-pip="${key(i, s.k)}"></span>`).join("");
      det.innerHTML = `<summary><span class="wk num">W${i + 1}</span><span class="wtitle"><span class="d">${fmt(weekDate(i))} – ${fmt(weekDate(i, 6))}</span><span class="f">${w.deload ? "Lighter week · " : ""}${firstRide.day} ${esc(w[firstRide.field].split(" (")[0])}</span></span><span class="pips" aria-hidden="true">${pips}</span></summary><div class="sessions"></div>`;
      const box = $(".sessions", det);
      plan.template.forEach(slot => {
        const info = sessionInfo(w, i, slot); const k = key(i, slot.k); const L = logs[k] || {};
        const el = document.createElement("div"); el.className = "sess";
        const drift = w.drift && slot.kind === "long";
        el.innerHTML = `<button class="sess-h" type="button" aria-expanded="false"><span class="day">${slot.day} <span class="num" style="font-weight:400;display:block">${weekDate(i, slot.off).getDate()}</span></span><span class="what"><div class="t">${esc(info.t)}${info.tag ? `<span class="tag">${esc(info.tag)}</span>` : ""}</div><div class="p">${info.p}</div>${info.fb ? `<div class="fb">${info.fb}</div>` : ""}${drift ? `<div class="fb" data-drift="${k}">${esc(driftText(L))}</div>` : ""}</span><span class="state ${L.status || ""}" data-state="${k}">${STATES[L.status || ""]}</span></button><div class="form" hidden></div>`;
        $(".sess-h", el).addEventListener("click", e => {
          const f = $(".form", el); const open = f.hidden; f.hidden = !open; e.currentTarget.setAttribute("aria-expanded", String(open));
          if (open) buildForm(f, k, slot, w, i);
        });
        box.appendChild(el);
      });
      root.appendChild(det);
    });
  });

  $("#ftp").addEventListener("change", saveFtp);
  $("#b-out").addEventListener("click", signOut);
  $("#b-plan").addEventListener("click", renderPicker);
  refreshStatus();
}

function setStatus(text, err = false) { const s = $("#status"); if (s) { s.textContent = text; s.classList.toggle("err", err); } }

function buildForm(f, k, slot, w, i) {
  const L = logs[k] || {}; const ride = RIDE_KINDS.includes(slot.kind); const drift = w.drift && slot.kind === "long";
  const num = (id, label, v) => `<label for="${k}-${id}">${label}<input id="${k}-${id}" class="num" type="number" inputmode="numeric" value="${v ?? ""}"></label>`;
  const seg = (name, val) => `<div class="seg" role="group" aria-label="${name}">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-v="${n}" aria-pressed="${val == n}">${n}</button>`).join("")}</div>`;
  const swapText = slot.fallback ? `Swapped (${plan.labels.fallbackLabel.split(" ").pop()} ride)` : ride ? "Swapped / lighter" : "Swapped";
  const has = f => zwoIndex.has(`${plan.id}/${f}`); const thuF = `W${String(i + 1).padStart(2, "0")}-Thu`;
  const zf = ride && has(zwoFile(i, slot)) ? `<div class="zwo">Zwift workout: <a href="${plan.zwoPath}${zwoFile(i, slot)}.zwo" download>${zwoFile(i, slot)}.zwo</a>${slot.fallback && has(thuF) ? ` · Thu: <a href="${plan.zwoPath}${thuF}.zwo" download>${thuF}.zwo</a>` : ""}</div>` : "";
  f.innerHTML = `
    <label for="${k}-status" class="${ride ? "" : "full"}">Status<select id="${k}-status">
      ${Object.entries(STATES).map(([v, t]) => `<option value="${v}" ${(L.status || "") === v ? "selected" : ""}>${v === "swap" ? esc(swapText) : t}</option>`).join("")}
    </select></label>
    ${ride ? num("dur", "Duration (min)", L.dur) + num("w", "Avg power (W)", L.watts) + num("hr", "Avg HR (bpm)", L.hr) : ""}
    ${drift ? num("dp", "Steady power (W)", L.dp) + num("hr1", "HR, 1st half (bpm)", L.hr1) + num("hr2", "HR, 2nd half (bpm)", L.hr2) : ""}
    <label>Sleep (1–5)${seg("Sleep", L.sleep)}</label>
    <label>Feel (1–5)${seg("Feel", L.feel)}</label>
    ${plan.pelvicFloor && ride ? `<label class="check full" for="${k}-pf"><input id="${k}-pf" type="checkbox" ${L.pf ? "checked" : ""}> Pelvic floor exercises done</label>` : ""}
    <label class="full" for="${k}-notes">Notes<textarea id="${k}-notes" rows="2">${esc(L.notes || "")}</textarea></label>
    ${zf}
    <div class="actions"><button class="btn" type="button">Save</button><span class="msg" role="status"></span></div>`;
  const vals = { sleep: L.sleep ?? null, feel: L.feel ?? null };
  $$(".seg", f).forEach((g, gi) => {
    const name = gi === 0 ? "sleep" : "feel";
    g.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      vals[name] = vals[name] == b.dataset.v ? null : +b.dataset.v;
      $$("button", g).forEach(x => x.setAttribute("aria-pressed", String(x.dataset.v == vals[name])));
    });
  });
  const btn = $(".btn", f), msg = $(".msg", f);
  btn.addEventListener("click", async () => {
    const n = id => { const el = $(`#${CSS.escape(k + "-" + id)}`, f); if (!el || el.value === "") return null; const v = +el.value; return Number.isFinite(v) ? v : null; };
    const body = { status: $(`#${CSS.escape(k + "-status")}`, f).value, sleep: vals.sleep, feel: vals.feel, notes: $(`#${CSS.escape(k + "-notes")}`, f).value.trim() };
    if (ride) {
      body.dur = n("dur"); body.watts = n("w"); body.hr = n("hr");
      if (body.dur && !body.status) { body.status = "done"; $(`#${CSS.escape(k + "-status")}`, f).value = "done"; }
    }
    if (drift) { body.dp = n("dp"); body.hr1 = n("hr1"); body.hr2 = n("hr2"); }
    if (plan.pelvicFloor && ride) body.pf = $(`#${CSS.escape(k + "-pf")}`, f).checked;
    btn.disabled = true; msg.textContent = "Saving…";
    const { error } = await sb.from("logs").upsert({ user_id: user.id, session_key: k, data: body, updated_at: new Date().toISOString() });
    btn.disabled = false;
    if (error) { msg.textContent = "Couldn't save. Check your connection and try again."; return; }
    logs[k] = body;
    msg.textContent = drift && body.hr1 && body.hr2 ? "Saved. " + driftText(body) : "Saved";
    refreshStatus();
  });
}

async function saveFtp(e) {
  const v = Math.round(+e.target.value); const m = $("#ftp-msg");
  if (!v || v < 50 || v > 600) { m.textContent = "Enter 50–600W"; return; }
  m.textContent = "Saving…";
  const { error } = await sb.from("profiles").update({ ftp: v, updated_at: new Date().toISOString() }).eq("user_id", user.id);
  if (error) { m.textContent = "Couldn't save"; return; }
  profile.ftp = v; renderPlan(); $("#ftp-msg").textContent = "Saved";
}

function refreshStatus() {
  if (!plan || !$("#weeks")) return;
  $$("[data-pip]").forEach(p => { p.className = "pip " + (logs[p.dataset.pip]?.status || ""); });
  $$("[data-state]").forEach(p => { const st = logs[p.dataset.state]?.status || ""; p.className = "state " + st; p.textContent = STATES[st]; });
  $$("[data-drift]").forEach(p => { p.textContent = driftText(logs[p.dataset.drift]); });
  const cur = currentWeek(); const total = plan.template.length;
  $("#s-week").textContent = started() ? `W${cur + 1}` : `Starts ${fmt(startDate())}`;
  $("#s-done").textContent = `${plan.template.filter(s => ["done", "swap"].includes(logs[key(cur, s.k)]?.status)).length}/${total}`;
  const mins = Object.entries(logs).filter(([k]) => k.startsWith(plan.id + "-")).reduce((a, [, l]) => a + (l.dur || 0), 0);
  $("#s-hrs").textContent = (mins / 60).toFixed(1);
  drawChart();
}

function drawChart() {
  const svg = $("#chart"); if (!svg) return;
  const n = plan.weeks.length;
  const planned = plan.weeks.map(w => plan.template.reduce((a, s) => a + slotMinutes(w, s), 0));
  const logged = plan.weeks.map((w, i) => plan.template.filter(s => RIDE_KINDS.includes(s.kind)).reduce((a, s) => a + (logs[key(i, s.k)]?.dur || 0), 0));
  const top = Math.max(...planned, ...logged);
  const step = top > 120 ? 60 : 30; const max = Math.ceil(top / step) * step || step;
  const W = 700, H = 170, L = 34, R = 8, T = 10, B = 24, iw = W - L - R, ih = H - T - B, bw = iw / n;
  const y = v => T + ih - (Math.min(v, max) / max) * ih;
  let g = `<g font-family="JetBrains Mono, ui-monospace, monospace" font-size="10" fill="var(--muted)">`;
  for (let v = 0; v <= max; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
  plan.weeks.forEach((w, i) => {
    const x = L + i * bw + bw * .18, wd = bw * .64, col = `var(--p${w.ph})`;
    g += `<rect x="${x}" y="${y(planned[i])}" width="${wd}" height="${y(0) - y(planned[i])}" fill="none" stroke="var(--muted)" stroke-dasharray="3 2" stroke-width="1"/>`;
    if (logged[i]) g += `<rect x="${x}" y="${y(logged[i])}" width="${wd}" height="${y(0) - y(logged[i])}" fill="${col}"/>`;
    if (n <= 12 || i % 2 === 0 || i === n - 1) g += `<text x="${x + wd / 2}" y="${H - 8}" text-anchor="middle">W${i + 1}</text>`;
  });
  if (started()) { const cx = L + currentWeek() * bw + bw / 2; g += `<line x1="${cx}" x2="${cx}" y1="${T}" y2="${y(0)}" stroke="var(--accent)" stroke-width="1.5"/>`; }
  svg.innerHTML = g + "</g>";
}
})();
