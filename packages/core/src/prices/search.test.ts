import { describe, expect, it } from "vitest";

import { searchServices } from "./search";
import { SERVICES } from "./services";

const codes = (q: string) => searchServices(q).map((s) => s.code);

describe("searchServices", () => {
  it("finds services by plain words", () => {
    expect(codes("mri back")).toEqual(["72148"]);
    expect(codes("blood test")).toEqual(["85025", "80053"]);
    expect(codes("CT head")).toEqual(["70450"]);
    expect(codes("ER visit")).toEqual(["99284"]);
    expect(codes("emergency")).toEqual(["99284"]);
    expect(codes("lumbar")).toEqual(["72148", "72100"]);
    expect(codes("ultrasound")).toEqual(["76700"]);
    expect(codes("knee")).toEqual(["73721"]);
    expect(codes("chest x-ray")).toEqual(["71046"]);
  });

  it("matches word starts and codes", () => {
    expect(codes("bloo")).toEqual(["85025", "80053"]);
    expect(codes("72148")).toEqual(["72148"]);
    expect(codes("CPT 70450")).toEqual(["70450"]);
  });

  it("ranks a whole-term match before a partial one", () => {
    expect(codes("scan")).toEqual(["72148", "70450", "74177"]);
    expect(codes("ct scan")).toEqual(["70450", "74177"]);
  });

  it("lists everything for an empty query and nothing for an unknown one", () => {
    expect(codes("  ")).toEqual(SERVICES.map((s) => s.code));
    expect(codes("knee replacement")).toEqual([]);
    expect(codes("ekg")).toEqual([]);
  });
});
