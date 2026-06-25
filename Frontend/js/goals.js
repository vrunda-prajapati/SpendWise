// Frontend/js/goals.js
// Savings Goals Tracker — all API calls use real MySQL data via backend

const GOALS_API = "http://localhost:3002/api/goals";

// ══════════════════════════════════════════════
// FETCH
// ══════════════════════════════════════════════
async function fetchSavingsGoals() {
    const res = await fetch(`${GOALS_API}/${currentUser.id}`);
    if (!res.ok) throw new Error("Failed to fetch goals");
    return await res.json();
}

// ══════════════════════════════════════════════
// MAIN RENDER — called by app.js render()
// ══════════════════════════════════════════════
async function renderSavingsGoals(el) {
    // Show skeleton while loading
    el.innerHTML = `
        <div class="sg-wrap">
            <div class="sg-header fade-up">
                <div class="sg-title">Savings Goals</div>
                <div class="sg-subtitle">Track your savings journey, one goal at a time</div>
            </div>
            <div style="text-align:center;padding:48px;color:var(--muted);font-weight:700;font-size:14px;">
                ⏳ Loading goals…
            </div>
        </div>`;

    let goals = [];
    try {
        goals = await fetchSavingsGoals();
    } catch (e) {
        el.innerHTML = `<div class="sg-wrap"><div class="sg-error">⚠️ Could not load goals. Make sure the server is running.</div></div>`;
        return;
    }

    el.innerHTML = `
        <div class="sg-wrap">

            <!-- Page header -->
            <div class="sg-header fade-up">
                <div>
                    <div class="sg-title">Savings Goals</div>
                    <div class="sg-subtitle">Track your savings journey, one goal at a time</div>
                </div>
                <div class="sg-stats-strip">
                    <div class="sg-stat">
                        <span class="sg-stat-val">${goals.length}</span>
                        <span class="sg-stat-lbl">Goals</span>
                    </div>
                    <div class="sg-stat">
                        <span class="sg-stat-val">${goals.filter(g => parseFloat(g.saved_amount) >= parseFloat(g.target_amount)).length}</span>
                        <span class="sg-stat-lbl">Achieved</span>
                    </div>
                    <div class="sg-stat">
                        <span class="sg-stat-val">${INR(goals.reduce((s, g) => s + parseFloat(g.saved_amount), 0))}</span>
                        <span class="sg-stat-lbl">Total Saved</span>
                    </div>
                </div>
            </div>

            <!-- Create Goal form -->
            <div class="card sg-form fade-up" style="animation-delay:.04s">
                <div class="sg-form-title">✨ Create New Goal</div>
                <input  class="ifield" id="sg-name"   placeholder="Goal name  e.g. Buy MacBook 💻" />
                <div class="sg-form-row">
                    <input class="ifield" id="sg-target" type="number" placeholder="Target amount (₹)" />
                    <input class="ifield" id="sg-date"   type="date" />
                </div>
                <button class="sg-create-btn" onclick="createSavingsGoal()">🎯 Create Goal</button>
                <div class="sg-form-msg" id="sg-form-msg"></div>
            </div>

            <!-- Goals grid -->
            <div class="sg-grid" id="sg-grid">
                ${goals.length === 0
                    ? buildSgEmpty()
                    : goals.map((g, i) => buildGoalCard(g, i)).join("")}
            </div>

        </div>`;

    // Set minimum date to today
    const di = document.getElementById("sg-date");
    if (di) di.min = new Date().toISOString().slice(0, 10);
}

// ══════════════════════════════════════════════
// EMPTY STATE
// ══════════════════════════════════════════════
function buildSgEmpty() {
    return `
        <div class="empty-state">
            <div class="empty-icon">🎯</div>
            <div class="empty-title">No savings goals yet</div>
            <div class="empty-sub">Create your first goal above and start saving!</div>
        </div>`;
}

// ══════════════════════════════════════════════
// GOAL CARD
// ══════════════════════════════════════════════
function buildGoalCard(g, i) {
    const saved     = parseFloat(g.saved_amount) || 0;
    const target    = parseFloat(g.target_amount);
    const remaining = Math.max(0, target - saved);
    const pct       = Math.min(100, target > 0 ? (saved / target) * 100 : 0);
    const achieved  = saved >= target;

    // Days left calculation
    const today    = new Date(); today.setHours(0,0,0,0);
    const deadline = new Date(g.target_date); deadline.setHours(0,0,0,0);
    const daysLeft = Math.ceil((deadline - today) / 86400000);
    const isOverdue = daysLeft < 0 && !achieved;

    // Daily savings suggestion
    const dailySave = (!achieved && daysLeft > 0 && remaining > 0)
        ? Math.ceil(remaining / daysLeft)
        : null;

    // Status badge
    const statusCfg = achieved
        ? { bg: "var(--mint)",   color: "var(--teald)", text: "🏆 Goal Achieved!" }
        : isOverdue
        ? { bg: "var(--blush)",  color: "var(--rose)",  text: "⚠️ Overdue" }
        : { bg: "var(--lemon)",  color: "var(--yellow)",text: "🎯 In Progress" };

    // Milestone badge
    const milestone = getSgMilestone(pct);

    // Progress bar colour
    const progGrad = achieved
        ? "linear-gradient(90deg,#FFB347,#D4872A)"
        : pct >= 75
        ? "linear-gradient(90deg,#5BBFA1,#3A9A82)"
        : pct >= 50
        ? "linear-gradient(90deg,#6AADE4,#3A88D4)"
        : "linear-gradient(90deg,#FFB347,#5BBFA1)";

    return `
    <div class="sg-card fade-up" id="sg-card-${g.id}" style="animation-delay:${i * .07}s">

        <!-- Header row -->
        <div class="sg-card-head">
            <div class="sg-card-info">
                <div class="sg-card-name">${g.goal_name}</div>
                <div class="sg-card-date">📅 ${formatSgDate(g.target_date)}
                    ${!achieved && daysLeft >= 0
                        ? `<span class="sg-days-left">${daysLeft} days left</span>`
                        : isOverdue
                        ? `<span class="sg-days-left overdue">${Math.abs(daysLeft)} days overdue</span>`
                        : ""}
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                <span class="sg-status-badge"
                      style="background:${statusCfg.bg};color:${statusCfg.color};">
                    ${statusCfg.text}
                </span>
                <button class="sg-del-btn" onclick="deleteSavingsGoal(${g.id})" title="Delete goal">🗑</button>
            </div>
        </div>

        <!-- Amount strip -->
        <div class="sg-amounts">
            <div class="sg-amount-item">
                <div class="sg-amount-lbl">SAVED</div>
                <div class="sg-amount-val" style="color:var(--teald);">${INR(saved)}</div>
            </div>
            <div class="sg-amount-item">
                <div class="sg-amount-lbl">TARGET</div>
                <div class="sg-amount-val">${INR(target)}</div>
            </div>
            <div class="sg-amount-item">
                <div class="sg-amount-lbl">REMAINING</div>
                <div class="sg-amount-val" style="color:${remaining > 0 ? "var(--rose)" : "var(--teald)"};">
                    ${INR(remaining)}
                </div>
            </div>
        </div>

        <!-- Progress bar -->
        <div class="sg-prog-wrap">
            <div class="sg-prog-bg">
                <div class="sg-prog-fill"
                     style="width:${pct}%;background:${progGrad};">
                </div>
            </div>
            <div class="sg-prog-row">
                <span class="sg-prog-pct">${pct.toFixed(0)}% complete</span>
                <span class="sg-prog-pct">${INR(saved)} / ${INR(target)}</span>
            </div>
        </div>

        <!-- Milestone badge -->
        ${milestone ? `<div class="sg-milestone">${milestone}</div>` : ""}

        <!-- Smart daily suggestion -->
        ${dailySave ? `
            <div class="sg-suggestion">
                💡 Save <strong>${INR(dailySave)} / day</strong> to hit your goal
                in <strong>${daysLeft} days</strong>
            </div>` : ""}

        <!-- Achieved banner or Add Savings -->
        ${achieved
            ? `<div class="sg-achieved-banner">🎉 Congratulations! You've achieved this goal!</div>`
            : `<div class="sg-add-wrap">
                <button class="sg-add-btn" onclick="toggleSgInput(${g.id})">+ Add Savings</button>
                <div class="sg-add-input-wrap hidden" id="sg-input-${g.id}">
                    <input class="ifield sg-add-input" id="sg-amt-${g.id}"
                           type="number" placeholder="₹ Amount to add"
                           onkeydown="if(event.key==='Enter') submitSavings(${g.id})" />
                    <button class="sg-submit-btn" onclick="submitSavings(${g.id})">Save ✓</button>
                    <button class="sg-cancel-btn" onclick="toggleSgInput(${g.id})">✕</button>
                </div>
               </div>`
        }

    </div>`;
}

// ══════════════════════════════════════════════
// MILESTONE
// ══════════════════════════════════════════════
function getSgMilestone(pct) {
    if (pct >= 100) return "🏆 Goal Achieved!";
    if (pct >= 75)  return "🥇 Almost There!";
    if (pct >= 50)  return "🥈 Halfway There!";
    if (pct >= 25)  return "🥉 Quarter Way!";
    return null;
}

// ══════════════════════════════════════════════
// DATE FORMATTER
// ══════════════════════════════════════════════
function formatSgDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ══════════════════════════════════════════════
// TOGGLE ADD-SAVINGS INPUT
// ══════════════════════════════════════════════
function toggleSgInput(id) {
    const wrap = document.getElementById(`sg-input-${id}`);
    if (!wrap) return;
    const opening = wrap.classList.contains("hidden");
    wrap.classList.toggle("hidden", !opening);
    if (opening) {
        const inp = document.getElementById(`sg-amt-${id}`);
        if (inp) { inp.value = ""; inp.focus(); }
    }
}

// ══════════════════════════════════════════════
// CREATE GOAL
// ══════════════════════════════════════════════
async function createSavingsGoal() {
    const name   = document.getElementById("sg-name").value.trim();
    const target = parseFloat(document.getElementById("sg-target").value);
    const date   = document.getElementById("sg-date").value;
    const msgEl  = document.getElementById("sg-form-msg");

    if (!name)               { showSgMsg(msgEl, "error", "Enter a goal name"); return; }
    if (!target || target <= 0) { showSgMsg(msgEl, "error", "Enter a valid target amount"); return; }
    if (!date)               { showSgMsg(msgEl, "error", "Pick a target date"); return; }

    try {
        const res  = await fetch(GOALS_API, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
                user_id:       currentUser.id,
                goal_name:     name,
                target_amount: target,
                target_date:   date
            })
        });
        const data = await res.json();

        if (res.ok) {
            // Clear form
            document.getElementById("sg-name").value   = "";
            document.getElementById("sg-target").value = "";
            document.getElementById("sg-date").value   = "";
            showSgMsg(msgEl, "success", "✅ Goal created!");
            await refreshSgGrid();
        } else {
            showSgMsg(msgEl, "error", data.message || "Failed to create goal");
        }
    } catch (e) {
        showSgMsg(msgEl, "error", "Server error. Please try again.");
    }
}

// ══════════════════════════════════════════════
// SUBMIT SAVINGS
// ══════════════════════════════════════════════
async function submitSavings(id) {
    const input  = document.getElementById(`sg-amt-${id}`);
    const amount = parseFloat(input?.value);

    if (!amount || amount <= 0) { alert("Enter a valid amount"); return; }

    try {
        const res  = await fetch(`${GOALS_API}/${id}/add-savings`, {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ amount })
        });
        const data = await res.json();

        if (res.ok) {
            await refreshSgGrid();
            if (data.achieved) {
                launchConfetti();
                showCelebrationBanner();
            }
        } else {
            alert(data.message || "Failed to add savings");
        }
    } catch (e) {
        alert("Server error. Please try again.");
    }
}

// ══════════════════════════════════════════════
// DELETE GOAL
// ══════════════════════════════════════════════
async function deleteSavingsGoal(id) {
    if (!confirm("Delete this savings goal?")) return;

    try {
        const res = await fetch(`${GOALS_API}/${id}`, { method: "DELETE" });
        if (res.ok) {
            await refreshSgGrid();
        } else {
            alert("Failed to delete goal");
        }
    } catch (e) {
        alert("Server error. Please try again.");
    }
}

// ══════════════════════════════════════════════
// REFRESH GRID (no full page re-render)
// ══════════════════════════════════════════════
async function refreshSgGrid() {
    const grid = document.getElementById("sg-grid");
    if (!grid) return;
    try {
        const goals = await fetchSavingsGoals();

        // Update stats strip
        const totalGoals    = goals.length;
        const achieved      = goals.filter(g => parseFloat(g.saved_amount) >= parseFloat(g.target_amount)).length;
        const totalSaved    = goals.reduce((s, g) => s + parseFloat(g.saved_amount), 0);

        const elGoals   = document.querySelector(".sg-stat:nth-child(1) .sg-stat-val");
        const elAchieved= document.querySelector(".sg-stat:nth-child(2) .sg-stat-val");
        const elSaved   = document.querySelector(".sg-stat:nth-child(3) .sg-stat-val");

        if (elGoals)    elGoals.textContent    = totalGoals;
        if (elAchieved) elAchieved.textContent = achieved;
        if (elSaved)    elSaved.textContent    = INR(totalSaved);

        // Update grid
        grid.innerHTML = goals.length === 0
            ? buildSgEmpty()
            : goals.map((g, i) => buildGoalCard(g, i)).join("");
    } catch (e) {
        console.error("Failed to refresh goals grid", e);
    }
}

// ══════════════════════════════════════════════
// FORM MESSAGE
// ══════════════════════════════════════════════
function showSgMsg(el, type, text) {
    if (!el) return;
    el.className  = `sg-form-msg ${type}`;
    el.textContent = text;
    setTimeout(() => { if (el) el.className = "sg-form-msg"; }, 3200);
}

// ══════════════════════════════════════════════
// CELEBRATION BANNER
// ══════════════════════════════════════════════
function showCelebrationBanner() {
    const old = document.querySelector(".sg-celebration");
    if (old) old.remove();

    const banner = document.createElement("div");
    banner.className   = "sg-celebration";
    banner.textContent = "🎉 Congratulations! Goal Achieved! 🎉";
    document.body.appendChild(banner);
    setTimeout(() => { if (banner.parentNode) banner.remove(); }, 4000);
}

// ══════════════════════════════════════════════
// CONFETTI 🎊
// ══════════════════════════════════════════════
function launchConfetti() {
    const colors = ["#FFB347","#5BBFA1","#9B8FE8","#6AADE4","#E86A8A","#D4A800","#3A88D4","#D04040"];
    const total  = 130;

    for (let i = 0; i < total; i++) {
        setTimeout(() => {
            const el   = document.createElement("div");
            const size = Math.random() * 9 + 5;
            el.className = "confetti-piece";
            el.style.cssText = `
                left:${Math.random() * 100}vw;
                background:${colors[Math.floor(Math.random() * colors.length)]};
                width:${size}px;
                height:${size}px;
                animation-duration:${(Math.random() * 2 + 2.2).toFixed(2)}s;
                animation-delay:${(Math.random() * 0.6).toFixed(2)}s;
                border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
            `;
            document.body.appendChild(el);
            el.addEventListener("animationend", () => el.remove());
        }, i * 14);
    }
}