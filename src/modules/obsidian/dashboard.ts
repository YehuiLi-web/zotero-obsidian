import { showHintWithLink } from "../../utils/hint";
import { fileExists, jointPath } from "../../utils/str";
import {
  DASHBOARD_MANAGED_MARKER_PREFIX,
  ObsidianSettings,
  ensureObsidianSettings,
} from "./settings";
import { buildFrontmatter } from "./frontmatter";
import {
  escapeForDoubleQuotedString,
  getVaultRelativeFolder,
  openObsidianNote,
} from "./paths";

function getDashboardFilterLines(settings: ObsidianSettings) {
  const conditions = [`'file.hasTag("literature")'`];
  const relativeNotesDir = getVaultRelativeFolder(
    settings.vaultRoot,
    settings.notesDir,
  );
  if (relativeNotesDir) {
    conditions.unshift(
      `'file.inFolder("${escapeForDoubleQuotedString(relativeNotesDir)}")'`,
    );
  }
  return conditions;
}

function getDataviewFromClause(settings: ObsidianSettings) {
  const relativeNotesDir = getVaultRelativeFolder(
    settings.vaultRoot,
    settings.notesDir,
  );
  return relativeNotesDir ? `FROM "${relativeNotesDir}"` : "";
}

function getDataviewPagesExpression(settings: ObsidianSettings) {
  const relativeNotesDir = getVaultRelativeFolder(
    settings.vaultRoot,
    settings.notesDir,
  );
  return relativeNotesDir
    ? `dv.pages('"${escapeForDoubleQuotedString(relativeNotesDir)}"')`
    : "dv.pages()";
}

function getDashboardFileMarker(
  dashboardId: string,
  commentPrefix = "<!--",
  commentSuffix = "-->",
) {
  return `${commentPrefix} ${DASHBOARD_MANAGED_MARKER_PREFIX} ${dashboardId} ${commentSuffix}`;
}

function buildManagedDashboardMarkdown(
  dashboardId: string,
  frontmatter: Record<string, any>,
  bodyBlocks: string[],
) {
  return [
    buildFrontmatter(frontmatter),
    getDashboardFileMarker(dashboardId),
    ...bodyBlocks.map((block) => String(block || "").trim()).filter(Boolean),
  ].join("\n\n");
}

function buildDataviewBlock(body: string, type = "dataview") {
  return ["```" + type, body.trim(), "```"].join("\n");
}

function buildResearchDashboardMarkdown(settings: ObsidianSettings) {
  const fromClause = getDataviewFromClause(settings);
  const pagesExpression = getDataviewPagesExpression(settings);
  return buildManagedDashboardMarkdown(
    "research-dashboard",
    {
      title: "Research Dashboard",
      tags: ["obsidian-bridge/dashboard", "literature"],
    },
    [
      "# Research Dashboard",
      [
        "> [!info] Quick Start",
        "> 1. Enable the Bases core plugin and install Dataview.",
        "> 2. Sync literature notes from Zotero with Obsidian Bridge.",
        "> 3. Use `reading_status`, `project`, `topic`, `method`, `summary_done`, `read_at` in note properties.",
        "> 4. Open [[Reading Pipeline.base]] for the database view.",
      ].join("\n"),
      [
        "## Navigation",
        "",
        "- [[Reading Pipeline.base]]",
        "- [[Topic Dashboard]]",
      ].join("\n"),
      [
        "## KPI",
        "",
        buildDataviewBlock(
          [
            `const pages = ${pagesExpression}.where((page) => {`,
            "  const rawTags = Array.isArray(page.tags) ? page.tags : page.tags ? [page.tags] : [];",
            '  return rawTags.map((tag) => String(tag)).includes("literature") || rawTags.map((tag) => String(tag)).includes("#literature");',
            "});",
            'const statusOf = (page) => String(page.reading_status || "inbox");',
            "const rows = [",
            '  ["Total Papers", pages.length],',
            '  ["Inbox", pages.where((page) => statusOf(page) === "inbox").length],',
            '  ["Reading", pages.where((page) => statusOf(page) === "reading").length],',
            '  ["Summarized", pages.where((page) => statusOf(page) === "summarized").length],',
            '  ["Archived", pages.where((page) => statusOf(page) === "archived").length],',
            '  ["Summary Done", pages.where((page) => Boolean(page.summary_done)).length],',
            "];",
            'dv.table(["Metric", "Value"], rows);',
          ].join("\n"),
          "dataviewjs",
        ),
      ].join("\n"),
      [
        "## Recently Updated",
        "",
        buildDataviewBlock(
          [
            "TABLE WITHOUT ID file.link AS Paper,",
            "  reading_status AS Status,",
            "  publication AS Publication,",
            "  year AS Year,",
            "  file.mtime AS Updated",
            fromClause,
            'WHERE contains(tags, "literature")',
            "SORT file.mtime DESC",
            "LIMIT 15",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      ].join("\n"),
      [
        "## Reading Queue",
        "",
        buildDataviewBlock(
          [
            "TABLE WITHOUT ID file.link AS Paper,",
            "  reading_status AS Status,",
            "  project AS Project,",
            "  topic AS Topic,",
            "  publication AS Publication",
            fromClause,
            'WHERE contains(tags, "literature") AND reading_status != "archived"',
            "SORT file.mtime DESC",
            "LIMIT 20",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      ].join("\n"),
      [
        "## Top Publications",
        "",
        buildDataviewBlock(
          [
            "TABLE length(rows) AS Papers",
            fromClause,
            'WHERE contains(tags, "literature") AND publication',
            "GROUP BY publication",
            "SORT length(rows) DESC",
            "LIMIT 10",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      ].join("\n"),
    ],
  );
}

function buildTopicDashboardMarkdown(settings: ObsidianSettings) {
  const fromClause = getDataviewFromClause(settings);
  return buildManagedDashboardMarkdown(
    "topic-dashboard",
    {
      title: "Topic Dashboard",
      tags: ["obsidian-bridge/dashboard", "literature"],
    },
    [
      "# Topic Dashboard",
      [
        "> [!tip] Workflow",
        "> Keep `topic`, `project`, and `method` as list properties in each literature note.",
        "> The plugin will preserve these user-maintained fields on future syncs.",
      ].join("\n"),
      [
        "## By Topic",
        "",
        buildDataviewBlock(
          [
            "TABLE length(rows) AS Papers",
            fromClause,
            'WHERE contains(tags, "literature")',
            "FLATTEN topic AS Topic",
            "WHERE Topic",
            "GROUP BY Topic",
            "SORT length(rows) DESC",
            "LIMIT 20",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      ].join("\n"),
      [
        "## By Project",
        "",
        buildDataviewBlock(
          [
            "TABLE length(rows) AS Papers",
            fromClause,
            'WHERE contains(tags, "literature")',
            "FLATTEN project AS Project",
            "WHERE Project",
            "GROUP BY Project",
            "SORT length(rows) DESC",
            "LIMIT 20",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      ].join("\n"),
      [
        "## By Method",
        "",
        buildDataviewBlock(
          [
            "TABLE length(rows) AS Papers",
            fromClause,
            'WHERE contains(tags, "literature")',
            "FLATTEN method AS Method",
            "WHERE Method",
            "GROUP BY Method",
            "SORT length(rows) DESC",
            "LIMIT 20",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      ].join("\n"),
      [
        "## Recent Summaries",
        "",
        buildDataviewBlock(
          [
            "TABLE WITHOUT ID file.link AS Paper,",
            "  project AS Project,",
            "  topic AS Topic,",
            "  read_at AS ReadAt,",
            "  file.mtime AS Updated",
            fromClause,
            'WHERE contains(tags, "literature") AND summary_done = true',
            "SORT file.mtime DESC",
            "LIMIT 20",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      ].join("\n"),
    ],
  );
}

function buildReadingPipelineBase(settings: ObsidianSettings) {
  const filterLines = getDashboardFilterLines(settings);
  return [
    `# ${DASHBOARD_MANAGED_MARKER_PREFIX} reading-pipeline`,
    "filters:",
    "  and:",
    ...filterLines.map((line) => `    - ${line}`),
    "formulas:",
    "  status_bucket: 'if(reading_status, reading_status, \"inbox\")'",
    "  age_days: 'if(date, (today() - date(date)).days.round(0), \"\")'",
    "properties:",
    "  file.name:",
    '    displayName: "Note"',
    "  formula.status_bucket:",
    '    displayName: "Status"',
    "  publication:",
    '    displayName: "Publication"',
    "  year:",
    '    displayName: "Year"',
    "  project:",
    '    displayName: "Project"',
    "  topic:",
    '    displayName: "Topic"',
    "  method:",
    '    displayName: "Method"',
    "  summary_done:",
    '    displayName: "Summary"',
    "  read_at:",
    '    displayName: "Read At"',
    "  formula.age_days:",
    '    displayName: "Age (days)"',
    "views:",
    "  - type: table",
    '    name: "Reading Pipeline"',
    "    groupBy:",
    "      property: formula.status_bucket",
    "      direction: ASC",
    "    order:",
    "      - file.name",
    "      - formula.status_bucket",
    "      - year",
    "      - publication",
    "      - project",
    "      - topic",
    "      - method",
    "      - summary_done",
    "      - read_at",
    "  - type: table",
    '    name: "Summary Queue"',
    "    filters:",
    "      and:",
    "        - 'formula.status_bucket != \"archived\"'",
    '        - "summary_done != true"',
    "    order:",
    "      - file.name",
    "      - formula.status_bucket",
    "      - project",
    "      - topic",
    "      - publication",
    "      - year",
    "  - type: cards",
    '    name: "Recently Updated"',
    "    limit: 24",
    "    order:",
    "      - file.name",
    "      - formula.status_bucket",
    "      - publication",
    "      - year",
    "      - project",
    "      - topic",
  ].join("\n");
}

async function writeManagedDashboardFile(
  filePath: string,
  content: string,
  marker: string,
) {
  if (await fileExists(filePath)) {
    const existing = String(
      await Zotero.File.getContentsAsync(filePath, "utf-8"),
    );
    if (!existing.includes(marker)) {
      return "skipped";
    }
    if (existing === content) {
      return "unchanged";
    }
  }
  await Zotero.File.putContentsAsync(filePath, content);
  return "written";
}

async function ensureObsidianDashboardFiles(settings: ObsidianSettings) {
  const dashboardDirParent = PathUtils.parent(settings.dashboardDir);
  if (dashboardDirParent) {
    await Zotero.File.createDirectoryIfMissingAsync(dashboardDirParent);
  }
  await Zotero.File.createDirectoryIfMissingAsync(settings.dashboardDir);

  const files = [
    {
      path: jointPath(settings.dashboardDir, "Research Dashboard.md"),
      content: buildResearchDashboardMarkdown(settings),
      marker: getDashboardFileMarker("research-dashboard"),
    },
    {
      path: jointPath(settings.dashboardDir, "Topic Dashboard.md"),
      content: buildTopicDashboardMarkdown(settings),
      marker: getDashboardFileMarker("topic-dashboard"),
    },
    {
      path: jointPath(settings.dashboardDir, "Reading Pipeline.base"),
      content: buildReadingPipelineBase(settings),
      marker: `# ${DASHBOARD_MANAGED_MARKER_PREFIX} reading-pipeline`,
    },
  ];

  const results = [];
  for (const file of files) {
    const status = await writeManagedDashboardFile(
      file.path,
      file.content,
      file.marker,
    );
    results.push({ ...file, status });
  }
  return results;
}

async function setupObsidianDashboards(
  options: {
    settings?: ObsidianSettings;
    quiet?: boolean;
    openAfterSetup?: boolean;
  } = {},
) {
  const settings = options.settings || (await ensureObsidianSettings());
  const results = await ensureObsidianDashboardFiles(settings);
  const primaryFile = results[0]?.path || "";
  const shouldOpen =
    typeof options.openAfterSetup === "boolean"
      ? options.openAfterSetup
      : settings.openAfterSync;
  if (!options.quiet && primaryFile) {
    await showHintWithLink(
      "Obsidian dashboards are ready.",
      "Show in Folder",
      () => {
        Zotero.File.reveal(primaryFile);
      },
    );
  }
  if (shouldOpen && primaryFile) {
    openObsidianNote(primaryFile);
  }
  return results;
}

export { setupObsidianDashboards };
