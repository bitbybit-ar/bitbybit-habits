import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import UseCases from "@/components/landing/UseCases";
import TechStack from "@/components/landing/TechStack";
import Roadmap from "@/components/landing/Roadmap";
import Team from "@/components/landing/Team";
import CallToAction from "@/components/landing/CallToAction";

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <UseCases />
      <TechStack />
      <Roadmap />
      <Team />
      <CallToAction />
    </>
  );
}
