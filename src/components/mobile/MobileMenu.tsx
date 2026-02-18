import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Home, Users, Briefcase, Calendar, UsersRound, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const MobileMenu = () => {
  const [open, setOpen] = useState(false);

  const menuItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Users, label: 'My Network', path: '/network' },
    { icon: Briefcase, label: 'Mentorship', path: '/mentorship' },
    { icon: Calendar, label: 'Events', path: '/events' },
    { icon: Sprout, label: 'EcoCampus', path: '/ecocampus' },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden touch-target"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-2 mt-6">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors touch-target"
            >
              <item.icon className="h-5 w-5 text-white/60" />
              <span className="text-base font-medium text-foreground">{item.label}</span>
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
