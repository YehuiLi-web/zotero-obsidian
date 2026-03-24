import { ClipboardHelper } from "zotero-plugin-toolkit";
import { config } from "../../package.json";
import { getAddon } from "../utils/global";
import { resetAll } from "../utils/status";
import {
  getNoteContent,
  getNoteLatexContent,
  getNoteMarkdown,
  getNoteLatex,
  parseTemplateString,
} from "../utils/note";
import { getTempDirectory } from "../utils/io";
import {
  configureObsidianDashboardPrefs,
  createManagedObsidianNote,
  getManagedObsidianMarkdownFixture,
  mockManagedPDFAnnotations,
  resetManagedObsidianPrefs,
} from "../utils/obsidian";
import { setPref } from "../../src/utils/prefs";
import { waitUtilAsync } from "../../src/utils/wait";
import { setObsidianItemNoteMap } from "../../src/modules/obsidian/settings";

describe("Export", function () {
  const addon = getAddon();
  this.beforeAll(async function () {
    await resetAll();
  });

  this.afterEach(async function () {
    resetManagedObsidianPrefs();
  });

  it("api.$export.saveMD", async function () {
    const note = new Zotero.Item("note");
    note.setNote(getNoteContent());
    await note.saveTx();

    const tempDir = await getTempDirectory();

    const filePath = PathUtils.join(tempDir, "test.md");

    await addon.api.$export.saveMD(filePath, note.id, {
      keepNoteLink: true,
      withYAMLHeader: false,
    });

    debug("Note saved to", filePath);

    const content = await Zotero.File.getContentsAsync(filePath);

    const expected = getNoteMarkdown();

    // new ClipboardHelper()
    //   .addText(parseTemplateString(content as string), "text/plain")
    //   .addText(parseTemplateString(expected), "text/html")
    //   .copy();

    assert.equal(content, expected);

    await Zotero.Items.erase(note.id);
  });

  it("api.$export.saveLatex", async function () {
    const note = new Zotero.Item("note");
    note.setNote(getNoteLatexContent());
    await note.saveTx();

    const tempDir = await getTempDirectory();

    const filePath = PathUtils.join(tempDir, "test.tex");

    await addon.api.$export.saveLatex(filePath, note.id);

    debug("Note saved to", filePath);

    const content = await Zotero.File.getContentsAsync(filePath);

    const expected = getNoteLatex();

    assert.equal(content, expected);

    await Zotero.Items.erase(note.id);
  });

  it("api.$export.saveMD preserves managed frontmatter and markers", async function () {
    const { topItem, note } = await createManagedObsidianNote();
    const tempDir = await getTempDirectory();
    const filePath = PathUtils.join(tempDir, "managed-note.md");

    await Zotero.File.putContentsAsync(filePath, getManagedObsidianMarkdownFixture());

    await addon.api.$export.saveMD(filePath, note.id, {
      keepNoteLink: false,
      withYAMLHeader: true,
    });

    const content = (await Zotero.File.getContentsAsync(filePath)) as string;
    const mdStatus = await addon.api.sync.getMDStatus(filePath);
    const syncStatus = addon.api.sync.getSyncStatus(note.id);

    assert.include(content, "BEGIN GENERATED");
    assert.include(content, "BEGIN USER");
    assert.include(content, "User note from Obsidian");
    assert.isTrue(addon.api.sync.isSyncNote(note.id));
    assert.equal(syncStatus.path, tempDir);
    assert.equal(syncStatus.filename, "managed-note.md");
    assert.isTrue(Boolean(syncStatus.managedSourceHash));
    assert.equal(mdStatus.meta?.$libraryID, note.libraryID);
    assert.equal(mdStatus.meta?.zotero_key, topItem.key);
    assert.equal(mdStatus.meta?.zotero_note_key, note.key);
    assert.equal(mdStatus.meta?.reading_status, "review");
    assert.equal(mdStatus.meta?.rating, 4);
    assert.equal(mdStatus.meta?.topic, "sync-model");
    assert.isTrue(mdStatus.meta?.bridge_managed);
    assert.sameMembers(mdStatus.meta?.tags || [], [
      "literature",
      "zotero",
      "project-x",
    ]);
    assert.sameMembers(mdStatus.meta?.aliases || [], [
      "Custom Alias",
      "托管同步标题",
    ]);

    await Zotero.Items.erase(note.id);
    await Zotero.Items.erase(topItem.id);
  });

  it("api.obsidian.renderMarkdown preserves user-managed frontmatter fields", async function () {
    const { topItem, note } = await createManagedObsidianNote();
    const tempDir = await getTempDirectory();
    const filePath = PathUtils.join(tempDir, "managed-render.md");
    const existingMarkdown = getManagedObsidianMarkdownFixture().replace(
      "topic: sync-model",
      [
        "project:",
        "  - alpha-track",
        "method:",
        "  - transformer",
        "topic:",
        "  - sync-model",
      ].join("\n"),
    );

    await Zotero.File.putContentsAsync(filePath, existingMarkdown);

    const rendered = await addon.api.obsidian.renderMarkdown(note, {
      noteDir: tempDir,
      targetPath: filePath,
    });

    assert.include(rendered, "BEGIN GENERATED");
    assert.include(rendered, "BEGIN USER");
    assert.include(rendered, "# Managed Sync Article");
    assert.include(rendered, "User note from Obsidian");
    assert.match(rendered, /project:\r?\n\s+-\s+"alpha-track"/);
    assert.match(rendered, /method:\r?\n\s+-\s+"transformer"/);
    assert.match(rendered, /topic:\r?\n\s+-\s+"sync-model"/);
    assert.include(rendered, "bridge_managed: true");

    await Zotero.Items.erase(note.id);
    await Zotero.Items.erase(topItem.id);
  });

  it("managed notes export Zotero-side user edits back into the USER block", async function () {
    const { topItem, note } = await createManagedObsidianNote();
    const tempDir = await getTempDirectory();
    const filePath = PathUtils.join(tempDir, "managed-note-zotero-user-sync.md");

    await Zotero.File.putContentsAsync(filePath, getManagedObsidianMarkdownFixture());

    await addon.api.$export.saveMD(filePath, note.id, {
      keepNoteLink: false,
      withYAMLHeader: true,
    });

    note.setNote(
      `<div data-schema-version="${config.dataSchemaVersion}"><h2>Notes</h2><p>Zotero side updated note</p></div>`,
    );
    await note.saveTx({
      notifierData: {
        skipOB: true,
      },
    });

    await addon.api.$export.saveMD(filePath, note.id, {
      keepNoteLink: false,
      withYAMLHeader: true,
    });

    const content = (await Zotero.File.getContentsAsync(filePath)) as string;

    assert.include(content, "BEGIN USER");
    assert.include(content, "Zotero side updated note");
    assert.notInclude(content, "User note from Obsidian");

    await Zotero.Items.erase(note.id);
    await Zotero.Items.erase(topItem.id);
  });

  it("api.$export.saveMD includes managed PDF annotations", async function () {
    const { topItem, note } = await createManagedObsidianNote();
    const mockedAnnotations = mockManagedPDFAnnotations(topItem, [
      {
        annotationPageLabel: "12",
        annotationType: "highlight",
        annotationText: "Important highlight text",
        annotationComment: "Why this matters",
        tags: ["evidence", "claim"],
      },
      {
        annotationPageLabel: "13",
        annotationType: "image",
        annotationComment: "Figure snapshot note",
      },
    ]);

    try {
      const tempDir = await getTempDirectory();
      const filePath = PathUtils.join(tempDir, "managed-annotations.md");

      await addon.api.$export.saveMD(filePath, note.id, {
        keepNoteLink: false,
        withYAMLHeader: true,
      });

      const content = (await Zotero.File.getContentsAsync(filePath)) as string;

      assert.include(content, "## Annotations");
      assert.include(content, "### p.12 · highlight");
      assert.include(content, "> Important highlight text");
      assert.include(content, "Why this matters");
      assert.include(content, "Tags: `claim`, `evidence`");
      assert.include(content, "### p.13 · image");
      assert.include(content, "> [Image annotation]");
      assert.include(content, "Figure snapshot note");
    } finally {
      mockedAnnotations.restore();
      await Zotero.Items.erase(note.id);
      await Zotero.Items.erase(topItem.id);
    }
  });

  it("managed notes resync and rename when parent item metadata changes", async function () {
    const { topItem, note } = await createManagedObsidianNote();
    const syncDir = await getTempDirectory();

    await addon.api.$export.syncMDBatch(syncDir, [note.id]);

    const initialSyncStatus = addon.api.sync.getSyncStatus(note.id);
    assert.isTrue(addon.api.sync.isSyncNote(note.id));
    assert.isTrue(Boolean(initialSyncStatus.managedSourceHash));

    const initialFilePath = PathUtils.join(syncDir, initialSyncStatus.filename);
    assert.isTrue(await IOUtils.exists(initialFilePath));

    topItem.setField("title", "Managed Sync Article Updated");
    await topItem.saveTx({
      notifierData: {
        skipOB: true,
      },
    });

    await addon.hooks.onNotify("modify", "item", [topItem.id], {});
    await waitUtilAsync(
      () =>
        addon.api.sync.getSyncStatus(note.id).managedSourceHash !==
        initialSyncStatus.managedSourceHash,
      50,
      5000,
    );

    const updatedSyncStatus = addon.api.sync.getSyncStatus(note.id);
    const updatedFilePath = PathUtils.join(syncDir, updatedSyncStatus.filename);
    const updatedContent = (await Zotero.File.getContentsAsync(
      updatedFilePath,
    )) as string;
    const expectedFileName = addon.api.obsidian.getManagedFileName(note);

    assert.notEqual(updatedSyncStatus.managedSourceHash, initialSyncStatus.managedSourceHash);
    assert.equal(updatedSyncStatus.filename, expectedFileName);
    assert.include(updatedContent, "# Managed Sync Article Updated");
    assert.include(updatedContent, 'title: "Managed Sync Article Updated"');
    assert.isTrue(await IOUtils.exists(updatedFilePath));
    assert.isFalse(await IOUtils.exists(initialFilePath));

    await Zotero.Items.erase(note.id);
    await Zotero.Items.erase(topItem.id);
  });

  it("managed notes resync when PDF annotations change", async function () {
    const { topItem, note } = await createManagedObsidianNote();
    const mockedAnnotations = mockManagedPDFAnnotations(topItem, [
      {
        annotationPageLabel: "7",
        annotationType: "highlight",
        annotationText: "Initial annotation excerpt",
      },
    ]);

    try {
      const syncDir = await getTempDirectory();

      await addon.api.$export.syncMDBatch(syncDir, [note.id]);

      const initialSyncStatus = addon.api.sync.getSyncStatus(note.id);
      const filePath = PathUtils.join(syncDir, initialSyncStatus.filename);

      mockedAnnotations.annotationItems[0].annotationText =
        "Updated annotation excerpt";
      mockedAnnotations.annotationItems[0].version += 1;
      mockedAnnotations.annotationItems[0].dateModified = "2026-03-21 10:30:00";

      await addon.hooks.onNotify(
        "modify",
        "item",
        [mockedAnnotations.annotationItems[0].id],
        {},
      );

      const updatedSyncStatus = addon.api.sync.getSyncStatus(note.id);
      const content = (await Zotero.File.getContentsAsync(filePath)) as string;

      assert.notEqual(
        updatedSyncStatus.managedSourceHash,
        initialSyncStatus.managedSourceHash,
      );
      assert.include(content, "> Updated annotation excerpt");
      assert.notInclude(content, "> Initial annotation excerpt");
    } finally {
      mockedAnnotations.restore();
      await Zotero.Items.erase(note.id);
      await Zotero.Items.erase(topItem.id);
    }
  });

  it("managed notes skip PDF annotations when annotation blocks are disabled", async function () {
    const { topItem, note } = await createManagedObsidianNote();
    const mockedAnnotations = mockManagedPDFAnnotations(topItem, [
      {
        annotationPageLabel: "3",
        annotationType: "highlight",
        annotationText: "Hidden annotation excerpt",
      },
    ]);

    try {
      setPref("obsidian.includeAnnotations", false);
      const syncDir = await getTempDirectory();

      await addon.api.$export.syncMDBatch(syncDir, [note.id]);

      const initialSyncStatus = addon.api.sync.getSyncStatus(note.id);
      const filePath = PathUtils.join(syncDir, initialSyncStatus.filename);
      const initialContent = (await Zotero.File.getContentsAsync(
        filePath,
      )) as string;

      assert.notInclude(initialContent, "## Annotations");
      assert.notInclude(initialContent, "Hidden annotation excerpt");

      mockedAnnotations.annotationItems[0].annotationText =
        "Updated while annotations are disabled";
      mockedAnnotations.annotationItems[0].version += 1;
      mockedAnnotations.annotationItems[0].dateModified = "2026-03-21 11:00:00";

      await addon.hooks.onNotify(
        "modify",
        "item",
        [mockedAnnotations.annotationItems[0].id],
        {},
      );

      const updatedSyncStatus = addon.api.sync.getSyncStatus(note.id);
      const updatedContent = (await Zotero.File.getContentsAsync(
        filePath,
      )) as string;

      assert.equal(
        updatedSyncStatus.managedSourceHash,
        initialSyncStatus.managedSourceHash,
      );
      assert.equal(updatedContent, initialContent);
    } finally {
      mockedAnnotations.restore();
      await Zotero.Items.erase(note.id);
      await Zotero.Items.erase(topItem.id);
    }
  });

  it("api.obsidian.repairManagedLinks restores managed mappings and sync records", async function () {
    const { topItem, note } = await createManagedObsidianNote();
    const tempDir = await getTempDirectory();
    const vaultRoot = PathUtils.join(tempDir, "vault");
    const notesDir = PathUtils.join(vaultRoot, "notes");
    const dashboardDir = PathUtils.join(vaultRoot, "dashboards", "zotero");

    await Zotero.File.createDirectoryIfMissingAsync(vaultRoot);
    configureObsidianDashboardPrefs(vaultRoot, notesDir, dashboardDir);
    await addon.api.$export.syncMDBatch(notesDir, [note.id]);

    const initialSyncStatus = addon.api.sync.getSyncStatus(note.id);
    assert.isTrue(await IOUtils.exists(PathUtils.join(notesDir, initialSyncStatus.filename)));

    setObsidianItemNoteMap({});
    addon.api.sync.removeSyncNote(note.id);

    assert.isFalse(addon.api.obsidian.isManagedNote(note));
    assert.isFalse(addon.api.sync.isSyncNote(note.id));

    const result = await addon.api.obsidian.repairManagedLinks({ quiet: true });
    const repairedSyncStatus = addon.api.sync.getSyncStatus(note.id);

    assert.equal(result.restoredMappings, 1);
    assert.equal(result.restoredSyncStatuses, 1);
    assert.equal(result.candidateNotes, 1);
    assert.isTrue(addon.api.obsidian.isManagedNote(note));
    assert.isTrue(addon.api.sync.isSyncNote(note.id));
    assert.equal(repairedSyncStatus.path, notesDir);
    assert.equal(repairedSyncStatus.filename, initialSyncStatus.filename);

    await Zotero.Items.erase(note.id);
    await Zotero.Items.erase(topItem.id);
  });

  it("api.obsidian.repairManagedLinks recreates a deleted managed note from the Obsidian USER block", async function () {
    const { topItem, note } = await createManagedObsidianNote();
    const tempDir = await getTempDirectory();
    const vaultRoot = PathUtils.join(tempDir, "vault-recreate");
    const notesDir = PathUtils.join(vaultRoot, "notes");
    const dashboardDir = PathUtils.join(vaultRoot, "dashboards", "zotero");

    await Zotero.File.createDirectoryIfMissingAsync(vaultRoot);
    configureObsidianDashboardPrefs(vaultRoot, notesDir, dashboardDir);
    await addon.api.$export.syncMDBatch(notesDir, [note.id]);

    const initialSyncStatus = addon.api.sync.getSyncStatus(note.id);
    const filePath = PathUtils.join(notesDir, initialSyncStatus.filename);
    const existingMarkdown = ((await Zotero.File.getContentsAsync(
      filePath,
      "utf-8",
    )) as string) || "";
    const recoveredUserText = "Recovered from Obsidian after note deletion";
    await Zotero.File.putContentsAsync(
      filePath,
      existingMarkdown.replace("Local Zotero fallback", recoveredUserText),
    );

    await Zotero.Items.erase(note.id);

    const result = await addon.api.obsidian.repairManagedLinks({ quiet: true });
    const recoveredTopItem = Zotero.Items.get(topItem.id);
    const recoveredNoteIDs = recoveredTopItem.getNotes();

    assert.equal(result.recreatedNotes, 1);
    assert.lengthOf(recoveredNoteIDs, 1);

    const recoveredNote = Zotero.Items.get(recoveredNoteIDs[0]);
    const repairedSyncStatus = addon.api.sync.getSyncStatus(recoveredNote.id);
    const repairedMDStatus = await addon.api.sync.getMDStatus(filePath);

    assert.notEqual(recoveredNote.key, note.key);
    assert.include(recoveredNote.getNote(), recoveredUserText);
    assert.isTrue(addon.api.obsidian.isManagedNote(recoveredNote));
    assert.isTrue(addon.api.sync.isSyncNote(recoveredNote.id));
    assert.equal(repairedSyncStatus.path, notesDir);
    assert.equal(repairedSyncStatus.filename, initialSyncStatus.filename);
    assert.equal(repairedMDStatus.meta?.zotero_note_key, recoveredNote.key);

    await Zotero.Items.erase(recoveredNote.id);
    await Zotero.Items.erase(topItem.id);
  });

  it("api.obsidian.repairManagedLinks prefers the most recent managed candidate", async function () {
    const { topItem, note } = await createManagedObsidianNote();
    const newerNote = new Zotero.Item("note");
    newerNote.libraryID = topItem.libraryID;
    newerNote.parentID = topItem.id;
    newerNote.setNote(
      `<div data-schema-version="${config.dataSchemaVersion}"><h2>Notes</h2><p>Candidate two</p></div>`,
    );
    await newerNote.saveTx();

    const tempDir = await getTempDirectory();
    const vaultRoot = PathUtils.join(tempDir, "vault");
    const notesDir = PathUtils.join(vaultRoot, "notes");
    const dashboardDir = PathUtils.join(vaultRoot, "dashboards", "zotero");
    await Zotero.File.createDirectoryIfMissingAsync(notesDir);
    configureObsidianDashboardPrefs(vaultRoot, notesDir, dashboardDir);

    const olderPath = PathUtils.join(notesDir, "managed-older.md");
    const newerPath = PathUtils.join(notesDir, "managed-newer.md");
    const buildManagedCandidateMarkdown = (noteItem: Zotero.Item, title: string) => `---
bridge_managed: true
$libraryID: ${noteItem.libraryID}
$itemKey: ${noteItem.key}
zotero_key: ${topItem.key}
zotero_note_key: ${noteItem.key}
---

<!-- ${config.addonRef}:BEGIN GENERATED -->

# ${title}

<!-- ${config.addonRef}:END GENERATED -->

<!-- ${config.addonRef}:BEGIN USER -->

## Notes

- Candidate body

<!-- ${config.addonRef}:END USER -->
`;

    await Zotero.File.putContentsAsync(
      olderPath,
      buildManagedCandidateMarkdown(note, "Older Candidate"),
    );
    await Zotero.File.putContentsAsync(
      newerPath,
      buildManagedCandidateMarkdown(newerNote, "Newer Candidate"),
    );

    addon.api.sync.addSyncNote(note.id);
    addon.api.sync.updateSyncStatus(note.id, {
      path: notesDir,
      filename: "managed-older.md",
      md5: "",
      noteMd5: "",
      managedSourceHash: "",
      lastsync: 100,
      itemID: note.id,
    });
    addon.api.sync.addSyncNote(newerNote.id);
    addon.api.sync.updateSyncStatus(newerNote.id, {
      path: notesDir,
      filename: "managed-newer.md",
      md5: "",
      noteMd5: "",
      managedSourceHash: "",
      lastsync: 200,
      itemID: newerNote.id,
    });

    setObsidianItemNoteMap({});

    const result = await addon.api.obsidian.repairManagedLinks({ quiet: true });

    assert.equal(result.conflicts, 1);
    assert.equal(result.candidateNotes, 1);
    assert.isFalse(addon.api.obsidian.isManagedNote(note));
    assert.isTrue(addon.api.obsidian.isManagedNote(newerNote));
    assert.equal(
      addon.api.sync.getSyncStatus(newerNote.id).filename,
      "managed-newer.md",
    );

    await Zotero.Items.erase(newerNote.id);
    await Zotero.Items.erase(note.id);
    await Zotero.Items.erase(topItem.id);
  });

  it("api.obsidian.setupDashboards writes dashboard files", async function () {
    const tempDir = await getTempDirectory();
    const vaultRoot = PathUtils.join(tempDir, "vault");
    const notesDir = PathUtils.join(vaultRoot, "notes");
    const dashboardDir = PathUtils.join(vaultRoot, "dashboards", "zotero");

    await Zotero.File.createDirectoryIfMissingAsync(vaultRoot);
    configureObsidianDashboardPrefs(vaultRoot, notesDir, dashboardDir);

    const results = await addon.api.obsidian.setupDashboards({
      quiet: true,
      openAfterSetup: false,
    });

    assert.lengthOf(results, 3);

    const researchDashboard = PathUtils.join(dashboardDir, "Research Dashboard.md");
    const topicDashboard = PathUtils.join(dashboardDir, "Topic Dashboard.md");
    const readingPipeline = PathUtils.join(dashboardDir, "Reading Pipeline.base");

    assert.isTrue(await IOUtils.exists(researchDashboard));
    assert.isTrue(await IOUtils.exists(topicDashboard));
    assert.isTrue(await IOUtils.exists(readingPipeline));

    const researchContent = (await Zotero.File.getContentsAsync(
      researchDashboard,
    )) as string;
    const pipelineContent = (await Zotero.File.getContentsAsync(
      readingPipeline,
    )) as string;

    assert.include(researchContent, "Research Dashboard");
    assert.include(researchContent, "Reading Pipeline.base");
    assert.include(pipelineContent, "Reading Pipeline");
    assert.include(pipelineContent, 'file.hasTag("literature")');
  });

  it("api.obsidian.setupDashboards skips unmanaged existing dashboard files", async function () {
    const tempDir = await getTempDirectory();
    const vaultRoot = PathUtils.join(tempDir, "vault");
    const notesDir = PathUtils.join(vaultRoot, "notes");
    const dashboardDir = PathUtils.join(vaultRoot, "dashboards", "zotero");
    const researchDashboard = PathUtils.join(dashboardDir, "Research Dashboard.md");
    const customDashboard = "# Custom Research Dashboard\n\nThis file has no managed marker.";

    await Zotero.File.createDirectoryIfMissingAsync(dashboardDir);
    configureObsidianDashboardPrefs(vaultRoot, notesDir, dashboardDir);
    await Zotero.File.putContentsAsync(researchDashboard, customDashboard);

    const results = await addon.api.obsidian.setupDashboards({
      quiet: true,
      openAfterSetup: false,
    });

    const researchResult = results.find(
      (result) => result.path === researchDashboard,
    );
    const topicDashboard = PathUtils.join(dashboardDir, "Topic Dashboard.md");
    const readingPipeline = PathUtils.join(dashboardDir, "Reading Pipeline.base");

    assert.equal(researchResult?.status, "skipped");
    assert.equal(
      await Zotero.File.getContentsAsync(researchDashboard),
      customDashboard,
    );
    assert.isTrue(await IOUtils.exists(topicDashboard));
    assert.isTrue(await IOUtils.exists(readingPipeline));
  });

  it("api.obsidian.writeConnectionTestFile writes into notesDir", async function () {
    const tempDir = await getTempDirectory();
    const vaultRoot = PathUtils.join(tempDir, "vault");
    const notesDir = PathUtils.join(vaultRoot, "notes");
    const dashboardDir = PathUtils.join(vaultRoot, "dashboards", "zotero");

    await Zotero.File.createDirectoryIfMissingAsync(vaultRoot);
    configureObsidianDashboardPrefs(vaultRoot, notesDir, dashboardDir);

    const result = await addon.api.obsidian.writeConnectionTestFile();
    const expectedPath = PathUtils.join(notesDir, "Obsidian Bridge Test.md");
    const content = (await Zotero.File.getContentsAsync(result.path)) as string;

    assert.equal(result.path, expectedPath);
    assert.equal(result.directory, notesDir);
    assert.isTrue(await IOUtils.exists(expectedPath));
    assert.include(content, "# Obsidian Bridge Test");
    assert.include(content, "plugin can write into your Obsidian folder");
  });
});
