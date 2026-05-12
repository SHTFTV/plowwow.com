/**
 * Lightweight pure-CSS snowfall. No libraries.
 * Renders a fixed number of snowflake spans with randomized
 * delays/durations/positions for an organic effect.
 */
const FLAKES = 40;

const SnowBackground = () => {
  const flakes = Array.from({ length: FLAKES }, (_, i) => {
    const left = Math.random() * 100;
    const duration = 8 + Math.random() * 12;
    const delay = -Math.random() * duration;
    const size = 0.5 + Math.random() * 1.2;
    const opacity = 0.4 + Math.random() * 0.6;
    return (
      <span
        key={i}
        aria-hidden="true"
        style={{
          left: `${left}%`,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          fontSize: `${size}rem`,
          opacity,
        }}
      >
        ❄
      </span>
    );
  });
  return (
    <div className="snowfall" aria-hidden="true">
      {flakes}
    </div>
  );
};

export default SnowBackground;
