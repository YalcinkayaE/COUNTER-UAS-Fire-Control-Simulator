/** Append-only simulation ledger for audit and training. */

export type LedgerKinematics = {
  az: number | null;
  el: number | null;
  rng: number | null;
  v: number | null;
};

export type LedgerEntry = {
  seq: number;
  when: number;
  wall: string;
  what: string;
  action: string;
  outcome: string;
  az: number | null;
  el: number | null;
  rng: number | null;
  v: number | null;
};

const CSV_HEADER = "seq,when,wall,what,action,outcome,az,el,rng,v";

const EMPTY_KIN: LedgerKinematics = { az: null, el: null, rng: null, v: null };

export class Ledger {
  private entries: LedgerEntry[] = [];
  private nextSeq = 1;

  append(
    when: number,
    what: string,
    action: string,
    outcome: string,
    kin: LedgerKinematics = EMPTY_KIN,
  ): LedgerEntry {
    const row: LedgerEntry = {
      seq: this.nextSeq++,
      when,
      wall: new Date().toISOString(),
      what,
      action,
      outcome,
      az: kin.az,
      el: kin.el,
      rng: kin.rng,
      v: kin.v,
    };
    this.entries.push(row);
    return row;
  }

  snapshot(): readonly LedgerEntry[] {
    return this.entries;
  }

  reset(): void {
    this.entries = [];
    this.nextSeq = 1;
  }

  toCsv(): string {
    const lines = [CSV_HEADER];
    for (const row of this.entries) {
      lines.push(
        [
          String(row.seq),
          row.when.toFixed(3),
          csvField(row.wall),
          csvField(row.what),
          csvField(row.action),
          csvField(row.outcome),
          numField(row.az),
          numField(row.el),
          numField(row.rng),
          numField(row.v),
        ].join(","),
      );
    }
    return lines.join("\n") + "\n";
  }

  toJson(): string {
    return JSON.stringify(this.entries, null, 2);
  }
}

function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function numField(value: number | null): string {
  return value === null ? "" : String(value);
}
