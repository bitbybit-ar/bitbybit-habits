import Navbar from "@/components/layout/navbar";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import UseCases from "@/components/landing/UseCases";
import TechStack from "@/components/landing/TechStack";
import Roadmap from "@/components/landing/Roadmap";
import Team from "@/components/landing/Team";
import CallToAction from "@/components/landing/CallToAction";
import BuiltWith from "@/components/landing/BuiltWith";
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
