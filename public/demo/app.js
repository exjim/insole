/**
 * StepCare Lab — 8채널(발당) 스마트 인솔 데모 엔진
 * 좌/우 각 8개 압력 센서(총 16채널): 무지(1) + 중족골 3개(전족부 4개) / 아치 2개(중족부) / 뒤꿈치 2개(후족부)
 */
const SENSOR_LAYOUT = {
  left: [
    { id: "L1", x: -0.06, y: 0.90, zone: "forefoot", label: "무지(엄지)" },
    { id: "L2", x: -0.30, y: 0.68, zone: "forefoot", label: "중족골 내측" },
    { id: "L3", x: 0.02, y: 0.74, zone: "forefoot", label: "중족골 중앙" },
    { id: "L4", x: 0.34, y: 0.64, zone: "forefoot", label: "중족골 외측" },
    { id: "L5", x: -0.26, y: 0.08, zone: "midfoot", label: "아치 내측" },
    { id: "L6", x: 0.22, y: 0.00, zone: "midfoot", label: "아치 외측" },
    { id: "L7", x: -0.20, y: -0.68, zone: "heel", label: "뒤꿈치 내측" },
    { id: "L8", x: 0.18, y: -0.74, zone: "heel", label: "뒤꿈치 외측" }
  ],
  right: [
    { id: "R1", x: 0.06, y: 0.90, zone: "forefoot", label: "무지(엄지)" },
    { id: "R2", x: 0.30, y: 0.68, zone: "forefoot", label: "중족골 내측" },
    { id: "R3", x: -0.02, y: 0.74, zone: "forefoot", label: "중족골 중앙" },
    { id: "R4", x: -0.34, y: 0.64, zone: "forefoot", label: "중족골 외측" },
    { id: "R5", x: 0.26, y: 0.08, zone: "midfoot", label: "아치 내측" },
    { id: "R6", x: -0.22, y: 0.00, zone: "midfoot", label: "아치 외측" },
    { id: "R7", x: 0.20, y: -0.68, zone: "heel", label: "뒤꿈치 내측" },
    { id: "R8", x: -0.18, y: -0.74, zone: "heel", label: "뒤꿈치 외측" }
  ]
};

const els = {
  connectionLabel: document.querySelector("#connectionLabel"),
  installBtn: document.querySelector("#installBtn"),
  themeBtn: document.querySelector("#themeBtn"),
  playBtn: document.querySelector("#playBtn"),
  speedRange: document.querySelector("#speedRange"),
  socketUrl: document.querySelector("#socketUrl"),
  connectBtn: document.querySelector("#connectBtn"),
  stepCount: document.querySelector("#stepCount"),
  cadence: document.querySelector("#cadence"),
  gct: document.querySelector("#gct"),
  strike: document.querySelector("#strike"),
  frameTime: document.querySelector("#frameTime"),
  totalForce: document.querySelector("#totalForce"),
  eventLabel: document.querySelector("#eventLabel"),
  lrBar: document.querySelector("#lrBar"),
  fbBar: document.querySelector("#fbBar"),
  lrText: document.querySelector("#lrText"),
  fbText: document.querySelector("#fbText"),
  payloadView: document.querySelector("#payloadView"),
  copyBtn: document.querySelector("#copyBtn"),
  segments: [...document.querySelectorAll(".segment")],
  viewTabs: [...document.querySelectorAll(".view-tab")],
  liveView: document.querySelector("#liveView"),
  reportView: document.querySelector("#reportView"),
  seniorSelect: document.querySelector("#seniorSelect"),
  riskBadge: document.querySelector("#riskBadge"),
  repRisk: document.querySelector("#repRisk"),
  repCadence: document.querySelector("#repCadence"),
  repAsym: document.querySelector("#repAsym"),
  repSync: document.querySelector("#repSync"),
  alertList: document.querySelector("#alertList"),
  alertCount: document.querySelector("#alertCount"),
  seniorTableBody: document.querySelector("#seniorTable tbody"),
  trendCanvas: document.querySelector("#trendCanvas")
};

const canvases = {
  left: document.querySelector("#leftFoot"),
  right: document.querySelector("#rightFoot"),
  balance: document.querySelector("#balanceCanvas"),
  timeline: document.querySelector("#timelineCanvas")
};

const ctx = {
  left: canvases.left.getContext("2d"),
  right: canvases.right.getContext("2d"),
  balance: canvases.balance.getContext("2d"),
  timeline: canvases.timeline.getContext("2d"),
  trend: els.trendCanvas.getContext("2d")
};

let deferredInstall = null;
let running = true;
let source = "demo";
let socket = null;
let lastFrame = null;
let stepCount = 0;
let cadenceWindow = [];
let timeline = [];
let footState = {
  left: { contact: false, contactAt: 0, lastGct: 0 },
  right: { contact: false, contactAt: 0, lastGct: 0 }
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easePulse(phase, center, width) {
  const dist = Math.abs(((phase - center + 0.5) % 1) - 0.5);
  return clamp(1 - dist / width, 0, 1);
}

function makeDemoFrame(now) {
  const speed = Number(els.speedRange.value);
  const t = now / 1000 * speed;
  const leftPhase = t % 1;
  const rightPhase = (t + 0.5) % 1;

  return {
    timestamp: Math.round(now),
    left: {
      raw: makeFootRaw(leftPhase, "left"),
      acc: {
        x: Number((Math.sin(t * 2.4) * 0.04).toFixed(3)),
        y: Number((0.92 + Math.cos(t * 5) * 0.05).toFixed(3)),
        z: Number((0.18 + Math.sin(t * 3.5) * 0.03).toFixed(3))
      }
    },
    right: {
      raw: makeFootRaw(rightPhase, "right"),
      acc: {
        x: Number((Math.cos(t * 2.1) * 0.04).toFixed(3)),
        y: Number((0.9 + Math.sin(t * 5.2) * 0.05).toFixed(3)),
        z: Number((0.2 + Math.cos(t * 3.1) * 0.03).toFixed(3))
      }
    }
  };
}

// 8채널: 무지 / 중족골 내측·중앙·외측 / 아치 내측·외측 / 뒤꿈치 내측·외측
function makeFootRaw(phase, side) {
  const contact = easePulse(phase, 0.28, 0.34);
  const heel = easePulse(phase, 0.12, 0.16) * contact;
  const mid = easePulse(phase, 0.28, 0.2) * contact;
  const fore = easePulse(phase, 0.46, 0.2) * contact;
  const toe = easePulse(phase, 0.50, 0.16) * contact;
  const sideBias = side === "left" ? 1.04 : 0.96;
  const noise = (n) => Math.sin(phase * 18 + n) * 10;

  return [
    Math.round(58 + toe * 520 * sideBias + noise(1)),   // 무지
    Math.round(68 + fore * 760 * sideBias + noise(2)),  // 중족골 내측
    Math.round(70 + fore * 820 / sideBias + noise(3)),  // 중족골 중앙
    Math.round(62 + fore * 640 / sideBias + noise(4)),  // 중족골 외측
    Math.round(50 + mid * 420 * sideBias + noise(5)),   // 아치 내측
    Math.round(48 + mid * 380 / sideBias + noise(6)),   // 아치 외측
    Math.round(45 + heel * 700 * sideBias + noise(7)),  // 뒤꿈치 내측
    Math.round(45 + heel * 640 / sideBias + noise(8))   // 뒤꿈치 외측
  ].map((v) => clamp(v, 0, 1023));
}

function fsrToForce(raw, baseline = 48, maxRaw = 1023) {
  const n = clamp((raw - baseline) / Math.max(1, maxRaw - baseline), 0, 1);
  return 42 * Math.pow(n, 1.68);
}

function enrichFoot(side, raw) {
  return SENSOR_LAYOUT[side].map((sensor, index) => ({
    ...sensor,
    raw: raw[index] ?? 0,
    force: fsrToForce(raw[index] ?? 0)
  }));
}

function computeCOP(sensors) {
  const total = sensors.reduce((sum, s) => sum + s.force, 0);
  if (total <= 0.2) return { x: 0, y: 0, totalForce: total, active: false };

  return {
    x: sensors.reduce((sum, s) => sum + s.force * s.x, 0) / total,
    y: sensors.reduce((sum, s) => sum + s.force * s.y, 0) / total,
    totalForce: total,
    active: true
  };
}

function zoneForces(sensors) {
  return sensors.reduce((acc, sensor) => {
    acc[sensor.zone] = (acc[sensor.zone] || 0) + sensor.force;
    return acc;
  }, { forefoot: 0, midfoot: 0, heel: 0 });
}

function classifyStrike(zones) {
  if (zones.heel >= zones.midfoot && zones.heel >= zones.forefoot) return "heel";
  if (zones.forefoot >= zones.midfoot && zones.forefoot >= zones.heel) return "fore";
  return "mid";
}

function detectStep(side, force, now, zones) {
  const state = footState[side];
  const contactThreshold = 8.5;
  const releaseThreshold = 4.5;

  if (!state.contact && force > contactThreshold) {
    state.contact = true;
    state.contactAt = now;
    stepCount += 1;
    cadenceWindow.push(now);
    els.eventLabel.textContent = `${side} contact`;
    els.strike.textContent = classifyStrike(zones);
  } else if (state.contact && force < releaseThreshold) {
    state.contact = false;
    state.lastGct = now - state.contactAt;
    els.eventLabel.textContent = `${side} toe off`;
  }
}

function processFrame(frame) {
  const leftSensors = enrichFoot("left", frame.left.raw);
  const rightSensors = enrichFoot("right", frame.right.raw);
  const leftCOP = computeCOP(leftSensors);
  const rightCOP = computeCOP(rightSensors);
  const leftZones = zoneForces(leftSensors);
  const rightZones = zoneForces(rightSensors);
  const totalForce = leftCOP.totalForce + rightCOP.totalForce;
  const now = frame.timestamp;

  detectStep("left", leftCOP.totalForce, now, leftZones);
  detectStep("right", rightCOP.totalForce, now, rightZones);
  cadenceWindow = cadenceWindow.filter((t) => now - t < 30000);

  const cadence = Math.round(cadenceWindow.length * 2);
  const leftPercent = totalForce ? leftCOP.totalForce / totalForce * 100 : 50;
  const frontForce = leftZones.forefoot + rightZones.forefoot + leftZones.midfoot * 0.35 + rightZones.midfoot * 0.35;
  const backForce = leftZones.heel + rightZones.heel + leftZones.midfoot * 0.15 + rightZones.midfoot * 0.15;
  const frontPercent = frontForce + backForce ? frontForce / (frontForce + backForce) * 100 : 50;
  const gct = Math.round((footState.left.lastGct + footState.right.lastGct) / 2);

  const cog = computeGlobalCOG(leftCOP, rightCOP);
  const model = {
    frame,
    leftSensors,
    rightSensors,
    leftCOP,
    rightCOP,
    cog,
    leftPercent,
    frontPercent,
    totalForce,
    cadence,
    gct
  };

  timeline.push({
    t: now,
    left: leftCOP.totalForce,
    right: rightCOP.totalForce,
    balance: leftPercent
  });
  timeline = timeline.slice(-180);
  lastFrame = model;
  render(model);
}

function computeGlobalCOG(leftCOP, rightCOP) {
  const total = leftCOP.totalForce + rightCOP.totalForce;
  if (total <= 0.2) return { x: 0, y: 0, active: false };
  return {
    x: ((leftCOP.x - 0.72) * leftCOP.totalForce + (rightCOP.x + 0.72) * rightCOP.totalForce) / total,
    y: (leftCOP.y * leftCOP.totalForce + rightCOP.y * rightCOP.totalForce) / total,
    active: true
  };
}

function render(model) {
  drawFoot(ctx.left, "left", model.leftSensors, model.leftCOP);
  drawFoot(ctx.right, "right", model.rightSensors, model.rightCOP);
  drawBalance(model);
  drawTimeline();
  updateText(model);
}

function drawFoot(context, side, sensors, cop) {
  const w = context.canvas.width;
  const h = context.canvas.height;
  context.clearRect(0, 0, w, h);
  context.save();

  context.fillStyle = getCss("--surface-2");
  context.fillRect(0, 0, w, h);
  context.translate(w / 2, h / 2);
  context.scale(side === "left" ? 1 : -1, 1);

  context.beginPath();
  context.moveTo(-72, -238);
  context.bezierCurveTo(-130, -210, -146, -98, -108, 18);
  context.bezierCurveTo(-86, 86, -64, 188, -18, 236);
  context.bezierCurveTo(42, 210, 70, 116, 88, 28);
  context.bezierCurveTo(118, -122, 76, -226, -8, -248);
  context.closePath();
  context.fillStyle = getCss("--bg");
  context.fill();
  context.strokeStyle = getCss("--line");
  context.lineWidth = 3;
  context.stroke();

  for (const sensor of sensors) {
    const p = sensorToCanvas(sensor.x, sensor.y);
    const radius = 30 + sensor.force * 1.5;
    const heat = context.createRadialGradient(p.x, p.y, 4, p.x, p.y, radius);
    heat.addColorStop(0, heatColor(sensor.force, 0.9));
    heat.addColorStop(0.55, heatColor(sensor.force, 0.42));
    heat.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = heat;
    context.beginPath();
    context.arc(p.x, p.y, radius, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.arc(p.x, p.y, 9, 0, Math.PI * 2);
    context.fillStyle = getCss("--surface");
    context.fill();
    context.strokeStyle = heatColor(sensor.force, 1);
    context.lineWidth = 3;
    context.stroke();
  }

  if (cop.active) {
    const p = sensorToCanvas(cop.x, cop.y);
    context.beginPath();
    context.arc(p.x, p.y, 17, 0, Math.PI * 2);
    context.fillStyle = getCss("--accent");
    context.fill();
    context.strokeStyle = "#ffffff";
    context.lineWidth = 3;
    context.stroke();
  }

  context.restore();
}

function sensorToCanvas(x, y) {
  return { x: x * 145, y: -y * 260 };
}

function heatColor(force, alpha) {
  const t = clamp(force / 35, 0, 1);
  if (t < 0.45) return `rgba(73, 163, 255, ${alpha})`;
  if (t < 0.75) return `rgba(73, 211, 155, ${alpha})`;
  if (t < 0.9) return `rgba(255, 191, 75, ${alpha})`;
  return `rgba(255, 92, 98, ${alpha})`;
}

function drawBalance(model) {
  const context = ctx.balance;
  const w = context.canvas.width;
  const h = context.canvas.height;
  context.clearRect(0, 0, w, h);
  context.fillStyle = getCss("--surface-2");
  context.fillRect(0, 0, w, h);

  const origin = { x: w / 2, y: h / 2 };
  context.strokeStyle = getCss("--line");
  context.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    context.beginPath();
    context.moveTo(origin.x + i * 48, 36);
    context.lineTo(origin.x + i * 48, h - 36);
    context.stroke();
    context.beginPath();
    context.moveTo(42, origin.y + i * 42);
    context.lineTo(w - 42, origin.y + i * 42);
    context.stroke();
  }

  context.strokeStyle = getCss("--muted");
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(origin.x, 30);
  context.lineTo(origin.x, h - 30);
  context.moveTo(36, origin.y);
  context.lineTo(w - 36, origin.y);
  context.stroke();

  const x = origin.x + clamp(model.cog.x, -1.1, 1.1) * 165;
  const y = origin.y - clamp(model.cog.y, -1, 1) * 118;
  context.beginPath();
  context.arc(x, y, 24, 0, Math.PI * 2);
  context.fillStyle = getCss("--accent");
  context.fill();
  context.strokeStyle = "#fff";
  context.lineWidth = 4;
  context.stroke();

  context.fillStyle = getCss("--text");
  context.font = "600 14px system-ui";
  context.fillText("COG", x + 30, y + 5);
}

function drawTimeline() {
  const context = ctx.timeline;
  const w = context.canvas.width;
  const h = context.canvas.height;
  context.clearRect(0, 0, w, h);
  context.fillStyle = getCss("--surface-2");
  context.fillRect(0, 0, w, h);
  drawSeries(context, timeline.map((p) => p.left), "#49d39b", 80);
  drawSeries(context, timeline.map((p) => p.right), "#4ba3ff", 80);
  drawSeries(context, timeline.map((p) => p.balance), "#ffbf4b", 100);
}

function drawSeries(context, values, color, max) {
  if (values.length < 2) return;
  const w = context.canvas.width;
  const h = context.canvas.height;
  context.beginPath();
  values.forEach((value, index) => {
    const x = index / (values.length - 1) * (w - 34) + 17;
    const y = h - 24 - clamp(value / max, 0, 1) * (h - 52);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.strokeStyle = color;
  context.lineWidth = 4;
  context.stroke();
}

function updateText(model) {
  const rightPercent = 100 - model.leftPercent;
  const backPercent = 100 - model.frontPercent;
  els.stepCount.textContent = String(stepCount);
  els.cadence.textContent = String(model.cadence);
  els.gct.textContent = String(model.gct);
  els.frameTime.textContent = `${model.frame.timestamp} ms`;
  els.totalForce.textContent = `${model.totalForce.toFixed(1)} kgf`;
  els.lrBar.style.width = `${model.leftPercent.toFixed(1)}%`;
  els.fbBar.style.width = `${model.frontPercent.toFixed(1)}%`;
  els.lrText.textContent = `${model.leftPercent.toFixed(0)} / ${rightPercent.toFixed(0)}`;
  els.fbText.textContent = `${model.frontPercent.toFixed(0)} / ${backPercent.toFixed(0)}`;
  els.payloadView.textContent = JSON.stringify(model.frame, null, 2);
}

function getCss(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function animate(now) {
  if (running && source === "demo") processFrame(makeDemoFrame(now));
  requestAnimationFrame(animate);
}

function setSource(next) {
  source = next;
  els.segments.forEach((button) => button.classList.toggle("active", button.dataset.source === source));
  els.connectionLabel.textContent = source === "demo" ? "Demo stream · 8ch × 2" : source === "socket" ? "Socket ready" : "BLE ready";
}

function connectSocket() {
  if (socket) {
    socket.close();
    socket = null;
    els.connectBtn.textContent = "Connect";
    return;
  }
  socket = new WebSocket(els.socketUrl.value);
  socket.addEventListener("open", () => {
    els.connectionLabel.textContent = "Socket connected";
    els.connectBtn.textContent = "Disconnect";
  });
  socket.addEventListener("message", (event) => {
    try {
      processFrame(JSON.parse(event.data));
    } catch {
      els.eventLabel.textContent = "Invalid frame";
    }
  });
  socket.addEventListener("close", () => {
    els.connectionLabel.textContent = "Socket closed";
    els.connectBtn.textContent = "Connect";
    socket = null;
  });
}

async function connectBle() {
  if (!navigator.bluetooth) {
    els.eventLabel.textContent = "BLE unavailable";
    return;
  }
  const serviceUuids = [
    "058d0001-ca72-4c8b-8084-25e049936b31",
    "068d0001-ca72-4c8b-8084-25e049936b31",
    "3e770001-da2d-409c-bde3-dc0bb6adce27"
  ];
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: serviceUuids
    });
    els.connectionLabel.textContent = device.name || "BLE selected";
    els.eventLabel.textContent = "BLE parser pending";
  } catch {
    els.eventLabel.textContent = "BLE canceled";
  }
}

els.playBtn.addEventListener("click", () => {
  running = !running;
  els.playBtn.textContent = running ? "Pause" : "Play";
});

els.themeBtn.addEventListener("click", () => {
  document.documentElement.classList.toggle("light");
  if (lastFrame) render(lastFrame);
  if (!els.reportView.hidden) renderReport();
});

els.copyBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(els.payloadView.textContent);
  els.eventLabel.textContent = "Payload copied";
});

els.connectBtn.addEventListener("click", () => {
  if (source === "socket") connectSocket();
  if (source === "ble") connectBle();
});

els.segments.forEach((button) => {
  button.addEventListener("click", () => setSource(button.dataset.source));
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstall = event;
});

els.installBtn.addEventListener("click", async () => {
  if (!deferredInstall) {
    els.eventLabel.textContent = /iphone|ipad|ipod/i.test(navigator.userAgent) ? "Share → Home Screen" : "Browser install";
    return;
  }
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

// ================= 케어 리포트 (가상 데이터) =================
function populateSeniorSelect() {
  els.seniorSelect.innerHTML = MOCK_SENIORS
    .map((s) => `<option value="${s.id}">${s.name} · ${s.age}세 · ${s.center}</option>`)
    .join("");
}

function getSelectedSenior() {
  return MOCK_SENIORS.find((s) => s.id === els.seniorSelect.value) || MOCK_SENIORS[0];
}

function renderReport() {
  const senior = getSelectedSenior();
  els.riskBadge.textContent = `${RISK_LABEL[senior.riskLevel]} · ${senior.riskScore}점`;
  els.riskBadge.className = `risk-badge ${senior.riskLevel}`;
  els.repRisk.textContent = String(senior.riskScore);
  els.repCadence.textContent = String(senior.avgCadence);
  els.repAsym.textContent = senior.gaitAsymmetry.toFixed(1);
  els.repSync.textContent = senior.lastSync;

  els.alertCount.textContent = `${senior.alerts.length}건`;
  els.alertList.innerHTML = senior.alerts.length
    ? senior.alerts.map((a) => `
        <li class="${a.severity}">
          <div class="alert-meta"><span>${a.type}</span><span>${a.time}</span></div>
          <div>${a.message}</div>
        </li>`).join("")
    : `<li class="empty">최근 알림이 없습니다.</li>`;

  drawTrend(senior);
  renderSeniorTable();
}

function drawTrend(senior) {
  const context = ctx.trend;
  const w = context.canvas.width;
  const h = context.canvas.height;
  context.clearRect(0, 0, w, h);
  context.fillStyle = getCss("--surface-2");
  context.fillRect(0, 0, w, h);

  const days = ["월", "화", "수", "목", "금", "토", "일"];
  const maxSteps = Math.max(...senior.weeklySteps, 1);
  const padX = 40;
  const padY = 30;
  const plotW = w - padX * 2;
  const plotH = h - padY * 2;
  const barW = plotW / senior.weeklySteps.length * 0.5;

  // 걸음수 막대
  senior.weeklySteps.forEach((steps, i) => {
    const cx = padX + (i + 0.5) * (plotW / senior.weeklySteps.length);
    const barH = (steps / maxSteps) * plotH;
    context.fillStyle = getCss("--accent-2");
    context.globalAlpha = 0.55;
    context.fillRect(cx - barW / 2, h - padY - barH, barW, barH);
    context.globalAlpha = 1;
    context.fillStyle = getCss("--muted");
    context.font = "12px system-ui";
    context.textAlign = "center";
    context.fillText(days[i], cx, h - 8);
  });

  // 낙상위험 추이 라인
  context.beginPath();
  senior.weeklyRisk.forEach((risk, i) => {
    const cx = padX + (i + 0.5) * (plotW / senior.weeklyRisk.length);
    const cy = h - padY - (risk / 100) * plotH;
    if (i === 0) context.moveTo(cx, cy);
    else context.lineTo(cx, cy);
  });
  context.strokeStyle = getCss("--hot");
  context.lineWidth = 3;
  context.stroke();

  senior.weeklyRisk.forEach((risk, i) => {
    const cx = padX + (i + 0.5) * (plotW / senior.weeklyRisk.length);
    const cy = h - padY - (risk / 100) * plotH;
    context.beginPath();
    context.arc(cx, cy, 4, 0, Math.PI * 2);
    context.fillStyle = getCss("--hot");
    context.fill();
  });

  context.textAlign = "left";
  context.fillStyle = getCss("--accent-2");
  context.fillText("■ 걸음수", padX, 16);
  context.fillStyle = getCss("--hot");
  context.fillText("● 낙상위험점수", padX + 80, 16);
}

function renderSeniorTable() {
  els.seniorTableBody.innerHTML = MOCK_SENIORS.map((s) => `
    <tr>
      <td>${s.name}</td>
      <td>${s.age}</td>
      <td>${s.center}</td>
      <td><span class="risk-dot ${s.riskLevel}">${RISK_LABEL[s.riskLevel]} (${s.riskScore})</span></td>
      <td>${s.weeklySteps[s.weeklySteps.length - 1].toLocaleString()}</td>
      <td>${s.lastSync}</td>
    </tr>`).join("");
}

els.seniorSelect.addEventListener("change", renderReport);

els.viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    els.viewTabs.forEach((t) => t.classList.toggle("active", t === tab));
    const isLive = tab.dataset.view === "live";
    els.liveView.hidden = !isLive;
    els.reportView.hidden = isLive;
    if (!isLive) renderReport();
  });
});

populateSeniorSelect();
requestAnimationFrame(animate);
