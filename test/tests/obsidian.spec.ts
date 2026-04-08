import {
  buildFrontmatter,
  mergeManagedFrontmatter,
  normalizeFrontmatterList,
  parseMarkdownFrontmatter,
} from "../../src/modules/obsidian/frontmatter";
import {
  DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE,
  DEFAULT_MANAGED_FRONTMATTER_FIELDS,
  setManagedFrontmatterFields,
} from "../../src/modules/obsidian/settings";
import {
  LEGACY_OBSIDIAN_FILE_NAME_TEMPLATE,
  migrateObsidianFileNameTemplatePref,
} from "../../src/modules/obsidian/fileNameTemplate";
import { getManagedFileNamePattern } from "../../src/modules/obsidian/paths";
import { getPref, setPref } from "../../src/utils/prefs";

describe("Obsidian helpers", function () {
  this.beforeEach(function () {
    setManagedFrontmatterFields(DEFAULT_MANAGED_FRONTMATTER_FIELDS);
    setPref("obsidian.fileNameTemplate", DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE);
  });

  this.afterEach(function () {
    setManagedFrontmatterFields(DEFAULT_MANAGED_FRONTMATTER_FIELDS);
    setPref("obsidian.fileNameTemplate", DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE);
  });

  it("normalizeFrontmatterList preserves indexed object order", function () {
    const normalized = normalizeFrontmatterList({
      2: "gamma",
      0: "alpha",
      1: "beta",
    });

    assert.deepEqual(normalized, ["alpha", "beta", "gamma"]);
  });

  it("buildFrontmatter serializes nested arrays and objects", function () {
    const frontmatter = buildFrontmatter({
      title: 'Managed "Note"',
      rating: 5,
      tags: ["literature", "zotero"],
      summary: {
        done: false,
        reviewer: "alice",
      },
      sections: [["alpha", "beta"]],
    });

    assert.include(frontmatter, 'title: "Managed \\"Note\\""');
    assert.include(frontmatter, "rating: 5");
    assert.include(frontmatter, '  - "literature"');
    assert.include(frontmatter, "summary:");
    assert.include(frontmatter, "  done: false");
    assert.include(frontmatter, '  reviewer: "alice"');
    assert.include(frontmatter, "sections:");
    assert.include(frontmatter, "  -");
    assert.include(frontmatter, '    - "alpha"');
    assert.match(frontmatter, /^---\n[\s\S]*\n---$/);
  });

  it("parseMarkdownFrontmatter parses YAML and falls back on invalid input", function () {
    const parsed = parseMarkdownFrontmatter(`---
status: review
rating: 4
tags:
  - literature
  - zotero
---

# Note`);
    const invalid = parseMarkdownFrontmatter(`---
status: [invalid
---
`);

    assert.deepEqual(parsed, {
      status: "review",
      rating: 4,
      tags: ["literature", "zotero"],
    });
    assert.deepEqual(invalid, {});
  });

  it("mergeManagedFrontmatter preserves custom fields and merges aliases and tags", function () {
    const merged = mergeManagedFrontmatter(
      {
        aliases: ["Existing Alias"],
        tags: ["project-x", "zotero"],
        project: ["alpha-track"],
        custom_field: "keep-me",
        status: "draft",
      },
      {
        title: "Managed Sync Article",
        aliases: ["Generated Alias"],
        tags: ["literature", "zotero"],
        status: "review",
      },
    );

    assert.sameMembers(merged.aliases, ["Existing Alias", "Generated Alias"]);
    assert.sameMembers(merged.tags, ["literature", "zotero", "project-x"]);
    assert.deepEqual(merged.project, ["alpha-track"]);
    assert.equal(merged.custom_field, "keep-me");
    assert.equal(merged.status, "review");
  });

  it("mergeManagedFrontmatter drops aliases when aliases are disabled separately", function () {
    setManagedFrontmatterFields(["titleTranslation", "date", "doi"]);

    const merged = mergeManagedFrontmatter(
      {
        aliases: ["Existing Alias"],
        tags: ["project-x"],
      },
      {
        title_translation: "Generated Translation",
        aliases: ["Generated Alias"],
        tags: ["literature", "zotero"],
      },
    );

    assert.notProperty(merged, "aliases");
    assert.equal(merged.title_translation, "Generated Translation");
    assert.notProperty(merged, "tags");
  });

  it("migrates only the legacy filename default to the uniqueKey template", function () {
    setPref("obsidian.fileNameTemplate", LEGACY_OBSIDIAN_FILE_NAME_TEMPLATE);
    assert.equal(
      getManagedFileNamePattern(),
      DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE,
    );
    migrateObsidianFileNameTemplatePref();
    assert.equal(
      String(getPref("obsidian.fileNameTemplate") || ""),
      DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE,
    );

    const customTemplate = "{{title}} - {{year}} - {{key}}";
    setPref("obsidian.fileNameTemplate", customTemplate);
    migrateObsidianFileNameTemplatePref();
    assert.equal(
      String(getPref("obsidian.fileNameTemplate") || ""),
      customTemplate,
    );
  });
});
