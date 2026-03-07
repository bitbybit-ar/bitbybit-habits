import Navbar from "@/components/layout/navbar";
import Hero from "./Hero";
import HowItWorks from "./HowItWorks";
import UseCases from "./UseCases";
import TechStack from "./TechStack";
import Roadmap from "./Roadmap";
import Team from "./Team";
import CallToAction from "./CallToAction";
import BuiltWith from "./BuiltWith";
import Footer from "@/components/layout/footer";

export default function Home() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <Hero />
      <main id="main-content">
        <HowItWorks />
        <UseCases />
        <TechStack />
        <Roadmap />
        <Team />
        <CallToAction />
        <BuiltWith />
      </main>
      <Footer />
    </>
  );
}
