import * as vscode from "vscode";
import * as matter from "gray-matter";

export function activate(context: vscode.ExtensionContext) {
  // Get config
  /**
   * {
   *    strict: boolean // make sure every markdown file need to have type key-value in frontmatter
   * }
   */

  const mdWatcher = vscode.workspace.createFileSystemWatcher(
    "**/*.{md,mdx}",
    true,
    false,
    true
  );

  mdWatcher.onDidChange(async (uri) => {
    const readFile = await vscode.workspace.fs.readFile(uri);
    const readStr = Buffer.from(readFile).toString("utf8");

    const pathArr = uri.path.split("/");
    const fileNameArr = pathArr[pathArr.length - 1].split(".");
    const fileExtension = fileNameArr[fileNameArr.length - 1];

    if (fileExtension === "md") {
      const { data } = matter(readStr);

      if ("type" in data) {
        console.log("hi type", data.type);
      } else {
        // if strict === true, we need to alarm that frontmatter doesn't have type key
      }
    }

    // Recognize md and mdx
    // md -> safely utilize frontmatter
    // mdx -> make sure we can handle export prop and frontmatter at the same time
  });

  context.subscriptions.push(mdWatcher);
}

// this method is called when your extension is deactivated
export function deactivate() {}
