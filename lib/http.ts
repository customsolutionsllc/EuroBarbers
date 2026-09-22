import { NextResponse } from "next/server";

const MAX_JSON_BYTES = 16 * 1024;

type JsonRequestResult =
  | { data: unknown; response?: never }
  | { data?: never; response: NextResponse };

/** Bound streamed bodies too; Content-Length alone is not a trusted limit. */
export async function readJsonRequest(request: Request): Promise<JsonRequestResult> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return { response: NextResponse.json({ error: "Cross-origin request denied." }, { status: 403 }) };
  }
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return { response: NextResponse.json({ error: "Expected application/json." }, { status: 415 }) };
  }
  const tooLarge = () => ({
    response: NextResponse.json({ error: "Request body is too large." }, { status: 413 })
  });
  if (Number(request.headers.get("content-length")) > MAX_JSON_BYTES) {
    return tooLarge();
  }
  const reader = request.body?.getReader();
  if (!reader) {
    return { response: NextResponse.json({ error: "Invalid JSON." }, { status: 400 }) };
  }
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let bytes = 0;
    let text = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_JSON_BYTES) {
        await reader.cancel();
        return tooLarge();
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { data: JSON.parse(text) };
  } catch {
    return { response: NextResponse.json({ error: "Invalid JSON." }, { status: 400 }) };
  } finally {
    reader.releaseLock();
  }
}
