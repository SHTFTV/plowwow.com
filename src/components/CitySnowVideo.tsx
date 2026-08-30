type CitySnowVideoProps = { cityName: string; poster: string };

export default function CitySnowVideo({ cityName, poster }: CitySnowVideoProps) {
  return (
    <section className="bg-[#081d35] py-16 text-white" aria-labelledby="city-snow-video-title">
      <div className="container grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-secondary">PlowWow on the ground</p>
          <h2 id="city-snow-video-title" className="mb-5 text-3xl font-black md:text-4xl">Snow Removal in {cityName}, the PlowWow Way</h2>
          <p className="mb-4 text-lg leading-relaxed text-white/85">Watch our short field-operations film, then explore the local routes, equipment and service plan PlowWow uses to keep {cityName} strata, commercial and residential properties moving through winter weather.</p>
          <p className="text-sm leading-relaxed text-white/60">Video summary: a 10-second PlowWow snow-removal brand film showing professional winter-service readiness, branded equipment and a coordinated response built for Lower Mainland storms.</p>
        </div>
        <figure className="overflow-hidden rounded-3xl border border-white/15 bg-black shadow-2xl">
          <video className="aspect-video w-full object-cover" controls playsInline preload="metadata" poster={poster} aria-label={`PlowWow snow removal operations in ${cityName}`}>
            <source src="/videos/plowwow-snow-removal-operations.mp4" type="video/mp4" />
            Your browser does not support embedded video. Call 604-761-1518 for PlowWow service in {cityName}.
          </video>
          <figcaption className="px-5 py-4 text-sm text-white/70">PlowWow snow and ice operations serving {cityName}, British Columbia.</figcaption>
        </figure>
      </div>
    </section>
  );
}
