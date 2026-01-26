import * as assert from "assert";
import { suite, test } from "mocha";
import { deactivate } from "../extension";

suite("Extension Test Suite", () => {
  suite("deactivate", () => {
    test("can be called without errors", () => {
      assert.doesNotThrow(() => {
        deactivate();
      }, "deactivate should not throw errors");
    });
  });
});
