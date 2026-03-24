import { config } from "../../package.json";

export async function openTemplatePicker(
  options: {
    multiSelect?: boolean;
    filterPrefix?: string;
    selected?: string[];
    templates?: string[];
  } = {},
) {
  const {
    multiSelect = false,
    filterPrefix = "",
    selected = [],
    templates: providedTemplates,
  } = options;
  const templates =
    providedTemplates && providedTemplates.length
      ? [...providedTemplates]
      : addon.api.template.getTemplateKeys().filter(
          (template) =>
            !addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(template) &&
            (!filterPrefix || template.startsWith(filterPrefix)),
        );
  const args = {
    templates,
    multiSelect,
    selected: [...selected],
    deferred: Zotero.Promise.defer(),
  };
  // @ts-ignore
  // args.wrappedJSObject = args;
  Services.ww.openWindow(
    // @ts-ignore
    null,
    `chrome://${config.addonRef}/content/templatePicker.xhtml`,
    "_blank",
    "chrome,modal,centerscreen,resizable=yes",
    args,
  );
  await args.deferred.promise;
  return args.selected;
}
