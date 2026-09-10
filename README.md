# SNA Terminal Lab

A modern, browser-based terminal emulator that replicates the experience of Windows Command Prompt (CMD) and Windows PowerShell. Built with React, TypeScript, and Vite, this application provides a robust Virtual File System (VFS) and offline-first capabilities, making it an excellent tool for education, simulation, and safely practicing command-line operations.

## 🏗️ Architecture & Technical Design

The SNA Terminal Lab is designed as a client-side only Single Page Application (SPA) that heavily utilizes an in-memory execution engine to simulate an operating system environment. 

### 1. Core Execution Engine (`src/engine/`)
* **Tokenizer & Parser (`tokenizer.ts`):** Custom lexical analysis that accurately parses Windows CMD and PowerShell command strings. It handles quotes, flags, switches, and Windows-specific quirks (like spaceless path traversal e.g., `cd..`, `cd\`, or direct drive switching like `C:`).
* **Virtual File System (`vfs.ts`):** An in-memory hierarchical tree structure simulating Windows drives (`C:\`, `D:\`, `E:\`, `F:\`). It handles path resolution, directory traversal, and file creation with proper canonical casing.
* **Command Registry (`registry.ts`):** A routing system that maps parsed command strings to their respective execution handlers (e.g., mapping `dir`, `md`, `cd`, `cls` to internal TS functions).
* **Lab Context (`context.ts`):** The global state object that holds the VFS, mock user sessions, and simulated environment variables.

### 2. State Management & Persistence (`src/utils/storage.ts`)
* **Local Storage Hydration:** The entire `LabContext` (including the VFS tree) is serialized and saved to the browser's `localStorage` after every command execution.
* **Circular Reference Handling:** The VFS tree naturally contains circular references (children pointing to parents). The storage utility gracefully strips these out during JSON serialization and relinks the parent-child relationships during hydration on the next page load.
* **Dynamic Migration:** If the underlying engine code adds new default drives (like `D:`, `E:`, `F:`), the hydration script automatically injects these into existing saved states without overwriting the user's custom files.

### 3. UI Layer (`src/components/`)
* **React 18 & Tailwind CSS:** The UI is purely functional and responsive.
* **Terminal Screen (`TerminalScreen.tsx`):** A virtualized/mapped list of `TerminalEntry` objects that represent the input/output history, color-coded for errors and different shells.
* **Mobile-First Inputs (`CommandInputBar.tsx`):** Recognizing that mobile keyboards make typing terminal commands tedious, the UI features a sticky bottom bar with "Quick Action" chips and a visual history stepper (`< Prev`, `Next >`).

### 4. Progressive Web App (PWA) & Offline-First (`public/sw.js`)
* **Service Worker Cache:** A custom Service Worker caches the entire static application shell (`index.html`, JS bundles, CSS, icons).
* **Stale-While-Revalidate Strategy:** When online, the app serves instantly from the cache while fetching updates in the background.
* **Installable:** Includes a Web App Manifest and an in-app `PWAInstallPromptBanner`, allowing users to add the terminal directly to their device home screen and use it in airplane mode.

## ✨ Supported Features

* **Dual Shell Environments:** Toggle seamlessly between Classic CMD and PowerShell simulations.
* **Native Windows Pathing:** Support for absolute, relative, and root paths, including drive letters.
* **Command History:** Use up/down arrow keys (or mobile UI buttons) to cycle through previous commands.
* **Persistent State:** Close the browser tab and return days later to find your exact virtual files and working directory intact.
* **Robust Error Handling:** Syntax warnings and command errors are clearly output in the terminal flow.
* **Safe Lab Reset:** A modal system allowing users to wipe the VFS and return to the default "clean room" baseline.

## 🚀 Getting Started (Local Development)

### Prerequisites
* Node.js (v18 or higher)
* npm

### Installation

1. Clone the repository and navigate into the project directory:
   ```bash
   git clone <repository-url>
   cd sna-terminal-lab
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
   *(Note: For production, the built files in `/dist` can be served by any static file host. The Service Worker will automatically cache them for offline use).*

## 🌐 Deploying to Netlify

This project is fully pre-configured for Netlify deployment with SPA redirects (`_redirects`, `netlify.toml`), PWA caching headers, and security rules.

### Option 1: Deploy with Git (Recommended)
1. Push your repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Go to [Netlify](https://app.netlify.com/) and click **"Add new site"** > **"Import an existing project"**.
3. Select your repository.
4. Netlify will auto-detect settings from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Click **"Deploy site"**.

### Option 2: Netlify CLI
Run the following in your terminal:
```bash
# Install Netlify CLI if needed
npm install -g netlify-cli

# Build the app
npm run build

# Deploy to production
netlify deploy --prod --dir=dist
```

### Option 3: Netlify Drop (No CLI / No Git)
1. Run `npm run build` locally to generate the `dist` folder.
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag and drop the `dist` folder directly onto the page.

