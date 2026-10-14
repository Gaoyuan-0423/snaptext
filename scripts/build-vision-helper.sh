#!/bin/bash
# 编译 macOS Vision OCR 帮助程序（需要 Xcode Command Line Tools）
set -e
cd "$(dirname "$0")/.."
mkdir -p resources/bin
MACOSX_DEPLOYMENT_TARGET=11.0 swiftc -O \
  -o resources/bin/vision-ocr scripts/vision-ocr.swift
echo "built: $(file resources/bin/vision-ocr)"
