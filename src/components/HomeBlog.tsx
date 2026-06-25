import { Link } from "react-router-dom";

// Featured posts shown on the home page. Each entry maps to a markdown file
// in src/content/legacy/blog/<slug>.md and a hero image in /public/blog-images.
const FEATURED = [
  {
    slug: "shaughnessy-vancouver-snow-removal",
    title: "Shaughnessy Vancouver",
    blurb:
      "Heritage estates on The Crescent and Angus Drive — long sloped driveways, salt-safe chemistry for sandstone and bronze, 4:00 AM dispatch.",
    image: "/blog-images/shaughnessy-vancouver-snow-removal.jpg",
    alt: "PlowWow mascot waving on a freshly plowed tree-lined Shaughnessy boulevard at blue dawn with snow-dusted heritage mansions",
  },
  {
    slug: "dunbar-vancouver-snow-removal",
    title: "Dunbar Vancouver",
    blurb:
      "Character craftsman homes, West 41st storefronts, and Southlands-adjacent estates — pet-safe granules, traction sand on stone stairs.",
    image: "/blog-images/dunbar-vancouver-snow-removal.jpg",
    alt: "PlowWow mascot waving on a salted Dunbar Vancouver street at blue dawn with character craftsman homes and West 41st storefronts in the distance",
  },
  {
    slug: "point-grey-vancouver-snow-removal",
    title: "Point Grey Vancouver",
    blurb:
      "NW Marine Drive cliff-edge estates, UBC-corridor strata, and Sasamat Village retail — drift-mapped routes and unlimited reapplication passes.",
    image: "/blog-images/point-grey-vancouver-snow-removal.jpg",
    alt: "PlowWow mascot waving on a plowed Point Grey street with English Bay and the North Shore mountains in the distance and modernist cliff-edge homes nearby",
  },
  {
    slug: "oakridge-vancouver-snow-removal",
    title: "Oakridge Vancouver",
    blurb:
      "Cambie corridor strata towers, Oakridge Centre retail, and Canada Line frontages cleared and salted before the first commute.",
    image: "/blog-images/oakridge-vancouver-snow-removal.jpg",
    alt: "PlowWow mascot waving in front of a freshly plowed Oakridge low-rise strata driveway at blue hour with snow-dusted evergreens",
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
