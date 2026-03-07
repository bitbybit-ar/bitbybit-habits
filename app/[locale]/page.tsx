import Navbar from "@/components/layout/navbar";
import Hero from "./Hero";
import HowItWorks from "./HowItWorks";
import UseCases from "./UseCases";
import WhyLightning from "./WhyLightning";
import TechStack from "./TechStack";
import Roadmap from "./Roadmap";
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
        <WhyLightning />
        <TechStack />
        <Roadmap />
        <BuiltWith />
      </main>
      <Footer />
    </>
  );
}
