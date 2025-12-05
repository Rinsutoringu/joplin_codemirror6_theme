// 表格编辑对话框的 HTML (包含内嵌脚本)
export function getTableDialogHtml(): string {
	return `
		<!DOCTYPE html>
		<html>
		<head>
		<meta charset="UTF-8">
		<style>
			* {
				box-sizing: border-box;
			}
			body, html {
				margin: 0;
				padding: 0;
				height: 100%;
				overflow: hidden;
			}
			.table-dialog {
				font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, sans-serif;
				background: #f8f8f8;
				padding: 6px 8px;
				height: 100%;
				display: flex;
				align-items: flex-start;
			}
			.toolbar-container {
				display: flex;
				align-items: center;
				gap: 6px;
				flex-wrap: wrap;
				width: 100%;
			}
			.dialog-title {
				font-size: 11px;
				font-weight: 600;
				margin: 0;
				color: #333;
				white-space: nowrap;
				padding-right: 6px;
			}
			.toolbar-divider {
				width: 1px;
				height: 22px;
				background: #d0d0d0;
				margin: 0 2px;
			}
			.toolbar-group {
				display: flex;
				align-items: center;
				gap: 3px;
			}
			.group-label {
				font-size: 10px;
				color: #666;
				margin-right: 2px;
			}
			.toolbar-button {
				padding: 4px 8px;
				border: 1px solid #ccc;
				border-radius: 3px;
				background: white;
				cursor: pointer;
				font-size: 11px;
				transition: all 0.15s;
				white-space: nowrap;
				height: 24px;
				display: inline-flex;
				align-items: center;
				justify-content: center;
			}
			.toolbar-button:hover {
				background: #f0f0f0;
				border-color: #999;
			}
			.toolbar-button:active {
				background: #e0e0e0;
			}
			.primary-button {
				background: #0078d4;
				color: white;
				border-color: #0078d4;
			}
			.primary-button:hover {
				background: #106ebe;
				border-color: #106ebe;
			}
			.form-input {
				padding: 3px 5px;
				border: 1px solid #ccc;
				border-radius: 3px;
				font-size: 11px;
				width: 40px;
				height: 24px;
			}
			.close-button {
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
				transition: all 0.15s;
				color: #666;
				margin-left: 4px;
			}
			.close-button:hover {
				background: #ffebeb;
				border-color: #ff4444;
				color: #cc0000;
			}
		</style>
		</head>
		<body>
		<div class="table-dialog">
			<div class="toolbar-container">
				<h3 class="dialog-title">表格</h3>
				
				<!-- 创建 -->
				<div class="toolbar-group">
					<span class="group-label">创建:</span>
					<input type="number" class="form-input" id="table-cols" min="1" max="20" value="3" title="列数" />
					<span>×</span>
					<input type="number" class="form-input" id="table-rows" min="1" max="50" value="3" title="行数" />
					<button class="toolbar-button primary-button" id="btn-create-table">创建</button>
				</div>
				
				<div class="toolbar-divider"></div>
				
				<!-- 格式化 -->
				<button class="toolbar-button" id="btn-format-table" title="格式化表格">格式化</button>
				
				<div class="toolbar-divider"></div>
				
				<!-- 行操作 -->
				<div class="toolbar-group">
					<span class="group-label">行:</span>
					<button class="toolbar-button" id="btn-add-row-above" title="上方插入行">↑插入</button>
					<button class="toolbar-button" id="btn-add-row-below" title="下方插入行">↓插入</button>
					<button class="toolbar-button" id="btn-delete-row" title="删除行">删除</button>
					<button class="toolbar-button" id="btn-move-row-up" title="上移行">⬆</button>
					<button class="toolbar-button" id="btn-move-row-down" title="下移行">⬇</button>
				</div>
				
				<div class="toolbar-divider"></div>
				
				<!-- 列操作 -->
				<div class="toolbar-group">
					<span class="group-label">列:</span>
					<button class="toolbar-button" id="btn-add-column-left" title="左侧插入列">←插入</button>
					<button class="toolbar-button" id="btn-add-column-right" title="右侧插入列">→插入</button>
					<button class="toolbar-button" id="btn-delete-column" title="删除列">删除</button>
					<button class="toolbar-button" id="btn-move-column-left" title="左移列">⬅</button>
					<button class="toolbar-button" id="btn-move-column-right" title="右移列">➡</button>
				</div>
				
				<div class="toolbar-divider"></div>
				
				<!-- 对齐 -->
				<div class="toolbar-group">
					<span class="group-label">对齐:</span>
					<button class="toolbar-button" id="btn-align-left" title="左对齐">⬅</button>
					<button class="toolbar-button" id="btn-align-center" title="居中">⬌</button>
					<button class="toolbar-button" id="btn-align-right" title="右对齐">➡</button>
					<button class="toolbar-button" id="btn-align-clear" title="清除对齐">清除</button>
				</div>
				
				<!-- 关闭按钮 -->
				<button class="close-button" id="btn-close-panel" title="关闭面板">✕</button>
			</div>
		</div>
		</body>
		</html>
	`;
}
