import React, { useEffect, useState } from 'react';
import { Users, Plus, Eye } from 'lucide-react';
import { getEmployees } from '../../lib/api';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'employee' | 'admin';
  employee_number?: string;
  phone?: string;
  hire_date?: string;
  is_active?: boolean;
  vacation_days_total?: number;
  vacation_days_used?: number;
  vacation_days_remaining?: number;
  created_at: string;
  updated_at?: string;
}

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setError(null);
      const response = await getEmployees();
      if (response.success && response.data) {
        setEmployees(response.data);
      } else {
        setError(response.message || 'Failed to fetch employees');
      }
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      setError(error.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleViewEmployee = (employee: Employee) => {
    setViewingEmployee(employee);
    setShowViewDialog(true);
  };

  const handleCloseView = () => {
    setShowViewDialog(false);
    setViewingEmployee(null);
  };

  const convertHoursToDays = (hours: number): number => {
    return Math.round((hours / 8) * 100) / 100;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {showViewDialog && viewingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Employee Details - {viewingEmployee.first_name} {viewingEmployee.last_name}
            </h3>

            {/* Employee Information */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Employee Information (View Only - From Roles Module)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900">
                    {viewingEmployee.first_name}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900">
                    {viewingEmployee.last_name}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee Number</label>
                  <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900">
                    {viewingEmployee.employee_number || 'Not set'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      viewingEmployee.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {viewingEmployee.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vacation Settings */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h4 className="text-sm font-semibold text-blue-900 mb-4">Vacation Settings</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vacation Hours (Annual)
                  </label>
                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                    {viewingEmployee.vacation_days_total || 0} hours
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    ≈ {convertHoursToDays(viewingEmployee.vacation_days_total || 0)} days (8 hours/day)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      viewingEmployee.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {viewingEmployee.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hours Used
                  </label>
                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                    {viewingEmployee.vacation_days_used || 0} hours
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    ≈ {convertHoursToDays(viewingEmployee.vacation_days_used || 0)} days
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hours Remaining
                  </label>
                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-green-600 font-medium">
                    {viewingEmployee.vacation_days_remaining || 0} hours
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    ≈ {convertHoursToDays(viewingEmployee.vacation_days_remaining || 0)} days
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                onClick={handleCloseView}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-gray-600" />
          <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Employee Number</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Vacation</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b border-gray-100 hover:bg-white">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-sm text-gray-500">ID: {employee.id}...</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{employee.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        employee.role === 'admin'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {employee.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {employee.employee_number || 'Not set'}
                  </td>
                  <td className="py-3 px-4">
                    {(employee.vacation_days_total || 0) > 0 ? (
                      <div>
                        <span className="text-green-600 font-medium">
                          {convertHoursToDays(employee.vacation_days_remaining || 0)} days remaining
                        </span>
                        <div className="text-xs text-gray-500">
                          {convertHoursToDays(employee.vacation_days_used || 0)} / {convertHoursToDays(employee.vacation_days_total || 0)} used
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-gray-400">Not eligible</span>
                        <div className="text-xs text-gray-500">0 days/year</div>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewEmployee(employee)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="View Employee Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {employees.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No employees found.</p>
            <p className="text-sm text-gray-400 mt-1">Add employees to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeManagement;