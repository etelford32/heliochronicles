export const DAILY_COLUMNS = [
  'date',
  'ssn',
  'ssn_stddev',
  'ssn_stations',
  'ssn_provisional',
  'f107_obs',
  'f107_adj',
  'kp_sum',
  'ap',
  'aa',
  'cycle',
  'cycle_phase',
  'sources'
];

// Monthly table: SILSO monthly mean total SSN from 1749 onward. One row per
// calendar month, primary key `date_month` (YYYY-MM).
export const MONTHLY_COLUMNS = [
  'date_month',
  'ssn',
  'ssn_stddev',
  'ssn_stations',
  'ssn_provisional',
  'cycle',
  'cycle_phase',
  'sources'
];

// Yearly table: SILSO yearly mean total SSN from 1700 and Group Number
// reconstruction from 1610. Primary key `year` (integer). This is the
// deepest reach of the numerical record — includes the Maunder Minimum
// as data, not just narrative.
export const YEARLY_COLUMNS = [
  'year',
  'ssn',
  'ssn_stddev',
  'ssn_stations',
  'ssn_provisional',
  'gsn',
  'gsn_stddev',
  'gsn_observers',
  'cycle',
  'cycle_phase',
  'sources'
];
