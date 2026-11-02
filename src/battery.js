function mountBattery(ctx) {
  const IMG = "__BATTERY_IMG__";
  const USAGE_URL = "https://platform.deepseek.com/usage";
  const styleId = "dsh-battery-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
#dsh-battery-btn {
  position: fixed;
  z-index: 70;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0 !important;
  background: none !important;
  box-shadow: none !important;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
#dsh-battery-btn:hover { filter: brightness(1.15); }
#dsh-battery-btn img { width: 24px; height: 24px; display: block; }
#dsh-battery-panel {
  position: fixed;
  z-index: 71;
  min-width: 168px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(120, 160, 220, 0.35));
  background: var(--dsw-specific-menu, rgba(21, 35, 59, 0.94));
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(10px));
  box-shadow: var(--dsw-elevation-panel, 0 8px 24px rgba(0, 0, 0, 0.4));
  color: var(--dsw-alias-label-primary, #e8f1ff);
  font-size: 12px;
  line-height: 1.7;
  display: none;
  pointer-events: none;
}
.dsh-battery-row { display: flex; justify-content: space-between; gap: 18px; }
.dsh-battery-row span { color: var(--dsw-alias-label-tertiary, #8aa0c0); }
.dsh-battery-row b { font-weight: 600; color: var(--dsw-alias-state-business-primary, #4d8dff); }
.dsh-battery-hint { margin-top: 6px; font-size: 11px; color: var(--dsw-alias-label-tertiary, #8aa0c0); }
/* 个人信息区域：参照侧栏“新会话”按钮的边框/背景/模糊/阴影 */
.wtg9ga_footArea {
  background: rgba(255, 255, 255, 0.07) !important;
  border: 0.5px solid rgba(150, 195, 255, 0.30) !important;
  border-radius: var(--dsw-radius-md, 8px) !important;
  backdrop-filter: blur(10px) saturate(150%);
  -webkit-backdrop-filter: blur(10px) saturate(150%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.10),
    0 8px 20px rgba(0, 0, 0, 0.28) !important;
  margin: 0 0 6px !important;
  padding: 0 40px 0 8px !important;
  box-sizing: border-box;
}
.wtg9ga_footArea:hover {
  background: rgba(110, 165, 255, 0.20) !important;
  border-color: rgba(160, 200, 255, 0.48) !important;
}
/* 内部按钮不再单独高亮，悬浮整块个人信息区域时统一表现为“新会话按钮”的 hover */
.wtg9ga_footArea > *,
.wtg9ga_footArea button {
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}
.wtg9ga_footArea > *,
.wtg9ga_footArea > * > * {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  min-height: 0 !important;
}.wtg9ga_footArea button:hover {
  background: transparent !important;
  border-color: transparent !important;
}
`;
    document.head.appendChild(style);
  }

  const btn = document.createElement("button");
  btn.id = "dsh-battery-btn";
  btn.type = "button";
  btn.setAttribute("aria-label", "账户余额");
  const img = document.createElement("img");
  img.src = IMG;
  img.alt = "";
  btn.appendChild(img);

  const panel = document.createElement("div");
  panel.id = "dsh-battery-panel";
  const row = document.createElement("div");
  row.className = "dsh-battery-row";
  const label = document.createElement("span");
  label.textContent = "充值余额";
  const value = document.createElement("b");
  value.textContent = "—";
  row.appendChild(label);
  row.appendChild(value);
  const hint = document.createElement("div");
  hint.className = "dsh-battery-hint";
  hint.textContent = "点击查看平台用量";
  panel.appendChild(row);
  panel.appendChild(hint);
  document.body.appendChild(btn);
  document.body.appendChild(panel);

  let disposed = false;
  let timer = 0;
  let loading = false;
  let lastLoad = 0;

  const place = () => {
    if (disposed) return;
    const side = document.querySelector(".wtg9ga_root") || document.querySelector(".mP3x-q_sidebarCol");
    if (!side) return;
    const sideRect = side.getBoundingClientRect();
    const foot = side.querySelector(".wtg9ga_footArea") || side;
    const rect = foot.getBoundingClientRect();
    btn.style.left = Math.round(rect.right - 38) + "px";
    btn.style.top = Math.round(rect.top + (rect.height - 28) / 2) + "px";
  };

  const placePanel = () => {
    const rect = btn.getBoundingClientRect();
    const width = panel.offsetWidth || 190;
    const height = panel.offsetHeight || 64;
    let left = rect.right - width;
    if (left < 8) left = 8;
    let top = rect.top - height - 8;
    if (top < 8) top = rect.bottom + 8;
    panel.style.left = Math.round(left) + "px";
    panel.style.top = Math.round(top) + "px";
  };

  const format = (wallets) => {
    if (!Array.isArray(wallets) || wallets.length === 0) return "—";
    const total = wallets.reduce((sum, wallet) => sum + Number(wallet && wallet.balance ? wallet.balance : 0), 0);
    if (!Number.isFinite(total)) return "—";
    const currency = wallets.some((wallet) => wallet && wallet.currency === "CNY") ? "¥" : "$";
    return currency + total.toFixed(2);
  };

  const render = (res) => {
    // 与设置页一致：details.balance = { status: "ready", value: 充值钱包[], bonusWallets: 赠送钱包[] }
    const outcome = res && res.ok ? res.value : null;
    if (!outcome || outcome.status !== "ready") {
      value.textContent = "—";
      hint.textContent = outcome && outcome.status ? "账户状态：" + outcome.status : "余额读取失败";
      return false;
    }
    const text = format(outcome.value);
    value.textContent = text;
    hint.textContent = "点击查看平台用量";
    return text !== "—";
  };

  const load = async () => {
    if (loading || disposed) return;
    if (Date.now() - lastLoad < 30000) return;
    loading = true;
    try {
      const remote = ctx && ctx.remote ? ctx.remote.account : null;
      if (!remote || typeof remote.getBalance !== "function") {
        value.textContent = "—";
        hint.textContent = "账户服务不可用";
        return;
      }
      let locale = "zh-CN";
      try { locale = ctx.locale.getSnapshot().active; } catch (error) {}
      const meta = {
        version: "0.2.1-rc.3",
        locale,
        timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60
      };
      const res = await remote.getBalance(meta);
      lastLoad = Date.now();
      render(res);
    } catch (error) {
      value.textContent = "—";
      hint.textContent = "余额读取失败，点击去平台查看";
    } finally {
      loading = false;
    }
  };

  const show = () => {
    place();
    panel.style.display = "block";
    placePanel();
    void load();
  };
  const hide = () => { panel.style.display = "none"; };

  const openUsage = () => {
    try {
      const link = document.createElement("a");
      link.href = USAGE_URL;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.click();
    } catch (error) {
      try { window.open(USAGE_URL, "_blank"); } catch (inner) {}
    }
  };

  btn.addEventListener("mouseenter", show);
  btn.addEventListener("mouseleave", hide);
  btn.addEventListener("focus", show);
  btn.addEventListener("blur", hide);
  btn.addEventListener("click", openUsage);

  timer = setInterval(() => {
    if (disposed) return;
    if (!document.body.contains(btn)) document.body.appendChild(btn);
    if (!document.body.contains(panel)) document.body.appendChild(panel);
    place();
    if (panel.style.display === "block") placePanel();
  }, 1000);
  place();

  return () => {
    disposed = true;
    clearInterval(timer);
    btn.removeEventListener("mouseenter", show);
    btn.removeEventListener("mouseleave", hide);
    btn.removeEventListener("focus", show);
    btn.removeEventListener("blur", hide);
    btn.removeEventListener("click", openUsage);
    btn.remove();
    panel.remove();
    const style = document.getElementById(styleId);
    if (style) style.remove();
  };
}
