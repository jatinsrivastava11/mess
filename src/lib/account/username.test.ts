import { describe, expect, it } from "vitest";
import { passwordProblem, usernameKey, usernameProblem } from "./username";

describe("usernames", () => {
  it("accepts 3–16 letters, numbers and underscores", () => {
    expect(usernameProblem("jatin_11")).toBeNull();
    expect(usernameProblem("abc")).toBeNull();
    expect(usernameProblem("ab")).not.toBeNull();
    expect(usernameProblem("a".repeat(17))).not.toBeNull();
    expect(usernameProblem("no spaces")).not.toBeNull();
    expect(usernameProblem("émile")).not.toBeNull();
    expect(usernameProblem("<script>")).not.toBeNull();
  });

  it("blocks reserved names in any case", () => {
    expect(usernameProblem("Admin")).toMatch(/reserved/);
    expect(usernameProblem("MESS")).toMatch(/reserved/);
  });

  it("is unique ignoring case", () => {
    expect(usernameKey(" Jatin_11 ")).toBe(usernameKey("jatin_11"));
  });
});

describe("passwords", () => {
  it("needs 8+ characters with a letter and a number", () => {
    expect(passwordProblem("short1")).not.toBeNull();
    expect(passwordProblem("onlyletters")).not.toBeNull();
    expect(passwordProblem("12345678")).not.toBeNull();
    expect(passwordProblem("maths4chess")).toBeNull();
  });
});
