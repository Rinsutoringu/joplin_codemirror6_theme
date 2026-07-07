# Changelog

All notable changes to the CodeMirror 6 Theme for Joplin plugin will be documented in this file.

## [2.0.2] - 2025-12-05

### Added
- **Code Block Content Protection**: Fixed rendering bug where Markdown syntax (like `#` symbols) in code blocks were incorrectly styled as headings. Code block content is now properly excluded from all styling rules.
- Enhanced plugin metadata with detailed description and relevant keywords (`theme`, `codemirror6`, `keyboard-shortcuts`, `table-editing`, `markdown`)

### Fixed
- Code blocks no longer have their content rendered with Markdown styles, preserving code formatting integrity

## [2.0.1] - 2025-12-05

### Added
- **Enhanced Metadata**: Updated plugin description to accurately reflect all features:
  - Theme styling for various Markdown elements
  - Keyboard shortcuts (Ctrl+1-6 for headings, Ctrl+$ for math)
  - Comprehensive table editing tools
- Added comprehensive keywords for better discoverability

## [2.0.0] - 2025-12-04

### Added
- **Inline Math Shortcuts**: New `Ctrl+$` keyboard shortcut to quickly wrap/unwrap selected text with `$` symbols for LaTeX inline math notation
- **Math Command**: Toggle inline math notation with intelligent detection of existing `$` wrappers
- **Keyboard Customization**: All keyboard shortcuts are now fully customizable through Joplin settings

### Changed
- Enhanced plugin integration with proper keyboard shortcut management
- Improved StateField implementation for reactive UI updates in CodeMirror 6

### Technical
- Added `mathCommands.ts` module for inline math functionality
- Integrated StateField.provide pattern for reactive panel visibility
- Fixed toggle command state management with proper effect dispatching

## [1.0.3] - 2025-12-03

### Added
- **Table Editing Toolbar**: Embedded table editing toolbar in CodeMirror 6 editor (positioned at bottom)
- **11 Table Operations**:
  - Format table (`Ctrl+Shift+F`)
  - Add row below (`Ctrl+Enter`)
  - Add column right (`Ctrl+Tab`)
  - Delete row, column, and other advanced operations
  - Move rows and columns
  - Text alignment controls (left, center, right)
- **Toolbar UI**:
  - Close button (✕) to hide toolbar
  - Compact horizontal button layout
  - Default hidden state with right-click menu toggle
  - Reactive visibility state management

### Fixed
- Panel visibility toggle now works correctly using StateField.provide pattern
- External script loading for webview components (tableWebview.js)
- Resolved issue where toggle command didn't update panel display

### Technical
- Created `tableToolbarPanel.ts` with CodeMirror panel integration
- Separate `tableWebview.js` for proper script loading
- Integrated table editing commands with keyboard shortcuts
- Right-click context menu integration for table tools

## [1.0.2] - 2025-12-02

### Added
- **Heading Shortcuts**: Keyboard shortcuts for quick heading level toggling:
  - `Ctrl+1` through `Ctrl+6` - Toggle H1 through H6 headings
  - Press once to add heading markers
  - Press again to remove them
  - Works on current line where cursor is positioned

### Technical
- Created `headingCommands.ts` module for heading management
- Integrated heading keymap in CodeMirror extensions

## [1.0.1] - 2025-12-01

### Added
- **Table Rendering**: Enhanced visual styling for Markdown tables in editor
- **Table Features**:
  - Header row styling with bold text and gray background
  - Alternating row colors for better readability
  - Visual separator lines between columns
  - Border styling for table boundaries

### Technical
- Table detection and decoration system
- Dynamic table styling with alternating backgrounds

## [1.0.0] - 2025-11-30

### Initial Release

#### Features
- **Inline Code Styling**: Background color and custom text color for inline code blocks
- **Link Color Customization**: Apply custom colors to hyperlinks and URLs
- **GitHub Alerts**: Full support for GitHub-style alert syntax:
  - `> [!NOTE]` - Blue info box
  - `> [!TIP]` - Green tip box
  - `> [!IMPORTANT]` - Purple important box
  - `> [!WARNING]` - Orange warning box
  - `> [!CAUTION]` - Red caution box
- **Enhanced Heading Styles**: Improved visual hierarchy for Markdown headings (h1-h6) with custom font sizes, weights, and divider lines
- **Blockquote Styling**: Refined appearance for standard blockquote elements

#### Configuration
- Feature toggles for each styling option
- Color customization for inline code and links (hex format)
- Settings panel in Joplin preferences

#### Technical
- CodeMirror 6 integration
- Decoration plugin for real-time styling
- Webpack build system
- TypeScript support

---

## Version History Summary

| Version | Release Date | Major Features |
|---------|--------------|----------------|
| 2.0.2   | 2025-12-05   | Code block protection, metadata enhancement |
| 2.0.1   | 2025-12-05   | Enhanced plugin metadata |
| 2.0.0   | 2025-12-04   | Inline math shortcuts (Ctrl+$) |
| 1.0.3   | 2025-12-03   | Embedded table editing toolbar |
| 1.0.2   | 2025-12-02   | Heading shortcuts (Ctrl+1-6) |
| 1.0.1   | 2025-12-01   | Table rendering enhancement |
| 1.0.0   | 2025-11-30   | Initial release with core theming features |
