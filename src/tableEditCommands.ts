import { EditorView } from '@codemirror/view';
import { TextAlignment } from "@felisdiligens/md-table-tools";
import * as tableCommands from './tableCommands';

/**
 * 表格编辑命令集
 */
export const tableEditCommands = {
    /**
     * 格式化表格
     */
    formatTable: (view: EditorView) => {
        return tableCommands.formatTable(view);
    },
    
    /**
     * 在上方添加行
     */
    addRowAbove: (view: EditorView) => {
        return tableCommands.addRowAbove(view);
    },
    
    /**
     * 在下方添加行
     */
    addRowBelow: (view: EditorView) => {
        return tableCommands.addRowBelow(view);
    },
    
    /**
     * 删除当前行
     */
    deleteRow: (view: EditorView) => {
        return tableCommands.deleteRow(view);
    },
    
    /**
     * 在左侧添加列
     */
    addColumnLeft: (view: EditorView) => {
        return tableCommands.addColumnLeft(view);
    },
    
    /**
     * 在右侧添加列
     */
    addColumnRight: (view: EditorView) => {
        return tableCommands.addColumnRight(view);
    },
    
    /**
     * 删除当前列
     */
    deleteColumn: (view: EditorView) => {
        return tableCommands.deleteColumn(view);
    },
    
    /**
     * 左对齐
     */
    alignLeft: (view: EditorView) => {
        return tableCommands.alignColumn(view, TextAlignment.left);
    },
    
    /**
     * 居中对齐
     */
    alignCenter: (view: EditorView) => {
        return tableCommands.alignColumn(view, TextAlignment.center);
    },
    
    /**
     * 右对齐
     */
    alignRight: (view: EditorView) => {
        return tableCommands.alignColumn(view, TextAlignment.right);
    },
    
    /**
     * 清除对齐
     */
    alignClear: (view: EditorView) => {
        return tableCommands.alignColumn(view, TextAlignment.default);
    }
};

export default tableEditCommands;
