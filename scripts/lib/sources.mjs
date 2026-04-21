const ORDER = ['silso', 'gfz', 'drao', 'isgi', 'cycles'];

export function composeSources(row) {
  const present = new Set();
  if (row.ssn !== null || row.ssn_stations !== null) present.add('silso');
  if (row.kp_sum !== null || row.ap !== null) present.add('gfz');
  if (row.f107_obs !== null || row.f107_adj !== null) present.add('drao');
  if (row.aa !== null) present.add('isgi');
  if (row.cycle !== null) present.add('cycles');
  return ORDER.filter((s) => present.has(s)).join(',');
}
