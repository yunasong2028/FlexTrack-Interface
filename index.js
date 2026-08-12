/* ==========================================================================
   LIVE FEEDBACK READING INTERACTIONS
   ========================================================================== */


/* ==========================================================================
   1. STRUCTURED CLINICAL TELEMETRY DATASET
   ========================================================================== */
const MOCK_KNEE_TELEMETRY = [
    // ------------------------------------------------------------------------
    // PHASE 1: REST / STRAIGHT KNEE EXTENSION (0° - 4°)
    // ------------------------------------------------------------------------
    0, 0, 1, 2, 2, 3, 4, 3, 2, 1, 0,

    // ------------------------------------------------------------------------
    // PHASE 2: SLOW BEND INTO TARGET RANGE (Target: 80° - 110°)
    // ------------------------------------------------------------------------
    5, 10, 16, 24, 33, 43, 54, 65, 74, 80, 84, 88, 92, 95, 96, 95, 96,

    // ------------------------------------------------------------------------
    // PHASE 3: SLOW LOOSENING OUTSIDE TARGET RANGE (< 80°)
    // ------------------------------------------------------------------------
    93, 89, 83, 77, 71, 65, 60, 58, 60, 62,

    // ------------------------------------------------------------------------
    // PHASE 4: CLIMB BACK WITHIN TARGET RANGE
    // ------------------------------------------------------------------------
    66, 72, 79, 85, 90, 96, 101, 105,

    // ------------------------------------------------------------------------
    // PHASE 5: PUSH PAST MAXIMUM THRESHOLD (> 110°) & RETURN REST
    // ------------------------------------------------------------------------
    108, 111, 114, 117, 119, 120, 118, 115, // Hyper-flexion peak
    109, 100, 88, 74, 58, 41, 26, 14, 5, 2, 0, 0
];

/* ==========================================================================
   2. GLOBAL STATE & EVENT INITIALIZATION
   ========================================================================== */
let isConnected = false;
let telemetryInterval = null;
let dataIndex = 0;

let minObserved = 180;
let maxObserved = 0;

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initBluetoothConnect();
    initDeviceSelect();

    // Explicitly force standby state (0 degrees) on page load
    updateDialDisplay(0, 0, 0);

    const bleSelect = document.querySelector('.ble-select');
    const bleIconBtn = document.getElementById('bleIconBtn');
    const btnConnect = document.getElementById('btnConnect');

    if (bleSelect) {
        bleSelect.addEventListener('change', (e) => {
            const hasSelection = e.target.value !== '';

            // 1. Toggle Bluetooth icon box state
            if (bleIconBtn) {
                bleIconBtn.classList.toggle('selected', hasSelection);
            }

            // 2. Enable or disable the connect button
            if (btnConnect) {
                btnConnect.disabled = !hasSelection;
            }
        });
    }
});

/* ==========================================================================
   3. BOTTOM NAVBAR NAVIGATION SWITCHER
   ========================================================================== */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach((item) => {
        item.addEventListener('click', (event) => {
            event.preventDefault();
            navItems.forEach((nav) => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

/* ==========================================================================
   4. BLUETOOTH CONNECTION & TELEMETRY CONTROL
   ========================================================================== */
function initBluetoothConnect() {
    const btnConnect = document.querySelector('.btn-connect');
    const bleIconBtn = document.querySelector('.ble-icon-btn');
    const statusDot = document.querySelector('.status-dot');
    const statusPill = document.querySelector('.status-pill');

    if (!btnConnect) return;

    btnConnect.addEventListener('click', () => {
        // Visual button interaction feedback
        btnConnect.classList.add('btn-pressed');
        setTimeout(() => btnConnect.classList.remove('btn-pressed'), 250);

        isConnected = !isConnected;

        if (isConnected) {
            showSystemPopup(
                "Knee Brace Connected",
                "FlexTrack Device #001 (Right Knee) linked successfully. Array telemetry playback active."
            );
            startTelemetrySimulation();
        } else {
            showSystemPopup(
                "Device Disconnected",
                "FlexTrack Knee Brace has been safely unlinked."
            );
            stopTelemetrySimulation();
        }

        updateBluetoothUI(isConnected, btnConnect, bleIconBtn, statusDot, statusPill);
    });
}

/**
 * Playback simulator consuming MOCK_KNEE_TELEMETRY array
 */
function startTelemetrySimulation() {
    minObserved = 180;
    maxObserved = 0;
    dataIndex = 0;

    // Stream data frame every 100ms (10 Hz rate)
    telemetryInterval = setInterval(() => {
        // 1. Fetch current frame angle from array
        const currentAngle = MOCK_KNEE_TELEMETRY[dataIndex];

        // 2. Compute dynamic Min/Max ROM metrics
        if (currentAngle < minObserved) minObserved = currentAngle;
        if (currentAngle > maxObserved) maxObserved = currentAngle;

        // 3. Render frame to user interface
        updateDialDisplay(currentAngle, minObserved, maxObserved);

        // 4. Advance cursor & loop back when complete
        dataIndex = (dataIndex + 1) % MOCK_KNEE_TELEMETRY.length;
    }, 200);
}

function stopTelemetrySimulation() {
    if (telemetryInterval) {
        clearInterval(telemetryInterval);
        telemetryInterval = null;
    }

    // Reset UI display state to zero/standby
    updateDialDisplay(0, 0, 0);
}

/* ==========================================================================
   5. UI RENDERING ENGINE
   ========================================================================== */
function updateDialDisplay(angle, minAngle, maxAngle) {
    // 1. Center Numeric Readout
    const angleEl = document.querySelector('.circle-angle');
    if (angleEl) angleEl.textContent = angle;

    const circleRing = document.querySelector('.circle-ring');
    const stateSpan = document.querySelector('.circle-state span');
    const stateSvg = document.querySelector('.circle-state svg');

    // Pull telemetry colors dynamically from CSS variables
    const computedStyle = getComputedStyle(document.documentElement);
    const RED_COLOR = computedStyle.getPropertyValue('--telemetry-red').trim() || '#f85149';
    const RED_BG = computedStyle.getPropertyValue('--telemetry-red-bg').trim() || 'rgba(248, 81, 73, 0.22)';

    const YELLOW_COLOR = computedStyle.getPropertyValue('--telemetry-yellow').trim() || '#d29922';
    const YELLOW_BG = computedStyle.getPropertyValue('--telemetry-yellow-bg').trim() || 'rgba(210, 153, 34, 0.15)';

    const GREEN_COLOR = computedStyle.getPropertyValue('--telemetry-green').trim() || '#3fb950';
    const GREEN_BG = computedStyle.getPropertyValue('--telemetry-green-bg').trim() || 'rgba(63, 185, 80, 0.15)';

    if (circleRing) {
        if (!isConnected) {
            // STANDBY / OFFLINE
            circleRing.style.borderColor = 'var(--border, #2a3140)';
            circleRing.style.backgroundColor = 'transparent';
            circleRing.style.boxShadow = 'none';

            if (stateSpan) {
                stateSpan.textContent = 'STANDBY';
                stateSpan.style.color = 'var(--muted, #7d8590)';
            }
            if (stateSvg) {
                stateSvg.setAttribute('stroke', 'var(--muted, #7d8590)');
                stateSvg.innerHTML = `<circle cx="12" cy="12" r="4"/>`;
            }
        }
        // RED ZONE: Below min threshold (<70°) or Above max threshold (>110°)
        else if (angle < 70 || angle > 110) {
            circleRing.style.borderColor = RED_COLOR;
            circleRing.style.backgroundColor = RED_BG;
            circleRing.style.boxShadow = `0 0 25px ${RED_COLOR}73`; // 45% alpha glow

            if (stateSpan) {
                stateSpan.textContent = angle < 70 ? 'BELOW RANGE' : 'EXCEEDS MAX THRESHOLD';
                stateSpan.style.color = RED_COLOR;
            }
            if (stateSvg) {
                stateSvg.setAttribute('stroke', RED_COLOR);
                stateSvg.innerHTML = angle < 70
                    ? `<path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`
                    : `<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01" />`;
            }
        }
        // YELLOW ZONE: Approaching lower threshold (70°-79°) or upper threshold (101°-110°)
        else if ((angle >= 70 && angle < 80) || (angle > 100 && angle <= 110)) {
            circleRing.style.borderColor = YELLOW_COLOR;
            circleRing.style.backgroundColor = YELLOW_BG;
            circleRing.style.boxShadow = `0 0 20px ${YELLOW_COLOR}66`;

            if (stateSpan) {
                stateSpan.textContent = angle < 80 ? 'APPROACHING TARGET' : 'APPROACHING MAX';
                stateSpan.style.color = YELLOW_COLOR;
            }
            if (stateSvg) {
                stateSvg.setAttribute('stroke', YELLOW_COLOR);
                stateSvg.innerHTML = `<circle cx="12" cy="12" r="4"/>`;
            }
        }
        // GREEN ZONE: Target Range (80°-100°)
        else {
            circleRing.style.borderColor = GREEN_COLOR;
            circleRing.style.backgroundColor = GREEN_BG;
            circleRing.style.boxShadow = `0 0 20px ${GREEN_COLOR}66`;

            if (stateSpan) {
                stateSpan.textContent = 'IN TARGET RANGE';
                stateSpan.style.color = GREEN_COLOR;
            }
            if (stateSvg) {
                stateSvg.setAttribute('stroke', GREEN_COLOR);
                stateSvg.innerHTML = `<path d="M20 6L9 17l-5-5" />`;
            }
        }
    }

    // 4. Target Range Marker Ball Position (0°-150° scale)
    const rangeMarker = document.querySelector('.range-marker');
    if (rangeMarker) {
        const posPercent = Math.min(100, Math.max(0, (angle / 150) * 100));
        rangeMarker.style.left = `${posPercent}%`;
    }

    // 5. Comparison Chips (Current | Target Mid = 95° | Delta)
    const chipValues = document.querySelectorAll('.chip-value');
    if (chipValues.length >= 3) {
        if (isConnected) {
            const targetMid = 95;
            const diff = angle - targetMid;
            const diffSign = diff > 0 ? `+${diff}` : `${diff}`;

            chipValues[0].textContent = `${angle}°`;
            chipValues[1].textContent = `${targetMid}°`;
            chipValues[2].textContent = `${diffSign}°`;
        } else {
            chipValues[0].textContent = `0°`;
            chipValues[1].textContent = `95°`;
            chipValues[2].textContent = `-95°`;
        }
    }
}

/* ==========================================================================
   6. UI HELPERS & DEVICE DROPDOWN
   ========================================================================== */
function showSystemPopup(title, message) {
    const existing = document.querySelector('.system-popup-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'system-popup-overlay';
    overlay.innerHTML = `
      <div class="system-popup-card">
        <div class="system-popup-header">
          <span class="system-popup-title">${title}</span>
        </div>
        <p class="system-popup-body">${message}</p>
        <button class="system-popup-btn">Dismiss</button>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.system-popup-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

function updateBluetoothUI(connected, btnConnect, bleIconBtn, statusDot, statusPill) {
    const statusText = statusPill ? statusPill.querySelector('.status-text') : null;
    const sessionStatus = document.getElementById('sessionStatus');

    if (connected) {
        btnConnect.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        Connected
      `;
        btnConnect.classList.add('is-connected');

        if (bleIconBtn) bleIconBtn.classList.add('connected');
        if (statusDot) statusDot.style.background = 'var(--accent)';

        // Direct element replacement (no leftover text nodes)
        if (statusText) statusText.textContent = 'Connected';

        if (sessionStatus) {
            sessionStatus.textContent = 'Session: Active';
            sessionStatus.classList.add('active');
        }

    } else {
        btnConnect.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6.5 6.5l11 11M6.5 17.5l11-11M12 2v20"/>
        </svg>
        Connect Knee Brace
      `;
        btnConnect.classList.remove('is-connected');

        if (bleIconBtn) bleIconBtn.classList.remove('connected');
        if (statusDot) statusDot.style.background = 'var(--warn)';

        // Direct element replacement
        if (statusText) statusText.textContent = 'Offline';

        if (sessionStatus) {
            sessionStatus.textContent = 'Session: Inactive';
            sessionStatus.classList.remove('active');
        }
    }
}

function initDeviceSelect() {
    const selectEl = document.querySelector('.ble-select');
    if (!selectEl) return;

    if (selectEl.options.length <= 1) {
        selectEl.innerHTML = `
        <option value="" disabled selected>Select Knee Brace Device...</option>
        <option value="FT-BRACE-LEFT">FlexTrack Left Knee Brace (#001)</option>
        <option value="FT-BRACE-RIGHT">FlexTrack Right Knee Brace (#002)</option>
      `;
    }

    selectEl.addEventListener('change', (e) => {
        if (e.target.value) {
            selectEl.classList.add('has-value');
        } else {
            selectEl.classList.remove('has-value');
        }
    });
}




/* ==========================================================================
   PROGRESS DASHBOARD INTERACTIONS
   ========================================================================== */

// Run initialization once DOM is fully parsed
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function initApp() {
    initRangePills();
    initMonthlyCalendar();
}

/**
 * Range Pills Handler (7D, 30D, All)
 */
function initRangePills() {
    const pills = document.querySelectorAll('.range-pill');

    pills.forEach((pill) => {
        pill.setAttribute('role', 'button');
        pill.setAttribute('tabindex', '0');

        // Click handling
        pill.addEventListener('click', () => handlePillSelect(pill, pills));

        // Keyboard handling
        pill.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePillSelect(pill, pills);
            }
        });
    });
}

/**
 * Mock datasets for each range view
 */
const graphData = {
    '7D': {
        points: '30,115 80,105 130,95 180,88 230,78 280,65 330,55 380,44',
        area: 'M30 115 L80 105 L130 95 L180 88 L230 78 L280 65 L330 55 L380 44 L380 140 L30 140 Z',
        showStaticDots: true, // Keep day-by-day dots visible
        activePoint: { cx: 380, cy: 44 },
        tooltip: { x: 350, y: 20, textX: 370, textY: 32, value: '95°' },
        labels: ['D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'Today']
    },
    '30D': {
        points: '30,125 80,118 130,110 180,95 230,80 280,60 330,50 380,44',
        area: 'M30 125 L80 118 L130 110 L180 95 L230 80 L280 60 L330 50 L380 44 L380 140 L30 140 Z',
        showStaticDots: false, // Clean up dots for macro view
        activePoint: { cx: 380, cy: 44 },
        tooltip: { x: 350, y: 20, textX: 370, textY: 32, value: '95°' },
        labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'Today']
    },
    'All': {
        points: '30,135 80,130 130,120 180,105 230,90 280,72 330,58 380,44',
        area: 'M30 135 L80 130 L130 120 L180 105 L230 90 L280 72 L330 58 L380 44 L380 140 L30 140 Z',
        showStaticDots: false, // Clean up dots for macro view
        activePoint: { cx: 380, cy: 44 },
        tooltip: { x: 350, y: 20, textX: 370, textY: 32, value: '95°' },
        labels: ['Start', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'Today']
    }
};

function handlePillSelect(selectedPill, allPills) {
    if (selectedPill.classList.contains('active')) return;

    allPills.forEach((p) => p.classList.remove('active'));
    selectedPill.classList.add('active');

    const range = selectedPill.textContent.trim();
    updateGraphData(range);
}

/**
 * Updates SVG polyline, path area, active dot, and X-axis labels with a smooth fade animation
 */
function updateGraphData(range) {
    const data = graphData[range];
    if (!data) return;

    const svgWrap = document.querySelector('.graph-svg-wrap');
    const polyline = document.querySelector('.graph-line');
    const pathArea = document.querySelector('.graph-svg-wrap path');
    const staticDots = document.querySelectorAll('.graph-point');
    const activeDot = document.querySelector('.graph-point-active');
    const tooltipRect = document.querySelector('.graph-svg-wrap rect');
    const tooltipText = document.querySelector('.graph-tooltip-text');
    const xLabelsContainer = document.querySelector('.graph-x-labels');

    if (!svgWrap || !polyline) return;

    // 1. Trigger fade out
    svgWrap.classList.add('updating');

    setTimeout(() => {
        // 2. Update polyline and area path
        polyline.setAttribute('points', data.points);
        if (pathArea) pathArea.setAttribute('d', data.area);

        // 3. Toggle static dots visibility
        staticDots.forEach((dot) => {
            if (data.showStaticDots) {
                dot.classList.remove('hidden-point');
            } else {
                dot.classList.add('hidden-point');
            }
        });

        // 4. Update active focus dot & tooltip position
        if (activeDot) {
            activeDot.setAttribute('cx', data.activePoint.cx);
            activeDot.setAttribute('cy', data.activePoint.cy);
        }
        if (tooltipRect) {
            tooltipRect.setAttribute('x', data.tooltip.x);
            tooltipRect.setAttribute('y', data.tooltip.y);
        }
        if (tooltipText) {
            tooltipText.setAttribute('x', data.tooltip.textX);
            tooltipText.setAttribute('y', data.tooltip.textY);
            tooltipText.textContent = data.tooltip.value;
        }

        // 5. Update timeline labels
        if (xLabelsContainer && data.labels) {
            const spans = xLabelsContainer.querySelectorAll('span');
            spans.forEach((span, idx) => {
                if (data.labels[idx]) span.textContent = data.labels[idx];
            });
        }

        // 6. Fade back in
        svgWrap.classList.remove('updating');
    }, 150);
}

/**
 * Monthly Calendar Dropdown Handler
 */
function initMonthlyCalendar() {
    const toggleBtn = document.getElementById('calendar-toggle');
    const tray = document.getElementById('calendar-tray');
    const grid = document.getElementById('calendar-grid');

    if (!toggleBtn || !tray || !grid) return;

    const expandText = toggleBtn.querySelector('.expand-text');

    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();

        const isHidden = tray.classList.contains('hidden');

        if (isHidden) {
            // 1. Populate calendar DOM while still hidden
            if (grid.children.length === 0) {
                renderCalendar(grid);
            }

            // 2. Slide open smoothly
            tray.classList.remove('hidden');
            toggleBtn.classList.add('open');
            toggleBtn.setAttribute('aria-expanded', 'true');
            tray.setAttribute('aria-hidden', 'false');
            if (expandText) expandText.textContent = 'Hide monthly calendar';

        } else {
            // 3. Slide closed smoothly
            tray.classList.add('hidden');
            toggleBtn.classList.remove('open');
            toggleBtn.setAttribute('aria-expanded', 'false');
            tray.setAttribute('aria-hidden', 'true');
            if (expandText) expandText.textContent = 'View monthly calendar';
        }
    });
}

/**
 * Renders calendar days into the grid for August 2026
 */
function renderCalendar(gridContainer) {
    gridContainer.innerHTML = '';

    const firstDayIndex = 6; // Starts on Saturday
    const totalDays = 31;
    const todayDate = 11;
    const completedDays = [4, 5, 7, 8, 9, 10];

    // Empty leading offset cells
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'cal-day empty';
        gridContainer.appendChild(emptyCell);
    }

    // Month days
    for (let day = 1; day <= totalDays; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'cal-day';
        dayCell.textContent = day;

        if (day === todayDate) {
            dayCell.classList.add('today');
        } else if (completedDays.includes(day)) {
            dayCell.classList.add('completed');
        }

        gridContainer.appendChild(dayCell);
    }
}




document.addEventListener('DOMContentLoaded', () => {
    // Select the master notification toggle and all sub-option toggles/inputs
    const masterToggle = document.querySelector('#notif-master-toggle input[type="checkbox"]');
    const subContainer = document.querySelector('.notif-sub');
    const subToggles = subContainer ? subContainer.querySelectorAll('input[type="checkbox"], select') : [];

    if (!masterToggle || !subContainer) return;

    // Store the previous checked states so we can restore them when toggled back on
    const previousStates = new Map();

    function updateSubOptionsState(isMasterOn) {
        if (isMasterOn) {
            // Re-enable sub-options and restore their previous states
            subContainer.style.opacity = '1';
            subContainer.style.pointerEvents = 'auto';

            subToggles.forEach((input) => {
                input.disabled = false;
                if (input.type === 'checkbox') {
                    // Restore saved state, defaulting to false if none was stored
                    input.checked = previousStates.has(input) ? previousStates.get(input) : false;
                }
            });
        } else {
            // Save current state before switching off, then uncheck and disable
            subToggles.forEach((input) => {
                if (input.type === 'checkbox') {
                    previousStates.set(input, input.checked);
                    input.checked = false;
                }
                input.disabled = true;
            });

            // Visually indicate disabled state
            subContainer.style.opacity = '0.4';
            subContainer.style.pointerEvents = 'none';
        }
    }

    // Handle master toggle switch
    masterToggle.addEventListener('change', (e) => {
        updateSubOptionsState(e.target.checked);
    });

    // Track manual changes to sub-toggles while master is active
    subToggles.forEach((input) => {
        if (input.type === 'checkbox') {
            input.addEventListener('change', () => {
                if (masterToggle.checked) {
                    previousStates.set(input, input.checked);
                }
            });
        }
    });

    // Initialize state on page load
    updateSubOptionsState(masterToggle.checked);
});

// navbar link click handler
const navlinks = document.querySelectorAll('.nav-item');
navlinks.forEach(link => {
    link.addEventListener('click', () => { location.assign(link.href) });
});






/* ==========================================================================
SETTINGS MENU INTERACTIONS
========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // Safely execute initializers if defined in external scripts
    if (typeof initNavigation === 'function') initNavigation();
    if (typeof initBluetoothConnect === 'function') initBluetoothConnect();
    if (typeof initDeviceSelect === 'function') initDeviceSelect();
    if (typeof updateDialDisplay === 'function') updateDialDisplay(0, 0, 0);

    // ── Bluetooth Select Handler ──────────────────────────────────────
    const bleSelect = document.querySelector('.ble-select');
    const bleIconBtn = document.getElementById('bleIconBtn');
    const btnConnect = document.getElementById('btnConnect');

    if (bleSelect) {
        bleSelect.addEventListener('change', (e) => {
            const hasSelection = e.target.value !== '';
            if (bleIconBtn) bleIconBtn.classList.toggle('selected', hasSelection);
            if (btnConnect) btnConnect.disabled = !hasSelection;
        });
    }

    // ── Master Notification & Sub-Options Toggle Logic ────────────────
    const masterInput = document.querySelector('#notif-master-toggle input[type="checkbox"]') ||
        document.querySelector('input#notif-master-toggle') ||
        document.querySelector('.setting-row:has(.setting-title) input[type="checkbox"]');

    const subContainer = document.querySelector('.notif-sub');

    if (masterInput && subContainer) {
        const subInputs = subContainer.querySelectorAll('input[type="checkbox"], select');
        const previousStates = new Map();

        subInputs.forEach(input => {
            if (input.type === 'checkbox') {
                previousStates.set(input, input.checked);
            }
        });

        function updateSubOptionsState(isMasterOn) {
            if (isMasterOn) {
                subContainer.classList.remove('is-disabled');
                subInputs.forEach((input) => {
                    input.disabled = false;
                    if (input.type === 'checkbox') {
                        input.checked = previousStates.get(input) ?? true;
                    }
                });
            } else {
                subContainer.classList.add('is-disabled');
                subInputs.forEach((input) => {
                    if (input.type === 'checkbox') {
                        previousStates.set(input, input.checked);
                        input.checked = false;
                    }
                    input.disabled = true;
                });
            }
        }

        masterInput.addEventListener('change', (e) => {
            updateSubOptionsState(e.target.checked);
        });

        subInputs.forEach((input) => {
            if (input.type === 'checkbox') {
                input.addEventListener('change', () => {
                    if (masterInput.checked) {
                        previousStates.set(input, input.checked);
                    }
                });
            }
        });

        updateSubOptionsState(masterInput.checked);
    }

    // ── Haptic Feedback & Vibration Intensity Menu Logic ─────────────
    let hapticToggle = document.querySelector('#haptic-toggle input[type="checkbox"]') ||
        document.querySelector('input#haptic-toggle');

    let intensityContainer = document.querySelector('#haptic-intensity-row');

    if (!hapticToggle || !intensityContainer) {
        document.querySelectorAll('.setting-row').forEach(row => {
            const titleText = row.querySelector('.setting-title')?.textContent.toLowerCase() || '';
            if (titleText.includes('haptic') && !hapticToggle) {
                hapticToggle = row.querySelector('input[type="checkbox"]');
            }
            if ((titleText.includes('vibration') || titleText.includes('intensity')) && !intensityContainer) {
                intensityContainer = row;
            }
        });
    }

    if (hapticToggle && intensityContainer) {
        intensityContainer.classList.add('haptic-intensity-container');

        function updateHapticVisibility(isHapticOn) {
            intensityContainer.style.display = isHapticOn ? '' : 'none';
        }

        hapticToggle.addEventListener('change', (e) => {
            updateHapticVisibility(e.target.checked);
        });

        updateHapticVisibility(hapticToggle.checked);
    }

    // ── Danger Zone Interactions & Modal Handlers ─────────────────────
    const modalOverlay = document.getElementById('confirmModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const btnCancelModal = document.getElementById('btnCancelModal');
    const btnConfirmModal = document.getElementById('btnConfirmModal');

    let pendingAction = null;

    const clearRow = document.getElementById('btn-clear-data') ||
        Array.from(document.querySelectorAll('.danger-row')).find(el => el.textContent.toLowerCase().includes('clear'));

    const logoutRow = document.getElementById('btn-logout') ||
        Array.from(document.querySelectorAll('.danger-row')).find(el => el.textContent.toLowerCase().includes('log out') || el.textContent.toLowerCase().includes('logout'));

    function triggerSingleClick(element, callback) {
        element.classList.remove('click-active');
        void element.offsetWidth; // Force reflow
        element.classList.add('click-active');

        setTimeout(() => {
            element.classList.remove('click-active');
            if (callback) callback();
        }, 150);
    }

    function openModal({ title, body, confirmText, onConfirm }) {
        if (!modalOverlay) {
            if (window.confirm(`${title}\n\n${body}`)) onConfirm();
            return;
        }

        if (modalTitle) modalTitle.innerHTML = `<span style="color: var(--warn, #f85149);">⚠️</span> ${title}`;
        if (modalBody) modalBody.textContent = body;
        if (btnConfirmModal) btnConfirmModal.textContent = confirmText;

        pendingAction = onConfirm;
        modalOverlay.classList.add('is-visible');
    }

    function closeModal() {
        if (modalOverlay) modalOverlay.classList.remove('is-visible');
        pendingAction = null;
    }

    if (clearRow) {
        clearRow.addEventListener('click', (e) => {
            e.preventDefault();
            triggerSingleClick(clearRow, () => {
                openModal({
                    title: 'Clear Session Data?',
                    body: 'Are you sure you want to clear session data? This will erase temporary telemetry logs and reset calibration offsets. This action cannot be undone.',
                    confirmText: 'Clear Data',
                    onConfirm: () => console.log('[Data] Session data cleared.')
                });
            });
        });
    }

    if (logoutRow) {
        logoutRow.addEventListener('click', (e) => {
            e.preventDefault();
            triggerSingleClick(logoutRow, () => {
                openModal({
                    title: 'Log Out?',
                    body: 'Are you sure you want to log out? You will need to re-authenticate to access telemetry data and device configuration settings.',
                    confirmText: 'Log Out',
                    onConfirm: () => console.log('[Auth] User logged out.')
                });
            });
        });
    }

    if (btnCancelModal) btnCancelModal.onclick = closeModal;
    if (btnConfirmModal) {
        btnConfirmModal.onclick = () => {
            if (pendingAction) pendingAction();
            closeModal();
        };
    }
    if (modalOverlay) {
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) closeModal();
        };
    }

    // ── BLE Device Scanning Simulation ────────────────────────────────
    const scanBtn = document.querySelector('.btn-scan, #scan-btn, .scan-btn') ||
        Array.from(document.querySelectorAll('button')).find(el => el.textContent.toLowerCase().includes('scan'));

    const deviceStatusBadge = document.querySelector('.brace-status, #device-status, .device-status');

    if (scanBtn) {
        let isConnected = false;

        scanBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (scanBtn.classList.contains('is-scanning')) return;

            scanBtn.classList.add('is-scanning');

            if (!isConnected) {
                // ── Action: Connecting Phase ──
                scanBtn.textContent = 'Searching...';

                if (deviceStatusBadge) {
                    deviceStatusBadge.innerHTML = `<div class="brace-status-dot"></div> Scanning...`;
                    deviceStatusBadge.classList.remove('connected');
                }

                setTimeout(() => {
                    scanBtn.classList.remove('is-scanning');
                    isConnected = true;

                    // Update button text to Disconnect state
                    scanBtn.textContent = 'Disconnect device';

                    // Update upper-right badge to Green Connected state
                    if (deviceStatusBadge) {
                        deviceStatusBadge.innerHTML = `<div class="brace-status-dot"></div> Connected`;
                        deviceStatusBadge.classList.add('connected');
                    }
                    console.log('[BLE] Device connected.');
                }, 2500);

            } else {
                // ── Action: Disconnecting Phase ──
                scanBtn.textContent = 'Disconnecting...';

                if (deviceStatusBadge) {
                    deviceStatusBadge.innerHTML = `<div class="brace-status-dot"></div> Disconnecting...`;
                }

                setTimeout(() => {
                    scanBtn.classList.remove('is-scanning');
                    isConnected = false;

                    // Revert button text to Scan state
                    scanBtn.textContent = 'Scan for devices';

                    // Revert upper-right badge to default state
                    if (deviceStatusBadge) {
                        deviceStatusBadge.innerHTML = `<div class="brace-status-dot"></div> Not paired`;
                        deviceStatusBadge.classList.remove('connected');
                    }
                    console.log('[BLE] Device disconnected.');
                }, 2500);
            }
        });
    }

    // ── Dynamic Rehab Program Edit Modal Logic ────────────────────────
    const editBtn = document.querySelector('.program-edit, #edit-btn, .edit-btn');
    const editModal = document.getElementById('editModal');
    const editTableBody = document.querySelector('#editParamsTable tbody');
    const btnCancelEdit = document.getElementById('btnCancelEdit');
    const btnSaveEdit = document.getElementById('btnSaveEdit');

    function openEditModal() {
        if (!editModal || !editTableBody) return;
        editTableBody.innerHTML = '';

        // Read values from .program-card rows
        const programRows = document.querySelectorAll('.program-card .program-row');
        if (programRows.length > 0) {
            programRows.forEach((row, index) => {
                const label = row.querySelector('.program-key')?.textContent.trim() || '';
                const value = row.querySelector('.program-val')?.textContent.trim() || '';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${label}</strong></td>
                    <td>
                        <input type="text" data-program-index="${index}" value="${value}" />
                    </td>
                `;
                editTableBody.appendChild(tr);
            });
        }

        editModal.classList.add('is-visible');
    }

    function closeEditModal() {
        if (editModal) editModal.classList.remove('is-visible');
    }

    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openEditModal();
        });
    }

    if (btnSaveEdit) {
        btnSaveEdit.addEventListener('click', () => {
            const inputs = editTableBody.querySelectorAll('input[data-program-index]');
            const programRows = document.querySelectorAll('.program-card .program-row');

            inputs.forEach(input => {
                const index = parseInt(input.getAttribute('data-program-index'), 10);
                const newValue = input.value.trim();
                if (programRows[index]) {
                    const valEl = programRows[index].querySelector('.program-val');
                    if (valEl) valEl.textContent = newValue;
                }
            });

            console.log('[Settings] Rehab program updated.');
            closeEditModal();
        });
    }

    if (btnCancelEdit) btnCancelEdit.addEventListener('click', closeEditModal);
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) closeEditModal();
        });
    }
});