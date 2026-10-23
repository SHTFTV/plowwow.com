import { useEffect, useRef } from "react";

export default function CalculatorEmbed() {
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    let observer: ResizeObserver | undefined;
    const resize = () => {
      observer?.disconnect();
      const body = element.contentDocument?.body;
      if (!body) return;
      const update = () => {
        element.style.height = `${Math.ceil(body.getBoundingClientRect().height) + 8}px`;
      };
      observer = new ResizeObserver(update);
      observer.observe(body);
      update();
    };
    element.addEventListener("load", resize);
    if (element.contentDocument?.readyState === "complete") resize();
    return () => {
      observer?.disconnect();
      element.removeEventListener("load", resize);
    };
  }, []);

  return (
    <section className="container max-w-3xl py-6" aria-labelledby="inline-calculator-title">
      <h2 id="inline-calculator-title" className="text-2xl font-black mb-2">Get your snow removal estimate</h2>
      <p className="text-muted-foreground mb-4">Enter your address. See one price for your driveway, sidewalk, walkway and steps.</p>
      <iframe ref={frame} src="/calculator-embed/" title="PlowWow snow removal calculator" className="w-full border-0" style={{ height: 620 }} />
      <p className="text-sm mt-3"><a className="text-primary underline" href="/snow-removal-calculator">Open the full calculator ↗</a></p>
    </section>
  );
}
