import * as vscode from "vscode";
import matter from "gray-matter";
import { MdShieldConfig, MdShieldType, Meta } from "./types";
import {
  getFileExtension,
  getKeyPosition,
  getKeyPositionProps,
  isYmalException,
} from "./utils";

const CONFIG_FILE_GLOB = "{mdshield,mdshield.config}.{js,mjs}";
const mdShieldChannel = vscode.window.createOutputChannel("mdshield");

// Get config
/**
 * {
 *     // make sure every markdown file need to have type key-value in frontmatter
 *     // the frontmatter need to be identical to the type, every field should exist.
 *     // In strict=false mode, mdshield will only validate the registered type.
 *    strict: boolean
 * }
 */

// Be careful of null and undefined

export async function activate(context: vscode.ExtensionContext) {
  const collection = vscode.languages.createDiagnosticCollection("mdshield");

  if (!vscode.workspace.workspaceFolders) return;

  let folder = vscode.workspace.workspaceFolders[0];

  let [configUri] = await vscode.workspace.findFiles(
    new vscode.RelativePattern(folder, `**/${CONFIG_FILE_GLOB}`),
    null,
    1
  );

  if (!configUri) {
    mdShieldChannel.appendLine("Local configuration not detected");
  }

  const configFileExtension = getFileExtension(configUri.path);

  let config = {} as MdShieldConfig;

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
    } catch (err) {
      console.log(err);
    }
  });

  context.subscriptions.push(configWatcher);

  if (!config || Object.keys(config).length === 0) {
    mdShieldChannel.appendLine(
      "Local configuration detected but had not correctly loaded."
    );
    return;
  }

  if (!("types" in config)) {
    mdShieldChannel.appendLine(
      "Local configuration doesn't provide proper types field"
    );
    return;
  }

  mdShieldChannel.appendLine("Activate MD Guard with config");

  context.subscriptions.push(mdShieldChannel);

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

const updateDiagnostics = async (
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection,
  mdShieldConfig: MdShieldConfig
): Promise<void> => {
  collection.clear();

  if (!document) return;

  let diagnostics: vscode.Diagnostic[] = [];
  const fileExtension = getFileExtension(document.uri.path);

  if (fileExtension === "md") {
    let data: { [key: string]: any } = {};

    try {
      const meta = matter(document.getText());
      data = meta.data;
    } catch (err) {
      if (isYmalException(err)) {
        if (err.reason === "duplicated mapping key") {
          collection.set(document.uri, [
            {
              code: "",
              range: new vscode.Range(
                new vscode.Position(0, 0),
                new vscode.Position(0, 1)
              ),
              severity: vscode.DiagnosticSeverity.Error,
              source: "MDShield",
              message: err.message,
            },
          ]);
        }
      }
    }

    if (Object.keys(data).length !== 0) {
      if (!("type" in data)) {
        if (mdShieldConfig.strict) {
          collection.set(document.uri, [
            {
              code: "",
              range: new vscode.Range(
                new vscode.Position(0, 0),
                new vscode.Position(0, 1)
              ),
              severity: vscode.DiagnosticSeverity.Error,
              source: "MDShield",
              message:
                "MDShield is under strict mode, but it can not find the type field in markdown's meta. " +
                "You can either set MDShield at non-strict mode, or add type into your frontmatter",
            },
          ]);
        }
        return;
      }

      if (mdShieldConfig.strict) {
        strictValidate(
          document,
          mdShieldConfig.types[data.type as string] as MdShieldType,
          data.type,
          data,
          diagnostics,
          { line: 0, offset: 0 }
        );
      } else {
        nonStrictValidate(
          document,
          mdShieldConfig.types[data.type as string] as MdShieldType,
          data,
          diagnostics,
          { line: 0, offset: 0 }
        );
      }
      collection.set(document.uri, diagnostics);
    }

    return;
  }

  if (fileExtension === "mdx") {
    if (mdShieldConfig.meta === "frontmatter") {
      let data: { [key: string]: any } = {};

      try {
        const meta = matter(document.getText());
        data = meta.data;
      } catch (err) {
        if (isYmalException(err)) {
          if (err.reason === "duplicated mapping key") {
            collection.set(document.uri, [
              {
                code: "",
                range: new vscode.Range(
                  new vscode.Position(0, 0),
                  new vscode.Position(0, 1)
                ),
                severity: vscode.DiagnosticSeverity.Error,
                source: "MDShield",
                message: err.message,
              },
            ]);
          }
        }
      }

      if (Object.keys(data).length !== 0) {
        if (!("type" in data)) {
          if (mdShieldConfig.strict) {
            collection.set(document.uri, [
              {
                code: "",
                range: new vscode.Range(
                  new vscode.Position(0, 0),
                  new vscode.Position(0, 1)
                ),
                severity: vscode.DiagnosticSeverity.Error,
                source: "MDShield",
                message:
                  "MDShield is under strict mode, but it can not find the type field in markdown's meta. " +
                  "You can either set MDShield at non-strict mode, or add type into your frontmatter",
              },
            ]);
          }
          return;
        }

        if (mdShieldConfig.strict) {
          strictValidate(
            document,
            mdShieldConfig.types[data.type as string] as MdShieldType,
            data.type,
            data,
            diagnostics,
            { line: 0, offset: 0 }
          );
        } else {
          nonStrictValidate(
            document,
            mdShieldConfig.types[data.type as string] as MdShieldType,
            data,
            diagnostics,
            { line: 0, offset: 0 }
          );
        }
        collection.set(document.uri, diagnostics);
      }
    } else if (mdShieldConfig.meta === "export") {
      // const module = await import(`${document.uri.path}?update=${new Date()}`);
      // console.log(module.meta);
      // const source = fs.readFileSync(document.uri.path);
      // const compiled = await (await mdx).compile(source);
      // console.log(compiled);
    } else {
    }
  }
};

const strictValidate = (
  document: vscode.TextDocument,
  type: MdShieldType,
  typeName: string,
  meta: Meta,
  diagnostics: vscode.Diagnostic[],
  startPosition: getKeyPositionProps["startPosition"]
) => {
  Object.entries(meta).forEach(([k, v]) => {
    // If the frontmatter has additional field besides type's field, we need to warn user
    // this field is unnecessary under strict mode.

    if (k === "type") {
      return;
    }

    if (!(k in type)) {
      const textPosition = getKeyPosition({
        document,
        key: k,
        startPosition,
      });
      diagnostics.push({
        code: "",
        range: new vscode.Range(textPosition.start, textPosition.end),
        severity: vscode.DiagnosticSeverity.Error,
        source: "MDShield",
        message: `${k} is not existed in type ${typeName}`,
      });
      return;
    }

    if (typeof type[k] === "object" && typeof v === "object" && v !== null) {
      const pos = getKeyPosition({
        document,
        key: k,
        startPosition,
      });

      strictValidate(
        document,
        type[k] as MdShieldType,
        typeName,
        v as Meta,
        diagnostics,
        { line: pos.start.line, offset: pos.start.character }
      );
      return;
    }

    validate({
      document,
      type,
      diagnostics,
      key: k,
      value: v,
      startPosition,
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
  type: MdShieldType,
  meta: Meta,
  diagnostics: vscode.Diagnostic[] = [],
  startPosition: getKeyPositionProps["startPosition"]
) => {
  Object.entries(meta).forEach(([k, v]) => {
    // If the frontmatter has additional field besides type's field, we don't validate
    // it under non-strict mode

    if (!(k in type)) {
      return;
    }

    if (typeof type[k] === "object" && typeof v === "object" && v !== null) {
      const pos = getKeyPosition({
        document,
        key: k,
        startPosition,
      });
      nonStrictValidate(
        document,
        type[k] as MdShieldType,
        v as Meta,
        diagnostics,
        { line: pos.start.line, offset: pos.start.character }
      );
      return;
    }

    validate({
      document,
      type,
      diagnostics,
      key: k,
      value: v,
      startPosition,
    });
  });
};

type ValidateProps = {
  document: vscode.TextDocument;
  type: MdShieldType;
  key: string;
  value: Meta | string | number | boolean | null;
  diagnostics: vscode.Diagnostic[];
  startPosition: getKeyPositionProps["startPosition"];
};

const validate = ({
  document,
  type,
  key,
  value,
  diagnostics,
  startPosition,
}: ValidateProps) => {
  try {
    const targetType = type[key];
    const valueType = typeof value;

    if (
      typeof targetType !== "object" &&
      valueType === "object" &&
      value !== null
    ) {
      const textPosition = getKeyPosition({
        document,
        key,
        startPosition,
      });
      diagnostics.push({
        code: "",
        range: new vscode.Range(textPosition.start, textPosition.end),
        severity: vscode.DiagnosticSeverity.Error,
        source: "MDShield",
        message: `The field ${key}'s type should be ${targetType}`,
      });
      return;
    }

    if (
      typeof targetType === "object" &&
      valueType !== "object" &&
      value !== null
    ) {
      const textPosition = getKeyPosition({
        document,
        key,
        startPosition,
      });
      diagnostics.push({
        code: "",
        range: new vscode.Range(textPosition.start, textPosition.end),
        severity: vscode.DiagnosticSeverity.Error,
        source: "MDShield",
        message: `The field ${key}'s type should be ${targetType}`,
      });
      return;
    }

    const targetTypeList: string[] = (targetType as string)
      .replace(/\s+/g, "")
      .split("|");

    let primitivePass = false;

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
      const textPosition = getKeyPosition({
        document,
        key,
        startPosition,
      });
      diagnostics.push({
        code: "",
        range: new vscode.Range(textPosition.start, textPosition.end),
        severity: vscode.DiagnosticSeverity.Error,
        source: "MDShield",
        message: `The field ${key}'s type should be ${targetType}`,
      });
    }
  } catch (err) {
    console.log(err);
  }
};
