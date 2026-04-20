import * as childProcess from "child_process";
import * as util from "util";
import * as os from "os";

const execAsync = util.promisify(childProcess.exec);

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export async function asyncExec(command: string, options: childProcess.ExecOptions): Promise<ExecResult> {
  return execAsync(command, options);
}

export function isWindows(): boolean {
  return os.platform() === "win32";
}
