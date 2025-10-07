import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Download, ChevronDown } from 'lucide-react';
import { getTimeReports } from '../../lib/api';

interface TimeEntry {
  id: string;
  employee_id: string;
  entry_type: 'clock_in' | 'clock_out' | 'lunch_out' | 'lunch_in' | 'unpaid_out' | 'unpaid_in';
  timestamp: string;
  created_at: string;
}

interface TimeReportData {
  employee_name: string;
  employee_id: string;
  employee_number: string;
  total_hours: number;
  lunch_hours: number;
  unpaid_hours: number;
  paid_hours: number;
  vacation_hours: number;
}

interface PayPeriod {
  number: number;
  start_date: string;
  end_date: string;
  label: string;
}


const TimeReports: React.FC = () => {
  const [reportData, setReportData] = useState<TimeReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayPeriod, setSelectedPayPeriod] = useState<PayPeriod | null>(null);
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [showPayPeriodDropdown, setShowPayPeriodDropdown] = useState(false);

  useEffect(() => {
    generatePayPeriods();
  }, []);

  useEffect(() => {
    fetchTimeReports();
  }, [selectedPayPeriod]);

  const generatePayPeriods = () => {
    // Get pay period settings from localStorage
    const savedSettings = localStorage.getItem('demo_system_settings');
    const settings = savedSettings ? JSON.parse(savedSettings) : {
      pay_period_type: 'biweekly',
      pay_period_start_date: '2025-01-05'
    };

    const startDate = new Date(settings.pay_period_start_date);
    
    // Validate the date - if invalid, use default
    if (isNaN(startDate.getTime())) {
      startDate.setTime(new Date('2025-01-05').getTime());
    }
    
    const periodLength = settings.pay_period_type === 'weekly' ? 7 : 14;
    const periods: PayPeriod[] = [];
    const currentDate = new Date();

    // Generate periods from start date to current date + 2 periods ahead
    let periodStart = new Date(startDate);
    let periodNumber = 1;

    // Generate at least 10 periods to ensure we have data
    while (periodNumber <= 10) {
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + periodLength - 1);

      periods.push({
        number: periodNumber,
        start_date: periodStart.toISOString().split('T')[0],
        end_date: periodEnd.toISOString().split('T')[0],
        label: `Period ${periodNumber}: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`
      });

      periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() + 1);
      periodNumber++;
    }

    setPayPeriods(periods);
    
    // Set first period as default (our demo data period)
    if (periods.length > 0) {
      setSelectedPayPeriod(periods[0]);
    }
  };

  const fetchTimeReports = async () => {
    if (!selectedPayPeriod) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await getTimeReports(
        selectedPayPeriod.start_date,
        selectedPayPeriod.end_date
      );

      if (response.success && response.data) {
        setReportData(response.data);
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


  const handleExportCSV = () => {
    if (!reportData.length || !selectedPayPeriod) {
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
      'Vacation Hours'
    ];

    const rows = reportData.map(report => [
      report.employee_name,
      report.employee_number || '',
      report.total_hours.toFixed(2),
      report.lunch_hours.toFixed(2),
      report.unpaid_hours.toFixed(2),
      report.paid_hours.toFixed(2),
      report.vacation_hours.toFixed(2)
    ]);

    const csvContent = [
      [`Time Report - ${selectedPayPeriod.label}`],
      [],
      headers,
      ...rows,
      [],
      ['Summary'],
      ['Total Employees', reportData.length],
      ['Total Paid Hours', reportData.reduce((sum, r) => sum + r.paid_hours, 0).toFixed(2)],
      ['Total Vacation Hours', reportData.reduce((sum, r) => sum + r.vacation_hours, 0).toFixed(2)]
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `time-report-${selectedPayPeriod.start_date}-${selectedPayPeriod.end_date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          <label className="text-sm font-medium text-gray-700">Pay Period:</label>
        </div>
        <div className="relative mt-2">
          <button
            onClick={() => setShowPayPeriodDropdown(!showPayPeriodDropdown)}
            className="w-full md:w-96 px-4 py-2 text-left bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
          >
            <span className="text-gray-900">
              {selectedPayPeriod ? selectedPayPeriod.label : 'Select a pay period...'}
            </span>
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </button>
          
          {showPayPeriodDropdown && (
            <div className="absolute z-10 w-full md:w-96 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {payPeriods.map((period) => (
                <button
                  key={period.number}
                  onClick={() => {
                    setSelectedPayPeriod(period);
                    setShowPayPeriodDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-blue-50 ${
                    selectedPayPeriod?.number === period.number ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          )}
        </div>
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
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Vacation Hours</th>
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
                      {report.vacation_hours.toFixed(2)}
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
    </div>
  );
};

export default TimeReports;