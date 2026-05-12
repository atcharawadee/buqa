import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  adminOnly = false 
}) => {
  const { currentUser, isAdmin, loading } = useAuth();
  const location = useLocation();
  const [shouldRedirect, setShouldRedirect] = React.useState(false);

  React.useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        setShouldRedirect(true);
      } else if (adminOnly && !isAdmin) {
        toast.error('Restricted Access: Admin permissions required');
        setShouldRedirect(true);
      }
    }
  }, [loading, currentUser, isAdmin, adminOnly]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (shouldRedirect) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
