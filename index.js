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
      
        const circleRing = document.querySelector('.circle-ring');
        const stateSpan = document.querySelector('.circle-state span');
        const stateSvg = document.querySelector('.circle-state svg');
      
        // Define Zone Colors
        const RED_COLOR = '#f85149';
        const YELLOW_COLOR = '#d29922';
        const GREEN_COLOR = '#3fb950';
      
        if (circleRing) {
          if (!isConnected) {
            // STANDBY / OFFLINE
            circleRing.style.borderColor = 'var(--line-color, #30363d)';
            circleRing.style.backgroundColor = 'transparent';
            circleRing.style.boxShadow = 'none';
      
            if (stateSpan) {
              stateSpan.textContent = 'STANDBY';
              stateSpan.style.color = '#7d8590';
            }
            if (stateSvg) {
              stateSvg.setAttribute('stroke', '#7d8590');
              stateSvg.innerHTML = `<circle cx="12" cy="12" r="4"/>`;
            }
          } 
          // RED ZONE: Below min threshold (<70°) or Above max threshold (>110°)
          else if (angle < 70 || angle > 110) {
            circleRing.style.borderColor = RED_COLOR;
            circleRing.style.backgroundColor = 'rgba(248, 81, 73, 0.22)'; // Soft red background tint
            circleRing.style.boxShadow = '0 0 22px rgba(248, 81, 73, 0.45)';
      
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
            circleRing.style.backgroundColor = 'rgba(210, 153, 34, 0.15)'; // Soft yellow background tint
            circleRing.style.boxShadow = '0 0 20px rgba(210, 153, 34, 0.4)';
      
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
            circleRing.style.backgroundColor = 'rgba(63, 185, 80, 0.15)'; // Soft green background tint
            circleRing.style.boxShadow = '0 0 20px rgba(63, 185, 80, 0.4)';
      
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