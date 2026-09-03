import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import EventIntro from "@/components/EventIntro";
import EventJourney from "@/components/EventJourney";
import EventArena from "@/components/EventArena";
import Checkin from "@/components/Checkin";
import MakeMoment from "@/components/MakeMoment";
import Footer from "@/components/Footer";
import Tracker from "@/components/Tracker";
import ScrollProgress from "@/components/ScrollProgress";

export default function Home() {
  return (
    <>
      <ScrollProgress />
      <Tracker />
      <div className="grain" aria-hidden="true" />
      <Nav />
      <main>
        <Hero />
        <EventIntro />
        <EventJourney />
        <EventArena />
        <Checkin />
        <MakeMoment />
      </main>
      <Footer />
    </>
  );
}
