
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center bg-[#000000]">
        <div className="text-center max-w-md px-6">
          <h1 className="text-6xl font-bold text-white">404</h1>
          <h2 className="text-2xl font-semibold mt-4 text-white">Page not found</h2>
          <p className="text-white/60 mt-2 mb-6">
            The page you are looking for doesn't exist or has been moved. 
            Please check the URL or navigate back to the homepage.
          </p>
          <Button asChild className="bg-white/10 border border-white/15 text-white">
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
