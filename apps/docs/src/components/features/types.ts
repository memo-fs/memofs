import type { ComponentType } from "react";

export interface FeatureItem {
	id: string;
	numberLabel: string;
	title: string;
	description: string;
	badge: string;
	isImplemented: boolean;
	diagram: ComponentType<{ className?: string }>;
}
