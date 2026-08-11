document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initBluetoothConnect();
    initDeviceSelect();
  });
  
  /* ==========================================================================
     1. Bottom Navbar Navigation Switcher
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
     2. Live Telemetry Simulation & Connection State
     ========================================================================== */
  let isConnected = false;
  let telemetryInterval = null;
  
  // Telemetry state tracker
  let currentAngle = 0;
  let targetAngle = 0;
  let minObserved = 180;
  let maxObserved = 0;
  let simPhase = 0; // Controls sine-wave motion cycle
  
  function initBluetoothConnect() {
    const btnConnect = document.querySelector('.btn-connect');
    const bleIconBtn = document.querySelector('.ble-icon-btn');
    const statusDot = document.querySelector('.status-dot');
    const statusPill = document.querySelector('.status-pill');
  
    if (!btnConnect) return;
  
    btnConnect.addEventListener('click', () => {
      btnConnect.classList.add('btn-pressed');
      setTimeout(() => btnConnect.classList.remove('btn-pressed'), 250);
  
      isConnected = !isConnected;
  
      if (isConnected) {
        showSystemPopup(
          "Knee Brace Connected",
          "FlexTrack Device #001 (Right Knee) linked successfully. Telemetry streaming active."
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
  
  /* --------------------------------------------------------------------------
     3. Telemetry Stream Simulator (Leg Flexion / Extension)
     -------------------------------------------------------------------------- */
  function startTelemetrySimulation() {
    // Reset baseline metrics
    minObserved = 180;
    maxObserved = 0;
    simPhase = 0;
  
    // Run update cycle every 100ms (~10 FPS simulation smooth rendering)
    telemetryInterval = setInterval(() => {
      // Generate realistic sinusoidal movement (0° extension to 110° deep flex)
      simPhase += 0.08;
      
      // Add tiny random sensor jitter (±1.5°) for realism
      const jitter = (Math.random() - 0.5) * 3;
      const rawAngle = Math.max(0, Math.min(120, Math.round(55 + 50 * Math.sin(simPhase) + jitter)));
  
      // Smooth movement interpolation
      currentAngle = rawAngle;
  
      // Track min/max ROM
      if (currentAngle < minObserved) minObserved = currentAngle;
      if (currentAngle > maxObserved) maxObserved = currentAngle;
  
      updateDialDisplay(currentAngle, minObserved, maxObserved);
    }, 100);
  }
  
  function stopTelemetrySimulation() {
    if (telemetryInterval) {
      clearInterval(telemetryInterval);
      telemetryInterval = null;
    }
    
    // Return dial to standby (0°)
    updateDialDisplay(0, 0, 0);
  }
  
  /**
   * Renders angle values, dial rings, and ROM metrics into the DOM
   */
  function updateDialDisplay(angle, minAngle, maxAngle) {
    // 1. Update Angle Number
    const angleEl = document.querySelector('.circle-angle');
    if (angleEl) angleEl.textContent = angle;
  
    // 2. Update Dynamic Radial Ring Glow (Intensity increases with deeper bend)
    const circleRing = document.querySelector('.circle-ring');
    if (circleRing) {
      const intensity = (angle / 110).toFixed(2);
      circleRing.style.borderColor = `rgba(63, 185, 80, ${Math.max(0.25, intensity)})`;
      circleRing.style.boxShadow = `0 0 ${10 + angle * 0.3}px rgba(63, 185, 80, ${0.1 + intensity * 0.3})`;
    }
  
    // 3. Update Status Label
    const stateEl = document.querySelector('.circle-state span');
    if (stateEl) {
      if (!isConnected) {
        stateEl.textContent = 'STANDBY';
      } else if (angle > 90) {
        stateEl.textContent = 'DEEP FLEXION';
      } else if (angle > 15) {
        stateEl.textContent = 'IN MOTION';
      } else {
        stateEl.textContent = 'EXTENDED';
      }
    }
  
    // 4. Update Target Range Bar Marker position (%)
    const rangeMarker = document.querySelector('.range-marker');
    if (rangeMarker) {
      // Map 0-120 degrees to 0%-100% tracker bar
      const posPercent = Math.min(100, Math.max(0, (angle / 120) * 100));
      rangeMarker.style.left = `${posPercent}%`;
    }
  
    // 5. Update Comparison Summary Chips (Min / Max / Delta)
    const chips = document.querySelectorAll('.chip-value');
    if (chips.length >= 3 && isConnected) {
      chips[0].textContent = `${minAngle}°`;
      chips[1].textContent = `${maxAngle}°`;
      chips[2].textContent = `${maxAngle - minAngle}°`;
    } else if (chips.length >= 3) {
      chips[0].textContent = `0°`;
      chips[1].textContent = `0°`;
      chips[2].textContent = `0°`;
    }
  }
  
  /* --------------------------------------------------------------------------
     4. UI Helpers & Modals
     -------------------------------------------------------------------------- */
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
  
  /* --------------------------------------------------------------------------
     5. Device Select Dropdown
     -------------------------------------------------------------------------- */
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