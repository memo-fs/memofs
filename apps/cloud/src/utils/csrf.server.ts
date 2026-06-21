import { StatusCodes } from "http-status-codes";
import { createCookie } from "react-router";
import { CSRF, CSRFError } from "remix-utils/csrf/server";
import { env } from "./env.server";

const cookie = createCookie("csrf", {
	path: "/",
	httpOnly: true,
	sameSite: "lax",
	secrets: [env.CSRF_TOKEN],
	...(env.NODE_ENV === "production"
		? { domain: "memo.tekbreed.com", secure: true }
		: {}),
});

export const csrf = new CSRF({ cookie, secret: env.CSRF_TOKEN });

export async function validateCSRF(formData: FormData, request: Request) {
	try {
		await csrf.validate(formData, request.headers);
	} catch (error) {
		if (error instanceof CSRFError) {
			throw new Response("Invalid CSRF token", {
				status: StatusCodes.FORBIDDEN,
			});
		}
		throw error;
	}
}
