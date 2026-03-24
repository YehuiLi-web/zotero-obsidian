import { ClipboardHelper } from "zotero-plugin-toolkit";
import { config } from "../../package.json";
import { getAddon } from "../utils/global";
import { resetAll } from "../utils/status";
import { getNoteMarkdown, parseTemplateString } from "../utils/note";
import { getTempDirectory } from "../utils/io";
import {
  createManagedObsidianNote,
  getManagedObsidianMarkdownFixture,
  resetManagedObsidianPrefs,
} from "../utils/obsidian";
import { waitForItemModifyEvent } from "../utils/wait";

describe("Import", function () {
  const addon = getAddon();
  this.beforeAll(async function () {
    await resetAll();
  });

  this.afterEach(async function () {
    resetManagedObsidianPrefs();
  });

  it("api.$import.fromMD", async function () {
    const note = new Zotero.Item("note");
    await note.saveTx();

    const tempDir = await getTempDirectory();

    const filePath = PathUtils.join(tempDir, "test.md");

    await Zotero.File.putContentsAsync(filePath, getNoteMarkdown());

    debug("Note saved to", filePath);

    let itemModifyPromise = waitForItemModifyEvent(note.id);

    await addon.api.$import.fromMD(filePath, {
      noteId: note.id,
      ignoreVersion: true,
    });

    await itemModifyPromise;

    const content = await addon.api.convert.note2md(note, tempDir, {
      keepNoteLink: false,
      withYAMLHeader: false,
    });
    const expected = getNoteMarkdown().replace(
      "This is a inline math $123$  with space in list item test",
      "This is a inline math$123$ with space in list item test",
    );

    // new ClipboardHelper()
    //   .addText(parseTemplateString(content), "text/plain")
    //   .addText(parseTemplateString(expected), "text/plain")
    //   .copy();

    assert.equal(content, expected);

    // Cleanup
    await Zotero.Items.erase(note.id);
  });

  it("api.$import.fromMD only imports managed user blocks", async function () {
    const { topItem, note } = await createManagedObsidianNote();
    const tempDir = await getTempDirectory();
    const filePath = PathUtils.join(tempDir, "managed-import.md");
    addon.api.sync.clearHistory();

    await Zotero.File.putContentsAsync(filePath, getManagedObsidianMarkdownFixture());

    const itemModifyPromise = waitForItemModifyEvent(note.id);

    await addon.api.$import.fromMD(filePath, {
      noteId: note.id,
      ignoreVersion: true,
    });

    await Promise.race([itemModifyPromise, Zotero.Promise.delay(1000)]);

    const importedNote = Zotero.Items.get(note.id);
    const importedContent = importedNote.getNote();
    const importedTopItem = Zotero.Items.get(topItem.id);
    assert.include(importedContent, "User note from Obsidian");
    assert.include(importedContent, "User question from Obsidian");
    assert.notInclude(importedContent, "Old Generated Title");
    assert.notInclude(importedContent, "Metadata");
    assert.include(
      String(importedTopItem.getField("extra") || ""),
      "reading_status: review",
    );
    assert.include(
      String(importedTopItem.getField("extra") || ""),
      "rating: 4",
    );
    assert.sameMembers(
      importedTopItem.getTags().map((tag) => tag.tag),
      ["project-x"],
    );

    await addon.api.$export.saveMD(filePath, note.id, {
      keepNoteLink: false,
      withYAMLHeader: true,
    });

    const freshFilePath = PathUtils.join(tempDir, "managed-import-fresh.md");
    await addon.api.$export.saveMD(freshFilePath, note.id, {
      keepNoteLink: false,
      withYAMLHeader: true,
    });

    const exportedContent = (await Zotero.File.getContentsAsync(filePath)) as string;
    const exportedStatus = await addon.api.sync.getMDStatus(filePath);
    const freshExportStatus = await addon.api.sync.getMDStatus(freshFilePath);
    assert.include(exportedContent, "BEGIN GENERATED");
    assert.include(exportedContent, "BEGIN USER");
    assert.include(exportedContent, "User note from Obsidian");
    assert.equal(exportedStatus.meta?.reading_status, "review");
    assert.equal(exportedStatus.meta?.rating, 4);
    assert.equal(freshExportStatus.meta?.reading_status, "review");
    assert.equal(freshExportStatus.meta?.rating, 4);
    assert.sameMembers(exportedStatus.meta?.tags || [], [
      "literature",
      "zotero",
      "project-x",
    ]);
    assert.sameMembers(freshExportStatus.meta?.tags || [], [
      "literature",
      "zotero",
      "project-x",
    ]);
    const historyEntries = addon.api.sync.getHistory([note.id], 10);
    assert.isAtLeast(historyEntries.length, 2);
    assert.sameMembers(
      Array.from(
        new Set(historyEntries.map((entry: SyncHistoryEntry) => entry.target)),
      ),
      ["markdown", "note"],
    );

    await Zotero.Items.erase(note.id);
    await Zotero.Items.erase(topItem.id);
  });

  it("api.$import.fromMD syncs managed frontmatter back to Zotero item", async function () {
    const { topItem, note } = await createManagedObsidianNote();
    const tempDir = await getTempDirectory();
    const filePath = PathUtils.join(tempDir, "managed-import-backsync.md");
    addon.api.sync.clearHistory();
    topItem.addTag("legacy-tag", 0);
    topItem.addTag("stale-tag", 0);
    await topItem.saveTx();
    const markdown = `---
reading_status: summarized
rating: 5
zotero_tags:
  - manual-tag
tags:
  - literature
  - zotero
  - project-x
---

<!-- ${config.addonRef}:BEGIN GENERATED -->

# Managed Sync Article

<!-- ${config.addonRef}:END GENERATED -->

<!-- ${config.addonRef}:BEGIN USER -->

## Notes

- Backsynced note body

<!-- ${config.addonRef}:END USER -->
`;

    await Zotero.File.putContentsAsync(filePath, markdown);

    await addon.api.$import.fromMD(filePath, {
      noteId: note.id,
      ignoreVersion: true,
    });

    const importedTopItem = Zotero.Items.get(topItem.id);
    const importedExtra = importedTopItem.getField("extra");
    const importedTags = importedTopItem.getTags().map((tag) => tag.tag);

    assert.include(importedExtra, "reading_status: summarized");
    assert.include(importedExtra, "rating: 5");
    assert.sameMembers(importedTags, ["manual-tag", "project-x"]);
    assert.notInclude(importedTags, "legacy-tag");
    assert.notInclude(importedTags, "stale-tag");

    await addon.api.$export.saveMD(filePath, note.id, {
      keepNoteLink: false,
      withYAMLHeader: true,
    });

    const exportedStatus = await addon.api.sync.getMDStatus(filePath);

    assert.equal(exportedStatus.meta?.reading_status, "summarized");
    assert.equal(exportedStatus.meta?.rating, 5);
    assert.sameMembers(exportedStatus.meta?.zotero_tags || [], [
      "manual-tag",
      "project-x",
    ]);
    assert.sameMembers(exportedStatus.meta?.tags || [], [
      "literature",
      "zotero",
      "manual-tag",
      "project-x",
    ]);
    const historyEntries = addon.api.sync.getHistory([note.id], 10);
    assert.isAtLeast(historyEntries.length, 2);
    assert.include(
      historyEntries.map((entry: SyncHistoryEntry) => entry.reason),
      "manual-import",
    );

    await Zotero.Items.erase(note.id);
    await Zotero.Items.erase(topItem.id);
  });

  it("api.$import.fromMD does not replace a managed note when the USER block is missing", async function () {
    const { topItem, note } = await createManagedObsidianNote();
    const tempDir = await getTempDirectory();
    const filePath = PathUtils.join(tempDir, "managed-import-missing-user.md");
    const originalNoteContent = note.getNote();
    const markdown = `---
reading_status: review
rating: 3
---

<!-- ${config.addonRef}:BEGIN GENERATED -->

# Managed Sync Article

This generated block should not replace the Zotero-side user note.

<!-- ${config.addonRef}:END GENERATED -->
`;

    await Zotero.File.putContentsAsync(filePath, markdown);

    await addon.api.$import.fromMD(filePath, {
      noteId: note.id,
      ignoreVersion: true,
    });

    const importedNote = Zotero.Items.get(note.id);
    const importedTopItem = Zotero.Items.get(topItem.id);

    assert.equal(importedNote.getNote(), originalNoteContent);
    assert.include(
      String(importedTopItem.getField("extra") || ""),
      "reading_status: review",
    );
    assert.include(
      String(importedTopItem.getField("extra") || ""),
      "rating: 3",
    );

    await Zotero.Items.erase(note.id);
    await Zotero.Items.erase(topItem.id);
  });
});
