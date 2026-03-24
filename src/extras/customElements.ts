import { ContextPane } from "../elements/workspace/contextPane";
import { DetailsPane } from "../elements/workspace/detailsPane";
import { OutlinePicker } from "../elements/linkCreator/outlinePicker";
import { NotePicker } from "../elements/linkCreator/notePicker";
import { NotePreview } from "../elements/linkCreator/notePreview";
import { OutlinePane } from "../elements/workspace/outlinePane";
import { NoteRelatedBox } from "../elements/workspace/related";
import { Workspace } from "../elements/workspace/workspace";
import { InboundCreator } from "../elements/linkCreator/inboundCreator";
import { OutboundCreator } from "../elements/linkCreator/outboundCreator";

const elements = {
  "zob-context": ContextPane,
  "zob-outline": OutlinePane,
  "zob-details": DetailsPane,
  "zob-workspace": Workspace,
  "zob-note-picker": NotePicker,
  "zob-note-outline": OutlinePicker,
  "zob-note-preview": NotePreview,
  "zob-inbound-creator": InboundCreator,
  "zob-outbound-creator": OutboundCreator,
  "zob-related-box": NoteRelatedBox,
} as unknown as Record<string, CustomElementConstructor>;

for (const [key, constructor] of Object.entries(elements)) {
  if (!customElements.get(key)) {
    customElements.define(key, constructor);
  }
}
