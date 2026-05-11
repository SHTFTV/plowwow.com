import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqs } from "./BurnabySchema";

const BurnabyFAQ = () => (
  <section className="py-20 bg-section-alt" id="faq">
    <div className="container max-w-3xl">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
          Burnaby Snow Removal FAQ
        </h2>
        <p className="text-muted-foreground">
          Answers to what Burnaby residents, strata managers and businesses ask most.
        </p>
      </div>
      <Accordion type="single" collapsible className="bg-card rounded-2xl border border-border px-2">
        {faqs.map((f, i) => (
          <AccordionItem key={f.q} value={`item-${i}`} className="border-border">
            <AccordionTrigger className="text-left font-heading font-bold text-foreground px-4">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground px-4">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export default BurnabyFAQ;
