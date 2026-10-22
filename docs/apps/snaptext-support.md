# SnapText 支持 / Support

SnapText 是免费的截图文字识别与在线翻译工具，MIT 开源，无广告。当前已上传的 macOS App Store 候选版本：0.2.1（3），支持 Apple 芯片与 macOS 13 或更高版本。本页不表示 App Store 已审核上架。

## 联系与反馈
支持邮箱：[gaoyuan1799@163.com](mailto:gaoyuan1799@163.com)
源码与问题反馈：[GitHub](https://github.com/Gaoyuan-0423/snaptext) · [Issues](https://github.com/Gaoyuan-0423/snaptext/issues)

请提供应用与系统版本、OCR 引擎、翻译服务和复现步骤。不要附带密码、API key、私人截图或敏感原文。

## 截图与识字
1. 启动应用，通过菜单栏入口或设置中的快捷键发起截图；默认是 Command-Shift-1。
2. 首次使用时在 macOS 系统设置中授予屏幕录制权限，必要时按系统提示重启应用。
3. 拖动框选文字区域，松开后在结果窗口查看和复制文字。
4. macOS 默认使用系统 Vision。也可选择 Tesseract；语言数据需要随包提供或下载。
5. 自动复制可以在设置中关闭。应用不保存持久化的识别历史。

## 在线翻译
点击“翻译”会把结果窗口中的文字发送给所选服务，截图不随翻译请求发送。
本构建仅支持 LibreTranslate。请在设置中填写实例基础地址（例如你的 HTTPS 服务地址），以及该实例要求的 API Key。应用会在地址后添加 /translate，因此无需填写 /translate 路径。没有默认实例；不需要 Key 的自建服务可留空。远程实例须使用 HTTPS，本机 localhost/127.0.0.1 可用 HTTP。

应用本身免费，但托管翻译服务可能收费；语言支持、费用与隐私规则以实例运营方为准。旧 build 2 的 Google 选项已移除；旧 Google 设置升级后需要重新配置实例，既有 LibreTranslate 配置保留。

如果翻译失败，请检查网络、服务地址及 API key。OCR 与翻译相互独立，翻译不可用时仍可复制识别文字。

[隐私政策](snaptext-privacy.md)

## English
SnapText is a free, MIT-licensed screenshot OCR app with optional online translation. The uploaded macOS App Store candidate build 0.2.1 (3) supports Apple silicon and macOS 13 or later.

Start a capture from the menu bar or with the shortcut shown in Settings (default: Command-Shift-1). Grant screen recording permission when prompted, then drag to select text. OCR runs locally using Vision by default on macOS, with Tesseract available as an option. Disable automatic copying in Settings if preferred.

Clicking Translate sends text, not the screenshot, to the selected provider. Build 3 supports LibreTranslate only. Enter the instance base URL and its required API key in Settings; /translate is appended automatically. There is no default endpoint. Remote instances require HTTPS; local HTTP instances are supported. A key can be omitted if the instance permits it. Hosted instances may require payment. The former Google option in build 2 has been removed. Contact **gaoyuan1799@163.com** with version information and reproduction steps, without secrets or private screenshots.

Updated: 2026-10-22.

