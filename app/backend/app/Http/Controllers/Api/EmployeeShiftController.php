<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeShift;
use App\Models\Outlet;
use App\Models\Employee;
use App\Models\Business;
use App\Models\User;
use App\Helpers\SubscriptionHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class EmployeeShiftController extends Controller
{
    /**
     * Check attendance access before processing request
     */
    private function checkAttendanceAccess($user)
    {
        if (!SubscriptionHelper::hasAttendanceAccess($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Akses Absensi memerlukan paket Premium. Silakan upgrade paket Anda.',
                'error' => 'subscription_feature_required',
                'required_feature' => 'has_attendance_access',
                'redirect_to' => '/subscription-settings'
            ], 403);
        }
        return null;
    }
    /**
     * Calculate distance between two coordinates (Haversine formula)
     * Returns distance in meters
     */
    private function calculateDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371000; // Earth radius in meters

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Validate GPS location against outlet location
     */
    private function validateLocation($outletId, $latitude, $longitude)
    {
        $outlet = Outlet::find($outletId);

        if (!$outlet) {
            return [
                'valid' => false,
                'message' => 'Outlet tidak ditemukan'
            ];
        }

        // ✅ NEW: Check if GPS is required for this outlet
        $gpsRequired = $outlet->attendance_gps_required ?? false;

        // ✅ FIX: If GPS is required but coordinates are null, reject
        if ($gpsRequired && ($latitude === null || $longitude === null)) {
            return [
                'valid' => false,
                'message' => 'GPS wajib untuk absensi di outlet ini. Pastikan GPS aktif dan izinkan akses lokasi.',
                'distance' => null
            ];
        }

        // If outlet doesn't have GPS coordinates
        if (!$outlet->latitude || !$outlet->longitude) {
            // If GPS is required, outlet must have coordinates
            if ($gpsRequired) {
                return [
                    'valid' => false,
                    'message' => 'Outlet belum dikonfigurasi dengan koordinat GPS. Silakan hubungi admin untuk mengatur koordinat outlet.',
                    'distance' => null
                ];
            }
            // If GPS is not required, allow attendance (backward compatibility)
            return [
                'valid' => true,
                'message' => 'Outlet belum memiliki koordinat GPS, absensi diizinkan',
                'distance' => null
            ];
        }

        // If GPS is not required and coordinates are null, allow (backward compatibility)
        if (!$gpsRequired && ($latitude === null || $longitude === null)) {
            return [
                'valid' => true,
                'message' => 'Validasi GPS tidak wajib, absensi diizinkan',
                'distance' => null
            ];
        }

        // Validate distance
        $distance = $this->calculateDistance(
            $outlet->latitude,
            $outlet->longitude,
            $latitude,
            $longitude
        );

        $radius = $outlet->attendance_radius ?? 100; // Default 100 meters

        if ($distance <= $radius) {
            return [
                'valid' => true,
                'message' => 'Lokasi valid',
                'distance' => round($distance, 2)
            ];
        } else {
            return [
                'valid' => false,
                'message' => "Lokasi terlalu jauh. Jarak: " . round($distance, 2) . "m (maksimal: {$radius}m)",
                'distance' => round($distance, 2)
            ];
        }
    }

    /**
     * Get employee shifts
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        // ✅ FIX: Check attendance access
        $accessCheck = $this->checkAttendanceAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            $startTime = microtime(true);
            $businessId = $request->header('X-Business-Id');
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID required'
                ], 400);
            }

            Log::info('Fetching employee shifts', [
                'user_id' => $user->id,
                'business_id' => $businessId,
                'outlet_id' => $outletId,
                'start_date' => $request->input('start_date'),
                'end_date' => $request->input('end_date'),
            ]);

            // ✅ OPTIMIZATION: Build query with selective fields and eager loading
            $query = EmployeeShift::where('business_id', $businessId)
                ->select([
                    'id', 'business_id', 'outlet_id', 'user_id', 'shift_date',
                    'start_time', 'end_time', 'clock_in', 'clock_out',
                    'clock_in_latitude', 'clock_in_longitude',
                    'clock_out_latitude', 'clock_out_longitude',
                    'status', 'notes', 'created_at', 'updated_at'
                ]);

            if ($outletId) {
                $query->where('outlet_id', $outletId);
            }

            // Filter by user if not admin/owner
            if (!in_array($user->role, ['super_admin', 'owner', 'admin'])) {
                $query->where('user_id', $user->id);
            } elseif ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            // Filter by date range
            if ($request->has('start_date') && $request->has('end_date')) {
                // ✅ OPTIMIZATION: Limit date range to prevent huge queries
                $startDate = Carbon::parse($request->start_date);
                $endDate = Carbon::parse($request->end_date);

                // Limit to max 7 days for history (since frontend requests last 7 days)
                if ($endDate->diffInDays($startDate) > 7) {
                    $endDate = $startDate->copy()->addDays(7);
                }

                $query->whereBetween('shift_date', [
                    $startDate->format('Y-m-d'),
                    $endDate->format('Y-m-d')
                ]);
            } elseif ($request->has('date')) {
                $query->whereDate('shift_date', $request->date);
            } else {
                // ✅ OPTIMIZATION: Default to last 7 days (matching frontend request)
                $query->whereBetween('shift_date', [
                    now()->subDays(7)->format('Y-m-d'),
                    now()->format('Y-m-d')
                ]);
            }

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // ✅ OPTIMIZATION: Limit results first, then eager load
            $limit = $request->input('limit', 20); // Reduced from 50 to 20 for faster queries
            $shifts = $query->orderBy('shift_date', 'desc')
                          ->orderBy('start_time', 'desc')
                          ->limit($limit)
                          ->get();

            // ✅ OPTIMIZATION: Eager load relationships only for the limited results
            $shifts->load([
                'user:id,name,email',
                'outlet:id,name,business_id'
            ]);

            $executionTime = round((microtime(true) - $startTime) * 1000, 2);
            Log::info('Employee shifts fetched', [
                'count' => $shifts->count(),
                'execution_time_ms' => $executionTime,
            ]);

            return response()->json([
                'success' => true,
                'data' => $shifts
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching employee shifts: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error fetching employee shifts: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clock in (check in)
     */
    public function clockIn(Request $request)
    {
        $user = Auth::user();

        // ✅ FIX: Check attendance access
        $accessCheck = $this->checkAttendanceAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            $businessId = $request->header('X-Business-Id');
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId || !$outletId) {
                return response()->json([
                    'success' => false,
                    'message' => '⚠️ Business ID dan Outlet ID diperlukan. Pastikan Business dan Outlet sudah dipilih.',
                    'error' => 'Business ID and Outlet ID required'
                ], 400);
            }

            // Convert to integers and validate
            $businessId = (int) $businessId;
            $outletId = (int) $outletId;

            // Validate that business exists
            $business = Business::find($businessId);
            if (!$business) {
                return response()->json([
                    'success' => false,
                    'message' => '⚠️ Business tidak ditemukan. Pastikan Business ID valid.',
                    'error' => 'Business not found'
                ], 404);
            }

            // Validate that outlet exists and belongs to the business
            $outlet = Outlet::where('id', $outletId)
                ->where('business_id', $businessId)
                ->first();

            if (!$outlet) {
                return response()->json([
                    'success' => false,
                    'message' => '⚠️ Outlet tidak ditemukan atau tidak terhubung dengan Business yang dipilih.',
                    'error' => 'Outlet not found or does not belong to business'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'shift_date' => 'required|date',
                'start_time' => 'required|date_format:H:i',
                'end_time' => [
                    'required',
                    'date_format:H:i',
                    function ($attribute, $value, $fail) use ($request) {
                        // Custom validation to support overnight shifts
                        $startTime = $request->start_time;
                        $endTime = $value;

                        if (!$startTime || !$endTime) {
                            return;
                        }

                        // Parse times
                        list($startHour, $startMin) = explode(':', $startTime);
                        list($endHour, $endMin) = explode(':', $endTime);

                        $startMinutes = (int)$startHour * 60 + (int)$startMin;
                        $endMinutes = (int)$endHour * 60 + (int)$endMin;

                        // If end time is earlier than start time, it's an overnight shift (next day)
                        // This is valid (e.g., 20:00 - 05:00)
                        // Only fail if end time equals start time
                        if ($endMinutes === $startMinutes) {
                            $fail('Jam keluar harus berbeda dengan jam masuk.');
                        }
                        // If end time is much later (more than 24 hours), it's invalid
                        // But we allow overnight shifts, so we only check if it's exactly the same
                    }
                ],
                'latitude' => 'required|numeric|between:-90,90',
                'longitude' => 'required|numeric|between:-180,180',
                'notes' => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                $errors = $validator->errors();
                $errorMessages = $errors->all();
                return response()->json([
                    'success' => false,
                    'message' => '⚠️ Validasi gagal: ' . implode(', ', $errorMessages),
                    'error' => 'Validation error',
                    'errors' => $errors
                ], 422);
            }

            // Validate GPS location
            $locationValidation = $this->validateLocation(
                $outletId,
                $request->latitude,
                $request->longitude
            );

            if (!$locationValidation['valid']) {
                return response()->json([
                    'success' => false,
                    'message' => '⚠️ ' . $locationValidation['message'],
                    'error' => $locationValidation['message'],
                    'distance' => $locationValidation['distance'] ?? null
                ], 400);
            }

            DB::beginTransaction();

            // ✅ NEW: Check if there's an active shift (not checked out) that's still ongoing
            // Auto-checkout shifts that have passed their end_time
            $now = Carbon::now();
            $activeShifts = EmployeeShift::where('user_id', $user->id)
                ->where('outlet_id', $outletId)
                ->where('business_id', $businessId)
                ->whereNotNull('clock_in') // Must have clocked in
                ->whereNull('clock_out') // Must not have clocked out
                ->where('status', '!=', 'completed') // Status should not be completed
                ->get();

            $stillActiveShift = null;
            foreach ($activeShifts as $shift) {
                // Check if shift is still active based on end_time
                $shiftDate = Carbon::parse($shift->shift_date);
                $endTime = Carbon::parse($shiftDate->format('Y-m-d') . ' ' . $shift->end_time);

                // If end_time is earlier than start_time, it's an overnight shift (next day)
                $startTime = Carbon::parse($shiftDate->format('Y-m-d') . ' ' . $shift->start_time);
                if ($endTime->lt($startTime)) {
                    $endTime->addDay(); // Add one day for overnight shifts
                }

                // ✅ AUTO-CHECKOUT: If shift end_time has passed, automatically checkout
                if ($now->gte($endTime)) {
                    // Auto-checkout this shift
                    $clockOutTime = $endTime->format('H:i:s');

                    // Calculate working hours
                    $clockIn = Carbon::parse($shiftDate->format('Y-m-d') . ' ' . $shift->clock_in);
                    $clockOut = Carbon::parse($shiftDate->format('Y-m-d') . ' ' . $clockOutTime);
                    if ($clockOut->lt($clockIn)) {
                        $clockOut->addDay();
                    }
                    $workingHours = $clockIn->diffInMinutes($clockOut) / 60;

                    $shift->update([
                        'clock_out' => $clockOutTime,
                        'clock_out_latitude' => $shift->clock_in_latitude, // Use same location as clock in
                        'clock_out_longitude' => $shift->clock_in_longitude,
                        'status' => 'completed',
                    ]);

                    Log::info('Auto-checkout shift', [
                        'shift_id' => $shift->id,
                        'user_id' => $user->id,
                        'shift_date' => $shift->shift_date,
                        'end_time' => $shift->end_time,
                        'clock_out' => $clockOutTime,
                    ]);
                } else {
                    // Shift is still active
                    $stillActiveShift = $shift;
                    break; // Found active shift, no need to continue
                }
            }

            // If there's still an active shift (hasn't passed end_time), prevent new check-in
            if ($stillActiveShift) {
                DB::rollBack();
                $shiftDate = Carbon::parse($stillActiveShift->shift_date)->format('d/m/Y');
                return response()->json([
                    'success' => false,
                    'message' => "⚠️ Anda masih memiliki shift aktif yang belum di-checkout!\n\nShift aktif:\n- Tanggal: {$shiftDate}\n- Jam: {$stillActiveShift->start_time} - {$stillActiveShift->end_time}\n- Check In: {$stillActiveShift->clock_in}\n\nSilakan lakukan checkout terlebih dahulu sebelum memulai shift baru."
                ], 400);
            }

            // Check if shift already exists for this date and user
            $existingShift = EmployeeShift::where('user_id', $user->id)
                ->where('outlet_id', $outletId)
                ->whereDate('shift_date', $request->shift_date)
                ->where('start_time', $request->start_time)
                ->first();

            if ($existingShift) {
                // Update existing shift
                $clockInTime = now()->format('H:i:s');

                // ✅ AUTO-CHECKOUT: If shift already has clock_in but no clock_out, and end_time has passed, auto-checkout first
                if ($existingShift->clock_in && !$existingShift->clock_out) {
                    $shiftDate = Carbon::parse($existingShift->shift_date);
                    $endTime = Carbon::parse($shiftDate->format('Y-m-d') . ' ' . $existingShift->end_time);
                    $startTime = Carbon::parse($shiftDate->format('Y-m-d') . ' ' . $existingShift->start_time);

                    // Handle overnight shifts
                    if ($endTime->lt($startTime)) {
                        $endTime->addDay();
                    }

                    // If end_time has passed, auto-checkout
                    if ($now->gte($endTime)) {
                        $clockOutTime = $endTime->format('H:i:s');
                        $existingShift->update([
                            'clock_out' => $clockOutTime,
                            'clock_out_latitude' => $existingShift->clock_in_latitude,
                            'clock_out_longitude' => $existingShift->clock_in_longitude,
                            'status' => 'completed',
                        ]);

                        Log::info('Auto-checkout existing shift before new clock-in', [
                            'shift_id' => $existingShift->id,
                            'user_id' => $user->id,
                        ]);

                        // Continue to create new clock-in for this shift (will create new shift record)
                    } else {
                        // Shift is still active, cannot clock in again
                        DB::rollBack();
                        return response()->json([
                            'success' => false,
                            'message' => 'Anda sudah melakukan clock in untuk shift ini. Silakan lakukan checkout terlebih dahulu.'
                        ], 400);
                    }
                } else if ($existingShift->clock_in && $existingShift->clock_out) {
                    // ✅ FIX: Shift already completed, create NEW shift record instead of updating
                    // Don't update existing completed shift, create a new one
                    $existingShift = null; // Reset to null so it creates new shift below
                }

                // ✅ FIX: Only update if shift exists and is not completed
                if ($existingShift && !$existingShift->clock_out) {
                    // Determine status based on clock in time
                    $shiftStartTime = Carbon::parse($request->shift_date . ' ' . $request->start_time);
                    $clockInDateTime = Carbon::parse($request->shift_date . ' ' . $clockInTime);
                    $isLate = $clockInDateTime->gt($shiftStartTime->copy()->addMinutes(15)); // 15 minutes tolerance

                    $updateData = [
                        'clock_in' => $clockInTime,
                        'clock_in_latitude' => $request->latitude,
                        'clock_in_longitude' => $request->longitude,
                        'status' => $isLate ? 'late' : 'ongoing',
                        'notes' => $request->notes ?? $existingShift->notes,
                    ];

                    // ✅ NEW: Save clock in photo if provided
                    if ($request->has('clock_in_photo')) {
                        $photoPath = $this->savePhoto($request->clock_in_photo, 'attendance');
                        $updateData['clock_in_photo'] = $photoPath;
                    }

                    // ✅ NEW: Save face match confidence if provided
                    if ($request->has('face_match_confidence')) {
                        $updateData['face_match_confidence'] = $request->face_match_confidence;
                    }

                    $existingShift->update($updateData);

                    $shift = $existingShift->fresh();
                }
            }

            // ✅ FIX: Create new shift if no existing shift, or existing shift is completed
            if (!isset($shift) || !$shift) {
                // Create new shift
                $clockInTime = now()->format('H:i:s');
                $shiftStartTime = Carbon::parse($request->shift_date . ' ' . $request->start_time);
                $clockInDateTime = Carbon::parse($request->shift_date . ' ' . $clockInTime);
                $isLate = $clockInDateTime->gt($shiftStartTime->copy()->addMinutes(15));

                $shift = EmployeeShift::create([
                    'business_id' => $businessId,
                    'outlet_id' => $outletId,
                    'user_id' => $user->id,
                    'shift_date' => $request->shift_date,
                    'start_time' => $request->start_time,
                    'end_time' => $request->end_time,
                    'clock_in' => $clockInTime,
                    'clock_in_latitude' => $request->latitude,
                    'clock_in_longitude' => $request->longitude,
                    'status' => $isLate ? 'late' : 'ongoing',
                    'notes' => $request->notes,
                ]);

                // ✅ NEW: Save clock in photo if provided
                if ($request->has('clock_in_photo')) {
                    $photoPath = $this->savePhoto($request->clock_in_photo, 'attendance');
                    $shift->update(['clock_in_photo' => $photoPath]);
                }

                // ✅ NEW: Save face match confidence if provided
                if ($request->has('face_match_confidence')) {
                    $shift->update(['face_match_confidence' => $request->face_match_confidence]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Clock in berhasil',
                'data' => $shift->load(['user', 'outlet']),
                'location' => [
                    'valid' => true,
                    'distance' => $locationValidation['distance'],
                    'message' => $locationValidation['message']
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error clocking in: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error clocking in: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clock out (check out)
     */
    public function clockOut(Request $request, $shiftId)
    {
        $user = Auth::user();

        // ✅ FIX: Check attendance access
        $accessCheck = $this->checkAttendanceAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            $businessId = $request->header('X-Business-Id');
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId || !$outletId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID and Outlet ID required'
                ], 400);
            }

            // Convert to integers and validate
            $businessId = (int) $businessId;
            $outletId = (int) $outletId;

            // Validate that business exists
            $business = Business::find($businessId);
            if (!$business) {
                return response()->json([
                    'success' => false,
                    'message' => '⚠️ Business tidak ditemukan. Pastikan Business ID valid.',
                    'error' => 'Business not found'
                ], 404);
            }

            // Validate that outlet exists and belongs to the business
            $outlet = Outlet::where('id', $outletId)
                ->where('business_id', $businessId)
                ->first();

            if (!$outlet) {
                return response()->json([
                    'success' => false,
                    'message' => '⚠️ Outlet tidak ditemukan atau tidak terhubung dengan Business yang dipilih.',
                    'error' => 'Outlet not found or does not belong to business'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'latitude' => 'required|numeric|between:-90,90',
                'longitude' => 'required|numeric|between:-180,180',
                'notes' => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Validate GPS location
            $locationValidation = $this->validateLocation(
                $outletId,
                $request->latitude,
                $request->longitude
            );

            if (!$locationValidation['valid']) {
                return response()->json([
                    'success' => false,
                    'message' => $locationValidation['message'],
                    'distance' => $locationValidation['distance'] ?? null
                ], 400);
            }

            $shift = EmployeeShift::where('id', $shiftId)
                ->where('business_id', $businessId)
                ->where('outlet_id', $outletId)
                ->first();

            if (!$shift) {
                return response()->json([
                    'success' => false,
                    'message' => 'Shift tidak ditemukan'
                ], 404);
            }

            // Check if user owns this shift or is admin
            if ($shift->user_id !== $user->id && !in_array($user->role, ['super_admin', 'owner', 'admin'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki akses untuk shift ini'
                ], 403);
            }

            // Check if already clocked out
            if ($shift->clock_out) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda sudah melakukan clock out untuk shift ini'
                ], 400);
            }

            // Check if clocked in
            if (!$shift->clock_in) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda belum melakukan clock in'
                ], 400);
            }

            DB::beginTransaction();

            $clockOutTime = now()->format('H:i:s');

            // Calculate working hours - handle overnight shifts
            $clockInTime = $shift->clock_in;

            // Ensure clock_in is in string format (H:i:s)
            if ($clockInTime instanceof \DateTime || $clockInTime instanceof \Carbon\Carbon) {
                $clockInTime = $clockInTime->format('H:i:s');
            } elseif (is_string($clockInTime)) {
                // If already string, ensure it's in H:i:s format
                $parts = explode(':', $clockInTime);
                if (count($parts) >= 2) {
                    $clockInTime = sprintf('%02d:%02d:%02d',
                        (int)$parts[0],
                        (int)$parts[1],
                        isset($parts[2]) ? (int)$parts[2] : 0
                    );
                }
            }

            // Parse dates for calculation
            // Ensure shift_date is in date format (Y-m-d) only
            $shiftDate = $shift->shift_date;
            if ($shiftDate instanceof \DateTime || $shiftDate instanceof \Carbon\Carbon) {
                $shiftDate = $shiftDate->format('Y-m-d');
            } elseif (is_string($shiftDate)) {
                // If contains time or datetime, extract only date part
                if (strpos($shiftDate, ' ') !== false) {
                    $shiftDate = explode(' ', $shiftDate)[0];
                }
                // Ensure it's in Y-m-d format
                try {
                    $parsedDate = Carbon::parse($shiftDate);
                    $shiftDate = $parsedDate->format('Y-m-d');
                } catch (\Exception $e) {
                    // If parsing fails, use as is
                    Log::warning('Failed to parse shift_date: ' . $shiftDate);
                }
            }

            // Parse clock in and clock out times
            $clockIn = Carbon::parse($shiftDate . ' ' . $clockInTime);
            $clockOut = Carbon::parse($shiftDate . ' ' . $clockOutTime);

            // If clock out time is earlier than clock in time, it's next day (overnight shift)
            if ($clockOut->lt($clockIn)) {
                $clockOut->addDay();
            }

            $workingHours = $clockIn->diffInMinutes($clockOut) / 60;

            // Update notes if provided
            $notes = $request->notes ?? $shift->notes;
            if ($request->notes && $shift->notes) {
                $notes = $shift->notes . "\n" . $request->notes;
            }

            $updateData = [
                'clock_out' => $clockOutTime,
                'clock_out_latitude' => $request->latitude,
                'clock_out_longitude' => $request->longitude,
                'status' => 'completed',
                'notes' => $notes,
            ];

            // ✅ NEW: Save clock out photo if provided
            if ($request->has('photo') || $request->has('clock_out_photo')) {
                $photoData = $request->input('photo') ?? $request->input('clock_out_photo');
                $photoPath = $this->savePhoto($photoData, 'attendance');
                $updateData['clock_out_photo'] = $photoPath;
            }

            // ✅ NEW: Save face match confidence if provided
            if ($request->has('face_match_confidence')) {
                $updateData['face_match_confidence'] = $request->face_match_confidence;
            }

            $shift->update($updateData);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Clock out berhasil',
                'data' => $shift->fresh()->load(['user', 'outlet']),
                'working_hours' => round($workingHours, 2),
                'location' => [
                    'valid' => true,
                    'distance' => $locationValidation['distance'] ?? null,
                    'message' => $locationValidation['message'] ?? 'Lokasi valid'
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error clocking out: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error clocking out: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get today's shift for current user
     * Also includes active shifts from previous day (e.g., night shifts that haven't ended)
     */
    public function getTodayShift(Request $request)
    {
        $user = Auth::user();

        // ✅ FIX: Check attendance access
        $accessCheck = $this->checkAttendanceAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            $businessId = $request->header('X-Business-Id');
            $outletId = $request->header('X-Outlet-Id');

            // ✅ FIX: Better error message for missing headers
            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => '⚠️ Business ID diperlukan. Pastikan Business sudah dipilih.',
                    'error' => 'Business ID required'
                ], 400);
            }

            $now = Carbon::now();
            $today = $now->format('Y-m-d');
            $yesterday = $now->copy()->subDay()->format('Y-m-d');

            // ✅ OPTIMIZATION: Simplified query - find any shift for today with clock_in
            // This is faster and covers most use cases
            $query = EmployeeShift::where('business_id', $businessId)
                ->where('user_id', $user->id)
                ->whereDate('shift_date', $today)
                ->whereNotNull('clock_in') // Must have clocked in
                ->with(['user', 'outlet']);

            if ($outletId) {
                $query->where('outlet_id', $outletId);
            }

            // Prioritize active shifts (not checked out) over completed ones
            $todayShift = $query->whereNull('clock_out')
                ->orderBy('start_time', 'desc')
                ->first();

            // If no active shift, get any shift for today (including completed)
            if (!$todayShift) {
                $todayShift = $query->orderBy('start_time', 'desc')->first();
            }

            // ✅ NEW: If no shift found for today, check for active shift from yesterday (night shift)
            // This handles cases where user clocked in yesterday night and shift ends today morning
            if (!$todayShift) {
                $yesterdayQuery = EmployeeShift::where('business_id', $businessId)
                    ->where('user_id', $user->id)
                    ->whereDate('shift_date', $yesterday)
                    ->whereNotNull('clock_in') // Must have clocked in
                    ->whereNull('clock_out') // Must not have clocked out
                    ->where('status', '!=', 'completed') // Status should not be completed
                    ->with(['user', 'outlet']);

                if ($outletId) {
                    $yesterdayQuery->where('outlet_id', $outletId);
                }

                $yesterdayShifts = $yesterdayQuery->orderBy('start_time', 'desc')->get();

                // Filter to find shifts that are still active (end_time hasn't passed)
                foreach ($yesterdayShifts as $shift) {
                    $shiftDate = Carbon::parse($shift->shift_date);
                    $endTime = Carbon::parse($shiftDate->format('Y-m-d') . ' ' . $shift->end_time);

                    // If end_time is earlier than start_time, it's an overnight shift (next day)
                    $startTime = Carbon::parse($shiftDate->format('Y-m-d') . ' ' . $shift->start_time);
                    if ($endTime->lt($startTime)) {
                        $endTime->addDay(); // Add one day for overnight shifts
                    }

                    // Shift is still active if current time is before end_time
                    if ($now->lt($endTime)) {
                        $todayShift = $shift;
                        break; // Use the first active shift found
                    }
                }
            }

            return response()->json([
                'success' => true,
                'data' => $todayShift
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching today shift: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching today shift: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update shift status to absent if end_time has passed and no clock_in
     */
    private function updateAbsentShifts($query)
    {
        $now = now();
        $shifts = (clone $query)
            ->whereNull('clock_in')
            ->where('status', '!=', 'absent')
            ->get();

        foreach ($shifts as $shift) {
            try {
                // Parse shift date and end time
                $shiftDate = $shift->shift_date;
                if ($shiftDate instanceof \DateTime || $shiftDate instanceof \Carbon\Carbon) {
                    $shiftDate = $shiftDate->format('Y-m-d');
                } elseif (is_string($shiftDate) && strpos($shiftDate, ' ') !== false) {
                    $shiftDate = explode(' ', $shiftDate)[0];
                }

                $endTime = $shift->end_time;
                if (!$endTime) continue;

                // Handle overnight shifts (end_time < start_time means next day)
                $startTime = $shift->start_time;
                $shiftEndDateTime = Carbon::parse($shiftDate . ' ' . $endTime);

                // If end_time is earlier than start_time, it's next day
                if ($startTime && Carbon::parse($shiftDate . ' ' . $startTime)->gt($shiftEndDateTime)) {
                    $shiftEndDateTime->addDay();
                }

                // If current time is past end_time, mark as absent
                if ($now->gt($shiftEndDateTime)) {
                    $shift->update(['status' => 'absent']);
                }
            } catch (\Exception $e) {
                Log::warning('Error updating absent shift: ' . $e->getMessage());
                continue;
            }
        }
    }

    /**
     * Calculate absent employees who never clocked in (no shift record)
     */
    private function calculateAbsentWithoutShift($businessId, $outletId, $startDate, $endDate, $userFilter = null)
    {
        $now = now();
        $absentCount = 0;

        try {
            // ✅ FIX: Limit calculation to max 30 days to prevent huge numbers
            $daysDiff = Carbon::parse($endDate)->diffInDays(Carbon::parse($startDate));
            if ($daysDiff > 30) {
                // For periods longer than 30 days, only calculate for last 30 days
                // This prevents unrealistic absent counts (e.g., 365 days × employees)
                Log::info('Period too long for absent calculation, limiting to last 30 days', [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'days_diff' => $daysDiff
                ]);
                $startDate = Carbon::parse($endDate)->subDays(30)->format('Y-m-d');
            }

            // Get active employees for this business/outlet
            $employeeQuery = Employee::where('business_id', $businessId)
                ->where('is_active', true)
                ->with('user');

            // Get users assigned to outlet if outlet specified
            if ($outletId) {
                $outletEmployeeIds = \DB::table('employee_outlets')
                    ->where('outlet_id', $outletId)
                    ->pluck('user_id')
                    ->toArray();

                if (!empty($outletEmployeeIds)) {
                    $employeeQuery->whereIn('user_id', $outletEmployeeIds);
                } else {
                    // If no employees assigned to outlet, return 0
                    return 0;
                }
            }

            // Apply user filter if specified
            if ($userFilter) {
                $employeeQuery->where('user_id', $userFilter);
            }

            $employees = $employeeQuery->get();

            if ($employees->isEmpty()) {
                return 0;
            }

            // Get outlet shift times (default shift end times)
            $outlet = $outletId ? \App\Models\Outlet::find($outletId) : null;
            $defaultShiftEnds = [];

            if ($outlet) {
                // Get all shift end times from outlet config
                if ($outlet->shift_pagi_end) {
                    $defaultShiftEnds[] = $outlet->shift_pagi_end;
                }
                if ($outlet->shift_siang_end) {
                    $defaultShiftEnds[] = $outlet->shift_siang_end;
                }
                if ($outlet->shift_malam_end) {
                    $defaultShiftEnds[] = $outlet->shift_malam_end;
                }
            }

            // Default to 17:00 if no shift config
            if (empty($defaultShiftEnds)) {
                $defaultShiftEnds = ['17:00:00'];
            }

            // ✅ FIX: Only count weekdays (Monday-Friday) to avoid counting weekends
            // This is more realistic as most businesses don't operate on weekends
            $start = Carbon::parse($startDate);
            $end = Carbon::parse($endDate);
            $dates = [];

            while ($start->lte($end)) {
                // Only count weekdays (1 = Monday, 5 = Friday)
                $dayOfWeek = $start->dayOfWeek;
                if ($dayOfWeek >= 1 && $dayOfWeek <= 5) {
                    $dates[] = $start->copy()->format('Y-m-d');
                }
                $start->addDay();
            }

            // For each date, check if employee has any shift
            foreach ($dates as $date) {
                // Check if date is in the past (only count absent for past dates)
                $dateCarbon = Carbon::parse($date);
                if ($dateCarbon->gt($now)) {
                    continue; // Skip future dates
                }

                // Get latest shift end time for this date
                $latestEndTime = null;
                foreach ($defaultShiftEnds as $endTime) {
                    $endDateTime = Carbon::parse($date . ' ' . $endTime);
                    // Handle overnight shifts
                    if ($endTime < '12:00:00') {
                        $endDateTime->addDay();
                    }
                    if (!$latestEndTime || $endDateTime->gt($latestEndTime)) {
                        $latestEndTime = $endDateTime;
                    }
                }

                // Only count as absent if latest shift end time has passed
                if ($latestEndTime && $now->lt($latestEndTime)) {
                    continue; // Shift hasn't ended yet, don't count as absent
                }

                // Get all user IDs who have shifts on this date
                $usersWithShifts = EmployeeShift::where('business_id', $businessId)
                    ->whereDate('shift_date', $date)
                    ->when($outletId, function($q) use ($outletId) {
                        $q->where('outlet_id', $outletId);
                    })
                    ->pluck('user_id')
                    ->unique()
                    ->toArray();

                // Count employees without shifts
                foreach ($employees as $employee) {
                    if (!in_array($employee->user_id, $usersWithShifts)) {
                        $absentCount++;
                    }
                }
            }
        } catch (\Exception $e) {
            Log::warning('Error calculating absent without shift: ' . $e->getMessage());
        }

        return $absentCount;
    }

    /**
     * Get attendance statistics
     */
    public function getAttendanceStats(Request $request)
    {
        $user = Auth::user();

        // ✅ FIX: Check attendance access
        $accessCheck = $this->checkAttendanceAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            $startTime = microtime(true); // ✅ FIX: Define startTime for execution time tracking
            $user = Auth::user();
            $businessId = $request->header('X-Business-Id');
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID required'
                ], 400);
            }

            $startDate = $request->input('start_date', now()->subDays(30)->toDateString());
            $endDate = $request->input('end_date', now()->endOfDay()->toDateString());

            // ✅ OPTIMIZATION: Limit date range to prevent huge queries (max 30 days)
            $daysDiff = Carbon::parse($endDate)->diffInDays(Carbon::parse($startDate));
            if ($daysDiff > 30) {
                // Limit to last 30 days
                $startDate = Carbon::parse($endDate)->subDays(30)->format('Y-m-d');
            }

            Log::info('Fetching attendance stats', [
                'user_id' => $user->id,
                'business_id' => $businessId,
                'outlet_id' => $outletId,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);

            // ✅ OPTIMIZATION: Build query with filters first
            $query = EmployeeShift::where('business_id', $businessId)
                ->whereBetween('shift_date', [$startDate, $endDate]);

            if ($outletId) {
                $query->where('outlet_id', $outletId);
            }

            // Filter by user if not admin/owner
            $userFilter = null;
            if (!in_array($user->role, ['super_admin', 'owner', 'admin'])) {
                $query->where('user_id', $user->id);
                $userFilter = $user->id;
            } elseif ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
                $userFilter = $request->user_id;
            }

            // ✅ OPTIMIZATION: Use simple count queries (more reliable than complex aggregation)
            // Clone query for each count to avoid query builder state issues
            $baseQuery = clone $query;
            $totalShifts = $baseQuery->count();

            $baseQuery = clone $query;
            $completed = $baseQuery->where('status', 'completed')->count();

            $baseQuery = clone $query;
            $ongoing = $baseQuery->where('status', 'ongoing')->count();

            $baseQuery = clone $query;
            $late = $baseQuery->where('status', 'late')->count();

            $baseQuery = clone $query;
            $absentFromShifts = $baseQuery->where('status', 'absent')->count();

            $baseQuery = clone $query;
            $present = $baseQuery->whereNotNull('clock_in')->count();

            // ✅ OPTIMIZATION: Skip calculateAbsentWithoutShift for better performance
            // This is expensive and can be calculated separately if needed
            $absentWithoutShift = 0;

            $absent = $absentFromShifts + $absentWithoutShift;

            $stats = [
                'total_shifts' => $totalShifts,
                'completed' => $completed,
                'ongoing' => $ongoing,
                'late' => $late,
                'absent' => $absent,
                'absent_from_shifts' => $absentFromShifts,
                'absent_without_shift' => $absentWithoutShift,
                'present' => $present,
            ];

            $executionTime = round((microtime(true) - $startTime) * 1000, 2);
            Log::info('Attendance stats fetched', [
                'stats' => $stats,
                'execution_time_ms' => $executionTime,
            ]);

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching attendance stats: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error fetching attendance stats: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get attendance report data with charts
     */
    public function getAttendanceReport(Request $request)
    {
        $user = Auth::user();

        // ✅ FIX: Check attendance access
        $accessCheck = $this->checkAttendanceAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        try {
            $user = Auth::user();
            $businessId = $request->header('X-Business-Id');
            $outletId = $request->header('X-Outlet-Id');

            if (!$businessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Business ID required'
                ], 400);
            }

            $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
            $endDate = $request->input('end_date', now()->endOfDay()->toDateString());

            $baseQuery = EmployeeShift::where('business_id', $businessId)
                ->whereBetween('shift_date', [$startDate, $endDate]);

            if ($outletId) {
                $baseQuery->where('outlet_id', $outletId);
            }

            // Filter by user if not admin/owner
            $userFilter = null;
            if (!in_array($user->role, ['super_admin', 'owner', 'admin'])) {
                $baseQuery->where('user_id', $user->id);
                $userFilter = $user->id;
            } elseif ($request->has('user_id')) {
                $baseQuery->where('user_id', $request->user_id);
                $userFilter = $request->user_id;
            }

            // Update absent shifts before calculating stats
            $this->updateAbsentShifts($baseQuery);

            // Overall statistics
            $now = now();
            $baseQueryClone = clone $baseQuery;

            // Absent from shifts (existing shifts)
            $absentFromShifts = (clone $baseQueryClone)->where(function($q) use ($now) {
                $q->where('status', 'absent')
                  ->orWhere(function($q2) use ($now) {
                      $q2->whereNull('clock_in')
                         ->whereRaw('CONCAT(shift_date, " ", end_time) < ?', [$now->format('Y-m-d H:i:s')]);
                  });
            })->count();

            // Absent employees who never clocked in (no shift record at all)
            $absentWithoutShift = $this->calculateAbsentWithoutShift(
                $businessId,
                $outletId,
                $startDate,
                $endDate,
                $userFilter
            );

            // ✅ NEW: Calculate total working hours
            $totalWorkingHours = 0;
            $shiftsWithHours = (clone $baseQueryClone)
                ->whereNotNull('clock_in')
                ->whereNotNull('clock_out')
                ->get();

            foreach ($shiftsWithHours as $shift) {
                try {
                    // ✅ FIX: Ensure shift_date is only date (Y-m-d), not datetime
                    $shiftDate = $shift->shift_date instanceof Carbon
                        ? $shift->shift_date->format('Y-m-d')
                        : (is_string($shift->shift_date)
                            ? (strpos($shift->shift_date, ' ') !== false
                                ? explode(' ', $shift->shift_date)[0]
                                : $shift->shift_date)
                            : Carbon::parse($shift->shift_date)->format('Y-m-d'));

                    // ✅ FIX: Ensure clock_in is only time (H:i:s), not datetime
                    $clockInTime = is_string($shift->clock_in)
                        ? (strpos($shift->clock_in, ' ') !== false
                            ? explode(' ', $shift->clock_in)[1] ?? $shift->clock_in
                            : $shift->clock_in)
                        : (string)$shift->clock_in;

                    // ✅ FIX: Ensure clock_out is only time (H:i:s), not datetime
                    $clockOutTime = is_string($shift->clock_out)
                        ? (strpos($shift->clock_out, ' ') !== false
                            ? explode(' ', $shift->clock_out)[1] ?? $shift->clock_out
                            : $shift->clock_out)
                        : (string)$shift->clock_out;

                    $clockIn = Carbon::parse($shiftDate . ' ' . $clockInTime);
                    $clockOut = Carbon::parse($shiftDate . ' ' . $clockOutTime);

                    // Handle overnight shifts
                    if ($clockOut->lt($clockIn)) {
                        $clockOut->addDay();
                    }

                    $hours = $clockIn->diffInMinutes($clockOut) / 60;
                    $totalWorkingHours += $hours;
                } catch (\Exception $e) {
                    Log::warning('Error calculating hours for shift ' . $shift->id . ': ' . $e->getMessage(), [
                        'shift_date' => $shift->shift_date ?? 'null',
                        'clock_in' => $shift->clock_in ?? 'null',
                        'clock_out' => $shift->clock_out ?? 'null',
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $stats = [
                'total_shifts' => $baseQueryClone->count(),
                'completed' => (clone $baseQueryClone)->where('status', 'completed')->count(),
                'ongoing' => (clone $baseQueryClone)->where('status', 'ongoing')->count(),
                'late' => (clone $baseQueryClone)->where('status', 'late')->count(),
                'absent' => $absentFromShifts + $absentWithoutShift,
                'absent_from_shifts' => $absentFromShifts,
                'absent_without_shift' => $absentWithoutShift,
                'present' => (clone $baseQueryClone)->whereNotNull('clock_in')->count(),
                'total_working_hours' => round($totalWorkingHours, 2), // ✅ NEW: Total working hours
            ];

            // Daily trends - calculate with proper absent logic
            $nowFormatted = $now->format('Y-m-d H:i:s');
            $dailyTrends = (clone $baseQuery)
                ->selectRaw('DATE(shift_date) as date, COUNT(*) as total,
                    SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = "late" THEN 1 ELSE 0 END) as late,
                    SUM(CASE WHEN status = "absent" OR (clock_in IS NULL AND CONCAT(shift_date, " ", end_time) < ?) THEN 1 ELSE 0 END) as absent',
                    [$nowFormatted])
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->map(function ($item) {
                    return [
                        'date' => Carbon::parse($item->date)->format('Y-m-d'),
                        'label' => Carbon::parse($item->date)->format('d M'),
                        'total' => (int)$item->total,
                        'completed' => (int)$item->completed,
                        'late' => (int)$item->late,
                        'absent' => (int)$item->absent,
                    ];
                });

            // Status distribution
            $statusDistribution = [
                ['name' => 'Selesai', 'value' => $stats['completed'], 'color' => '#10b981'],
                ['name' => 'Berlangsung', 'value' => $stats['ongoing'], 'color' => '#3b82f6'],
                ['name' => 'Terlambat', 'value' => $stats['late'], 'color' => '#f59e0b'],
                ['name' => 'Tidak Hadir', 'value' => $stats['absent'], 'color' => '#ef4444'],
            ];

            // Employee performance (all employees by attendance)
            // ✅ NEW: Get limit from request, default to null (show all) or 10
            $limit = $request->input('employee_limit', null);
            if ($limit === 'all' || $limit === null) {
                $limit = null; // Show all employees
            } else {
                $limit = (int)$limit ?: 10; // Default to 10 if invalid
            }

            $employeeQuery = (clone $baseQuery)
                ->selectRaw('user_id, COUNT(*) as total_shifts,
                    SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = "late" THEN 1 ELSE 0 END) as late,
                    SUM(CASE WHEN status = "absent" OR (clock_in IS NULL AND CONCAT(shift_date, " ", end_time) < ?) THEN 1 ELSE 0 END) as absent',
                    [$nowFormatted])
                ->with('user:id,name,email')
                ->groupBy('user_id')
                ->orderByDesc('total_shifts');

            if ($limit !== null) {
                $employeeQuery->limit($limit);
            }

            // ✅ OPTIMIZATION: Get all shifts with hours calculation in one query
            // Use fresh query to ensure we get all shifts with clock_in and clock_out
            $shiftsWithHoursQuery = EmployeeShift::where('business_id', $businessId)
                ->whereBetween('shift_date', [$startDate, $endDate])
                ->whereNotNull('clock_in')
                ->whereNotNull('clock_out');

            if ($outletId) {
                $shiftsWithHoursQuery->where('outlet_id', $outletId);
            }

            if ($userFilter) {
                $shiftsWithHoursQuery->where('user_id', $userFilter);
            }

            $shiftsWithHours = $shiftsWithHoursQuery->get()->groupBy('user_id');

            // ✅ DEBUG: Log shifts with hours for debugging
            $totalShiftsWithHours = $shiftsWithHoursQuery->count();
            Log::info('Shifts with hours calculation', [
                'business_id' => $businessId,
                'outlet_id' => $outletId,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'total_shifts_with_hours' => $totalShiftsWithHours,
                'grouped_by_user_count' => $shiftsWithHours->count(),
                'user_ids' => $shiftsWithHours->keys()->toArray(),
            ]);

            // ✅ DEBUG: Log sample shifts to verify data
            if ($totalShiftsWithHours > 0) {
                $sampleShift = $shiftsWithHoursQuery->first();
                Log::info('Sample shift with hours', [
                    'shift_id' => $sampleShift->id,
                    'user_id' => $sampleShift->user_id,
                    'shift_date' => $sampleShift->shift_date,
                    'clock_in' => $sampleShift->clock_in,
                    'clock_out' => $sampleShift->clock_out,
                ]);
            } else {
                Log::warning('No shifts found with both clock_in and clock_out', [
                    'business_id' => $businessId,
                    'outlet_id' => $outletId,
                    'date_range' => [$startDate, $endDate],
                ]);
            }

            $employeePerformance = $employeeQuery->get()
                ->map(function ($item) use ($shiftsWithHours, $startDate, $endDate) {
                    // ✅ NEW: Calculate total working hours for this employee from grouped data
                    $totalWorkingHours = 0;
                    $employeeShifts = $shiftsWithHours->get($item->user_id, collect());


                    foreach ($employeeShifts as $shift) {
                        try {
                            // ✅ FIX: Ensure shift_date is only date (Y-m-d), not datetime
                            $shiftDate = $shift->shift_date instanceof Carbon
                                ? $shift->shift_date->format('Y-m-d')
                                : (is_string($shift->shift_date)
                                    ? (strpos($shift->shift_date, ' ') !== false
                                        ? explode(' ', $shift->shift_date)[0]
                                        : $shift->shift_date)
                                    : Carbon::parse($shift->shift_date)->format('Y-m-d'));

                            // ✅ FIX: Ensure clock_in is only time (H:i:s), not datetime
                            $clockInTime = is_string($shift->clock_in)
                                ? (strpos($shift->clock_in, ' ') !== false
                                    ? explode(' ', $shift->clock_in)[1] ?? $shift->clock_in
                                    : $shift->clock_in)
                                : (string)$shift->clock_in;

                            // ✅ FIX: Ensure clock_out is only time (H:i:s), not datetime
                            $clockOutTime = is_string($shift->clock_out)
                                ? (strpos($shift->clock_out, ' ') !== false
                                    ? explode(' ', $shift->clock_out)[1] ?? $shift->clock_out
                                    : $shift->clock_out)
                                : (string)$shift->clock_out;

                            $clockIn = Carbon::parse($shiftDate . ' ' . $clockInTime);
                            $clockOut = Carbon::parse($shiftDate . ' ' . $clockOutTime);

                            // Handle overnight shifts
                            if ($clockOut->lt($clockIn)) {
                                $clockOut->addDay();
                            }

                            $hours = $clockIn->diffInMinutes($clockOut) / 60;
                            $totalWorkingHours += $hours;
                        } catch (\Exception $e) {
                            Log::warning('Error calculating hours for shift ' . $shift->id . ': ' . $e->getMessage(), [
                                'shift_date' => $shift->shift_date ?? 'null',
                                'clock_in' => $shift->clock_in ?? 'null',
                                'clock_out' => $shift->clock_out ?? 'null',
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }

                    return [
                        'user_id' => $item->user_id,
                        'user_name' => $item->user->name ?? $item->user->email ?? 'Unknown',
                        'total_shifts' => (int)$item->total_shifts,
                        'completed' => (int)$item->completed,
                        'late' => (int)$item->late,
                        'absent' => (int)$item->absent,
                        'attendance_rate' => $item->total_shifts > 0
                            ? round((($item->completed + $item->late) / $item->total_shifts) * 100, 2)
                            : 0,
                        'total_working_hours' => round($totalWorkingHours, 2), // ✅ NEW: Total working hours per employee
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => $stats,
                    'daily_trends' => $dailyTrends,
                    'status_distribution' => $statusDistribution,
                    'employee_performance' => $employeePerformance,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching attendance report: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching attendance report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check face recognition access before processing request
     */
    private function checkFaceAccess($user)
    {
        if (!SubscriptionHelper::hasFaceRecognitionAccess($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Akses Face Recognition memerlukan paket Premium. Silakan upgrade paket Anda.',
                'error' => 'subscription_feature_required',
                'required_feature' => 'has_face_recognition_access',
                'redirect_to' => '/subscription-settings'
            ], 403);
        }
        return null;
    }

    /**
     * Register user's face descriptor
     */
    public function registerFace(Request $request)
    {
        $user = Auth::user();

        // Check face recognition access
        $accessCheck = $this->checkFaceAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        $validator = Validator::make($request->all(), [
            'face_descriptor' => 'required|array',
            'photo' => 'required|string', // Base64 image
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first()
            ], 422);
        }

        try {
            // Save photo
            $photoPath = $this->savePhoto($request->photo, 'faces');

            // Save face descriptor
            $user->face_descriptor = json_encode($request->face_descriptor);
            $user->face_registered = true;
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Wajah berhasil didaftarkan.',
                'photo_path' => $photoPath,
            ]);
        } catch (\Exception $e) {
            Log::error('Error registering face: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal mendaftarkan wajah: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify user's face
     */
    public function verifyFace(Request $request)
    {
        $user = Auth::user();

        // Check face recognition access
        $accessCheck = $this->checkFaceAccess($user);
        if ($accessCheck) {
            return $accessCheck;
        }

        $validator = Validator::make($request->all(), [
            'face_descriptor' => 'required|array',
            'photo' => 'required|string', // Base64 image
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first()
            ], 422);
        }

        if (!$user->face_registered || !$user->face_descriptor) {
            return response()->json([
                'success' => false,
                'message' => 'Wajah belum didaftarkan.'
            ], 400);
        }

        try {
            $registeredDescriptor = json_decode($user->face_descriptor, true);
            $incomingDescriptor = $request->face_descriptor;

            // Calculate Euclidean distance for face matching
            $distance = $this->calculateFaceDistance($registeredDescriptor, $incomingDescriptor);
            $threshold = 0.6; // Adjust threshold as needed

            $confidence = (1 - $distance) * 100; // Convert distance to confidence (0-100%)

            if ($distance < $threshold) {
                $photoPath = $this->savePhoto($request->photo, 'attendance');
                return response()->json([
                    'success' => true,
                    'message' => 'Verifikasi wajah berhasil.',
                    'confidence' => round($confidence, 2),
                    'photo_path' => $photoPath,
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Verifikasi wajah gagal. Wajah tidak cocok.',
                    'confidence' => round($confidence, 2),
                ], 400);
            }
        } catch (\Exception $e) {
            Log::error('Error verifying face: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal memverifikasi wajah: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper to calculate Euclidean distance between face descriptors
     */
    private function calculateFaceDistance($descriptor1, $descriptor2)
    {
        if (count($descriptor1) !== count($descriptor2)) {
            return 1.0; // Maximum distance if dimensions don't match
        }

        $sum = 0;
        for ($i = 0; $i < count($descriptor1); $i++) {
            $diff = $descriptor1[$i] - $descriptor2[$i];
            $sum += $diff * $diff;
        }

        return sqrt($sum);
    }

    /**
     * Helper to save base64 photo
     */
    private function savePhoto($base64Photo, $directory)
    {
        try {
            // Remove data URL prefix if present
            $imageData = preg_replace('#^data:image/\w+;base64,#i', '', $base64Photo);
            $image = base64_decode($imageData);

            if ($image === false) {
                throw new \Exception('Invalid base64 image data');
            }

            // Ensure directory exists
            if (!Storage::disk('public')->exists($directory)) {
                Storage::disk('public')->makeDirectory($directory);
            }

            // Generate unique filename
            $filename = time() . '_' . uniqid() . '.jpg';
            $path = "{$directory}/{$filename}";

            // Save to storage
            Storage::disk('public')->put($path, $image);

            return $path;
        } catch (\Exception $e) {
            Log::error('Error saving photo: ' . $e->getMessage(), [
                'directory' => $directory,
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }
}
