import { Image as ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from './button';
import { useToast } from './toast';

const ImageUpload = ({
  value,
  onChange,
  onRemove,
  placeholder = 'Upload gambar...',
  accept = 'image/*',
  maxSize = 2 * 1024 * 1024, // 2MB
  className = '',
  disabled = false,
  showPreview = true,
  aspectRatio = 'square', // square, 16:9, 4:3, etc.
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const validateFile = file => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('❌ File harus berupa gambar');
      return false;
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      toast.error(`❌ Ukuran file maksimal ${maxSizeMB}MB`);
      return false;
    }

    return true;
  };

  const handleFileSelect = async file => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    try {
      // Convert to base64 for preview
      const reader = new FileReader();
      reader.onload = e => {
        const base64 = e.target.result;
        onChange(base64);
        setIsUploading(false);
        toast.success('✅ Gambar berhasil diupload');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('❌ Gagal mengupload gambar');
      setIsUploading(false);
    }
  };

  const handleDrop = e => {
    e.preventDefault();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = e => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = e => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = e => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemove = () => {
    onChange('');
    onRemove?.();
    toast.success('✅ Gambar berhasil dihapus');
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '16:9':
        return 'aspect-video';
      case '4:3':
        return 'aspect-[4/3]';
      case 'square':
      default:
        return 'aspect-square';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${value ? 'border-green-300 bg-green-50' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type='file'
          accept={accept}
          onChange={handleFileInputChange}
          className='hidden'
          disabled={disabled}
        />

        {isUploading ? (
          <div className='flex flex-col items-center space-y-2'>
            <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
            <p className='text-sm text-gray-600'>Mengupload...</p>
          </div>
        ) : value ? (
          <div className='space-y-2'>
            <div
              className={`${getAspectRatioClass()} w-full max-w-40 mx-auto rounded-lg overflow-hidden bg-gray-100`}
            >
              <img
                src={value}
                alt='Preview'
                className='w-full h-full object-cover'
              />
            </div>
            <div className='flex justify-center space-x-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={e => {
                  e.stopPropagation();
                  handleClick();
                }}
                disabled={disabled}
              >
                <Upload className='w-4 h-4 mr-1' />
                Ganti
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={e => {
                  e.stopPropagation();
                  handleRemove();
                }}
                disabled={disabled}
                className='text-red-600 hover:text-red-700'
              >
                <X className='w-4 h-4 mr-1' />
                Hapus
              </Button>
            </div>
          </div>
        ) : (
          <div className='flex flex-col items-center space-y-2'>
            <div className='w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center'>
              <ImageIcon className='w-6 h-6 text-gray-400' />
            </div>
            <div>
              <p className='text-sm font-medium text-gray-900'>{placeholder}</p>
              <p className='text-xs text-gray-500 mt-1'>
                Drag & drop atau klik untuk upload
              </p>
              <p className='text-xs text-gray-400 mt-1'>
                PNG, JPG, GIF maksimal {(maxSize / (1024 * 1024)).toFixed(0)}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File Info */}
      {value && (
        <div className='text-xs text-gray-500 text-center'>
          <p>✅ Gambar siap digunakan</p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
