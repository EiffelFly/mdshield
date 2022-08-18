import { YAMLException } from "js-yaml";
import * as vscode from "vscode";

/**
 * Use startLine to determine whether the match text is the right one.
 * But the caveat is this only working at searching simple or object structure.
 *
 * In the situation below, we will recursively validate the object, everytime the position
 * go deeper one level, it needs to send the updated startPosition (In this case, the initial
 * startPosition will be {position: 0, offset: 0}, updated startPosition will be {position: 2, offset: 0})
 *
 * ```
 * ---
 * id: "getKey",
 * test: {
 *   id: "another key"
 * }
 * ---
 * ```
 */

export type getKeyPositionProps = {
  document: vscode.TextDocument;
  key: string;
  startPosition: {
    line: number;
    offset: number;
  };
};

export const getKeyPosition = ({
  document,
  key,
  startPosition,
}: getKeyPositionProps) => {
  let pattern = new RegExp(`${key}:`, "g");
  let match;
  let target;

  while ((match = pattern.exec(document.getText())) !== null) {
    const start = document.positionAt(match.index);

    if (start.line > startPosition.line) {
      target = match;
      break;
    } else if (start.line === startPosition.line) {
      // situation about key and value are in the same line { key: { foo: "h1", bar: "yo" }}
      if (start.character > startPosition.offset) {
        target = match;
        break;
      }
    }
  }

  if (target) {
    return {
      start: document.positionAt(target.index),
      end: document.positionAt(target.index + target[0].length),
    };
  } else {
    return {
      start: new vscode.Position(0, 0),
      end: new vscode.Position(0, 1),
    };
  }
};

export const getFileExtension = (path: string): string => {
  const pathArr = path.split("/");
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
