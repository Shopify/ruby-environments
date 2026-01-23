import * as assert from "assert";
import * as vscode from "vscode";
import { afterEach } from "mocha";
import { RubyStatus } from "../status";
import { RubyDefinition, JitType } from "../types";

suite("RubyStatus", () => {
  let status: RubyStatus;

  afterEach(() => {
    status.dispose();
  });

  test("Status is initialized with the right values", () => {
    status = new RubyStatus();

    assert.strictEqual(status.item.name, "Ruby Environment");
    assert.strictEqual(status.item.severity, vscode.LanguageStatusSeverity.Information);
  });

  test("Refresh with null displays not detected", () => {
    status = new RubyStatus();
    status.refresh(null);

    assert.strictEqual(status.item.text, "Ruby: Not detected");
    assert.strictEqual(status.item.detail, "No Ruby environment detected");
    assert.strictEqual(status.item.severity, vscode.LanguageStatusSeverity.Warning);
  });

  test("Refresh with error displays error state", () => {
    status = new RubyStatus();
    const rubyDefinition: RubyDefinition = {
      error: true,
    };
    status.refresh(rubyDefinition);

    assert.strictEqual(status.item.text, "Ruby: Error");
    assert.strictEqual(status.item.detail, "Error detecting Ruby environment");
    assert.strictEqual(status.item.severity, vscode.LanguageStatusSeverity.Error);
  });

  test("Refresh with Ruby version displays version", () => {
    status = new RubyStatus();
    const rubyDefinition: RubyDefinition = {
      error: false,
      rubyVersion: "3.3.0",
      availableJITs: [],
      env: {},
      gemPath: [],
    };
    status.refresh(rubyDefinition);

    assert.strictEqual(status.item.text, "Ruby 3.3.0");
    assert.strictEqual(status.item.severity, vscode.LanguageStatusSeverity.Information);
  });

  test("Refresh with Ruby version and YJIT displays both", () => {
    status = new RubyStatus();
    const rubyDefinition: RubyDefinition = {
      error: false,
      rubyVersion: "3.3.0",
      availableJITs: [JitType.YJIT],
      env: {},
      gemPath: [],
    };
    status.refresh(rubyDefinition);

    assert.strictEqual(status.item.text, "Ruby 3.3.0 (YJIT)");
    assert.strictEqual(status.item.severity, vscode.LanguageStatusSeverity.Information);
  });

  test("Refresh with multiple JITs displays all", () => {
    status = new RubyStatus();
    const rubyDefinition: RubyDefinition = {
      error: false,
      rubyVersion: "3.4.0",
      availableJITs: [JitType.YJIT, JitType.ZJIT],
      env: {},
      gemPath: [],
    };
    status.refresh(rubyDefinition);

    assert.strictEqual(status.item.text, "Ruby 3.4.0 (YJIT, ZJIT)");
    assert.strictEqual(status.item.severity, vscode.LanguageStatusSeverity.Information);
  });

  test("Refresh updates existing status", () => {
    status = new RubyStatus();
    const rubyDefinition1: RubyDefinition = {
      error: false,
      rubyVersion: "3.3.0",
      availableJITs: [JitType.YJIT],
      env: {},
      gemPath: [],
    };
    status.refresh(rubyDefinition1);

    assert.strictEqual(status.item.text, "Ruby 3.3.0 (YJIT)");

    const rubyDefinition2: RubyDefinition = {
      error: false,
      rubyVersion: "3.2.0",
      availableJITs: [],
      env: {},
      gemPath: [],
    };
    status.refresh(rubyDefinition2);

    assert.strictEqual(status.item.text, "Ruby 3.2.0");
  });
});
