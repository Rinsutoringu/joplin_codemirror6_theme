import joplin from 'api';
import { ContentScriptType } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
       // 注册 CodeMirror 6 主题插件（inline 代码样式）
       const contentScriptId = 'codemirror6-inline-code-theme';
       await joplin.contentScripts.register(
           ContentScriptType.CodeMirrorPlugin,
           contentScriptId,
           './contentScript.js',
       );

       // 注册 Markdown-it 插件（GitHub Alerts）
       const markdownRenderId = 'github-alerts-renderer';
       await joplin.contentScripts.register(
           ContentScriptType.MarkdownItPlugin,
           markdownRenderId,
           './markdownRenderer.js',
       );
	},
});
