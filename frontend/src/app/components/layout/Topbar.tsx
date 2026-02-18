import { 
  Menu,
  LayoutGrid,
  Search,
  Bell,
  Moon,
  User,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface TopbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

export function Topbar({ currentPage, onToggleSidebar }: TopbarProps) {
  return (
    <header className="h-20 bg-nebula-navy-dark border-b border-nebula-navy-lighter px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="text-slate-400 hover:text-white hover:bg-nebula-navy-lighter"
        >
          <Menu className="size-5" />
        </Button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <LayoutGrid className="size-4 text-slate-500" />
          <span className="text-slate-500">Pages</span>
          <span className="text-slate-500">/</span>
          <span className="text-white capitalize">{currentPage}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Search..."
            className="pl-10 bg-nebula-navy-light border-nebula-navy-lighter text-white placeholder:text-slate-500 h-10"
          />
        </div>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white hover:bg-nebula-navy-lighter relative"
        >
          <Bell className="size-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-nebula-pink rounded-full"></span>
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white hover:bg-nebula-navy-lighter"
        >
          <Moon className="size-5" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-slate-400 hover:text-white hover:bg-nebula-navy-lighter"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nebula-cyan to-nebula-purple flex items-center justify-center">
                <User className="size-4 text-white" />
              </div>
            </Button>
          </DropdownMenuTrigger>
        </DropdownMenu>
      </div>
    </header>
  );
}
