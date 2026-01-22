<?php

namespace App\Services;

use Intervention\Image\Laravel\Facades\Image;
use Illuminate\Support\Facades\Storage;

class ImageOptimizationService
{
    /**
     * Optimize dan convert image ke WebP format
     *
     * @param \Illuminate\Http\UploadedFile $file
     * @param string $directory Directory tujuan (contoh: 'products', 'categories')
     * @param int $maxWidth Lebar maksimal image (default: 800px)
     * @param int $quality Quality untuk WebP (default: 80)
     * @return string Path to saved image
     */
    public function optimizeAndSave($file, $directory, $maxWidth = 800, $quality = 80)
    {
        // Generate unique filename dengan WebP extension
        $filename = time() . '_' . uniqid() . '.webp';
        $fullPath = public_path("storage/{$directory}/{$filename}");

        // Pastikan directory exists
        if (!file_exists(public_path("storage/{$directory}"))) {
            mkdir(public_path("storage/{$directory}"), 0755, true);
        }

        // Load image dengan Intervention
        $image = Image::read($file);

        // Resize jika lebih besar dari maxWidth (maintain aspect ratio)
        if ($image->width() > $maxWidth) {
            $image->scale(width: $maxWidth);
        }

        // Convert dan save sebagai WebP dengan compression
        $image->toWebp($quality)->save($fullPath);

        // Return relative path untuk disimpan di database
        return "storage/{$directory}/{$filename}";
    }

    /**
     * Optimize dan save dengan multiple sizes (thumbnail, medium, large)
     * Useful untuk responsive images
     *
     * @param \Illuminate\Http\UploadedFile $file
     * @param string $directory
     * @return array Array of paths: ['original' => ..., 'thumbnail' => ..., 'medium' => ...]
     */
    public function optimizeWithMultipleSizes($file, $directory)
    {
        $baseFilename = time() . '_' . uniqid();
        $directory_path = public_path("storage/{$directory}");

        // Pastikan directory exists
        if (!file_exists($directory_path)) {
            mkdir($directory_path, 0755, true);
        }

        $sizes = [
            'thumbnail' => ['width' => 150, 'quality' => 70],
            'medium' => ['width' => 400, 'quality' => 80],
            'large' => ['width' => 800, 'quality' => 85],
        ];

        $paths = [];

        foreach ($sizes as $size => $config) {
            $filename = "{$baseFilename}_{$size}.webp";
            $fullPath = "{$directory_path}/{$filename}";

            $image = Image::read($file);
            $image->scale(width: $config['width']);
            $image->toWebp($config['quality'])->save($fullPath);

            $paths[$size] = "storage/{$directory}/{$filename}";
        }

        // Return path medium sebagai default
        return [
            'paths' => $paths,
            'default' => $paths['medium']
        ];
    }

    /**
     * Delete image file
     *
     * @param string $path Relative path dari public directory (bisa dengan atau tanpa 'storage/' prefix)
     * @return bool
     */
    public function deleteImage($path)
    {
        if (!$path) {
            return false;
        }

        // ✅ FIX: Handle both formats (with or without 'storage/' prefix)
        // Database bisa menyimpan: "storage/products/xxx.webp" atau "products/xxx.webp"
        $cleanPath = str_replace('storage/', '', $path);
        
        // Try multiple possible locations
        $possiblePaths = [
            public_path("storage/{$cleanPath}"),  // Standard Laravel storage symlink
            storage_path("app/public/{$cleanPath}"),  // Actual storage location
            public_path($path),  // Original path (backward compatibility)
        ];

        foreach ($possiblePaths as $fullPath) {
            if (file_exists($fullPath)) {
                try {
                    unlink($fullPath);
                    \Log::info('Image deleted successfully', [
                        'original_path' => $path,
                        'deleted_path' => $fullPath
                    ]);
                    return true;
                } catch (\Exception $e) {
                    \Log::error('Failed to delete image', [
                        'path' => $fullPath,
                        'error' => $e->getMessage()
                    ]);
                }
            }
        }

        // Log if image not found (might be already deleted or path incorrect)
        \Log::warning('Image file not found for deletion', [
            'original_path' => $path,
            'clean_path' => $cleanPath,
            'tried_paths' => $possiblePaths
        ]);

        return false;
    }

    /**
     * Delete multiple size images (jika menggunakan optimizeWithMultipleSizes)
     *
     * @param array $paths Array of image paths
     * @return bool
     */
    public function deleteMultipleImages($paths)
    {
        $success = true;

        foreach ($paths as $path) {
            if (!$this->deleteImage($path)) {
                $success = false;
            }
        }

        return $success;
    }
}
