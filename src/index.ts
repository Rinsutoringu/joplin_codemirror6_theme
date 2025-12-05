import joplin from 'api';
import { ContentScriptType, SettingItemType, MenuItemLocation } from 'api/types';
import { getTableDialogHtml } from './tableDialog';

joplin.plugins.register({
	onStart: async function() {
		// 注册设置选项
		await joplin.settings.registerSection('codemirror6Theme', {
			label: 'CodeMirror 6 Theme',
			iconName: 'fas fa-palette',
		});

		// 注册各个功能的开关
		await joplin.settings.registerSettings({
			'enableInlineCode': {
				value: true,
				type: SettingItemType.Bool,
				section: 'codemirror6Theme',
				public: true,
				label: '启用行内代码样式',
				description: '为行内代码添加背景色和特殊颜色',
			},
			'enableLinkColor': {
				value: true,
				type: SettingItemType.Bool,
				section: 'codemirror6Theme',
				public: true,
				label: '启用链接颜色',
				description: '为超链接和 URL 添加特殊颜色',
			},
			'enableGitHubAlerts': {
				value: true,
				type: SettingItemType.Bool,
				section: 'codemirror6Theme',
				public: true,
				label: '启用 GitHub Alerts',
				description: '为 GitHub 风格的提示块添加样式（> [!NOTE]、> [!TIP] 等）',
			},
			'enableHeadingStyles': {
				value: true,
				type: SettingItemType.Bool,
				section: 'codemirror6Theme',
				public: true,
				label: '启用标题样式',
				description: '为 Markdown 标题（h1-h6）添加增强样式',
			},
			'enableBlockquoteStyles': {
				value: true,
				type: SettingItemType.Bool,
				section: 'codemirror6Theme',
				public: true,
				label: '启用引用块样式',
				description: '为普通引用块（blockquote）添加样式',
			},
			'enableTableRendering': {
				value: true,
				type: SettingItemType.Bool,
				section: 'codemirror6Theme',
				public: true,
				label: '启用表格渲染',
				description: '在编辑器中直接渲染 Markdown 表格样式',
			},
			'inlineCodeColor': {
				value: '#d63200',
				type: SettingItemType.String,
				section: 'codemirror6Theme',
				public: true,
				label: '行内代码颜色',
				description: '行内代码的文字颜色（十六进制格式，如 #d63200）',
			},
			'linkColor': {
				value: '#d63200',
				type: SettingItemType.String,
				section: 'codemirror6Theme',
				public: true,
				label: '链接颜色',
				description: '超链接和 URL 的文字颜色（十六进制格式，如 #d63200）',
			},
		});

       // 注册 CodeMirror 6 主题插件（inline 代码样式和表格编辑）
       const contentScriptId = 'codemirror6-inline-code-theme';
       await joplin.contentScripts.register(
           ContentScriptType.CodeMirrorPlugin,
           contentScriptId,
           './contentScript.js',
       );

       // 处理来自 contentScript 的消息
       await joplin.contentScripts.onMessage(contentScriptId, async (message: any) => {
           if (message.name === 'getSettings') {
               return {
                   enableInlineCode: await joplin.settings.value('enableInlineCode'),
                   enableLinkColor: await joplin.settings.value('enableLinkColor'),
                   enableGitHubAlerts: await joplin.settings.value('enableGitHubAlerts'),
                   enableHeadingStyles: await joplin.settings.value('enableHeadingStyles'),
                   enableBlockquoteStyles: await joplin.settings.value('enableBlockquoteStyles'),
                   enableTableRendering: await joplin.settings.value('enableTableRendering'),
                   inlineCodeColor: await joplin.settings.value('inlineCodeColor'),
                   linkColor: await joplin.settings.value('linkColor'),
               };
           }
       });

       // 注册 Markdown-it 插件（GitHub Alerts）
       const markdownRenderId = 'github-alerts-renderer';
       await joplin.contentScripts.register(
           ContentScriptType.MarkdownItPlugin,
           markdownRenderId,
           './markdownRenderer.js',
       );

       // 标题快捷键已在 contentScript 中通过 CodeMirror keymap 实现
       // Ctrl+1 到 Ctrl+6 可直接使用
       
       // 创建表格编辑面板
       const tablePanelHandle = await joplin.views.panels.create('tableEditPanel');
       await joplin.views.panels.setHtml(tablePanelHandle, getTableDialogHtml());
       await joplin.views.panels.addScript(tablePanelHandle, './tableWebview.js');
       
       // 处理面板消息
       await joplin.views.panels.onMessage(tablePanelHandle, async (message: any) => {
           const command = message.command;
           
           if (command === 'closePanel') {
               // 关闭面板
               await joplin.views.panels.hide(tablePanelHandle);
           } else if (command === 'createTable') {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'createTable',
                   args: [message.cols, message.rows]
               });
           } else {
               // 其他命令直接映射到对应的 editor command
               await joplin.commands.execute('editor.execCommand', {
                   name: command
               });
           }
       });
       
       // 注册打开面板的命令(切换编辑器内嵌工具栏)
       await joplin.commands.register({
           name: 'openTableDialog',
           label: '表格编辑工具',
           iconName: 'fas fa-table',
           execute: async () => {
               try {
                   // 切换编辑器内的工具栏显示
                   console.log('Toggling table toolbar...');
                   await joplin.commands.execute('editor.execCommand', {
                       name: 'toggleTableToolbar'
                   });
                   console.log('Table toolbar toggled');
               } catch (error) {
                   console.error('Error toggling table toolbar:', error);
               }
           }
       });
       
       // 注册表格编辑命令
       await joplin.commands.register({
           name: 'tableFormatTable',
           label: '格式化表格',
           iconName: 'fas fa-table',
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'formatTable',
                   args: []
               });
           }
       });
       
       await joplin.commands.register({
           name: 'tableAddRowAbove',
           label: '在上方添加行',
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'addRowAbove'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'tableAddRowBelow',
           label: '在下方添加行',
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'addRowBelow'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'tableDeleteRow',
           label: '删除当前行',
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'deleteRow'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'tableAddColumnLeft',
           label: '在左侧添加列',
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'addColumnLeft'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'tableAddColumnRight',
           label: '在右侧添加列',
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'addColumnRight'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'tableDeleteColumn',
           label: '删除当前列',
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'deleteColumn'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'tableAlignLeft',
           label: '文本左对齐',
           iconName: 'fas fa-align-left',
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'alignLeft'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'tableAlignCenter',
           label: '文本居中对齐',
           iconName: 'fas fa-align-center',
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'alignCenter'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'tableAlignRight',
           label: '文本右对齐',
           iconName: 'fas fa-align-right',
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'alignRight'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'tableAlignClear',
           label: '清除对齐',
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'alignClear'
               });
           }
       });
       
       // 注册数学公式快捷键命令
       await joplin.commands.register({
           name: 'toggleInlineMath',
           label: '在选中内容两侧添加 $',
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'toggleInlineMath'
               });
           }
       });
       
       // 在 Tools 菜单只添加一个入口 - 表格编辑工具
       await joplin.views.menuItems.create('openTableDialogItem', 'openTableDialog', MenuItemLocation.Tools);
       
       // 在右键菜单也只添加一个入口
       joplin.workspace.filterEditorContextMenu(async (object: any) => {
           object.items.push({ type: 'separator' });
           object.items.push({ label: '📋 表格编辑工具...', commandName: 'openTableDialog' });
           return object;
       });
	},
});
