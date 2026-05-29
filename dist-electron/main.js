import { BrowserWindow as e, Menu as t, app as n, dialog as r, ipcMain as i, shell as a } from "electron";
import { dirname as o, join as s } from "path";
import { fileURLToPath as c } from "url";
import { existsSync as l, mkdirSync as u, readFileSync as d, writeFileSync as f } from "fs";
//#region electron/main.ts
var p = o(c(import.meta.url)), m = !n.isPackaged, h = s(n.getPath("userData"), "zeenema"), g = s(h, "data.json"), _ = s(n.getPath("appData"), ".zeenema", "projects");
function v() {
	l(h) || u(h, { recursive: !0 });
}
function y() {
	l(_) || u(_, { recursive: !0 });
}
i.handle("load-data", () => {
	if (v(), !l(g)) return null;
	try {
		return JSON.parse(d(g, "utf-8"));
	} catch {
		return null;
	}
}), i.handle("save-data", (e, t) => {
	v(), f(g, JSON.stringify(t, null, 2), "utf-8");
});
var b = null;
i.handle("project-new", () => (b = null, null)), i.handle("project-open", async () => {
	let e = await r.showOpenDialog({
		title: "Open Project",
		filters: [{
			name: "Zeenema Project",
			extensions: ["znm"]
		}],
		properties: ["openFile"]
	});
	if (e.canceled || e.filePaths.length === 0) return null;
	b = e.filePaths[0];
	try {
		return JSON.parse(d(b, "utf-8"));
	} catch {
		return null;
	}
}), i.handle("get-default-projects-dir", () => (y(), _)), i.handle("project-save-to-dir", async (e, t, n, r) => {
	try {
		l(n) || u(n, { recursive: !0 });
		let e = s(n, r.endsWith(".znm") ? r : r + ".znm");
		return f(e, JSON.stringify(t, null, 2), "utf-8"), b = e, e;
	} catch {
		return null;
	}
}), i.handle("project-save", async (e, t) => {
	if (!b) {
		y();
		let e = await r.showSaveDialog({
			title: "Save Project",
			defaultPath: s(_, "project.znm"),
			filters: [{
				name: "Zeenema Project",
				extensions: ["znm"]
			}]
		});
		if (e.canceled || !e.filePath) return !1;
		b = e.filePath;
	}
	return f(b, JSON.stringify(t, null, 2), "utf-8"), !0;
}), i.handle("choose-directory", async () => {
	let e = await r.showOpenDialog({
		title: "Choose Save Location",
		properties: ["openDirectory", "createDirectory"]
	});
	return e.canceled || e.filePaths.length === 0 ? null : e.filePaths[0];
}), i.handle("project-save-as", async (e, t) => {
	y();
	let n = await r.showSaveDialog({
		title: "Save Project As",
		defaultPath: b ?? s(_, "project.znm"),
		filters: [{
			name: "Zeenema Project",
			extensions: ["znm"]
		}]
	});
	return n.canceled || !n.filePath ? !1 : (b = n.filePath, f(b, JSON.stringify(t, null, 2), "utf-8"), !0);
});
var x = null;
function S() {
	x = new e({
		width: 1280,
		height: 800,
		minWidth: 800,
		minHeight: 500,
		title: "Zeenema Studio",
		backgroundColor: "#0f1117",
		webPreferences: {
			preload: s(p, "preload.js"),
			contextIsolation: !0,
			nodeIntegration: !1
		}
	}), m ? (x.loadURL("http://localhost:5173"), x.webContents.openDevTools({ mode: "detach" })) : x.loadFile(s(p, "../dist/index.html")), x.webContents.setWindowOpenHandler(({ url: e }) => (a.openExternal(e), { action: "deny" }));
}
n.whenReady().then(() => {
	t.setApplicationMenu(null), S(), n.on("activate", () => {
		e.getAllWindows().length === 0 && S();
	});
}), n.on("window-all-closed", () => {
	process.platform !== "darwin" && n.quit();
});
//#endregion

//# sourceMappingURL=main.js.map