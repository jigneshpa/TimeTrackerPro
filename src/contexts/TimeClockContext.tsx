import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { createTimeEntryEvent, getTodayTimeEvents, getCurrentStatus } from '../lib/api';

interface TimeEntry {
  id: string;
  employee_id: string;
  entry_type: 'clock_in' | 'clock_out' | 'lunch_out' | 'lunch_in' | 'unpaid_out' | 'unpaid_in';
  timestamp: string;
  created_at: string;
}

interface TimeClockContextType {
  currentStatus: string;
  todayEntries: TimeEntry[];
  isOnLunch: boolean;
  isOnUnpaidBreak: boolean;
  clockIn: () => Promise<void>;
  clockOut: () => Promise<void>;
  startLunch: () => Promise<void>;
  endLunch: () => Promise<void>;
  startUnpaidTime: () => Promise<void>;
  endUnpaidTime: () => Promise<void>;
  refreshEntries: () => Promise<void>;
}

const TimeClockContext = createContext<TimeClockContextType>({} as TimeClockContextType);

export const useTimeClock = () => {
  const context = useContext(TimeClockContext);
  if (!context) {
    throw new Error('useTimeClock must be used within a TimeClockProvider');
  }
  return context;
};

export const TimeClockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { employee } = useAuth();
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [currentStatus, setCurrentStatus] = useState('clocked_out');
  const [isOnLunch, setIsOnLunch] = useState(false);
  const [isOnUnpaidBreak, setIsOnUnpaidBreak] = useState(false);

  useEffect(() => {
    if (employee) {
      refreshEntries();
      loadCurrentStatus();
    }
  }, [employee]);

  const loadCurrentStatus = async () => {
    if (!employee) return;

    try {
      const response = await getCurrentStatus();
      if (response.success && response.data) {
        setCurrentStatus(response.data.currentStatus);
        setIsOnLunch(response.data.isOnLunch);
        setIsOnUnpaidBreak(response.data.isOnUnpaidBreak);
      }
    } catch (error) {
      console.error('Error loading current status:', error);
    }
  };

  const refreshEntries = async () => {
    if (!employee) return;

    try {
      const response = await getTodayTimeEvents();
      if (response.success) {
        setTodayEntries(response.data || []);
        calculateCurrentStatus(response.data || []);
      }
    } catch (error) {
      console.error('Error loading today entries:', error);
    }
  };

  const calculateCurrentStatus = (entries: TimeEntry[]) => {
    if (entries.length === 0) {
      setCurrentStatus('clocked_out');
      setIsOnLunch(false);
      setIsOnUnpaidBreak(false);
      return;
    }

    const lastEntry = entries[entries.length - 1];
    
    // Check lunch status
    const lunchEntries = entries.filter(e => e.entry_type.includes('lunch'));
    const lastLunchEntry = lunchEntries[lunchEntries.length - 1];
    setIsOnLunch(lastLunchEntry?.entry_type === 'lunch_out');
    
    // Check unpaid break status
    const unpaidEntries = entries.filter(e => e.entry_type.includes('unpaid'));
    const lastUnpaidEntry = unpaidEntries[unpaidEntries.length - 1];
    setIsOnUnpaidBreak(lastUnpaidEntry?.entry_type === 'unpaid_out');

    // Determine overall status
    if (lastEntry.entry_type === 'clock_out') {
      setCurrentStatus('clocked_out');
    } else if (lastEntry.entry_type === 'clock_in') {
      setCurrentStatus('clocked_in');
    } else if (lastEntry.entry_type === 'lunch_out') {
      setCurrentStatus('on_lunch');
    } else if (lastEntry.entry_type === 'lunch_in') {
      setCurrentStatus('clocked_in');
    } else if (lastEntry.entry_type === 'unpaid_out') {
      setCurrentStatus('on_unpaid_break');
    } else if (lastEntry.entry_type === 'unpaid_in') {
      setCurrentStatus('clocked_in');
    }
  };

  const createTimeEntry = async (entryType: TimeEntry['entry_type']) => {
    if (!employee) return;

    try {
      const response = await createTimeEntryEvent(entryType);
      if (response.success) {
        await refreshEntries();
        await loadCurrentStatus();
      }
    } catch (error: any) {
      console.error('Error creating time entry:', error);
      alert(error.message || 'Failed to create time entry');
      throw error;
    }
  };

  const clockIn = () => createTimeEntry('clock_in');
  const clockOut = () => createTimeEntry('clock_out');
  const startLunch = () => createTimeEntry('lunch_out');
  const endLunch = () => createTimeEntry('lunch_in');
  const startUnpaidTime = () => createTimeEntry('unpaid_out');
  const endUnpaidTime = () => createTimeEntry('unpaid_in');

  return (
    <TimeClockContext.Provider
      value={{
        currentStatus,
        todayEntries,
        isOnLunch,
        isOnUnpaidBreak,
        clockIn,
        clockOut,
        startLunch,
        endLunch,
        startUnpaidTime,
        endUnpaidTime,
        refreshEntries,
      }}
    >
      {children}
    </TimeClockContext.Provider>
  );
};