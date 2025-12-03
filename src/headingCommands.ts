import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';

// 切换标题级别的命令
export function toggleHeadingCommand(level: number) {
    return (view: EditorView) => {
        const { state } = view;
        const { selection } = state;
        const changes: any[] = [];

        for (const range of selection.ranges) {
            const line = state.doc.lineAt(range.from);
            const lineText = line.text;
            
            // 匹配现有标题
            const headingMatch = lineText.match(/^(#{1,6})\s+(.*)$/);
            const headingPrefix = '#'.repeat(level) + ' ';
            
            let newText: string;
            let newCursorPos: number;
            
            if (headingMatch) {
                // 如果已经是标题
                const currentLevel = headingMatch[1].length;
                const content = headingMatch[2];
                
                if (currentLevel === level) {
                    // 相同级别的标题，删除标题符号
                    newText = content;
                    newCursorPos = line.from + Math.max(0, range.from - line.from - currentLevel - 1);
                } else {
                    // 不同级别的标题，替换为新级别
                    newText = headingPrefix + content;
                    newCursorPos = line.from + level + 1 + (range.from - line.from - currentLevel - 1);
                }
            } else {
                // 不是标题，添加标题符号
                newText = headingPrefix + lineText;
                newCursorPos = range.from + level + 1;
            }
            
            changes.push({
                from: line.from,
                to: line.to,
                insert: newText,
            });
        }

        if (changes.length > 0) {
            view.dispatch({
                changes,
                selection: EditorSelection.cursor(changes[0].from + changes[0].insert.length),
            });
            return true;
        }

        return false;
    };
}

// 导出命令映射
export const headingCommands = {
    toggleHeading1: toggleHeadingCommand(1),
    toggleHeading2: toggleHeadingCommand(2),
    toggleHeading3: toggleHeadingCommand(3),
    toggleHeading4: toggleHeadingCommand(4),
    toggleHeading5: toggleHeadingCommand(5),
    toggleHeading6: toggleHeadingCommand(6),
};
