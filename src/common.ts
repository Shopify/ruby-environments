import { exec } from "child_process";
import { promisify } from "util";
import { window } from "vscode";

export interface RubyInterface {
  error: boolean;
  versionManager: { identifier: string };
  rubyVersion?: string;
}

export const asyncExec = promisify(exec);
export const RUBY_ENVIRONMENTS = "Ruby Environments";
export const LOG_CHANNEL = window.createOutputChannel(RUBY_ENVIRONMENTS, {
  log: true,
});
