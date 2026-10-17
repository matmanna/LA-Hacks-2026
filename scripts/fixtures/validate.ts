// Validates synthetic and benchmark fixtures. Usage: bun run fixtures:validate
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { Bill, Eob, Lever, Tier } from "./contract";

const ROOT = join(import.meta.dirname, "..", "..");
const DIRS = ["data/synthetic/bills", "data/benchmark/botm"];

const ExpectedFlag = z.object({
	lever: Lever,
	tier: Tier,
	lineIds: z.array(z.string()).min(1),
	amountCents: z.number().int().nullable(),
	ruleRef: z.string().optional(),
	requiresCapture: z.string().optional(),
	optional: z.boolean().optional(),
});

const Fixture = z.object({
	fixtureVersion: z.literal(1),
	id: z.string(),
	title: z.string(),
	synthetic: z.boolean(),
	scenario: z.string(),
	bill: Bill,
	eob: Eob.nullable(),
	expected: z.object({
		clean: z.boolean(),
		flags: z.array(ExpectedFlag),
		notes: z.string().optional(),
	}),
	context: z.record(z.string(), z.unknown()).optional(),
});

// Any key ending in "Cents" anywhere in the fixture must be an integer or null.
function nonIntegerMoney(value: unknown, path: string, out: string[]): void {
	if (Array.isArray(value)) {
		for (const [i, v] of value.entries())
			nonIntegerMoney(v, `${path}[${i}]`, out);
	} else if (value && typeof value === "object") {
		for (const [k, v] of Object.entries(value)) {
			const p = path ? `${path}.${k}` : k;
			if (k.endsWith("Cents") && v !== null && !Number.isInteger(v))
				out.push(p);
			nonIntegerMoney(v, p, out);
		}
	}
}

function check(file: string): string[] {
	const errors: string[] = [];
	const raw: unknown = JSON.parse(readFileSync(file, "utf8"));

	const money: string[] = [];
	nonIntegerMoney(raw, "", money);
	for (const p of money) errors.push(`money not an integer: ${p}`);

	const parsed = Fixture.safeParse(raw);
	if (!parsed.success) {
		for (const issue of parsed.error.issues) {
			errors.push(`${issue.path.join(".")}: ${issue.message}`);
		}
		return errors;
	}
	const { bill, expected } = parsed.data;

	const sum = bill.lines.reduce((acc, l) => acc + l.chargeCents, 0);
	if (sum !== bill.totals.chargesCents) {
		errors.push(
			`line sum ${sum} != totals.chargesCents ${bill.totals.chargesCents}`,
		);
	}

	const ids = new Set(bill.lines.map((l) => l.id));
	if (ids.size !== bill.lines.length) errors.push("duplicate line ids");
	for (const flag of expected.flags) {
		for (const id of flag.lineIds) {
			if (!ids.has(id))
				errors.push(`expected ${flag.lever} references missing line ${id}`);
		}
	}
	if (expected.clean && expected.flags.length > 0) {
		errors.push("clean fixture has expected flags");
	}
	return errors;
}

let failed = false;
let count = 0;
for (const dir of DIRS) {
	let files: string[];
	try {
		files = readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".json"));
	} catch {
		continue;
	}
	for (const f of files.sort()) {
		count++;
		const errors = check(join(ROOT, dir, f));
		const id = f.replace(/\.json$/, "");
		if (errors.length === 0) {
			console.log(`OK ${id}`);
		} else {
			failed = true;
			console.log(`FAIL ${id}`);
			for (const e of errors) console.log(`  ${e}`);
		}
	}
}
if (count === 0) {
	console.log("No fixtures found");
	failed = true;
}
process.exit(failed ? 1 : 0);
