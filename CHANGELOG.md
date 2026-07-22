# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.7] - 2026-07-22

### Added
- **F1: Real-time collaborative editing** — Edit patches broadcast via Socket.io between peers; cursor position updates (F2) and conflict banner when two users edit the same lines.
- **F2: Remote cursor presence** — See other collaborators' cursor positions and selections in real time with name labels.
- **F3: Project Analysis** — New "Analyze Project" action in File Explorer context menu; modal shows language breakdown, dependencies (npm/pip/cargo/go), TODO/FIXME scan, and recently modified files.

### Changed
- BUILD_DATE updated to 2026-07-22

### Fixed
- Editor full-doc replace typing issues (CodeMirror 6 state API)

## [1.0.6] - 2026-06-25

### Added
- Initial release of EZZO Work Local
- Electron + React + TypeScript + Socket.io + CodeMirror 6 + Xterm.js
- File explorer, editor with tabs, terminal, settings panel
- Auto-update via GitHub Releases