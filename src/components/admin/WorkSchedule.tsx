import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Edit, Save, X, Plus, Copy, Trash2, Users } from 'lucide-react';
import {
  getEmployees,
  getStoreLocations,
  getSystemSettings,
  getWorkSchedules,
  bulkSaveWorkSchedules,
  copyWeekSchedules,
  clearWeekSchedules
} from '../../lib/api';

interface ScheduleTemplate {
  id: string;
  name: string;
  type: 'every_day_full' | 'every_day_8hours' | 'weekdays_only';
  description: string;
}

interface WorkDay {
  date: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  store_location: string;
  is_scheduled: boolean;
  hours: number;
  notes?: string;
}

interface Employee {
  employee_id: string;
  first_name: string;
  last_name: string;
  primary_location: string;
  role: string;
}

interface StoreLocation {
  id: number;
  store_name: string;
}

interface SystemSettings {
  pay_period_start_date: string;
  pay_period_type: string;
  default_lunch_duration_minutes: number;
  daily_shifts: {
    [key: string]: { start: string; end: string; enabled: boolean };
  };
}

const scheduleTemplates: ScheduleTemplate[] = [
  {
    id: 'every_day_full',
    name: 'Every Day - Full Shift',
    type: 'every_day_full',
    description: 'Sunday through Saturday, start of shift to end of shift'
  },
  {
    id: 'every_day_8hours',
    name: 'Every Day - 8 Hours',
    type: 'every_day_8hours',
    description: 'Sunday through Saturday, start of shift to 8 hours (with lunch)'
  },
  {
    id: 'weekdays_only',
    name: 'Weekdays Only',
    type: 'weekdays_only',
    description: 'Monday through Friday only, no weekends'
  }
];

const WorkSchedule: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [workDays, setWorkDays] = useState<{ [employeeId: string]: WorkDay[] }>({});
  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<{ employeeId: string; date: string } | null>(null);
  const [editValues, setEditValues] = useState<Partial<WorkDay>>({});
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [roleFilters, setRoleFilters] = useState<{ admin: boolean; employee: boolean }>({
    admin: true,
    employee: true
  });
  const [storeFilters, setStoreFilters] = useState<{ [store: string]: boolean }>({});

  const filteredAndSortedEmployees = [...employees]
    .filter(emp => {
      const isAdmin = emp.role === 'admin' || emp.role === 'master_admin' || emp.role?.includes('admin');
      const roleMatch = isAdmin ? roleFilters.admin : roleFilters.employee;
      const storeMatch = !emp.primary_location || storeFilters[emp.primary_location] !== false;
      return roleMatch && storeMatch;
    })
    .sort((a, b) => {
      const aIsAdmin = a.role === 'admin' || a.role === 'master_admin' || a.role?.includes('admin');
      const bIsAdmin = b.role === 'admin' || b.role === 'master_admin' || b.role?.includes('admin');
      if (aIsAdmin !== bIsAdmin) {
        return aIsAdmin ? -1 : 1;
      }
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    });

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    if (selectedEmployees.length > 0 && selectedWeek) {
      fetchWorkSchedule();
    }
  }, [selectedEmployees, selectedWeek]);

  const initializeData = async () => {
    try {
      const [empResponse, locResponse, settingsResponse] = await Promise.all([
        getEmployees(),
        getStoreLocations(),
        getSystemSettings()
      ]);

      if (empResponse.success && empResponse.data) {
        const empList = empResponse.data
          .filter((emp: any) => emp.employee_id != null)
          .map((emp: any) => ({
            ...emp,
            employee_id: String(emp.employee_id),
            primary_location: emp.primary_location || ''
          }));
        setEmployees(empList);
        setSelectedEmployees(empList.map((e: Employee) => e.employee_id));
      }

      if (locResponse.success && locResponse.data) {
        setStoreLocations(locResponse.data);
        const filters: { [key: string]: boolean } = {};
        locResponse.data.forEach((loc: StoreLocation) => {
          filters[loc.store_name] = true;
        });

        empList.forEach((emp: Employee) => {
          if (emp.primary_location && !filters[emp.primary_location]) {
            filters[emp.primary_location] = true;
          }
        });

        setStoreFilters(filters);
      }

      if (settingsResponse.success && settingsResponse.data) {
        setSystemSettings(settingsResponse.data);
        const startDate = calculateCurrentPeriodStart(
          settingsResponse.data.pay_period_start_date,
          settingsResponse.data.pay_period_type === 'biweekly' ? 14 : 7
        );
        setSelectedWeek(startDate);
      } else {
        const today = new Date();
        const sunday = new Date(today);
        sunday.setDate(today.getDate() - today.getDay());
        setSelectedWeek(sunday.toISOString().split('T')[0]);
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
    return periodStart.toISOString().split('T')[0];
  };

  const fetchWorkSchedule = async () => {
    setLoading(true);
    try {
      const weekStart = new Date(selectedWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const response = await getWorkSchedules(
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0],
        selectedEmployees
      );

      const allWorkDays: { [employeeId: string]: WorkDay[] } = {};
      const dailyShifts = systemSettings?.daily_shifts || {};

      for (const employeeId of selectedEmployees) {
        const employee = employees.find(emp => emp.employee_id === employeeId);
        const weekDays: WorkDay[] = [];

        for (let i = 0; i < 7; i++) {
          const date = new Date(weekStart);
          date.setDate(weekStart.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];

          const existingSchedule = response.success && response.data
            ? response.data.find((s: any) => String(s.employee_id) === String(employeeId) && s.schedule_date === dateStr)
            : null;

          const dayShift = dailyShifts[dayName] || { start: '08:00', end: '17:00', enabled: true };

          weekDays.push({
            date: dateStr,
            employee_id: employeeId,
            start_time: existingSchedule?.start_time || dayShift.start,
            end_time: existingSchedule?.end_time || dayShift.end,
            store_location: existingSchedule?.store_location || employee?.primary_location || (storeLocations.length > 0 ? storeLocations[0].store_name : ''),
            is_scheduled: existingSchedule ? existingSchedule.is_enabled === 1 : dayShift.enabled,
            hours: existingSchedule?.total_hours || calculateHours(dayShift.start, dayShift.end),
            notes: existingSchedule?.notes || ''
          });
        }

        allWorkDays[employeeId] = weekDays;
      }

      setWorkDays(allWorkDays);
    } catch (error) {
      console.error('Error fetching work schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = (startTime: string, endTime: string, includeLunch: boolean = true) => {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (includeLunch && hours > 6) {
      const lunchMinutes = systemSettings?.default_lunch_duration_minutes || 60;
      hours -= lunchMinutes / 60;
    }

    return Math.max(0, hours);
  };

  const saveWorkSchedule = async () => {
    if (selectedEmployees.length === 0 || !selectedWeek) return;

    try {
      const schedules: any[] = [];

      for (const employeeId of selectedEmployees) {
        const employeeWorkDays = workDays[employeeId] || [];
        employeeWorkDays.forEach(day => {
          schedules.push({
            employee_id: day.employee_id,
            schedule_date: day.date,
            start_time: day.start_time,
            end_time: day.end_time,
            total_hours: day.hours,
            store_location: day.store_location,
            is_enabled: day.is_scheduled,
            notes: day.notes || ''
          });
        });
      }

      await bulkSaveWorkSchedules(schedules);
      alert('Schedule saved successfully!');
    } catch (error) {
      console.error('Error saving work schedule:', error);
      alert('Failed to save schedule');
    }
  };

  const applyTemplate = async () => {
    if (!selectedTemplate || selectedEmployees.length === 0) return;

    const template = scheduleTemplates.find(t => t.id === selectedTemplate);
    if (!template) return;

    const dailyShifts = systemSettings?.daily_shifts || {};
    const updatedWorkDays: { [employeeId: string]: WorkDay[] } = {};

    for (const employeeId of selectedEmployees) {
      const employee = employees.find(emp => emp.employee_id === employeeId);
      const employeeWorkDays = workDays[employeeId] || [];

      const updatedEmployeeWorkDays = employeeWorkDays.map(day => {
        const date = new Date(day.date);
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
        const dayShift = dailyShifts[dayName] || { start: '08:00', end: '17:00', enabled: true };

        let newDay = { ...day };

        switch (template.type) {
          case 'every_day_full':
            newDay.is_scheduled = true;
            newDay.start_time = dayShift.start;
            newDay.end_time = dayShift.end;
            newDay.hours = calculateHours(dayShift.start, dayShift.end);
            break;

          case 'every_day_8hours':
            newDay.is_scheduled = true;
            newDay.start_time = dayShift.start;
            const startTime = new Date(`2000-01-01T${dayShift.start}:00`);
            const lunchMinutes = systemSettings?.default_lunch_duration_minutes || 60;
            const endTime = new Date(startTime.getTime() + (8 * 60 * 60 * 1000) + (lunchMinutes * 60 * 1000));
            newDay.end_time = endTime.toTimeString().substring(0, 5);
            newDay.hours = 8;
            break;

          case 'weekdays_only':
            const isWeekday = date.getDay() >= 1 && date.getDay() <= 5;
            newDay.is_scheduled = isWeekday;
            if (isWeekday) {
              newDay.start_time = dayShift.start;
              newDay.end_time = dayShift.end;
              newDay.hours = calculateHours(dayShift.start, dayShift.end);
            }
            break;
        }

        newDay.store_location = employee?.primary_location || (storeLocations.length > 0 ? storeLocations[0].store_name : '');

        return newDay;
      });

      updatedWorkDays[employeeId] = updatedEmployeeWorkDays;
    }

    setWorkDays(updatedWorkDays);
    setShowBulkAssign(false);
    setSelectedTemplate('');
  };

  const startEditing = (employeeId: string, date: string) => {
    const employeeWorkDays = workDays[employeeId] || [];
    const day = employeeWorkDays.find(d => d.date === date);
    if (day) {
      setEditingCell({ employeeId, date });
      setEditValues(day);
    }
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    const updatedWorkDays = { ...workDays };

    updatedWorkDays[editingCell.employeeId] = workDays[editingCell.employeeId].map(day => {
      if (day.date === editingCell.date) {
        const updatedDay = { ...day, ...editValues };
        updatedDay.hours = calculateHours(updatedDay.start_time, updatedDay.end_time);
        return updatedDay;
      }
      return day;
    });

    setWorkDays(updatedWorkDays);
    setEditingCell(null);
    setEditValues({});
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValues({});
  };

  const toggleScheduled = (employeeId: string, date: string) => {
    const updatedWorkDays = { ...workDays };
    updatedWorkDays[employeeId] = workDays[employeeId].map(day => {
      if (day.date === date) {
        return { ...day, is_scheduled: !day.is_scheduled };
      }
      return day;
    });

    setWorkDays(updatedWorkDays);
  };

  const copyWeek = async () => {
    try {
      const sourceStart = new Date(selectedWeek);
      const targetStart = new Date(sourceStart);
      targetStart.setDate(sourceStart.getDate() + 7);

      await copyWeekSchedules(
        sourceStart.toISOString().split('T')[0],
        targetStart.toISOString().split('T')[0],
        selectedEmployees,
        7
      );

      alert('Week copied successfully!');
      setSelectedWeek(targetStart.toISOString().split('T')[0]);
    } catch (error) {
      console.error('Error copying week:', error);
      alert('Failed to copy week');
    }
  };

  const clearWeek = async () => {
    if (confirm('Are you sure you want to clear all schedules for this week?')) {
      try {
        const weekStart = new Date(selectedWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        await clearWeekSchedules(
          weekStart.toISOString().split('T')[0],
          weekEnd.toISOString().split('T')[0],
          selectedEmployees
        );

        alert('Week cleared successfully!');
        fetchWorkSchedule();
      } catch (error) {
        console.error('Error clearing week:', error);
        alert('Failed to clear week');
      }
    }
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleRoleFilterChange = (role: 'admin' | 'employee', checked: boolean) => {
    setRoleFilters(prev => ({ ...prev, [role]: checked }));
  };

  const handleStoreFilterChange = (store: string, checked: boolean) => {
    setStoreFilters(prev => ({ ...prev, [store]: checked }));
  };

  const getWeekDates = (weekStart: string) => {
    const dates = [];
    const start = new Date(weekStart);

    const currentDay = start.getDay();
    if (currentDay !== 0) {
      start.setDate(start.getDate() - currentDay);
    }

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }

    return dates;
  };

  const getWeekRange = (weekStart: string) => {
    const start = new Date(weekStart);

    const currentDay = start.getDay();
    if (currentDay !== 0) {
      start.setDate(start.getDate() - currentDay);
    }

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getEmployeeTotalHours = (employeeId: string) => {
    const employeeWorkDays = workDays[employeeId] || [];
    return employeeWorkDays.filter(d => d.is_scheduled).reduce((sum, day) => sum + day.hours, 0);
  };

  const weekDates = selectedWeek ? getWeekDates(selectedWeek) : [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="h-6 w-6 text-gray-600" />
          <h2 className="text-2xl font-bold text-gray-900">Work Schedule</h2>
        </div>
      </div>

      {showBulkAssign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Bulk Schedule Assignment</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a template...</option>
                  {scheduleTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                {selectedTemplate && (
                  <p className="text-sm text-gray-600 mt-2">
                    {scheduleTemplates.find(t => t.id === selectedTemplate)?.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowBulkAssign(false);
                  setSelectedTemplate('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applyTemplate}
                disabled={!selectedTemplate}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                <span>Apply Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Week Starting (Sunday)
            </label>
            <input
              type="date"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {selectedWeek && (
            <div className="sm:mt-6">
              <p className="text-sm text-gray-600">
                Week: {getWeekRange(selectedWeek)}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowBulkAssign(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Bulk Assign</span>
          </button>
          <button
            onClick={copyWeek}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Copy className="h-4 w-4" />
            <span>Copy Week</span>
          </button>
          <button
            onClick={clearWeek}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear Week</span>
          </button>
        </div>
      </div>

      <div className="space-y-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            By Role
          </label>
          <div className="flex items-center space-x-6 bg-gray-50 border border-gray-300 rounded-lg p-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={roleFilters.admin}
                onChange={(e) => handleRoleFilterChange('admin', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-900">Admins</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={roleFilters.employee}
                onChange={(e) => handleRoleFilterChange('employee', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-900">Employees</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Employees ({selectedEmployees.length} selected)
          </label>
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 min-h-[200px]">
              {filteredAndSortedEmployees.map(employee => (
                <label key={employee.employee_id} className="flex items-start space-x-2 cursor-pointer hover:bg-white p-2 rounded border border-transparent hover:border-gray-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(employee.employee_id)}
                    onChange={() => toggleEmployeeSelection(employee.employee_id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate" title={`${employee.first_name} ${employee.last_name}`}>
                      {employee.first_name} {employee.last_name}
                    </div>
                    <div className="flex items-center space-x-1 mt-1">
                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${
                        employee.role?.includes('admin')
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {employee.role?.includes('admin') ? 'admin' : 'employee'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-1" title={employee.primary_location}>
                      {employee.primary_location}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {filteredAndSortedEmployees.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">No employees match the current filters.</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            By Store Location
          </label>
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {storeLocations.map(loc => (
                <label key={loc.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storeFilters[loc.store_name] || false}
                    onChange={(e) => handleStoreFilterChange(loc.store_name, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-900 truncate" title={loc.store_name}>
                    {loc.store_name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedEmployees.length > 0 && selectedWeek && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Work Schedule Calendar
            </h3>
            <p className="text-sm text-gray-600">
              Week: {getWeekRange(selectedWeek)} (Sunday - Saturday)
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading schedule...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-medium text-gray-900 bg-gray-50 sticky left-0 z-10 min-w-[200px]">
                      Employee
                    </th>
                    {weekDates.map((date, index) => (
                      <th key={index} className="text-center py-4 px-3 font-medium text-gray-900 bg-gray-50 min-w-[140px]">
                        <div>
                          <div className="text-sm font-semibold">
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div className="text-xs text-gray-600">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </th>
                    ))}
                    <th className="text-center py-4 px-1 font-medium text-gray-900 bg-gray-50 min-w-[60px] w-[60px]">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEmployees.map(employeeId => {
                    const employee = filteredAndSortedEmployees.find(emp => emp.employee_id === employeeId);
                    if (!employee) return null;

                    const employeeWorkDays = workDays[employeeId] || [];
                    const totalHours = getEmployeeTotalHours(employeeId);

                    return (
                      <tr key={employeeId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 sticky left-0 bg-gray-50 border-r">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-semibold text-blue-600">
                                {employee.first_name[0]}{employee.last_name[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-gray-900">{employee.first_name} {employee.last_name}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                  employee.role?.includes('admin') ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {employee.role?.includes('admin') ? 'Admin' : 'Employee'}
                                </span>
                                {employee.primary_location && (
                                  <span className="text-xs text-gray-500">• {employee.primary_location}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        {weekDates.map((date, dayIndex) => {
                          const dateStr = date.toISOString().split('T')[0];
                          const dayData = employeeWorkDays.find(d => d.date === dateStr);
                          const isEditing = editingCell?.employeeId === employeeId && editingCell?.date === dateStr;

                          return (
                            <td key={dayIndex} className="py-2 px-2 text-center">
                              {dayData && (
                                <div className={`p-2 rounded-lg border-2 ${
                                  dayData.is_scheduled
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-gray-50 border-gray-200'
                                }`}>
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-center">
                                        <input
                                          type="checkbox"
                                          checked={editValues.is_scheduled || false}
                                          onChange={(e) => setEditValues(prev => ({ ...prev, is_scheduled: e.target.checked }))}
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                      </div>
                                      {editValues.is_scheduled && (
                                        <>
                                          <div className="space-y-1">
                                            <input
                                              type="time"
                                              value={editValues.start_time || ''}
                                              onChange={(e) => setEditValues(prev => ({ ...prev, start_time: e.target.value }))}
                                              className="w-full px-1 py-1 border border-gray-300 rounded text-xs"
                                            />
                                            <input
                                              type="time"
                                              value={editValues.end_time || ''}
                                              onChange={(e) => setEditValues(prev => ({ ...prev, end_time: e.target.value }))}
                                              className="w-full px-1 py-1 border border-gray-300 rounded text-xs"
                                            />
                                          </div>
                                          <select
                                            value={editValues.store_location || ''}
                                            onChange={(e) => setEditValues(prev => ({ ...prev, store_location: e.target.value }))}
                                            className="w-full px-1 py-1 border border-gray-300 rounded text-xs"
                                          >
                                            {storeLocations.map(location => (
                                              <option key={location.id} value={location.store_name}>
                                                {location.store_name}
                                              </option>
                                            ))}
                                          </select>
                                        </>
                                      )}
                                      <div className="flex items-center justify-center space-x-1">
                                        <button
                                          onClick={saveEdit}
                                          className="p-1 text-green-600 hover:bg-green-100 rounded"
                                        >
                                          <Save className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={cancelEdit}
                                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-center">
                                        <input
                                          type="checkbox"
                                          checked={dayData.is_scheduled}
                                          onChange={() => toggleScheduled(employeeId, dateStr)}
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                      </div>
                                      {dayData.is_scheduled && (
                                        <>
                                          <div className="text-xs font-mono text-gray-700">
                                            <div>{dayData.start_time}</div>
                                            <div>{dayData.end_time}</div>
                                          </div>
                                          <div className="text-xs text-blue-600 font-semibold">
                                            {dayData.hours.toFixed(1)}h
                                          </div>
                                          <div className="text-xs text-gray-600 truncate" title={dayData.store_location}>
                                            {dayData.store_location.split(' ')[0]}
                                          </div>
                                          <button
                                            onClick={() => startEditing(employeeId, dateStr)}
                                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-1 text-center">
                          <div className="text-lg font-bold text-blue-600">
                            {totalHours.toFixed(1)}h
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-6 border-t">
            <button
              onClick={saveWorkSchedule}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Save Schedule</span>
            </button>
          </div>
        </div>
      )}

      {filteredAndSortedEmployees.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p>No employees match the current filters.</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting the role or store location filters.</p>
        </div>
      ) : selectedEmployees.filter(id => filteredAndSortedEmployees.find(emp => emp.employee_id === id)).length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p>Please select at least one employee to manage their work schedule.</p>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
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
      </div>
    </div>
  );
};

export default WorkSchedule;
