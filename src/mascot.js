function mountFairyPet(ctx) {
  for (const stale of document.querySelectorAll("#dsh-fairy-pet")) stale.remove();
  const pet = document.createElement("div");
  pet.id = "dsh-fairy-pet";
  pet.setAttribute("data-dsh-fairy-mascot-root", "true");
  pet.setAttribute("data-state", "normal");
  pet.innerHTML = '<div class="dsh-fairy-float">' + MASCOT_PULSE + MASCOT_HALO + MASCOT_SVG + "</div>";
  document.body.appendChild(pet);

  let disposed = false;
  const timers = new Set();
  const later = (fn, ms) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (!disposed) fn();
    }, ms);
    timers.add(timer);
    return timer;
  };

  // ---- 挂件位置：吸附在左侧栏「新会话」按钮上方 ----
  const SIZE = 140;
  let observedColumn = null;
  let resizeObserver = null;
  const place = () => {
    const column = document.querySelector(".BynINW_sidebarCol");
    if (!column) {
      pet.removeAttribute("data-visible");
      return;
    }
    if (resizeObserver && column !== observedColumn) {
      try { resizeObserver.disconnect(); } catch (error) {}
      resizeObserver.observe(column);
      observedColumn = column;
    }
    const rect = column.getBoundingClientRect();
    let top;
    const anchor = document.querySelector("._2H3hWW_newSession");
    if (anchor) {
      const anchorRect = anchor.getBoundingClientRect();
      // 在「标题区底部」与「新会话按钮顶部」之间垂直居中，让眼睛上下空隙相等
      const titleRow = document.querySelector("._2H3hWW_logoRow");
      const upper = titleRow ? titleRow.getBoundingClientRect().bottom : rect.top + 8;
      const lower = anchorRect.top;
      const center = (upper + lower) / 2;
      // 主体圆盘在元素内居中，但眼周光晕/投影略偏下，整体上移让视觉上下空隙相等
      top = center - SIZE / 2 - 6;
    } else {
      top = rect.bottom - 76 - SIZE;
    }
    top = Math.max(rect.top + 8, top);
    pet.style.left = Math.round(rect.left + rect.width / 2 - SIZE / 2) + "px";
    pet.style.top = Math.round(top) + "px";
    if (rect.width > 150 && rect.height > 240) pet.setAttribute("data-visible", "");
    else pet.removeAttribute("data-visible");
  };
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(place);
    const column = document.querySelector(".BynINW_sidebarCol");
    if (column) {
      resizeObserver.observe(column);
      observedColumn = column;
    }
  }
  window.addEventListener("resize", place);
  place();
  const geometryTimer = setInterval(place, 1500);

  // ---- 状态语义：normal / thinking / comforting ----
  const COMFORT_CUES = [
    /求安慰|安慰我|哄哄我|温柔一点|对我温柔|许愿精灵/,
    /难受|难过|伤心|委屈|孤独|寂寞|害怕|恐慌|焦虑|崩溃|绝望|失望|痛苦|心累|好累|疲惫|精疲力竭|压力好大|撑不住|受不了了|想哭|哭了|睡不着|不想活|想关闭自己|想把自己关机|想消失|被否定|否定我|被拒绝|被抛下/,
    /我不好|我很糟|我好糟|我被.*伤害|没人理解我|没有人理解我/,
    /\b(?:sad|upset|lonely|scared|afraid|anxious|panic(?:ked)?|depressed|overwhelmed|stressed|hurt|crying|cry|comfort me|be gentle)\b/i
  ];
  const COMFORT_SUPPRESS_CUES = [
    /(?:不用|不要|别|无需|不必).{0,8}(?:安慰|哄|温柔对待)/,
    /(?:只要|请).{0,8}(?:分析|方案|结论|下一步).{0,8}(?:不用|不要|别).{0,8}(?:安慰|哄)/,
    /\b(?:don't|do not|no need to)\s+(?:comfort|coddle|reassure)\b/i
  ];
  const COMFORT_EXIT_CUES = [
    /我好多了|好多了|没事了|没关系了|已经好了|不用安慰了|不需要安慰了|可以了|结束这个话题|换个话题|说点别的|回到正题|继续工作|切换会话|切换页面|打开新会话|新建会话/,
    /\b(?:i(?:'m| am) better|feel better|all good|no worries|never mind|change the subject|let's move on|back to work)\b/i,
    /帮我(?:写|改|查|解释|翻译|总结|实现)|我们聊聊代码|开始工作|下一个问题|换个问题|打开设置|怎么实现/,
    /\b(?:help me write|debug|explain|translate|summarize|next question|change topics?|let's work on|how do I implement)\b/i
  ];

  const normalize = (text) => String(text || "").replace(/\s+/g, " ").trim();
  const hasCue = (text, cues) => cues.some((cue) => cue.test(text));
  const valueText = (value) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join(" ");
    if (!value || typeof value !== "object") return "";
    return [value.text, value.content, value.value, value.message].map(valueText).filter(Boolean).join(" ");
  };
  const nodeText = (node) => {
    const blocks = Array.isArray(node?.data?.blocks) ? node.data.blocks : [];
    return blocks
      .map(valueText)
      .concat(valueText(node?.data?.text), valueText(node?.data?.content), valueText(node?.data?.message), valueText(node?.data?.input))
      .join(" ");
  };
  const deriveComfort = (snapshot) => {
    const order = Array.from(snapshot?.chat?.order || []);
    const nodes = snapshot?.chat?.nodes;
    for (let index = order.length - 1; index >= 0; index -= 1) {
      const key = order[index];
      const node = nodes && (typeof nodes.get === "function" ? nodes.get(key) : nodes[key]);
      if (!node) continue;
      if (!(node.kind === "user" || (node.data && node.data.role === "user"))) continue;
      const text = normalize(nodeText(node));
      if (!text) continue;
      if (hasCue(text, COMFORT_SUPPRESS_CUES)) return false;
      if (hasCue(text, COMFORT_CUES)) return true;
      if (hasCue(text, COMFORT_EXIT_CUES)) return false;
    }
    return false;
  };

  // ---- 会话状态来源：ctx.get('sessions') 的只读快照 ----
  let sessions = null;
  const sessionService = () => {
    if (sessions) return sessions;
    try {
      const candidate = typeof ctx.get === "function" ? ctx.get("sessions") : null;
      if (candidate && candidate.list) sessions = candidate;
    } catch (error) {}
    return sessions;
  };
  const listSnapshot = () => {
    try {
      const service = sessionService();
      return service ? service.list.getSnapshot() : null;
    } catch (error) {
      return null;
    }
  };
  const entryOf = (snapshot, id) => {
    const byId = snapshot && snapshot.byId;
    if (!byId) return null;
    return typeof byId.get === "function" ? byId.get(id) : byId[id] || null;
  };
  const updatedAtOf = (entry) => {
    const value = entry && entry.updatedAt;
    if (typeof value === "number") return value;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const pickActiveId = (snapshot) => {
    const ids = (snapshot && snapshot.ids) || [];
    let bestId = null;
    let bestAt = -Infinity;
    for (const id of ids) {
      const entry = entryOf(snapshot, id);
      if (!entry) continue;
      if (entry.running) return id;
      const at = updatedAtOf(entry);
      if (at > bestAt) {
        bestAt = at;
        bestId = id;
      }
    }
    return bestId || (ids[0] || null);
  };

  let boundId = null;
  let boundSession = null;
  let sessionOff = null;
  let state = "normal";
  let glitchTimer = 0;

  const setState = (next) => {
    if (typeof FAIRY_FORCED_STATE === "string" && FAIRY_FORCED_STATE) next = FAIRY_FORCED_STATE;
    if (next === state) return;
    state = next;
    pet.setAttribute("data-state", next);
    pet.setAttribute("data-transition-glitch", "");
    clearTimeout(glitchTimer);
    glitchTimer = later(() => {
      pet.removeAttribute("data-transition-glitch");
    }, 280);
  };

  const bind = (snapshot) => {
    const id = pickActiveId(snapshot);
    if (id === boundId) return;
    try { if (sessionOff) sessionOff(); } catch (error) {}
    sessionOff = null;
    boundId = id;
    boundSession = null;
    if (!id) return;
    try {
      const service = sessionService();
      if (!service) return;
      boundSession = (service.binding(id) || {}).session || null;
      if (boundSession && typeof boundSession.subscribe === "function") {
        sessionOff = boundSession.subscribe(update);
      }
    } catch (error) {
      boundSession = null;
    }
  };

  const update = () => {
    if (disposed) return;
    const snapshot = listSnapshot();
    if (!snapshot) return;
    bind(snapshot);
    let running = false;
    let sessionSnapshot = null;
    try {
      sessionSnapshot = boundSession && typeof boundSession.getSnapshot === "function" ? boundSession.getSnapshot() : null;
    } catch (error) {}
    if (sessionSnapshot) running = sessionSnapshot.running === true;
    if (!running) {
      for (const id of snapshot.ids || []) {
        const entry = entryOf(snapshot, id);
        if (entry && entry.running) {
          running = true;
          break;
        }
      }
    }
    const comfort = sessionSnapshot ? deriveComfort(sessionSnapshot) : false;
    setState(comfort ? "comforting" : running ? "thinking" : "normal");
  };

  let listOff = null;
  let started = false;
  const start = () => {
    if (started) return true;
    const service = sessionService();
    if (!service) return false;
    try {
      listOff = service.list.subscribe(update);
    } catch (error) {}
    started = true;
    update();
    return true;
  };
  if (!start()) {
    const bootTimer = setInterval(() => {
      if (disposed) {
        clearInterval(bootTimer);
        return;
      }
      if (start()) clearInterval(bootTimer);
    }, 400);
    timers.add(bootTimer);
  }

  // ---- 省电与可见性 ----
  const onVisibility = () => {
    if (document.hidden) {
      pet.setAttribute("data-visual-suspended", "");
    } else {
      pet.removeAttribute("data-visual-suspended");
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  onVisibility();
  try {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => {
      if (motion.matches) pet.setAttribute("data-low-power", "");
      else pet.removeAttribute("data-low-power");
    };
    syncMotion();
    if (typeof motion.addEventListener === "function") motion.addEventListener("change", syncMotion);
  } catch (error) {}

  // 两组抖动交替：横向切片位移（blocks）+ 细抖动（data-dsh-jitter：位移/斜切 + 轻微 blur）。
  // 都不加亮度/对比、不用位移贴图，保留“抖动”观感又不会把眼睛的白色区域撕成白片。
  const signalEl = pet.querySelector(".dsh-fairy-signal");
  const blockRects = Array.from(pet.querySelectorAll('[id^="dsh-fairy-slice-"] rect'));
  let faultTimer = 0;
  const rand = (min, max) => min + Math.random() * (max - min);
  const faultAllowed = () => !disposed && !pet.hasAttribute("data-low-power") && !document.hidden;
  const setBlockLayout = () => {
    if (!blockRects.length || !signalEl) return;
    const weights = [];
    let total = 0;
    for (let index = 0; index < 5; index += 1) {
      const weight = rand(0.9, 1.1);
      weights.push(weight);
      total += weight;
    }
    let y = 12;
    for (let index = 0; index < 5; index += 1) {
      const rect = blockRects[index];
      if (!rect) continue;
      const height = index === 4 ? 148 - y : (136 * weights[index]) / total;
      rect.setAttribute("y", y.toFixed(1));
      rect.setAttribute("height", height.toFixed(1));
      y += height;
    }
  };
  const slicePulse = () => {
    if (!signalEl) return;
    setBlockLayout();
    const polarity = Math.random() < 0.5 ? -1 : 1;
    const strength = rand(1.5, 3);
    for (let index = 1; index <= 5; index += 1) {
      const direction = index % 2 === 0 ? polarity : -polarity;
      const offset = direction * (strength + rand(-0.35, 0.35));
      signalEl.style.setProperty("--dsh-g-s" + index + "-x", offset.toFixed(2) + "px");
    }
    signalEl.setAttribute("data-glitch", "blocks");
  };
  const faultClear = () => {
    if (!signalEl) return;
    signalEl.removeAttribute("data-glitch");
    signalEl.removeAttribute("data-dsh-jitter");
    for (let index = 1; index <= 5; index += 1) signalEl.style.removeProperty("--dsh-g-s" + index + "-x");
  };
  const faultSchedule = (delay) => {
    clearTimeout(faultTimer);
    faultTimer = setTimeout(faultRun, delay);
  };
  let faultMode = Math.random() < 0.5 ? "blocks" : "threads";
  const threadsPulse = () => {
    if (!signalEl) return;
    const noise = pet.querySelector("#dsh-fairy-noise");
    const displace = pet.querySelector("#dsh-fairy-displace");
    if (noise) {
      noise.setAttribute("seed", String(Math.floor(rand(1, 999))));
      noise.setAttribute("baseFrequency", rand(0.004, 0.011).toFixed(3) + " " + rand(0.65, 1).toFixed(2));
    }
    if (displace) displace.setAttribute("scale", rand(14, 24).toFixed(1));
    signalEl.setAttribute("data-glitch", "threads");
    faultTimer = setTimeout(() => {
      faultClear();
      faultSchedule(rand(2300, 4800));
    }, rand(140, 240));
  };
  const blocksPulse = () => {
    let pulses = 2 + Math.floor(Math.random() * 2);
    const step = () => {
      if (!faultAllowed()) { faultClear(); faultSchedule(3000); return; }
      slicePulse();
      pulses -= 1;
      if (pulses > 0) faultTimer = setTimeout(step, rand(55, 75));
      else {
        faultTimer = setTimeout(() => {
          faultClear();
          faultSchedule(rand(2300, 4800));
        }, rand(70, 110));
      }
    };
    step();
  };
  const faultRun = () => {
    if (!faultAllowed()) { faultSchedule(3000); return; }
    const mode = faultMode;
    faultMode = mode === "blocks" ? "threads" : "blocks";
    if (mode === "blocks") blocksPulse();
    else threadsPulse();
  };
  if (signalEl) faultSchedule(rand(1600, 3000));

  return () => {
    disposed = true;
    clearInterval(geometryTimer);
    clearTimeout(glitchTimer);
    clearTimeout(faultTimer);
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    try { if (listOff) listOff(); } catch (error) {}
    try { if (sessionOff) sessionOff(); } catch (error) {}
    try { if (resizeObserver) resizeObserver.disconnect(); } catch (error) {}
    window.removeEventListener("resize", place);
    document.removeEventListener("visibilitychange", onVisibility);
    pet.remove();
  };
}


function mountSphere(ctx) {
  let disposed = false;
  let observer = null;
  let observed = null;
  const place = () => {
    if (disposed) return;
    const column = document.querySelector(".BynINW_centerCol");
    if (!column) return;
    if (observer && column !== observed) {
      try { observer.disconnect(); } catch (error) {}
      observer.observe(column);
      observed = column;
    }
    const rect = column.getBoundingClientRect();
    const width = Math.max(0, rect.width);
    const height = Math.max(0, rect.height);
    if (width <= 0 || height <= 0) return;
    // 1/4 球冠：弦宽 = 容器宽度，冠高 = 宽度的 1/4；球图顶边放在底边上方冠高处，弦线恰好落在底边
    const capHeight = width * 0.25;
    const radius = (capHeight * capHeight + (width / 2) * (width / 2)) / (2 * capHeight);
    // 球体上方空白区中央放 H.D.D. 水印
    const blank = Math.max(120, height - capHeight);
    const markWidth = Math.max(180, Math.min(width * 0.52, blank * 2.6, 860));
    const markHeight = markWidth / 3.15;
    const markTop = blank / 2 - markHeight / 2;
    // 变量挂在 <html> 上，避免 React 重渲染 centerCol 时清空 inline style
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--dsh-sphere-size", Math.round(radius * 2) + "px");
    rootStyle.setProperty("--dsh-sphere-left", Math.round(rect.left) + "px");
    rootStyle.setProperty("--dsh-sphere-width", Math.round(width) + "px");
    rootStyle.setProperty("--dsh-sphere-height", Math.round(height) + "px");
    rootStyle.setProperty("--dsh-sphere-top", Math.round(rect.top) + "px");
    rootStyle.setProperty("--dsh-ball-top", Math.round(height - capHeight) + "px");
    rootStyle.setProperty("--dsh-mark-width", Math.round(markWidth) + "px");
    rootStyle.setProperty("--dsh-mark-top", Math.round(markTop) + "px");
  };
  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(place);
    const column = document.querySelector(".BynINW_centerCol");
    if (column) {
      observer.observe(column);
      observed = column;
    }
  }
  const timer = setInterval(place, 1500);
  window.addEventListener("resize", place);
  place();
  return () => {
    disposed = true;
    clearInterval(timer);
    window.removeEventListener("resize", place);
    try { if (observer) observer.disconnect(); } catch (error) {}
    const rootStyle = document.documentElement.style;
    rootStyle.removeProperty("--dsh-sphere-size");
    rootStyle.removeProperty("--dsh-sphere-left");
    rootStyle.removeProperty("--dsh-sphere-width");
    rootStyle.removeProperty("--dsh-sphere-height");
    rootStyle.removeProperty("--dsh-sphere-top");
    rootStyle.removeProperty("--dsh-ball-top");
    rootStyle.removeProperty("--dsh-mark-width");
    rootStyle.removeProperty("--dsh-mark-top");
    for (const stale of document.querySelectorAll("#dsh-sphere-overlay")) stale.remove();
  };
}

function mountBootVideo(ctx) {
  for (const stale of document.querySelectorAll("#dsh-boot-video")) stale.remove();
  const video = document.createElement("video");
  video.id = "dsh-boot-video";
  video.src = "http://127.0.0.1:18766/boot.mp4";
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;" +
    "z-index:30;pointer-events:none;background:#04070d;opacity:1;transition:opacity .9s ease;";

  let disposed = false;
  let mounted = false;
  let finished = false;
  let retry = 0;
  let errorRetries = 0;
  const finish = () => {
    if (disposed || finished) return;
    finished = true;
    video.style.opacity = "0";
    setTimeout(() => {
      if (video.parentNode) video.remove();
    }, 1000);
  };
  video.addEventListener("ended", finish);
  video.addEventListener("error", () => {
    if (disposed || finished) return;
    // 服务可能比页面晚启动：短暂重试几次，仍失败才隐藏
    if (errorRetries < 6) {
      errorRetries += 1;
      setTimeout(() => {
        if (disposed || finished) return;
        try { video.load(); } catch (error) {}
        try {
          const play = video.play();
          if (play && typeof play.catch === "function") play.catch(() => {});
        } catch (error) {}
      }, 1200);
      return;
    }
    finish();
  });

  const mount = () => {
    if (disposed || mounted) return;
    const column = document.querySelector(".BynINW_centerCol");
    if (!column) {
      retry += 1;
      if (retry < 40) setTimeout(mount, 400);
      return;
    }
    column.appendChild(video);
    mounted = true;
    try {
      const play = video.play();
      if (play && typeof play.catch === "function") play.catch(() => {});
    } catch (error) {}
  };
  mount();

  // React 重渲染可能把视频节点删掉：播放结束前定期检查并重新挂回/续播
  const guardian = setInterval(() => {
    if (disposed || finished) return;
    const host = document.querySelector(".BynINW_centerCol");
    if (!host) return;
    if (video.parentNode !== host) {
      try { host.appendChild(video); } catch (error) {}
      try { video.play(); } catch (error) {}
    }
  }, 800);

  return () => {
    disposed = true;
    clearInterval(guardian);
    try { video.pause(); } catch (error) {}
    if (video.parentNode) video.remove();
  };
}



