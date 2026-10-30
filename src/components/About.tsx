import WinterCommitment from "./WinterCommitment";
import crewImage from "@/assets/plowwow-crew.png";
import { Button } from "@/components/ui/button";

const About = () => (
  <>
  <section id="about" className="py-20">
    <div className="container">
      <div className="max-w-3xl mx-auto text-center">
        <figure className="mb-8">
          <img src={crewImage} alt="The PlowWow team outside in the snow wearing branded blue PlowWow hoodies" width={300} height={192} loading="lazy" className="mx-auto w-full max-w-xl rounded-2xl object-contain" />
          <figcaption className="mt-3 text-sm text-muted-foreground">PlowWow crew branding image; not a site-specific service record.</figcaption>
        </figure>
        <h2 className="text-3xl md:text-4xl mb-6 text-foreground">
          Plow Wow Snow Removal Company!
        </h2>
        <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
          Snow clearing, salting and de-icing start with a plan for your property. Discuss seasonal service, booked visits or an on-call enquiry, then review the areas, price and service windows in your written quote. Route availability and the accepted work are confirmed before booking.
        </p>
        <Button asChild size="lg" className="bg-primary hover:bg-primary/90 font-heading font-bold rounded-full text-lg px-8">
          <a href="/quote">Get a Quote</a>
        </Button>
      </div>
    </div>
  </section>
  <WinterCommitment />
  </>
);

export default About;
