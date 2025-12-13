/**
 * LoadingLogo Component
 * Reusable loading component dengan logo QuickKasir
 * Digunakan di semua loading state untuk konsistensi branding
 */

const LoadingLogo = ({
  size = 'large', // 'small', 'medium', 'large', 'xl'
  text = 'Memuat...',
  showText = true,
  className = '',
}) => {
  // Size mapping - diperbesar untuk visibility lebih baik
  const sizeClasses = {
    small: 'w-32 h-32', // 128px (dari 64px)
    medium: 'w-48 h-48', // 192px (dari 96px)
    large: 'w-64 h-64', // 256px (dari 160px)
    xl: 'w-80 h-80', // 320px (dari 224px)
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
    xl: 'text-xl',
  };

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
    >
      <img
        src='/logi-qk-full.png'
        alt='QuickKasir'
        className={`${sizeClasses[size]} object-contain animate-pulse`}
        loading='lazy' // ✅ OPTIMIZATION: Lazy load logo (not critical for initial render)
        decoding='async' // ✅ OPTIMIZATION: Async decoding for better performance
        onError={e => {
          // Fallback to alternate logo when full logo is unavailable
          e.currentTarget.src = '/logo-qk.png';
        }}
      />
      {showText && (
        <div className={`text-gray-500 ${textSizeClasses[size]}`}>{text}</div>
      )}
    </div>
  );
};

export default LoadingLogo;
