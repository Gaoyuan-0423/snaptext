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
    // 注意：macOS 27.0.1 上 .accurate 模式（VNCRImageReaderDetector 管线）会无限死循环，
    // .fast（Live Text 管线）0.1~0.3 秒稳定完成且中文质量依然很好，故固定用 .fast。
    request.recognitionLevel = .fast
    request.recognitionLanguages = languages
    request.usesLanguageCorrection = true
    let handler = VNImageRequestHandler(cgImage: image)
    try handler.perform([request])
    // Vision 返回顺序不保证是阅读顺序：按归一化 boundingBox 重排
    // （原点在左下角，故「从上到下」= minY 降序；同一视觉行内按 minX 升序）
    let sorted = (request.results ?? []).sorted { a, b in
        let ab = a.boundingBox
        let bb = b.boundingBox
        let tolerance = min(ab.height, bb.height) * 0.4 // 同一行容差
        if abs(ab.minY - bb.minY) > tolerance {
            return ab.minY > bb.minY
        }
        return ab.minX < bb.minX
    }
    let lines = sorted.compactMap { $0.topCandidates(1).first?.string }
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
