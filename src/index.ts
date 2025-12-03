import joplin from 'api';
import { ContentScriptType, SettingItemType } from 'api/types';

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

       // 注册 CodeMirror 6 主题插件（inline 代码样式）
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
	},
});
