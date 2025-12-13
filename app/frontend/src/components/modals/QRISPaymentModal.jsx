import { Check, Loader2, QrCode, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from '../ui/dialog';
import { orderService } from '../../services/order.service';

const MidtransPaymentModal = ({ open, onClose, qrisData, onPaymentSuccess }) => {
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, checking, success, failed
  const [error, setError] = useState(null);
  const [checkingInterval, setCheckingInterval] = useState(null);
  const snapInitialized = useRef(false);

  useEffect(() => {
    if (open && qrisData && !snapInitialized.current) {
      // Determine if production or sandbox based on client_key
      // Sandbox keys start with "SB-Mid-", production keys start with "Mid-"
      const isProduction = qrisData.client_key && !qrisData.client_key.startsWith('SB-Mid-');
      const snapUrl = isProduction 
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js';
      
      console.log('🔧 Loading Midtrans Snap script:', {
        isProduction,
        snapUrl,
        client_key_prefix: qrisData.client_key?.substring(0, 10),
      });
      
      // Load Midtrans Snap script
      const script = document.createElement('script');
      script.src = snapUrl;
      script.setAttribute('data-client-key', qrisData.client_key);
      script.async = true;

      script.onload = () => {
        snapInitialized.current = true;
        
        console.log('✅ Midtrans Snap script loaded successfully');
        console.log('🔑 Client key:', qrisData.client_key?.substring(0, 15) + '...');
        console.log('🎫 Snap token:', qrisData.snap_token?.substring(0, 20) + '...');
        
        // ✅ FIX: Set overlay to pointer-events: none BEFORE opening Midtrans popup
        // This ensures clicks can reach the Midtrans popup
        const setOverlayPointerEvents = () => {
          const overlays = Array.from(document.querySelectorAll('*')).filter(el => {
            const style = window.getComputedStyle(el);
            return style.position === 'fixed' && 
                   style.top === '0px' && 
                   style.left === '0px' &&
                   style.right === '0px' &&
                   style.bottom === '0px' &&
                   (style.zIndex === '50' || style.zIndex === '40') &&
                   (style.backgroundColor.includes('rgba(0, 0, 0,') || style.backgroundColor.includes('rgb(0, 0, 0)'));
          });
          
          overlays.forEach(overlay => {
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '40';
          });
        };
        
        // Set overlay immediately
        setOverlayPointerEvents();
        
        // Also set after a short delay to catch any late-rendered overlays
        setTimeout(setOverlayPointerEvents, 50);
        setTimeout(setOverlayPointerEvents, 200);
        setTimeout(setOverlayPointerEvents, 500);
        
        // Open Snap payment
        console.log('🚀 Opening Midtrans Snap payment popup...');
        try {
          window.snap.pay(qrisData.snap_token, {
            onSuccess: async function(result) {
              console.log('✅ Payment success callback:', result);
              
              // ✅ FIX: Don't stop checking immediately - payment might still be pending in Midtrans
              // Instead, start checking payment status to ensure it's settled
              setPaymentStatus('checking');
              
              // ✅ FIX: Try to sync payment status immediately
              try {
                if (qrisData.payment_id) {
                  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
                  const token = localStorage.getItem('token');
                  
                  // Check payment status - this endpoint will update order status if payment is settled
                  const statusResponse = await fetch(
                    `${API_BASE}/v1/orders/payment/${qrisData.payment_id}/status`,
                    {
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-Business-Id': localStorage.getItem('currentBusinessId'),
                        'X-Outlet-Id': localStorage.getItem('currentOutletId'),
                      },
                    }
                  );
                  
                  if (statusResponse.ok) {
                    const statusData = await statusResponse.json();
                    console.log('🔄 Payment status checked after success:', statusData);
                    
                    // If status was updated, great!
                    if (statusData.data?.was_updated) {
                      console.log('✅ Payment status was updated by backend!');
                      setPaymentStatus('success');
                      stopChecking();
                      // ✅ FIX: Pass order data to callback untuk update UI tanpa reload
                      setTimeout(() => {
                        onPaymentSuccess && onPaymentSuccess({
                          ...statusData.data,
                          order: statusData.data.order,
                          was_updated: true,
                        });
                        handleClose();
                      }, 1500); // Reduced delay for faster UI update
                      return;
                    }
                    
                    // If payment is settled but not updated, try sync
                    if (statusData.data?.transaction_status === 'settlement' || statusData.data?.transaction_status === 'capture' || statusData.data?.transaction_status === 'success') {
                      console.log('⚠️ Payment is settled but not updated, trying sync...');
                      if (qrisData.order_number) {
                        // Try to sync via order sync endpoint
                        const orderResponse = await fetch(
                          `${API_BASE}/v1/orders?order_number=${qrisData.order_number}`,
                          {
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'X-Business-Id': localStorage.getItem('currentBusinessId'),
                              'X-Outlet-Id': localStorage.getItem('currentOutletId'),
                            },
                          }
                        );
                        
                        if (orderResponse.ok) {
                          const orderData = await orderResponse.json();
                          if (orderData.success && orderData.data && orderData.data.length > 0) {
                            const order = orderData.data[0];
                            const syncResult = await orderService.syncPaymentStatus(order.id);
                            console.log('🔄 Payment status synced via order sync:', syncResult);
                            
                            if (syncResult.success) {
                              setPaymentStatus('success');
                              stopChecking();
                              // ✅ FIX: Pass order data to callback untuk update UI tanpa reload
                              setTimeout(() => {
                                onPaymentSuccess && onPaymentSuccess({
                                  ...syncResult.data,
                                  order: syncResult.data?.order,
                                  was_synced: true,
                                });
                                handleClose();
                              }, 1500); // Reduced delay for faster UI update
                              return;
                            }
                          }
                        }
                      }
                    }
                  }
                }
              } catch (syncError) {
                console.error('⚠️ Failed to sync payment status:', syncError);
              }
              
              // ✅ FIX: Start polling to check payment status (payment might still be pending)
              // This will continue checking until payment is settled
              startCheckingPaymentStatus();
            },
            onPending: function(result) {
              console.log('⏳ Payment pending:', result);
              setPaymentStatus('checking');
              // Start polling payment status
              startCheckingPaymentStatus();
            },
            onError: function(result) {
              console.error('❌ Payment error:', result);
              setPaymentStatus('failed');
              setError('Pembayaran gagal. Silakan coba lagi.');
              stopChecking();
            },
            onClose: function() {
              console.log('🔒 Payment popup closed');
              // Don't close automatically, let user decide
              if (paymentStatus === 'pending') {
                setPaymentStatus('checking');
                startCheckingPaymentStatus();
              }
            }
          });
        } catch (error) {
          console.error('❌ Error opening Midtrans Snap:', error);
          setError('Gagal membuka halaman pembayaran Midtrans. Pastikan payment channels sudah diaktifkan di Midtrans Dashboard.');
          setPaymentStatus('failed');
        }
        
        // ✅ FIX: Keep checking and setting overlay pointer-events for a few seconds
        // This ensures overlay stays non-blocking even if Midtrans re-renders
        let checkCount = 0;
        const overlayCheckInterval = setInterval(() => {
          setOverlayPointerEvents();
          checkCount++;
          if (checkCount >= 20) { // Stop after 10 seconds (20 * 500ms)
            clearInterval(overlayCheckInterval);
          }
        }, 500);
      };

      script.onerror = () => {
        setError('Gagal memuat Midtrans. Silakan coba lagi.');
        setPaymentStatus('failed');
      };

      document.body.appendChild(script);

      return () => {
        if (script.parentNode) {
          document.body.removeChild(script);
        }
        stopChecking();
      };
    }
  }, [open, qrisData]);

  const startCheckingPaymentStatus = () => {
    stopChecking(); // Clear any existing interval

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/v1/orders/payment/${qrisData.payment_id}/status`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'X-Business-Id': localStorage.getItem('currentBusinessId'),
              'X-Outlet-Id': localStorage.getItem('currentOutletId'),
            },
          }
        );

        const result = await response.json();

        if (result.success) {
          const status = result.data.transaction_status;

          // ✅ FIX: Handle 'capture' status as well
          if (status === 'settlement' || status === 'capture' || status === 'success') {
            // ✅ FIX: If status was updated by backend, great!
            if (result.data.was_updated) {
              console.log('✅ Payment and order status updated by backend!');
              setPaymentStatus('success');
              stopChecking();
              // ✅ FIX: Pass order data to callback untuk update UI tanpa reload
              setTimeout(() => {
                onPaymentSuccess && onPaymentSuccess({
                  ...result.data,
                  order: result.data.order,
                  was_updated: true,
                });
                handleClose();
              }, 1500); // Reduced delay for faster UI update
            } else {
              // Payment is settled but not updated yet, try to sync
              console.log('⚠️ Payment is settled but not updated, trying sync...');
              try {
                if (qrisData.order_number) {
                  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
                  const token = localStorage.getItem('token');
                  
                  // Get order by order_number
                  const orderResponse = await fetch(
                    `${API_BASE}/v1/orders?order_number=${qrisData.order_number}`,
                    {
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-Business-Id': localStorage.getItem('currentBusinessId'),
                        'X-Outlet-Id': localStorage.getItem('currentOutletId'),
                      },
                    }
                  );
                  
                  if (orderResponse.ok) {
                    const orderData = await orderResponse.json();
                    if (orderData.success && orderData.data && orderData.data.length > 0) {
                      const order = orderData.data[0];
                      const syncResult = await orderService.syncPaymentStatus(order.id);
                      console.log('🔄 Payment status synced via polling:', syncResult);
                      
                      if (syncResult.success) {
                        setPaymentStatus('success');
                        stopChecking();
                        // ✅ FIX: Pass order data to callback untuk update UI tanpa reload
                        setTimeout(() => {
                          onPaymentSuccess && onPaymentSuccess({
                            ...syncResult.data,
                            order: syncResult.data?.order,
                            was_synced: true,
                          });
                          handleClose();
                        }, 1500); // Reduced delay for faster UI update
                      } else {
                        // Sync failed, continue polling
                        console.log('⚠️ Sync failed, will continue polling...');
                      }
                    }
                  }
                }
              } catch (syncError) {
                console.error('⚠️ Failed to sync during polling:', syncError);
                // Continue polling
              }
            }
          } else if (status === 'failed' || status === 'cancel' || status === 'deny' || status === 'expire') {
            setPaymentStatus('failed');
            setError('Pembayaran gagal atau dibatalkan');
            stopChecking();
          }
          // ✅ FIX: If status is 'pending', continue polling
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 3000); // Check every 3 seconds

    setCheckingInterval(interval);
  };

  const stopChecking = () => {
    if (checkingInterval) {
      clearInterval(checkingInterval);
      setCheckingInterval(null);
    }
  };

  const handleClose = () => {
    stopChecking();
    setPaymentStatus('pending');
    setError(null);
    snapInitialized.current = false;
    onClose();
  };

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // ✅ FIX: Inject global CSS to disable pointer-events on ALL overlays
  // This ensures clicks can reach the Midtrans popup
  useEffect(() => {
    if (open) {
      // Inject global CSS style to disable pointer-events on all overlays
      const styleId = 'midtrans-overlay-fix';
      let styleElement = document.getElementById(styleId);
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      
      // Set CSS to disable pointer-events on ALL overlays and ensure Midtrans popup can receive clicks
      styleElement.textContent = `
        /* Disable pointer-events on ALL Dialog overlays when Midtrans modal is open */
        [data-radix-dialog-overlay],
        [data-radix-dialog-overlay] *,
        .fixed.inset-0.z-50,
        .fixed.inset-0.z-40,
        div[style*="position: fixed"][style*="inset: 0"],
        div[style*="position:fixed"][style*="inset:0"] {
          pointer-events: none !important;
          z-index: 40 !important;
        }
        
        /* Ensure Midtrans popup can receive clicks - very specific selectors */
        [id*="snap"],
        [id*="midtrans"],
        [id*="Snap"],
        [id*="Midtrans"],
        [class*="snap"],
        [class*="midtrans"],
        [class*="Snap"],
        [class*="Midtrans"],
        iframe[src*="midtrans"],
        iframe[src*="snap"],
        div[style*="z-index: 9999"],
        div[style*="z-index:9999"] {
          pointer-events: auto !important;
          z-index: 9999 !important;
        }
        
        /* Also ensure any element with high z-index can receive clicks */
        *[style*="z-index: 9999"],
        *[style*="z-index:9999"],
        *[style*="z-index: 10000"],
        *[style*="z-index:10000"] {
          pointer-events: auto !important;
        }
      `;
      
      // Also manually set overlay to pointer-events: none
      const updateOverlay = () => {
        // Find ALL fixed elements that could be overlays
        const allFixedElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const style = window.getComputedStyle(el);
          const zIndex = parseInt(style.zIndex) || 0;
          return style.position === 'fixed' && 
                 zIndex >= 40 && zIndex <= 60 &&
                 (style.top === '0px' || style.top === '0' || style.top === '') && 
                 (style.left === '0px' || style.left === '0' || style.left === '') &&
                 (style.right === '0px' || style.right === '0' || style.right === '') &&
                 (style.bottom === '0px' || style.bottom === '0' || style.bottom === '');
        });
        
        allFixedElements.forEach(overlay => {
          const zIndex = parseInt(window.getComputedStyle(overlay).zIndex) || 0;
          // Skip if it's the Midtrans popup itself (has higher z-index)
          if (zIndex > 1000) return;
          
          // ALWAYS set to pointer-events: none when modal is open
          if (paymentStatus === 'pending' || paymentStatus === 'success') {
            overlay.style.setProperty('pointer-events', 'none', 'important');
            overlay.style.setProperty('z-index', '40', 'important');
            overlay.setAttribute('data-midtrans-overlay', 'true');
          }
        });
      };
      
      // Initial update - multiple times to catch overlay at different render stages
      updateOverlay();
      setTimeout(updateOverlay, 10);
      setTimeout(updateOverlay, 50);
      setTimeout(updateOverlay, 100);
      setTimeout(updateOverlay, 200);
      setTimeout(updateOverlay, 500);
      setTimeout(updateOverlay, 1000);
      
      // Keep checking every 50ms to ensure overlay stays non-blocking
      const overlayCheckInterval = setInterval(updateOverlay, 50);
      
      // Use MutationObserver to detect when Midtrans popup is added to DOM
      const observer = new MutationObserver(() => {
        updateOverlay();
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'data-state'],
      });
      
      return () => {
        clearInterval(overlayCheckInterval);
        observer.disconnect();
        
        // Remove global CSS style
        if (styleElement && styleElement.parentNode) {
          styleElement.parentNode.removeChild(styleElement);
        }
        
        // Reset ALL overlays when modal closes
        const allOverlays = Array.from(document.querySelectorAll('[data-midtrans-overlay]'));
        allOverlays.forEach(overlay => {
          overlay.style.removeProperty('pointer-events');
          overlay.style.removeProperty('z-index');
          overlay.removeAttribute('data-midtrans-overlay');
        });
      };
    }
  }, [open, paymentStatus]);

  // ✅ FIX: Don't use Dialog wrapper for Midtrans payment
  // Instead, just show a simple loading state and let Midtrans popup handle everything
  if (!open) return null;

  return (
    <>
      {/* Simple loading modal without overlay blocking */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent 
            className='sm:max-w-[450px] pointer-events-auto'
            onPointerDownOutside={(e) => {
              // Prevent closing when clicking outside during Midtrans popup
              // Only allow closing if payment is failed or checking
              if (paymentStatus === 'failed' || paymentStatus === 'checking') {
                handleClose();
              } else {
                e.preventDefault();
              }
            }}
            onInteractOutside={(e) => {
              // Prevent closing when clicking outside during Midtrans popup
              if (paymentStatus !== 'failed' && paymentStatus !== 'checking') {
                e.preventDefault();
              }
            }}
          >
        <DialogHeader>
          <DialogTitle className='text-lg font-bold flex items-center'>
            <QrCode className='w-5 h-5 mr-2 text-purple-600' />
            Pembayaran Midtrans
          </DialogTitle>
        </DialogHeader>

        <div className='py-6 space-y-4'>
          {/* Amount */}
          <div className='bg-purple-50 border border-purple-200 rounded-lg p-4 text-center'>
            <p className='text-sm text-gray-600 mb-1'>Total Pembayaran</p>
            <p className='text-2xl font-bold text-purple-600'>
              {formatCurrency(qrisData?.amount || 0)}
            </p>
          </div>

          {/* Status */}
          <div className='text-center py-4'>
            {paymentStatus === 'pending' && (
              <div className='space-y-3'>
                <div className='flex justify-center'>
                  <QrCode className='w-16 h-16 text-purple-600 animate-pulse' />
                </div>
                <p className='text-gray-700 font-medium'>
                  Pilih metode pembayaran
                </p>
                <p className='text-sm text-gray-500'>
                  GoPay, ShopeePay, QRIS, VA, atau Credit Card
                </p>
              </div>
            )}

            {paymentStatus === 'checking' && (
              <div className='space-y-3'>
                <div className='flex justify-center'>
                  <Loader2 className='w-16 h-16 text-purple-600 animate-spin' />
                </div>
                <p className='text-gray-700 font-medium'>
                  Memeriksa status pembayaran...
                </p>
                <p className='text-sm text-gray-500'>
                  Mohon tunggu sebentar
                </p>
              </div>
            )}

            {paymentStatus === 'success' && (
              <div className='space-y-3'>
                <div className='flex justify-center'>
                  <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center'>
                    <Check className='w-10 h-10 text-green-600' />
                  </div>
                </div>
                <p className='text-gray-700 font-medium text-lg'>
                  Pembayaran Berhasil!
                </p>
                <p className='text-sm text-gray-500'>
                  Transaksi akan segera diproses
                </p>
              </div>
            )}

            {paymentStatus === 'failed' && (
              <div className='space-y-3'>
                <div className='flex justify-center'>
                  <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center'>
                    <X className='w-10 h-10 text-red-600' />
                  </div>
                </div>
                <p className='text-gray-700 font-medium text-lg'>
                  Pembayaran Gagal
                </p>
                {error && (
                  <p className='text-sm text-red-600'>{error}</p>
                )}
              </div>
            )}
          </div>

          {/* Payment Reference */}
          {qrisData?.payment_reference && (
            <div className='border-t pt-3'>
              <p className='text-xs text-gray-500 text-center'>
                Ref: {qrisData.payment_reference}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {(paymentStatus === 'failed' || paymentStatus === 'checking') && (
            <Button
              variant='outline'
              onClick={handleClose}
              className='w-full'
            >
              Tutup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
    </>
  );
};

export default MidtransPaymentModal;
