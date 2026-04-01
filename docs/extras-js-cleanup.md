# Diagnosing `src/extras` JavaScript Duplicates

## Why `.js` Exists Beside `.ts`
- The build config in `E:/obsidian_zotero/zotero-obsidian/zotero-plugin.config.ts:38-67` registers only TypeScript entry points (e.g., `src/index.ts`, `src/extras/*.ts`, and the preferences pane TS file). esbuild pipes these `.ts` sources directly into bundled outputs under `build/addon/chrome/content/scripts`, so `.js` sitting inside `src/extras` is ignored.
- Example artifact: `E:/obsidian_zotero/zotero-obsidian/src/extras/convert.js:1-24` starts with the typical `"use strict";` + `__awaiter` helper + CommonJS `require` calls. That shape mirrors vanilla `tsc` output, not handwritten code.
- Runtime imports (e.g., `E:/obsidian_zotero/zotero-obsidian/src/addon.ts:9-18`, `E:/obsidian_zotero/zotero-obsidian/src/utils/convert.ts:1-36`) reference `./extras/*.ts` modules. No code imports the `.js` twins directly, so deleting them does not affect the dependency graph.
- `package.json` runs `tsc --noEmit` before `zotero-plugin build`. This guarantees TypeScript is only used for type-checking while esbuild handles bundling, contrasting with an older workflow where `tsc` emitted CommonJS files back into `src/`.

## Handling Strategy
1. Remove redundant JavaScript: `git rm src/extras/**/*.js src/extras/**/*.js.map` once you are ready to clean the history. The TypeScript files remain the single source of truth.
2. Extend `.gitignore` with `src/extras/**/*.js` and `src/extras/**/*.js.map` so accidental `tsc` runs stop polluting the repo.
3. Optional: add an npm helper (e.g., `"clean:extras": "rimraf src/extras/**/*.js src/extras/**/*.js.map"`) and call it in CI/pre-commit hooks to enforce the state automatically.
4. Rebuild via `npm run build` to regenerate the bundled scripts in `build/addon/chrome/content/scripts`, then run `npm run test:preflight` before smoke-testing the add-on in Zotero.

## Root Cause
Earlier commits likely relied on `tsc` to transpile `src/extras/**/*.ts` into CommonJS files committed alongside the sources for direct Zotero consumption. The modern toolchain (esbuild within `zotero-plugin` + `tsc --noEmit`) no longer needs those artifacts, so they lingered as stale outputs.

## Test Checklist After Cleanup
- `npm run build` — verifies esbuild picks up all `.ts` entry points and recreates the bundles solely under `build/`.
- `npm run test:preflight` — ensures type generation and environment checks that touch `src/extras` workers continue to succeed.
- Manual Zotero smoke test — confirm the editor, workers, and conversion flows still load via the rebuilt bundles without relying on the deleted `.js` files.

## Extended Cleanup Across `src`
- 2026-04-01: re-ran the same audit across the entire `src/` tree and deleted 112 redundant `.js` siblings (API surface, workspace elements, editor/export/template modules, sync helpers, etc.).
- Criterion stayed conservative: only remove a `.js` file when a `.ts` file with the exact same stem exists (e.g., `src/utils/link.ts` → delete `src/utils/link.js`). Standalone `.js` utilities remained untouched.
- Example sweep (PowerShell):  
  ```powershell
  @'
  from pathlib import Path
  matches = []
  for path in Path("src").rglob("*.js"):
      if path.with_suffix(".ts").exists():
          matches.append(str(path))
  print("\n".join(matches))
  ' @ | python -
  ```
- `.gitignore` now blocks `src/extras/**/*.js` and you can extend the glob if any new folder regresses. When needed, run `find src -name '*.js' -and -exec test -f {%.ts} \; -delete` or the Python snippet in this doc to sweep the tree again before committing.
