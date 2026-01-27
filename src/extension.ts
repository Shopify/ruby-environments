import { platform } from "os";

import { ManagerConfiguration, Ruby } from "./ruby";
import { commands, env, ExtensionContext, ExtensionMode, TelemetrySender, WorkspaceFolder } from "vscode";
import { LOG_CHANNEL } from "./common";
import { WorkspaceChannel } from "./workspaceChannel";

export interface RubyEnvironment {
  env: NodeJS.ProcessEnv;
  rubyVersion?: string;
  yjitEnabled?: boolean;
  gemPath: string[];
  versionManager: ManagerConfiguration;
}

// The public API that gets exposed to other extensions that depend on Ruby environments
export interface RubyEnvironmentsApi {
  getEnvironment(workspaceFolder: WorkspaceFolder): Promise<RubyEnvironment>;
  updateEnvironment(env: NodeJS.ProcessEnv, workspaceFolder: WorkspaceFolder): Promise<void>;
  refreshEnvironment(workspaceFolder: WorkspaceFolder): Promise<void>;
}

const workspaceRubyMap = new Map<WorkspaceFolder, Ruby>();

export async function activate(context: ExtensionContext): Promise<RubyEnvironmentsApi> {
  const logger = await createLogger(context);
  return {
    getEnvironment: async (workspaceFolder: WorkspaceFolder) => {
      let ruby = workspaceRubyMap.get(workspaceFolder);
      if (!ruby) {
        ruby = new Ruby(context, workspaceFolder, new WorkspaceChannel(workspaceFolder.name, LOG_CHANNEL), logger);
        await ruby.activateRuby();
        workspaceRubyMap.set(workspaceFolder, ruby);
      }
      return {
        env: ruby.env,
        rubyVersion: ruby.rubyVersion,
        yjitEnabled: ruby.yjitEnabled,
        gemPath: ruby.gemPath,
        versionManager: ruby.versionManager,
      };
    },
    updateEnvironment: (env: NodeJS.ProcessEnv, workspaceFolder: WorkspaceFolder) => {
      const ruby = workspaceRubyMap.get(workspaceFolder);
      if (ruby) {
        ruby.env = env;
      }
      return Promise.resolve();
    },
    refreshEnvironment: async (workspaceFolder: WorkspaceFolder) => {
      const ruby = workspaceRubyMap.get(workspaceFolder);
      if (ruby) {
        await ruby.activateRuby();
      }
    },
  };
}

export function deactivate() {
  workspaceRubyMap.clear();
}

async function createLogger(context: ExtensionContext) {
  let sender;

  switch (context.extensionMode) {
    case ExtensionMode.Development:
      sender = {
        sendEventData: (eventName: string, data?: Record<string, any>) => {
          LOG_CHANNEL.debug(eventName, data);
        },
        sendErrorData: (error: Error, data?: Record<string, any>) => {
          LOG_CHANNEL.error(error, data);
        },
      };
      break;
    case ExtensionMode.Test:
      sender = {
        sendEventData: (_eventName: string, _data?: Record<string, any>) => {},
        sendErrorData: (_error: Error, _data?: Record<string, any>) => {},
      };
      break;
    default:
      try {
        let counter = 0;

        // If the extension that implements the getTelemetrySenderObject is not activated yet, the first invocation to
        // the command will activate it, but it might actually return `null` rather than the sender object. Here we try
        // a few times to receive a non `null` object back because we know that the getTelemetrySenderObject command
        // exists (otherwise, we end up in the catch clause)
        while (!sender && counter < 5) {
          await commands.executeCommand("getTelemetrySenderObject");

          sender = await commands.executeCommand<TelemetrySender | null>("getTelemetrySenderObject");

          counter++;
        }
      } catch (_error: any) {
        sender = {
          sendEventData: (_eventName: string, _data?: Record<string, any>) => {},
          sendErrorData: (_error: Error, _data?: Record<string, any>) => {},
        };
      }
      break;
  }

  if (!sender) {
    sender = {
      sendEventData: (_eventName: string, _data?: Record<string, any>) => {},
      sendErrorData: (_error: Error, _data?: Record<string, any>) => {},
    };
  }

  return env.createTelemetryLogger(sender, {
    ignoreBuiltInCommonProperties: true,
    ignoreUnhandledErrors: true,
    additionalCommonProperties: {
      extensionVersion: context.extension.packageJSON.version,
      environment: platform(),
      machineId: env.machineId,
    },
  });
}
