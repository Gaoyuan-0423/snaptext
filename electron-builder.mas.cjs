'use strict';
const fs = require('fs');
const path = require('path');
const profile = process.env.MAS_PROFILE;
if (!profile || !fs.existsSync(profile)) throw new Error('Set MAS_PROFILE to this app’s macOS provisioning profile.');
const development = process.env.MAS_DEVELOPMENT === '1';
const base = require('./package.json').build;
module.exports = {
  ...base,
  directories: { ...base.directories, output: development ? 'dist/mas-development' : 'dist/mas-distribution' },
  forceCodeSigning: true,
  ...(process.env.ELECTRON_MAS_DIST ? { electronDist: process.env.ELECTRON_MAS_DIST } : {}),
  buildVersion: '3',
  files: [...base.files, 'LICENSE'],
  afterPack: async ({ appOutDir }) => {
    const plist = path.join(appOutDir, 'SnapText.app/Contents/Info.plist');
    for (const key of ['NSCameraUsageDescription', 'NSMicrophoneUsageDescription', 'NSAudioCaptureUsageDescription', 'NSBluetoothAlwaysUsageDescription', 'NSBluetoothPeripheralUsageDescription']) {
      require('child_process').execFileSync('/usr/libexec/PlistBuddy', ['-c', `Delete :${key}`, plist]);
    }
  },
  mac: {
    ...base.mac,
    target: [{ target: development ? 'mas-dev' : 'mas', arch: ['arm64'] }],
    minimumSystemVersion: '13.0',
    extendInfo: {
      ElectronTeamID: '29RXSR5JXC',
      NSCameraUsageDescription: undefined,
      NSMicrophoneUsageDescription: undefined,
      NSBluetoothAlwaysUsageDescription: undefined,
      NSBluetoothPeripheralUsageDescription: undefined,
      NSScreenCaptureUsageDescription: 'SnapText 在你选择区域后截取屏幕，用于本机文字识别。',
    },
  },
  mas: {
    type: development ? 'development' : 'distribution',
    identity: 'Yuan Gao',
    provisioningProfile: path.resolve(profile),
    hardenedRuntime: false,
    timestamp: 'none',
    entitlements: 'build/entitlements.mas.plist',
    entitlementsInherit: 'build/entitlements.mas.inherit.plist',
    binaries: ['Contents/Resources/app.asar.unpacked/resources/bin/vision-ocr'],
  },
};
