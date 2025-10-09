import { supabase } from './supabase';

interface TimeEntry {
  id: string;
  employee_id: string;
  timestamp: string;
  entry_type: 'clock_in' | 'clock_out' | 'lunch_out' | 'lunch_in' | 'unpaid_out' | 'unpaid_in';
}

interface VacationAccrual {
  id: string;
  employee_id: string;
  accrual_date: string;
  hours_worked: number;
  hours_accrued: number;
  cumulative_accrued: number;
  created_at: string;
  updated_at: string;
}

const ACCRUAL_RATE = 26;

export async function calculateAndUpdateVacationAccrual(employeeId: string): Promise<void> {
  try {
    console.log('[VacationAccrual] Starting accrual calculation for employee:', employeeId);

    const currentYear = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];
    const startDate = `${currentYear}-01-01`;

    const { data: latestAccrual, error: accrualError } = await supabase
      .from('vacation_accruals')
      .select('*')
      .eq('employee_id', employeeId)
      .order('accrual_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (accrualError && accrualError.code !== 'PGRST116') {
      console.error('[VacationAccrual] Error fetching latest accrual:', accrualError);
      throw accrualError;
    }

    console.log('[VacationAccrual] Latest accrual:', latestAccrual);

    if (latestAccrual && latestAccrual.accrual_date === today) {
      console.log('[VacationAccrual] Accrual already calculated for today, skipping');
      return;
    }

    const { data: timeEntries, error: timeEntriesError } = await supabase
      .from('time_entry_events')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('timestamp', startDate)
      .order('timestamp', { ascending: true });

    if (timeEntriesError) {
      console.error('[VacationAccrual] Error fetching time entries:', timeEntriesError);
      throw timeEntriesError;
    }

    console.log('[VacationAccrual] Time entries fetched:', timeEntries?.length || 0);

    const hoursWorked = calculateHoursWorked(timeEntries || []);
    const hoursAccrued = Math.floor(hoursWorked / ACCRUAL_RATE);

    const previousCumulative = latestAccrual?.cumulative_accrued || 0;
    const cumulativeAccrued = hoursAccrued;

    console.log('[VacationAccrual] Calculation:', {
      hoursWorked: hoursWorked.toFixed(2),
      hoursAccrued: hoursAccrued.toFixed(2),
      previousCumulative: previousCumulative.toFixed(2),
      cumulativeAccrued: cumulativeAccrued.toFixed(2)
    });

    const accrualData = {
      employee_id: employeeId,
      accrual_date: today,
      hours_worked: hoursWorked,
      hours_accrued: hoursAccrued,
      cumulative_accrued: cumulativeAccrued
    };

    const { data: insertedAccrual, error: insertError } = await supabase
      .from('vacation_accruals')
      .upsert(accrualData, {
        onConflict: 'employee_id,accrual_date',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('[VacationAccrual] Error inserting/updating accrual:', insertError);
      throw insertError;
    }

    console.log('[VacationAccrual] Accrual saved successfully:', insertedAccrual);
  } catch (error) {
    console.error('[VacationAccrual] Error in calculateAndUpdateVacationAccrual:', error);
    throw error;
  }
}

function calculateHoursWorked(entries: TimeEntry[]): number {
  let totalHours = 0;

  if (!entries || entries.length === 0) return 0;

  let clockInTime: number | null = null;
  let lunchOutTime: number | null = null;
  let unpaidOutTime: number | null = null;

  entries.forEach((entry) => {
    const timestamp = new Date(entry.timestamp).getTime();

    switch (entry.entry_type) {
      case 'clock_in':
        clockInTime = timestamp;
        break;
      case 'clock_out':
        if (clockInTime) {
          totalHours += (timestamp - clockInTime) / (1000 * 60 * 60);
          clockInTime = null;
        }
        break;
      case 'lunch_out':
        lunchOutTime = timestamp;
        break;
      case 'lunch_in':
        if (lunchOutTime) {
          totalHours -= (timestamp - lunchOutTime) / (1000 * 60 * 60);
          lunchOutTime = null;
        }
        break;
      case 'unpaid_out':
        unpaidOutTime = timestamp;
        break;
      case 'unpaid_in':
        if (unpaidOutTime) {
          totalHours -= (timestamp - unpaidOutTime) / (1000 * 60 * 60);
          unpaidOutTime = null;
        }
        break;
    }
  });

  return Math.max(0, totalHours);
}

export async function getLatestVacationAccrual(employeeId: string): Promise<VacationAccrual | null> {
  try {
    const { data, error } = await supabase
      .from('vacation_accruals')
      .select('*')
      .eq('employee_id', employeeId)
      .order('accrual_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[VacationAccrual] Error fetching latest accrual:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[VacationAccrual] Error in getLatestVacationAccrual:', error);
    return null;
  }
}

export async function getAllVacationAccruals(employeeId: string, year?: number): Promise<VacationAccrual[]> {
  try {
    let query = supabase
      .from('vacation_accruals')
      .select('*')
      .eq('employee_id', employeeId)
      .order('accrual_date', { ascending: false });

    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      query = query.gte('accrual_date', startDate).lte('accrual_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[VacationAccrual] Error fetching accruals:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[VacationAccrual] Error in getAllVacationAccruals:', error);
    return [];
  }
}
