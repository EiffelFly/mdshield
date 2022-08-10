import * as vscode from "vscode";

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

const sortedWorkspaceFolders = (): string[] => {
  let _sortedWorkspaceFolders: string[] | undefined;

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

export { getTextPosition, getFileExtension, sortedWorkspaceFolders };
