import * as vscode from "vscode";
import matter from "gray-matter";
import { MdGuardConfig, MdGuardType, Meta } from "./types";
import { getFileExtension, getTextPosition } from "./utils";

const CONFIG_FILE_GLOB = "{mdguard,mdguard.config}.{js,mjs}";
const mdguardChannel = vscode.window.createOutputChannel("mdguard");

// Get config
/**
 * {
 *     // make sure every markdown file need to have type key-value in frontmatter
 *     // the frontmatter need to be identical to the type, every field should exist.
 *     // In strict=false mode, mdguard will only validate the registered type.
 *    strict: boolean
 * }
 */

// Be careful of null and undefined

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

  context.subscriptions.push(mdguardChannel);

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

  if (!document) return;

  let diagnostics: vscode.Diagnostic[] = [];
  const fileExtension = getFileExtension(document);

  if (fileExtension === "md") {
    const { data } = matter(document.getText());

    if (!("type" in data)) {
      if (mdGuardConfig.strict) {
        collection.set(document.uri, [
          {
            code: "",
            range: new vscode.Range(
              new vscode.Position(0, 0),
              new vscode.Position(0, 1)
            ),
            severity: vscode.DiagnosticSeverity.Error,
            source: "mdguard",
            message:
              "MdGuard is under strict mode, but it can not find the type field in markdown's meta. " +
              "You can either set MdGuard at non-strict mode, or add type into your frontmatter",
          },
        ]);
      }
      return;
    }

    if (mdGuardConfig.strict) {
      strictValidate(
        document,
        mdGuardConfig.types[data.type as string] as MdGuardType,
        data,
        diagnostics
      );
    } else {
      nonStrictValidate(
        document,
        mdGuardConfig.types[data.type as string] as MdGuardType,
        data,
        diagnostics
      );
      console.log("???");
      console.log("heeloo");
    }

    collection.set(document.uri, diagnostics);
  }
};

const strictValidate = (
  document: vscode.TextDocument,
  type: MdGuardType,
  meta: Meta,
  diagnostics: vscode.Diagnostic[]
) => {
  Object.entries(meta).forEach(([k, v]) => {
    // If the frontmatter has additional field besides type's field, we need to warn user
    // this field is unnecessary under strict mode.

    if (!(k in type)) {
      const textPosition = getTextPosition(document, k);
      diagnostics.push({
        code: "",
        range: new vscode.Range(
          new vscode.Position(textPosition.line, textPosition.start),
          new vscode.Position(textPosition.line, textPosition.end)
        ),
        severity: vscode.DiagnosticSeverity.Error,
        source: "mdguard",
        message: `The field ${k} is not existed in configuration`,
      });
      return;
    }

    validate({
      document,
      type,
      diagnostics,
      key: k,
      value: v,
    });
  });
};

/**
 * Will validate markdown meta/frontmatter in a non-strict manner
 * - Only validate registered key
 *
 * For example, a type like below
 * ```js
 * const type = {
 *    title: "string",
 *    description: "string"
 * }
 * ```
 * And the meta like below
 * ```js
 * const meta = {
 *    title: "I am meta",
 *    description: "hello! how are you"
 *    draft: false
 * }
 * ```
 *
 * Non strict validate will only validate title and description and leave meta field untouch.
 */

const nonStrictValidate = (
  document: vscode.TextDocument,
  type: MdGuardType,
  meta: Meta,
  diagnostics: vscode.Diagnostic[] = []
) => {
  Object.entries(meta).forEach(([k, v]) => {
    // If the frontmatter has additional field besides type's field, we don't validate
    // it under non-strict mode

    console.log("value", v);

    if (!(k in type)) {
      return;
    }

    validate({
      document,
      type,
      diagnostics,
      key: k,
      value: v,
    });
  });
};

type ValidateProps = {
  document: vscode.TextDocument;
  type: MdGuardType;
  key: string;
  value: Meta | string | number | boolean | null;
  diagnostics: vscode.Diagnostic[];
};

const validate = ({
  document,
  type,
  key,
  value,
  diagnostics,
}: ValidateProps) => {
  try {
    const targetType = type[key];
    const valueType = typeof value;
    if (
      typeof targetType === "object" &&
      valueType === "object" &&
      value !== null
    ) {
      nonStrictValidate(
        document,
        targetType as MdGuardType,
        value as Meta,
        diagnostics
      );
      return;
    }

    if (
      typeof targetType !== "object" &&
      valueType === "object" &&
      value !== null
    ) {
      const textPosition = getTextPosition(document, key);
      diagnostics.push({
        code: "",
        range: new vscode.Range(
          new vscode.Position(textPosition.line, textPosition.start),
          new vscode.Position(textPosition.line, textPosition.end)
        ),
        severity: vscode.DiagnosticSeverity.Error,
        source: "mdguard",
        message: `The field ${key}'s type should be ${targetType}`,
      });
      return;
    }

    if (
      typeof targetType === "object" &&
      valueType !== "object" &&
      value !== null
    ) {
      const textPosition = getTextPosition(document, key);
      diagnostics.push({
        code: "",
        range: new vscode.Range(
          new vscode.Position(textPosition.line, textPosition.start),
          new vscode.Position(textPosition.line, textPosition.end)
        ),
        severity: vscode.DiagnosticSeverity.Error,
        source: "mdguard",
        message: `The field ${key}'s type should be ${targetType}`,
      });
      return;
    }

    const targetTypeList: string[] = (targetType as string)
      .replace(/\s+/g, "")
      .split("|");

    let primitivePass = false;

    console.log(valueType, targetTypeList);

    // User can use union type like string | number

    if (targetTypeList.includes(valueType)) {
      primitivePass = true;
    }

    // User can use multiple pre-set string like "test1" | "test2"

    if (valueType === "string") {
      if (targetTypeList.includes(value as string)) {
        primitivePass = true;
      }
    }

    // User can use multiple pre-set string like "test1" | 123

    if (valueType === "number") {
      const targetTypeNumList = targetTypeList.map(Number);
      if (targetTypeNumList.includes(value as number)) {
        primitivePass = true;
      }
    }

    // User can use multiple pre-set string like "test1" | false

    if (valueType === "boolean") {
      if (value) {
        if (targetTypeList.includes("true")) {
          primitivePass = true;
        }
      } else {
        if (targetTypeList.includes("false")) {
          primitivePass = true;
        }
      }
    }

    // User can use multiple pre-set string like "test1" | null

    if (value === null) {
      if (targetTypeList.includes("null")) {
        primitivePass = true;
      }
    }

    if (!primitivePass) {
      const textPosition = getTextPosition(document, key);
      diagnostics.push({
        code: "",
        range: new vscode.Range(
          new vscode.Position(textPosition.line, textPosition.start),
          new vscode.Position(textPosition.line, textPosition.end)
        ),
        severity: vscode.DiagnosticSeverity.Error,
        source: "mdguard",
        message: `The field ${key}'s type should be ${targetType}`,
      });
    }
  } catch (err) {
    console.log(err);
  }
};
