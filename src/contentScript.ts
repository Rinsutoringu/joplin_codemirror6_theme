import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, keymap } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { headingCommands } from './headingCommands';
import { tableEditCommands } from './tableEditCommands';
import { tableToolbarState, toggleTableToolbar } from './tableToolbarPanel';
import { toggleInlineMath } from './mathCommands';
import { blockquoteCommands } from './blockquoteCommands';
import { tableRenderPlugin } from './tableRenderPlugin';

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
        const MAX_LINES = 2000;
        if (doc.lines > MAX_LINES) {
            return builder.finish();
        }
        // 计算行首连续 > 的深度（支持 > 之间任意数量空格）
        function getQuoteDepth(text: string): number {
            let i = 0;
            while (i < text.length && text[i] === ' ') i++;
            let depth = 0;
            while (i < text.length && text[i] === '>') {
                depth++;
                i++;
                // 跳过 > 后任意数量空格
                while (i < text.length && text[i] === ' ') i++;
            }
            return depth;
        }
        // 去掉行首 depth 层 > 前缀，返回剩余内容
        function stripQuotePrefix(text: string, depth: number): string {
            let s = text.trimStart();
            for (let d = 0; d < depth; d++) {
                if (s.startsWith('>')) {
                    s = s.slice(1);
                    // 跳过 > 后任意数量空格
                    while (s.length > 0 && s[0] === ' ') s = s.slice(1);
                }
            }
            return s;
        }
        // ── 第一遍扫描 ──────────────────────────────────────────────────────────
        const codeBlockLines = new Set<number>();
        const fenceLineLangs = new Map<number, string | null>();
        // alertLineInfo: 行号 -> { type, depth }
        const alertLineInfo = new Map<number, { type: string; depth: number }>();
        // blockquoteLineDepths: 行号 -> 引用深度（1-based）
        const blockquoteLineDepths = new Map<number, number>();
        // quotedCodeLines: 引用块内的代码块行 -> { quoteDepth, isFence, lang? }
        const quotedCodeLines = new Map<number, { quoteDepth: number; isFence: boolean; lang?: string }>();
        // quoteCharPositions: 行号 -> 各层 > 字符的列偏移数组（按层级顺序）
        const quoteCharPositions = new Map<number, number[]>();
        let inGlobalCode = false;
        let currentAlert: { type: string; depth: number } | null = null;
        let currentBQDepth = 0;
        let inQuotedCode = false;
        let quotedCodeDepth = 0;
        const pendingEmptyLines: number[] = [];
        let pendingType: 'alert' | 'blockquote' | null = null;
        // 解析行首各层 > 的列偏移（支持任意空格）
        function parseQuotePositions(text: string): number[] {
            const positions: number[] = [];
            let idx = 0;
            while (idx < text.length && text[idx] === ' ') idx++;
            while (idx < text.length && text[idx] === '>') {
                positions.push(idx);
                idx++;
                while (idx < text.length && text[idx] === ' ') idx++;
            }
            return positions;
        }
        for (let i = 1; i <= doc.lines; i++) {
            const line = doc.line(i);
            const text = line.text;
            const trimmed = text.trimStart();
            const depth = getQuoteDepth(text);
            const isQuoteLine = depth > 0;
            const isEmpty = trimmed === '';
            // 记录 > 字符位置
            if (isQuoteLine) {
                quoteCharPositions.set(i, parseQuotePositions(text));
            }
            // ── 引用块内的代码块处理 ────────────────────────────────────────────
            if (isQuoteLine) {
                const inner = stripQuotePrefix(text, depth);
                // ``` 代码块
                const innerFence = inner.match(/^```(\S*)/);
                if (innerFence && !inGlobalCode) {
                    if (!inQuotedCode) {
                        inQuotedCode = true;
                        quotedCodeDepth = depth;
                        const lang = innerFence[1] || null;
                        quotedCodeLines.set(i, { quoteDepth: depth, isFence: true, lang: lang || undefined });
                        continue;
                    } else if (depth === quotedCodeDepth) {
                        quotedCodeLines.set(i, { quoteDepth: depth, isFence: true });
                        inQuotedCode = false;
                        quotedCodeDepth = 0;
                        continue;
                    }
                }
                if (inQuotedCode && depth >= quotedCodeDepth) {
                    quotedCodeLines.set(i, { quoteDepth: quotedCodeDepth, isFence: false });
                    continue;
                }
            } else if (inQuotedCode && isEmpty) {
                quotedCodeLines.set(i, { quoteDepth: quotedCodeDepth, isFence: false });
                continue;
            } else if (inQuotedCode && !isEmpty) {
                inQuotedCode = false;
                quotedCodeDepth = 0;
            }
            // ── 全局代码块 fence 行 ─────────────────────────────────────────────
            const fenceMatch = trimmed.match(/^```(\S*)/);
            if (fenceMatch && !isQuoteLine) {
                const lang = fenceMatch[1] && fenceMatch[1].length ? fenceMatch[1] : null;
                fenceLineLangs.set(i, lang);
                inGlobalCode = !inGlobalCode;
                codeBlockLines.add(i);
                if (inGlobalCode) {
                    pendingEmptyLines.length = 0;
                    pendingType = null;
                    currentAlert = null;
                    currentBQDepth = 0;
                }
                continue;
            } else if (inGlobalCode && !isQuoteLine) {
                codeBlockLines.add(i);
                continue;
            }
            if (inGlobalCode) continue;
            // ── Alert 检测（优先于普通引用块）──────────────────────────────────
            if (pluginSettings.enableGitHubAlerts && isQuoteLine) {
                const inner = stripQuotePrefix(text, depth);
                const alertMatch = inner.match(/^\[!(\w+)\]/);
                if (alertMatch) {
                    for (const el of pendingEmptyLines) {
                        alertLineInfo.set(el, { type: alertMatch[1].toUpperCase(), depth });
                    }
                    pendingEmptyLines.length = 0;
                    pendingType = null;
                    currentAlert = { type: alertMatch[1].toUpperCase(), depth };
                    currentBQDepth = 0;
                    alertLineInfo.set(i, currentAlert);
                    continue;
                }
            }
            if (currentAlert) {
                if (isQuoteLine && depth >= currentAlert.depth) {
                    for (const el of pendingEmptyLines) alertLineInfo.set(el, currentAlert);
                    pendingEmptyLines.length = 0;
                    pendingType = null;
                    alertLineInfo.set(i, currentAlert);
                } else if (isEmpty) {
                    pendingEmptyLines.push(i);
                    pendingType = 'alert';
                } else {
                    // 退出当前 alert，检查是否属于外层引用块
                    if (isQuoteLine) {
                        // 该行是引用块，记录为外层 blockquote
                        for (const el of pendingEmptyLines) {
                            blockquoteLineDepths.set(el, currentBQDepth || depth);
                        }
                        pendingEmptyLines.length = 0;
                        pendingType = null;
                        currentBQDepth = depth;
                        blockquoteLineDepths.set(i, depth);
                    } else {
                        pendingEmptyLines.length = 0;
                        pendingType = null;
                    }
                    currentAlert = null;
                }
            }
            // ── 普通引用块检测 ──────────────────────────────────────────────────
            if (pluginSettings.enableBlockquoteStyles && !currentAlert) {
                if (isQuoteLine) {
                    for (const el of pendingEmptyLines) {
                        blockquoteLineDepths.set(el, currentBQDepth || depth);
                    }
                    pendingEmptyLines.length = 0;
                    pendingType = null;
                    currentBQDepth = depth;
                    blockquoteLineDepths.set(i, depth);
                } else if (isEmpty && currentBQDepth > 0) {
                    pendingEmptyLines.push(i);
                    pendingType = 'blockquote';
                } else if (!isEmpty) {
                    pendingEmptyLines.length = 0;
                    pendingType = null;
                    currentBQDepth = 0;
                }
            }
        }
        // 嵌套引用块颜色配置
        const bqDepthStyles = [
            { border: '#e95f59', bg: '#fdefee' },  // depth 1
            { border: '#d97706', bg: '#fef3e2' },  // depth 2
            { border: '#7c3aed', bg: '#f5f0ff' },  // depth 3
            { border: '#0969da', bg: '#eef4ff' },  // depth 4+
        ];
        function getBQStyle(d: number) {
            return bqDepthStyles[Math.min(d - 1, bqDepthStyles.length - 1)];
        }
        // ── 辅助：给引用行的各层 > 字符添加对应层级颜色的 mark ──────────────────
        function addQuoteCharMarks(lineFrom: number, lineNum: number) {
            const positions = quoteCharPositions.get(lineNum);
            if (!positions) return;
            for (let d = 0; d < positions.length; d++) {
                const style = getBQStyle(d + 1);
                const col = positions[d];
                builder.add(
                    lineFrom + col,
                    lineFrom + col + 1,
                    Decoration.mark({ attributes: { style: `background-color: ${style.bg}; color: ${style.border};` } })
                );
            }
        }
        // ── 第二遍：添加装饰 ────────────────────────────────────────────────────

        let i = 1;
        while (i <= doc.lines) {
            const line = doc.line(i);
            const text = line.text;
            // 引用块内的代码块行
            if (quotedCodeLines.has(i)) {
                const info = quotedCodeLines.get(i)!;
                const bqStyle = getBQStyle(info.quoteDepth);
                const paddingLeft = 15 + (info.quoteDepth - 1) * 16;
                const codeBg = info.isFence ? bqStyle.bg : '#f0f0f0';
                builder.add(line.from, line.from, Decoration.line({
                    attributes: {
                        style: `padding: 1px ${paddingLeft}px; border-left: 4px solid ${bqStyle.border}; background-color: ${codeBg}; color: #6a737d; font-style: ${info.isFence ? 'italic' : 'normal'}; line-height: 1.6;`
                    }
                }));
                addQuoteCharMarks(line.from, i);
                if (info.isFence && info.lang) {
                    const backtickIdx = text.indexOf('```');
                    if (backtickIdx >= 0) {
                        const langIdx = text.indexOf(info.lang, backtickIdx + 3);
                        if (langIdx >= 0) {
                            builder.add(
                                line.from + langIdx,
                                line.from + langIdx + info.lang.length,
                                Decoration.mark({ attributes: { style: 'color: #d73a49; font-weight: 700;' } })
                            );
                        }
                    }
                }
                i++;
                continue;
            }
            // 全局代码块行
            if (codeBlockLines.has(i)) {
                if (fenceLineLangs.has(i)) {
                    const lang = fenceLineLangs.get(i);
                    builder.add(line.from, line.from, Decoration.line({
                        attributes: { style: 'background: #f6f8fa; color: #6a737d; font-style: italic; padding: 4px 8px;' }
                    }));
                    if (lang) {
                        const backtickIndex = text.indexOf('```');
                        if (backtickIndex >= 0) {
                            const langIndex = text.indexOf(lang, backtickIndex + 3);
                            if (langIndex >= 0) {
                                builder.add(
                                    line.from + langIndex,
                                    line.from + langIndex + lang.length,
                                    Decoration.mark({ attributes: { style: 'color: #d73a49; font-weight: 700;' } })
                                );
                            }
                        }
                    }
                }
                i++;
                continue;
            }
            // GitHub Alerts（含嵌套）
            if (alertLineInfo.has(i)) {
                const info = alertLineInfo.get(i)!;
                const config = alertTypes[info.type as keyof typeof alertTypes];
                if (config) {
                    const depthAlpha = Math.min(0.06 + (info.depth - 1) * 0.04, 0.22);
                    const bgColor = config.bgColor.replace(/[\d.]+\)$/, `${depthAlpha})`);
                    const paddingLeft = 15 + (info.depth - 1) * 16;
                    builder.add(line.from, line.from, Decoration.line({
                        attributes: {
                            style: `border-radius: 4px; padding: 1px ${paddingLeft}px; border-left: 4px solid ${config.color}; background-color: ${bgColor}; line-height: 1.6;`
                        }
                    }));
                    if (line.to > line.from) {
                        builder.add(line.from, line.to, Decoration.mark({ attributes: { style: 'color: #333333 !important;' } }));
                    }
                    addQuoteCharMarks(line.from, i);
                    const bracketIdx = text.indexOf('[!');
                    if (bracketIdx >= 0) {
                        const closeIdx = text.indexOf(']', bracketIdx);
                        if (closeIdx > bracketIdx) {
                            builder.add(
                                line.from + bracketIdx + 2,
                                line.from + closeIdx,
                                Decoration.mark({ attributes: { style: `color: ${config.color}; font-weight: 600; font-size: 0.85em;` } })
                            );
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
                        builder.add(line.from, line.from, Decoration.line({ attributes: { style } }));
                        i++;
                        continue;
                    }
                }
            }
            // 普通引用块（含嵌套）
            if (pluginSettings.enableBlockquoteStyles && blockquoteLineDepths.has(i)) {
                const d = blockquoteLineDepths.get(i)!;
                const bqStyle = getBQStyle(d);
                const paddingLeft = 15 + (d - 1) * 16;
                builder.add(line.from, line.from, Decoration.line({
                    attributes: {
                        style: `border-radius: 4px; padding: 1px ${paddingLeft}px; border-left: 4px solid ${bqStyle.border}; background-color: ${bqStyle.bg}; color: #333333; line-height: 1.6;`
                    }
                }));
                if (line.to > line.from) {
                    builder.add(line.from, line.to, Decoration.mark({ attributes: { style: 'color: #333333 !important;' } }));
                }
                addQuoteCharMarks(line.from, i);
            }
            i++;
        }
        return builder.finish();
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
                pluginSettings.enableTableRendering ? tableRenderPlugin : [],
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