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

export { getTextPosition, getFileExtension };
