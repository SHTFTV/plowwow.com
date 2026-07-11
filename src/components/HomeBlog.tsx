import { Link } from "react-router-dom";

// Featured posts shown on the home page. Each entry maps to a markdown file
// in src/content/legacy/blog/<slug>.md and a hero image in /public/blog-images.
const FEATURED = [
  {
    slug: "metrotown-burnaby-strata-commercial-snow-removal",
    title: "Metrotown Burnaby",
    blurb:
      "Kingsway towers, Metropolis frontage and transit-heavy sidewalks — 24/7 dispatch, seasonal contracts and pet-safe de-icer before first commute.",
    image: "/blog-images/metrotown-burnaby-strata-commercial-snow-removal.jpg",
    alt: "PlowWow mascot waving beside a plowed Metrotown Burnaby street at blue dawn with snow-dusted towers and transit platforms behind",
  },
  {
    slug: "gastown-vancouver-commercial-snow-removal",
    title: "Gastown Vancouver",
    blurb:
      "Water Street cobblestones, heritage lofts and restaurant frontages — overnight salting, dawn clearing and documented seasonal service.",
    image: "/blog-images/gastown-vancouver-commercial-snow-removal.jpg",
    alt: "PlowWow mascot waving on a plowed Gastown Water Street beside the steam clock and snowy heritage brick storefronts",
  },
  {
    slug: "burke-mountain-coquitlam-strata-snow-removal",
    title: "Burke Mountain",
    blurb:
      "Steep hillside strata roads, freezing-rain risk and school-run driveways — elevation-aware dispatch and fixed winter pricing.",
    image: "/blog-images/burke-mountain-coquitlam-strata-snow-removal.jpg",
    alt: "PlowWow mascot waving above a plowed Burke Mountain hillside road with snowy pines and valley fog below",
  },
  {
    slug: "silver-valley-maple-ridge-strata-snow-removal",
    title: "Silver Valley",
    blurb:
      "Mountain-edge townhome complexes and steep access roads — 24 hour service, seasonal packages and GPS-logged de-icing runs.",
    image: "/blog-images/silver-valley-maple-ridge-strata-snow-removal.jpg",
    alt: "PlowWow mascot waving near a plowed Silver Valley Maple Ridge townhome road with snowy cedars and Golden Ears peaks",
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
