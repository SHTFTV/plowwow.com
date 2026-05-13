import snowClearing from "@/assets/snow-clearing.jpg";
import snowPlowing from "@/assets/snow-plowing.jpg";
import salting from "@/assets/salting.jpg";
import snowRelocation from "@/assets/snow-relocation.jpg";

const services = [
  {
    title: "Snow Clearing",
    description: "Clearing Snow with Priority Service Makes For The Best Safety",
    image: snowClearing,
    alt: "PlowWow branded Ford F-350 snow plow truck with yellow salt spreader parked at the warehouse, ready for priority snow clearing service in BC",
  },
  {
    title: "Snow Plowing",
    description: "24/7 Snow Plowing and Snow Removal — We Put The Wow in Plow",
    image: snowPlowing,
    alt: "PlowWow snow plow truck and ATV plow on display at a snow industry tradeshow with the PlowWow.com mascot banner overhead",
  },
  {
    title: "Salting and Sanding",
    description: "Making Slip Free Surfaces is What We Do Best. Keeping Accurate Records",
    image: salting,
    alt: "PlowWow mascot in an orange safety vest pushing a stainless steel walk-behind salt spreader on a cleared residential sidewalk",
  },
  {
    title: "Snow Relocation",
    description: "When Snow Events Happen, Snow Relocation Might Be An Option",
    image: snowRelocation,
    alt: "PlowWow-wrapped skid steer loader with snowflake graphics relocating large snow piles at a commercial loading dock",
  },
];

const Services = () => (
  <section id="services" className="py-20 bg-section-alt">
    <div className="container">
      <h2 className="text-3xl md:text-4xl text-center mb-4 text-foreground">
        Your trusted source for expert snow removal
      </h2>
      <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
        Professional snow and ice management for residential and commercial properties across Greater BC.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {services.map((service) => (
          <div
            key={service.title}
            className="bg-card rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow group"
          >
            <figure className="relative overflow-hidden h-48">
              <img
                src={service.image}
                alt={service.alt}
                loading="lazy"
                width={640}
                height={640}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent text-white text-xs px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {service.alt}
              </figcaption>
            </figure>
            <div className="p-5">
              <h3 className="text-lg font-bold text-foreground mb-2">{service.title}</h3>
              <p className="text-muted-foreground text-sm">{service.description}</p>
              <a href="#contact" className="text-primary font-semibold text-sm mt-3 inline-block hover:underline">
                Read more →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Services;
