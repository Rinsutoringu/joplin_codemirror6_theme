# CodeMirror 6 Theme for Joplin

Enhanced editor styling and productivity features for Joplin notes.

## Features

### Inline Code Styling
Adds background color and custom text color to inline code blocks for better visibility.

### Link Color Customization
Apply custom colors to hyperlinks and URLs throughout your notes.

### GitHub Alerts
Full support for GitHub-style alert syntax in the editor:
- `> [!NOTE]` - Blue info box
- `> [!TIP]` - Green tip box
- `> [!IMPORTANT]` - Purple important box
- `> [!WARNING]` - Orange warning box
- `> [!CAUTION]` - Red caution box

### Enhanced Heading Styles
Improved visual hierarchy for Markdown headings (h1-h6) with custom font sizes, weights, and divider lines.

### Blockquote Styling
Refined appearance for standard blockquote elements.

### Heading Shortcuts
Quick keyboard shortcuts for toggling heading levels:
- `Ctrl+1` through `Ctrl+6` - Toggle H1-H6 headings
- Press once to add heading markers
- Press again on the same level to remove them
- Works on the current line where your cursor is positioned

## Configuration

All features can be toggled in Settings → CodeMirror 6 Theme:

**Feature Toggles**
- Enable inline code styling
- Enable link color customization
- Enable GitHub Alerts
- Enable heading styles
- Enable blockquote styling

**Color Customization**
- Inline code color (hex format, default: `#d63200`)
- Link color (hex format, default: `#d63200`)

## Installation

1. Download the latest `.jpl` file from releases
2. In Joplin, go to Settings → Plugins
3. Click the gear icon and select "Install from file"
4. Choose the downloaded `.jpl` file
5. Restart Joplin

## Development

Build the plugin:
```bash
npm install
npm run dist
```

The plugin package will be generated in the `publish/` directory.

For more development information, see [GENERATOR_DOC.md](./GENERATOR_DOC.md)

## TODO

- 把指定笔记的.md源文件和该笔记的附件导出到同一个指定目录，确保附件的文件内超链接也被同步更新，以便于在外部编辑器直接查看。支持多选笔记，多选笔记时将有两种行为：所有笔记源文件和附件都导入同一目录\以文件夹为单位导出各笔记，保留Front Matter，这个行为将存在一个可配置选项，可以在插件设置中更改。

## License

MIT
