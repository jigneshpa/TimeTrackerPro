import React, { useState, useEffect } from 'react';
import { Calendar, Copy, Trash2, Plus, Save, X, Edit } from 'lucide-react';
import {
  getEmployees,
  getWorkSchedules,
  bulkSaveWorkSchedules,
  clearWeekSchedules,
  copyWeekSchedules,
  getStoreLocations,
  getSystemSettings
} from '../../lib/api';
import { toDateString } from '../../lib/timezone';

interface Employee {
  id: string;
  employee_id: string;
  user_id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  primary_location: string;
}

interface StoreLocation {
  id: string;
  store_name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  zip_code?: string;
  is_primary: string;
  status: string;
}

interface Schedule {
  id?: string;
  employee_id: string;
  schedule_date: string;
  start_time: string | null;
  end_time: string | null;
  total_hours: number;
  store_location: string | null;
  is_enabled: boolean;
  notes?: string;
}

interface SystemSettings {
  pay_period_type: 'weekly' | 'biweekly';
  pay_period_start_date: string;
  default_lunch_duration_minutes: number;
  daily_shifts: {
    [key: string]: {
      start: string;
      end: string;
      enabled: boolean;
      lunch_required: boolean;
    };
  };
}

const WorkSchedule: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [weekStartDate, setWeekStartDate] = useState('');
  const [schedules, setSchedules] = useState<{ [key: string]: Schedule }>({});
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState({ admins: true, employees: true });
  const [storeFilter, setStoreFilter] = useState<{ [key: string]: boolean }>({});
  const [editingCell, setEditingCell] = useState<{ empId: string; date: string } | null>(null);
  const [editValues, setEditValues] = useState<Partial<Schedule>>({});
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkValues, setBulkValues] = useState<{
    start_time: string;
    end_time: string;
    store_location: string;
  }>({ start_time: '08:00', end_time: '17:00', store_location: '' });

  const periodDays = systemSettings?.pay_period_type === 'biweekly' ? 14 : 7;

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    if (weekStartDate && selectedEmployeeIds.length > 0) {
      fetchSchedules();
    }
  }, [weekStartDate, selectedEmployeeIds]);

  const initializeData = async () => {
    try {
      const [empResponse, locResponse, settingsResponse] = await Promise.all([
        getEmployees(),
        getStoreLocations(),
        getSystemSettings()
      ]);

      if (empResponse.success && empResponse.data) {
        const empList = empResponse.data.map((emp: any) => ({
          ...emp,
          employee_id: emp.employee_id || emp.id,
          primary_location: emp.primary_location || ''
        }));
        setEmployees(empList);
        setSelectedEmployeeIds(empList.map((e: Employee) => e.employee_id));
      }

      if (locResponse.success && locResponse.data) {
        setStoreLocations(locResponse.data);
        const filters: { [key: string]: boolean } = {};
        locResponse.data.forEach((loc: StoreLocation) => {
          filters[loc.store_name] = true;
        });
        setStoreFilter(filters);
        setBulkValues(prev => ({
          ...prev,
          store_location: locResponse.data?.[0]?.store_name || ''
        }));
      }

      if (settingsResponse.success && settingsResponse.data) {
        setSystemSettings(settingsResponse.data);
        const startDate = calculateCurrentPeriodStart(
          settingsResponse.data.pay_period_start_date,
          settingsResponse.data.pay_period_type === 'biweekly' ? 14 : 7
        );
        setWeekStartDate(startDate);
      } else {
        const today = new Date();
        const sunday = new Date(today);
        sunday.setDate(today.getDate() - today.getDay());
        setWeekStartDate(toDateString(sunday));
      }
    } catch (error) {
      console.error('Error initializing data:', error);
    }
  };

  const calculateCurrentPeriodStart = (baseStartDate: string, periodDays: number): string => {
    const base = new Date(baseStartDate + 'T00:00:00');
    const today = new Date();
    const daysSinceStart = Math.floor((today.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
    const currentPeriodIndex = Math.floor(daysSinceStart / periodDays);
    const periodStart = new Date(base);
    periodStart.setDate(base.getDate() + (currentPeriodIndex * periodDays));
    return toDateString(periodStart);
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const endDate = getEndDate(weekStartDate, periodDays);
      const response = await getWorkSchedules(weekStartDate, endDate, selectedEmployeeIds);

      if (response.success && response.data) {
        const scheduleMap: { [key: string]: Schedule } = {};
        response.data.forEach((schedule: any) => {
          const key = `${schedule.employee_id}-${schedule.schedule_date}`;
          scheduleMap[key] = schedule;
        });
        setSchedules(scheduleMap);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEndDate = (startDate: string, days: number): string => {
    const end = new Date(startDate + 'T00:00:00');
    end.setDate(end.getDate() + days - 1);
    return toDateString(end);
  };

  const getWeekDates = (): Date[] => {
    if (!weekStartDate) return [];
    const dates: Date[] = [];
    const start = new Date(weekStartDate + 'T00:00:00');
    for (let i = 0; i < periodDays; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getScheduleForEmployeeDate = (empId: string, date: string): Schedule | null => {
    const key = `${empId}-${date}`;
    if (schedules[key]) return schedules[key];

    const dateObj = new Date(date + 'T00:00:00');
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dateObj.getDay()];
    const dayShift = systemSettings?.daily_shifts?.[dayName];
    const emp = employees.find(e => e.employee_id === empId);

    return {
      employee_id: empId,
      schedule_date: date,
      start_time: dayShift?.start || '08:00',
      end_time: dayShift?.end || '17:00',
      total_hours: 0,
      store_location: emp?.primary_location || (storeLocations.length > 0 ? storeLocations[0].store_name : ''),
      is_enabled: false,
      notes: ''
    };
  };

  const calculateHours = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (hours > 6) {
      const lunchMinutes = systemSettings?.default_lunch_duration_minutes || 60;
      hours -= lunchMinutes / 60;
    }

    return Math.max(0, Math.round(hours * 100) / 100);
  };

  const saveSchedules = async () => {
    try {
      const schedulesToSave = Object.values(schedules).map(schedule => ({
        ...schedule,
        total_hours: schedule.is_enabled
          ? calculateHours(schedule.start_time || '', schedule.end_time || '')
          : 0
      }));

      await bulkSaveWorkSchedules(schedulesToSave);
      alert('Schedule saved successfully!');
    } catch (error) {
      console.error('Error saving schedules:', error);
      alert('Failed to save schedule');
    }
  };

  const handleBulkAssign = async () => {
    const dates = getWeekDates();
    const newSchedules = { ...schedules };

    selectedEmployeeIds.forEach(empId => {
      dates.forEach(date => {
        const dateStr = toDateString(date);
        const key = `${empId}-${dateStr}`;
        newSchedules[key] = {
          employee_id: empId,
          schedule_date: dateStr,
          start_time: bulkValues.start_time,
          end_time: bulkValues.end_time,
          total_hours: calculateHours(bulkValues.start_time, bulkValues.end_time),
          store_location: bulkValues.store_location,
          is_enabled: true,
          notes: ''
        };
      });
    });

    setSchedules(newSchedules);
    setShowBulkModal(false);
  };

  const handleCopyWeek = async () => {
    try {
      const targetStart = new Date(weekStartDate + 'T00:00:00');
      targetStart.setDate(targetStart.getDate() + periodDays);
      const targetStartStr = toDateString(targetStart);

      await copyWeekSchedules(weekStartDate, targetStartStr, selectedEmployeeIds, periodDays);
      alert('Week copied successfully!');

      setWeekStartDate(targetStartStr);
    } catch (error) {
      console.error('Error copying week:', error);
      alert('Failed to copy week');
    }
  };

  const handleClearWeek = async () => {
    if (!confirm('Are you sure you want to clear all schedules for this period?')) return;

    try {
      const endDate = getEndDate(weekStartDate, periodDays);
      await clearWeekSchedules(weekStartDate, endDate, selectedEmployeeIds);
      alert('Week cleared successfully!');
      fetchSchedules();
    } catch (error) {
      console.error('Error clearing week:', error);
      alert('Failed to clear week');
    }
  };

  const toggleSchedule = (empId: string, date: string) => {
    const key = `${empId}-${date}`;
    const current = schedules[key] || getScheduleForEmployeeDate(empId, date);
    if (!current) return;

    setSchedules({
      ...schedules,
      [key]: { ...current, is_enabled: !current.is_enabled }
    });
  };

  const startEditing = (empId: string, date: string) => {
    const key = `${empId}-${date}`;
    const schedule = schedules[key] || getScheduleForEmployeeDate(empId, date);
    if (!schedule) return;

    setEditingCell({ empId, date });
    setEditValues(schedule);
  };

  const saveEdit = () => {
    if (!editingCell) return;

    const key = `${editingCell.empId}-${editingCell.date}`;
    const updatedSchedule = {
      ...editValues,
      employee_id: editingCell.empId,
      schedule_date: editingCell.date,
      total_hours: calculateHours(editValues.start_time || '', editValues.end_time || '')
    } as Schedule;

    setSchedules({ ...schedules, [key]: updatedSchedule });
    setEditingCell(null);
    setEditValues({});
  };

  const getEmployeeTotalHours = (empId: string): number => {
    const dates = getWeekDates();
    return dates.reduce((total, date) => {
      const dateStr = toDateString(date);
      const schedule = schedules[`${empId}-${dateStr}`];
      if (schedule?.is_enabled) {
        return total + (schedule.total_hours || 0);
      }
      return total;
    }, 0);
  };

  const filteredEmployees = employees
    .filter(emp => {
      const isAdmin = emp.role?.includes('admin');
      if (isAdmin && !roleFilter.admins) return false;
      if (!isAdmin && !roleFilter.employees) return false;
      if (emp.primary_location && !storeFilter[emp.primary_location]) return false;
      return selectedEmployeeIds.includes(emp.employee_id);
    })
    .sort((a, b) => {
      const aIsAdmin = a.role?.includes('admin');
      const bIsAdmin = b.role?.includes('admin');
      if (aIsAdmin !== bIsAdmin) return aIsAdmin ? -1 : 1;
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    });

  const weekDates = getWeekDates();
  const weekRangeText = weekDates.length > 0
    ? `Week: ${weekDates[0].toLocaleDateString()} - ${weekDates[weekDates.length - 1].toLocaleDateString()}`
    : '';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="h-6 w-6 text-gray-600" />
          <h2 className="text-2xl font-bold text-gray-900">Work Schedule</h2>
        </div>
      </div>

      {/* Week Selection and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Week Starting (Sunday)
            </label>
            <input
              type="date"
              value={weekStartDate}
              onChange={(e) => setWeekStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {weekRangeText && (
            <div className="sm:mt-6">
              <p className="text-sm text-gray-600">{weekRangeText}</p>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Bulk Assign</span>
          </button>
          <button
            onClick={handleCopyWeek}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Copy className="h-4 w-4" />
            <span>Copy Week</span>
          </button>
          <button
            onClick={handleClearWeek}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear Week</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">By Role</label>
          <div className="flex items-center space-x-6 bg-gray-50 border border-gray-300 rounded-lg p-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={roleFilter.admins}
                onChange={(e) => setRoleFilter({ ...roleFilter, admins: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium">Admins</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={roleFilter.employees}
                onChange={(e) => setRoleFilter({ ...roleFilter, employees: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium">Employees</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Employees ({filteredEmployees.length} shown, {selectedEmployeeIds.length} selected)
          </label>
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {employees.map(emp => (
                <label key={emp.employee_id} className="flex items-start space-x-2 cursor-pointer p-2 hover:bg-white rounded">
                  <input
                    type="checkbox"
                    checked={selectedEmployeeIds.includes(emp.employee_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEmployeeIds([...selectedEmployeeIds, emp.employee_id]);
                      } else {
                        setSelectedEmployeeIds(selectedEmployeeIds.filter(id => id !== emp.employee_id));
                      }
                    }}
                    className="h-4 w-4 text-blue-600 rounded mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium">{emp.first_name} {emp.last_name}</div>
                    <div className="text-xs text-gray-500">{emp.primary_location}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">By Store Location</label>
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {storeLocations.map(loc => (
                <label key={loc.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={storeFilter[loc.store_name] || false}
                    onChange={(e) => setStoreFilter({ ...storeFilter, [loc.store_name]: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm">{loc.store_name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-4 px-4 font-medium sticky left-0 bg-gray-50 z-10 min-w-[180px]">Employee</th>
                {weekDates.map((date, idx) => (
                  <th key={idx} className="text-center py-4 px-3 font-medium min-w-[140px]">
                    <div className="text-sm font-semibold">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-xs text-gray-600">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </th>
                ))}
                <th className="text-center py-4 px-4 font-medium min-w-[80px]">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => {
                const totalHours = getEmployeeTotalHours(emp.employee_id);
                return (
                  <tr key={emp.employee_id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 sticky left-0 bg-white border-r">
                      <div>
                        <p className="font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                          emp.role?.includes('admin') ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {emp.role?.includes('admin') ? 'admin' : 'employee'}
                        </span>
                        <p className="text-xs text-gray-500">{emp.primary_location}</p>
                      </div>
                    </td>
                    {weekDates.map((date, idx) => {
                      const dateStr = toDateString(date);
                      const schedule = schedules[`${emp.employee_id}-${dateStr}`] || getScheduleForEmployeeDate(emp.employee_id, dateStr);
                      const isEditing = editingCell?.empId === emp.employee_id && editingCell?.date === dateStr;

                      return (
                        <td key={idx} className="py-2 px-2 text-center">
                          {isEditing ? (
                            <div className={`p-2 rounded-lg border-2 ${schedule?.is_enabled ? 'bg-green-50' : 'bg-gray-50'}`}>
                              <input
                                type="checkbox"
                                checked={editValues.is_enabled || false}
                                onChange={(e) => setEditValues({ ...editValues, is_enabled: e.target.checked })}
                                className="h-4 w-4 mb-2"
                              />
                              {editValues.is_enabled && (
                                <>
                                  <input
                                    type="time"
                                    value={editValues.start_time || ''}
                                    onChange={(e) => setEditValues({ ...editValues, start_time: e.target.value })}
                                    className="w-full px-1 py-1 border rounded text-xs mb-1"
                                  />
                                  <input
                                    type="time"
                                    value={editValues.end_time || ''}
                                    onChange={(e) => setEditValues({ ...editValues, end_time: e.target.value })}
                                    className="w-full px-1 py-1 border rounded text-xs mb-1"
                                  />
                                  <select
                                    value={editValues.store_location || ''}
                                    onChange={(e) => setEditValues({ ...editValues, store_location: e.target.value })}
                                    className="w-full px-1 py-1 border rounded text-xs"
                                  >
                                    {storeLocations.map(loc => (
                                      <option key={loc.id} value={loc.store_name}>{loc.store_name}</option>
                                    ))}
                                  </select>
                                </>
                              )}
                              <div className="flex justify-center space-x-1 mt-2">
                                <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-100 rounded">
                                  <Save className="h-3 w-3" />
                                </button>
                                <button onClick={() => setEditingCell(null)} className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className={`p-2 rounded-lg border-2 ${schedule?.is_enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                              <input
                                type="checkbox"
                                checked={schedule?.is_enabled || false}
                                onChange={() => toggleSchedule(emp.employee_id, dateStr)}
                                className="h-4 w-4 mb-2"
                              />
                              {schedule?.is_enabled && (
                                <>
                                  <div className="text-xs font-mono">
                                    <div>{schedule.start_time}</div>
                                    <div>{schedule.end_time}</div>
                                  </div>
                                  <div className="text-xs text-blue-600 font-semibold my-1">
                                    {calculateHours(schedule.start_time || '', schedule.end_time || '').toFixed(1)}h
                                  </div>
                                  <div className="text-xs text-gray-600 truncate">{schedule.store_location?.split(' ')[0]}</div>
                                  <button
                                    onClick={() => startEditing(emp.employee_id, dateStr)}
                                    className="mt-1 p-1 text-blue-600 hover:bg-blue-100 rounded"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-4 text-center">
                      <div className="text-lg font-bold text-blue-600">{totalHours.toFixed(1)}h</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Save Button */}
      <div className="mt-6">
        <button
          onClick={saveSchedules}
          className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
        >
          <Save className="h-5 w-5" />
          <span>Save Schedule</span>
        </button>
      </div>

      {/* Bulk Assign Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Bulk Schedule Assignment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Time</label>
                <input
                  type="time"
                  value={bulkValues.start_time}
                  onChange={(e) => setBulkValues({ ...bulkValues, start_time: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Time</label>
                <input
                  type="time"
                  value={bulkValues.end_time}
                  onChange={(e) => setBulkValues({ ...bulkValues, end_time: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Store Location</label>
                <select
                  value={bulkValues.store_location}
                  onChange={(e) => setBulkValues({ ...bulkValues, store_location: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {storeLocations.map(loc => (
                    <option key={loc.id} value={loc.store_name}>{loc.store_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssign}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply to Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Calendar View Information</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• <strong>Traditional Calendar:</strong> Days run Sunday through Saturday across the top</p>
          <p>• <strong>Employee Sorting:</strong> Admins listed first, then employees alphabetically</p>
          <p>• <strong>Quick Edit:</strong> Click checkbox to enable/disable, click edit button for details</p>
          <p>• <strong>Bulk Operations:</strong> Use templates to set schedules for all selected employees</p>
          <p>• <strong>Store Locations:</strong> Defaults to primary store, can be changed per day</p>
          <p>• <strong>Hours Calculation:</strong> Automatically includes lunch deduction for shifts over 6 hours</p>
        </div>
      </div>
    </div>
  );
};

export default WorkSchedule;
