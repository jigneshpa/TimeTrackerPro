import React, { useEffect, useState } from 'react';
import { Users, Plus, CreditCard as Edit, Trash2, Save } from 'lucide-react';
import { getEmployees, updateEmployee, deleteEmployee } from '../../lib/api';

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
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Employee>>({});
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

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditFormData(employee);
    setShowEditForm(true);
  };

  const handleSaveEmployee = async () => {
    try {
      setError(null);
      const response = await updateEmployee(editFormData);
      if (response.success) {
        await fetchEmployees();
        setShowEditForm(false);
        setEditingEmployee(null);
        setEditFormData({});
      } else {
        setError(response.message || 'Failed to update employee');
      }
    } catch (error: any) {
      console.error('Error saving employee:', error);
      setError(error.message || 'Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) {
      return;
    }
    try {
      setError(null);
      const response = await deleteEmployee(id);
      if (response.success) {
        await fetchEmployees();
      } else {
        setError(response.message || 'Failed to delete employee');
      }
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      setError(error.message || 'Failed to delete employee');
    }
  };

  const handleCancelEdit = () => {
    setShowEditForm(false);
    setEditingEmployee(null);
    setEditFormData({});
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
      {showEditForm && editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Edit Employee - {editingEmployee.first_name} {editingEmployee.last_name}
            </h3>
            
            {/* View-Only Employee Information */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Employee Information (View Only - From Roles Module)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900">
                    {editingEmployee.first_name}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900">
                    {editingEmployee.last_name}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee Number</label>
                  <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900">
                    {editingEmployee.employee_number || 'Not set'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      editingEmployee.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {editingEmployee.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Editable Vacation Settings */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h4 className="text-sm font-semibold text-blue-900 mb-4">Vacation Settings</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vacation Days (Annual)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={editFormData.vacation_days_total || 0}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, vacation_days_total: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={editFormData.is_active ? '1' : '0'}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, is_active: e.target.value === '1' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-4">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEmployee}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
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
                          {employee.vacation_days_remaining || 0} days remaining
                        </span>
                        <div className="text-xs text-gray-500">
                          {employee.vacation_days_used || 0} / {employee.vacation_days_total || 0} used
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
                        onClick={() => handleEditEmployee(employee)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit Employee"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete Employee"
                      >
                        <Trash2 className="h-4 w-4" />
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