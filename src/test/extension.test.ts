import * as assert from "assert";
import { suite, test, beforeEach, afterEach } from "mocha";
import { activate, deactivate } from "../extension";
import { FakeContext, createContext } from "./helpers";
import { RubyEnvironmentsApi } from "../types";

suite("Extension Test Suite", () => {
  suite("activate", () => {
    let context: FakeContext;

    beforeEach(() => {
      context = createContext();
    });

    afterEach(() => {
      context.dispose();
    });

    test("returns an object implementing RubyEnvironmentsApi", () => {
      const api = activate(context);

      // Verify the returned object has the required API methods
      assert.strictEqual(typeof api, "object", "activate should return an object");
      assert.strictEqual(typeof api.activate, "function", "API should have an activate method");
      assert.strictEqual(typeof api.getRuby, "function", "API should have a getRuby method");
    });

    test("returned API conforms to RubyEnvironmentsApi interface", () => {
      const api = activate(context);

      // Type assertion to ensure the return value conforms to the interface
      const typedApi: RubyEnvironmentsApi = api;
      assert.ok(typedApi, "API should conform to RubyEnvironmentsApi interface");
    });
  });

  suite("deactivate", () => {
    test("can be called without errors", () => {
      assert.doesNotThrow(() => {
        deactivate();
      }, "deactivate should not throw errors");
    });
  });
});
