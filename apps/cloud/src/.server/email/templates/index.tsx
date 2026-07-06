import { Body, Container, Head, Hr, Html, Preview, Text } from "react-email";
import { emailStyles } from "../constants";

const EmailHtml = Html as any;
const EmailHead = Head as any;
const EmailPreview = Preview as any;
const EmailBody = Body as any;
const EmailContainer = Container as any;
const EmailHr = Hr as any;
const EmailText = Text as any;

export function EmailLayout({
	previewText,
	children,
}: {
	previewText: string;
	children: React.ReactNode;
}) {
	return (
		<EmailHtml>
			<EmailHead />
			<EmailPreview>{previewText}</EmailPreview>
			<EmailBody style={emailStyles.body}>
				<EmailContainer style={emailStyles.container}>
					{children}
					<EmailHr style={emailStyles.hr} />
					<EmailText style={emailStyles.footer}>Memo FS Cloud</EmailText>
				</EmailContainer>
			</EmailBody>
		</EmailHtml>
	);
}
