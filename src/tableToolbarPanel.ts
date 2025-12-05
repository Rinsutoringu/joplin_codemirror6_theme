import { EditorView } from '@codemirror/view';
import { Panel, showPanel, ViewUpdate } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { tableEditCommands } from './tableEditCommands';

// 定义切换工具栏显示的 effect
export const toggleTableToolbar = StateEffect.define<boolean>();

// 状态字段来跟踪工具栏是否显示
export const tableToolbarState = StateField.define<boolean>({
    create: () => false, // 默认隐藏
    update(value, tr) {
        for (let effect of tr.effects) {
            if (effect.is(toggleTableToolbar)) {
                return effect.value;
            }
        }
        return value;
    },
    provide: f => showPanel.from(f, on => on ? createTableToolbarPanel : null)
});

// 创建表格工具栏面板
function createTableToolbarPanel(view: EditorView): Panel {
    const dom = document.createElement('div');
    dom.className = 'cm-table-toolbar';
    dom.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        padding: 6px 8px;
        background: #f8f8f8;
        border-bottom: 1px solid #ddd;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, sans-serif;
    `;
    
    // 创建按钮的辅助函数
    const createButton = (text: string, title: string, command: (view: EditorView) => boolean) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.title = title;
        btn.className = 'cm-table-toolbar-button';
        btn.style.cssText = `
            padding: 4px 8px;
            border: 1px solid #ccc;
            border-radius: 3px;
            background: white;
            cursor: pointer;
            font-size: 11px;
            white-space: nowrap;
            height: 24px;
        `;
        btn.onmouseenter = () => {
            btn.style.background = '#f0f0f0';
            btn.style.borderColor = '#999';
        };
        btn.onmouseleave = () => {
            btn.style.background = 'white';
            btn.style.borderColor = '#ccc';
        };
        btn.onclick = () => {
            command(view);
            view.focus();
        };
        return btn;
    };
    
    // 创建输入框
    const createInput = (id: string, value: string, width: string) => {
        const input = document.createElement('input');
        input.type = 'number';
        input.id = id;
        input.min = '1';
        input.max = id.includes('cols') ? '20' : '50';
        input.value = value;
        input.style.cssText = `
            padding: 3px 5px;
            border: 1px solid #ccc;
            border-radius: 3px;
            font-size: 11px;
            width: ${width};
            height: 24px;
        `;
        return input;
    };
    
    // 创建分隔线
    const createDivider = () => {
        const divider = document.createElement('div');
        divider.style.cssText = `
            width: 1px;
            height: 22px;
            background: #d0d0d0;
            margin: 0 2px;
        `;
        return divider;
    };
    
    // 创建标签
    const createLabel = (text: string) => {
        const label = document.createElement('span');
        label.textContent = text;
        label.style.cssText = `
            font-size: 11px;
            font-weight: 600;
            color: #333;
            white-space: nowrap;
            padding-right: 6px;
        `;
        return label;
    };
    
    const createGroupLabel = (text: string) => {
        const label = document.createElement('span');
        label.textContent = text;
        label.style.cssText = `
            font-size: 10px;
            color: #666;
            margin-right: 2px;
        `;
        return label;
    };
    
    // 关闭按钮(放在最左侧)
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.title = '关闭工具栏';
    closeBtn.style.cssText = `
        width: 24px;
        height: 24px;
        border: 1px solid #bbb;
        border-radius: 3px;
        background: white;
        cursor: pointer;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 8px;
    `;
    closeBtn.onmouseenter = () => {
        closeBtn.style.background = '#ffebeb';
        closeBtn.style.borderColor = '#ff4444';
        closeBtn.style.color = '#cc0000';
    };
    closeBtn.onmouseleave = () => {
        closeBtn.style.background = 'white';
        closeBtn.style.borderColor = '#bbb';
        closeBtn.style.color = '#666';
    };
    closeBtn.onclick = () => {
        view.dispatch({
            effects: toggleTableToolbar.of(false)
        });
        view.focus();
    };
    dom.appendChild(closeBtn);
    
    // 标题
    dom.appendChild(createLabel('表格'));
    
    // 创建表格组
    const createGroup = document.createElement('div');
    createGroup.style.cssText = 'display: flex; align-items: center; gap: 3px;';
    createGroup.appendChild(createGroupLabel('创建:'));
    
    const colsInput = createInput('cm-table-cols', '3', '40px');
    createGroup.appendChild(colsInput);
    
    const timesSpan = document.createElement('span');
    timesSpan.textContent = '×';
    timesSpan.style.fontSize = '11px';
    createGroup.appendChild(timesSpan);
    
    const rowsInput = createInput('cm-table-rows', '3', '40px');
    createGroup.appendChild(rowsInput);
    
    const createBtn = document.createElement('button');
    createBtn.textContent = '创建';
    createBtn.className = 'cm-table-toolbar-button cm-primary-button';
    createBtn.style.cssText = `
        padding: 4px 8px;
        border: 1px solid #0078d4;
        border-radius: 3px;
        background: #0078d4;
        color: white;
        cursor: pointer;
        font-size: 11px;
        white-space: nowrap;
        height: 24px;
    `;
    createBtn.onmouseenter = () => {
        createBtn.style.background = '#106ebe';
        createBtn.style.borderColor = '#106ebe';
    };
    createBtn.onmouseleave = () => {
        createBtn.style.background = '#0078d4';
        createBtn.style.borderColor = '#0078d4';
    };
    createBtn.onclick = () => {
        const cols = parseInt(colsInput.value) || 3;
        const rows = parseInt(rowsInput.value) || 3;
        
        // 生成表格
        const headerRow = '| ' + Array(cols).fill('Header').join(' | ') + ' |';
        const separatorRow = '| ' + Array(cols).fill('---').join(' | ') + ' |';
        const dataRows = Array(rows).fill(null).map(() => 
            '| ' + Array(cols).fill('Cell').join(' | ') + ' |'
        ).join('\n');
        
        const tableText = `${headerRow}\n${separatorRow}\n${dataRows}\n`;
        
        const pos = view.state.selection.main.head;
        view.dispatch({
            changes: { from: pos, to: pos, insert: tableText },
            selection: { anchor: pos + tableText.length }
        });
        view.focus();
    };
    createGroup.appendChild(createBtn);
    
    dom.appendChild(createGroup);
    dom.appendChild(createDivider());
    
    // 格式化
    dom.appendChild(createButton('格式化', '格式化表格', tableEditCommands.formatTable));
    dom.appendChild(createDivider());
    
    // 行操作组
    const rowGroup = document.createElement('div');
    rowGroup.style.cssText = 'display: flex; align-items: center; gap: 3px;';
    rowGroup.appendChild(createGroupLabel('行:'));
    rowGroup.appendChild(createButton('↑插入', '上方插入行', tableEditCommands.addRowAbove));
    rowGroup.appendChild(createButton('↓插入', '下方插入行', tableEditCommands.addRowBelow));
    rowGroup.appendChild(createButton('删除', '删除行', tableEditCommands.deleteRow));
    dom.appendChild(rowGroup);
    dom.appendChild(createDivider());
    
    // 列操作组
    const colGroup = document.createElement('div');
    colGroup.style.cssText = 'display: flex; align-items: center; gap: 3px;';
    colGroup.appendChild(createGroupLabel('列:'));
    colGroup.appendChild(createButton('←插入', '左侧插入列', tableEditCommands.addColumnLeft));
    colGroup.appendChild(createButton('→插入', '右侧插入列', tableEditCommands.addColumnRight));
    colGroup.appendChild(createButton('删除', '删除列', tableEditCommands.deleteColumn));
    dom.appendChild(colGroup);
    dom.appendChild(createDivider());
    
    // 对齐操作组
    const alignGroup = document.createElement('div');
    alignGroup.style.cssText = 'display: flex; align-items: center; gap: 3px;';
    alignGroup.appendChild(createGroupLabel('对齐:'));
    alignGroup.appendChild(createButton('⬅', '左对齐', tableEditCommands.alignLeft));
    alignGroup.appendChild(createButton('⬌', '居中', tableEditCommands.alignCenter));
    alignGroup.appendChild(createButton('➡', '右对齐', tableEditCommands.alignRight));
    alignGroup.appendChild(createButton('清除', '清除对齐', tableEditCommands.alignClear));
    dom.appendChild(alignGroup);
    
    return {
        dom,
        top: false, // 放在底部
    };
}
