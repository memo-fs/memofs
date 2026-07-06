import { Heading, Text } from "react-email";
import { COLORS, emailStyles } from "../constants";
import { PLANS } from "../../../routes/_home/+utils/plans";
import { EmailLayout } from "./index";

const EmailHeading = Heading as any;
const EmailText = Text as any;

export function WaitlistTemplate({ name }: { name?: string }) {
	const greeting = name ? `Hi ${name},` : "Hello,";

	const teamsPlan = PLANS.find((p) => p.name === "Teams");
	const features = teamsPlan?.features.filter((f) => f.included) || [];

	return (
		<EmailLayout previewText="You're on the Memo FS Cloud waitlist!">
			<EmailHeading style={emailStyles.heading}>Welcome to the Waitlist</EmailHeading>
			<EmailText style={emailStyles.paragraph}>{greeting}</EmailText>
			<EmailText style={emailStyles.paragraph}>
				Thanks for joining the Memo FS Cloud waitlist! As we gear up for our OSS
				launch, we're building the ultimate cloud platform for your local-first
				memory.
			</EmailText>
			<EmailText style={{ ...emailStyles.paragraph, fontWeight: "bold" }}>
				What you will get access to:
			</EmailText>

			<table style={tableStyle}>
				<tbody>
					{features.map((feature) => (
						<tr key={feature.text}>
							<td style={tdStyle}>
								<span style={featureDesc}>✦ {feature.text}</span>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			<EmailText style={emailStyles.paragraph}>
				We will onboard users in batches to ensure maximum stability. We'll send
				you an invitation as soon as your spot is ready.
			</EmailText>
			<EmailText
				style={{
					...emailStyles.paragraph,
					fontSize: "14px",
					color: COLORS.muted,
				}}
			>
				If you didn't request this, you can safely unsubscribe or ignore this
				email.
			</EmailText>
		</EmailLayout>
	);
}

const tableStyle: React.CSSProperties = {
	width: "100%",
	borderCollapse: "collapse",
	margin: "16px 0",
};

const tdStyle: React.CSSProperties = {
	padding: "6px 0",
};

const featureDesc: React.CSSProperties = {
	color: COLORS.foreground,
	fontSize: "13px",
	lineHeight: "18px",
};
