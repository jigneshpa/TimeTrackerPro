import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Download, Edit2, Eye, X, Plus, Save, Trash2 } from 'lucide-react';
import { getTimeReports, getEmployeeTimeEvents, updateTimeEvent, deleteTimeEvent, createTimeEvent, getEmployeeDailyBreakdown, getSystemSettings } from '../../lib/api';
import { toDateString } from '../../lib/timezone';

interface TimeReportData {
  employee_name: string;
  employee_id: string;
  employee_number: string;
  employee_role?: string;
  total_hours: number;
  lunch_hours: number;
  unpaid_hours: number;
  paid_hours: number;
  vacation_accrued: number;
  approved_vacation_hours: number;
}

interface TimeEvent {
  id: string;
  employee_id: string;
  entry_type: string;
  timestamp: string;
  notes?: string;
}

interface DailyBreakdown {
  date: string;
  clock_in: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  unpaid_start: string | null;
  unpaid_end: string | null;
  clock_out: string | null;
  total_hours: number;
  total_unpaid: number;
  total_paid: number;
}

interface PayPeriod {
  label: string;
  startDate: string;
  endDate: string;
}

const TimeReports: React.FC = () => {
  const [reportData, setReportData] = useState<TimeReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<TimeReportData | null>(null);
  const [timeEvents, setTimeEvents] = useState<TimeEvent[]>([]);
  const [dailyBreakdown, setDailyBreakdown] = useState<DailyBreakdown[]>([]);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectionMode, setSelectionMode] = useState<'period' | 'daterange'>('period');
  const [systemSettings, setSystemSettings] = useState<any>(null);

  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);

  const [startDate, setStartDate] = useState(toDateString(sunday));
  const [endDate, setEndDate] = useState(toDateString(saturday));

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await getTimeReports(startDate, endDate);

      if (response.success && response.data) {
        // Sort: Admins first, then Employees, both alphabetically
        const sortedData = response.data.sort((a: TimeReportData, b: TimeReportData) => {
          // Sort by role first (admins before employees)
          const aRole = a.employee_role || '';
          const bRole = b.employee_role || '';

          const aIsAdmin = aRole.includes('admin');
          const bIsAdmin = bRole.includes('admin');

          if (aIsAdmin !== bIsAdmin) {
            return aIsAdmin ? -1 : 1;
          }

          // Then sort alphabetically by name
          return a.employee_name.toLowerCase().localeCompare(b.employee_name.toLowerCase());
        });
        setReportData(sortedData);
      } else {
        setReportData([]);
      }
    } catch (error) {
      console.error('Error fetching time reports:', error);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = () => {
    if (startDate && endDate) {
      fetchReports();
    }
  };

  useEffect(() => {
    const initializeReports = async () => {
      // Fetch system settings first
      const settingsResponse = await getSystemSettings();
      if (settingsResponse.success && settingsResponse.data) {
        setSystemSettings(settingsResponse.data);
        const periods = generatePayPeriods(settingsResponse.data);
        // Set current period as default
        if (periods.length > 0) {
          const currentPeriod = findCurrentPayPeriod(periods);
          if (currentPeriod) {
            setSelectedPeriod(currentPeriod.label);
            setStartDate(currentPeriod.startDate);
            setEndDate(currentPeriod.endDate);
          }
        }
      } else {
        // Fallback to weekly periods if settings not available
        const periods = generatePayPeriods(null);
        if (periods.length > 0) {
          const currentPeriod = periods.find(p => p.startDate === startDate && p.endDate === endDate);
          if (currentPeriod) {
            setSelectedPeriod(currentPeriod.label);
          }
        }
      }
      fetchReports();
    };
    initializeReports();
  }, []);

  const generatePayPeriods = (settings: any) => {
    const periods: PayPeriod[] = [];
    const currentDate = new Date();

    // Get settings or use defaults
    const periodType = settings?.pay_period_type || 'weekly';
    const startDateStr = settings?.pay_period_start_date || '2025-01-05';
    const baseStartDate = new Date(startDateStr + 'T00:00:00'); // Ensure proper date parsing

    // Calculate period length in days
    let periodDays = 7; // Default weekly
    const normalizedType = periodType.toLowerCase().replace('-', '');
    if (normalizedType === 'biweekly') {
      periodDays = 14;
    } else if (normalizedType === 'semimonthly') {
      periodDays = 15;
    } else if (normalizedType === 'monthly') {
      periodDays = 30;
    }

    // Calculate which period index today falls into
    const daysSinceStart = Math.floor((currentDate.getTime() - baseStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentPeriodIndex = Math.floor(daysSinceStart / periodDays);

    // Generate periods: 26 periods back and 26 forward from the current period
    for (let i = currentPeriodIndex - 26; i <= currentPeriodIndex + 26; i++) {
      const periodStart = new Date(baseStartDate);
      periodStart.setDate(baseStartDate.getDate() + (i * periodDays));

      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + periodDays - 1);

      const periodLabel = `Period ${i + 1} (${periodStart.getMonth() + 1}/${periodStart.getDate()}/${periodStart.getFullYear()} - ${periodEnd.getMonth() + 1}/${periodEnd.getDate()}/${periodEnd.getFullYear()})`;

      periods.push({
        label: periodLabel,
        startDate: toDateString(periodStart),
        endDate: toDateString(periodEnd)
      });
    }

    setPayPeriods(periods);
    return periods;
  };

  const findCurrentPayPeriod = (periods: PayPeriod[]) => {
    const today = toDateString(new Date());
    return periods.find(p => p.startDate <= today && p.endDate >= today) || periods[26]; // Default to middle period (current)
  };

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    if (value) {
      const period = payPeriods.find(p => p.label === value);
      if (period) {
        setStartDate(period.startDate);
        setEndDate(period.endDate);
        fetchReports();
      }
    }
  };

  const handleSelectionModeChange = (mode: 'period' | 'daterange') => {
    setSelectionMode(mode);
    if (mode === 'period' && selectedPeriod) {
      const period = payPeriods.find(p => p.label === selectedPeriod);
      if (period) {
        setStartDate(period.startDate);
        setEndDate(period.endDate);
      }
    }
  };

  const handleManualDateChange = () => {
    if (startDate && endDate && selectionMode === 'daterange') {
      setSelectedPeriod('');
      fetchReports();
    }
  };

  const handleExportCSV = () => {
    if (!reportData.length) {
      alert('No data to export');
      return;
    }

    const headers = [
      'Employee',
      'Employee Number',
      'Total Hours',
      'Lunch Hours',
      'Unpaid Hours',
      'Paid Hours',
      'Vacation Accrued',
      'Approved Vacation Hours'
    ];

    const rows = reportData.map(report => [
      report.employee_name,
      report.employee_number || '',
      report.total_hours.toFixed(2),
      report.lunch_hours.toFixed(2),
      report.unpaid_hours.toFixed(2),
      report.paid_hours.toFixed(2),
      report.vacation_accrued.toFixed(2),
      report.approved_vacation_hours.toFixed(2)
    ]);

    const csvContent = [
      [`Time Report - ${startDate} to ${endDate}`],
      [],
      headers,
      ...rows,
      [],
      ['Summary'],
      ['Total Employees', reportData.length],
      ['Total Paid Hours', reportData.reduce((sum, r) => sum + r.paid_hours, 0).toFixed(2)],
      ['Total Vacation Accrued', reportData.reduce((sum, r) => sum + r.vacation_accrued, 0).toFixed(2)],
      ['Total Approved Vacation Hours', reportData.reduce((sum, r) => sum + r.approved_vacation_hours, 0).toFixed(2)]
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `time-report-${startDate}-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleEditClick = async (employee: TimeReportData) => {
    setSelectedEmployee(employee);
    setShowManageModal(true);
    try {
      const response = await getEmployeeTimeEvents(employee.employee_id, startDate, endDate);
      if (response.success && response.data) {
        setTimeEvents(response.data);
      }
    } catch (error) {
      console.error('Error fetching time events:', error);
    }
  };

  const handleDailyViewClick = async (employee: TimeReportData) => {
    setSelectedEmployee(employee);
    setShowDailyModal(true);
    try {
      const response = await getEmployeeDailyBreakdown(employee.employee_id, startDate, endDate);
      if (response.success && response.data) {
        setDailyBreakdown(response.data);
      }
    } catch (error) {
      console.error('Error fetching daily breakdown:', error);
    }
  };

  const handleUpdateEvent = async (eventId: string, updatedData: Partial<TimeEvent>) => {
    try {
      await updateTimeEvent({ id: eventId, ...updatedData });
      const response = await getEmployeeTimeEvents(selectedEmployee!.employee_id, startDate, endDate);
      if (response.success && response.data) {
        setTimeEvents(response.data);
      }
      setEditingEvent(null);
      fetchReports();
    } catch (error) {
      console.error('Error updating time event:', error);
      alert('Failed to update time event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return;

    try {
      await deleteTimeEvent(eventId);
      const response = await getEmployeeTimeEvents(selectedEmployee!.employee_id, startDate, endDate);
      if (response.success && response.data) {
        setTimeEvents(response.data);
      }
      fetchReports();
    } catch (error) {
      console.error('Error deleting time event:', error);
      alert('Failed to delete time event');
    }
  };

  const handleAddEvent = async (eventData: { entry_type: string; timestamp: string }) => {
    try {
      await createTimeEvent({
        employee_id: selectedEmployee!.employee_id,
        ...eventData
      });
      const response = await getEmployeeTimeEvents(selectedEmployee!.employee_id, startDate, endDate);
      if (response.success && response.data) {
        setTimeEvents(response.data);
      }
      setShowAddForm(false);
      fetchReports();
    } catch (error) {
      console.error('Error creating time event:', error);
      alert('Failed to create time event');
    }
  };

  const getEntryTypeLabel = (type: string) => {
    const labels: { [key: string]: { text: string; color: string } } = {
      clock_in: { text: 'Clock In', color: 'text-green-600' },
      clock_out: { text: 'Clock Out', color: 'text-red-600' },
      lunch_out: { text: 'Lunch Start', color: 'text-orange-600' },
      lunch_in: { text: 'Lunch End', color: 'text-orange-600' },
      unpaid_out: { text: 'Unpaid Start', color: 'text-purple-600' },
      unpaid_in: { text: 'Unpaid End', color: 'text-purple-600' }
    };
    return labels[type] || { text: type, color: 'text-gray-600' };
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Clock className="h-6 w-6 text-gray-600" />
          <h2 className="text-2xl font-bold text-gray-900">Time Reports</h2>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={reportData.length === 0}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="h-5 w-5 text-gray-600" />
          <label className="text-sm font-medium text-gray-700">Date Selection:</label>
        </div>

        {/* Radio buttons for selection mode */}
        <div className="flex items-center gap-6 mb-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="selectionMode"
              value="period"
              checked={selectionMode === 'period'}
              onChange={() => handleSelectionModeChange('period')}
              className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Pay Period</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="selectionMode"
              value="daterange"
              checked={selectionMode === 'daterange'}
              onChange={() => handleSelectionModeChange('daterange')}
              className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Date Range</span>
          </label>
        </div>

        {/* Pay Period Selection */}
        {selectionMode === 'period' && (
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex-1 min-w-[250px]">
              <label className="block text-xs text-gray-600 mb-1">Select Pay Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a pay period...</option>
                {payPeriods.map((period) => (
                  <option key={period.label} value={period.label}>
                    {period.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Date Range Selection */}
        {selectionMode === 'daterange' && (
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Start Date</label>
              <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleManualDateChange}
            disabled={!startDate || !endDate}
            className="mt-5 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading reports...</p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Employee</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Employee Number</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Total Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Lunch Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Unpaid Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Paid Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Vacation Accrued</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Approved Vacation</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((report) => (
                  <tr key={report.employee_id} className="border-b border-gray-100 hover:bg-white">
                    <td className="py-3 px-4 font-medium text-gray-900">{report.employee_name}</td>
                    <td className="py-3 px-4 text-gray-600">{report.employee_number}</td>
                    <td className="py-3 px-4 text-blue-600 font-semibold">
                      {report.total_hours.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-orange-600 font-medium">
                      {report.lunch_hours.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-red-600 font-medium">
                      {report.unpaid_hours.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-green-600 font-semibold">
                      {report.paid_hours.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-purple-600 font-semibold">
                      {report.vacation_accrued.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-blue-600 font-semibold">
                      {report.approved_vacation_hours.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleEditClick(report)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDailyViewClick(report)}
                          className="text-green-600 hover:text-green-800"
                          title="Daily View"
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

          {reportData.length === 0 && (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No time data found for the selected pay period.</p>
            </div>
          )}
        </div>
      )}

      {showManageModal && selectedEmployee && (
        <ManageTimeEntriesModal
          employee={selectedEmployee}
          timeEvents={timeEvents}
          onClose={() => {
            setShowManageModal(false);
            setSelectedEmployee(null);
            setEditingEvent(null);
            setShowAddForm(false);
          }}
          editingEvent={editingEvent}
          setEditingEvent={setEditingEvent}
          onUpdate={handleUpdateEvent}
          onDelete={handleDeleteEvent}
          onAdd={handleAddEvent}
          showAddForm={showAddForm}
          setShowAddForm={setShowAddForm}
          getEntryTypeLabel={getEntryTypeLabel}
        />
      )}

      {showDailyModal && selectedEmployee && (
        <DailyBreakdownModal
          employee={selectedEmployee}
          dailyBreakdown={dailyBreakdown}
          onClose={() => {
            setShowDailyModal(false);
            setSelectedEmployee(null);
          }}
        />
      )}
    </div>
  );
};

const ManageTimeEntriesModal: React.FC<{
  employee: TimeReportData;
  timeEvents: TimeEvent[];
  onClose: () => void;
  editingEvent: string | null;
  setEditingEvent: (id: string | null) => void;
  onUpdate: (eventId: string, data: Partial<TimeEvent>) => void;
  onDelete: (eventId: string) => void;
  onAdd: (data: { entry_type: string; timestamp: string }) => void;
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  getEntryTypeLabel: (type: string) => { text: string; color: string };
}> = ({
  employee,
  timeEvents,
  onClose,
  editingEvent,
  setEditingEvent,
  onUpdate,
  onDelete,
  onAdd,
  showAddForm,
  setShowAddForm,
  getEntryTypeLabel
}) => {
  const [editForm, setEditForm] = useState<{ entry_type: string; timestamp: string; date: string; time: string }>({
    entry_type: '',
    timestamp: '',
    date: '',
    time: ''
  });

  const [addForm, setAddForm] = useState<{ entry_type: string; date: string; time: string }>({
    entry_type: 'clock_in',
    date: new Date().toISOString().split('T')[0],
    time: '08:00'
  });

  const handleEditClick = (event: TimeEvent) => {
    const eventDate = new Date(event.timestamp);
    setEditForm({
      entry_type: event.entry_type,
      timestamp: event.timestamp,
      date: eventDate.toISOString().split('T')[0],
      time: eventDate.toTimeString().slice(0, 5)
    });
    setEditingEvent(event.id);
  };

  const handleSaveEdit = (eventId: string) => {
    const timestamp = `${editForm.date} ${editForm.time}:00`;
    onUpdate(eventId, {
      entry_type: editForm.entry_type,
      timestamp
    });
  };

  const handleAddSubmit = () => {
    const timestamp = `${addForm.date} ${addForm.time}:00`;
    onAdd({
      entry_type: addForm.entry_type,
      timestamp
    });
    setAddForm({
      entry_type: 'clock_in',
      date: new Date().toISOString().split('T')[0],
      time: '08:00'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Clock className="h-6 w-6 text-gray-600" />
            <h3 className="text-xl font-bold text-gray-900">
              Manage Time Entries - {employee.employee_name}
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Entry</span>
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-gray-900 mb-4">Add New Time Entry</h4>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entry Type</label>
                  <select
                    value={addForm.entry_type}
                    onChange={(e) => setAddForm({ ...addForm, entry_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="clock_in">Clock In</option>
                    <option value="lunch_out">Lunch Start</option>
                    <option value="lunch_in">Lunch End</option>
                    <option value="unpaid_out">Unpaid Start</option>
                    <option value="unpaid_in">Unpaid End</option>
                    <option value="clock_out">Clock Out</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={addForm.date}
                    onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={addForm.time}
                    onChange={(e) => setAddForm({ ...addForm, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <button
                    onClick={handleAddSubmit}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Entry Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Time</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {timeEvents.map((event) => (
                <tr key={event.id} className="border-b border-gray-100">
                  {editingEvent === event.id ? (
                    <>
                      <td className="py-3 px-4">
                        <select
                          value={editForm.entry_type}
                          onChange={(e) => setEditForm({ ...editForm, entry_type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="clock_in">Clock In</option>
                          <option value="lunch_out">Lunch Start</option>
                          <option value="lunch_in">Lunch End</option>
                          <option value="unpaid_out">Unpaid Start</option>
                          <option value="unpaid_in">Unpaid End</option>
                          <option value="clock_out">Clock Out</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="date"
                          value={editForm.date}
                          onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="time"
                          value={editForm.time}
                          onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleSaveEdit(event.id)}
                            className="text-green-600 hover:text-green-800"
                            title="Save"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingEvent(null)}
                            className="text-gray-600 hover:text-gray-800"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`py-3 px-4 font-medium ${getEntryTypeLabel(event.entry_type).color}`}>
                        {getEntryTypeLabel(event.entry_type).text}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(event.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditClick(event)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDelete(event.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {timeEvents.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No time entries found for this period.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DailyBreakdownModal: React.FC<{
  employee: TimeReportData;
  dailyBreakdown: DailyBreakdown[];
  onClose: () => void;
}> = ({ employee, dailyBreakdown, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Clock className="h-6 w-6 text-gray-600" />
            <h3 className="text-xl font-bold text-gray-900">
              Daily Breakdown - {employee.employee_name}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Clock In</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Lunch Start</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Lunch End</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Unpaid Start</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Unpaid End</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Clock Out</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Total Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Total Unpaid</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Total Paid</th>
                </tr>
              </thead>
              <tbody>
                {dailyBreakdown.map((day) => (
                  <tr key={day.date} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {new Date(day.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {day.clock_in || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {day.lunch_start || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {day.lunch_end || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {day.unpaid_start || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {day.unpaid_end || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {day.clock_out || '-'}
                    </td>
                    <td className="py-3 px-4 text-blue-600 font-semibold">
                      {day.total_hours.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-red-600 font-medium">
                      {day.total_unpaid.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-green-600 font-semibold">
                      {day.total_paid.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {dailyBreakdown.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No daily breakdown data available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeReports;
