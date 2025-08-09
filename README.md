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
