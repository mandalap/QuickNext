// Debug utility for AuthContext issues
export const debugAuth = () => {
  console.log('🔍 DEBUG AUTH CONTEXT:');
  console.log('User:', localStorage.getItem('user'));
  console.log('Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
  console.log(
    'Current Business ID:',
    localStorage.getItem('currentBusinessId')
  );
  console.log('Current Outlet ID:', localStorage.getItem('currentOutletId'));

  // Check if we're on the right page
  console.log('Current Path:', window.location.pathname);

  // Check if outlets are being loaded
  const outlets = JSON.parse(localStorage.getItem('outlets') || 'null');
  console.log('Cached Outlets:', outlets);

  return {
    user: localStorage.getItem('user'),
    token: localStorage.getItem('token'),
    businessId: localStorage.getItem('currentBusinessId'),
    outletId: localStorage.getItem('currentOutletId'),
    outlets: outlets,
  };
};

// Function to force reload outlets
export const forceReloadOutlets = async () => {
  console.log('🔄 Force reloading outlets...');

  const businessId = localStorage.getItem('currentBusinessId');
  if (!businessId) {
    console.error('❌ No business ID found');
    return;
  }

  try {
    const response = await fetch(
      `${
        process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'
      }/outlets`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'X-Business-Id': businessId,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Outlets loaded:', data);
      localStorage.setItem('outlets', JSON.stringify(data));
      return data;
    } else {
      const error = await response.json();
      console.error('❌ Error loading outlets:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    return null;
  }
};




















































































