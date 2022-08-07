import * as vscode from "vscode";
import matter from "gray-matter";
import { MdGuardConfig, MdGuardType, Meta } from "./types";

const CONFIG_FILE_GLOB = "{mdguard,mdguard.config}.{js,mjs}";
const mdguardChannel = vscode.window.createOutputChannel("mdguard");

let _sortedWorkspaceFolders: string[] | undefined;
const sortedWorkspaceFolders = (): string[] => {
  if (_sortedWorkspaceFolders === void 0) {
    _sortedWorkspaceFolders = vscode.workspace.workspaceFolders
      ? vscode.workspace.workspaceFolders
          .map((folder) => {
            let result = folder.uri.toString();
            if (result.charAt(result.length - 1) !== "/") {
              result = result + "/";
            }
            return result;
          })
          .sort((a, b) => {
            return a.length - b.length;
          })
      : [];
  }
  return _sortedWorkspaceFolders;
};

// Get config
/**
 * {
 *     // make sure every markdown file need to have type key-value in frontmatter
 *     // the frontmatter need to be identical to the type, every field should exist.
 *     // In strict=false mode, mdguard will only validate the registered type.
 *    strict: boolean
 * }
 */

export async function activate(context: vscode.ExtensionContext) {
  const collection = vscode.languages.createDiagnosticCollection("mdguard");

  if (!vscode.workspace.workspaceFolders) return;

  let folder = vscode.workspace.workspaceFolders[0];

  let [configUri] = await vscode.workspace.findFiles(
    new vscode.RelativePattern(folder, `**/${CONFIG_FILE_GLOB}`),
    null,
    1
  );

  if (!configUri) {
    mdguardChannel.appendLine("Local configuration not detected");
  }

  const configPathArr = configUri.path.split("/");
  const configFileNameArr = configPathArr[configPathArr.length - 1].split(".");
  const configFileExtension = configFileNameArr[configFileNameArr.length - 1];

  let config = {} as MdGuardConfig;

  try {
    if (configFileExtension === "mjs") {
      const module = await import(configUri.path);
      config = module.default;
    } else {
      const module = require(configUri.path);
      config = module.default;
    }
  } catch (err) {
    console.log(err);
  }

  let configWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(folder, `**/${CONFIG_FILE_GLOB}`),
    true,
    false,
    true
  );

  configWatcher.onDidChange(async (uri) => {
    try {
      if (configFileExtension === "mjs") {
        // We need to invalidate old cached config
        const module = await import(`${uri.path}?update=${new Date()}`);
        config = module.default;
      } else {
        // We need to invalidate old cached config
        delete require.cache[uri.path];
        const module = require(uri.path);
        config = module.default;
      }
      console.log("Config file re-loaded,", config);
    } catch (err) {
      console.log(err);
    }
  });

  context.subscriptions.push(configWatcher);

  if (!config || Object.keys(config).length === 0) {
    mdguardChannel.appendLine(
      "Local configuration detected but had not correctly loaded."
    );
    return;
  }

  if (!("types" in config)) {
    mdguardChannel.appendLine(
      "Local configuration doesn't provide proper types field"
    );
    return;
  }

  mdguardChannel.appendLine("Activate MD Guard with config");

  // Use DiagnosticCollection to provide info

  if (vscode.window.activeTextEditor) {
    updateDiagnostics(
      vscode.window.activeTextEditor.document,
      collection,
      config
    );
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        updateDiagnostics(editor.document, collection, config);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      updateDiagnostics(event.document, collection, config);
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}

const updateDiagnostics = (
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection,
  mdGuardConfig: MdGuardConfig
): void => {
  collection.clear();
  let diagnostics: vscode.Diagnostic[] = [];
  if (document) {
    const fileExtension = getFileExtension(document);
    if (fileExtension === "md") {
      const { data } = matter(document.getText());
      if (mdGuardConfig.strict) {
        if (!("type" in data)) {
          collection.set(document.uri, [
            {
              code: "",
              range: new vscode.Range(
                new vscode.Position(0, 0),
                new vscode.Position(0, 1)
              ),
              severity: vscode.DiagnosticSeverity.Error,
              source: "",
              message:
                "MdGuard mode is strict, but it can not find the type field in markdown's meta",
            },
          ]);
        }
      } else {
        if (!("type" in data)) {
          return;
        }
        nonStrictValidate(
          document,
          mdGuardConfig.types[data.type as string] as MdGuardType,
          data,
          diagnostics
        );
        collection.set(document.uri, diagnostics);
      }
    }
  } else {
    collection.clear();
  }
};

const strictValidate = (type: MdGuardType, meta: Meta) => {};

/**
 * Will validate markdown meta/frontmatter in a non-strict manner
 * - Only validate registered key
 *
 * For example, a type like below
 * ```js
 * const type = {
 *  title: "string",
 *  description: "string"
 * }
 * ```
 * And the meta like below
 * ```js
 * const meta = {
 *  title: "I am meta",
 *  description: "hello! how are you"
 *  draft: false
 * }
 * ```
 *
 * Non strict validate will only validate title and description and leave meta field untouch.
 */

const nonStrictValidate = (
  document: vscode.TextDocument,
  type: MdGuardType,
  meta: Meta,
  diagnostics: vscode.Diagnostic[]
) => {
  Object.entries(meta).forEach(([k, v]) => {
    if (!(k in type)) {
      return;
    }

    const configType = type[k];
    const valueType = typeof v;

    if (typeof configType === "object" && valueType === "object") {
      nonStrictValidate(
        document,
        configType as MdGuardType,
        v as Meta,
        diagnostics
      );
      return;
    }

    if (typeof configType !== "object" && valueType === "object") {
      const textPosition = getTextPosition(document, k);
      diagnostics.push({
        code: "",
        range: new vscode.Range(
          new vscode.Position(textPosition.line, textPosition.start),
          new vscode.Position(textPosition.line, textPosition.end)
        ),
        severity: vscode.DiagnosticSeverity.Error,
        source: "",
        message: `The field ${k}'s type should be ${configType}`,
      });
      return;
    }

    if (typeof configType === "object" && valueType !== "object") {
      const textPosition = getTextPosition(document, k);
      diagnostics.push({
        code: "",
        range: new vscode.Range(
          new vscode.Position(textPosition.line, textPosition.start),
          new vscode.Position(textPosition.line, textPosition.end)
        ),
        severity: vscode.DiagnosticSeverity.Error,
        source: "",
        message: `The field ${k}'s type should be ${configType}`,
      });
      return;
    }

    const configTypeList: string[] = (configType as string)
      .replace(/\s+/g, "")
      .split("|");

    // Use can use multiple pre-set string like "test1" | "test2"

    if (valueType === "string") {
      if (!configTypeList.includes(v as string)) {
        const textPosition = getTextPosition(document, k);
        diagnostics.push({
          code: "",
          range: new vscode.Range(
            new vscode.Position(textPosition.line, textPosition.start),
            new vscode.Position(textPosition.line, textPosition.end)
          ),
          severity: vscode.DiagnosticSeverity.Error,
          source: "",
          message: `The field ${k}'s type should be ${configType}`,
        });
        return;
      }
    }

    // User can use union type like typescript like string | number

    if (!configTypeList.includes(valueType)) {
      const textPosition = getTextPosition(document, k);
      diagnostics.push({
        code: "",
        range: new vscode.Range(
          new vscode.Position(textPosition.line, textPosition.start),
          new vscode.Position(textPosition.line, textPosition.end)
        ),
        severity: vscode.DiagnosticSeverity.Error,
        source: "",
        message: `The field ${k}'s type should be ${configType}`,
      });
    }
  });
};

const getTextPosition = (document: vscode.TextDocument, text: string) => {
  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    if (line.text.includes(text)) {
      const start = line.text.indexOf(text);
      const end = line.text.indexOf(text) + text.length;

      return {
        start,
        end,
        line: i,
      };
    }
  }
  return {
    start: 0,
    end: 0,
    line: 0,
  };
};

const getFileExtension = (document: vscode.TextDocument): string => {
  const pathArr = document.uri.path.split("/");
  const fileNameArr = pathArr[pathArr.length - 1].split(".");
  const fileExtension = fileNameArr[fileNameArr.length - 1];
  return fileExtension;
};
