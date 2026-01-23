import * as assert from "assert";
import * as vscode from "vscode";
import { beforeEach, afterEach } from "mocha";
import { RubyStatus } from "../status";
import { RubyDefinition, RubyChangeEvent, JitType } from "../types";

suite("RubyStatus", () => {
  let status: RubyStatus;
  let changeEmitter: vscode.EventEmitter<RubyChangeEvent>;

  beforeEach(() => {
    changeEmitter = new vscode.EventEmitter<RubyChangeEvent>();
    status = new RubyStatus(changeEmitter.event);
  });

  afterEach(() => {
    status.dispose();
    changeEmitter.dispose();
  });

  test("Status is initialized with the right values", () => {
    assert.strictEqual(status.item.name, "Ruby Environment");
    assert.strictEqual(status.item.severity, vscode.LanguageStatusSeverity.Information);
    assert.strictEqual(status.item.command?.title, "Select");
    assert.strictEqual(status.item.command?.command, "ruby-environments.selectRuby");
  });

  test("Updates when event fires with error", () => {
    const rubyDefinition: RubyDefinition = {
      error: true,
    };
    changeEmitter.fire({ workspace: undefined, ruby: rubyDefinition });

    assert.strictEqual(status.item.text, "Ruby: Error");
    assert.strictEqual(status.item.detail, "Error detecting Ruby environment");
    assert.strictEqual(status.item.severity, vscode.LanguageStatusSeverity.Error);
  });

  test("Updates when event fires with Ruby version", () => {
    const rubyDefinition: RubyDefinition = {
      error: false,
      rubyVersion: "3.3.0",
      availableJITs: [],
      env: {},
      gemPath: [],
    };
    changeEmitter.fire({ workspace: undefined, ruby: rubyDefinition });

    assert.strictEqual(status.item.text, "Ruby 3.3.0");
    assert.strictEqual(status.item.severity, vscode.LanguageStatusSeverity.Information);
  });

  test("Updates when event fires with Ruby version and YJIT", () => {
    const rubyDefinition: RubyDefinition = {
      error: false,
      rubyVersion: "3.3.0",
      availableJITs: [JitType.YJIT],
      env: {},
      gemPath: [],
    };
    changeEmitter.fire({ workspace: undefined, ruby: rubyDefinition });

    assert.strictEqual(status.item.text, "Ruby 3.3.0 (YJIT)");
    assert.strictEqual(status.item.severity, vscode.LanguageStatusSeverity.Information);
  });

  test("Updates when event fires with multiple JITs", () => {
    const rubyDefinition: RubyDefinition = {
      error: false,
      rubyVersion: "3.4.0",
      availableJITs: [JitType.YJIT, JitType.ZJIT],
      env: {},
      gemPath: [],
    };
    changeEmitter.fire({ workspace: undefined, ruby: rubyDefinition });

    assert.strictEqual(status.item.text, "Ruby 3.4.0 (YJIT, ZJIT)");
    assert.strictEqual(status.item.severity, vscode.LanguageStatusSeverity.Information);
  });

  test("Updates correctly when multiple events fire", () => {
    const rubyDefinition1: RubyDefinition = {
      error: false,
      rubyVersion: "3.3.0",
      availableJITs: [JitType.YJIT],
      env: {},
      gemPath: [],
    };
    changeEmitter.fire({ workspace: undefined, ruby: rubyDefinition1 });

    assert.strictEqual(status.item.text, "Ruby 3.3.0 (YJIT)");

    const rubyDefinition2: RubyDefinition = {
      error: false,
      rubyVersion: "3.2.0",
      availableJITs: [],
      env: {},
      gemPath: [],
    };
    changeEmitter.fire({ workspace: undefined, ruby: rubyDefinition2 });

    assert.strictEqual(status.item.text, "Ruby 3.2.0");
  });
});
