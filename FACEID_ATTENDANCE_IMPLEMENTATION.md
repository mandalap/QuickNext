# Implementasi FaceID untuk Absensi

## 📋 Overview

Dokumen ini menjelaskan implementasi Face Recognition (FaceID) untuk sistem absensi. Fitur ini akan memungkinkan karyawan melakukan absensi menggunakan pengenalan wajah melalui webcam/camera.

## 🎯 Fitur yang Akan Ditambahkan

1. **Face Registration** - Pendaftaran wajah karyawan saat pertama kali
2. **Face Recognition** - Pengenalan wajah saat clock in/clock out
3. **Face Verification** - Verifikasi wajah untuk mencegah absensi palsu
4. **Photo Capture** - Menyimpan foto saat absensi sebagai bukti

## 🛠️ Teknologi yang Direkomendasikan

### Option 1: face-api.js (Recommended untuk Web)
- **Library**: `face-api.js`
- **Keuntungan**:
  - Client-side processing (privasi lebih baik)
  - Tidak perlu API key
  - Gratis dan open source
  - Bisa dijalankan offline
- **Kekurangan**:
  - Perlu download model files (~2-3MB)
  - Processing di browser (bisa lambat di device lama)

### Option 2: TensorFlow.js dengan Face Detection
- **Library**: `@tensorflow/tfjs` + `@tensorflow-models/face-landmarks-detection`
- **Keuntungan**:
  - Lebih akurat
  - Support untuk face landmarks
- **Kekurangan**:
  - Lebih kompleks
  - File size lebih besar

### Option 3: Cloud API (AWS Rekognition / Azure Face API)
- **Keuntungan**:
  - Sangat akurat
  - Tidak membebani client
- **Kekurangan**:
  - Perlu API key (berbayar)
  - Data wajah dikirim ke cloud (privasi)
  - Perlu internet

## 📦 Implementasi (Menggunakan face-api.js)

### 1. Install Dependencies

```bash
cd app/frontend
npm install face-api.js
```

### 2. Download Model Files

Model files perlu di-download dan disimpan di `public/models/`:
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1`

Atau gunakan CDN:
```javascript
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
```

### 3. Database Schema Update

Tambahkan field untuk menyimpan face descriptor:

```php
// Migration: add_face_descriptor_to_users_table.php
Schema::table('users', function (Blueprint $table) {
    $table->json('face_descriptor')->nullable()->after('photo');
    $table->boolean('face_registered')->default(false)->after('face_descriptor');
});

// Migration: add_face_photo_to_employee_shifts_table.php
Schema::table('employee_shifts', function (Blueprint $table) {
    $table->string('clock_in_photo')->nullable()->after('clock_in_longitude');
    $table->string('clock_out_photo')->nullable()->after('clock_out_longitude');
    $table->decimal('face_match_confidence', 5, 2)->nullable()->after('clock_out_photo');
});
```

### 4. Frontend Component: FaceCapture

Buat component baru: `app/frontend/src/components/attendance/FaceCapture.jsx`

```jsx
import { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, X, Check } from 'lucide-react';
import { Button } from '../ui/button';

const FaceCapture = ({ onCapture, onClose, mode = 'register' }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models'; // Or use CDN
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading models:', error);
        setError('Gagal memuat model pengenalan wajah');
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  // Start camera
  useEffect(() => {
    if (!isLoading) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isLoading]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user' // Front camera
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      detectFace();
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const detectFace = async () => {
    if (!videoRef.current || !canvasRef.current || isLoading) return;

    setIsDetecting(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };

    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      
      // Clear canvas
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw detections
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

      // Check if face detected
      if (detections.length > 0) {
        setFaceDetected(true);
      } else {
        setFaceDetected(false);
      }
    }, 100);
  };

  const captureFace = async () => {
    if (!videoRef.current || !faceDetected) return;

    try {
      const video = videoRef.current;
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length > 0) {
        const detection = detections[0];
        const descriptor = Array.from(detection.descriptor);
        
        // Capture photo
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const photo = canvas.toDataURL('image/jpeg', 0.8);

        onCapture({
          descriptor,
          photo,
        });

        stopCamera();
      }
    } catch (error) {
      console.error('Error capturing face:', error);
      setError('Gagal menangkap wajah');
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Memuat model pengenalan wajah...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={onClose}>Tutup</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {mode === 'register' ? 'Daftarkan Wajah' : 'Verifikasi Wajah'}
          </h2>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full rounded-lg"
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
          
          {faceDetected && (
            <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded">
              <Check className="w-4 h-4 inline mr-1" />
              Wajah Terdeteksi
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-center space-x-4">
          <Button
            onClick={captureFace}
            disabled={!faceDetected}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Camera className="w-4 h-4 mr-2" />
            {mode === 'register' ? 'Daftarkan' : 'Verifikasi'}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
        </div>

        <p className="text-sm text-gray-500 mt-4 text-center">
          {mode === 'register' 
            ? 'Pastikan wajah Anda terlihat jelas dan pencahayaan cukup'
            : 'Pastikan wajah Anda terlihat jelas untuk verifikasi'}
        </p>
      </div>
    </div>
  );
};

export default FaceCapture;
```

### 5. Update Attendance Service

Tambahkan method untuk face recognition:

```javascript
// app/frontend/src/services/attendance.service.js

/**
 * Register face descriptor for employee
 */
registerFace: async (descriptor, photo) => {
  try {
    const response = await apiClient.post('/v1/attendance/register-face', {
      face_descriptor: descriptor,
      photo: photo, // base64
    });
    return response.data;
  } catch (error) {
    console.error('Error registering face:', error);
    throw error;
  }
},

/**
 * Verify face for attendance
 */
verifyFace: async (descriptor, photo) => {
  try {
    const response = await apiClient.post('/v1/attendance/verify-face', {
      face_descriptor: descriptor,
      photo: photo, // base64
    });
    return response.data;
  } catch (error) {
    console.error('Error verifying face:', error);
    throw error;
  }
},
```

### 6. Backend API Endpoints

```php
// app/backend/app/Http/Controllers/Api/AttendanceController.php

/**
 * Register face descriptor
 */
public function registerFace(Request $request)
{
    $user = Auth::user();
    
    $validated = $request->validate([
        'face_descriptor' => 'required|array',
        'face_descriptor.*' => 'numeric',
        'photo' => 'required|string', // base64
    ]);

    // Save photo
    $photoPath = $this->savePhoto($validated['photo'], 'faces');

    // Save face descriptor
    $user->update([
        'face_descriptor' => json_encode($validated['face_descriptor']),
        'face_registered' => true,
        'photo' => $photoPath, // Update profile photo
    ]);

    return response()->json([
        'success' => true,
        'message' => 'Wajah berhasil didaftarkan',
    ]);
}

/**
 * Verify face for attendance
 */
public function verifyFace(Request $request)
{
    $user = Auth::user();
    
    $validated = $request->validate([
        'face_descriptor' => 'required|array',
        'face_descriptor.*' => 'numeric',
        'photo' => 'required|string', // base64
    ]);

    if (!$user->face_registered || !$user->face_descriptor) {
        return response()->json([
            'success' => false,
            'message' => 'Wajah belum didaftarkan',
        ], 400);
    }

    // Compare face descriptors
    $registeredDescriptor = json_decode($user->face_descriptor, true);
    $currentDescriptor = $validated['face_descriptor'];
    
    $distance = $this->euclideanDistance($registeredDescriptor, $currentDescriptor);
    $threshold = 0.6; // Adjust based on testing
    $isMatch = $distance < $threshold;
    $confidence = (1 - $distance) * 100;

    if (!$isMatch) {
        return response()->json([
            'success' => false,
            'message' => 'Wajah tidak cocok. Silakan coba lagi.',
            'confidence' => $confidence,
        ], 400);
    }

    // Save photo
    $photoPath = $this->savePhoto($validated['photo'], 'attendance');

    return response()->json([
        'success' => true,
        'message' => 'Wajah terverifikasi',
        'confidence' => $confidence,
        'photo_path' => $photoPath,
    ]);
}

/**
 * Calculate Euclidean distance between two face descriptors
 */
private function euclideanDistance($descriptor1, $descriptor2)
{
    $sum = 0;
    for ($i = 0; $i < count($descriptor1); $i++) {
        $sum += pow($descriptor1[$i] - $descriptor2[$i], 2);
    }
    return sqrt($sum);
}

/**
 * Save base64 photo to storage
 */
private function savePhoto($base64, $directory)
{
    $image = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $base64));
    $filename = time() . '_' . uniqid() . '.jpg';
    $path = "{$directory}/{$filename}";
    
    Storage::disk('public')->put($path, $image);
    
    return $path;
}
```

### 7. Update Clock In/Out dengan Face Verification

Update `Attendance.jsx` untuk menggunakan face verification:

```jsx
import FaceCapture from '../components/attendance/FaceCapture';

const handleClockIn = async () => {
  // ... existing validation ...

  // Show face capture modal
  setShowFaceCapture(true);
  setFaceCaptureMode('verify');
};

const handleFaceCaptured = async ({ descriptor, photo }) => {
  try {
    // Verify face
    const verifyResult = await attendanceService.verifyFace(descriptor, photo);
    
    if (!verifyResult.success) {
      toast.error(verifyResult.message || 'Verifikasi wajah gagal');
      return;
    }

    // Continue with clock in
    const clockInData = {
      shift_date: today,
      start_time: startTime,
      end_time: endTime,
      latitude: location?.latitude,
      longitude: location?.longitude,
      photo: verifyResult.photo_path, // Save photo path
      face_match_confidence: verifyResult.confidence,
    };

    const result = await attendanceService.clockIn(clockInData);
    // ... rest of clock in logic ...
  } catch (error) {
    toast.error('Gagal melakukan absensi');
  }
};
```

## 🔒 Keamanan & Privasi

1. **Data Encryption**: Face descriptor disimpan terenkripsi
2. **Photo Storage**: Foto absensi disimpan dengan akses terbatas
3. **Consent**: User harus setuju untuk menggunakan face recognition
4. **GDPR Compliance**: User bisa menghapus data wajah kapan saja

## 📊 Testing

1. **Accuracy Testing**: Test dengan berbagai kondisi pencahayaan
2. **Performance Testing**: Test kecepatan detection di berbagai device
3. **Security Testing**: Test dengan foto, video, atau wajah orang lain

## 🚀 Deployment

1. Download model files ke `public/models/`
2. Run migrations untuk menambah field database
3. Update API routes
4. Deploy frontend dan backend

## 📝 Catatan

- Threshold untuk face matching perlu di-tune berdasarkan testing
- Model files cukup besar (~2-3MB), pertimbangkan lazy loading
- Face recognition tidak 100% akurat, tetap perlu fallback ke metode lain
- Pertimbangkan untuk membuat face recognition sebagai optional feature

