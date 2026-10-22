# SnapText · 截图识字

**免费、开源、跨平台（macOS / Windows）的截图文字识别 + 翻译小工具。**

按下快捷键 → 框选屏幕区域 → 本地 OCR 识别 → 一键翻译。截图识别在本机进行；
系统 Vision 无需下载模型，Tesseract 缺少语言数据时需联网下载。点击翻译会向选定服务发送识别文字。

当前商店候选：0.2.1（build 3，LibreTranslate-only；已上传并完成处理），Electron 45，macOS 13+ / arm64。商店构建与上传记录见 [MAS-DISTRIBUTION.md](MAS-DISTRIBUTION.md)。

## 功能

- ⌨️ **全局快捷键**（默认 `⇧⌘1` / `Ctrl+Shift+1`，可自定义）
- 🖼️ **实时框选**：屏幕不冻结、不变暗（同系统 ⌘⇧4 手感），多显示器支持，双击全屏，Esc/右键取消
- 🔍 **双 OCR 引擎**：
  - macOS 系统 Vision（默认）：原生、**0.3 秒级**、中文无字间空格、无需下载语言数据
  - Tesseract：跨平台兜底，离线、免费、无密钥（简繁中文/英文/日文/韩文）
- 🌐 **在线翻译**：
  - 仅 LibreTranslate：用户填写服务地址与实例要求的 API Key，服务可能收费。
  - 默认地址为空；不配置翻译也能使用本地 OCR。远程服务使用 HTTPS，本机实例可使用 HTTP。
- 📋 识别后自动复制到剪贴板（可关闭）
- 📌 结果浮窗置顶、贴在选区附近
- 🚀 开机自启、菜单栏/托盘常驻

## 隐私

- OCR 在**本机**运行，截图不会上传到任何服务器。
- 仅当你点击「翻译」时，文字内容（非图片）才会发送给你选择的翻译服务。
- 无任何统计/埋点/崩溃上报。

## 安装与使用

### 从源码运行（开发者）

```bash
git clone https://github.com/Gaoyuan-0423/snaptext
cd snaptext
npm install
npm start
```

首次识别时程序会自动下载 OCR 语言数据（约几 MB，之后离线可用）；
想预打包实现完全离线，运行 `npm run fetch:tessdata` 后再 `npm run dist`。

### macOS 权限

首次截图时系统会要求「屏幕录制」权限：
系统设置 → 隐私与安全性 → 屏幕录制 → 勾选 SnapText（开发时勾选你的终端/Electron），重启应用。
程序检测到无权限时会自动弹出引导。

### macOS 分发状态

开发者已有 Apple 开发者账号，已使用独立 MAS 构建上传 App Store Connect 并完成服务器处理；尚未提交审核或公开发布。此前 GitHub Releases 的未签名、未公证安装包并未因此自动变为已公证版本。站外 DMG 还需独立的 Developer ID 签名及公证流程；不要把解除隔离标记当作公证验收。

### 打包发布

```bash
npm run dist          # 当前平台（macOS 出 dmg，Windows 出安装包）
npm run fetch:tessdata && npm run dist   # 内置语言数据的完全离线包
```

推送 `v*` 标签会触发 GitHub Actions，自动构建 macOS + Windows 双平台安装包（见 `.github/workflows/build.yml`）。

> Windows 安装包请在 Windows 机器（或 CI）上构建；macOS 的 dmg 同理。

## 开发

```bash
npm start               # 启动应用（macOS 首次建议先跑下一行编译 Vision 引擎）
bash scripts/build-vision-helper.sh   # 编译 macOS 系统 Vision OCR helper（需 Xcode CLT）
npm run test:ocr        # 无头自测：双引擎识别断言（应输出 PASS）
npm run icons           # 重新生成图标（纯 Node，无依赖）
```

目录结构：

```
src/
  main/            # Electron 主进程
    main.js        # 入口：托盘、快捷键、窗口与 IPC
    capture.js     # desktopCapturer 截屏 + 选区遮罩 + 裁剪
    ocr.js         # Tesseract 本地 OCR（worker 复用）
    translate.js   # 用户配置的 LibreTranslate API
    settings.js    # 设置持久化（userData/settings.json）
  renderer/
    overlay/       # 框选遮罩（每块屏幕一个全屏窗口）
    result/        # 识别结果浮窗（文本/翻译/复制/置顶）
    settings/      # 设置界面
scripts/
  test-ocr.js      # 无头 OCR 自测
  fetch-tessdata.js# 预下载语言数据
  gen-icons.js     # 图标生成
```

## 路线图（欢迎 PR）

- [ ] Windows 系统原生 OCR 引擎（Windows.Media.Ocr）
- [ ] 贴图（截图后钉在桌面上）
- [ ] 识别历史记录
- [ ] 连续识别模式
- [ ] 接入 LLM API 翻译/解释（用户自填 key，设置页已预留 provider 架构）

## 已知限制

- 翻译需自行配置 LibreTranslate 实例；语言支持、费用及数据保留以实例运营方为准。官方实例声明不记录翻译文本，但为防滥用暂存 IP 地址和关联 API Key 两天（https://portal.libretranslate.com/privacy.html）。
- 旧 Google 设置会迁移为未配置的 LibreTranslate，不会自动发送给默认实例。已有 LibreTranslate 地址、Key 和 OCR 设置保留。
- 当前 macOS 商店包只包含 Apple Silicon（arm64），最低 macOS 13；Intel 未完成构建与运行验证。Windows 10+。

## 许可证

- 本项目代码：[MIT](LICENSE)
- Tesseract 语言数据：Apache-2.0（tessdata_fast）

## English

Free & open-source screenshot OCR + translator for macOS and Windows.
Press the hotkey, drag a region, and run local OCR with Vision or Tesseract.
Translation uses only a user-configured LibreTranslate instance and its optional API key. No default endpoint is configured. The app does not call Google translation endpoints.
No telemetry. MIT licensed.
