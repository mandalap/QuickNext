import React, { useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/button';

const ImageUpload = ({ value, onChange, onRemove, className = '' }) => {
  const [preview, setPreview] = useState(value || null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Pass file to parent
      if (onChange) {
        onChange(file);
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className={`${className}`}>
      <label className="block mb-2 text-sm font-medium text-gray-700">
        Gambar (Opsional)
      </label>

      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="object-cover w-32 h-32 border rounded-lg"
          />
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="absolute p-1 -top-2 -right-2"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <ImageIcon className="w-8 h-8 mb-2 text-gray-400" />
            <p className="text-xs text-gray-500">Upload</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>
      )}
      <p className="mt-2 text-xs text-gray-500">
        JPG, PNG, GIF, WEBP (Max 2MB)
      </p>
    </div>
  );
};

export default ImageUpload;
