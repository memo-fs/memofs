import { SectionHeading } from "~/components/site/terminal";
import { Section } from "~/components/site/visuals";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "~/components/ui/accordion";
import { Card, CardContent } from "~/components/ui/card";
import { FAQ_ITEMS } from "../+utils/landing-content";

/** Frequently asked questions accordion. Copy lives in +utils/landing-content. */
export function FaqSection() {
	return (
		<Section className="py-20">
			<SectionHeading
				align="center"
				eyebrow="FAQ"
				title={<>Frequently asked questions</>}
			/>
			<div className="mt-10 max-w-3xl mx-auto">
				<Card>
					<CardContent>
						<Accordion type="single" collapsible defaultValue="item-0">
							{FAQ_ITEMS.map((item, i) => (
								<AccordionItem key={item.q} value={`item-${i}`}>
									<AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
										{item.q}
									</AccordionTrigger>
									<AccordionContent className="text-sm leading-relaxed text-muted-foreground">
										{item.a}
									</AccordionContent>
								</AccordionItem>
							))}
						</Accordion>
					</CardContent>
				</Card>
			</div>
		</Section>
	);
}
