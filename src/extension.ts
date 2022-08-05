import * as vscode from "vscode";
import matter from "gray-matter";
import { Config, ConfigModule } from "./types";

const CONFIG_FILE_GLOB = "{mdguard,mdguard.config}.{js,mjs}";

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

export async function activate(context: vscode.ExtensionContext) {
  // Get config
  /**
   * {
   *    strict: boolean // make sure every markdown file need to have type key-value in frontmatter
   * }
   */

  const nitroChannel = vscode.window.createOutputChannel("Nitro");

  if (!vscode.workspace.workspaceFolders) return;

  let folder = vscode.workspace.workspaceFolders[0];

  let [configUri] = await vscode.workspace.findFiles(
    new vscode.RelativePattern(folder, `**/${CONFIG_FILE_GLOB}`),
    null,
    1
  );

  if (!configUri) {
    nitroChannel.appendLine("Local configuration not detected");
  }

  const configPathArr = configUri.path.split("/");
  const configFileNameArr = configPathArr[configPathArr.length - 1].split(".");
  const configFileExtension = configFileNameArr[configFileNameArr.length - 1];

  try {
    let config: ConfigModule;
    if (configFileExtension === "mjs") {
      console.log("mjs");
      config = await import(configUri.path);
      console.log(config.default);
    } else {
      config = require(configUri.path);
    }
  } catch (err) {
    console.log(err);
  }

  const mdWatcher = vscode.workspace.createFileSystemWatcher(
    "**/*.{md,mdx}",
    true,
    false,
    true
  );

  mdWatcher.onDidChange(async (uri) => {
    // const readFile = await vscode.workspace.fs.readFile(uri);
    // const readStr = Buffer.from(readFile).toString("utf8");
    // const pathArr = uri.path.split("/");
    // const fileNameArr = pathArr[pathArr.length - 1].split(".");
    // const fileExtension = fileNameArr[fileNameArr.length - 1];
    // if (fileExtension === "md") {
    //   const { data } = matter(readStr);
    //   if ("type" in data) {
    //     console.log("hi type", data.type);
    //   } else {
    //     // if strict === true, we need to alarm that frontmatter doesn't have type key
    //   }
    // }
    // Recognize md and mdx
    // md -> safely utilize frontmatter
    // mdx -> make sure we can handle export prop and frontmatter at the same time
  });

  context.subscriptions.push(mdWatcher);
}

// this method is called when your extension is deactivated
export function deactivate() {}
