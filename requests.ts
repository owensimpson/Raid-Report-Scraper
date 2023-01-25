import { PGCRInfo } from './types';

const localhost = 'http://localhost:8000'

export const insert = async (data: PGCRInfo): Promise<Response> => {
  return fetch(localhost + '/pgcr', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
}

export const get = async (ref: string): Promise<Response> => {
  return fetch(localhost + ref, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    }
  })
}