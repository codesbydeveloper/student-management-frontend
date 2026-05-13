/** Local demo bus drivers (replace with GET /api/drivers when backend exists). */
export const SEED_DRIVERS = [
  {
    id: 'd1',
    fullName: 'Rajesh Kumar',
    email: 'driver@school.edu',
    phone: '+91 98765 43210',
    licenseNumber: 'MH-04-2019-0123456',
    /** Mock bus id — matches transport mock buses. */
    busId: 'bus-1',
    active: true,
  },
  {
    id: 'd2',
    fullName: 'Priya Sharma',
    email: 'p.sharma@school.edu',
    phone: '+91 98765 49999',
    licenseNumber: 'MH-04-2020-0543210',
    busId: 'bus-2',
    active: true,
  },
]
