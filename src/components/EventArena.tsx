import Reveal from "./Reveal";

/**
 * Event Arena — tạm ẩn floor plan tương tác.
 * Khi sự kiện gần diễn ra, khôi phục bản đồ khu vực tại đây.
 */
export default function EventArena() {
  return (
    <section id="arena" className="section-divider scroll-mt-20 py-20 md:py-32">
      <div className="container-c">
        <Reveal>
          <h2 className="section-title">EVENT ARENA</h2>
        </Reveal>

        <Reveal delay={120}>
          <div className="card mt-12">
            <div className="card-core !p-10 text-center md:!p-16">
              <p className="display text-2xl font-bold tracking-wide text-line md:text-3xl">
                CURRENTLY NOT AVAILABLE
              </p>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">
                Bản đồ khu vực sự kiện đang được hoàn thiện và sẽ được cập nhật
                sớm. Quay lại sau nhé!
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}