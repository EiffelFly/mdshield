import { YAMLException } from "js-yaml";
import * as vscode from "vscode";

export const getKeyPosition = (document: vscode.TextDocument, key: string) => {
  let pattern = new RegExp(`${key}:`);
  const match = pattern.exec(document.getText());

  if (match) {
    return {
      start: document.positionAt(match.index),
      end: document.positionAt(match.index + match[0].length),
    };
  } else {
    return {
      start: new vscode.Position(0, 0),
      end: new vscode.Position(0, 1),
    };
  }
};

export const getFileExtension = (document: vscode.TextDocument): string => {
  const pathArr = document.uri.path.split("/");
  const fileNameArr = pathArr[pathArr.length - 1].split(".");
  const fileExtension = fileNameArr[fileNameArr.length - 1];
  return fileExtension;
};

export const sortedWorkspaceFolders = (): string[] => {
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

export const isYmalException = (e: unknown): e is YAMLException => {
  return (
    typeof e === "object" &&
    e !== null &&
    "reason" in e &&
    "message" in e &&
    "name" in e
  );
};
