import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Countdown from "@/components/Countdown";
import EventJourney from "@/components/EventJourney";
import EventArena from "@/components/EventArena";
import Register from "@/components/Register";
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
        <Countdown />
        <EventJourney />
        <EventArena />
        <Register />
        <MakeMoment />
      </main>
      <Footer />
    </>
  );
}
