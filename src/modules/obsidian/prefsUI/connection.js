"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderConnectionTestResult = renderConnectionTestResult;
exports.renderConnectionStatus = renderConnectionStatus;
exports.updateConnectionDiagnostics = updateConnectionDiagnostics;
exports.testObsidianConnection = testObsidianConnection;
const str_1 = require("../../../utils/str");
const settings_1 = require("../settings");
const shared_1 = require("../shared");
const state_1 = require("./state");
const uiIds_1 = require("./uiIds");
const helpers_1 = require("./helpers");
function renderConnectionTestResult() {
    const result = (0, helpers_1.getPrefElement)(uiIds_1.OBSIDIAN_CONNECTION_TEST_RESULT_ID);
    const button = (0, helpers_1.getPrefElement)(uiIds_1.OBSIDIAN_CONNECTION_TEST_BUTTON_ID);
    if (!result || !button) {
        return;
    }
    button.disabled = state_1.obsidianPrefsState.connectionTest.status === "running";
    const hasMessage = Boolean((0, shared_1.cleanInline)(state_1.obsidianPrefsState.connectionTest.message));
    result.hidden = !hasMessage;
    result.className = `ob-bridge-feedback ob-bridge-feedback--${state_1.obsidianPrefsState.connectionTest.status}`;
    result.textContent = state_1.obsidianPrefsState.connectionTest.message;
}
function renderConnectionStatus() {
    const status = (0, helpers_1.getPrefElement)(uiIds_1.OBSIDIAN_CONNECTION_STATUS_ID);
    if (!status) {
        return;
    }
    status.className = "ob-bridge-status";
    status.replaceChildren();
    const doc = status.ownerDocument;
    const pill = (0, helpers_1.createPrefHTMLElement)(doc, "span");
    pill.className = `ob-bridge-status__pill ob-bridge-status__pill--${state_1.obsidianPrefsState.connection.status}`;
    pill.textContent =
        state_1.obsidianPrefsState.connection.title ||
            (0, helpers_1.uiText)("等待检查", "Waiting for check");
    status.appendChild(pill);
    if (state_1.obsidianPrefsState.connection.detail) {
        const detail = (0, helpers_1.createPrefHTMLElement)(doc, "span");
        detail.className = "ob-bridge-status__detail";
        detail.textContent = state_1.obsidianPrefsState.connection.detail;
        status.appendChild(detail);
    }
}
function updateConnectionDiagnostics() {
    return __awaiter(this, void 0, void 0, function* () {
        const requestId = ++state_1.obsidianPrefsState.connectionRequest;
        const { appPath, vaultRoot, notesDir } = (0, helpers_1.getObsidianResolvedPaths)();
        state_1.obsidianPrefsState.connection.status = "checking";
        state_1.obsidianPrefsState.connection.title = (0, helpers_1.uiText)("正在检查连接…", "Checking connection...");
        state_1.obsidianPrefsState.connection.detail = "";
        renderConnectionStatus();
        const [appExists, vaultExists] = yield Promise.all([
            (0, str_1.fileExists)(appPath),
            (0, str_1.fileExists)(vaultRoot),
        ]);
        if (requestId !== state_1.obsidianPrefsState.connectionRequest) {
            return;
        }
        if (!notesDir) {
            state_1.obsidianPrefsState.connection.status = "error";
            state_1.obsidianPrefsState.connection.title = (0, helpers_1.uiText)("未就绪", "Not ready");
            state_1.obsidianPrefsState.connection.detail = (0, helpers_1.uiText)("先设置 Vault 根目录或文献笔记目录。", "Set a vault root or notes folder first.");
        }
        else if (vaultRoot && !vaultExists) {
            state_1.obsidianPrefsState.connection.status = "error";
            state_1.obsidianPrefsState.connection.title = (0, helpers_1.uiText)("Vault 不可用", "Vault unavailable");
            state_1.obsidianPrefsState.connection.detail = (0, helpers_1.uiText)("当前 Vault 路径不存在。", "The configured vault path does not exist.");
        }
        else if (appPath && !appExists) {
            state_1.obsidianPrefsState.connection.status = "warning";
            state_1.obsidianPrefsState.connection.title = (0, helpers_1.uiText)("可写入，但应用路径异常", "Writable, but app path looks wrong");
            state_1.obsidianPrefsState.connection.detail = (0, helpers_1.uiText)("目录可用，但当前 Obsidian 应用路径不存在。", "Folders are ready, but the configured Obsidian app path does not exist.");
        }
        else if (!vaultRoot) {
            state_1.obsidianPrefsState.connection.status = "warning";
            state_1.obsidianPrefsState.connection.title = (0, helpers_1.uiText)("基础连接可用", "Basic connection ready");
            state_1.obsidianPrefsState.connection.detail = (0, helpers_1.uiText)("已可写入；补充 Vault 后可自动推导目录。", "Writable now. Adding the vault improves default path inference.");
        }
        else {
            state_1.obsidianPrefsState.connection.status = "ready";
            state_1.obsidianPrefsState.connection.title = (0, helpers_1.uiText)("已连接", "Connected");
            state_1.obsidianPrefsState.connection.detail = "";
        }
        renderConnectionStatus();
    });
}
function testObsidianConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        state_1.obsidianPrefsState.connectionTest.status = "running";
        state_1.obsidianPrefsState.connectionTest.message = (0, helpers_1.uiText)("测试写入中…", "Testing write access...");
        renderConnectionTestResult();
        try {
            const result = yield (0, settings_1.writeObsidianConnectionTestFile)();
            state_1.obsidianPrefsState.connectionTest.status = "success";
            state_1.obsidianPrefsState.connectionTest.message = (0, helpers_1.uiText)(`已写入 ${result.fileName}。`, `Wrote ${result.fileName}.`);
        }
        catch (error) {
            state_1.obsidianPrefsState.connectionTest.status = "error";
            state_1.obsidianPrefsState.connectionTest.message =
                (0, shared_1.cleanInline)((error === null || error === void 0 ? void 0 : error.message) || "") ||
                    (0, helpers_1.uiText)("测试失败，请检查路径和权限。", "Connection test failed. Check the path and permissions.");
        }
        renderConnectionTestResult();
        yield updateConnectionDiagnostics();
    });
}
