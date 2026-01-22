import { Star, Store, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { employeeOutletService } from '../../services/employeeOutlet.service';
import { useToast } from '../ui/toast';

const EmployeeOutletAssignModal = ({
  employee,
  employees,
  outlets,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    user_id: employee?.user_id || employee?.id || '',
    outlet_ids: [],
    primary_outlet_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentAssignments, setCurrentAssignments] = useState([]);

  useEffect(() => {
    console.log('[AssignEmployee] Modal opened', {
      hasEmployee: !!employee,
      employeeUserId: employee?.user_id,
      employeeId: employee?.id,
      employeesCount: employees?.length || 0,
      outletsCount: outlets?.length || 0,
    });
    if (employee) {
      // Fetch current assignments for this employee
      fetchCurrentAssignments();
    }
  }, [employee]);

  const fetchCurrentAssignments = async () => {
    try {
      // Use user_id if available, fallback to id (backend handles both)
      const employeeUserId = employee.user_id || employee.id;
      console.log(
        '[AssignEmployee] Fetching assignments for user_id:',
        employeeUserId
      );

      const result = await employeeOutletService.getEmployeeOutlets(
        employeeUserId
      );
      const assignments = result.data || [];

      const outletIds = assignments.map(a => a.outlet_id);
      const primaryOutlet = assignments.find(a => a.is_primary);

      setFormData({
        user_id: employeeUserId,
        outlet_ids: outletIds,
        primary_outlet_id: primaryOutlet
          ? primaryOutlet.outlet_id
          : outletIds[0] || '',
      });
      setCurrentAssignments(assignments);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    }
  };

  const handleEmployeeChange = e => {
    const selectedValue = e.target.value;

    // Find the selected employee
    const selectedEmp = employees.find(
      emp =>
        emp.id.toString() === selectedValue ||
        emp.user_id?.toString() === selectedValue
    );

    // Use user_id if available, fallback to id
    const userId = selectedEmp?.user_id || selectedEmp?.id || selectedValue;

    console.log('[AssignEmployee] Employee changed:', {
      selectedValue,
      selectedEmp,
      userId,
    });

    setFormData({
      user_id: userId,
      outlet_ids: [],
      primary_outlet_id: '',
    });
    setErrors({});

    // Fetch assignments for selected employee
    if (userId) {
      employeeOutletService
        .getEmployeeOutlets(userId)
        .then(result => {
          const assignments = result.data || [];
          const outletIds = assignments.map(a => a.outlet_id);
          const primaryOutlet = assignments.find(a => a.is_primary);

          setFormData(prev => ({
            ...prev,
            outlet_ids: outletIds,
            primary_outlet_id: primaryOutlet
              ? primaryOutlet.outlet_id
              : outletIds[0] || '',
          }));
        })
        .catch(error => {
          console.error('[AssignEmployee] Error fetching assignments:', error);
        });
    }
  };

  const isAlreadyAssigned = outletId => {
    return currentAssignments.some(
      assignment => assignment.outlet_id == outletId
    );
  };

  const handleOutletToggle = outletId => {
    // Prevent selection of already assigned outlets
    if (isAlreadyAssigned(outletId)) {
      toast.warning(`⚠️ Employee is already assigned to this outlet`);
      return;
    }

    setFormData(prev => {
      const isCurrentlySelected = prev.outlet_ids.includes(outletId);
      let newOutletIds;

      if (isCurrentlySelected) {
        newOutletIds = prev.outlet_ids.filter(id => id !== outletId);
      } else {
        newOutletIds = [...prev.outlet_ids, outletId];
      }

      // If removing the primary outlet, select the first available
      let newPrimaryOutletId = prev.primary_outlet_id;
      if (outletId === prev.primary_outlet_id && isCurrentlySelected) {
        newPrimaryOutletId = newOutletIds[0] || '';
      }
      // If only one outlet is selected, make it primary
      if (newOutletIds.length === 1) {
        newPrimaryOutletId = newOutletIds[0];
      }

      return {
        ...prev,
        outlet_ids: newOutletIds,
        primary_outlet_id: newPrimaryOutletId,
      };
    });

    // Clear errors
    if (errors.outlet_ids) {
      setErrors(prev => ({ ...prev, outlet_ids: '' }));
    }
  };

  const handlePrimaryChange = outletId => {
    setFormData(prev => ({
      ...prev,
      primary_outlet_id: outletId,
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.user_id) {
      newErrors.user_id = 'Employee is required';
    }
    if (formData.outlet_ids.length === 0) {
      newErrors.outlet_ids = 'At least one outlet must be selected';
    }

    // Check for duplicate outlets in selection
    const duplicateOutlets = formData.outlet_ids.filter(
      (outletId, index) => formData.outlet_ids.indexOf(outletId) !== index
    );

    if (duplicateOutlets.length > 0) {
      newErrors.outlet_ids = 'Duplicate outlets selected';
    }

    // Check against current assignments
    const alreadyAssigned = formData.outlet_ids.filter(outletId =>
      currentAssignments.some(assignment => assignment.outlet_id == outletId)
    );

    if (alreadyAssigned.length > 0) {
      const outletNames = outlets
        .filter(outlet => alreadyAssigned.includes(outlet.id))
        .map(outlet => outlet.name)
        .join(', ');
      newErrors.outlet_ids = `Already assigned to: ${outletNames}`;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      console.warn('[AssignEmployee] Validation failed:', newErrors);
      const msg =
        newErrors.user_id || newErrors.outlet_ids || 'Validation error';
      toast.error(`❌ ${msg}`);
    }
    if (Object.keys(newErrors).length === 0) {
      console.log('[AssignEmployee] Validation OK');
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    console.log('[AssignEmployee] Submit clicked with formData:', formData);

    if (!validate()) {
      console.log('[AssignEmployee] Submit aborted due to validation error');
      toast.error('❌ Validasi gagal. Periksa form dan coba lagi.');
      return;
    }

    setLoading(true);

    try {
      const resp = await employeeOutletService.assignEmployee(
        Number(formData.user_id),
        formData.outlet_ids,
        formData.primary_outlet_id || formData.outlet_ids[0]
      );

      console.log('[AssignEmployee] Modal received response:', resp);

      if (resp && resp.success) {
        console.log('[AssignEmployee] Success: employee assigned to outlets');

        // Show success with details
        toast.success('✅ Assignment berhasil!', {
          duration: 4000,
        });

        // Additional success toast with details
        const employeeName =
          employees.find(emp => (emp.user_id || emp.id) == formData.user_id)
            ?.name || 'Employee';

        const outletNames = outlets
          .filter(outlet => formData.outlet_ids.includes(outlet.id))
          .map(outlet => outlet.name)
          .join(', ');

        toast.success(
          `👤 ${employeeName} berhasil ditugaskan ke outlet: ${outletNames}`,
          { duration: 5000 }
        );

        onSuccess();
      } else {
        const msg = resp?.message || 'Failed to assign employee';
        console.warn('[AssignEmployee] Failed:', { message: msg, resp });

        // Show detailed error
        toast.error(`❌ Assignment gagal: ${msg}`, {
          duration: 6000,
        });

        if (resp?.errors) {
          setErrors(resp.errors);
          // Show validation errors
          Object.values(resp.errors).forEach(errorMsg => {
            toast.error(`⚠️ ${errorMsg}`, { duration: 4000 });
          });
        }
      }
    } catch (error) {
      console.error('[AssignEmployee] Modal error:', error);

      let errorMessage = '❌ Terjadi kesalahan saat memproses assignment';
      let errorDetails = '';

      if (error.response) {
        console.error('[AssignEmployee] Error response:', error.response.data);

        const status = error.response.status;
        const data = error.response.data;

        switch (status) {
          case 400:
            errorMessage = '❌ Data tidak valid';
            errorDetails = data.message || 'Periksa data yang dikirim';
            break;
          case 401:
            errorMessage = '❌ Tidak memiliki izin';
            errorDetails = 'Silakan login ulang';
            break;
          case 403:
            errorMessage = '❌ Akses ditolak';
            errorDetails =
              data.message ||
              'Anda tidak memiliki izin untuk melakukan aksi ini';
            break;
          case 404:
            errorMessage = '❌ Data tidak ditemukan';
            errorDetails =
              data.message || 'Employee atau outlet tidak ditemukan';
            break;
          case 422:
            errorMessage = '❌ Validasi gagal';
            errorDetails = data.message || 'Periksa form dan coba lagi';
            break;
          case 500:
            errorMessage = '❌ Server error';
            errorDetails = 'Terjadi kesalahan di server. Coba lagi nanti';
            break;
          default:
            errorMessage = `❌ Error ${status}`;
            errorDetails = data.message || 'Terjadi kesalahan tidak terduga';
        }

        // Show validation errors if any
        if (data?.errors) {
          setErrors(data.errors);
          Object.entries(data.errors).forEach(([field, errors]) => {
            if (Array.isArray(errors)) {
              errors.forEach(err => {
                toast.error(`⚠️ ${field}: ${err}`, { duration: 4000 });
              });
            } else {
              toast.error(`⚠️ ${field}: ${errors}`, { duration: 4000 });
            }
          });
        }
      } else if (error.message) {
        errorMessage = '❌ Koneksi gagal';
        errorDetails = error.message;
      }

      // Show main error
      toast.error(errorMessage, { duration: 6000 });

      // Show details if available
      if (errorDetails) {
        toast.error(`📝 Detail: ${errorDetails}`, { duration: 5000 });
      }

      // Show network error if applicable
      if (
        error.code === 'NETWORK_ERROR' ||
        error.message.includes('Network Error')
      ) {
        toast.error('🌐 Periksa koneksi internet Anda', { duration: 4000 });
      }
    } finally {
      setLoading(false);
      console.log('[AssignEmployee] Done');
    }
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-gray-200'>
          <h2 className='text-xl font-bold text-gray-900'>
            {employee
              ? `Edit Assignments for ${employee.name}`
              : 'Assign Employee to Outlets'}
          </h2>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 transition-colors'
          >
            <X className='w-6 h-6' />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-6 space-y-6'>
          {/* Employee Selection */}
          {!employee && (
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Select Employee *
              </label>
              <select
                value={formData.user_id}
                onChange={handleEmployeeChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.user_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value=''>Choose an employee</option>
                {employees.map(emp => {
                  // Use user_id if available, fallback to id for consistency
                  const employeeValue = emp.user_id || emp.id;
                  return (
                    <option key={emp.id} value={employeeValue}>
                      {emp.name} - {emp.email}
                    </option>
                  );
                })}
              </select>
              {errors.user_id && (
                <p className='mt-1 text-sm text-red-600'>{errors.user_id}</p>
              )}
            </div>
          )}

          {/* Outlet Selection */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Select Outlets * (at least one)
            </label>
            <p className='text-sm text-gray-600 mb-3'>
              Click the star icon to set a primary outlet
            </p>
            <div className='space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3'>
              {outlets.map(outlet => {
                const isSelected = formData.outlet_ids.includes(outlet.id);
                const isPrimary = formData.primary_outlet_id === outlet.id;
                const isAlreadyAssigned = currentAssignments.some(
                  assignment => assignment.outlet_id == outlet.id
                );

                return (
                  <div
                    key={outlet.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      isAlreadyAssigned
                        ? 'border-orange-300 bg-orange-50 opacity-75'
                        : isSelected
                        ? isPrimary
                          ? 'border-yellow-400 bg-yellow-50'
                          : 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <label className='flex items-center gap-3 flex-1 cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={isSelected}
                        onChange={() => handleOutletToggle(outlet.id)}
                        className='w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
                      />
                      <div className='flex items-center gap-2'>
                        <Store className='w-5 h-5 text-gray-500' />
                        <div>
                          <div className='flex items-center gap-2'>
                            <p className='font-medium text-gray-900'>
                              {outlet.name}
                            </p>
                            {isAlreadyAssigned && (
                              <span className='px-2 py-1 text-xs font-medium text-orange-800 bg-orange-200 rounded-full'>
                                Already Assigned
                              </span>
                            )}
                          </div>
                          <p className='text-sm text-gray-600'>
                            {outlet.address}
                          </p>
                        </div>
                      </div>
                    </label>

                    {isSelected && (
                      <button
                        type='button'
                        onClick={() => handlePrimaryChange(outlet.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          isPrimary
                            ? 'text-yellow-600 hover:text-yellow-700'
                            : 'text-gray-400 hover:text-yellow-600'
                        }`}
                        title={isPrimary ? 'Primary outlet' : 'Set as primary'}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            isPrimary ? 'fill-current' : ''
                          }`}
                        />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {errors.outlet_ids && (
              <p className='mt-1 text-sm text-red-600'>{errors.outlet_ids}</p>
            )}
          </div>

          {/* Info Text */}
          {formData.outlet_ids.length > 0 && (
            <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
              <p className='text-sm text-blue-800'>
                <strong>{formData.outlet_ids.length}</strong> outlet(s)
                selected.
                {formData.primary_outlet_id && (
                  <>
                    {' '}
                    <strong>
                      {
                        outlets.find(o => o.id === formData.primary_outlet_id)
                          ?.name
                      }
                    </strong>{' '}
                    is set as the primary outlet.
                  </>
                )}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className='flex gap-3 pt-4'>
            <button
              type='button'
              onClick={onClose}
              className='flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors'
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={loading || formData.outlet_ids.length === 0}
              className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {loading ? 'Saving...' : 'Save Assignments'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeOutletAssignModal;
