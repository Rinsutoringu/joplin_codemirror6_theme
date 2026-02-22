import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder, EditorState } from '@codemirror/state';

// ─── 表格解析 ────────────────────────────────────────────────────────────────

interface TableInfo {
    headerLines: number[];
    dividerLine: number;
    bodyLines: number[];
    alignments: ('left' | 'center' | 'right' | 'none')[];
}

const DIVIDER_RE = /^\s*\|?([\s:]*-+[\s:]*\|?)+\s*$/;
const TABLE_ROW_RE = /\|/;

function parseAlignment(cell: string): 'left' | 'center' | 'right' | 'none' {
    const s = cell.trim();
    const left = s.startsWith(':');
    const right = s.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return 'none';
}

function findTables(state: EditorState): TableInfo[] {
    const doc = state.doc;
    const tables: TableInfo[] = [];
    let i = 1;

    while (i <= doc.lines) {
        const text = doc.line(i).text;

        if (DIVIDER_RE.test(text) && TABLE_ROW_RE.test(text)) {
            let headerStart = i - 1;
            while (headerStart >= 1 && TABLE_ROW_RE.test(doc.line(headerStart).text)) {
                headerStart--;
            }
            headerStart++;

            if (headerStart >= i) { i++; continue; }

            let bodyEnd = i + 1;
            while (bodyEnd <= doc.lines && TABLE_ROW_RE.test(doc.line(bodyEnd).text)) {
                bodyEnd++;
            }
            bodyEnd--;

            const dividerText = doc.line(i).text;
            let s = dividerText.trim();
            if (s.startsWith('|')) s = s.slice(1);
            if (s.endsWith('|')) s = s.slice(0, -1);
            const alignments = s.split('|').map(parseAlignment);

            const headerLines: number[] = [];
            for (let j = headerStart; j < i; j++) headerLines.push(j);
            const bodyLines: number[] = [];
            for (let j = i + 1; j <= bodyEnd; j++) bodyLines.push(j);

            tables.push({ headerLines, dividerLine: i, bodyLines, alignments });
            i = bodyEnd + 1;
            continue;
        }
        i++;
    }
    return tables;
}

// ─── 装饰构建 ────────────────────────────────────────────────────────────────

const headerLineDeco = Decoration.line({ class: 'cm-tbl-header' });
const headerFirstLineDeco = Decoration.line({ class: 'cm-tbl-header cm-tbl-first' });
const dividerLineDeco = Decoration.line({ class: 'cm-tbl-divider' });
const pipeDeco = Decoration.mark({ class: 'cm-tbl-pipe' });
const dividerPipeDeco = Decoration.mark({ class: 'cm-tbl-divider-pipe' });
const dividerCellDeco = Decoration.mark({ class: 'cm-tbl-divider-cell' });

function bodyLineDeco(isEven: boolean, isFirst: boolean, isLast: boolean): Decoration {
    let cls = 'cm-tbl-body';
    if (isEven) cls += ' cm-tbl-even';
    if (isFirst) cls += ' cm-tbl-first-body';
    if (isLast) cls += ' cm-tbl-last-body';
    return Decoration.line({ class: cls });
}

function buildTableDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    if (view.state.doc.lines > 2000) return builder.finish();

    const tables = findTables(view.state);
    const doc = view.state.doc;

    for (const table of tables) {
        const allLines = [...table.headerLines, table.dividerLine, ...table.bodyLines];

        for (const lineNum of allLines) {
            const line = doc.line(lineNum);
            const text = line.text;
            const isHeader = table.headerLines.includes(lineNum);
            const isDivider = lineNum === table.dividerLine;
            const bodyIdx = table.bodyLines.indexOf(lineNum);
            const isBody = bodyIdx >= 0;
            const isFirstHeader = isHeader && lineNum === table.headerLines[0];
            const isLastBody = isBody && lineNum === table.bodyLines[table.bodyLines.length - 1];
            const isFirstBody = isBody && bodyIdx === 0;
            const isEven = isBody && bodyIdx % 2 === 1;

            // 行级装饰
            if (isDivider) {
                builder.add(line.from, line.from, dividerLineDeco);
            } else if (isFirstHeader) {
                builder.add(line.from, line.from, headerFirstLineDeco);
            } else if (isHeader) {
                builder.add(line.from, line.from, headerLineDeco);
            } else if (isBody) {
                builder.add(line.from, line.from, bodyLineDeco(isEven, isFirstBody, isLastBody));
            }

            // 字符级装饰
            if (isDivider) {
                let inCell = false;
                let cellStart = -1;
                for (let k = 0; k < text.length; k++) {
                    if (text[k] === '|') {
                        if (inCell && cellStart >= 0 && cellStart < k) {
                            builder.add(line.from + cellStart, line.from + k, dividerCellDeco);
                        }
                        builder.add(line.from + k, line.from + k + 1, dividerPipeDeco);
                        cellStart = k + 1;
                        inCell = true;
                    }
                }
                if (inCell && cellStart >= 0 && cellStart < text.length) {
                    builder.add(line.from + cellStart, line.from + text.length, dividerCellDeco);
                }
            } else {
                for (let k = 0; k < text.length; k++) {
                    if (text[k] === '|') {
                        builder.add(line.from + k, line.from + k + 1, pipeDeco);
                    }
                }
            }
        }
    }

    return builder.finish();
}

export const tableRenderPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildTableDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = buildTableDecorations(update.view);
            }
        }
    },
    { decorations: v => v.decorations }
);
