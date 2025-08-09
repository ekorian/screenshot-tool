## Div Screenshot Tool Pro

Electron + Puppeteer tool to capture specific DOM elements as images.

### Prerequisites
- Node.js 18+

### Install
```bash
npm install
```

### Run
```bash
npm start
```

If you are on a headless Linux server:
```bash
xvfb-run -a npm start
```

On some Linux systems you may see a sandbox error from Electron. The provided scripts set `ELECTRON_DISABLE_SANDBOX=1` for development convenience. For production packaging, configure setuid sandbox properly or keep sandbox disabled only in dev.

### Scripts
- `start`: run the Electron app
- `start:headless`: run via Xvfb (Linux headless)
- `clean`: remove build folders
- `package`: create unpacked build artifacts
- `dist`: create distributable installers

### Build (optional)
```bash
npm run dist
```

This uses electron-builder to package the app for your platform.
