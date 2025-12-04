import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, keymap } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { headingCommands } from './headingCommands';

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

        return builder.finish();
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
            
            codeMirrorWrapper.addExtension([customTheme, decorationPlugin, headingKeymap]);
        },
        assets: () => {
            return [{ name: './style.css' }];
        },
    };
};