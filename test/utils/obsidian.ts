import { config } from "../../package.json";
import { setPref } from "../../src/utils/prefs";
import { setObsidianItemNoteMap } from "../../src/modules/obsidian/settings";
import { resetManagedPathRegistryState } from "../../src/modules/obsidian/managedPathRegistry";

const GENERATED_BLOCK_START = `<!-- ${config.addonRef}:BEGIN GENERATED -->`;
const GENERATED_BLOCK_END = `<!-- ${config.addonRef}:END GENERATED -->`;
const USER_BLOCK_START = `<!-- ${config.addonRef}:BEGIN USER -->`;
const USER_BLOCK_END = `<!-- ${config.addonRef}:END USER -->`;

type MockManagedAnnotationInput = {
  id?: number;
  key?: string;
  version?: number;
  dateModified?: string;
  annotationType?: string;
  annotationPageLabel?: string;
  annotationColor?: string;
  annotationSortIndex?: string;
  annotationText?: string;
  annotationComment?: string;
  tags?: string[];
};

export async function createManagedObsidianNote() {
  const topItem = new Zotero.Item("journalArticle");
  topItem.setField("title", "Managed Sync Article");
  topItem.setField(
    "extra",
    ["titleTranslation: 托管同步标题", "abstractTranslation: 托管摘要翻译"].join(
      "\n",
    ),
  );
  topItem.setField("date", "2024-05-15");
  topItem.setField("DOI", "10.1234/managed-sync");
  await topItem.saveTx();

  const note = new Zotero.Item("note");
  note.libraryID = topItem.libraryID;
  note.parentID = topItem.id;
  note.setNote(
    `<div data-schema-version="${config.dataSchemaVersion}"><h2>Notes</h2><p>Local Zotero fallback</p></div>`,
  );
  await note.saveTx();

  setObsidianItemNoteMap({
    [`${topItem.libraryID}/${topItem.key}`]: note.key,
  });

  return { topItem, note };
}

export function resetManagedObsidianPrefs() {
  setObsidianItemNoteMap({});
  resetManagedPathRegistryState();
  setPref("obsidian.dashboardDir", "");
  setPref("obsidian.dashboardAutoSetup", true);
  setPref("obsidian.vaultRoot", "");
  setPref("obsidian.notesDir", "");
  setPref("obsidian.assetsDir", "");
  setPref("obsidian.includeAnnotations", true);
}

export function configureObsidianDashboardPrefs(
  vaultRoot: string,
  notesDir: string,
  dashboardDir: string,
) {
  setPref("obsidian.vaultRoot", vaultRoot);
  setPref("obsidian.notesDir", notesDir);
  setPref("obsidian.assetsDir", PathUtils.join(vaultRoot, "assets", "zotero"));
  setPref("obsidian.dashboardDir", dashboardDir);
  setPref("obsidian.dashboardAutoSetup", true);
}

export function getManagedObsidianMarkdownFixture() {
  return `---
status: review
rating: 4
topic: sync-model
aliases:
  - Custom Alias
tags:
  - project-x
---

${GENERATED_BLOCK_START}

# Old Generated Title

> [!info]+ <center>Metadata</center>
>
> |Key|Value|
> |--:|:--|
> |标题|Old Generated Title|

${GENERATED_BLOCK_END}

${USER_BLOCK_START}

## Notes

- User note from Obsidian

## Questions

- User question from Obsidian

${USER_BLOCK_END}
`;
}

export function mockManagedPDFAnnotations(
  topItem: Zotero.Item,
  annotations: MockManagedAnnotationInput[],
) {
  const originalItemsGet = Zotero.Items.get.bind(Zotero.Items);
  const attachmentID = 910000000 + Math.floor(Math.random() * 100000);
  const attachmentKey = `MOCKPDF${attachmentID}`;
  const pdfAttachment = {
    id: attachmentID,
    key: attachmentKey,
    parentItem: topItem,
    isRegularItem: () => false,
    isNote: () => false,
    isAttachment: () => true,
    isAnnotation: () => false,
    isPDFAttachment: () => true,
    getAnnotations: () => annotationItems,
  };
  const annotationItems = annotations.map((annotation, index) => ({
    id: annotation.id || attachmentID + index + 1,
    key: annotation.key || `MOCKANN${index + 1}`,
    version: annotation.version || 1,
    dateModified: annotation.dateModified || "2026-03-21 10:00:00",
    annotationType: annotation.annotationType || "highlight",
    annotationPageLabel: annotation.annotationPageLabel || `${index + 1}`,
    annotationColor: annotation.annotationColor || "#ffd400",
    annotationSortIndex:
      annotation.annotationSortIndex || `0000|00000${index + 1}|00000`,
    annotationText: annotation.annotationText || "",
    annotationComment: annotation.annotationComment || "",
    parentItem: pdfAttachment,
    isRegularItem: () => false,
    isNote: () => false,
    isAttachment: () => false,
    isAnnotation: () => true,
    getTags: () =>
      (annotation.tags || []).map((tag) => ({
        tag,
      })),
  }));

  const getMockItem = (itemID: number) => {
    if (itemID === attachmentID) {
      return pdfAttachment;
    }
    return annotationItems.find((annotationItem) => annotationItem.id === itemID);
  };

  (topItem as any).getAttachments = () => [attachmentID];
  (Zotero.Items as any).get = ((ids: number | number[]) => {
    if (Array.isArray(ids)) {
      return ids.map((itemID) => getMockItem(itemID) || originalItemsGet(itemID));
    }
    return getMockItem(ids) || originalItemsGet(ids);
  }) as typeof Zotero.Items.get;

  return {
    attachmentID,
    attachmentKey,
    annotationItems,
    restore() {
      delete (topItem as any).getAttachments;
      (Zotero.Items as any).get = originalItemsGet;
    },
  };
}
