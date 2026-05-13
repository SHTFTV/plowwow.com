import { Link } from "react-router-dom";

// Featured posts shown on the home page. Each entry maps to a markdown file
// in src/content/legacy/blog/<slug>.md and a hero image in /public/blog-images.
const FEATURED = [
  {
    slug: "lynn-valley-snow-removal",
    title: "Lynn Valley Snow Removal",
    blurb:
      "How PlowWow handles the North Shore snow belt — from Mountain Highway to Upper Lynn — when the rain–snow line drops.",
    image: "/blog-images/lynn-valley-snow-removal.jpg",
    alt: "Snowy Lynn Valley street at dawn with North Shore mountains behind",
  },
  {
    slug: "steveston-snow-removal",
    title: "Steveston Snow Removal",
    blurb:
      "Coastal South Richmond snow events are rare but disruptive. Here's how we keep Steveston Village and Imperial Landing moving.",
    image: "/blog-images/steveston-snow-removal.jpg",
    alt: "Light snow on Steveston Village street with fishing boats in the harbor",
  },
  {
    slug: "fort-langley-snow-removal",
    title: "Fort Langley Snow Removal",
    blurb:
      "Heritage Glover Road, Bedford Landing, and Walnut Grove east — careful, low-impact snow & de-icing for the historic village.",
    image: "/blog-images/fort-langley-snow-removal.jpg",
    alt: "Historic Fort Langley main street under fresh snow at dusk",
  },
  {
    slug: "cloverdale-snow-removal",
    title: "Cloverdale Snow Removal",
    blurb:
      "Cloverdale, Clayton Heights, and Pacific Douglas get the brunt of Fraser Valley outflow. PlowWow plows, salts, and reports 24/7.",
    image: "/blog-images/cloverdale-snow-removal.jpg",
    alt: "Cloverdale Surrey commercial plaza freshly plowed at sunrise",
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
