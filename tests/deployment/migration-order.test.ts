import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Prisma migration release ordering", () => {
  it("keeps timestamped base, booking, and security migrations in lexical apply order", () => {
    const folders = readdirSync(join(process.cwd(), "prisma/migrations"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => name !== "migration_lock.toml");

    expect(folders).toEqual([
      "20261010120000_backend_initial",
      "20261011120000_smart_booking",
      "20261011150000_security_layer",
    ]);
    expect(folders).toEqual([...folders].sort());
  });
});
