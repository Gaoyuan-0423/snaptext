# SnapText 支持 / Support

SnapText 是免费的截图文字识别与在线翻译工具，MIT 开源，无广告。当前 macOS App Store 提交版本：0.2.1（2），支持 Apple 芯片与 macOS 13 或更高版本。本页不表示 App Store 已审核上架。

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
Google 选项使用非官方接口，服务可能受网络、限流或接口变化影响。LibreTranslate 需要可用的服务地址；部分实例要求 API key 或收费，应用提供可选 key 设置。可用性、费用和隐私规则取决于所选服务。

如果翻译失败，请检查网络、服务地址及 API key。OCR 与翻译相互独立，翻译不可用时仍可复制识别文字。

[隐私政策](snaptext-privacy.md)

## English
SnapText is a free, MIT-licensed screenshot OCR app with optional online translation. The submitted macOS App Store build 0.2.1 (2) supports Apple silicon and macOS 13 or later.

Start a capture from the menu bar or with the shortcut shown in Settings (default: Command-Shift-1). Grant screen recording permission when prompted, then drag to select text. OCR runs locally using Vision by default on macOS, with Tesseract available as an option. Disable automatic copying in Settings if preferred.

Clicking Translate sends text, not the screenshot, to the selected provider. The Google option uses an unofficial endpoint; availability is not guaranteed. LibreTranslate instances may require an API key or payment. Contact **gaoyuan1799@163.com** with version information and reproduction steps, without secrets or private screenshots.

Updated: 2026-10-22.

