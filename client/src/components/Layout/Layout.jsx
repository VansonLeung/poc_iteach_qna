import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  LayoutDashboard,
  FileQuestion,
  History,
  LogOut,
  Settings,
  Award,
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'teacher';

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="border-b p-6">
            <h1 className="text-2xl font-bold text-primary">iTeach Q&A</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <Link to="/dashboard">
              <Button variant="ghost" className="w-full justify-start">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>

            {isAdmin && (
              <>
                <div className="pt-4 pb-2">
                  <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase">
                    Admin
                  </h3>
                </div>
                <Link to="/admin/activities">
                  <Button variant="ghost" className="w-full justify-start">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Activities
                  </Button>
                </Link>
                <Link to="/admin/questions">
                  <Button variant="ghost" className="w-full justify-start">
                    <FileQuestion className="mr-2 h-4 w-4" />
                    Questions
                  </Button>
                </Link>
                <Link to="/admin/rubrics">
                  <Button variant="ghost" className="w-full justify-start">
                    <Award className="mr-2 h-4 w-4" />
                    Rubrics
                  </Button>
                </Link>
              </>
            )}

            <div className="pt-4 pb-2">
              <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase">
                User
              </h3>
            </div>
            <Link to="/submissions">
              <Button variant="ghost" className="w-full justify-start">
                <History className="mr-2 h-4 w-4" />
                My Submissions
              </Button>
            </Link>
          </nav>

          {/* Footer */}
          <div className="border-t p-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
