import * as vscode from "vscode";

const getKeyPosition = (document: vscode.TextDocument, key: string) => {
  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    if (line.text.includes(key)) {
      const start = line.text.indexOf(key);
      const end = line.text.indexOf(key) + key.length;

      // We need to find the right key

      if (start === 0) {
        return {
          start,
          end,
          line: i,
        };
      } else {
        // We have to make sure the child's key is at the first position of the line too
        // {
        //   parent: {
        //     child: "hi" <--- If this is the right key, it won't have any character before itself
        //   }
        // }
        const textList = line.text.split(" ").filter((e) => e !== "");
        if (textList[0] === key + ":") {
          return {
            start,
            end,
            line: i,
          };
        }
      }
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

export { getKeyPosition, getFileExtension, sortedWorkspaceFolders };
