import * as assert from "assert";
import { ConfiguredRuby, WorkspaceInterface } from "../configuredRuby";

type MockWorkspaceConfiguration = {
  get<T>(section: string, defaultValue?: T): T | undefined;
};

function createMockWorkspace(config: Record<string, unknown>): WorkspaceInterface {
  return {
    getConfiguration: (_section: string) =>
      ({
        get: <T>(key: string, defaultValue?: T): T | undefined => {
          const value = config[key];
          return value !== undefined ? (value as T) : defaultValue;
        },
      }) as MockWorkspaceConfiguration,
  };
}

suite("ConfiguredRuby", () => {
  let versionManager: ConfiguredRuby;

  test("has correct identifier and name", () => {
    const mockWorkspace = createMockWorkspace({});
    versionManager = new ConfiguredRuby(mockWorkspace);

    assert.strictEqual(versionManager.identifier, "configured");
    assert.strictEqual(versionManager.name, "Configured Ruby");
  });

  test("returns null when no configuration is set", () => {
    const mockWorkspace = createMockWorkspace({});
    versionManager = new ConfiguredRuby(mockWorkspace);

    const result = versionManager.getRubyDefinition();

    assert.strictEqual(result, null);
  });

  test("returns Ruby definition when version is configured", () => {
    const mockWorkspace = createMockWorkspace({
      rubyVersion: "3.3.0",
    });
    versionManager = new ConfiguredRuby(mockWorkspace);

    const result = versionManager.getRubyDefinition();

    assert.ok(result, "Should return a RubyDefinition");
    assert.strictEqual(result.error, false);
    assert.strictEqual(result.rubyVersion, "3.3.0");
    assert.deepStrictEqual(result.availableJITs, []);
  });

  test("returns Ruby definition with required fields", () => {
    const mockWorkspace = createMockWorkspace({
      rubyVersion: "3.2.0",
    });
    versionManager = new ConfiguredRuby(mockWorkspace);

    const result = versionManager.getRubyDefinition();

    assert.ok(result, "Should return a RubyDefinition");
    assert.strictEqual(result.error, false);
    assert.strictEqual(result.rubyVersion, "3.2.0");
    assert.deepStrictEqual(result.availableJITs, []);
    assert.deepStrictEqual(result.env, {});
    assert.deepStrictEqual(result.gemPath, []);
  });

  test("returns null when version is empty string", () => {
    const mockWorkspace = createMockWorkspace({
      rubyVersion: "",
    });
    versionManager = new ConfiguredRuby(mockWorkspace);

    const result = versionManager.getRubyDefinition();

    assert.strictEqual(result, null);
  });
});
