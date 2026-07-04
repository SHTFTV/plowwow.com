import { Link } from "react-router-dom";

// Featured posts shown on the home page. Each entry maps to a markdown file
// in src/content/legacy/blog/<slug>.md and a hero image in /public/blog-images.
const FEATURED = [
  {
    slug: "west-end-vancouver-snow-removal",
    title: "West End Vancouver",
    blurb:
      "Davie, Denman and Robson strata towers, English Bay commercial — 24/7 dispatch, pet-safe de-icer, pre-dawn parkade-ramp completion.",
    image: "/blog-images/west-end-vancouver-snow-removal.jpg",
    alt: "PlowWow mascot waving on a freshly plowed Davie Street at blue dawn with snow-dusted West End towers and English Bay in the distance",
  },
  {
    slug: "yaletown-vancouver-snow-removal",
    title: "Yaletown Vancouver",
    blurb:
      "Mainland Street heritage-brick sidewalks, restaurant patios, loft strata and False Creek commercial — rubber-edge blades and dawn service.",
    image: "/blog-images/yaletown-vancouver-snow-removal.jpg",
    alt: "PlowWow mascot waving on a plowed Mainland Street at blue dawn with snow-dusted heritage brick warehouses and False Creek in the distance",
  },
  {
    slug: "coal-harbour-vancouver-snow-removal",
    title: "Coal Harbour Vancouver",
    blurb:
      "Luxury waterfront strata, Cordova and Hastings towers, marina walkways — concierge-coordinated dispatch and pre-dawn completion window.",
    image: "/blog-images/coal-harbour-vancouver-snow-removal.jpg",
    alt: "PlowWow mascot waving on a plowed Coal Harbour waterfront promenade at blue dawn with luxury towers, seaplanes and snow-capped North Shore mountains",
  },
  {
    slug: "commercial-drive-vancouver-snow-removal",
    title: "Commercial Drive",
    blurb:
      "The Drive retail, Italian cafes, Grandview-Woodland strata — 6:15 AM pre-open completion, unlimited salt runs, pet-safe granules.",
    image: "/blog-images/commercial-drive-vancouver-snow-removal.jpg",
    alt: "PlowWow mascot waving on a plowed Commercial Drive at blue dawn with snow-dusted Italian cafes, indie storefronts and string lights",
  },
];


const HomeBlog = () => (
  <section className="py-16 md:py-24 bg-muted/30" aria-labelledby="home-blog-heading">
    <div className="container">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 md:mb-14">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-widest text-primary font-bold mb-3">
            From the PlowWow Blog
          </p>
          <h2
            id="home-blog-heading"
            className="text-3xl md:text-5xl font-black text-foreground leading-tight"
          >
            Local snow & ice insights from across Greater Vancouver
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Neighborhood-specific guides on bylaws, response times, pricing, and how
            PlowWow keeps strata, commercial, and residential properties safe all winter.
          </p>
        </div>
        <Link
          to="/blog"
          className="self-start md:self-auto inline-flex items-center text-sm font-semibold text-primary hover:underline"
        >
          View all posts →
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURED.map((p) => (
          <Link
            key={p.slug}
            to={`/${p.slug}`}
            className="group flex flex-col rounded-2xl overflow-hidden border border-border bg-card hover:border-primary/50 hover:shadow-lg transition"
          >
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              <img
                src={p.image}
                alt={p.alt}
                title={p.title}
                loading="lazy"
                width={1280}
                height={720}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
            </div>
            <div className="p-5 flex flex-col flex-1">
              <h3 className="text-lg font-bold text-foreground leading-snug">
                {p.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground flex-1">{p.blurb}</p>
              <span className="mt-4 text-sm font-semibold text-primary group-hover:underline">
                Read more →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default HomeBlog;
