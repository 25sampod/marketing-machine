import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustedBy from "@/components/TrustedBy";
import Features from "@/components/Features";
import Product from "@/components/Product";
import HowItWorks from "@/components/HowItWorks";
import Stats from "@/components/Stats";
import Solutions from "@/components/Solutions";
import Testimonials from "@/components/Testimonials";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="focus:outline-none overflow-x-clip overflow-x-hidden w-full">
        <Hero />
        <TrustedBy />
        <Features />
        <Product />
        <HowItWorks />
        <Stats />
        <Solutions />
        <Testimonials />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}
