import { describe, expect, test } from "vitest";
import { Ledger } from "./ledger";

describe("Ledger", () => {
  test("records what, when, action, and outcome in append order", () => {
    const log = new Ledger();
    log.append(1.5, "T14", "FIRE AUTO", "RELEASED");
    log.append(1.92, "T14", "INTERCEPT", "HIT");
    const rows = log.snapshot();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      seq: 1,
      when: 1.5,
      what: "T14",
      action: "FIRE AUTO",
      outcome: "RELEASED",
    });
    expect(rows[1]).toMatchObject({
      seq: 2,
      when: 1.92,
      what: "T14",
      action: "INTERCEPT",
      outcome: "HIT",
    });
    expect(rows[0].wall).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("toCsv has a header and one data row per entry", () => {
    const log = new Ledger();
    log.append(0, "WAVE 01", "ENGAGE", "WEAPONS FREE");
    const csv = log.toCsv();
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("seq,when,wall,what,action,outcome");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("WAVE 01");
    expect(lines[1]).toContain("ENGAGE");
    expect(lines[1]).toContain("WEAPONS FREE");
  });

  test("toJson is a parseable array of entries", () => {
    const log = new Ledger();
    log.append(4, "T02", "BREACH", "500 m");
    const parsed = JSON.parse(log.toJson()) as { what: string; action: string; outcome: string }[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ what: "T02", action: "BREACH", outcome: "500 m" });
  });

  test("reset clears entries and restarts sequence numbers", () => {
    const log = new Ledger();
    log.append(1, "WAVE 01", "ENGAGE", "WEAPONS FREE");
    log.reset();
    expect(log.snapshot()).toHaveLength(0);
    log.append(0, "WAVE 01", "ENGAGE", "WEAPONS FREE");
    expect(log.snapshot()[0]?.seq).toBe(1);
  });

  test("escapes quotes in CSV fields", () => {
    const log = new Ledger();
    log.append(0, 'T01 "FW"', "FIRE AUTO", 'HIT, close');
    const line = log.toCsv().trim().split("\n")[1];
    expect(line).toContain('"T01 ""FW"""');
    expect(line).toContain('"HIT, close"');
  });
});
