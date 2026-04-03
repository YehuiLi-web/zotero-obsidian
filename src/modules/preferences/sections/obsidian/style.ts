function buildObsidianPrefsStyleText(
  settingsRootId: string,
  tooltipId: string,
) {
  return `
    #${settingsRootId} {
      margin-top: 12px;
    }
    #${settingsRootId} .ob-bridge-settings {
      display: flex;
      flex-direction: column;
      gap: 18px;
      color: var(--text-color);
    }
    #${settingsRootId} .ob-bridge-section {
      gap: 10px;
      padding: 0 0 14px 0;
      border-bottom: 1px solid var(--material-border, rgba(255, 255, 255, 0.18));
    }
    #${settingsRootId} .ob-bridge-section:last-child {
      padding-bottom: 0;
      border-bottom: 0;
    }
    #${settingsRootId} .ob-bridge-section__title {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      line-height: 1.5;
    }
    #${settingsRootId} .ob-bridge-cardStack {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    #${settingsRootId} .ob-bridge-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 14px;
      border: 1px solid var(--material-border, rgba(255, 255, 255, 0.18));
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.02);
    }
    #${settingsRootId} .ob-bridge-card__title {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.45;
    }
    #${settingsRootId} .ob-bridge-card__description {
      color: var(--text-color-deemphasized);
      font-size: 12px;
      line-height: 1.5;
    }
    #${settingsRootId} .ob-bridge-card__body {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-block: 0;
    }
    #${settingsRootId} .ob-bridge-section[data-ob-panel="workflow"] .ob-bridge-cardStack {
      gap: 12px;
    }
    #${settingsRootId} .ob-bridge-section[data-ob-panel="workflow"] .ob-bridge-card {
      gap: 8px;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
    }
    #${settingsRootId} .ob-bridge-section[data-ob-panel="workflow"] .ob-bridge-card + .ob-bridge-card {
      padding-top: 10px;
      border-top: 1px solid var(--material-border, rgba(255, 255, 255, 0.18));
    }
    #${settingsRootId} .ob-bridge-section[data-ob-panel="workflow"] .ob-bridge-card__title {
      font-size: 14px;
      font-weight: 700;
    }
    #${settingsRootId} .ob-bridge-rowBlock {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    #${settingsRootId} .ob-bridge-rowBlock--wideLabel .ob-bridge-formRow {
      grid-template-columns: 168px minmax(240px, 1fr) auto;
    }
    #${settingsRootId} .ob-bridge-formRow {
      display: grid;
      grid-template-columns: 120px minmax(240px, 1fr) auto;
      gap: 8px 10px;
      align-items: center;
    }
    #${settingsRootId} .ob-bridge-formRow__label {
      line-height: 1.5;
      white-space: nowrap;
    }
    #${settingsRootId} .ob-bridge-formRow__control,
    #${settingsRootId} .ob-bridge-formRow__actions {
      min-width: 0;
    }
    #${settingsRootId} .ob-bridge-formRow__actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    #${settingsRootId} .ob-bridge-input,
    #${settingsRootId} .ob-bridge-select {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
    #${settingsRootId} .ob-bridge-button {
      white-space: nowrap;
    }
    #${settingsRootId} .ob-bridge-button--link {
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--accent-blue, #6ca6ff);
      text-decoration: underline;
      cursor: pointer;
    }
    #${settingsRootId} .ob-bridge-button--link:hover {
      opacity: 0.9;
    }
    #${settingsRootId} .ob-bridge-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    #${settingsRootId} .ob-bridge-linkRow {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    #${settingsRootId} .ob-bridge-linkDivider {
      color: var(--text-color-deemphasized);
      font-size: 12px;
      line-height: 1.5;
    }
    #${settingsRootId} .ob-bridge-aboutPanel {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-top: 2px;
    }
    #${settingsRootId} .ob-bridge-aboutPanel__meta {
      opacity: 0.92;
    }
    #${settingsRootId} .ob-bridge-section[data-ob-panel="about"] .ob-bridge-linkRow {
      gap: 6px 10px;
    }
    #${settingsRootId} .ob-bridge-choiceGroup {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 12px;
    }
    #${settingsRootId} .ob-bridge-choiceGroup--grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px 14px;
      align-items: start;
    }
    #${settingsRootId} .ob-bridge-section[data-ob-panel="sync"] .ob-bridge-choiceGroup--grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px 12px;
    }
    #${settingsRootId} .ob-bridge-section[data-ob-panel="sync"] .ob-bridge-choiceGroup--grid .ob-bridge-choiceLine {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: start;
      gap: 4px 6px;
      min-height: 24px;
    }
    #${settingsRootId} .ob-bridge-section[data-ob-panel="sync"] .ob-bridge-choiceGroup--grid .ob-bridge-choiceLine > input {
      margin-top: 2px;
    }
    #${settingsRootId} .ob-bridge-choiceLine {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      line-height: 1.5;
    }
    #${settingsRootId} .ob-bridge-choiceLine__meta,
    #${settingsRootId} .ob-bridge-inline,
    #${settingsRootId} .ob-bridge-inline-summary,
    #${settingsRootId} .ob-bridge-feedback,
    #${settingsRootId} .ob-bridge-status__detail {
      color: var(--text-color-deemphasized);
      font-size: 12px;
      line-height: 1.5;
    }
    #${settingsRootId} .ob-bridge-inlineStack {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    #${settingsRootId} .ob-bridge-previewHint {
      margin: 8px 0 0;
    }
    #${settingsRootId} .ob-bridge-status {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    #${settingsRootId} .ob-bridge-status__pill {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border: 1px solid var(--material-border, rgba(255, 255, 255, 0.18));
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.4;
      background: rgba(255, 255, 255, 0.04);
    }
    #${settingsRootId} .ob-bridge-status__pill--ready,
    #${settingsRootId} .ob-bridge-feedback--success {
      color: #8fd19e;
    }
    #${settingsRootId} .ob-bridge-status__pill--warning {
      color: #e5c07b;
    }
    #${settingsRootId} .ob-bridge-status__pill--error,
    #${settingsRootId} .ob-bridge-feedback--error {
      color: #f28b82;
    }
    #${settingsRootId} .ob-bridge-status__pill--checking {
      color: var(--text-color-deemphasized);
    }
    #${settingsRootId} .ob-bridge-details {
      border: 1px solid var(--material-border, rgba(255, 255, 255, 0.18));
      border-radius: 6px;
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.02);
    }
    #${settingsRootId} .ob-bridge-details--nested {
      margin-top: 8px;
    }
    #${settingsRootId} .ob-bridge-details > summary {
      cursor: pointer;
      font-weight: 600;
      line-height: 1.5;
      user-select: none;
    }
    #${settingsRootId} .ob-bridge-details > summary::-webkit-details-marker {
      display: none;
    }
    #${settingsRootId} .ob-bridge-details > summary::before {
      content: "▸";
      display: inline-block;
      margin-right: 6px;
      color: var(--text-color-deemphasized);
      transition: transform 120ms ease;
    }
    #${settingsRootId} .ob-bridge-details[open] > summary::before {
      transform: rotate(90deg);
    }
    #${settingsRootId} .ob-bridge-details > :not(summary) {
      margin-top: 10px;
    }
    #${settingsRootId} .ob-bridge-previewBlock,
    #${settingsRootId} .ob-bridge-previewValue,
    #${settingsRootId} .ob-bridge-code {
      border: 1px solid var(--material-border, rgba(255, 255, 255, 0.18));
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.02);
      box-sizing: border-box;
    }
    #${settingsRootId} .ob-bridge-previewBlock {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 8px 10px;
    }
    #${settingsRootId} .ob-bridge-previewBlock__label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-color-deemphasized);
    }
    #${settingsRootId} .ob-bridge-previewValue,
    #${settingsRootId} .ob-bridge-code {
      padding: 8px 10px;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.55;
    }
    #${settingsRootId} .ob-bridge-code {
      max-height: 260px;
      overflow: auto;
      margin: 0;
    }
    #${settingsRootId} .ob-bridge-metadataPicker {
      border: 1px solid var(--material-border, rgba(255, 255, 255, 0.18));
      border-radius: 6px;
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
      padding: 10px 12px;
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
      color: var(--text-color-deemphasized);
      font-size: 12px;
      line-height: 1.4;
    }
    #${settingsRootId} .ob-bridge-metadataPicker__panel {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 0 12px 12px;
    }
    #${settingsRootId} .ob-bridge-metadataPicker__head,
    #${settingsRootId} .ob-bridge-metadataField {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 64px 64px;
      gap: 8px;
      align-items: center;
    }
    #${settingsRootId} .ob-bridge-metadataPicker__head {
      color: var(--text-color-deemphasized);
      font-size: 12px;
      font-weight: 600;
    }
    #${settingsRootId} .ob-bridge-metadataPicker__list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    #${settingsRootId} .ob-bridge-metadataField {
      padding: 8px 10px;
      border: 1px solid var(--material-border, rgba(255, 255, 255, 0.18));
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.02);
    }
    #${settingsRootId} .ob-bridge-metadataField[data-active="true"] {
      border-color: rgba(64, 158, 255, 0.4);
    }
    #${settingsRootId} .ob-bridge-metadataField__info {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    #${settingsRootId} .ob-bridge-metadataField__label {
      font-weight: 600;
      line-height: 1.45;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #${settingsRootId} .ob-bridge-metadataField__key {
      color: var(--text-color-deemphasized);
      font-size: 12px;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #${settingsRootId} .ob-bridge-metadataField__toggle {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #${settingsRootId} .ob-bridge-metadataPicker__empty {
      color: var(--text-color-deemphasized);
      font-size: 12px;
      line-height: 1.5;
      padding: 4px 0;
    }
    #${tooltipId} {
      display: none !important;
    }
    @media (max-width: 760px) {
      #${settingsRootId} .ob-bridge-formRow {
        grid-template-columns: minmax(0, 1fr);
      }
      #${settingsRootId} .ob-bridge-formRow__actions {
        justify-content: flex-start;
      }
      #${settingsRootId} .ob-bridge-choiceGroup--grid,
      #${settingsRootId} .ob-bridge-metadataPicker__head,
      #${settingsRootId} .ob-bridge-metadataField {
        grid-template-columns: minmax(0, 1fr);
      }
      #${settingsRootId} .ob-bridge-section[data-ob-panel="sync"] .ob-bridge-choiceGroup--grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      #${settingsRootId} .ob-bridge-metadataField__toggle {
        justify-content: flex-start;
      }
      #${settingsRootId} .ob-bridge-aboutPanel {
        gap: 4px;
      }
    }
    @media (max-width: 620px) {
      #${settingsRootId} .ob-bridge-section[data-ob-panel="sync"] .ob-bridge-choiceGroup--grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `;
}

export { buildObsidianPrefsStyleText };
