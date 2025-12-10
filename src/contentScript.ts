import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, keymap } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { headingCommands } from './headingCommands';
import { tableEditCommands } from './tableEditCommands';
import { tableToolbarState, toggleTableToolbar } from './tableToolbarPanel';
import { toggleInlineMath } from './mathCommands';
import { blockquoteCommands } from './blockquoteCommands';

// 声明 CodeMirror 全局对象
declare const CodeMirror: any;

// 定义 alert 类型和对应的颜色
const alertTypes = {
    'NOTE': { color: '#0969da', bgColor: 'rgba(9, 105, 218, 0.06)' },
    'TIP': { color: '#1a7f37', bgColor: 'rgba(26, 127, 55, 0.06)' },
    'IMPORTANT': { color: '#8250df', bgColor: 'rgba(130, 80, 223, 0.06)' },
    'WARNING': { color: '#9a6700', bgColor: 'rgba(154, 103, 0, 0.06)' },
    'CAUTION': { color: '#d1242f', bgColor: 'rgba(209, 36, 47, 0.06)' }
};

// 标题样式配置
const headingStyles = {
    1: 'font-size: 2.5em; font-weight: bold; padding-bottom: 0.3em; border-bottom: 2px solid #ddd; color: #273849;',
    2: 'font-size: 1.8em; font-weight: bold; padding-bottom: 0.3em; border-bottom: 1px solid #e0e0e0; color: #273849;',
    3: 'font-size: 1.4em; font-weight: bold; color: #273849;',
    4: 'font-size: 1.2em; font-weight: bold; color: #273849;',
    5: 'font-size: 1em; font-weight: bold; color: #273849;',
    6: 'font-size: 1em; font-weight: bold; color: #273849;'
};

// 插件设置
let pluginSettings = {
    enableGitHubAlerts: true,
    enableHeadingStyles: true,
    enableBlockquoteStyles: true,
    enableTableRendering: true,
};

// 创建装饰插件来高亮 GitHub Alerts 和标题
const createDecorationPlugin = () => ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
        // 只在文档内容变化时重建，忽略视口变化（滚动）
        if (update.docChanged) {
            this.decorations = this.buildDecorations(update.view);
        }
    }

    buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const doc = view.state.doc;

        // 如果文档太大，跳过装饰以避免性能问题
        const MAX_LINES = 2000;
        if (doc.lines > MAX_LINES) {
            return builder.finish();
        }

        // 第一遍：快速扫描标记代码块、fence 行语言和 Alert 块
        const codeBlockLines = new Set<number>();
        const fenceLineLangs = new Map<number, string | null>();
        const alertLineTypes = new Map<number, string>();
        
        let inCodeBlock = false;
        let currentAlertType: string | null = null;
        
        for (let i = 1; i <= doc.lines; i++) {
            const line = doc.line(i);
            const text = line.text;
            const trimmed = text.trimStart();
            
            // 检测代码块 fence 行（并记录可能的语言）
            const fenceMatch = trimmed.match(/^```(\S*)/);
            if (fenceMatch) {
                const lang = fenceMatch[1] && fenceMatch[1].length ? fenceMatch[1] : null;
                fenceLineLangs.set(i, lang);
                inCodeBlock = !inCodeBlock;
                codeBlockLines.add(i);
            } else if (inCodeBlock) {
                codeBlockLines.add(i);
            }
            
            // 检测 Alert（不在代码块内，允许前导空格）
            if (!inCodeBlock && pluginSettings.enableGitHubAlerts) {
                if (trimmed.startsWith('> [!')) {
                    const match = trimmed.match(/^>\s*\[!(\w+)\]/);
                    if (match) {
                        currentAlertType = match[1].toUpperCase();
                        alertLineTypes.set(i, currentAlertType);
                    }
                } else if (currentAlertType && trimmed.startsWith('>')) {
                    // Alert 内容行：以 > 开头即可（可能是 "> " 或 ">内容"）
                    alertLineTypes.set(i, currentAlertType);
                } else if (trimmed.length > 0 && !trimmed.startsWith('>')) {
                    // 遇到非空且不以 > 开头的行，Alert 块结束
                    currentAlertType = null;
                }
            }
        }

        // 第二遍：添加装饰
        let i = 1;
        while (i <= doc.lines) {
            // 如果是代码块行
            if (codeBlockLines.has(i)) {
                // 如果是 fence 行（```），为 fence 添加特殊样式并高亮语言名（如果有）
                if (fenceLineLangs.has(i)) {
                    const fenceLine = doc.line(i);
                    const fenceText = fenceLine.text;
                    const lang = fenceLineLangs.get(i);

                    const fenceLineDeco = Decoration.line({
                        attributes: {
                            style: 'background: #f6f8fa; color: #6a737d; font-style: italic; padding: 4px 8px;'
                        }
                    });
                    builder.add(fenceLine.from, fenceLine.from, fenceLineDeco);

                    if (lang) {
                        // 在原始文本中查找语言位置（从 ``` 之后）
                        const backtickIndex = fenceText.indexOf('```');
                        let langIndex = -1;
                        if (backtickIndex >= 0) {
                            langIndex = fenceText.indexOf(lang, backtickIndex + 3);
                        }
                        if (langIndex >= 0) {
                            builder.add(fenceLine.from + langIndex, fenceLine.from + langIndex + lang.length, Decoration.mark({
                                attributes: {
                                    style: 'color: #d73a49; font-weight: 700;'
                                }
                            }));
                        }
                    }
                }
                i++;
                continue;
            }

            const line = doc.line(i);
            const text = line.text;
            
            // 检测表格分隔行
            if (pluginSettings.enableTableRendering && text.includes('|') && text.includes('-')) {
                // 简单检测：包含 | 和 - 可能是表格分隔行
                const isDivider = /^\s*\|?[\s:]*-+[\s:]*(\|[\s:]*-+[\s:]*)+\|?\s*$/.test(text);
                if (isDivider) {
                    // 找表格边界
                    let tableStart = i;
                    let tableEnd = i;
                    
                    // 向前找表头（最多找10行）
                    for (let j = i - 1; j >= Math.max(1, i - 10); j--) {
                        const prevText = doc.line(j).text;
                        if (prevText.includes('|')) {
                            tableStart = j;
                        } else {
                            break;
                        }
                    }
                    
                    // 向后找表格内容（最多找50行）
                    for (let j = i + 1; j <= Math.min(doc.lines, i + 50); j++) {
                        const nextText = doc.line(j).text;
                        if (nextText.includes('|')) {
                            tableEnd = j;
                        } else {
                            break;
                        }
                    }
                    
                    // 渲染表格
                    for (let j = tableStart; j <= tableEnd; j++) {
                        const tableLine = doc.line(j);
                        const isDividerLine = (j === i);
                        const isHeader = (j < i);
                        const dataRowIndex = j > i ? (j - i - 1) : 0;
                        const isEven = dataRowIndex % 2 === 0;
                        
                        let style = '';
                        if (isDividerLine) {
                            style = 'height: 4px; line-height: 4px; font-size: 2px; color: #d0d7de; background-color: #e1e4e8; border-top: 1px solid #d0d7de; border-bottom: 1px solid #d0d7de;';
                        } else if (isHeader) {
                            style = 'font-size: 1.05em; font-weight: 600; background-color: #f6f8fa; padding: 10px 0;';
                            if (j === tableStart) style += ' border-top: 2px solid #d0d7de;';
                        } else {
                            const bgColor = isEven ? '#ffffff' : '#f8f8f8';
                            style = `background-color: ${bgColor}; padding: 8px 0;`;
                            if (j === tableEnd) style += ' border-bottom: 2px solid #d0d7de;';
                        }
                        
                        builder.add(tableLine.from, tableLine.from, Decoration.line({
                            attributes: { style }
                        }));
                        
                        // 简化管道符样式
                        const lineText = tableLine.text;
                        for (let k = 0; k < lineText.length; k++) {
                            if (lineText[k] === '|') {
                                const pipeStyle = isDividerLine
                                    ? 'color: transparent; background: linear-gradient(to right, transparent 40%, #c0c5cc 40%, #c0c5cc 60%, transparent 60%); padding: 0 6px;'
                                    : 'color: transparent; border-left: 2px solid #c0c5cc; padding: 0 7px; margin: 0 3px;';
                                builder.add(tableLine.from + k, tableLine.from + k + 1, Decoration.mark({
                                    attributes: { style: pipeStyle }
                                }));
                            }
                        }
                    }
                    
                    i = tableEnd + 1;
                    continue;
                }
            }
            
            // GitHub Alerts
            if (alertLineTypes.has(i)) {
                const alertType = alertLineTypes.get(i)!;
                const config = alertTypes[alertType as keyof typeof alertTypes];
                
                if (config) {
                    const lineDeco = Decoration.line({
                        attributes: {
                            style: `border-radius: 4px; padding: 1px 15px; border-left: 4px solid ${config.color}; background-color: ${config.bgColor}; line-height: 1.6;`
                        }
                    });
                    builder.add(line.from, line.from, lineDeco);
                    
                    // 如果是标题行，高亮类型文本（允许前导空格）
                    const trimmed = text.trimStart();
                    if (trimmed.startsWith('> [!')) {
                        const typeStart = line.from + text.indexOf('[!') + 2;
                        const typeEnd = line.from + text.indexOf(']');
                        if (typeEnd > typeStart) {
                            const markDeco = Decoration.mark({
                                attributes: {
                                    style: `color: ${config.color}; font-weight: 600; font-size: 0.85em;`
                                }
                            });
                            builder.add(typeStart, typeEnd, markDeco);
                        }
                    }
                }
                i++;
                continue;
            }
            
            // 标题 (h1-h6)
            if (pluginSettings.enableHeadingStyles) {
                const headingMatch = text.match(/^(#{1,6})\s/);
                if (headingMatch) {
                    const level = headingMatch[1].length as keyof typeof headingStyles;
                    const style = headingStyles[level];
                    
                    if (style) {
                        const lineDeco = Decoration.line({
                            attributes: {
                                style: style
                            }
                        });
                        builder.add(line.from, line.from, lineDeco);
                        i++;
                        continue;
                    }
                }
            }
            
            // 普通引用块 (blockquote) - 允许前导空格
            const trimmed = text.trimStart();
            if (pluginSettings.enableBlockquoteStyles && trimmed.startsWith('> ') && trimmed.length > 2) {
                const lineDeco = Decoration.line({
                    attributes: {
                        style: `border-radius: 4px; padding: 1px 15px; border-left: 4px solid #e95f59; background-color: #fdefee; color: #333333; line-height: 1.6;`
                    }
                });
                builder.add(line.from, line.from, lineDeco);
            }
            
            i++;
        }

        return builder.finish();

        /* 原有代码暂时注释
        // 一次性扫描所有代码块和 Alert 块，标记特殊行
        const codeBlockLines = new Set<number>();
        const alertLineTypes = new Map<number, string>(); // 行号 -> Alert 类型
        
        let inCodeBlock = false;
        let currentAlertType: string | null = null;
        
        for (let i = 1; i <= doc.lines; i++) {
            const line = doc.line(i);
            const text = line.text.trim();
            
            // 扫描代码块
            if (text.startsWith('```')) {
                inCodeBlock = !inCodeBlock;
                codeBlockLines.add(i);
            } else if (inCodeBlock) {
                codeBlockLines.add(i);
            }
            
            // 扫描 Alert 块（不在代码块内时）
            if (!inCodeBlock && pluginSettings.enableGitHubAlerts) {
                const alertMatch = line.text.match(/^>\s*\[!(\w+)\]/);
                if (alertMatch) {
                    // Alert 开始
                    currentAlertType = alertMatch[1].toUpperCase();
                    alertLineTypes.set(i, currentAlertType);
                } else if (currentAlertType && line.text.match(/^>\s+\S/)) {
                    // Alert 内容行
                    alertLineTypes.set(i, currentAlertType);
                } else if (!line.text.match(/^>\s/)) {
                    // Alert 结束
                    currentAlertType = null;
                }
            }
        }

        let i = 1;
        while (i <= doc.lines) {
            const line = doc.line(i);
            const text = line.text;
            
            // 如果在代码块内，跳过所有样式应用
            if (codeBlockLines.has(i)) {
                i++;
                continue;
            }
            
            // 检查是否是表格分隔行，如果是则处理整个表格
            // 暂时禁用表格渲染以排查问题
            if (false && pluginSettings.enableTableRendering && text.match(/^\s*\|?[\s:]*-+[\s:]*\|/)) {
                const tableEndLine = this.renderTable(doc, builder, i, codeBlockLines);
                i = tableEndLine + 1;
                continue;
            }

            // 检测 GitHub Alert（使用预扫描的结果）
            if (pluginSettings.enableGitHubAlerts && alertLineTypes.has(i)) {
                const alertType = alertLineTypes.get(i)!;
                const config = alertTypes[alertType as keyof typeof alertTypes];

                if (config) {
                    // 为整行添加样式
                    const lineDeco = Decoration.line({
                        attributes: {
                            style: `border-radius: 4px; padding: 1px 15px; border-left: 4px solid ${config.color}; background-color: ${config.bgColor}; line-height: 1.6;`
                        }
                    });
                    builder.add(line.from, line.from, lineDeco);

                    // 如果是标题行，为 TYPE 文本添加样式
                    const alertMatch = text.match(/^>\s*\[!(\w+)\]/);
                    if (alertMatch) {
                        const typeStart = line.from + text.indexOf('[!') + 2;
                        const typeEnd = line.from + text.indexOf(']');
                        if (typeEnd > typeStart) {
                            const markDeco = Decoration.mark({
                                attributes: {
                                    style: `color: ${config.color}; font-weight: 500; font-size: 0.85em; font-weight: bold;`
                                }
                            });
                            builder.add(typeStart, typeEnd, markDeco);
                        }
                    }
                }
                i++;
                continue;
            }

            // 检测标题 (h1-h6)
            if (pluginSettings.enableHeadingStyles) {
                const headingMatch = text.match(/^(#{1,6})\s+(.+)/);
                if (headingMatch) {
                    const level = headingMatch[1].length as keyof typeof headingStyles;
                    const style = headingStyles[level];
                    
                    if (style) {
                        const lineDeco = Decoration.line({
                            attributes: {
                                style: style
                            }
                        });
                        builder.add(line.from, line.from, lineDeco);
                    }
                    continue;
                }
            }

            // 检测普通引用块 (blockquote) - 只有非 alert 的引用
            if (pluginSettings.enableBlockquoteStyles && text.match(/^>\s/)) {
                const lineDeco = Decoration.line({
                    attributes: {
                        style: `border-radius: 4px; padding: 1px 15px; border-left: 4px solid #e95f59; background-color: #fdefee; color: #333333; line-height: 1.6;`
                    }
                });
                builder.add(line.from, line.from, lineDeco);
            }
            
            i++;
        }

        return builder.finish();
        */
    }

    // 渲染单个表格，返回表格结束行号
    renderTable(doc: any, builder: RangeSetBuilder<Decoration>, dividerLine: number, codeBlockLines: Set<number>): number {
        const i = dividerLine;
        
        // 找到表格的起始和结束
        let tableStart = i - 1;
        let tableEnd = i;
        
        // 向前查找表头
        while (tableStart >= 1) {
            const prevLine = doc.line(tableStart);
            if (prevLine.text.match(/^\s*\|/)) {
                tableStart--;
            } else {
                tableStart++;
                break;
            }
        }
        if (tableStart < 1) tableStart = 1;
        
        // 向后查找表格内容（从分隔行的下一行开始）
        let searchLine = i + 1;
        while (searchLine <= doc.lines) {
            const nextLine = doc.line(searchLine);
            if (nextLine.text.match(/^\s*\|/)) {
                tableEnd = searchLine;
                searchLine++;
            } else {
                break;
            }
        }
        
        // 为表格的每一行添加样式
        for (let j = tableStart; j <= tableEnd; j++) {
            const tableLine = doc.line(j);
            const isHeader = j < i;
            const isDivider = j === i;
            const isFirstRow = j === tableStart;
            const isLastRow = j === tableEnd;
                    // 数据行索引（分隔行之后的行数）
                    const dataRowIndex = j > i ? (j - i - 1) : 0;
                    const isEvenDataRow = dataRowIndex % 2 === 0;
                    
                    let style = '';
                    
                    if (isDivider) {
                        // 分隔行：极窄，只显示边框
                        style += 'height: 4px; line-height: 4px; font-size: 2px; color: #d0d7de; background-color: #e1e4e8; border-top: 1px solid #d0d7de; border-bottom: 1px solid #d0d7de; overflow: hidden;';
                    } else if (isHeader) {
                        // 表头行：稍大字体，加粗，浅灰背景
                        style += 'font-size: 1.05em; font-weight: 600; background-color: #f6f8fa; padding: 10px 0;';
                        if (isFirstRow) {
                            style += ' border-top: 2px solid #d0d7de;';
                        }
                    } else {
                        // 数据行：交替背景色，第一行从白色开始
                        const bgColor = isEvenDataRow ? '#ffffff' : '#f8f8f8';
                        style += `background-color: ${bgColor}; padding: 8px 0;`;
                        if (isLastRow) {
                            style += ' border-bottom: 2px solid #d0d7de;';
                        }
                    }
                    
                    const lineDeco = Decoration.line({
                        attributes: {
                            style: style
                        }
                    });
                    builder.add(tableLine.from, tableLine.from, lineDeco);
                    
                    // 美化表格分隔符 | - 让它们看起来像连续的竖线
                    const pipeMatches = [...tableLine.text.matchAll(/\|/g)];
                    for (const match of pipeMatches) {
                        if (match.index !== undefined) {
                            const pipePos = tableLine.from + match.index;
                            let pipeStyle = '';
                            
                            if (isDivider) {
                                // 分隔行的管道符：更宽的分隔线，上下延伸覆盖整行
                                pipeStyle = 'color: transparent; background: linear-gradient(to right, transparent 40%, #c0c5cc 40%, #c0c5cc 60%, transparent 60%); padding: 0 6px; margin: 0 4px; display: inline-block; height: 100%;';
                            } else {
                                // 普通行的管道符：用更宽的边框模拟竖线
                                pipeStyle = 'color: transparent; border-left: 2px solid #c0c5cc; padding: 0 7px; margin: 0 3px; box-sizing: border-box; display: inline-block;';
                            }
                            
                            const pipeDeco = Decoration.mark({
                                attributes: {
                                    style: pipeStyle
                                }
                            });
                            builder.add(pipePos, pipePos + 1, pipeDeco);
                        }
                    }
                }
        
        return tableEnd;
    }
}, {
    decorations: v => v.decorations
});

export default (context: { contentScriptId: string, postMessage: any }) => {
    return {
        plugin: async (codeMirrorWrapper: any) => {
            // 从 Joplin 获取设置
            const settings = await (context as any).postMessage({ name: 'getSettings' });
            if (settings) {
                pluginSettings.enableGitHubAlerts = settings.enableGitHubAlerts;
                pluginSettings.enableHeadingStyles = settings.enableHeadingStyles;
                pluginSettings.enableBlockquoteStyles = settings.enableBlockquoteStyles;
                pluginSettings.enableTableRendering = settings.enableTableRendering;
            }

            const enableInlineCode = settings ? settings.enableInlineCode : true;
            const enableLinkColor = settings ? settings.enableLinkColor : true;
            const inlineCodeColor = settings ? settings.inlineCodeColor : '#d63200';
            const linkColor = settings ? settings.linkColor : '#d63200';

            // 构建主题样式对象
            const themeStyles: any = {};
            
            if (enableInlineCode) {
                themeStyles[".cm-inlineCode"] = {
                    padding: "1.3px 3px !important",
                    borderRadius: "6px !important",
                    marginLeft: "5px !important",
                    marginRight: "5px !important",
                    marginBottom: "5px !important",
                    color: `${inlineCodeColor} !important`
                };
            } else {
                // 如果禁用，重置为默认样式
                themeStyles[".cm-inlineCode"] = {
                    padding: "initial !important",
                    borderRadius: "initial !important",
                    marginLeft: "initial !important",
                    marginRight: "initial !important",
                    marginBottom: "initial !important",
                    color: "initial !important"
                };
            }
            
            if (enableLinkColor) {
                themeStyles[".tok-link"] = {
                    color: `${linkColor} !important`
                };
                themeStyles[".tok-url"] = {
                    color: `${linkColor} !important`
                };
            } else {
                // 如果禁用，重置为默认样式
                themeStyles[".tok-link"] = {
                    color: "initial !important"
                };
                themeStyles[".tok-url"] = {
                    color: "initial !important"
                };
            }

            // 使用 baseTheme 定义样式
            const customTheme = EditorView.baseTheme(themeStyles);
            
            // 创建装饰插件
            const decorationPlugin = createDecorationPlugin();
            
            // 创建标题快捷键映射
            const headingKeymap = keymap.of([
                { key: 'Ctrl-1', run: headingCommands.toggleHeading1 },
                { key: 'Ctrl-2', run: headingCommands.toggleHeading2 },
                { key: 'Ctrl-3', run: headingCommands.toggleHeading3 },
                { key: 'Ctrl-4', run: headingCommands.toggleHeading4 },
                { key: 'Ctrl-5', run: headingCommands.toggleHeading5 },
                { key: 'Ctrl-6', run: headingCommands.toggleHeading6 },
            ]);
            
            // 创建表格编辑快捷键映射
            const tableKeymap = keymap.of([
                { key: 'Mod-Shift-f', run: tableEditCommands.formatTable },
                { key: 'Mod-Enter', run: tableEditCommands.addRowBelow },
                { key: 'Mod-Tab', run: tableEditCommands.addColumnRight },
            ]);
            
            // 创建数学公式快捷键映射 (Ctrl+$)
            const mathKeymap = keymap.of([
                { key: 'Ctrl-Shift-4', run: toggleInlineMath }, // Ctrl+$ (Shift+4 = $)
            ]);
            
            // 创建引用块快捷键映射 (Ctrl+Shift+. 避免中文输入法冲突)
            const blockquoteKeymap = keymap.of([
                { key: 'Ctrl-.', run: blockquoteCommands.toggleBlockquote },
                // GitHub Alerts 快捷键
                { key: 'Ctrl-Shift-1', run: blockquoteCommands.toggleAlertNote },      // Ctrl+Shift+1 -> [!NOTE]
                { key: 'Ctrl-Shift-2', run: blockquoteCommands.toggleAlertTip },       // Ctrl+Shift+2 -> [!TIP]
                { key: 'Ctrl-Shift-3', run: blockquoteCommands.toggleAlertWarning },   // Ctrl+Shift+3 -> [!WARNING]
                { key: 'Ctrl-Shift-4', run: blockquoteCommands.toggleAlertImportant }, // Ctrl+Shift+4 -> [!IMPORTANT]
            ]);
            
            // 在 codeMirrorWrapper 上注册表格命令
            codeMirrorWrapper.defineExtension('formatTable', function() {
                const cm6 = (this as any)?.cm6;
                // this.cm6 本身就是 EditorView
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    tableEditCommands.formatTable(view);
                    return true;
                }
                return false;
            });
            
            codeMirrorWrapper.defineExtension('addRowAbove', function() {
                const cm6 = (this as any)?.cm6;
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    tableEditCommands.addRowAbove(view);
                    return true;
                }
                return false;
            });
            
            codeMirrorWrapper.defineExtension('addRowBelow', function() {
                const cm6 = (this as any)?.cm6;
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    tableEditCommands.addRowBelow(view);
                    return true;
                }
                return false;
            });
            
            codeMirrorWrapper.defineExtension('deleteRow', function() {
                const cm6 = (this as any)?.cm6;
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    tableEditCommands.deleteRow(view);
                    return true;
                }
                return false;
            });
            
            codeMirrorWrapper.defineExtension('addColumnLeft', function() {
                const cm6 = (this as any)?.cm6;
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    tableEditCommands.addColumnLeft(view);
                    return true;
                }
                return false;
            });
            
            codeMirrorWrapper.defineExtension('addColumnRight', function() {
                const cm6 = (this as any)?.cm6;
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    tableEditCommands.addColumnRight(view);
                    return true;
                }
                return false;
            });
            
            codeMirrorWrapper.defineExtension('deleteColumn', function() {
                const cm6 = (this as any)?.cm6;
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    tableEditCommands.deleteColumn(view);
                    return true;
                }
                return false;
            });
            
            codeMirrorWrapper.defineExtension('alignLeft', function() {
                const cm6 = (this as any)?.cm6;
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    tableEditCommands.alignLeft(view);
                    return true;
                }
                return false;
            });
            
            codeMirrorWrapper.defineExtension('alignCenter', function() {
                const cm6 = (this as any)?.cm6;
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    tableEditCommands.alignCenter(view);
                    return true;
                }
                return false;
            });
            
            codeMirrorWrapper.defineExtension('alignRight', function() {
                const cm6 = (this as any)?.cm6;
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    tableEditCommands.alignRight(view);
                    return true;
                }
                return false;
            });
            
            codeMirrorWrapper.defineExtension('alignClear', function() {
                const cm6 = (this as any)?.cm6;
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    tableEditCommands.alignClear(view);
                    return true;
                }
                return false;
            });
            
            // 创建空表格
            codeMirrorWrapper.defineExtension('createTable', function(cols: number, rows: number) {
                const cm6 = (this as any)?.cm6;
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    // 生成表格模板
                    const headerRow = '| ' + Array(cols).fill('Header').join(' | ') + ' |';
                    const separatorRow = '| ' + Array(cols).fill('---').join(' | ') + ' |';
                    const dataRows = Array(rows).fill(null).map(() => 
                        '| ' + Array(cols).fill('Cell').join(' | ') + ' |'
                    ).join('\n');
                    
                    const tableText = `${headerRow}\n${separatorRow}\n${dataRows}\n`;
                    
                    // 插入到当前位置
                    const pos = view.state.selection.main.head;
                    view.dispatch({
                        changes: { from: pos, to: pos, insert: tableText },
                        selection: { anchor: pos + tableText.length }
                    });
                    return true;
                }
                return false;
            });
            
            // 切换表格工具栏显示
            codeMirrorWrapper.defineExtension('toggleTableToolbar', function() {
                console.log('toggleTableToolbar called');
                const cm6 = (this as any)?.cm6;
                console.log('cm6:', cm6);
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                console.log('view:', view);
                if (view) {
                    try {
                        const currentState = view.state.field(tableToolbarState);
                        console.log('Current toolbar state:', currentState);
                        view.dispatch({
                            effects: toggleTableToolbar.of(!currentState)
                        });
                        console.log('Toggled to:', !currentState);
                        return true;
                    } catch (error) {
                        console.error('Error in toggleTableToolbar:', error);
                        return false;
                    }
                }
                console.warn('No view found');
                return false;
            });
            
            // 切换内联数学公式
            codeMirrorWrapper.defineExtension('toggleInlineMath', function() {
                console.log('toggleInlineMath called');
                const cm6 = (this as any)?.cm6;
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    try {
                        toggleInlineMath(view);
                        return true;
                    } catch (error) {
                        console.error('Error in toggleInlineMath:', error);
                        return false;
                    }
                }
                console.warn('No view found for toggleInlineMath');
                return false;
            });
            
            // 切换引用块 (Ctrl+Shift+.)
            codeMirrorWrapper.defineExtension('toggleBlockquote', function() {
                console.log('toggleBlockquote called');
                const cm6 = (this as any)?.cm6;
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    try {
                        blockquoteCommands.toggleBlockquote(view);
                        return true;
                    } catch (error) {
                        console.error('Error in toggleBlockquote:', error);
                        return false;
                    }
                }
                console.warn('No view found for toggleBlockquote');
                return false;
            });
            
            // 切换 GitHub Alerts
            codeMirrorWrapper.defineExtension('toggleAlertNote', function() {
                const cm6 = (this as any)?.cm6;
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    try {
                        blockquoteCommands.toggleAlertNote(view);
                        return true;
                    } catch (error) {
                        console.error('Error in toggleAlertNote:', error);
                        return false;
                    }
                }
                return false;
            });
            
            codeMirrorWrapper.defineExtension('toggleAlertTip', function() {
                const cm6 = (this as any)?.cm6;
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    try {
                        blockquoteCommands.toggleAlertTip(view);
                        return true;
                    } catch (error) {
                        console.error('Error in toggleAlertTip:', error);
                        return false;
                    }
                }
                return false;
            });
            
            codeMirrorWrapper.defineExtension('toggleAlertWarning', function() {
                const cm6 = (this as any)?.cm6;
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    try {
                        blockquoteCommands.toggleAlertWarning(view);
                        return true;
                    } catch (error) {
                        console.error('Error in toggleAlertWarning:', error);
                        return false;
                    }
                }
                return false;
            });
            
            codeMirrorWrapper.defineExtension('toggleAlertImportant', function() {
                const cm6 = (this as any)?.cm6;
                const view = cm6 instanceof EditorView ? cm6 : cm6?.view;
                if (view) {
                    try {
                        blockquoteCommands.toggleAlertImportant(view);
                        return true;
                    } catch (error) {
                        console.error('Error in toggleAlertImportant:', error);
                        return false;
                    }
                }
                return false;
            });
            
            codeMirrorWrapper.addExtension([
                customTheme, 
                decorationPlugin, 
                headingKeymap, 
                tableKeymap,
                mathKeymap,
                blockquoteKeymap,
                tableToolbarState
            ]);
        },
        assets: () => {
            return [{ name: './style.css' }];
        }
    };
};