# SnapText Mac App Store 上传记录

更新：2026-10-22。上传与审核发布是不同步骤；本轮未提交 App Review。

## 新候选（已上传并完成处理）

- 0.2.1 / build 3 移除 Google 免费接口，仅保留用户配置的 LibreTranslate。
- 默认服务地址为空；旧 Google 设置迁移后需要明确配置服务。OCR 设置保留。
- 远程翻译要求 HTTPS，本机 HTTP 实例可用；禁止请求重定向和 Cookie 发送。
- 8 项测试通过，覆盖翻译请求、迁移、错误响应与重定向保护。正式 TestFlight GUI 回归仍待完成。
- build 3 于 2026-10-22 12:47 成功交付，Transporter 显示“APP 已完成处理”；商店记录上传时间 12:49。
- 新包 SHA-256：`4a571dc8b3a4214cd7d3c8852c19a3555c44c6a483ee67b7a61f07bf1ea73f88`。
- 商店版本已关联并保存 build 3；出口合规答复为标准算法、法国不分发，缺少合规提示已消失。

## 既有上传标识与产物

- Apple 团队：`29RXSR5JXC`（Yuan Gao）。
- Bundle ID：`org.snaptext.app`。
- 商店名称：SnapText - 截图识字与翻译。
- App Store Connect：<https://appstoreconnect.apple.com/apps/6825406903/distribution>。
- 上一构建：0.2.1 / build 2，macOS 13+，arm64。
- 配置：`electron-builder.mas.cjs`，MAS 专用 Electron 45.0.0、electron-builder 26.15.3。
- 应用 Apple Distribution 签名；安装包 3rd Party Mac Developer Installer 签名。
- 输出：`dist/mas-distribution/mas-arm64/SnapText-0.2.1-arm64.pkg`。
- build 1 首次交付被 Apple 拒绝：ICNS 缺少 512@2x。已将既有图标生成脚本分辨率提高到 1024。build 2 已于 23:45 成功交付，随后 Apple 服务器处理通过，Transporter 显示“APP 已完成处理”。

## 复现

```sh
npm ci
npm run install:electron
npm run icons
bash scripts/build-vision-helper.sh
npm test
npm run test:ocr
MAS_PROFILE='/绝对路径/SnapText_Mac_App_Store.provisionprofile' npm run dist:mas
```

如网络不允许 Node 直连 GitHub，可从 Electron 官方 Releases 下载对应版本的 `electron-v45.0.0-mas-arm64.zip`，对照 npm 包 `electron/checksums.json` 验证 SHA-256 后设置 `ELECTRON_MAS_DIST` 为该文件绝对路径。不要关闭 TLS 验证。私钥、密码和 profile 不加入仓库。

构建配置使用当前团队。其他团队需调整 `ElectronTeamID` 和 entitlements 中的应用组前缀。
开发沙盒包使用该 App ID 的 Mac Development profile，并设置 `MAS_DEVELOPMENT=1`。商店分发包应经 TestFlight 安装测试，不能直接运行作为沙盒验收。

## 变更与验证范围

- 窗口开启 contextIsolation、sandbox，关闭 nodeIntegration；通过固定 IPC 白名单 preload 通信。
- 主进程核对窗口来源、主 frame 与本地页面地址，并校验设置、选区、翻译文字长度。
- 设置保存改为等待结果、原子写入；首次结果窗口等待页面加载后发送识别结果。
- 随机 OCR 临时文件名，权限 0600，识别结束删除。
- 翻译界面说明向第三方发送文字；LibreTranslate 支持可选 API key，不承诺所有实例免费。
- 移除打包工具默认注入的相机、麦克风、蓝牙和音频采集用途说明，仅保留实际截图用途说明。
- 4 项校验测试通过；Electron 45 下 Tesseract 英文及 Vision 中英文 OCR 测试通过。
- 主程序、框架、嵌套 helper 的代码签名及 pkg 证书链检查通过。
- 正式 TestFlight 环境下的截图权限、多显示器、快捷键、登录项、在线翻译仍需回归；本轮没有宣称已经完成这些 GUI 验收。

## 送审前

补真实截图、支持/隐私政策 URL、隐私问卷、年龄分级、审核联系信息、价格和地区。翻译服务的数据处理需要与政策一致；build 3 已移除 Google 端点，LibreTranslate 实例的数据保留政策仍需准确披露。Windows 构建和站外 Developer ID 公证并不由 MAS 上传自动完成。

旧 build 2 上传包 SHA-256：`e56f63b0cf33765dfdb7a235bbfdbaaea18787daee93b8cdce26228eb6f49f13`。
