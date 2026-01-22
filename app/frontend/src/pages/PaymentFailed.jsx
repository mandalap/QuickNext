import { useLocation, useNavigate } from 'react-router-dom';

const PaymentFailed = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const subscription = location.state?.subscription;

  return (
    <div className='min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center py-12 px-4'>
      <div className='max-w-md w-full bg-white rounded-lg shadow-xl p-8'>
        <div className='text-center'>
          <div className='mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4'>
            <svg
              className='h-8 w-8 text-red-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </div>

          <h2 className='text-2xl font-bold text-gray-900 mb-2'>
            Pembayaran Gagal
          </h2>
          <p className='text-gray-600 mb-6'>
            Maaf, pembayaran Anda tidak dapat diproses. Silakan coba lagi atau
            hubungi customer support.
          </p>

          {subscription && (
            <div className='bg-gray-50 rounded-lg p-4 mb-6 text-left'>
              <h3 className='font-semibold text-gray-900 mb-2'>
                Detail Subscription
              </h3>
              <div className='text-sm text-gray-600 space-y-1'>
                <p>
                  <span className='font-medium'>Paket:</span>{' '}
                  {subscription.subscription_plan?.name}
                </p>
                <p>
                  <span className='font-medium'>Kode:</span>{' '}
                  {subscription.subscription_code}
                </p>
                <p>
                  <span className='font-medium'>Status:</span>{' '}
                  <span className='text-red-600 font-medium'>Failed</span>
                </p>
              </div>
            </div>
          )}

          <div className='space-y-3'>
            <button
              onClick={() => navigate('/subscription-plans')}
              className='w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium'
            >
              Coba Lagi
            </button>

            <button
              onClick={() => navigate('/')}
              className='w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium'
            >
              Kembali ke Dashboard
            </button>
          </div>

          <div className='mt-6 p-4 bg-blue-50 rounded-lg'>
            <p className='text-sm text-blue-800'>
              <span className='font-medium'>Butuh bantuan?</span> Hubungi customer
              support kami untuk mendapatkan bantuan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;
