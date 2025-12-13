import { useRef, useState, useEffect } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import toast from 'react-hot-toast';

const FaceCapture = ({ onCapture, onClose, mode = 'register' }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const detectionIntervalRef = useRef(null);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        // Use CDN for models (more reliable than local files)
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        
        setModelsLoaded(true);
        setIsLoading(false);
        console.log('✅ Face API models loaded successfully');
      } catch (error) {
        console.error('Error loading models:', error);
        setError('Gagal memuat model pengenalan wajah. Pastikan koneksi internet stabil.');
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  // Start camera when models are loaded
  useEffect(() => {
    if (modelsLoaded && !isLoading) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [modelsLoaded, isLoading]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user' // Front camera
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          startFaceDetection();
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      if (error.name === 'NotAllowedError') {
        setError('Akses kamera ditolak. Silakan berikan izin kamera di pengaturan browser.');
      } else if (error.name === 'NotFoundError') {
        setError('Kamera tidak ditemukan. Pastikan perangkat memiliki kamera.');
      } else {
        setError('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.');
      }
    }
  };

  const stopCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startFaceDetection = () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

    setIsDetecting(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas size to match video
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    // Start detection loop
    detectionIntervalRef.current = setInterval(async () => {
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        // Clear canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw detections
        if (resizedDetections.length > 0) {
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
          setFaceDetected(true);
        } else {
          setFaceDetected(false);
        }
      } catch (error) {
        console.error('Error detecting face:', error);
      }
    }, 100); // Check every 100ms
  };

  const captureFace = async () => {
    if (!videoRef.current || !faceDetected || !modelsLoaded) {
      toast.error('Wajah belum terdeteksi. Pastikan wajah Anda terlihat jelas.');
      return;
    }

    try {
      const video = videoRef.current;
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        toast.error('Wajah tidak terdeteksi. Silakan coba lagi.');
        return;
      }

      if (detections.length > 1) {
        toast.error('Hanya satu wajah yang diizinkan. Pastikan hanya Anda yang terlihat.');
        return;
      }

      const detection = detections[0];
      const descriptor = Array.from(detection.descriptor);
      
      // Capture photo
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const photo = canvas.toDataURL('image/jpeg', 0.8);

      // Stop camera before calling callback
      stopCamera();

      onCapture({
        descriptor,
        photo,
      });
    } catch (error) {
      console.error('Error capturing face:', error);
      toast.error('Gagal menangkap wajah. Silakan coba lagi.');
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-center">Memuat model pengenalan wajah...</p>
            <p className="text-sm text-gray-500 text-center">
              Ini mungkin memakan waktu beberapa detik saat pertama kali
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const isCameraError = error.includes('Kamera tidak ditemukan') || 
                          error.includes('tidak dapat mengakses kamera') ||
                          error.includes('Akses kamera ditolak');
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-600 mb-2">Error</h3>
              <p className="text-gray-700 mb-4">{error}</p>
              {isCameraError && mode === 'verify' && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Perangkat tidak memiliki kamera?</strong> Anda dapat melanjutkan absensi tanpa verifikasi wajah.
                  </p>
                </div>
              )}
              <div className="flex space-x-2">
                <Button onClick={onClose} variant="outline">Tutup</Button>
                {isCameraError && mode === 'verify' && (
                  <Button 
                    onClick={() => {
                      stopCamera();
                      // Call onCapture with null to skip face verification
                      onCapture({ skip: true });
                    }} 
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Lanjutkan Tanpa Wajah
                  </Button>
                )}
                {!isCameraError && (
                  <Button onClick={() => {
                    setError(null);
                    setIsLoading(true);
                    startCamera();
                  }}>Coba Lagi</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {mode === 'register' ? 'Daftarkan Wajah' : 'Verifikasi Wajah'}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => {
            stopCamera();
            onClose();
          }}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-auto"
            style={{ transform: 'scaleX(-1)' }} // Mirror effect
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ transform: 'scaleX(-1)' }} // Mirror effect
          />
          
          {faceDetected && (
            <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-2 rounded-lg flex items-center space-x-2 shadow-lg">
              <Check className="w-4 h-4" />
              <span className="font-medium">Wajah Terdeteksi</span>
            </div>
          )}

          {!faceDetected && isDetecting && (
            <div className="absolute top-4 left-4 bg-yellow-500 text-white px-3 py-2 rounded-lg flex items-center space-x-2 shadow-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Cari Wajah...</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-center space-x-4">
          <Button
            onClick={captureFace}
            disabled={!faceDetected || !isDetecting}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            size="lg"
          >
            <Camera className="w-4 h-4 mr-2" />
            {mode === 'register' ? 'Daftarkan Wajah' : 'Verifikasi & Lanjutkan'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              stopCamera();
              onClose();
            }}
            size="lg"
          >
            Batal
          </Button>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Tips:</strong>
          </p>
          <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
            <li>Pastikan wajah Anda terlihat jelas dan pencahayaan cukup</li>
            <li>Jaga jarak sekitar 30-50 cm dari kamera</li>
            <li>Pastikan tidak ada orang lain di frame</li>
            <li>Hindari memakai masker atau kacamata hitam</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FaceCapture;

