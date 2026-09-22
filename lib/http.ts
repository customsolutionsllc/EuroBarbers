import { NextResponse } from "next/server";

const MAX_JSON_BYTES = 16 * 1024;

type RequestReadResult<T> =
  | { data: T; response?: never }
  | { data?: never; response: NextResponse };

type JsonRequestResult = RequestReadResult<unknown>;
type MultipartRequestResult = RequestReadResult<FormData>;

function originViolationResponse(request: Request) {
  const origin = request.headers.get("origin");
  // Next can normalize its internal URL; Host retains the browser-facing authority.
  const expectedOrigin = new URL(request.url);
  expectedOrigin.host = request.headers.get("host") ?? expectedOrigin.host;
  if (origin && origin !== expectedOrigin.origin) {
    return NextResponse.json({ error: "Cross-origin request denied." }, { status: 403 });
  }
  return null;
}

function mediaTypeOf(contentType: string | null) {
  return contentType?.split(";", 1)[0].trim().toLowerCase() ?? "";
}

async function readBoundedBody(request: Request, maxBytes: number): Promise<RequestReadResult<Uint8Array<ArrayBuffer>>> {
  if (Number(request.headers.get("content-length")) > maxBytes) {
    return {
      response: NextResponse.json({ error: "Request body is too large." }, { status: 413 })
    };
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return { response: NextResponse.json({ error: "Invalid request body." }, { status: 400 }) };
  }

  const chunks: Uint8Array[] = [];
  let bytes = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return {
          response: NextResponse.json({ error: "Request body is too large." }, { status: 413 })
        };
      }
      chunks.push(value);
    }
  } catch {
    return { response: NextResponse.json({ error: "Invalid request body." }, { status: 400 }) };
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { data: body };
}

/** Bound streamed bodies too; Content-Length alone is not a trusted limit. */
export async function readJsonRequest(request: Request): Promise<JsonRequestResult> {
  const originError = originViolationResponse(request);
  if (originError) {
    return { response: originError };
  }

  if (mediaTypeOf(request.headers.get("content-type")) !== "application/json") {
    return { response: NextResponse.json({ error: "Expected application/json." }, { status: 415 }) };
  }

  const body = await readBoundedBody(request, MAX_JSON_BYTES);
  if (body.response) {
    return body;
  }

  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    return { data: JSON.parse(decoder.decode(body.data)) };
  } catch {
    return { response: NextResponse.json({ error: "Invalid JSON." }, { status: 400 }) };
  }
}

/** Reads multipart form-data while enforcing origin, media type, and true streamed size bounds. */
export async function readMultipartRequest(request: Request, maxBytes: number): Promise<MultipartRequestResult> {
  const originError = originViolationResponse(request);
  if (originError) {
    return { response: originError };
  }

  const contentType = request.headers.get("content-type");
  if (mediaTypeOf(contentType) !== "multipart/form-data") {
    return {
      response: NextResponse.json({ error: "Expected multipart/form-data." }, { status: 415 })
    };
  }

  if (!/;\s*boundary=(?:"[^"]+"|[^;]+)/i.test(contentType ?? "")) {
    return {
      response: NextResponse.json({ error: "Invalid multipart form data." }, { status: 400 })
    };
  }

  const body = await readBoundedBody(request, maxBytes);
  if (body.response) {
    return body;
  }

  try {
    const formData = await new Response(body.data, {
      headers: { "content-type": contentType ?? "multipart/form-data" }
    }).formData();
    return { data: formData };
  } catch {
    return {
      response: NextResponse.json({ error: "Invalid multipart form data." }, { status: 400 })
    };
  }
}
