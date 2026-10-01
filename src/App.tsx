import { NuqsAdapter } from 'nuqs/adapters/react';
import { HelmetProvider } from 'react-helmet-async';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import ScrollToTop from './components/ui/ScrollToTop';
import Services from './pages/Services';
import Document from './pages/Document';
import Government from './pages/Government';
import Search from './pages/Search';
import Sitemap from './pages/Sitemap';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Charts (Recharts) load only when the reports dashboard is opened.
const Reports = lazy(() => import('./pages/reports/Reports'));
const reports = (
  <Suspense fallback={<div className="min-h-screen" />}>
    <Reports />
  </Suspense>
);

function App() {
  return (
    <HelmetProvider>
      <Router>
        <NuqsAdapter>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/services/:category" element={<Services />} />
              <Route path="/services" element={<Services />} />
              <Route
                path="/services/:category/:documentSlug"
                element={<Document categoryType="service" />}
              />
              <Route
                path="/government/reports-and-statistics"
                element={reports}
              />
              <Route
                path="/government/reports-and-statistics/:section"
                element={reports}
              />
              <Route path="/government/:category" element={<Government />} />
              <Route path="/government" element={<Government />} />
              <Route
                path="/government/:category/:documentSlug"
                element={<Document categoryType="government" />}
              />
              <Route path="/search" element={<Search />} />
              <Route path="/sitemap" element={<Sitemap />} />
              <Route path="/:lang/:documentSlug" element={<Document />} />
              <Route path="/:documentSlug" element={<Document />} />
            </Routes>
            <Footer />
          </div>
        </NuqsAdapter>
      </Router>
    </HelmetProvider>
  );
}

export default App;
