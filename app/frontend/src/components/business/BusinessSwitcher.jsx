// ==========================================
// src/components/business/BusinessSwitcher.jsx
// ==========================================
import { Building2, Check, ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { useToast } from '../ui/toast';

const BusinessSwitcher = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, businesses, currentBusiness, switchBusiness, subscriptionFeatures } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  // Only owners and super_admins can create new businesses
  const canCreateBusiness =
    user?.role === 'owner' || user?.role === 'super_admin';

  // ✅ NEW: Check subscription limit for businesses
  const maxBusinesses = subscriptionFeatures?.max_businesses ?? 1;
  const currentBusinessCount = businesses?.length || 0;
  const canCreateMoreBusinesses = maxBusinesses === -1 || currentBusinessCount < maxBusinesses;
  
  // ✅ DEBUG: Log business limit check (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Business Limit Check:', {
      maxBusinesses,
      currentBusinessCount,
      canCreateMoreBusinesses,
      subscriptionFeatures: subscriptionFeatures?.max_businesses,
    });
  }

  const handleSwitch = async business => {
    if (currentBusiness?.id === business.id) {
      setShowDropdown(false);
      return;
    }

    // Use AuthContext's switchBusiness
    switchBusiness(business);
    toast.success(`Beralih ke: ${business.name}`);
    setShowDropdown(false);

    // Reload page to refresh data
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleCreateNew = () => {
    setShowDropdown(false);
    navigate('/business/new');
  };

  return (
    <div className='relative'>
      {/* Trigger Button */}
      <Button
        variant='outline'
        onClick={() => setShowDropdown(!showDropdown)}
        className='flex items-center gap-2 w-full sm:min-w-[200px] justify-between'
        data-testid='business-switcher'
      >
        <div className='flex items-center gap-2'>
          <Building2 className='w-4 h-4' />
          <span className='font-medium truncate'>
            {currentBusiness?.name || 'Pilih Bisnis'}
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
            {/* Business List */}
            <div className='py-2'>
              <div className='px-3 py-2 text-xs font-semibold text-gray-500 uppercase'>
                Bisnis Anda ({businesses.length})
              </div>
              {businesses.length === 0 ? (
                <div className='px-3 py-4 text-sm text-gray-500 text-center'>
                  Belum ada bisnis
                </div>
              ) : (
                businesses.map(business => (
                  <button
                    key={business.id}
                    onClick={() => handleSwitch(business)}
                    className={`w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                      currentBusiness?.id === business.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm'>
                        {business.name.charAt(0).toUpperCase()}
                      </div>
                      <div className='text-left flex-1 min-w-0'>
                        <p className='text-sm font-medium text-gray-900 truncate'>
                          {business.name}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {business.email || business.phone || 'Bisnis Aktif'}
                        </p>
                      </div>
                    </div>
                    {currentBusiness?.id === business.id && (
                      <Check className='w-5 h-5 text-blue-600 flex-shrink-0' />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Create New - Only for owners */}
            {canCreateBusiness && (
              <>
                {/* Divider */}
                <div className='border-t' />

                <div className='p-2'>
                  {canCreateMoreBusinesses ? (
                    <button
                      onClick={handleCreateNew}
                      className='w-full px-3 py-2 flex items-center gap-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
                    >
                      <Plus className='w-4 h-4' />
                      <span className='text-sm font-medium'>
                        Buat Bisnis Baru
                      </span>
                    </button>
                  ) : (
                    <div className='w-full px-3 py-2 flex items-center gap-2 text-gray-400 bg-gray-50 rounded-lg cursor-not-allowed'>
                      <Plus className='w-4 h-4' />
                      <div className='flex-1'>
                        <span className='text-sm font-medium block'>
                          Batas Bisnis Tercapai
                        </span>
                        <span className='text-xs text-gray-500'>
                          {maxBusinesses === -1 
                            ? 'Unlimited' 
                            : `Maksimal ${maxBusinesses} bisnis`} ({currentBusinessCount}/{maxBusinesses === -1 ? '∞' : maxBusinesses})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BusinessSwitcher;
