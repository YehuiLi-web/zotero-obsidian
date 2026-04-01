import { fileExists } from "../../../../utils/str";
import { writeObsidianConnectionTestFile } from "../../../obsidian/settings";
import { cleanInline } from "../../../obsidian/shared";
import { obsidianPrefsState } from "./state";
import {
  OBSIDIAN_CONNECTION_STATUS_ID,
  OBSIDIAN_CONNECTION_TEST_BUTTON_ID,
  OBSIDIAN_CONNECTION_TEST_RESULT_ID,
} from "./uiIds";
import {
  createPrefHTMLElement,
  getObsidianResolvedPaths,
  getPrefElement,
  uiText,
} from "./helpers";

export function renderConnectionTestResult() {
  const result = getPrefElement<HTMLElement>(
    OBSIDIAN_CONNECTION_TEST_RESULT_ID,
  );
  const button = getPrefElement<HTMLButtonElement>(
    OBSIDIAN_CONNECTION_TEST_BUTTON_ID,
  );
  if (!result || !button) {
    return;
  }

  button.disabled = obsidianPrefsState.connectionTest.status === "running";
  const hasMessage = Boolean(
    cleanInline(obsidianPrefsState.connectionTest.message),
  );
  result.hidden = !hasMessage;
  result.className = `ob-bridge-feedback ob-bridge-feedback--${obsidianPrefsState.connectionTest.status}`;
  result.textContent = obsidianPrefsState.connectionTest.message;
}

export function renderConnectionStatus() {
  const status = getPrefElement<HTMLElement>(OBSIDIAN_CONNECTION_STATUS_ID);
  if (!status) {
    return;
  }
  status.className = "ob-bridge-status";
  status.replaceChildren();
  const doc = status.ownerDocument;
  const pill = createPrefHTMLElement(doc, "span");
  pill.className = `ob-bridge-status__pill ob-bridge-status__pill--${obsidianPrefsState.connection.status}`;
  pill.textContent =
    obsidianPrefsState.connection.title ||
    uiText("等待检查", "Waiting for check");
  status.appendChild(pill);
  if (obsidianPrefsState.connection.detail) {
    const detail = createPrefHTMLElement(doc, "span");
    detail.className = "ob-bridge-status__detail";
    detail.textContent = obsidianPrefsState.connection.detail;
    status.appendChild(detail);
  }
}

export async function updateConnectionDiagnostics() {
  const requestId = ++obsidianPrefsState.connectionRequest;
  const { appPath, vaultRoot, notesDir } = getObsidianResolvedPaths();

  obsidianPrefsState.connection.status = "checking";
  obsidianPrefsState.connection.title = uiText(
    "正在检查连接…",
    "Checking connection...",
  );
  obsidianPrefsState.connection.detail = "";
  renderConnectionStatus();

  const [appExists, vaultExists] = await Promise.all([
    fileExists(appPath),
    fileExists(vaultRoot),
  ]);

  if (requestId !== obsidianPrefsState.connectionRequest) {
    return;
  }

  if (!notesDir) {
    obsidianPrefsState.connection.status = "error";
    obsidianPrefsState.connection.title = uiText("未就绪", "Not ready");
    obsidianPrefsState.connection.detail = uiText(
      "先设置 Vault 根目录或文献笔记目录。",
      "Set a vault root or notes folder first.",
    );
  } else if (vaultRoot && !vaultExists) {
    obsidianPrefsState.connection.status = "error";
    obsidianPrefsState.connection.title = uiText(
      "Vault 不可用",
      "Vault unavailable",
    );
    obsidianPrefsState.connection.detail = uiText(
      "当前 Vault 路径不存在。",
      "The configured vault path does not exist.",
    );
  } else if (appPath && !appExists) {
    obsidianPrefsState.connection.status = "warning";
    obsidianPrefsState.connection.title = uiText(
      "应用路径异常",
      "App path issue",
    );
    obsidianPrefsState.connection.detail = uiText(
      "目录可用，但应用路径不存在。",
      "Folders are ready, but the app path does not exist.",
    );
  } else if (!vaultRoot) {
    obsidianPrefsState.connection.status = "warning";
    obsidianPrefsState.connection.title = uiText(
      "目录可用",
      "Folders ready",
    );
    obsidianPrefsState.connection.detail = uiText(
      "补充 Vault 后可自动推导默认目录。",
      "Add a vault to infer default folders.",
    );
  } else {
    obsidianPrefsState.connection.status = "ready";
    obsidianPrefsState.connection.title = uiText("已连接", "Connected");
    obsidianPrefsState.connection.detail = "";
  }

  renderConnectionStatus();
}

export async function testObsidianConnection() {
  obsidianPrefsState.connectionTest.status = "running";
  obsidianPrefsState.connectionTest.message = uiText(
    "测试写入中…",
    "Testing write access...",
  );
  renderConnectionTestResult();

  try {
    const result = await writeObsidianConnectionTestFile();
    obsidianPrefsState.connectionTest.status = "success";
    obsidianPrefsState.connectionTest.message = uiText(
      `已写入 ${result.fileName}。`,
      `Wrote ${result.fileName}.`,
    );
  } catch (error) {
    obsidianPrefsState.connectionTest.status = "error";
    obsidianPrefsState.connectionTest.message =
      cleanInline((error as Error)?.message || "") ||
      uiText(
        "测试失败，请检查路径和权限。",
        "Connection test failed. Check the path and permissions.",
      );
  }

  renderConnectionTestResult();
  await updateConnectionDiagnostics();
}
