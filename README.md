# DSH HDD Skin（DeepSeek Harness 皮肤）

给 DeepSeek Harness 桌面版用的 H.D.D. 主题皮肤：左侧栏 H.D.D. 标题与眼睛动画、右侧相框、底部三角网格球、H.D.D. 水印、滚动到底部按钮、侧栏电池余额按钮，以及可选的启动动画。

> 适配的是 2026-10 的 DSH 桌面版（界面类名 `mP3x-q_*` / `wtg9ga_*` / `an3WzG_*` / `V4vHZW_*`）。DSH 每次改版这些哈希类名会变，需要重新适配。

## 功能

- 侧栏：蓝黑渐变底、`H.D.D. SYSTEM` / `HOLLOW DEEP DIVE SYSTEM` 两行标题、Fairy 眼睛（含周期抖动/细抖动）。
- 右侧：相框（9-slice `border-image`）、底部 1/4 三角网格球、球体上方 H.D.D. 水印。
- 滚动到底部按钮：与输入框同款半透明 + 模糊，箭头用主题色。
- 侧栏个人信息卡：与新会话按钮一致的玻璃卡片，右侧电池图标（只显示图片），悬浮显示**充值余额**（与设置页「账号与余额」同源），点击打开 `https://platform.deepseek.com/usage`。
- 可选启动动画：DSH 打开时在相框内播放 `boot.mp4`（`object-fit: cover`）。

## 安装

1. 把本仓库复制到 `C:\Users\Public\dsh-wallpaper`（至少需要 `lib\client.js`、`lib\index.js`、`package.json`）。
2. 在 `%USERPROFILE%\.dsh\profiles\desktop\cordis.patch.yml` 末尾追加：

   ```yaml
   - insert:
       - id: wallpaper
         name: 'C:/Users/Public/dsh-wallpaper/lib/index.js'
   ```

3. 完全退出并重新打开 DeepSeek Harness。

也可以直接运行仓库里的 `install.ps1`（会复制文件、补 profile、注册登录自启并尝试启动视频服务）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

> 安装/更新其它插件后，`cordis.patch.yml` 可能被重写，`wallpaper` 这段会消失，皮肤随之失效。运行 `tools/fix-profile.ps1` 可以补回。

## 启动动画

仓库根目录已包含 `boot-new.mp4`（约 27 MB，12.75 秒的开机动画）。`install.ps1` 会把它复制到 `C:\Users\Public\dsh-wallpaper\boot-new.mp4`，`boot-server.mjs` 监听 `127.0.0.1:18766` 提供该视频，DSH 打开时在相框内播放。

- 如果不想用自带动画，删除 `boot-new.mp4` 即可；没有视频不影响其它样式。
- 旧的 `boot.mp4`（约 71 MB）没有放进仓库，需要的话自行放到 `C:\Users\Public\dsh-wallpaper\boot.mp4`。

## 目录

```
lib/client.js        构建产物（内嵌所有素材，DSH 实际加载的文件）
lib/index.js         宿主插件入口（空实现，加载 client.js）
package.json         插件清单
install.ps1          一键安装
boot-server.mjs      本地视频服务（支持 Range）
boot-server.vbs      隐藏启动器
src/                 样式源码与素材
  wallpaper.css      主题样式（侧栏、相框、球、水印、按钮）
  mascot.*           Fairy 眼睛（改编自 Fairy-DSH，Apache-2.0）
  battery.js         电池余额按钮（注入到 client.js）
  build.mjs          构建脚本：把 src 资源拼成 lib/client.js
  frame.png / hdd.png / bg.png / sphere.svg
tools/               构建/注入/修复辅助脚本
```

## 构建

```powershell
node src/build.mjs src/bg.png lib/client.js
```

`build.mjs` 会把 `src` 里的 SVG/PNG/CSS/JS 内联进 `lib/client.js`。

## 第三方来源

`src/mascot-*` 与眼睛状态/抖动逻辑改编自 [Chengzhibense/Fairy-DSH](https://github.com/Chengzhibense/Fairy-DSH)（`dsh-fairy-visual`），依 **Apache License 2.0** 使用；Fairy / DSH / DeepSeek 等名称与商标不随该许可授权。
