import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './button';
import { cn } from '../../lib/utils';

/**
 * BackButton Component
 * 
 * Komponen tombol kembali yang dapat digunakan di PWA.
 * Mendukung:
 * - Navigasi kembali menggunakan React Router
 * - Fallback ke window.history.back() jika tidak ada history
 * - Custom fallback path jika diperlukan
 * - Styling yang dapat dikustomisasi
 * 
 * @param {Object} props
 * @param {string} props.fallbackPath - Path fallback jika tidak ada history (default: '/')
 * @param {string} props.variant - Variant button (default: 'ghost')
 * @param {string} props.size - Size button (default: 'sm')
 * @param {string} props.className - Custom className
 * @param {boolean} props.showLabel - Tampilkan label "Kembali" (default: true)
 * @param {Function} props.onClick - Custom onClick handler
 */
const BackButton = ({
  fallbackPath = '/',
  variant = 'ghost',
  size = 'sm',
  className,
  showLabel = true,
  onClick,
  ...props
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    // Jika ada custom onClick handler, gunakan itu
    if (onClick) {
      onClick();
      return;
    }

    // Cek apakah ada history untuk kembali
    // Di PWA, window.history.length bisa digunakan untuk cek
    if (window.history.length > 1) {
      // Gunakan React Router navigate dengan -1 untuk kembali
      navigate(-1);
    } else {
      // Jika tidak ada history, navigasi ke fallback path
      navigate(fallbackPath, { replace: true });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleBack}
      className={cn('flex items-center space-x-2', className)}
      {...props}
    >
      <ArrowLeft className='w-4 h-4' />
      {showLabel && <span>Kembali</span>}
    </Button>
  );
};

export default BackButton;
