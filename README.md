<div align="center">
  <img src="src-tauri/icons/icon.png" alt="Reaper Icon" width="120" height="120" />
</div>

# Reaper

Reaper is a fast, modern desktop image editor built with [Tauri](https://tauri.app/), [React](https://react.dev/),
[TypeScript](https://www.typescriptlang.org/), and [Bun](https://bun.sh/). It provides a beautiful, minimal interface
for cropping, resizing, and converting images directly on your desktop, powered by a Rust backend for performance and
security.

---

## ✨ Features

- **Crop Images:** Select and crop any region of your image with zoom and pan support.
- **Resize Images:** Change image dimensions to your needs.
- **Convert Formats:** Instantly convert images between PNG, JPEG, GIF, BMP, WEBP, ICO, TIFF, and TGA.
- **Drag & Drop:** Effortless drag-and-drop or file picker for image import.
- **Fast & Secure:** Built with Rust and Tauri for native performance and safety.
- **Modern UI:** Responsive, dark-themed interface with custom fonts and smooth transitions.

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [Rust](https://www.rust-lang.org/tools/install) (for Tauri backend)
- [Tauri CLI](https://tauri.app/v2/guides/getting-started/prerequisites/) (`bun add -d @tauri-apps/cli` or
  `cargo install tauri-cli`)

### 1. Install Bun

If you don't have Bun:

```sh
curl -fsSL https://bun.sh/install | bash
```

### 2. Install Rust

If you don't have Rust:

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 3. Install dependencies

```sh
bun install
```

### 4. Run in development mode

This will start both the frontend (Vite + React) and the Tauri backend:

```sh
bun run tauri dev
```

### 5. Build for production

To create a production build:

```sh
bun run tauri build
```

The built app will be in `src-tauri/target/release/bundle/` for your platform.

---

## 🛠️ Project Structure

- `src/` — React frontend (UI, components, styles)
- `src-tauri/` — Rust backend (Tauri commands, image processing)
- `public/` — Static assets

---

## 🤝 Contributing

Pull requests and issues are welcome! Please open an issue to discuss your idea or bug before submitting a PR.

---

## 📄 License

This project is licensed under the MIT License.

---

## 💻 Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) +
  [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) +
  [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
