import {
  buildFrontmatter,
  mergeManagedFrontmatter,
  parseMarkdownFrontmatter,
} from "../../src/modules/obsidian/frontmatter";
import {
  extractHeadingSection,
  extractUserSections,
  stripFrontmatter,
  USER_BLOCK_END,
  USER_BLOCK_START,
} from "../../src/modules/obsidian/markdown";
import {
  buildCollectionItemSelectURI,
  getBestItemLink,
  applyManagedFileNameTemplate,
  ensureMarkdownExtension,
  getBestAttachmentLink,
  getManagedObsidianUniqueKey,
  getRelativePath,
  makeLibraryOpenLink,
  makeLibrarySelectLink,
  sanitizeFileNamePart,
  sanitizeFileNameToken,
} from "../../src/modules/obsidian/paths";
import {
  DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE,
  DEFAULT_MANAGED_FRONTMATTER_FIELDS,
  deriveObsidianPathDefaults,
  setManagedFrontmatterFields,
} from "../../src/modules/obsidian/settings";

describe("Obsidian Module Pure Functions", function () {
  this.beforeEach(function () {
    setManagedFrontmatterFields(DEFAULT_MANAGED_FRONTMATTER_FIELDS);
  });

  this.afterEach(function () {
    setManagedFrontmatterFields(DEFAULT_MANAGED_FRONTMATTER_FIELDS);
  });

  describe("Paths & Filenames", function () {
    it("deriveObsidianPathDefaults creates recommended folders from a vault root", function () {
      const defaults = deriveObsidianPathDefaults("/vault/research");

      assert.deepEqual(defaults, {
        vaultRoot: "/vault/research",
        vaultName: "research",
        notesDir: "/vault/research/notes",
        assetsDir: "/vault/research/assets/zotero",
        dashboardDir: "/vault/research/dashboards/zotero",
      });
    });

    it("uses a fixed unique-key filename rule by default", function () {
      assert.equal(
        DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE,
        "{{title}} -- {{uniqueKey}}",
      );
      const uniqueKey = getManagedObsidianUniqueKey({
        libraryID: 1,
        key: "ABCD1234",
      } as any);
      assert.match(uniqueKey, /^[A-Z0-9]{10}$/);
      assert.equal(
        applyManagedFileNameTemplate(DEFAULT_OBSIDIAN_FILE_NAME_TEMPLATE, {
          title: "Test Title",
          uniqueKey,
        }),
        `Test Title -- ${uniqueKey}`,
      );
    });

    it("sanitizeFileNamePart strips invalid characters", function () {
      assert.equal(
        sanitizeFileNamePart('Title with : and "'),
        "Title-with-and",
      );
      assert.equal(
        sanitizeFileNamePart("A / B \\ C ? D * E < F > G | H"),
        "A-B-C-D-E-F-G-H",
      );
      assert.equal(
        sanitizeFileNamePart("   Spaces  are trimmed   "),
        "Spaces-are-trimmed",
      );
    });

    it("sanitizeFileNameToken replaces tokens without collapsing spaces", function () {
      assert.equal(
        sanitizeFileNameToken("Author, A. & Author, B."),
        "Author, A. & Author, B",
      );
      assert.equal(
        sanitizeFileNameToken("Some: Title / Here"),
        "Some- Title - Here",
      );
    });

    it("applyManagedFileNameTemplate replaces variables correctly", function () {
      const template = "{{title}} - {{year}} - {{firstCreator}}";
      const context = {
        title: "Test Title",
        year: "2024",
        firstCreator: "Smith",
        key: "ABCD123",
      };

      assert.equal(
        applyManagedFileNameTemplate(template, context),
        "Test Title - 2024 - Smith",
      );
    });

    it("ensureMarkdownExtension adds .md only if missing", function () {
      assert.equal(ensureMarkdownExtension("test file"), "test file.md");
      assert.equal(ensureMarkdownExtension("test file.md"), "test file.md");
      assert.equal(ensureMarkdownExtension("test file.MD"), "test file.MD");
      assert.equal(ensureMarkdownExtension(""), "");
    });

    it("creates collection-aware item links and open links for attachments", async function () {
      const originalGetCollectionsContainingItems =
        Zotero.Collections.getCollectionsContainingItems;
      const topItem = {
        id: 42,
        key: "82HRII72",
        libraryID: 1,
        getBestAttachment: async () => ({
          key: "3XK9BHXJ",
          libraryID: 1,
        }),
      } as any;

      Zotero.Collections.getCollectionsContainingItems = async () =>
        [{ key: "ABCD1234", name: "Reading Queue" }] as any;
      try {
        assert.equal(
          makeLibrarySelectLink(topItem),
          "zotero://select/library/items/82HRII72",
        );
        assert.equal(
          buildCollectionItemSelectURI(topItem, { key: "ABCD1234" }),
          "zotero://select/library/collections/ABCD1234/items/82HRII72",
        );
        assert.equal(
          await getBestItemLink(topItem),
          "zotero://select/library/collections/ABCD1234/items/82HRII72",
        );
        assert.equal(
          makeLibraryOpenLink(topItem),
          "zotero://open/library/items/82HRII72",
        );
        assert.equal(
          await getBestAttachmentLink(topItem),
          "zotero://open/library/items/3XK9BHXJ",
        );
      } finally {
        Zotero.Collections.getCollectionsContainingItems =
          originalGetCollectionsContainingItems;
      }
    });

    it("getRelativePath computes relative paths correctly", function () {
      assert.equal(
        getRelativePath("/vault/notes", "/vault/assets").replace(/\\/g, "/"),
        "../assets",
      );
      assert.equal(
        getRelativePath("C:\\vault\\notes", "C:\\vault\\assets").replace(
          /\\/g,
          "/",
        ),
        "../assets",
      );
      assert.equal(
        getRelativePath("/vault", "/vault/notes/sub").replace(/\\/g, "/"),
        "notes/sub",
      );
    });
  });

  describe("Frontmatter Parsing & Merging", function () {
    it("parseMarkdownFrontmatter handles valid YAML blocks", function () {
      const markdown = `---
title: "123"
tags:
  - a
  - b
---
# Content`;

      const parsed = parseMarkdownFrontmatter(markdown);

      assert.equal(parsed.title, "123");
      assert.deepEqual(parsed.tags, ["a", "b"]);
    });

    it("parseMarkdownFrontmatter handles empty or missing YAML", function () {
      assert.deepEqual(parseMarkdownFrontmatter("# Content"), {});
      assert.deepEqual(parseMarkdownFrontmatter("---\n---"), {});
    });

    it("buildFrontmatter generates YAML strings", function () {
      const yaml = buildFrontmatter({
        title: "Test",
        tags: ["a", "b"],
        bridge_managed: true,
      });

      assert.include(yaml, 'title: "Test"');
      assert.include(yaml, '  - "a"');
      assert.include(yaml, '  - "b"');
      assert.include(yaml, "bridge_managed: true");
    });

    it("mergeManagedFrontmatter preserves custom keys while respecting managed ones", function () {
      const merged = mergeManagedFrontmatter(
        {
          status: "draft",
          tags: ["project-x"],
          custom_field: "keep-me",
        },
        {
          status: "review",
          tags: ["literature", "zotero"],
        },
      );

      assert.equal(merged.status, "review");
      assert.equal(merged.custom_field, "keep-me");
      assert.sameMembers(merged.tags, ["literature", "zotero", "project-x"]);
    });
  });

  describe("Markdown Processing", function () {
    it("stripFrontmatter removes YAML blocks", function () {
      const markdown = "---\ntitle: 123\n---\n\n# Body";

      assert.equal(stripFrontmatter(markdown), "# Body");
    });

    it("extractHeadingSection finds text under specific headings", function () {
      const markdown =
        "## Section A\n\nSome notes here.\n\n## Related\nNo relation";
      const section = extractHeadingSection(markdown, "## Section A");

      assert.equal(section.trim(), "Some notes here.");
    });

    it("extractUserSections extracts managed user blocks correctly", function () {
      const markdownWithBlocks = `${USER_BLOCK_START}
## Notes
My notes
${USER_BLOCK_END}`;

      const extracted = extractUserSections(markdownWithBlocks);

      assert.include(extracted, "My notes");
    });
  });
});
