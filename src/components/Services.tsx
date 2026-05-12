import snowClearing from "@/assets/snow-clearing.jpg";
import snowPlowing from "@/assets/snow-plowing.jpg";
import salting from "@/assets/salting.jpg";
import snowRelocation from "@/assets/snow-relocation.jpg";

const services = [
  {
    title: "Snow Clearing",
    description: "Clearing Snow with Priority Service Makes For The Best Safety",
    image: snowClearing,
    alt: "Crew shoveling and clearing fresh snow from a residential walkway in BC",
  },
  {
    title: "Snow Plowing",
    description: "24/7 Snow Plowing and Snow Removal — We Put The Wow in Plow",
    image: snowPlowing,
    alt: "Snow plow truck clearing a commercial parking lot during a winter storm",
  },
  {
    title: "Salting and Sanding",
    description: "Making Slip Free Surfaces is What We Do Best. Keeping Accurate Records",
    image: salting,
    alt: "Worker spreading de-icing salt and sand on an icy sidewalk for slip-free traction",
  },
  {
    title: "Snow Relocation",
    description: "When Snow Events Happen, Snow Relocation Might Be An Option",
    image: snowRelocation,
    alt: "Heavy equipment loading and hauling away large piles of snow after a major snowfall",
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
            <div className="overflow-hidden h-48">
              <img
                src={service.image}
                alt={service.title}
                loading="lazy"
                width={640}
                height={640}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
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
