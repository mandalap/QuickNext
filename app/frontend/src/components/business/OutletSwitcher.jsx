// ==========================================
// src/components/business/OutletSwitcher.jsx
// ==========================================
import { Check, ChevronDown, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { useToast } from '../ui/toast';

const OutletSwitcher = () => {
  const { toast } = useToast();
  const { user, outlets, currentOutlet, currentBusiness } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  // ✅ DEBUG: Log only in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 OutletSwitcher render:', {
      userRole: user?.role,
      currentBusiness: currentBusiness?.name,
      outletsCount: outlets?.length,
      currentOutlet: currentOutlet?.name,
      outlets: outlets,
    });
  }

  const handleSwitch = async outlet => {
    if (currentOutlet?.id === outlet.id) {
      setShowDropdown(false);
      return;
    }

    // Set current outlet
    localStorage.setItem('currentOutletId', outlet.id);
    window.location.reload(); // Reload to update context

    toast.success(`Beralih ke outlet: ${outlet.name}`);
    setShowDropdown(false);
  };

  // ✅ FIX: Don't render if no business selected
  if (!currentBusiness) {
    console.log('⚠️ OutletSwitcher: No business selected');
    return null;
  }

  // ✅ FIX: Show loading state or placeholder while outlets are being loaded
  // Don't hide completely - show "Loading..." or current outlet name if available
  // This prevents outlet switcher from disappearing during reload
  if (!outlets || outlets.length === 0) {
    // ✅ FIX: If we have currentOutlet from cache/localStorage, still show it
    // This prevents outlet switcher from disappearing during reload
    if (currentOutlet) {
      console.log('⏳ OutletSwitcher: Outlets loading, but showing cached currentOutlet:', currentOutlet.name);
      // Show current outlet even if outlets array is empty (still loading)
      return (
        <div className='relative'>
          <Button
            variant='outline'
            disabled
            className='flex items-center gap-2 w-full sm:min-w-[200px] justify-between opacity-75'
          >
            <div className='flex items-center gap-2'>
              <MapPin className='w-4 h-4' />
              <span className='font-medium truncate'>
                {currentOutlet.name}
              </span>
            </div>
            <ChevronDown className='w-4 h-4' />
          </Button>
        </div>
      );
    }
    
    console.log('⚠️ OutletSwitcher: No outlets available and no currentOutlet');
    console.log('⚠️ OutletSwitcher: outlets value:', outlets);
    console.log('⚠️ OutletSwitcher: currentBusiness:', currentBusiness);
    console.log('⚠️ OutletSwitcher: user role:', user?.role);
    // ✅ FIX: Show placeholder instead of null to prevent layout shift
    return (
      <div className='relative'>
        <Button
          variant='outline'
          disabled
          className='flex items-center gap-2 w-full sm:min-w-[200px] justify-between opacity-50'
        >
          <div className='flex items-center gap-2'>
            <MapPin className='w-4 h-4' />
            <span className='font-medium truncate'>
              Memuat outlet...
            </span>
          </div>
          <ChevronDown className='w-4 h-4' />
        </Button>
      </div>
    );
  }

  // For kasir role, only show assigned outlets (outlets already filtered in AuthContext)
  // For other roles, show all outlets
  console.log(
    '✅ OutletSwitcher: Rendering with',
    outlets.length,
    'outlets for role:',
    user?.role
  );

  // Show outlet switcher for all roles
  return (
    <div className='relative'>
      {/* Trigger Button */}
      <Button
        variant='outline'
        onClick={() => setShowDropdown(!showDropdown)}
        className='flex items-center gap-2 w-full sm:min-w-[200px] justify-between'
      >
        <div className='flex items-center gap-2'>
          <MapPin className='w-4 h-4' />
          <span className='font-medium truncate'>
            {currentOutlet?.name || 'Pilih Outlet'}
          </span>
        </div>
        <ChevronDown className='w-4 h-4' />
      </Button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 z-40'
            onClick={() => setShowDropdown(false)}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setShowDropdown(false);
              }
            }}
            role='button'
            tabIndex={0}
            aria-label='Close dropdown'
          />

          {/* Dropdown Menu */}
          <div className='absolute top-full left-0 mt-2 w-full sm:w-72 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto'>
            {/* Business Info */}
            <div className='px-3 py-2 border-b bg-gray-50'>
              <p className='text-xs font-semibold text-gray-500 uppercase'>
                {currentBusiness?.name}
              </p>
              <p className='text-xs text-gray-400'>
                Outlet Tersedia ({outlets.length})
              </p>
            </div>

            {/* Outlet List */}
            <div className='py-2'>
              {outlets.map(outlet => (
                <button
                  key={outlet.id}
                  onClick={() => handleSwitch(outlet)}
                  className={`w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    currentOutlet?.id === outlet.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm'>
                      <MapPin className='w-5 h-5' />
                    </div>
                    <div className='text-left flex-1 min-w-0'>
                      <p className='text-sm font-medium text-gray-900 truncate'>
                        {outlet.name}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {outlet.address || 'Outlet Aktif'}
                      </p>
                    </div>
                  </div>
                  {currentOutlet?.id === outlet.id && (
                    <Check className='w-5 h-5 text-blue-600 flex-shrink-0' />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OutletSwitcher;
