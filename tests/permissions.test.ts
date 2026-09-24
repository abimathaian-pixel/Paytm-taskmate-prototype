import { describe, it, expect } from "vitest";
import { verifyTaskScope, PermissionError } from "./packages/tools/src/permissions.js";
import { TaskScope } from "./packages/shared/src/index.js";

describe("Least Privilege Scope Enforcement", () => {
  it("allows tool call when required scope is present", () => {
    const grantedScopes: TaskScope[] = ["READ_BILLS", "READ_TRANSACTIONS"];
    expect(() => verifyTaskScope(grantedScopes, "READ_BILLS")).not.toThrow();
  });

  it("throws PermissionError when required scope is missing", () => {
    const grantedScopes: TaskScope[] = ["READ_BILLS"];
    expect(() => verifyTaskScope(grantedScopes, "INITIATE_PAYMENT")).toThrow(
      PermissionError
    );
  });
});
