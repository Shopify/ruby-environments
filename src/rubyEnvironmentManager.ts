import * as vscode from "vscode";
import { RubyStatus } from "./status";
import { RubyChangeEvent, OptionalRubyDefinition, RubyEnvironmentsApi } from "./types";
import { RubyEnvironment } from "./rubyEnvironment";
import { WorkspaceContext } from "./workspaceContext";

/**
 * Manages Ruby environments for all workspace folders
 */
export class RubyEnvironmentManager implements RubyEnvironmentsApi {
  private readonly context: vscode.ExtensionContext;
  private readonly status: RubyStatus;
  private readonly changeEmitter: vscode.EventEmitter<RubyChangeEvent>;
  private readonly environments: Map<string, RubyEnvironment>;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.changeEmitter = new vscode.EventEmitter<RubyChangeEvent>();
    this.environments = new Map();
    this.status = new RubyStatus(this.changeEmitter.event);

    // Register disposables
    context.subscriptions.push(this.status);
    context.subscriptions.push(this.changeEmitter);

    // Watch for configuration changes
    const configWatcher = vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration("rubyEnvironments")) {
        // Update all environments
        for (const environment of this.environments.values()) {
          await environment.updateRubyDefinition();
        }
      }
    });
    context.subscriptions.push(configWatcher);

    // Watch for workspace folder changes
    const workspaceFoldersWatcher = vscode.workspace.onDidChangeWorkspaceFolders(async (e) => {
      // Remove environments for removed folders
      for (const folder of e.removed) {
        const key = WorkspaceContext.fromWorkspaceFolder(folder).key;
        this.environments.delete(key);
      }

      // Add environments for added folders
      for (const folder of e.added) {
        await this.createEnvironment(WorkspaceContext.fromWorkspaceFolder(folder));
      }
    });
    context.subscriptions.push(workspaceFoldersWatcher);

    // Register command to select Ruby installation
    const selectRuby = vscode.commands.registerCommand("ruby-environments.selectRuby", async () => {
      await this.selectRuby();
    });
    context.subscriptions.push(selectRuby);
  }

  async activate(): Promise<void> {
    // Activate all workspace folders (initial activation)
    const workspaceFolders = vscode.workspace.workspaceFolders || [];

    // Handle the case where there are no workspace folders but we still want to provide an environment
    if (workspaceFolders.length === 0) {
      await this.createEnvironment(WorkspaceContext.createDefault());
    } else {
      for (const folder of workspaceFolders) {
        await this.createEnvironment(WorkspaceContext.fromWorkspaceFolder(folder));
      }
    }
  }

  async activateWorkspace(workspace: vscode.WorkspaceFolder | undefined): Promise<void> {
    const workspaceContext = WorkspaceContext.from(workspace);
    const key = workspaceContext.key;
    const environment = this.environments.get(key);

    if (!environment) {
      await this.createEnvironment(workspaceContext);
    }
  }

  getRuby(workspace: vscode.WorkspaceFolder | undefined): OptionalRubyDefinition {
    const workspaceContext = WorkspaceContext.from(workspace);
    const key = workspaceContext.key;
    const environment = this.environments.get(key);
    return environment?.getRuby() || null;
  }

  get onDidRubyChange(): vscode.Event<RubyChangeEvent> {
    return this.changeEmitter.event;
  }

  private async createEnvironment(workspaceContext: WorkspaceContext): Promise<void> {
    const environment = new RubyEnvironment(this.context, workspaceContext, this.changeEmitter);
    this.environments.set(workspaceContext.key, environment);
    await environment.activate();
  }

  private async selectRuby(): Promise<void> {
    // If there are multiple workspace folders, ask the user which one to configure
    const workspaceFolders = vscode.workspace.workspaceFolders || [];

    let targetWorkspace: vscode.WorkspaceFolder | undefined;

    if (workspaceFolders.length > 1) {
      const selected = await vscode.window.showQuickPick(
        workspaceFolders.map((folder) => ({
          label: folder.name,
          description: folder.uri.fsPath,
          workspace: folder,
        })),
        {
          placeHolder: "Select workspace folder to configure Ruby for",
        },
      );

      if (!selected) {
        return;
      }

      targetWorkspace = selected.workspace;
    } else if (workspaceFolders.length === 1) {
      targetWorkspace = workspaceFolders[0];
    }

    const workspaceContext = WorkspaceContext.from(targetWorkspace);
    const environment = this.environments.get(workspaceContext.key);

    if (environment) {
      await environment.selectRuby();
    }
  }
}
