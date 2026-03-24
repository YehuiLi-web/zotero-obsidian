# Obsidian Bridge MVP

## Goal

Build a Zotero-side plugin that creates and syncs Obsidian-friendly literature notes for personal research workflows.

The plugin should:

- read Zotero standard metadata reliably
- read plugin-added fields when possible, especially translation fields
- generate structured Markdown notes for Obsidian
- preserve stable Zotero links back to the source item and PDF
- support incremental customization through templates instead of hardcoded layouts

## Positioning

This fork is not trying to replace all of Better Notes.
For the first usable version, the focus is narrower:

- Zotero remains the source of truth
- Obsidian is the reading, querying, and synthesis space
- Markdown export and sync are the bridge between them

## Data Sources

The plugin should read from three layers:

1. Standard Zotero fields
   - `topItem.getField("title")`
   - `topItem.getField("abstractNote")`
   - `topItem.getField("DOI")`
   - `topItem.getField("publicationTitle")`
   - and all fields returned by `Zotero.ItemFields.getItemTypeFields(topItem.itemTypeID)`

2. Structured Zotero data
   - creators
   - tags
   - collections
   - attachments
   - child notes

3. Plugin/custom fields
   - `titleTranslation`
   - `abstractTranslation`
   - any field embedded in `extra`

## MVP User Flow

1. Select a Zotero item.
2. Create an item note from an Obsidian-specific template.
3. Export or sync that note to an Obsidian vault folder as Markdown.
4. Open the generated note in Obsidian and continue reading, linking, and summarizing there.

## Note Model

The first default note layout should include:

- YAML frontmatter
  - stable IDs and links
  - authors
  - year
  - DOI
  - journal / publication
  - collections
  - Zotero tags
  - translation fields when available

- visible reading area
  - English title
  - translated title
  - metadata callout
  - abstract
  - translated abstract
  - note-taking sections

## Recommended Frontmatter Keys

- `title`
- `title_translation`
- `zotero_key`
- `item_type`
- `year`
- `date`
- `doi`
- `publication`
- `volume`
- `issue`
- `pages`
- `url`
- `item_link`
- `pdf_link`
- `authors`
- `zotero_tags`
- `collections`
- `tags`

## Why Templates First

Template-driven development keeps the plugin flexible:

- users can iterate on structure without recompiling core logic
- fields can be tested with probe templates before being added to production templates
- different note types can coexist

## Near-Term Milestones

### Milestone 1

- rename fork so it can coexist with Better Notes
- add field probe template
- verify translation fields and `extra` parsing

### Milestone 2

- add Obsidian literature note template
- validate Markdown export in Obsidian
- settle frontmatter schema for Dataview and search

### Milestone 3

- add Obsidian-oriented file naming template
- add vault-folder conventions
- improve PDF and item links

### Milestone 4

- add annotation-oriented templates
- add optional child-note merge / AI-note import behavior
- refine sync conflict behavior for Obsidian editing

## Current MVP Scope

In this repository, the current MVP is:

- field probe
- Obsidian literature note template
- existing Markdown export/sync reused from the Better Notes base

This is enough to start real-world testing with a personal Obsidian vault.
