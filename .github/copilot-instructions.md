# Copilot Instructions for Joplin CodeMirror 6 Theme Plugin

## Project Overview
This is a **Joplin plugin** that enhances the CodeMirror 6 markdown editor with styling, keyboard shortcuts, and table editing tools. The plugin uses **dual content scripts**: one for editor decorations (`CodeMirrorPlugin`) and one for markdown rendering (`MarkdownItPlugin`).

## Architecture

### Two-Layer Plugin System
- **[src/index.ts](../src/index.ts)**: Main plugin entry. Registers Joplin commands, settings, panels, and delegates to content scripts
- **[src/contentScript.ts](../src/contentScript.ts)**: CodeMirror 6 ViewPlugin that adds decorations (GitHub Alerts, heading styles, blockquotes) and keyboard shortcuts
- **[src/markdownRenderer.ts](../src/markdownRenderer.ts)**: Markdown-it plugin for rendering GitHub Alerts in preview pane

### Critical Pattern: Command Registration Flow
CodeMirror commands **must** be registered inside `contentScript.ts` using `codeMirrorWrapper.defineExtension()`, not at module level:

```typescript
// ✅ CORRECT - in contentScript plugin function
codeMirrorWrapper.defineExtension('formatTable', function() {
    const cm6 = (this as any)?.cm6;
    const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
    // cm6 IS the EditorView instance, no .view property needed
});

// ❌ WRONG - will not be found by Joplin
CodeMirror.defineExtension('formatTable', function() { ... });
```

Then invoke from Joplin commands in [src/index.ts](../src/index.ts):
```typescript
await joplin.commands.execute('editor.execCommand', {
    name: 'formatTable',  // matches the extension name
    args: []
});
```

### Decoration System
[src/contentScript.ts](../src/contentScript.ts) uses a **two-pass scanning** approach:
1. First pass: Identify code blocks, fence lines, and alert blocks
2. Second pass: Apply `Decoration.line()` for backgrounds/borders and `Decoration.mark()` for inline text styling

Performance optimization: Skip decoration for documents >2000 lines to avoid lag.

## Key Technologies & External Dependencies
- **@codemirror/view, @codemirror/state**: CM6 core. Use `ViewPlugin.fromClass()` for decorations
- **@felisdiligens/md-table-tools**: Table parsing/rendering. See [src/tableTools.ts](../src/tableTools.ts) for wrappers
- **markdown-it-github-alerts**: Renders GitHub Alerts (NOTE, TIP, WARNING, etc.) in preview
- **Joplin Plugin API v2.8+**: `api/` directory contains TypeScript definitions

## Build & Development

### Build Commands
```bash
npm run dist       # Build plugin (.jpl + .json in publish/)
npm run prepare    # Auto-runs dist on install
npm run updateVersion  # Bump patch version in package.json + manifest.json
```

**Bundling**: Webpack compiles TypeScript. Files in `plugin.config.json` `extraScripts` array are bundled separately as entry points (e.g., `contentScript.ts` → `contentScript.js`).

### Plugin Distribution
- Package name must start with `joplin-plugin-`
- Keywords must include `joplin-plugin`
- `.jpl` and `.json` files in `publish/` are auto-published to Joplin plugin repo via npm

## Project-Specific Conventions

### i18n Pattern
- [src/i18n.ts](../src/i18n.ts): Centralized translation helper using `locales/` JSON files
- Always use `t('key.path')` for user-facing strings
- Supported locales: `en`, `zh_CN`
- **Initialize i18n before settings**: `await initI18n()` must be first in `onStart()`

### Settings Communication
Settings are **not accessible in content scripts**. Use message passing:
```typescript
// contentScript.ts: Request settings from host
const settings = await context.postMessage({ name: 'getSettings' });

// index.ts: Handle message and return settings
await joplin.contentScripts.onMessage(contentScriptId, async (message) => {
    if (message.name === 'getSettings') {
        return { enableInlineCode: await joplin.settings.value('enableInlineCode') };
    }
});
```

### Right-Click Context Menu
Joplin's `filterEditorContextMenu` **does NOT support nested submenus**. Use flat structure with label prefixes:
```typescript
// ✅ CORRECT - flat with separators
object.items.push({ type: 'separator' });
object.items.push({ label: 'Table: Format Table', commandName: 'tableFormatTable' });
object.items.push({ label: 'Table: Add Row', commandName: 'tableAddRowBelow' });

// ❌ WRONG - submenu is ignored
object.items.push({ label: 'Table', submenu: [...] });
```

### Keyboard Shortcuts
Use CodeMirror's `keymap.of([])` in [src/contentScript.ts](../src/contentScript.ts):
- `Mod-X`: Cross-platform (`Ctrl` on Windows/Linux, `Cmd` on macOS)
- Example: `{ key: 'Mod-Shift-f', run: formatTableCommand }`

## Common Pitfalls
1. **"Unsupported command" error**: Command registered outside `codeMirrorWrapper.defineExtension()`
2. **`this.cm6.view` is undefined**: `this.cm6` IS the `EditorView`, not a wrapper. Use `cm6 instanceof EditorView` check
3. **ContentScript file not found**: Add TypeScript files to `plugin.config.json` `extraScripts` array for webpack bundling
4. **Decorations causing lag**: Implement performance guard (e.g., skip if `doc.lines > 2000`)

## Key Files for Feature Development
- **Editor decorations**: [src/contentScript.ts](../src/contentScript.ts) (ViewPlugin pattern)
- **Table operations**: [src/tableCommands.ts](../src/tableCommands.ts), [src/tableTools.ts](../src/tableTools.ts)
- **Command registration**: [src/index.ts](../src/index.ts) (Joplin commands + execCommand bridge)
- **Markdown rendering**: [src/markdownRenderer.ts](../src/markdownRenderer.ts) (Markdown-it plugins)

## Documentation References
- [DEVELOPMENT.md](../DEVELOPMENT.md): Comprehensive Chinese dev guide with troubleshooting
- [api/](../api/): Joplin Plugin API TypeScript definitions
- Joplin Plugin API docs: https://joplinapp.org/api/references/plugin_api/classes/joplin.html
