import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Download } from 'lucide-react';
import { getTimeReports } from '../../lib/api';
import { toDateString } from '../../lib/timezone';

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

const TimeReports: React.FC = () => {
  const [reportData, setReportData] = useState<TimeReportData[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize with current month in Tennessee timezone
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(toDateString(firstDayOfMonth));
  const [endDate, setEndDate] = useState(toDateString(lastDayOfMonth));

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await getTimeReports(startDate, endDate);

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

  const handleDateChange = () => {
    if (startDate && endDate) {
      fetchReports();
    }
  };


  useEffect(() => {
    fetchReports();
  }, []);

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
      [`Time Report - ${startDate} to ${endDate}`],
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
    link.download = `time-report-${startDate}-${endDate}.csv`;
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
        <div className="flex items-center space-x-2 mb-3">
          <Calendar className="h-5 w-5 text-gray-600" />
          <label className="text-sm font-medium text-gray-700">Date Range:</label>
        </div>
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
            onClick={handleDateChange}
            disabled={!startDate || !endDate}
            className="mt-5 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
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