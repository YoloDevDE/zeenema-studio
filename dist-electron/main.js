import { BrowserWindow, Menu, app, dialog, ipcMain, shell } from "electron";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
//#region electron/main.ts
var __dirname = dirname(fileURLToPath(import.meta.url));
var isDev = !app.isPackaged;
var dataDir = join(app.getPath("userData"), "zeenema");
var dataFile = join(dataDir, "data.json");
var defaultProjectsDir = join(app.getPath("appData"), ".zeenema", "projects");
function ensureDataDir() {
	if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
}
function ensureProjectsDir() {
	if (!existsSync(defaultProjectsDir)) mkdirSync(defaultProjectsDir, { recursive: true });
}
ipcMain.handle("load-data", () => {
	ensureDataDir();
	if (!existsSync(dataFile)) return null;
	try {
		return JSON.parse(readFileSync(dataFile, "utf-8"));
	} catch {
		return null;
	}
});
ipcMain.handle("save-data", (_event, data) => {
	ensureDataDir();
	writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf-8");
});
var currentProjectPath = null;
ipcMain.handle("project-new", () => {
	currentProjectPath = null;
	return null;
});
ipcMain.handle("project-open", async () => {
	const result = await dialog.showOpenDialog({
		title: "Open Project",
		filters: [{
			name: "Zeenema Project",
			extensions: ["znm"]
		}],
		properties: ["openFile"]
	});
	if (result.canceled || result.filePaths.length === 0) return null;
	currentProjectPath = result.filePaths[0];
	try {
		return JSON.parse(readFileSync(currentProjectPath, "utf-8"));
	} catch {
		return null;
	}
});
ipcMain.handle("get-default-projects-dir", () => {
	ensureProjectsDir();
	return defaultProjectsDir;
});
ipcMain.handle("project-save-to-dir", async (_event, data, dirPath, fileName) => {
	try {
		if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
		const filePath = join(dirPath, fileName.endsWith(".znm") ? fileName : fileName + ".znm");
		writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
		currentProjectPath = filePath;
		return filePath;
	} catch {
		return null;
	}
});
ipcMain.handle("project-save", async (_event, data) => {
	if (!currentProjectPath) {
		ensureProjectsDir();
		const result = await dialog.showSaveDialog({
			title: "Save Project",
			defaultPath: join(defaultProjectsDir, "project.znm"),
			filters: [{
				name: "Zeenema Project",
				extensions: ["znm"]
			}]
		});
		if (result.canceled || !result.filePath) return false;
		currentProjectPath = result.filePath;
	}
	writeFileSync(currentProjectPath, JSON.stringify(data, null, 2), "utf-8");
	return true;
});
ipcMain.handle("choose-directory", async () => {
	const result = await dialog.showOpenDialog({
		title: "Choose Save Location",
		properties: ["openDirectory", "createDirectory"]
	});
	if (result.canceled || result.filePaths.length === 0) return null;
	return result.filePaths[0];
});
ipcMain.handle("project-save-as", async (_event, data) => {
	ensureProjectsDir();
	const result = await dialog.showSaveDialog({
		title: "Save Project As",
		defaultPath: currentProjectPath ?? join(defaultProjectsDir, "project.znm"),
		filters: [{
			name: "Zeenema Project",
			extensions: ["znm"]
		}]
	});
	if (result.canceled || !result.filePath) return false;
	currentProjectPath = result.filePath;
	writeFileSync(currentProjectPath, JSON.stringify(data, null, 2), "utf-8");
	return true;
});
var win = null;
function createWindow() {
	win = new BrowserWindow({
		width: 1280,
		height: 800,
		minWidth: 800,
		minHeight: 500,
		title: "Zeenema Studio",
		backgroundColor: "#0f1117",
		webPreferences: {
			preload: join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false
		}
	});
	if (isDev) {
		win.loadURL("http://localhost:5173");
		win.webContents.openDevTools({ mode: "detach" });
	} else win.loadFile(join(__dirname, "../dist/index.html"));
	win.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: "deny" };
	});
}
app.whenReady().then(() => {
	Menu.setApplicationMenu(null);
	createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
//#endregion

//# sourceMappingURL=main.js.map