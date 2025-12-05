import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';

/**
 * 在选中内容两侧添加 $ 符号 (用于数学公式)
 */
export function toggleInlineMath(view: EditorView): boolean {
    const selection = view.state.selection;
    
    // 检查是否有选中内容
    if (selection.main.from === selection.main.to) {
        return false;
    }
    
    const range = selection.main;
    const doc = view.state.doc;
    const selectedText = doc.sliceString(range.from, range.to);
    
    // 检查是否已经被 $ 包围
    if (selectedText.startsWith('$') && selectedText.endsWith('$')) {
        // 移除已有的 $
        const innerText = selectedText.slice(1, -1);
        view.dispatch({
            changes: { from: range.from, to: range.to, insert: innerText },
            selection: EditorSelection.single(range.from, range.from + innerText.length)
        });
    } else {
        // 添加 $
        const wrappedText = '$' + selectedText + '$';
        view.dispatch({
            changes: { from: range.from, to: range.to, insert: wrappedText },
            selection: EditorSelection.single(range.from, range.from + wrappedText.length)
        });
    }
    
    return true;
}
