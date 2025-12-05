import { TextAlignment } from "@felisdiligens/md-table-tools";
import { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { getTableRange, parseTable, renderTable } from "./tableTools";

/**
 * 获取当前光标位置的表格内容和范围
 */
function getTableAtCursor(view: EditorView): {
    tableText: string;
    from: number;
    to: number;
    lineStart: number;
    lineEnd: number;
} | null {
    const { state } = view;
    const { from } = state.selection.main;
    const currentLine = state.doc.lineAt(from);
    const currentLineNum = currentLine.number - 1; // 转换为0-based

    // 获取所有行
    const lines = state.doc.toString().split('\n');
    
    const range = getTableRange(lines, currentLineNum);
    if (!range) return null;

    const { start, end } = range;
    
    // 计算表格文本的起始和结束位置
    const lineStart = start + 1; // 转换回1-based
    const lineEnd = end + 1;
    
    const fromPos = state.doc.line(lineStart).from;
    const toPos = state.doc.line(lineEnd).to;
    
    const tableText = state.doc.sliceString(fromPos, toPos);
    
    return {
        tableText,
        from: fromPos,
        to: toPos,
        lineStart,
        lineEnd
    };
}

/**
 * 替换表格
 */
function replaceTable(view: EditorView, callback: (tableText: string) => string | null): boolean {
    const tableInfo = getTableAtCursor(view);
    if (!tableInfo) return false;

    try {
        const newTableText = callback(tableInfo.tableText);
        if (newTableText === null) return false;

        view.dispatch({
            changes: {
                from: tableInfo.from,
                to: tableInfo.to,
                insert: newTableText
            }
        });
        return true;
    } catch (e) {
        console.error('Table operation failed:', e);
        return false;
    }
}

/**
 * 创建新表格
 */
export function createTable(view: EditorView, rows: number, columns: number, hasHeader: boolean): boolean {
    try {
        const table = new (require("@felisdiligens/md-table-tools").Table)(rows, columns);
        if (hasHeader) {
            table.addRow(0).isHeader = true;
        }
        table.update();
        
        const tableText = renderTable(table, true);
        const { from } = view.state.selection.main;
        
        view.dispatch({
            changes: { from, insert: '\n' + tableText + '\n' },
            selection: EditorSelection.cursor(from + tableText.length + 2)
        });
        
        return true;
    } catch (e) {
        console.error('Failed to create table:', e);
        return false;
    }
}

/**
 * 格式化表格
 */
export function formatTable(view: EditorView): boolean {
    return replaceTable(view, (tableText) => {
        const table = parseTable(tableText);
        return renderTable(table, true);
    });
}

/**
 * 添加行（在当前行之上）
 */
export function addRowAbove(view: EditorView): boolean {
    const tableInfo = getTableAtCursor(view);
    if (!tableInfo) return false;

    const currentLine = view.state.doc.lineAt(view.state.selection.main.from).number;
    const rowIndex = currentLine - tableInfo.lineStart;
    
    const newTableText = (() => {
        const table = parseTable(tableInfo.tableText);
        table.addRow(rowIndex);
        table.update();
        return renderTable(table, true);
    })();
    
    if (!newTableText) return false;
    
    // 计算新行的位置
    const newLines = newTableText.split('\n');
    let newRowLineIndex = rowIndex;
    // 跳过表头分隔符
    if (rowIndex === 0 && newLines.length > 1 && newLines[1].match(/^\s*\|?[\s:]*-+[\s:]*\|/)) {
        newRowLineIndex = 0;
    }
    
    // 找到新行中第一个单元格的位置（第一个 | 之后）
    const newRowLine = newLines[newRowLineIndex];
    const firstPipeIndex = newRowLine.indexOf('|');
    const cursorOffset = firstPipeIndex >= 0 ? firstPipeIndex + 2 : 1;
    
    // 计算新光标位置
    let newCursorPos = tableInfo.from;
    for (let i = 0; i < newRowLineIndex; i++) {
        newCursorPos += newLines[i].length + 1; // +1 for newline
    }
    newCursorPos += cursorOffset;
    
    view.dispatch({
        changes: {
            from: tableInfo.from,
            to: tableInfo.to,
            insert: newTableText
        },
        selection: EditorSelection.cursor(newCursorPos)
    });
    
    return true;
}

/**
 * 添加行（在当前行之下）
 */
export function addRowBelow(view: EditorView): boolean {
    const tableInfo = getTableAtCursor(view);
    if (!tableInfo) return false;

    const currentLine = view.state.doc.lineAt(view.state.selection.main.from).number;
    const rowIndex = currentLine - tableInfo.lineStart + 1;
    
    const newTableText = (() => {
        const table = parseTable(tableInfo.tableText);
        table.addRow(rowIndex);
        table.update();
        return renderTable(table, true);
    })();
    
    if (!newTableText) return false;
    
    // 计算新行的位置
    const newLines = newTableText.split('\n');
    let newRowLineIndex = rowIndex;
    
    // 找到新行中第一个单元格的位置（第一个 | 之后）
    const newRowLine = newLines[newRowLineIndex];
    const firstPipeIndex = newRowLine.indexOf('|');
    const cursorOffset = firstPipeIndex >= 0 ? firstPipeIndex + 2 : 1;
    
    // 计算新光标位置
    let newCursorPos = tableInfo.from;
    for (let i = 0; i < newRowLineIndex; i++) {
        newCursorPos += newLines[i].length + 1; // +1 for newline
    }
    newCursorPos += cursorOffset;
    
    view.dispatch({
        changes: {
            from: tableInfo.from,
            to: tableInfo.to,
            insert: newTableText
        },
        selection: EditorSelection.cursor(newCursorPos)
    });
    
    return true;
}

/**
 * 删除当前行
 */
export function deleteRow(view: EditorView): boolean {
    const tableInfo = getTableAtCursor(view);
    if (!tableInfo) return false;

    return replaceTable(view, (tableText) => {
        const table = parseTable(tableText);
        const currentLine = view.state.doc.lineAt(view.state.selection.main.from).number;
        const rowIndex = currentLine - tableInfo.lineStart;
        table.removeRow(rowIndex);
        table.update();
        return renderTable(table, true);
    });
}

/**
 * 添加列（在当前列左侧）
 */
export function addColumnLeft(view: EditorView): boolean {
    const tableInfo = getTableAtCursor(view);
    if (!tableInfo) return false;

    return replaceTable(view, (tableText) => {
        const table = parseTable(tableText);
        // 计算当前列索引（简化版本，基于管道符数量）
        const line = view.state.doc.lineAt(view.state.selection.main.from);
        const lineText = line.text;
        const cursorPos = view.state.selection.main.from - line.from;
        let colIndex = 0;
        for (let i = 0; i < cursorPos && i < lineText.length; i++) {
            if (lineText[i] === '|') colIndex++;
        }
        colIndex = Math.max(0, colIndex - 1);
        
        table.addColumn(colIndex);
        table.update();
        return renderTable(table, true);
    });
}

/**
 * 添加列（在当前列右侧）
 */
export function addColumnRight(view: EditorView): boolean {
    const tableInfo = getTableAtCursor(view);
    if (!tableInfo) return false;

    return replaceTable(view, (tableText) => {
        const table = parseTable(tableText);
        // 计算当前列索引
        const line = view.state.doc.lineAt(view.state.selection.main.from);
        const lineText = line.text;
        const cursorPos = view.state.selection.main.from - line.from;
        let colIndex = 0;
        for (let i = 0; i < cursorPos && i < lineText.length; i++) {
            if (lineText[i] === '|') colIndex++;
        }
        
        table.addColumn(colIndex);
        table.update();
        return renderTable(table, true);
    });
}

/**
 * 删除当前列
 */
export function deleteColumn(view: EditorView): boolean {
    const tableInfo = getTableAtCursor(view);
    if (!tableInfo) return false;

    return replaceTable(view, (tableText) => {
        const table = parseTable(tableText);
        // 计算当前列索引
        const line = view.state.doc.lineAt(view.state.selection.main.from);
        const lineText = line.text;
        const cursorPos = view.state.selection.main.from - line.from;
        let colIndex = 0;
        for (let i = 0; i < cursorPos && i < lineText.length; i++) {
            if (lineText[i] === '|') colIndex++;
        }
        colIndex = Math.max(0, colIndex - 1);
        
        table.removeColumn(colIndex);
        table.update();
        return renderTable(table, true);
    });
}

/**
 * 设置列对齐方式
 */
export function alignColumn(view: EditorView, alignment: TextAlignment): boolean {
    const tableInfo = getTableAtCursor(view);
    if (!tableInfo) return false;

    return replaceTable(view, (tableText) => {
        const table = parseTable(tableText);
        // 计算当前列索引
        const line = view.state.doc.lineAt(view.state.selection.main.from);
        const lineText = line.text;
        const cursorPos = view.state.selection.main.from - line.from;
        let colIndex = 0;
        for (let i = 0; i < cursorPos && i < lineText.length; i++) {
            if (lineText[i] === '|') colIndex++;
        }
        colIndex = Math.max(0, colIndex - 1);
        
        const column = table.getColumn(colIndex);
        if (column) {
            column.textAlign = alignment;
        }
        return renderTable(table, true);
    });
}
