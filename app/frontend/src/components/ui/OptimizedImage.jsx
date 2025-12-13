import { Package } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Generate srcset from image path
 * Supports both single image and multiple sizes format
 */
const generateSrcSet = (src) => {
  if (!src) return null;
  
  // Jika src sudah memiliki format multiple sizes (dari backend)
  // Contoh: { thumbnail: 'path_thumb.webp', medium: 'path_medium.webp', large: 'path_large.webp' }
  if (typeof src === 'object' && src.paths) {
    const { paths } = src;
    return `
      ${paths.thumbnail || paths.medium || paths.large} 150w,
      ${paths.medium || paths.large} 400w,
      ${paths.large || paths.medium} 800w
    `;
  }
  
  // Jika src adalah string, generate srcset berdasarkan pattern
  // Asumsi: backend bisa serve image dengan query parameter ?w=150, ?w=400, ?w=800
  // Atau kita bisa gunakan image CDN yang support auto-resize
  const baseUrl = typeof src === 'string' ? src : (src.default || src);
  
  // Fallback: gunakan src yang sama untuk semua sizes
  // Browser akan memilih yang sesuai berdasarkan viewport
  return null; // Return null untuk fallback ke single src
};

/**
 * Get sizes attribute based on container
 */
const getSizes = (className) => {
  // Detect dari className jika ada width constraint
  if (className.includes('w-full')) {
    return '100vw';
  }
  if (className.includes('w-1/2')) {
    return '50vw';
  }
  if (className.includes('w-1/3')) {
    return '33vw';
  }
  if (className.includes('w-1/4')) {
    return '25vw';
  }
  // Default untuk mobile-first
  return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px';
};

const OptimizedImage = ({
  src,
  alt,
  className = '',
  fallbackIcon: FallbackIcon = Package,
  placeholder = true,
  lazy = true,
  sizes, // Optional: custom sizes attribute
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef(null);
  
  // Get actual image source
  const imageSrc = !src 
    ? null
    : (typeof src === 'object' && src !== null && src.default 
      ? src.default 
      : (typeof src === 'object' && src !== null && src.paths 
        ? src.paths.medium || src.paths.large || src.paths.thumbnail
        : src));
  
  // Generate srcset
  const srcSet = generateSrcSet(src);
  const sizesAttr = sizes || getSizes(className);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [lazy]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${className}`}
      >
        <FallbackIcon className='w-8 h-8 text-gray-400' />
      </div>
    );
  }

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {/* Loading placeholder */}
      {isLoading && placeholder && (
        <div className='absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse'>
          <div className='w-8 h-8 bg-gray-300 rounded'></div>
        </div>
      )}

      {/* Actual image */}
      {isInView && imageSrc && (
        <img
          src={imageSrc}
          srcSet={srcSet || undefined}
          sizes={srcSet ? sizesAttr : undefined}
          alt={alt || ''}
          className={`object-cover w-full h-full transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading={lazy ? 'lazy' : 'eager'}
          decoding='async'
        />
      )}
    </div>
  );
};

export default OptimizedImage;

