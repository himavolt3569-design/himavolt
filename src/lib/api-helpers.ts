import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

/**
 * Generic type-safe API route handler with:
 *  - try / catch wrapping (never leaks stack traces)
 *  - Zod body parsing (optional)
 *  - Consistent JSON error shape
 */

type ApiContext = { params: Promise<Record<string, string>> };

type HandlerFn<T = unknown> = (
  req: NextRequest,
  ctx: ApiContext & { body: T },
) => Promise<NextResponse>;

interface SafeHandlerOptions<T> {
  /** Zod schema to validate request JSON body (POST / PATCH / PUT). */
  schema?: ZodSchema<T>;
}

export function safeHandler<T = unknown>(
  handler: HandlerFn<T>,
  options?: SafeHandlerOptions<T>,
) {
  return async (req: NextRequest, ctx: ApiContext) => {
    try {
      let body: T = undefined as T;

      if (options?.schema && ["POST", "PATCH", "PUT"].includes(req.method)) {
        const raw = await req.json();
        const parsed = options.schema.safeParse(raw);

        if (!parsed.success) {
          return NextResponse.json(
            {
              error: "Validation failed",
              issues: parsed.error.flatten().fieldErrors,
            },
            { status: 400 },
          );
        }
        body = parsed.data;
      }

      return await handler(req, { ...ctx, body });
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", issues: err.flatten().fieldErrors },
          { status: 400 },
        );
      }

      console.error(`[API ${req.method} ${req.nextUrl.pathname}]`, err);

      // Never leak internal details in production
      const message =
        process.env.NODE_ENV === "development" && err instanceof Error
          ? err.message
          : "Internal server error";

      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

/** Shortcut: return 401 JSON response */
export function unauthorized(msg = "Unauthorized") {
  return NextResponse.json({ error: msg }, { status: 401 });
}

/** Shortcut: return 403 JSON response */
export function forbidden(msg = "Forbidden") {
  return NextResponse.json({ error: msg }, { status: 403 });
}

/** Shortcut: return 404 JSON response */
export function notFound(msg = "Not found") {
  return NextResponse.json({ error: msg }, { status: 404 });
}
