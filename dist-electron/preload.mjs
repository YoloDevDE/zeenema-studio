let electron = require("electron");
//#region electron/preload.ts
electron.contextBridge.exposeInMainWorld("zeenema", {
	loadData: () => electron.ipcRenderer.invoke("load-data"),
	saveData: (data) => electron.ipcRenderer.invoke("save-data", data),
	newProject: () => electron.ipcRenderer.invoke("project-new"),
	openProject: () => electron.ipcRenderer.invoke("project-open"),
	saveProject: (data) => electron.ipcRenderer.invoke("project-save", data),
	saveProjectAs: (data) => electron.ipcRenderer.invoke("project-save-as", data),
	chooseDirectory: () => electron.ipcRenderer.invoke("choose-directory"),
	getDefaultProjectsDir: () => electron.ipcRenderer.invoke("get-default-projects-dir"),
	saveProjectToDir: (data, dirPath, fileName) => electron.ipcRenderer.invoke("project-save-to-dir", data, dirPath, fileName)
});
//#endregion

//# sourceMappingURL=preload.mjs.map