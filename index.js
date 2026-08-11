/* ==========================================================================
   1. STRUCTURED CLINICAL TELEMETRY DATASET
   Sequence Outline:
   - Phase 1: Initial Rest (Straight knee ~0°-4°)
   - Phase 2: Slow Bend into Target Range (80° - 110°)
   - Phase 3: Controlled Loosening below Target Range (< 80°)
   - Phase 4: Recovery back into Target Range
   - Phase 5: Deep Push past Maximum Threshold (> 110°) & Final Rest
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
      
        // 2. Radial Ring Color & Glow Dynamic Feedback
        const circleRing = document.querySelector('.circle-ring');
        if (circleRing) {
          if (!isConnected) {
            circleRing.style.borderColor = 'var(--line-color, #30363d)';
            circleRing.style.boxShadow = 'none';
          } else if (angle > 110) {
            // OVER-EXTENSION / MAX WARNING (Amber / Red glow)
            circleRing.style.borderColor = '#f85149';
            circleRing.style.boxShadow = '0 0 25px rgba(248, 81, 73, 0.5)';
          } else if (angle >= 80 && angle <= 110) {
            // IN TARGET RANGE (Green glow)
            circleRing.style.borderColor = '#3fb950';
            circleRing.style.boxShadow = '0 0 20px rgba(63, 185, 80, 0.4)';
          } else {
            // BELOW TARGET RANGE / MOTION (Subtle blue-grey glow)
            circleRing.style.borderColor = '#58a6ff';
            circleRing.style.boxShadow = '0 0 10px rgba(88, 166, 255, 0.2)';
          }
        }
      
        // 3. Status Label Text
        const stateSpan = document.querySelector('.circle-state span');
        if (stateSpan) {
          if (!isConnected) {
            stateSpan.textContent = 'STANDBY';
          } else if (angle > 110) {
            stateSpan.textContent = 'EXCEEDS MAX THRESHOLD';
          } else if (angle >= 80 && angle <= 110) {
            stateSpan.textContent = 'IN TARGET RANGE';
          } else if (angle >= 10) {
            stateSpan.textContent = 'BELOW TARGET';
          } else {
            stateSpan.textContent = 'EXTENDED (REST)';
          }
        }
      
        // 4. Target Range Marker Ball Position (0°-150° scale matching HTML track)
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
      if (statusPill) {
        const textNode = Array.from(statusPill.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
        if (textNode) textNode.textContent = ' Connected';
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
      if (statusPill) {
        const textNode = Array.from(statusPill.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
        if (textNode) textNode.textContent = ' Offline';
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