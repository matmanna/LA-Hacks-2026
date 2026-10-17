import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	return (
		<main className="px-5 py-16">
			<h1 className="font-serif text-[40px] leading-[44px]">
				Your hospital bill, checked line by line.
			</h1>
			<p className="mt-4 text-muted-foreground">Tokens check.</p>
			<div className="mt-6 inline-flex rounded-2xl bg-ink p-5 font-serif text-[48px] text-mint tabular-nums">
				$10,216
			</div>
		</main>
	);
}
