import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';

// 切换 GitHub Alert 的命令
export function toggleAlert(alertType: 'NOTE' | 'TIP' | 'WARNING' | 'IMPORTANT') {
    return (view: EditorView) => {
        const { state } = view;
        const { selection } = state;
        const changes: any[] = [];

        for (const range of selection.ranges) {
            const line = state.doc.lineAt(range.from);
            const lineText = line.text;
            
            // 提取前导空格/缩进
            const leadingSpaceMatch = lineText.match(/^(\s*)(.*)/);
            if (!leadingSpaceMatch) continue;
            
            const leadingSpaces = leadingSpaceMatch[1];
            const contentAfterSpaces = leadingSpaceMatch[2];
            
            let newText: string;
            let newCursorPos: number;
            
            // 检查是否已经是同类型的 Alert
            const alertMatch = contentAfterSpaces.match(/^>\s*\[!(\w+)\]\s*(.*)$/);
            
            if (alertMatch && alertMatch[1].toUpperCase() === alertType) {
                // 已经是相同类型的 Alert，移除 Alert 标记
                const content = alertMatch[2];
                newText = leadingSpaces + (content ? '> ' + content : '');
                const removedChars = lineText.length - newText.length;
                newCursorPos = line.from + Math.max(leadingSpaces.length, range.from - line.from - removedChars);
            } else if (alertMatch) {
                // 是其他类型的 Alert，替换类型
                const content = alertMatch[2];
                newText = leadingSpaces + `> [!${alertType}]` + (content ? ' ' + content : '');
                const oldAlertLength = alertMatch[1].length;
                const newAlertLength = alertType.length;
                const diff = newAlertLength - oldAlertLength;
                newCursorPos = range.from + diff;
            } else {
                // 检查是否是普通引用块
                const quoteMatch = contentAfterSpaces.match(/^>\s?(.*)$/);
                if (quoteMatch) {
                    // 是普通引用块，转换为 Alert
                    const content = quoteMatch[1];
                    newText = leadingSpaces + `> [!${alertType}]` + (content ? ' ' + content : '');
                    const addedChars = newText.length - lineText.length;
                    newCursorPos = range.from + addedChars;
                } else {
                    // 不是引用块，添加 Alert
                    newText = leadingSpaces + `> [!${alertType}] ` + contentAfterSpaces;
                    const cursorOffsetInLine = range.from - line.from;
                    if (cursorOffsetInLine <= leadingSpaces.length) {
                        newCursorPos = line.from + leadingSpaces.length + `> [!${alertType}] `.length;
                    } else {
                        newCursorPos = range.from + `> [!${alertType}] `.length;
                    }
                }
            }
            
            changes.push({
                from: line.from,
                to: line.to,
                insert: newText,
            });
            
            changes.push({
                anchor: newCursorPos,
                head: newCursorPos,
            });
        }

        if (changes.length > 0) {
            const transaction = state.update({
                changes: changes.filter(c => c.from !== undefined),
                selection: EditorSelection.create(
                    changes.filter(c => c.anchor !== undefined).map(c => 
                        EditorSelection.range(c.anchor, c.head)
                    )
                ),
            });
            
            view.dispatch(transaction);
            return true;
        }
        
        return false;
    };
}

// 切换引用块的命令
export function toggleBlockquote(view: EditorView) {
    const { state } = view;
    const { selection } = state;
    const changes: any[] = [];

    for (const range of selection.ranges) {
        const line = state.doc.lineAt(range.from);
        const lineText = line.text;
        
        // 提取前导空格/缩进
        const leadingSpaceMatch = lineText.match(/^(\s*)(.*)/);
        if (!leadingSpaceMatch) continue;
        
        const leadingSpaces = leadingSpaceMatch[1];
        const contentAfterSpaces = leadingSpaceMatch[2];
        
        let newText: string;
        let newCursorPos: number;
        
        // 检查内容部分是否以 > 开头
        const quoteMatch = contentAfterSpaces.match(/^>\s?(.*)$/);
        
        if (quoteMatch) {
            // 已经是引用块，移除 > 符号（保留前导空格）
            const contentWithoutQuote = quoteMatch[1];
            newText = leadingSpaces + contentWithoutQuote;
            // 光标位置向左移动（减去 > 和可能的空格）
            const removedChars = lineText.length - newText.length;
            newCursorPos = line.from + Math.max(leadingSpaces.length, range.from - line.from - removedChars);
        } else {
            // 不是引用块，在前导空格之后添加 > 符号
            newText = leadingSpaces + '> ' + contentAfterSpaces;
            // 光标位置向右移动 2 个字符（> 和空格）
            const cursorOffsetInLine = range.from - line.from;
            if (cursorOffsetInLine <= leadingSpaces.length) {
                // 光标在前导空格内，移动到 > 之后
                newCursorPos = line.from + leadingSpaces.length + 2;
            } else {
                // 光标在内容部分，向右移动 2 个字符
                newCursorPos = range.from + 2;
            }
        }
        
        changes.push({
            from: line.from,
            to: line.to,
            insert: newText,
        });
        
        // 更新光标位置
        changes.push({
            anchor: newCursorPos,
            head: newCursorPos,
        });
    }

    if (changes.length > 0) {
        const transaction = state.update({
            changes: changes.filter(c => c.from !== undefined),
            selection: EditorSelection.create(
                changes.filter(c => c.anchor !== undefined).map(c => 
                    EditorSelection.range(c.anchor, c.head)
                )
            ),
        });
        
        view.dispatch(transaction);
        return true;
    }
    
    return false;
}

export const blockquoteCommands = {
    toggleBlockquote,
    toggleAlertNote: toggleAlert('NOTE'),
    toggleAlertTip: toggleAlert('TIP'),
    toggleAlertWarning: toggleAlert('WARNING'),
    toggleAlertImportant: toggleAlert('IMPORTANT'),
};
