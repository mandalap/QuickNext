<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class CustomerController extends Controller
{
    public function apiIndex(Request $request)
    {
        $businessId = $request->header('X-Business-Id');
        $outletId = $request->header('X-Outlet-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        // Return customers for POS (filtered by outlet if provided)
        $query = Customer::where('business_id', $businessId)
            ->orderBy('name', 'asc');

        if ($outletId) {
            // Only customers that have transactions at the current outlet
            $query->whereIn('id', function ($sub) use ($outletId) {
                $sub->select('customer_id')
                    ->from('orders')
                    ->where('outlet_id', $outletId)
                    ->whereNotNull('customer_id');
            });
        }

        $customers = $query->get();

        // Enrich customers with outlet information
        $customersWithOutletInfo = $customers->map(function ($customer) {
            // Get outlets where this customer has shopped
            $outletVisits = DB::table('orders')
                ->join('outlets', 'orders.outlet_id', '=', 'outlets.id')
                ->where('orders.customer_id', $customer->id)
                ->where('orders.status', 'completed')
                ->select(
                    'outlets.id',
                    'outlets.name',
                    DB::raw('COUNT(orders.id) as visit_count'),
                    DB::raw('MAX(orders.created_at) as last_visit'),
                    DB::raw('SUM(orders.total) as total_spent_at_outlet')
                )
                ->groupBy('outlets.id', 'outlets.name')
                ->orderBy('visit_count', 'desc')
                ->get();

            // Get last visit info
            $lastOrder = DB::table('orders')
                ->join('outlets', 'orders.outlet_id', '=', 'outlets.id')
                ->where('orders.customer_id', $customer->id)
                ->where('orders.status', 'completed')
                ->select('outlets.id as outlet_id', 'outlets.name as outlet_name', 'orders.created_at')
                ->orderBy('orders.created_at', 'desc')
                ->first();

            return [
                'id' => $customer->id,
                'business_id' => $customer->business_id,
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'address' => $customer->address,
                'birthday' => $customer->birthday,
                'gender' => $customer->gender,
                'total_spent' => $customer->total_spent,
                'total_visits' => $customer->total_visits,
                'created_at' => $customer->created_at,
                'updated_at' => $customer->updated_at,
                // Additional outlet information
                'outlets' => $outletVisits,
                'last_outlet' => $lastOrder ? [
                    'id' => $lastOrder->outlet_id,
                    'name' => $lastOrder->outlet_name,
                ] : null,
                'last_visit_at' => $lastOrder ? $lastOrder->created_at : null,
            ];
        });

        return response()->json($customersWithOutletInfo);
    }

    public function store(Request $request)
    {
        $businessId = $request->header('X-Business-Id');

        if (!$businessId) {
            return response()->json(['message' => 'Business ID required'], 400);
        }

        $outletId = $request->header('X-Outlet-Id');

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            // Phone harus unik per outlet (cek melalui orders)
            'phone' => [
                'required',
                'string',
                'max:20',
                function ($attribute, $value, $fail) use ($businessId, $outletId) {
                    if ($outletId) {
                        // Cek apakah sudah ada customer dengan phone yang sama yang pernah order di outlet ini
                        $existingCustomer = Customer::where('business_id', $businessId)
                            ->where('phone', $value)
                            ->whereHas('orders', function ($query) use ($outletId) {
                                $query->where('outlet_id', $outletId);
                            })
                            ->first();

                        if ($existingCustomer) {
                            $fail('Nomor telepon sudah terdaftar untuk outlet ini.');
                        }
                    } else {
                        // Jika tidak ada outlet_id, cek unique per business saja
                        $existingCustomer = Customer::where('business_id', $businessId)
                            ->where('phone', $value)
                            ->first();

                        if ($existingCustomer) {
                            $fail('Nomor telepon sudah terdaftar.');
                        }
                    }
                },
            ],
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'birth_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $customerData = array_merge($request->all(), [
            'business_id' => $businessId,
        ]);

        $customer = Customer::create($customerData);

        return response()->json($customer, 201);
    }

    public function apiShow(Customer $customer)
    {
        return response()->json($customer);
    }

    public function update(Request $request, Customer $customer)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|unique:customers,email,' . $customer->id,
            'address' => 'nullable|string',
            'birth_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $customer->update($request->all());

        return response()->json($customer);
    }

    public function destroy(Customer $customer)
    {
        $customer->delete();

        return response()->json(['message' => 'Customer deleted']);
    }

    public function search($query)
    {
        $businessId = request()->header('X-Business-Id');
        $outletId = request()->header('X-Outlet-Id');

        $builder = Customer::query();

        if ($businessId) {
            $builder->where('business_id', $businessId);
        }

        $builder->where(function ($q) use ($query) {
            $q->where('name', 'like', "%{$query}%")
              ->orWhere('phone', 'like', "%{$query}%")
              ->orWhere('email', 'like', "%{$query}%");
        });

        if ($outletId) {
            $builder->whereIn('id', function ($sub) use ($outletId) {
                $sub->select('customer_id')
                    ->from('orders')
                    ->where('outlet_id', $outletId)
                    ->whereNotNull('customer_id');
            });
        }

        $customers = $builder->orderBy('name', 'asc')->take(10)->get();

        return response()->json($customers);
    }
}
