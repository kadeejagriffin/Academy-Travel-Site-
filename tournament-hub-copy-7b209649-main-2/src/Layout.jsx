import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, DollarSign, Menu, Users, UserCircle, Award, Plane, Hotel, Home } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigationItems = [
  {
    title: "Home",
    url: createPageUrl("Home"),
    icon: Home,
  },
  {
    title: "Leagues",
    url: createPageUrl("Leagues"),
    icon: Award,
  },
  {
    title: "Tournaments",
    url: createPageUrl("Tournaments"),
    icon: Trophy,
  },
  {
    title: "Teams",
    url: createPageUrl("TeamsManagement"),
    icon: Users,
  },
  {
    title: "Coaches",
    url: createPageUrl("CoachesManagement"),
    icon: UserCircle,
  },
  {
    title: "Travel",
    url: createPageUrl("Travel"),
    icon: Plane,
  },
  {
    title: "Stay & Play",
    url: createPageUrl("StayAndPlay"),
    icon: Hotel,
  },
  {
    title: "Finance",
    url: createPageUrl("MasterFinanceDashboard"),
    icon: DollarSign,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  const NavContent = () => (
    <nav className="flex flex-col gap-2 p-4">
      {navigationItems.map((item) => (
        <Link
          key={item.title}
          to={item.url}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            location.pathname === item.url
              ? 'bg-blush-100 text-blush-800'
              : 'text-gray-600 hover:bg-blush-50'
          }`}
        >
          <item.icon className="w-5 h-5" />
          <span className="font-medium">{item.title}</span>
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen w-full bg-gray-50 flex">
       <style>{`
        :root {
          --blush-50: #fef6f6;
          --blush-100: #fdecec;
          --blush-800: #9b3b3b;
          --sage-50: #f5fbf8;
          --sage-100: #eaf8f1;
          --sage-800: #3a755d;
          --lavender-100: #f5f3ff;
          --lavender-800: #5d50b3;
          --mist-blue-100: #f0f8ff;
          --mist-blue-800: #4a7aa8;
        }
      `}</style>
      <aside className="hidden md:block w-64 border-r bg-white">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-gray-800">Kadeeja's Organized Corner</h1>
          <p className="text-sm text-gray-500 italic">Academy Travel</p>
        </div>
        <NavContent />
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-white">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Kadeeja's Organized Corner</h1>
            <p className="text-xs text-gray-500 italic">Academy Travel</p>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2">
                <Menu className="w-6 h-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0">
               <div className="p-4 border-b">
                 <h1 className="text-2xl font-bold text-gray-800">Menu</h1>
               </div>
              <NavContent />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            {children}
        </main>
      </div>
    </div>
  );
}