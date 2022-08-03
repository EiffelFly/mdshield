import { Uri, workspace } from "vscode";

export const getConfig = (uri?: Uri) => {
  const config = workspace.getConfiguration("nitro", uri);
  return config;
};
