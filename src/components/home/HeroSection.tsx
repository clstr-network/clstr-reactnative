
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/contexts/ProfileContext';

const HeroSection = () => {
  const [timeOfDay, setTimeOfDay] = useState('');
  const { profile } = useProfile();
  
  useEffect(() => {
    // Set greeting based on time of day
    const hours = new Date().getHours();
    let greeting = 'Good evening';
    
    if (hours < 12) {
      greeting = 'Good morning';
    } else if (hours < 18) {
      greeting = 'Good afternoon';
    }
    
    setTimeOfDay(greeting);
  }, []);
  
  return (
    <div className="relative bg-white/[0.04] py-12 md:py-20 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-white/[0.08]" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl text-white">
          <h1 className="text-3xl md:text-4xl font-bold">
            {timeOfDay}, {profile?.full_name ? profile.full_name.split(' ')[0] : 'there'}!
          </h1>
          
          <p className="mt-4 text-lg md:text-xl opacity-90">
            Welcome to clstr, the place to connect with your fellow alumni and stay up to date with events and opportunities.
          </p>
          
          <div className="mt-8 flex flex-wrap gap-4">
            <Button 
              size="lg" 
              className="bg-white text-white/60 hover:bg-white/90 font-semibold transition-all duration-300 transform hover:translate-y-[-2px]"
              asChild
            >
              <Link to="/network">
                Connect with Alumni
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            
            <Button 
              size="lg"
              variant="outline"
              className="border-white bg-transparent text-white hover:bg-white/20 font-semibold transition-all duration-300 transform hover:translate-y-[-2px]"
              asChild
            >
              <Link to="/events">
                Explore Events
              </Link>
            </Button>
          </div>
          
          {/* Quick stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 backdrop-blur-sm bg-white/10 rounded-lg">
              <h3 className="text-2xl font-bold">5000+</h3>
              <p className="text-sm opacity-90">Alumni Network</p>
            </div>
            <div className="p-3 backdrop-blur-sm bg-white/10 rounded-lg">
              <h3 className="text-2xl font-bold">124</h3>
              <p className="text-sm opacity-90">Events This Year</p>
            </div>
            <div className="p-3 backdrop-blur-sm bg-white/10 rounded-lg">
              <h3 className="text-2xl font-bold">97%</h3>
              <p className="text-sm opacity-90">Placement Rate</p>
            </div>
            <div className="p-3 backdrop-blur-sm bg-white/10 rounded-lg">
              <h3 className="text-2xl font-bold">250+</h3>
              <p className="text-sm opacity-90">Mentors</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
