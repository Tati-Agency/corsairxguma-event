import Reveal from "./Reveal";

/**
 * Event Arena — gallery khoảnh khắc sự kiện.
 * Khi sự kiện gần diễn ra, có thể khôi phục bản đồ khu vực tương tác tại đây.
 */
const ARENA_IMAGES: { src: string; alt: string }[] = [
  { src: "/img/1.jpg", alt: "Khoảnh khắc sự kiện Corsair x Gumayusi 1" },
  { src: "/img/2.jpg", alt: "Khoảnh khắc sự kiện Corsair x Gumayusi 2" },
  { src: "/img/3.jpg", alt: "Khoảnh khắc sự kiện Corsair x Gumayusi 3" },
];

export default function EventArena() {
  return (
    <section id="arena" className="section-divider scroll-mt-20 py-16 md:py-32">
      <div className="container-c">
        <Reveal>
          <h2 className="section-title section-title-light">EVENT ARENA</h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-3">
          {ARENA_IMAGES.map((img, i) => (
            <Reveal key={img.src} delay={i * 90} variant="zoom">
              <figure className="group overflow-hidden rounded-xl border border-white/15 bg-[#1a1a1a]">
                <img
                  src={img.src}
                  alt={img.alt}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}