# SnapText · 截图识字

**免费、开源、跨平台（macOS / Windows）的截图文字识别 + 翻译小工具。**

按下快捷键 → 框选屏幕区域 → 本地 OCR 识别 → 一键翻译。OCR 完全离线运行，
不需要任何 API 密钥，不上传你的屏幕内容。

## 功能

- ⌨️ **全局快捷键**（默认 `⇧⌘1` / `Ctrl+Shift+1`，可自定义）
- 🖼️ **框选截图**：多显示器支持，双击全屏，Esc/右键取消
- 🔍 **本地 OCR**：Tesseract 引擎，离线、免费、无密钥、无遥测
  - 简体中文/繁体中文/英文/日文/韩文（可组合）
- 🌐 **免费翻译**：
  - Google 免费接口（无需密钥）
  - LibreTranslate（公共实例或自建）
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

### macOS 提示「已损坏，无法打开」怎么办

本应用未经 Apple 公证（开源免费项目无开发者账号），从浏览器下载后 macOS 会误报"已损坏"。
应用本身没有任何问题，在终端执行一条命令移除隔离标记即可：

```bash
xattr -cr /Applications/SnapText.app
```

之后正常打开。升级新版后若再次提示，重复执行同一条命令即可。
（彻底消除该提示需要 Apple 开发者账号做签名+公证，约 $99/年。）

### 打包发布

```bash
npm run dist          # 当前平台（macOS 出 dmg，Windows 出安装包）
npm run fetch:tessdata && npm run dist   # 内置语言数据的完全离线包
```

推送 `v*` 标签会触发 GitHub Actions，自动构建 macOS + Windows 双平台安装包（见 `.github/workflows/build.yml`）。

> Windows 安装包请在 Windows 机器（或 CI）上构建；macOS 的 dmg 同理。

## 开发

```bash
npm start          # 启动应用
npm run test:ocr   # 无头自测：离屏 canvas 画图 → OCR 管道 → 断言（应输出 TEST PASS）
npm run icons      # 重新生成图标（纯 Node，无依赖）
```

目录结构：

```
src/
  main/            # Electron 主进程
    main.js        # 入口：托盘、快捷键、窗口与 IPC
    capture.js     # desktopCapturer 截屏 + 选区遮罩 + 裁剪
    ocr.js         # Tesseract 本地 OCR（worker 复用）
    translate.js   # Google 免费接口 / LibreTranslate
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

- [ ] 贴图（截图后钉在桌面上）
- [ ] 识别历史记录
- [ ] 连续识别模式
- [ ] 接入 LLM API 翻译/解释（用户自填 key，设置页已预留 provider 架构）
- [ ] 系统原生 OCR 引擎可选（macOS Vision / Windows.Media.Ocr，更快）

## 已知限制

- Google 免费翻译接口为非官方端点，可能偶尔失败或变动；失败时请切换设置中的
  LibreTranslate（可用 Docker 一行自建：`docker run -p 5000:5000 libretranslate/libretranslate`）。
- Intel/Apple Silicon 均可运行；Windows 10+。

## 许可证

- 本项目代码：[MIT](LICENSE)
- Tesseract 语言数据：Apache-2.0（tessdata_fast）

## English

Free & open-source screenshot OCR + translator for macOS and Windows.
Press the hotkey, drag a region, get local offline OCR (Tesseract) and
keyless free translation. No telemetry, no API keys, MIT licensed.
