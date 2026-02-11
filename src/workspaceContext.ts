import * as vscode from "vscode";

/**
 * Represents a workspace context - either a real workspace folder or a default (no folder) context
 */
export class WorkspaceContext {
  readonly uri: vscode.Uri;
  readonly name: string;
  readonly key: string;
  readonly isDefault: boolean;
  readonly workspaceFolder: vscode.WorkspaceFolder | undefined;

  private constructor(
    uri: vscode.Uri,
    name: string,
    key: string,
    isDefault: boolean,
    workspaceFolder: vscode.WorkspaceFolder | undefined,
  ) {
    this.uri = uri;
    this.name = name;
    this.key = key;
    this.isDefault = isDefault;
    this.workspaceFolder = workspaceFolder;
  }

  static fromWorkspaceFolder(folder: vscode.WorkspaceFolder): WorkspaceContext {
    return new WorkspaceContext(folder.uri, folder.name, folder.uri.toString(), false, folder);
  }

  static createDefault(): WorkspaceContext {
    const uri = vscode.Uri.file(process.cwd());
    return new WorkspaceContext(uri, "default", "__default__", true, undefined);
  }

  static from(workspace: vscode.WorkspaceFolder | undefined): WorkspaceContext {
    return workspace ? WorkspaceContext.fromWorkspaceFolder(workspace) : WorkspaceContext.createDefault();
  }

  getStorageKey(): string {
    return this.isDefault ? "rubyPath" : `rubyPath:${this.key}`;
  }
}
