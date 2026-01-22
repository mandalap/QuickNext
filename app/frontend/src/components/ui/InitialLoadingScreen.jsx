/**
 * InitialLoadingScreen Component
 * Loading screen yang ditampilkan saat pertama kali loading aplikasi
 * Menampilkan progress indicator dan mempersiapkan data sebelum render
 */

import { useEffect, useState } from 'react';
import LoadingLogo from './LoadingLogo';

const InitialLoadingScreen = ({ 
  onLoadingComplete,
  loadingSteps = [
    'Memuat aplikasi...',
    'Memverifikasi sesi...',
    'Memuat data bisnis...',
    'Mempersiapkan dashboard...',
  ],
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const totalSteps = loadingSteps.length;
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          if (onLoadingComplete) {
            onLoadingComplete();
          }
          return 100;
        }
        return prev + 2; // Increase by 2% every 50ms
      });
    }, 50);

    // Update current step based on progress
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        const newStep = Math.floor((progress / 100) * totalSteps);
        return Math.min(newStep, totalSteps - 1);
      });
    }, 100);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, [loadingSteps, onLoadingComplete, progress]);

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-white'>
      <div className='w-full max-w-md px-6'>
        {/* Logo and Loading Animation */}
        <div className='mb-8'>
          <LoadingLogo size='xl' text={loadingSteps[currentStep] || 'Memuat...'} />
        </div>

        {/* Progress Bar */}
        <div className='w-full bg-gray-200 rounded-full h-2.5 mb-4 overflow-hidden'>
          <div
            className='bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out'
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress Text */}
        <div className='text-center'>
          <p className='text-sm text-gray-600'>{progress}%</p>
        </div>

        {/* Loading Steps Indicator */}
        <div className='mt-6 space-y-2'>
          {loadingSteps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 text-sm transition-opacity duration-300 ${
                index <= currentStep
                  ? 'text-blue-600 opacity-100'
                  : 'text-gray-400 opacity-50'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index < currentStep
                    ? 'bg-blue-600'
                    : index === currentStep
                    ? 'bg-blue-400 animate-pulse'
                    : 'bg-gray-300'
                }`}
              />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InitialLoadingScreen;

