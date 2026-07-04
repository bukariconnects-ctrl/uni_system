interface InfiniteMarqueeProps {
  images: { src: string; alt: string }[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
}

const speedMap: Record<string, number> = {
  fast: 20,
  normal: 35,
  slow: 50,
};

export default function InfiniteMarquee({
  images,
  direction = "left",
  speed = "normal",
}: InfiniteMarqueeProps) {
  const duration = speedMap[speed] ?? 35;
  const animClass =
    direction === "left"
      ? "animate-marquee-left"
      : "animate-marquee-right";

  return (
    <div
      className="group relative overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)",
      }}
    >
      <div
        className={`flex w-max gap-5 ${animClass}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {[...images, ...images].map((img, i) => (
          <div
            key={i}
            className="relative h-48 w-80 flex-shrink-0 overflow-hidden rounded-xl shadow-md transition-all duration-300 group-hover:scale-[1.02]"
          >
            <img
              src={img.src}
              alt={img.alt}
              className="h-full w-full object-cover brightness-95 transition-all duration-300 group-hover:brightness-110"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
