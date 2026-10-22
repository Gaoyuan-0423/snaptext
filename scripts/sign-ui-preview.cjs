'use strict';
// Local UI testing only. Keep a certificate-backed identity so macOS TCC
// permissions do not become tied to a different ad-hoc cdhash each build.
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { signAsync } = require('@electron/osx-sign');

async function main() {
  const app = path.resolve(process.argv[2] || 'dist/ui-preview/mac-arm64/SnapText.app');
  const identity = process.env.PREVIEW_SIGN_IDENTITY;
  if (!identity || identity === '-') throw new Error('Set PREVIEW_SIGN_IDENTITY to an Apple Development identity (not ad-hoc).');
  if (!fs.existsSync(path.join(app, 'Contents', 'Info.plist'))) throw new Error('Application bundle not found: ' + app);
  await signAsync({
    app, identity, platform: 'darwin', type: 'development',
    preAutoEntitlements: false, preEmbedProvisioningProfile: false,
    binaries: [path.join(app, 'Contents/Resources/app.asar.unpacked/resources/bin/vision-ocr')],
    optionsForFile: () => ({
      entitlements: ['com.apple.security.cs.allow-jit'],
      hardenedRuntime: true,
      timestamp: 'none',
    }),
  });
  execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
  execFileSync('/usr/bin/codesign', ['-dvv', '-r-', app], { stdio: 'inherit' });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
