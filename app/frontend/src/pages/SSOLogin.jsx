import axios from 'axios';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../utils/apiClient';

const SSOLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: loginWithToken } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    // Set token immediately
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Load user data and check subscription status
    const initUser = async () => {
      try {
        const response = await apiClient.get('/user');

        const userData = response.data;
        console.log('🔐 SSO Login - User data:', userData);

        // Wait a moment for the token to be fully set
        await new Promise(resolve => setTimeout(resolve, 300));

        // Check subscription status for owner/super_admin
        if (userData.role === 'owner' || userData.role === 'super_admin') {
          try {
            // Check subscription status
            const subscriptionResponse = await apiClient.get(
              '/v1/subscriptions/current'
            );

            const subscriptionData = subscriptionResponse.data;
            console.log('🔐 SSO Login - Subscription data:', subscriptionData);

            const hasActiveSubscription =
              subscriptionData.has_subscription || false;
            const isPendingPayment =
              subscriptionData.is_pending_payment || false;
            const subscriptionStatus =
              subscriptionData.subscription_status || null;
            const isTrial = subscriptionData.is_trial || false;
            const trialEnded = subscriptionData.trial_ended || false;

            // Check if trial has ended
            if (isTrial && trialEnded) {
              console.log('⚠️ Trial ended, redirecting to subscription-plans');
              window.location.href = '/subscription-plans';
              return;
            }

            // Check if payment is pending
            if (isPendingPayment || subscriptionStatus === 'pending_payment') {
              console.log(
                '⚠️ Payment pending, redirecting to subscription-plans'
              );
              window.location.href = '/subscription-plans';
              return;
            }

            // If subscription is active, check if user has business
            if (hasActiveSubscription) {
              // Load businesses to check if user has any business
              try {
                const businessesResponse = await apiClient.get(
                  '/v1/businesses'
                );

                const businesses = Array.isArray(businessesResponse.data)
                  ? businessesResponse.data
                  : businessesResponse.data?.data || [];

                console.log('🔐 SSO Login - Businesses:', businesses);

                if (businesses.length > 0) {
                  // User has active subscription and business, go to dashboard
                  console.log(
                    '✅ SSO Login - Has subscription and business, redirecting to dashboard'
                  );
                  window.location.href = '/';
                } else {
                  // User has subscription but no business, go to business setup
                  console.log(
                    '✅ SSO Login - Has subscription but no business, redirecting to business-setup'
                  );
                  window.location.href = '/business-setup';
                }
              } catch (businessError) {
                console.error(
                  '❌ SSO Login - Error loading businesses:',
                  businessError
                );
                // If error loading businesses, assume no business and redirect to setup
                window.location.href = '/business-setup';
              }
            } else {
              // No active subscription, redirect to subscription plans
              console.log(
                '⚠️ SSO Login - No active subscription, redirecting to subscription-plans'
              );
              window.location.href = '/subscription-plans';
            }
          } catch (subscriptionError) {
            console.error(
              '❌ SSO Login - Error checking subscription:',
              subscriptionError
            );
            // If subscription check fails, redirect to subscription plans
            window.location.href = '/subscription-plans';
          }
        } else {
          // Employee roles go to their dashboard
          console.log('✅ SSO Login - Employee role, redirecting to dashboard');
          window.location.href = '/';
        }
      } catch (error) {
        console.error('❌ SSO login error:', error);
        // If error, redirect to subscription plans (user can pick plan)
        window.location.href = '/subscription-plans';
      }
    };

    initUser();
  }, [location.search, navigate]);

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  return null;
};

export default SSOLogin;
