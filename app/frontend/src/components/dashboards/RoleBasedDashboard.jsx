import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Dashboard from './Dashboard';
import KasirDashboard from './KasirDashboard';

/**
 * Role-based Dashboard Wrapper
 * Menampilkan dashboard yang sesuai berdasarkan role user
 */
const RoleBasedDashboard = () => {
  const { user } = useAuth();

  // Jika user belum loaded, tampilkan loading (akan di-handle oleh ProtectedRoute)
  if (!user) {
    return null;
  }

  // ✅ FIX: Kasir harus melihat KasirDashboard, bukan Dashboard owner
  if (user.role === 'kasir') {
    return <KasirDashboard />;
  }

  // ✅ Owner, admin, super_admin melihat Dashboard
  if (['owner', 'admin', 'super_admin'].includes(user.role)) {
    return <Dashboard />;
  }

  // ✅ Fallback: redirect ke home path sesuai role
  const getRoleHomePath = role => {
    switch (role) {
      case 'kitchen':
        return '/kitchen';
      case 'waiter':
        return '/tables';
      case 'member':
        return '/customer-portal';
      default:
        return '/';
    }
  };

  return <Navigate to={getRoleHomePath(user.role)} replace />;
};

export default RoleBasedDashboard;

