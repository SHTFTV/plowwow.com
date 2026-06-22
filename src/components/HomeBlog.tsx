import { Link } from "react-router-dom";

// Featured posts shown on the home page. Each entry maps to a markdown file
// in src/content/legacy/blog/<slug>.md and a hero image in /public/blog-images.
const FEATURED = [
  {
    slug: "brentwood-burnaby-strata-snow-removal",
    title: "Brentwood Burnaby Strata Snow Removal",
    blurb:
      "Mid-rise condos, townhomes, and mixed-use buildings near Brentwood Town Centre — auto-dispatch, fixed seasonal pricing, full photo + GPS logs.",
    image: "/blog-images/brentwood-burnaby-strata-snow-removal.jpg",
    alt: "PlowWow plow truck clearing a Brentwood Burnaby strata townhome complex at dawn",
  },
  {
    slug: "capitol-hill-burnaby-commercial-snow-removal",
    title: "Capitol Hill Burnaby Commercial Snow Removal",
    blurb:
      "Hastings Heights retail and office lots cleared and salted before open. Elevation-tuned dispatch — when the hill gets snow, the trucks roll.",
    image: "/blog-images/capitol-hill-burnaby-commercial-snow-removal.jpg",
    alt: "Skid-steer clearing a Capitol Hill Burnaby commercial parking lot at sunrise",
  },
  {
    slug: "westwood-plateau-coquitlam-parking-lot-snow-removal",
    title: "Westwood Plateau Coquitlam Parking Lots",
    blurb:
      "The Plateau gets 2x the snow of the rest of Metro Vancouver. Our parking lot program is built for that elevation — fixed pricing, hauling included.",
    image: "/blog-images/westwood-plateau-coquitlam-parking-lot-snow-removal.jpg",
    alt: "PlowWow plow truck clearing a large Westwood Plateau Coquitlam parking lot in heavy snow",
  },
  {
    slug: "austin-heights-coquitlam-strip-mall-snow-removal",
    title: "Austin Heights Coquitlam Strip Malls",
    blurb:
      "Pre-open lot clearing, salted storefront sidewalks, and rear loading access — guaranteed completion windows for every Austin Avenue tenant.",
    image: "/blog-images/austin-heights-coquitlam-strip-mall-snow-removal.jpg",
    alt: "Cleared and salted strip mall storefront sidewalk in Austin Heights Coquitlam at dawn",
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
