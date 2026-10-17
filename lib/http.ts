import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { log, type Logger } from "@/lib/log";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, code = "bad_request") => new HttpError(400, code, message);
export const unauthorized = (message = "Please sign in.") => new HttpError(401, "unauthorized", message);
export const forbidden = (message = "You can't do that in this circle.") => new HttpError(403, "forbidden", message);
export const notFound = (message = "Not found.") => new HttpError(404, "not_found", message);
export const conflict = (message: string, code = "conflict") => new HttpError(409, code, message);

export function errorResponse(status: number, code: string, message: string, requestId?: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: requestId ? { "x-request-id": requestId } : undefined },
  );
}

type Ctx<P> = { params: Promise<P> };
type Handler<P> = (req: NextRequest, ctx: { params: P; log: Logger; requestId: string }) => Promise<Response>;

/** Wraps a route handler: request id, structured logs, error envelope, no stack traces leaked. */
export function route<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: NextRequest, ctx: Ctx<P>): Promise<Response> => {
    const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
    const reqLog = log.child({ requestId, method: req.method, path: req.nextUrl.pathname });
    const started = Date.now();
    try {
      const params = ((await ctx?.params) ?? {}) as P;
      const res = await handler(req, { params, log: reqLog, requestId });
      reqLog.info("request", { status: res.status, ms: Date.now() - started });
      res.headers.set("x-request-id", requestId);
      return res;
    } catch (err) {
      if (err instanceof HttpError) {
        reqLog.info("request", { status: err.status, code: err.code, ms: Date.now() - started });
        return errorResponse(err.status, err.code, err.message, requestId);
      }
      if (err instanceof ZodError) {
        reqLog.info("request", { status: 400, code: "invalid_input", ms: Date.now() - started });
        // Messages are written for people; the field path goes to the logs, not the UI.
        const first = err.issues[0];
        reqLog.info("invalid input", { path: first?.path.join("."), issue: first?.message });
        return errorResponse(400, "invalid_input", first?.message ?? "Invalid input.", requestId);
      }
      reqLog.error("unhandled error", { error: err instanceof Error ? err.message : String(err), ms: Date.now() - started });
      return errorResponse(500, "internal", "Something went wrong. Please try again.", requestId);
    }
  };
}

/** Parse JSON body (or form data) against a zod schema. */
export async function readBody<T>(req: NextRequest, schema: { parse: (v: unknown) => T }): Promise<T> {
  const type = req.headers.get("content-type") ?? "";
  let data: unknown;
  if (type.includes("application/json")) {
    data = await req.json().catch(() => {
      throw badRequest("Body must be valid JSON.");
    });
  } else {
    const form = await req.formData();
    data = Object.fromEntries(form.entries());
  }
  return schema.parse(data);
}
