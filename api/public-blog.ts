import { createRequire } from "node:module";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

const require = createRequire(import.meta.url);

export default function publicBlog(req: IncomingMessage, res: ServerResponse) {
  const { default: handler } = require(resolve(".blog-runtime/handler.cjs"));
  return handler(req, res);
}
