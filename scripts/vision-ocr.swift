// SnapText 的 macOS 原生 OCR 帮助程序（Vision 框架）。
// 用法：vision-ocr <图片路径> [语言,语言]   例：vision-ocr /tmp/x.png zh-Hans,en-US
// 输出：识别文本（多行）到 stdout；失败时 stderr 输出原因并以非零码退出。
import Vision
import ImageIO

func fail(_ msg: String) -> Never {
    FileHandle.standardError.write((msg + "\n").data(using: .utf8)!)
    exit(1)
}

let args = CommandLine.arguments
guard args.count >= 2 else { fail("usage: vision-ocr <image-path> [langs]") }
let imageURL = URL(fileURLWithPath: args[1])
let langs: [String] = args.count >= 3
    ? args[2].split(separator: ",").map(String.init)
    : ["zh-Hans", "en-US"]

guard let src = CGImageSourceCreateWithURL(imageURL as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(src, 0, nil)
else { fail("cannot load image: \(args[1])") }

func runRecognition(languages: [String]) throws -> String {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = languages
    request.usesLanguageCorrection = true
    let handler = VNImageRequestHandler(cgImage: image)
    try handler.perform([request])
    // Vision 的观测结果默认自下而上，反转为阅读顺序
    let lines = (request.results ?? []).reversed().compactMap {
        $0.topCandidates(1).first?.string
    }
    return lines.joined(separator: "\n")
}

do {
    let text = try runRecognition(languages: langs)
    print(text)
} catch {
    // 部分旧系统不支持 zh-Hans 等语言，退回英文再试一次
    if langs != ["en-US"] {
        do { print(try runRecognition(languages: ["en-US"])) }
        catch { fail("vision error: \(error)") }
    } else {
        fail("vision error: \(error)")
    }
}
