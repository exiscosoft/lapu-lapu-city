import Hero from '../components/sections/Hero';
import ServicesSection from '../components/home/ServicesSection';
import GovernmentActivitySection from '../components/home/GovernmentActivitySection';
import SEO from '../components/SEO';

const Home: React.FC = () => {
  return (
    <>
      <SEO
        title="Home"
        description="BetterLapuLapu is a community-powered portal for Lapu-Lapu City, Cebu. Find city services, government offices, officials, and public reports in one place."
        keywords="Lapu-Lapu City, Cebu, local government, city services, public services, BetterLapuLapu"
      />
      <main className="flex-grow">
        <Hero />
        <ServicesSection />
        <GovernmentActivitySection />
      </main>
    </>
  );
};

export default Home;
