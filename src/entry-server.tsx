import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "./components/ui/tooltip";
import { AppRoutes } from "./App";

export function render(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const sink = new PassThrough();
    const chunks: Buffer[] = [];
    const timeout = setTimeout(() => { stream.abort(); reject(new Error(`Prerender timed out: ${url}`)); }, 20000);
    sink.on("data", chunk => chunks.push(Buffer.from(chunk)));
    sink.on("end", () => { clearTimeout(timeout); client.clear(); resolve(Buffer.concat(chunks).toString("utf8")); });
    sink.on("error", reject);
    const stream = renderToPipeableStream(
      <QueryClientProvider client={client}><TooltipProvider><StaticRouter location={url}><AppRoutes /></StaticRouter></TooltipProvider></QueryClientProvider>,
      { onAllReady() { stream.pipe(sink); }, onError(error) { clearTimeout(timeout); reject(error); } },
    );
  });
}
