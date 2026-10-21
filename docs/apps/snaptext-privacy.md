# SnapText 隐私政策 / Privacy Policy

更新日期：2026-10-22。适用版本：SnapText 0.2.1（2）的 macOS App Store 构建。
开发者：Yuan Gao。联系邮箱：[gaoyuan1799@163.com](mailto:gaoyuan1799@163.com)。

## 截图与文字识别
应用仅在你主动发起截图时取得选区图像，使用本机 OCR 引擎识别文字。截图不上传到开发者服务器或翻译服务。macOS Vision 流程使用本机临时截图文件，并在识别完成或返回错误后尝试删除；异常退出可能留下临时文件。

macOS 屏幕录制权限用于截图。你可以在系统设置中撤销权限，撤销后截图功能将不可用。

## 在线翻译
只有点击“翻译”时，应用才向设置中选择的 Google 接口或 LibreTranslate 实例发送待翻译文字与语言参数。截图不包含在翻译请求中。服务提供方还可能接收到 IP 地址等网络请求信息；如果你配置了 LibreTranslate API key，该 key 会发送给你配置的实例。

第三方服务的数据保存与处理由其自身政策决定。开发者无法保证第三方不会记录请求。请不要提交不希望分享给该服务的内容。你可以仅使用 OCR，不使用在线翻译。
- Google：[隐私政策](https://policies.google.com/privacy)
- LibreTranslate：请查看你所选实例运营方的隐私政策；不同实例可能不同。

## 语言数据与本地设置
Tesseract 缺少所选语言文件时可能下载语言数据。下载不会上传你的截图，但下载服务器会收到正常网络请求。
应用在本机保存设置、语言数据缓存及你选择保存的 LibreTranslate API key；key 当前保存在本机设置文件中，不应向他人分享该文件。

应用不提供持久化识别历史。自动复制开启时，识别文字写入系统剪贴板；你可以关闭自动复制。剪贴板内容也可能由系统或获权限的其他应用访问。

## 广告、账号与统计
应用无需注册账号，没有广告，没有开发者部署的使用统计、埋点或崩溃上报服务。在线翻译的数据传输不等同于“所有数据都留在本机”。Apple 自身的 App Store、TestFlight 和系统诊断服务受 Apple 的政策及你的设置约束。

## 管理与联系
你可以更换翻译服务、清除已配置的 API key、关闭自动复制并撤销屏幕录制权限。卸载应用不一定删除本地设置或缓存。如需本地数据清理帮助，请联系支持。
主动发送支持邮件时，邮件服务和收件方会收到你的邮箱地址、正文及附件。请勿发送不必要的个人信息或私人截图。关于支持邮件的访问、更正或删除请求可联系上述邮箱。

---

## English

Updated: October 22, 2026. Applies to the macOS App Store build SnapText 0.2.1 (2).
Developer: Yuan Gao. Contact: **gaoyuan1799@163.com**.

Screenshots are captured when you initiate a capture and processed locally by OCR. Images are not uploaded to the developer or translation providers. The macOS Vision flow uses a local temporary image file and attempts to remove it after success or failure; abnormal termination may leave a temporary file. You may revoke screen recording permission in macOS Settings.

Only when you click Translate does the app send text and language parameters to the Google endpoint or LibreTranslate instance selected in Settings. Images are not included. Providers may receive network information such as your IP address. A configured LibreTranslate API key is sent to the instance you selected. Provider retention and processing are governed by their own policies; the developer cannot guarantee that requests are not logged. Avoid sending sensitive content. You can use OCR without online translation. See [Google's privacy policy](https://policies.google.com/privacy) or the policy of your selected LibreTranslate instance.

Missing Tesseract language data may be downloaded without uploading screenshots. Download hosts receive normal network request information. Settings, language caches and any configured LibreTranslate API key are stored locally. The key is currently stored in the settings file, which should not be shared. No persistent OCR history is provided. Automatic copying writes recognized text to the system clipboard; this can be disabled. The system and other authorized apps may access the clipboard.

The app has no accounts, advertising, developer-operated analytics or crash reporting. Apple's own services are governed by Apple's policies and your settings. Uninstalling the app does not necessarily remove local settings or caches.

Emailing support shares your email address, message and attachments with the mail provider and recipient. Do not attach unnecessary personal information or private screenshots. Contact the address above for local-data cleanup help or requests relating to support correspondence.

