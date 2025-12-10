import joplin from 'api';
import { ContentScriptType, SettingItemType, MenuItemLocation } from 'api/types';
import { getTableDialogHtml } from './tableDialog';
import { initI18n, t } from './i18n';

joplin.plugins.register({
	onStart: async function() {
		// Initialize i18n
		await initI18n();

		// 注册设置选项
		await joplin.settings.registerSection('codemirror6Theme', {
			label: t('settings.section'),
			iconName: 'fas fa-palette',
		});

		// 注册各个功能的开关
		await joplin.settings.registerSettings({
			'enableInlineCode': {
				value: true,
				type: SettingItemType.Bool,
				section: 'codemirror6Theme',
				public: true,
				label: t('settings.enableInlineCode.label'),
				description: t('settings.enableInlineCode.description'),
			},
			'enableLinkColor': {
				value: true,
				type: SettingItemType.Bool,
				section: 'codemirror6Theme',
				public: true,
				label: t('settings.enableLinkColor.label'),
				description: t('settings.enableLinkColor.description'),
			},
			'enableGitHubAlerts': {
				value: true,
				type: SettingItemType.Bool,
				section: 'codemirror6Theme',
				public: true,
				label: t('settings.enableGitHubAlerts.label'),
				description: t('settings.enableGitHubAlerts.description'),
			},
			'enableHeadingStyles': {
				value: true,
				type: SettingItemType.Bool,
				section: 'codemirror6Theme',
				public: true,
				label: t('settings.enableHeadingStyles.label'),
				description: t('settings.enableHeadingStyles.description'),
			},
			'enableBlockquoteStyles': {
				value: true,
				type: SettingItemType.Bool,
				section: 'codemirror6Theme',
				public: true,
				label: t('settings.enableBlockquoteStyles.label'),
				description: t('settings.enableBlockquoteStyles.description'),
			},
			'enableTableRendering': {
				value: true,
				type: SettingItemType.Bool,
				section: 'codemirror6Theme',
				public: true,
				label: t('settings.enableTableRendering.label'),
				description: t('settings.enableTableRendering.description'),
			},
			'inlineCodeColor': {
				value: '#d63200',
				type: SettingItemType.String,
				section: 'codemirror6Theme',
				public: true,
				label: t('settings.inlineCodeColor.label'),
				description: t('settings.inlineCodeColor.description'),
			},
			'linkColor': {
				value: '#d63200',
				type: SettingItemType.String,
				section: 'codemirror6Theme',
				public: true,
				label: t('settings.linkColor.label'),
				description: t('settings.linkColor.description'),
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
           label: t('commands.openTableDialog'),
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
           label: t('commands.tableFormatTable'),
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
           label: t('commands.tableAddRowAbove'),
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'addRowAbove'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'tableAddRowBelow',
           label: t('commands.tableAddRowBelow'),
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'addRowBelow'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'tableDeleteRow',
           label: t('commands.tableDeleteRow'),
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'deleteRow'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'tableAddColumnLeft',
           label: t('commands.tableAddColumnLeft'),
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'addColumnLeft'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'tableAddColumnRight',
           label: t('commands.tableAddColumnRight'),
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'addColumnRight'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'tableDeleteColumn',
           label: t('commands.tableDeleteColumn'),
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'deleteColumn'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'tableAlignLeft',
           label: t('commands.tableAlignLeft'),
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
           label: t('commands.tableAlignCenter'),
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
           label: t('commands.tableAlignRight'),
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
           label: t('commands.tableAlignClear'),
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
           label: t('commands.toggleInlineMath'),
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'toggleInlineMath'
               });
           }
       });
       
       // 注册引用块快捷键命令 (Ctrl+Shift+.)
       await joplin.commands.register({
           name: 'toggleBlockquote',
           label: t('commands.toggleBlockquote'),
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'toggleBlockquote'
               });
           }
       });
       
       // 注册 GitHub Alert 快捷键命令
       await joplin.commands.register({
           name: 'toggleAlertNote',
           label: t('commands.toggleAlertNote'),
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'toggleAlertNote'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'toggleAlertTip',
           label: t('commands.toggleAlertTip'),
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'toggleAlertTip'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'toggleAlertWarning',
           label: t('commands.toggleAlertWarning'),
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'toggleAlertWarning'
               });
           }
       });
       
       await joplin.commands.register({
           name: 'toggleAlertImportant',
           label: t('commands.toggleAlertImportant'),
           enabledCondition: 'markdownEditorPaneVisible',
           execute: async () => {
               await joplin.commands.execute('editor.execCommand', {
                   name: 'toggleAlertImportant'
               });
           }
       });
       
       // 在 Tools 菜单只添加一个入口 - 表格编辑工具
       await joplin.views.menuItems.create('openTableDialogItem', 'openTableDialog', MenuItemLocation.Tools);
       
       // 在右键菜单也只添加一个入口
       joplin.workspace.filterEditorContextMenu(async (object: any) => {
           object.items.push({ type: 'separator' });
           object.items.push({ label: t('contextMenu.tableEditingTools'), commandName: 'openTableDialog' });
           return object;
       });
	},
});
