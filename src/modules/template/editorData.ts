import formatStoreData = require("./editor-data/formatStore.json");
import snippetsStoreData = require("./editor-data/snippetsStore.json");

export type TemplateSnippetKind = "syntax" | "variable" | "expression";

export interface TemplateFormatDefinition {
  name: string;
  code: string;
  defaultText?: string;
}

export interface TemplateSnippetDefinition {
  name: string;
  code: string;
  type: TemplateSnippetKind;
}

type TemplateSnippetStore = Record<string, TemplateSnippetDefinition[]> & {
  global: TemplateSnippetDefinition[];
};

const formatStore = formatStoreData as TemplateFormatDefinition[];
const snippetsStore = snippetsStoreData as TemplateSnippetStore;

function getTemplateSnippets(type: string) {
  return [...(snippetsStore[type] || []), ...snippetsStore.global];
}

export { formatStore, getTemplateSnippets };
