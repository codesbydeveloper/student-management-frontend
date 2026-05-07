import { ROLES } from '../utils/constants'

/** Initial directory accounts for first-time sign-in */
export const SEED_USERS = [
  {
    id: 'u-admin',
    email: 'admin@school.edu',
    password: 'password123',
    fullName: 'Alex Rivera',
    role: ROLES.ADMIN,
  },
  {
    id: 'u-principal',
    email: 'principal@school.edu',
    password: 'password123',
    fullName: 'Jordan Lee',
    role: ROLES.PRINCIPAL,
  },
  {
    id: 'u-driver',
    email: 'driver@school.edu',
    password: 'password123',
    fullName: 'Casey Nguyen',
    role: ROLES.DRIVER,
  },
]
