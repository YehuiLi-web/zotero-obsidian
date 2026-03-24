import {
  buildFrontmatter,
  mergeManagedFrontmatter,
  normalizeFrontmatterList,
  parseMarkdownFrontmatter,
} from "../../src/modules/obsidian/frontmatter";
import {
  DEFAULT_MANAGED_FRONTMATTER_FIELDS,
  setManagedFrontmatterFields,
} from "../../src/modules/obsidian/settings";

describe("Obsidian helpers", function () {
  this.beforeEach(function () {
    setManagedFrontmatterFields(DEFAULT_MANAGED_FRONTMATTER_FIELDS);
  });

  this.afterEach(function () {
    setManagedFrontmatterFields(DEFAULT_MANAGED_FRONTMATTER_FIELDS);
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

  it("mergeManagedFrontmatter drops aliases when title translations are disabled", function () {
    setManagedFrontmatterFields(["date", "doi"]);

    const merged = mergeManagedFrontmatter(
      {
        aliases: ["Existing Alias"],
        tags: ["project-x"],
      },
      {
        aliases: ["Generated Alias"],
        tags: ["literature", "zotero"],
      },
    );

    assert.notProperty(merged, "aliases");
    assert.sameMembers(merged.tags, ["literature", "zotero", "project-x"]);
  });
});
