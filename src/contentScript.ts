import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, keymap } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { headingCommands } from './headingCommands';
import { tableEditCommands } from './tableEditCommands';
import { tableToolbarState, toggleTableToolbar } from './tableToolbarPanel';

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
        if (update.docChanged || update.viewportChanged) {
            this.decorations = this.buildDecorations(update.view);
        }
    }

    buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const doc = view.state.doc;

        for (let i = 1; i <= doc.lines; i++) {
            const line = doc.line(i);
            const text = line.text;

            // 检测 GitHub Alert 语法: > [!TYPE]
            if (pluginSettings.enableGitHubAlerts) {
                const alertMatch = text.match(/^>\s*\[!(\w+)\]/);
                if (alertMatch) {
                    const alertType = alertMatch[1].toUpperCase();
                    const config = alertTypes[alertType as keyof typeof alertTypes];

                    if (config) {
                        // 为整行添加样式（包括标题行）
                        const lineDeco = Decoration.line({
                            attributes: {
                                style: `border-radius: 4px; padding: 1px 15px; border-left: 4px solid ${config.color}; background-color: ${config.bgColor}; line-height: 1.6;`
                            }
                        });
                        builder.add(line.from, line.from, lineDeco);

                        // 只为 TYPE 文本添加样式，避免影响括号匹配
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
                    continue;
                }

                // 检测 GitHub Alert 的内容行（以 > 开头但不是标题行，且有实际内容）
                if (text.match(/^>\s+\S/) && i > 1) {
                    const prevLine = doc.line(i - 1);
                    const prevText = prevLine.text;
                    // 检查前面的行是否是 alert 标题或 alert 内容行
                    const prevAlertMatch = prevText.match(/^>\s*\[!(\w+)\]/);
                    const prevIsAlertContent = prevText.match(/^>\s+\S/);
                    
                    if (prevAlertMatch || prevIsAlertContent) {
                        // 向上查找真正的 alert 标题行
                        let alertType = null;
                        if (prevAlertMatch) {
                            alertType = prevAlertMatch[1].toUpperCase();
                        } else if (prevIsAlertContent) {
                            // 继续向上查找 alert 标题
                            for (let j = i - 2; j >= 1; j--) {
                                const checkLine = doc.line(j);
                                const checkText = checkLine.text;
                                const checkMatch = checkText.match(/^>\s*\[!(\w+)\]/);
                                if (checkMatch) {
                                    alertType = checkMatch[1].toUpperCase();
                                    break;
                                }
                                if (!checkText.match(/^>\s/)) {
                                    break;
                                }
                            }
                        }
                        
                        if (alertType) {
                            const config = alertTypes[alertType as keyof typeof alertTypes];
                            if (config) {
                                const lineDeco = Decoration.line({
                                    attributes: {
                                        style: `border-radius: 4px; padding: 1px 15px; border-left: 4px solid ${config.color}; background-color: ${config.bgColor}; line-height: 1.6;`
                                    }
                                });
                                builder.add(line.from, line.from, lineDeco);
                                continue;
                            }
                        }
                    }
                }
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
        }

        // 检测并渲染表格
        if (pluginSettings.enableTableRendering) {
            this.renderTables(doc, builder);
        }

        return builder.finish();
    }

    renderTables(doc: any, builder: RangeSetBuilder<Decoration>) {
        let i = 1;
        while (i <= doc.lines) {
            const line = doc.line(i);
            const text = line.text;
            
            // 检测表格分隔行 (|---|---|)
            if (text.match(/^\s*\|?[\s:]*-+[\s:]*\|/)) {
                // 找到表格的起始和结束
                let tableStart = i - 1;
                let tableEnd = i + 1;
                
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
                
                // 向后查找表格内容
                while (tableEnd <= doc.lines) {
                    const nextLine = doc.line(tableEnd);
                    if (nextLine.text.match(/^\s*\|/)) {
                        tableEnd++;
                    } else {
                        tableEnd--;
                        break;
                    }
                }
                if (tableEnd > doc.lines) tableEnd = doc.lines;
                
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
                
                i = tableEnd + 1;
                continue;
            }
            i++;
        }
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
            
            codeMirrorWrapper.addExtension([
                customTheme, 
                decorationPlugin, 
                headingKeymap, 
                tableKeymap,
                tableToolbarState
            ]);
        },
        assets: () => {
            return [{ name: './style.css' }];
        }
    };
};