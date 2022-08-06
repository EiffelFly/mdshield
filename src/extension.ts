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

  // const configWatcher = vscode.workspace.createFileSystemWatcher(
  //   "**/*.{md,mdx}",
  //   true,
  //   false,
  //   true
  // );

  // mdWatcher.onDidChange(async (uri) => {
  //   const readFile = await vscode.workspace.fs.readFile(uri);
  //   const readStr = Buffer.from(readFile).toString("utf8");
  //   const pathArr = uri.path.split("/");
  //   const fileNameArr = pathArr[pathArr.length - 1].split(".");
  //   const fileExtension = fileNameArr[fileNameArr.length - 1];

  //   if (fileExtension === "md") {
  //     const { data } = matter(readStr);
  //     if ("type" in data) {
  //       console.log("hi type", data.type);
  //     } else {
  //       // if strict === true, we need to alarm that frontmatter doesn't have type key
  //       if (config.strict) {

  //       }
  //     }
  //   }
  //   // Recognize md and mdx
  //   // md -> safely utilize frontmatter
  //   // mdx -> make sure we can handle export prop and frontmatter at the same time

  //   console.log(config);
  // });

  // context.subscriptions.push(mdWatcher);
}

// this method is called when your extension is deactivated
export function deactivate() {}

const updateDiagnostics = (
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection,
  mdGuardConfig: MdGuardConfig
): void => {
  console.log("hi", document);
  collection.clear();
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
        nonStrictValidate(document, mdGuardConfig.types, data, collection);
      }
    }
  } else {
    collection.clear();
  }
};

const getFileExtension = (document: vscode.TextDocument): string => {
  const pathArr = document.uri.path.split("/");
  const fileNameArr = pathArr[pathArr.length - 1].split(".");
  const fileExtension = fileNameArr[fileNameArr.length - 1];
  return fileExtension;
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
  types: MdGuardType,
  meta: Meta,
  collection: vscode.DiagnosticCollection
) => {
  if (!("type" in meta)) {
    return;
  }

  const currentMdType = types[meta.type as string] as MdGuardType;
  let diagnostics: vscode.Diagnostic[] = [];

  Object.entries(meta).forEach(([k, v]) => {
    if (!(k in currentMdType)) {
      console.log("not found", k);
      return;
    }

    const configType = currentMdType[k];
    const valueType = typeof v;

    if (valueType === "object") {
      if (typeof configType !== "object") {
        getTextPosition(document, k);
        diagnostics.push({
          code: "",
          range: new vscode.Range(
            new vscode.Position(3, 4),
            new vscode.Position(3, 10)
          ),
          severity: vscode.DiagnosticSeverity.Error,
          source: "",
          message: `The field ${k}'s type should be ${configType}`,
        });
        return;
      } else {
        nonStrictValidate(
          document,
          configType as MdGuardType,
          v as Meta,
          collection
        );
        return;
      }
    }

    const configTypeList: string[] = (configType as string).split("|");

    if (!configTypeList.includes(valueType)) {
      const textPosition = getTextPosition(document, k);
      console.log("wrong", k, v);
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

    collection.set(document.uri, diagnostics);
  });

  // Object.entries(meta).map(([k, v]) => {
  //   console.log(k, v);

  //   if (!(k in types)) {
  //   }

  //   if (typeof v === "object") {
  //     if (k in types) {
  //       if (types[k] !== "object") {
  //         console.log(types[k], "not found");
  //         collection.set(document.uri, [
  //           {
  //             code: "",
  //             range: new vscode.Range(
  //               new vscode.Position(3, 4),
  //               new vscode.Position(3, 10)
  //             ),
  //             severity: vscode.DiagnosticSeverity.Error,
  //             source: "",
  //             message: `The field - [${k}]'s type should be ${types[k]}`,
  //           },
  //         ]);
  //       } else {
  //         nonStrictValidate(document, types[k] as MdGuardType, v, collection);
  //       }
  //     } else {
  //       mdguardChannel.appendLine(
  //         `Type ${k} is not present and strict mode is false. MdGuard won't validate meta ${k}`
  //       );
  //     }
  //   }
  // });
};

vscode.Position;

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
