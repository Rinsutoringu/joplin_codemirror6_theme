import {
    MultiMarkdownTableParser,
    PrettyMultiMarkdownTableRenderer,
    Table,
    TableParser,
    TableRenderer,
} from "@felisdiligens/md-table-tools";

const multimdParser = new MultiMarkdownTableParser();
const multimdPrettyRenderer = new PrettyMultiMarkdownTableRenderer();

const separatorRegex = /^\|?([\s\.]*:?(?=([\-=\.]+))\2:?[\s\.]*\|?)+\+?$/m;

export function getMarkdownParser(): TableParser {
    return multimdParser;
}

export function getMarkdownRenderer(pretty: boolean = true): TableRenderer {
    return pretty ? multimdPrettyRenderer : multimdPrettyRenderer;
}

/**
 * 检测光标是否在表格中
 */
export function isCursorInTable(line: string, prevLine: string, nextLine: string): boolean {
    // 当前行是表格行
    if (line.trim().match(/^\|/)) return true;
    // 上一行是表格行
    if (prevLine && prevLine.trim().match(/^\|/)) return true;
    // 下一行是表格分隔行
    if (nextLine && nextLine.match(separatorRegex)) return true;
    return false;
}

/**
 * 获取表格的范围
 */
export function getTableRange(
    lines: string[],
    currentLineNum: number
): { start: number; end: number; dividerLine: number } | null {
    const currentLine = lines[currentLineNum];
    
    // 检查当前行是否是分隔行
    let dividerLine = -1;
    if (currentLine.match(separatorRegex)) {
        dividerLine = currentLineNum;
    } else {
        // 向下查找分隔行
        for (let i = currentLineNum + 1; i < lines.length; i++) {
            if (lines[i].match(separatorRegex)) {
                dividerLine = i;
                break;
            }
            if (!lines[i].trim().match(/^\|/)) break;
        }
        
        // 如果没找到，向上查找
        if (dividerLine === -1) {
            for (let i = currentLineNum - 1; i >= 0; i--) {
                if (lines[i].match(separatorRegex)) {
                    dividerLine = i;
                    break;
                }
                if (!lines[i].trim().match(/^\|/)) break;
            }
        }
    }
    
    if (dividerLine === -1) return null;
    
    // 找到表格的起始行
    let start = dividerLine - 1;
    while (start >= 0 && lines[start].trim().match(/^\|/)) {
        start--;
    }
    start++;
    
    // 找到表格的结束行
    let end = dividerLine + 1;
    while (end < lines.length && lines[end].trim().match(/^\|/)) {
        end++;
    }
    end--;
    
    return { start, end, dividerLine };
}

/**
 * 解析表格文本
 */
export function parseTable(tableText: string): Table {
    return multimdParser.parse(tableText);
}

/**
 * 渲染表格
 */
export function renderTable(table: Table, pretty: boolean = true): string {
    return getMarkdownRenderer(pretty).render(table);
}
