import {
	BookingId,
	Discount,
	Price,
	QuotationGenerationRequest,
	QuotationGenerationUseCase,
	QuotationRequest,
	QuotationSignedRequest,
	QuotationSignedUseCase,
	QuotationUseCase,
	Villa,
} from "../Domain/Booking";
import {
	LoginRequest,
	LoginUseCase,
	RecoverPasswordRequest,
	RecoverPasswordUseCase,
	RegistrationRequest,
	RegistrationUseCase,
	SaveProfileRequest,
	SaveProfileUseCase,
	UpdatePasswordRequest,
	UpdatePasswordUseCase,
} from "../Domain/Customer";
import {
	BunPasswordEncoder,
	InMemoryAuthenticationGateway,
	InMemoryBookingRepository,
	InMemoryCustomerRepository,
	InMemoryFileLocator,
	InMemoryMailer,
	InMemoryMessageQueue,
	InMemoryPdfGenerator,
} from "../Infrastructure";

const customerRepository = new InMemoryCustomerRepository();
const bookingRepository = new InMemoryBookingRepository();
const passwordEncoder = new BunPasswordEncoder();
const authGateway = new InMemoryAuthenticationGateway();
const mailer = new InMemoryMailer();
const fileLocator = new InMemoryFileLocator();
const pdfGenerator = new InMemoryPdfGenerator();
const messageQueue = new InMemoryMessageQueue();

const registrationUseCase = new RegistrationUseCase(
	passwordEncoder,
	customerRepository,
	mailer,
);
const loginUseCase = new LoginUseCase(
	customerRepository,
	passwordEncoder,
	authGateway,
);
const saveProfileUseCase = new SaveProfileUseCase(customerRepository);
const recoverPasswordUseCase = new RecoverPasswordUseCase(
	customerRepository,
	mailer,
);
const updatePasswordUseCase = new UpdatePasswordUseCase(
	customerRepository,
	passwordEncoder,
);

const quotationUseCase = new QuotationUseCase(
	authGateway,
	bookingRepository,
	mailer,
	messageQueue,
);
const quotationGenerationUseCase = new QuotationGenerationUseCase(
	bookingRepository,
	pdfGenerator,
	mailer,
);
const quotationSignedUseCase = new QuotationSignedUseCase(
	bookingRepository,
	fileLocator,
	mailer,
	"owner@villa-booking.com",
);

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function errorResponse(message: string, status = 400): Response {
	return jsonResponse({ error: message }, status);
}

async function parseJson(req: Request): Promise<unknown> {
	try {
		return await req.json();
	} catch {
		return null;
	}
}

type RouteHandler = (req: Request) => Promise<Response> | Response;

const routes: Record<string, Record<string, RouteHandler>> = {
	"/api/health": {
		GET: () => jsonResponse({ status: "ok" }),
	},
	"/api/customers/register": {
		POST: async (req) => {
			const body = (await parseJson(req)) as {
				email?: string;
				password?: string;
				phoneNumber?: string;
				firstName?: string;
				lastName?: string;
			} | null;
			if (
				!body?.email ||
				!body?.password ||
				!body?.firstName ||
				!body?.lastName
			) {
				return errorResponse("Missing required fields");
			}
			const request = new RegistrationRequest(
				body.email,
				body.password,
				body.phoneNumber || "",
				body.firstName,
				body.lastName,
			);
			const response = await registrationUseCase.execute(request);
			if (!response.success) {
				return errorResponse(response.errors.join(", "), 400);
			}
			return jsonResponse({ success: true });
		},
	},
	"/api/customers/login": {
		POST: async (req) => {
			const body = (await parseJson(req)) as {
				email?: string;
				password?: string;
			} | null;
			if (!body?.email || !body?.password) {
				return errorResponse("Missing email or password");
			}
			const request = new LoginRequest(body.email, body.password);
			const response = await loginUseCase.execute(request);
			if (!response.success) {
				return errorResponse(response.errors.join(", "), 401);
			}
			return jsonResponse({
				success: true,
				sessionId: response.sessionId,
			});
		},
	},
	"/api/customers/profile": {
		PUT: async (req) => {
			const body = (await parseJson(req)) as {
				email?: string;
				firstName?: string;
				lastName?: string;
				phoneNumber?: string;
				language?: string;
				addressLine1?: string;
				addressLine2?: string;
				addressLine3?: string;
			} | null;
			if (!body?.email) {
				return errorResponse("Missing email");
			}
			const request = new SaveProfileRequest(
				body.email,
				body.firstName,
				body.lastName,
				body.phoneNumber,
				body.language,
				body.addressLine1,
				body.addressLine2,
				body.addressLine3,
			);
			const response = await saveProfileUseCase.execute(request);
			if (!response.success) {
				return errorResponse(response.errors.join(", "), 400);
			}
			return jsonResponse({ success: true });
		},
	},
	"/api/customers/recover-password": {
		POST: async (req) => {
			const body = (await parseJson(req)) as { email?: string } | null;
			if (!body?.email) {
				return errorResponse("Missing email");
			}
			const request = new RecoverPasswordRequest(body.email);
			const response = await recoverPasswordUseCase.execute(request);
			if (!response.success) {
				return errorResponse(response.errors.join(", "), 400);
			}
			return jsonResponse({ success: true });
		},
	},
	"/api/customers/update-password": {
		POST: async (req) => {
			const body = (await parseJson(req)) as {
				token?: string;
				newPassword?: string;
			} | null;
			if (!body?.token || !body?.newPassword) {
				return errorResponse("Missing token or newPassword");
			}
			const request = new UpdatePasswordRequest(body.token, body.newPassword);
			const response = await updatePasswordUseCase.execute(request);
			if (!response.success) {
				return errorResponse(response.errors.join(", "), 400);
			}
			return jsonResponse({ success: true });
		},
	},
	"/api/bookings/quotation": {
		POST: async (req) => {
			const body = (await parseJson(req)) as {
				villaName?: string;
				from?: string;
				to?: string;
				adultsCount?: number;
				childrenCount?: number;
			} | null;
			if (
				!body?.villaName ||
				!body?.from ||
				!body?.to ||
				body?.adultsCount === undefined
			) {
				return errorResponse("Missing required booking fields");
			}
			const villa = Villa.create(
				body.villaName,
				Price.fromEuros(500),
				Price.fromEuros(100),
				[],
				Discount.create(),
			);
			const request = new QuotationRequest(
				villa,
				new Date(body.from),
				new Date(body.to),
				body.adultsCount,
				body.childrenCount || 0,
			);
			const response = await quotationUseCase.execute(request);
			if (!response.success) {
				return errorResponse(response.errors.join(", "), 400);
			}
			return jsonResponse({
				success: true,
				bookingId: response.booking?.id.toString(),
			});
		},
	},
	"/api/bookings/generate-quotation": {
		POST: async (req) => {
			const body = (await parseJson(req)) as { bookingId?: string } | null;
			if (!body?.bookingId) {
				return errorResponse("Missing bookingId");
			}
			const request = new QuotationGenerationRequest(
				BookingId.create(body.bookingId),
			);
			const response = await quotationGenerationUseCase.execute(request);
			if (!response.success) {
				return errorResponse(response.errors.join(", "), 400);
			}
			return jsonResponse({
				success: true,
				filePath: response.file?.location,
			});
		},
	},
	"/api/bookings/sign-quotation": {
		POST: async (req) => {
			const body = (await parseJson(req)) as {
				bookingId?: string;
				signedQuotationFilePath?: string;
			} | null;
			if (!body?.bookingId || !body?.signedQuotationFilePath) {
				return errorResponse("Missing bookingId or signedQuotationFilePath");
			}
			const request = new QuotationSignedRequest(
				BookingId.create(body.bookingId),
				body.signedQuotationFilePath,
			);
			const response = await quotationSignedUseCase.execute(request);
			if (!response.success) {
				return errorResponse(response.errors.join(", "), 400);
			}
			return jsonResponse({ success: true });
		},
	},
};

export function createServer(port = 3000) {
	return Bun.serve({
		port,
		fetch(req) {
			const url = new URL(req.url);
			const path = url.pathname;
			const method = req.method;

			const routeHandlers = routes[path];
			if (routeHandlers) {
				const handler = routeHandlers[method];
				if (handler) {
					return handler(req);
				}
				return errorResponse("Method not allowed", 405);
			}

			return errorResponse("Not found", 404);
		},
	});
}
