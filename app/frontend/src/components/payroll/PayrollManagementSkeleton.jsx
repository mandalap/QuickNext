import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

const PayrollManagementSkeleton = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
          <Skeleton className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
        </div>
        <Skeleton className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2 animate-pulse" />
                  <Skeleton className="h-8 w-24 animate-pulse" />
                </div>
                <Skeleton className="w-12 h-12 rounded-full animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-20 animate-pulse" />
                <Skeleton className="h-10 w-full animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payroll List Table Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32 animate-pulse" />
            <Skeleton className="h-10 w-40 animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium text-gray-700">
                    <Skeleton className="h-4 w-24 animate-pulse" />
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">
                    <Skeleton className="h-4 w-24 animate-pulse" />
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">
                    <Skeleton className="h-4 w-20 animate-pulse" />
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">
                    <Skeleton className="h-4 w-24 animate-pulse" />
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">
                    <Skeleton className="h-4 w-20 animate-pulse" />
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">
                    <Skeleton className="h-4 w-16 animate-pulse" />
                  </th>
                  <th className="text-right p-3 text-sm font-medium text-gray-700">
                    <Skeleton className="h-4 w-16 animate-pulse" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-32 mb-1 animate-pulse" />
                        <Skeleton className="h-3 w-24 animate-pulse" />
                      </div>
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-28 animate-pulse" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-20 animate-pulse" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-20 animate-pulse" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-20 animate-pulse" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-6 w-20 rounded-full animate-pulse" />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <Skeleton className="h-8 w-8 rounded-full animate-pulse" />
                        <Skeleton className="h-8 w-8 rounded-full animate-pulse" />
                        <Skeleton className="h-8 w-8 rounded-full animate-pulse" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollManagementSkeleton;

