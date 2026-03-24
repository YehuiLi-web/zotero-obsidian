"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildObsidianPrefsStyleText = buildObsidianPrefsStyleText;
function buildObsidianPrefsStyleText(settingsRootId, tooltipId) {
    return `
    #${settingsRootId} {
      margin-top: 12px;
    }
    #${settingsRootId} .ob-prefs-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 0 0 16px 0;
    }
    #${settingsRootId} .ob-prefs-section__title {
      margin: 0;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: fit-content;
      font-size: 16px;
      font-weight: 700;
      line-height: 1.5;
    }
    #${settingsRootId} .ob-prefs-section__help,
    #${settingsRootId} .ob-prefs-inline,
    #${settingsRootId} .ob-prefs-label {
      color: var(--text-color-deemphasized);
      line-height: 1.7;
    }
    #${settingsRootId} .ob-prefs-row {
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    #${settingsRootId} .ob-prefs-row > label,
    #${settingsRootId} .ob-prefs-row > .html-label,
    #${settingsRootId} .ob-prefs-row > html\\:label {
      min-width: 140px;
    }
    #${settingsRootId} .ob-prefs-formRow {
      display: grid;
      grid-template-columns: 116px minmax(220px, 340px);
      column-gap: 10px;
      row-gap: 8px;
      align-items: center;
      justify-content: start;
    }
    #${settingsRootId} .ob-prefs-formRow > label,
    #${settingsRootId} .ob-prefs-formRow > .html-label,
    #${settingsRootId} .ob-prefs-formRow > html\\:label {
      min-width: 0;
      width: auto;
      white-space: nowrap;
    }
    #${settingsRootId} .ob-prefs-formRow > .ob-prefs-textbox {
      width: 100%;
      min-width: 0;
      flex: none;
    }
    #${settingsRootId} .ob-prefs-formRow--actions {
      grid-template-columns: 116px minmax(220px, 300px) auto auto;
    }
    #${settingsRootId} .ob-prefs-formRow--actions > button {
      justify-self: start;
      white-space: nowrap;
    }
    #${settingsRootId} .ob-prefs-fieldLabel {
      display: inline-flex;
      align-items: center;
      line-height: 1.4;
      white-space: nowrap;
    }
    #${settingsRootId} .ob-prefs-tooltipTarget {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      cursor: help;
      text-decoration: underline dotted rgba(255, 255, 255, 0.24);
      text-underline-offset: 3px;
      transition: color 120ms ease, text-decoration-color 120ms ease;
    }
    #${settingsRootId} .ob-prefs-tooltipTarget:hover {
      color: var(--text-color);
      text-decoration-color: rgba(255, 255, 255, 0.52);
    }
    #${tooltipId} {
      position: fixed;
      left: 0;
      top: 0;
      z-index: 2147483647;
      max-width: min(420px, calc(100vw - 32px));
      padding: 8px 10px;
      border: 1px solid rgba(255, 255, 255, 0.86);
      border-radius: 6px;
      background: rgba(31, 41, 55, 0.96);
      color: #fff;
      font-size: 13px;
      line-height: 1.5;
      white-space: normal;
      word-break: break-word;
      box-sizing: border-box;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transform: translateY(4px);
      transition: opacity 120ms ease, transform 120ms ease, visibility 120ms ease;
    }
    #${tooltipId}[data-show="true"] {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
    #${settingsRootId} .ob-prefs-textbox {
      flex: 1 1 420px;
      min-width: 260px;
      box-sizing: border-box;
    }
    #${settingsRootId} .ob-prefs-connectionFields {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: flex-start;
    }
    #${settingsRootId} .ob-prefs-connectionHeader {
      display: grid;
      grid-template-columns: auto auto minmax(0, 1fr);
      column-gap: 10px;
      row-gap: 6px;
      align-items: center;
      width: min(100%, 620px);
    }
    #${settingsRootId} .ob-prefs-connectionHeader > button {
      justify-self: start;
      white-space: nowrap;
    }
    #${settingsRootId} .ob-prefs-pathField {
      display: grid;
      grid-template-columns: 116px minmax(220px, 300px) 96px;
      column-gap: 10px;
      align-items: center;
    }
    #${settingsRootId} .ob-prefs-pathField > .ob-prefs-fieldLabel {
      min-width: 0;
      width: auto;
    }
    #${settingsRootId} .ob-prefs-pathField > .ob-prefs-textbox {
      width: 100%;
      min-width: 0;
      flex: none;
    }
    #${settingsRootId} .ob-prefs-pathField > button {
      width: 100%;
      min-width: 0;
      justify-self: stretch;
    }
    #${settingsRootId} .ob-prefs-connectionFeedback {
      margin: 0;
      font-size: 12px;
      line-height: 1.45;
      min-width: 0;
      justify-self: end;
      text-align: right;
    }
    #${settingsRootId} .ob-prefs-checklist,
    #${settingsRootId} .ob-prefs-radios {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    #${settingsRootId} .ob-prefs-radios--vertical {
      gap: 8px;
    }
    #${settingsRootId} .ob-prefs-check {
      display: flex;
      align-items: center;
      gap: 8px;
      line-height: 1.6;
    }
    #${settingsRootId} .ob-prefs-preview,
    #${settingsRootId} .ob-prefs-code {
      border: 1px solid var(--material-border);
      border-radius: 8px;
      padding: 8px 10px;
      box-sizing: border-box;
      background: rgba(255, 255, 255, 0.02);
      white-space: pre-wrap;
      word-break: break-word;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.6;
      margin: 0;
    }
    #${settingsRootId} .ob-prefs-code {
      max-height: 260px;
      overflow: auto;
    }
    #${settingsRootId} .ob-prefs-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 8px;
    }
    #${settingsRootId} .ob-bridge-settings {
      display: flex;
      flex-direction: column;
      gap: 18px;
      color: var(--text-color);
    }
    #${settingsRootId} .ob-bridge-hero,
    #${settingsRootId} .ob-bridge-card {
      border: 1px solid var(--material-border);
      border-radius: 16px;
      background:
        linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(16, 185, 129, 0.04)),
        rgba(255, 255, 255, 0.02);
      box-sizing: border-box;
    }
    #${settingsRootId} .ob-bridge-hero {
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    #${settingsRootId} .ob-bridge-hero__eyebrow {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-color-deemphasized);
    }
    #${settingsRootId} .ob-bridge-hero__title {
      font-size: 20px;
      font-weight: 700;
      line-height: 1.35;
    }
    #${settingsRootId} .ob-bridge-hero__desc,
    #${settingsRootId} .ob-bridge-card__help,
    #${settingsRootId} .ob-bridge-inline-summary,
    #${settingsRootId} .ob-bridge-hint,
    #${settingsRootId} .ob-bridge-feedback {
      font-size: 13px;
      line-height: 1.7;
      color: var(--text-color-deemphasized);
    }
    #${settingsRootId} .ob-bridge-tabs {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }
    #${settingsRootId} .ob-bridge-tab {
      appearance: none;
      border: 1px solid var(--material-border);
      border-radius: 14px;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.02);
      color: inherit;
      text-align: left;
      cursor: pointer;
      transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
    }
    #${settingsRootId} .ob-bridge-tab:hover {
      transform: translateY(-1px);
      border-color: rgba(59, 130, 246, 0.4);
    }
    #${settingsRootId} .ob-bridge-tab.is-active {
      border-color: var(--accent-blue, #3b82f6);
      background: rgba(59, 130, 246, 0.12);
    }
    #${settingsRootId} .ob-bridge-tab__step {
      display: block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-color-deemphasized);
      margin-bottom: 4px;
    }
    #${settingsRootId} .ob-bridge-tab__label,
    #${settingsRootId} .ob-bridge-card__title {
      display: block;
      font-size: 15px;
      font-weight: 700;
      line-height: 1.4;
    }
    #${settingsRootId} .ob-bridge-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    #${settingsRootId} .ob-bridge-panel[hidden] {
      display: none !important;
    }
    #${settingsRootId} .ob-bridge-note-design {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
      gap: 16px;
      align-items: start;
    }
    #${settingsRootId} .ob-bridge-stack {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    #${settingsRootId} .ob-bridge-card {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    #${settingsRootId} .ob-bridge-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    #${settingsRootId} .ob-bridge-field__label {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.5;
    }
    #${settingsRootId} .ob-bridge-metadataGrid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      align-items: end;
    }
    #${settingsRootId} .ob-bridge-field__row,
    #${settingsRootId} .ob-bridge-button-row {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    #${settingsRootId} .ob-bridge-input,
    #${settingsRootId} .ob-bridge-select {
      width: 100%;
      min-width: 0;
      min-height: 44px;
      border: 1px solid var(--material-border);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.03);
      color: inherit;
      padding: 10px 12px;
      line-height: 1.4;
      box-sizing: border-box;
    }
    #${settingsRootId} .ob-bridge-select {
      appearance: none;
      padding-right: 36px;
      background-image:
        linear-gradient(45deg, transparent 50%, rgba(255, 255, 255, 0.78) 50%),
        linear-gradient(135deg, rgba(255, 255, 255, 0.78) 50%, transparent 50%);
      background-position:
        calc(100% - 18px) calc(50% - 3px),
        calc(100% - 12px) calc(50% - 3px);
      background-size: 6px 6px, 6px 6px;
      background-repeat: no-repeat;
    }
    #${settingsRootId} .ob-bridge-input[readonly] {
      cursor: default;
      background: rgba(255, 255, 255, 0.02);
    }
    #${settingsRootId} .ob-bridge-button {
      appearance: none;
      border: 1px solid var(--material-border);
      border-radius: 10px;
      padding: 9px 14px;
      background: rgba(255, 255, 255, 0.03);
      color: inherit;
      cursor: pointer;
      font-weight: 600;
    }
    #${settingsRootId} .ob-bridge-button:hover:not(:disabled) {
      border-color: rgba(59, 130, 246, 0.45);
    }
    #${settingsRootId} .ob-bridge-button--primary {
      background: var(--accent-blue, #3b82f6);
      border-color: var(--accent-blue, #3b82f6);
      color: white;
    }
    #${settingsRootId} .ob-bridge-button--cta {
      padding: 12px 18px;
      font-size: 15px;
      font-weight: 700;
    }
    #${settingsRootId} .ob-bridge-metadataPicker {
      border: 1px solid var(--material-border);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.02);
      overflow: hidden;
    }
    #${settingsRootId} .ob-bridge-metadataPicker > summary {
      list-style: none;
    }
    #${settingsRootId} .ob-bridge-metadataPicker > summary::-webkit-details-marker {
      display: none;
    }
    #${settingsRootId} .ob-bridge-metadataPicker__summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      cursor: pointer;
      user-select: none;
    }
    #${settingsRootId} .ob-bridge-metadataPicker__summary::after {
      content: "▾";
      font-size: 12px;
      line-height: 1;
      color: var(--text-color-deemphasized);
      transition: transform 120ms ease;
    }
    #${settingsRootId} .ob-bridge-metadataPicker:not([open]) .ob-bridge-metadataPicker__summary::after {
      transform: rotate(-90deg);
    }
    #${settingsRootId} .ob-bridge-metadataPicker__title {
      font-weight: 700;
      line-height: 1.4;
    }
    #${settingsRootId} .ob-bridge-metadataPicker__meta {
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-color-deemphasized);
      text-align: right;
    }
    #${settingsRootId} .ob-bridge-metadataPicker__panel {
      border-top: 1px solid var(--material-border);
      background: rgba(255, 255, 255, 0.02);
    }
    #${settingsRootId} .ob-bridge-metadataPicker__head,
    #${settingsRootId} .ob-bridge-metadataField {
      display: grid;
      grid-template-columns: minmax(280px, 420px) 68px 68px;
      gap: 8px;
      align-items: center;
      justify-content: start;
    }
    #${settingsRootId} .ob-bridge-metadataPicker__head {
      position: sticky;
      top: 0;
      z-index: 1;
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--text-color-deemphasized);
      background: rgba(34, 34, 34, 0.96);
      border-bottom: 1px solid var(--material-border);
    }
    #${settingsRootId} .ob-bridge-metadataPicker__head > :first-child {
      text-align: left;
    }
    #${settingsRootId} .ob-bridge-metadataPicker__head > :not(:first-child) {
      text-align: center;
      justify-self: center;
      width: 100%;
    }
    #${settingsRootId} .ob-bridge-metadataPicker__list {
      max-height: 420px;
      overflow: auto;
    }
    #${settingsRootId} .ob-bridge-metadataField {
      padding: 12px 14px;
      border-bottom: 1px solid var(--material-border);
    }
    #${settingsRootId} .ob-bridge-metadataField[data-active="true"] {
      background: rgba(59, 130, 246, 0.06);
    }
    #${settingsRootId} .ob-bridge-metadataField__info {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    #${settingsRootId} .ob-bridge-metadataField__label {
      font-weight: 600;
      line-height: 1.45;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #${settingsRootId} .ob-bridge-metadataField__key {
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-color-deemphasized);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 6px;
      padding: 2px 6px;
      flex: 0 1 150px;
      min-width: 0;
      max-width: 150px;
      box-sizing: border-box;
    }
    #${settingsRootId} .ob-bridge-metadataField__toggle {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    #${settingsRootId} .ob-bridge-metadataPicker__empty {
      padding: 18px 14px;
      color: var(--text-color-deemphasized);
      line-height: 1.7;
    }
    #${settingsRootId} .ob-bridge-choice-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }
    #${settingsRootId} .ob-bridge-choice {
      position: relative;
      display: block;
      cursor: pointer;
    }
    #${settingsRootId} .ob-bridge-choice input {
      position: absolute;
      inset: 0;
      opacity: 0;
      pointer-events: none;
    }
    #${settingsRootId} .ob-bridge-choice__body {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-height: 112px;
      padding: 14px 16px;
      border: 1px solid var(--material-border);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.02);
      box-sizing: border-box;
      transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
    }
    #${settingsRootId} .ob-bridge-choice:hover .ob-bridge-choice__body {
      transform: translateY(-1px);
    }
    #${settingsRootId} .ob-bridge-choice input:checked + .ob-bridge-choice__body {
      border-color: var(--accent-blue, #3b82f6);
      background: rgba(59, 130, 246, 0.12);
    }
    #${settingsRootId} .ob-bridge-choice__title {
      font-weight: 700;
      line-height: 1.45;
    }
    #${settingsRootId} .ob-bridge-choice__desc {
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-color-deemphasized);
    }
    #${settingsRootId} .ob-bridge-choice__badge {
      align-self: flex-start;
      font-size: 11px;
      font-weight: 700;
      color: var(--accent-blue, #3b82f6);
      background: rgba(59, 130, 246, 0.16);
      padding: 2px 8px;
      border-radius: 999px;
    }
    #${settingsRootId} .ob-bridge-status {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    #${settingsRootId} .ob-bridge-status__pill {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.08);
    }
    #${settingsRootId} .ob-bridge-status__detail {
      font-size: 13px;
      line-height: 1.45;
      color: var(--text-color);
    }
    #${settingsRootId} .ob-bridge-status__pill--ready { color: #22c55e; background: rgba(34, 197, 94, 0.14); }
    #${settingsRootId} .ob-bridge-status__pill--warning { color: #f59e0b; background: rgba(245, 158, 11, 0.14); }
    #${settingsRootId} .ob-bridge-status__pill--error { color: #ef4444; background: rgba(239, 68, 68, 0.14); }
    #${settingsRootId} .ob-bridge-status__pill--checking,
    #${settingsRootId} .ob-bridge-status__pill--idle { color: var(--accent-blue, #3b82f6); background: rgba(59, 130, 246, 0.14); }
    #${settingsRootId} .ob-bridge-preview { position: sticky; top: 12px; }
    #${settingsRootId} .ob-bridge-preview-meta { font-size: 12px; line-height: 1.7; color: var(--text-color-deemphasized); padding: 10px 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.03); }
    #${settingsRootId} .ob-bridge-preview-meta--loading { color: var(--accent-blue, #3b82f6); }
    #${settingsRootId} .ob-bridge-preview-meta--error { color: #ef4444; }
    #${settingsRootId} .ob-bridge-preview-section { display: flex; flex-direction: column; gap: 6px; }
    #${settingsRootId} .ob-bridge-preview-label { font-size: 12px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--text-color-deemphasized); }
    #${settingsRootId} .ob-bridge-preview-value,
    #${settingsRootId} .ob-bridge-code { border: 1px solid var(--material-border); border-radius: 12px; background: rgba(255, 255, 255, 0.02); padding: 12px; box-sizing: border-box; }
    #${settingsRootId} .ob-bridge-preview-value,
    #${settingsRootId} .ob-bridge-code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; }
    #${settingsRootId} .ob-bridge-code { max-height: 260px; overflow: auto; margin: 0; }
    #${settingsRootId} details.ob-bridge-details { border-top: 1px solid var(--material-border); padding-top: 10px; }
    #${settingsRootId} details.ob-bridge-details > summary { cursor: pointer; font-size: 13px; font-weight: 600; margin-bottom: 10px; }
    @media (max-width: 1200px) {
      #${settingsRootId} .ob-bridge-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      #${settingsRootId} .ob-bridge-note-design { grid-template-columns: 1fr; }
      #${settingsRootId} .ob-bridge-preview { position: static; }
    }
    @media (max-width: 680px) {
      #${settingsRootId} .ob-bridge-metadataGrid {
        grid-template-columns: 1fr;
      }
      #${settingsRootId} .ob-bridge-metadataPicker__summary {
        align-items: flex-start;
        flex-direction: column;
      }
      #${settingsRootId} .ob-bridge-metadataPicker__head,
      #${settingsRootId} .ob-bridge-metadataField {
        grid-template-columns: minmax(0, 1fr) 56px 56px;
      }
      #${settingsRootId} .ob-bridge-metadataPicker__meta {
        text-align: left;
      }
      #${settingsRootId} .ob-bridge-metadataField__toggle {
        justify-content: start;
      }
      #${settingsRootId} .ob-bridge-metadataField__info {
        gap: 8px;
      }
      #${settingsRootId} .ob-bridge-metadataField__key {
        flex-basis: 120px;
        max-width: 120px;
      }
      #${settingsRootId} .ob-prefs-formRow,
      #${settingsRootId} .ob-prefs-formRow--actions {
        grid-template-columns: minmax(0, 1fr);
      }
      #${settingsRootId} .ob-prefs-formRow > label,
      #${settingsRootId} .ob-prefs-formRow > .html-label,
      #${settingsRootId} .ob-prefs-formRow > html\\:label {
        white-space: normal;
      }
      #${settingsRootId} .ob-prefs-connectionHeader {
        grid-template-columns: auto minmax(0, 1fr);
        width: 100%;
      }
      #${settingsRootId} .ob-prefs-connectionFeedback {
        grid-column: 1 / -1;
        justify-self: start;
        text-align: left;
      }
      #${settingsRootId} .ob-prefs-pathField {
        grid-template-columns: minmax(0, 1fr) auto;
      }
      #${settingsRootId} .ob-prefs-pathField > .ob-prefs-fieldLabel {
        grid-column: 1 / -1;
      }
    }
  `;
}
