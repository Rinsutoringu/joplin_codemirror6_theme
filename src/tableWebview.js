// webview 脚本
(function() {
	console.log('Table dialog webview script loaded');
	console.log('webviewApi:', window.webviewApi);
	
	const webviewApi = window.webviewApi;
	
	// 关闭面板
	const closeBtn = document.getElementById('btn-close-panel');
	if (closeBtn) {
		closeBtn.addEventListener('click', async () => {
			console.log('Close panel clicked');
			await webviewApi.postMessage({ command: 'closePanel' });
		});
	}
	
	// 创建表格
	const createBtn = document.getElementById('btn-create-table');
	if (createBtn) {
		createBtn.addEventListener('click', async () => {
			console.log('Create table clicked');
			const cols = parseInt(document.getElementById('table-cols').value);
			const rows = parseInt(document.getElementById('table-rows').value);
			await webviewApi.postMessage({ command: 'createTable', cols, rows });
		});
	}

	// 格式化表格
	const formatBtn = document.getElementById('btn-format-table');
	if (formatBtn) {
		formatBtn.addEventListener('click', async () => {
			console.log('Format table clicked');
			await webviewApi.postMessage({ command: 'formatTable' });
		});
	}

	// 行操作
	const addRowAboveBtn = document.getElementById('btn-add-row-above');
	if (addRowAboveBtn) addRowAboveBtn.addEventListener('click', async () => {
		await webviewApi.postMessage({ command: 'addRowAbove' });
	});
	
	const addRowBelowBtn = document.getElementById('btn-add-row-below');
	if (addRowBelowBtn) addRowBelowBtn.addEventListener('click', async () => {
		await webviewApi.postMessage({ command: 'addRowBelow' });
	});
	
	const deleteRowBtn = document.getElementById('btn-delete-row');
	if (deleteRowBtn) deleteRowBtn.addEventListener('click', async () => {
		await webviewApi.postMessage({ command: 'deleteRow' });
	});
	
	const moveRowUpBtn = document.getElementById('btn-move-row-up');
	if (moveRowUpBtn) moveRowUpBtn.addEventListener('click', async () => {
		await webviewApi.postMessage({ command: 'moveRowUp' });
	});
	
	const moveRowDownBtn = document.getElementById('btn-move-row-down');
	if (moveRowDownBtn) moveRowDownBtn.addEventListener('click', async () => {
		await webviewApi.postMessage({ command: 'moveRowDown' });
	});

	// 列操作
	const addColumnLeftBtn = document.getElementById('btn-add-column-left');
	if (addColumnLeftBtn) addColumnLeftBtn.addEventListener('click', async () => {
		await webviewApi.postMessage({ command: 'addColumnLeft' });
	});
	
	const addColumnRightBtn = document.getElementById('btn-add-column-right');
	if (addColumnRightBtn) addColumnRightBtn.addEventListener('click', async () => {
		await webviewApi.postMessage({ command: 'addColumnRight' });
	});
	
	const deleteColumnBtn = document.getElementById('btn-delete-column');
	if (deleteColumnBtn) deleteColumnBtn.addEventListener('click', async () => {
		await webviewApi.postMessage({ command: 'deleteColumn' });
	});
	
	const moveColumnLeftBtn = document.getElementById('btn-move-column-left');
	if (moveColumnLeftBtn) moveColumnLeftBtn.addEventListener('click', async () => {
		await webviewApi.postMessage({ command: 'moveColumnLeft' });
	});
	
	const moveColumnRightBtn = document.getElementById('btn-move-column-right');
	if (moveColumnRightBtn) moveColumnRightBtn.addEventListener('click', async () => {
		await webviewApi.postMessage({ command: 'moveColumnRight' });
	});

	// 对齐操作
	const alignLeftBtn = document.getElementById('btn-align-left');
	if (alignLeftBtn) alignLeftBtn.addEventListener('click', async () => {
		await webviewApi.postMessage({ command: 'alignLeft' });
	});
	
	const alignCenterBtn = document.getElementById('btn-align-center');
	if (alignCenterBtn) alignCenterBtn.addEventListener('click', async () => {
		await webviewApi.postMessage({ command: 'alignCenter' });
	});
	
	const alignRightBtn = document.getElementById('btn-align-right');
	if (alignRightBtn) alignRightBtn.addEventListener('click', async () => {
		await webviewApi.postMessage({ command: 'alignRight' });
	});
	
	const alignClearBtn = document.getElementById('btn-align-clear');
	if (alignClearBtn) alignClearBtn.addEventListener('click', async () => {
		await webviewApi.postMessage({ command: 'alignClear' });
	});
})();
