import { agent as _request } from 'supertest'
import { app } from '../src/app'
export const request = _request(app)