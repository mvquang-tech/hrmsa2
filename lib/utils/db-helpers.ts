import { query } from '../db';
import { PaginationParams, PaginatedResponse } from '../types';

export async function paginate<T>(
  table: string,
  params: PaginationParams,
  whereClause?: string,
  whereParams?: any[]
): Promise<PaginatedResponse<T>> {
  try {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;
    // Sanitize sortBy to prevent SQL injection - only allow alphanumeric and underscore
    const sortBy = (params.sortBy && /^[a-zA-Z0-9_]+$/.test(params.sortBy)) ? params.sortBy : 'id';
    const sortOrder = (params.sortOrder === 'desc') ? 'DESC' : 'ASC';

    const where = whereClause ? `WHERE ${whereClause}` : '';
    const countSql = `SELECT COUNT(*) as total FROM \`${table}\` ${where}`;
    const dataSql = `SELECT * FROM \`${table}\` ${where} ORDER BY \`${sortBy}\` ${sortOrder} LIMIT ? OFFSET ?`;

    // For countSql: only pass params if there's a WHERE clause with placeholders
    // For dataSql: always pass LIMIT and OFFSET params (2 params) + whereParams if any
    const countParams = whereParams && whereParams.length > 0 ? whereParams : [];
    const dataParams = whereParams && whereParams.length > 0 
      ? [...whereParams, limit, offset] 
      : [limit, offset];
    
    const countResult = await query(countSql, countParams);
    const countList = Array.isArray(countResult) ? countResult : [countResult];
    const total = countList[0]?.total || 0;
    
    const data = await query(dataSql, dataParams);
    const dataList = Array.isArray(data) ? data : [];

    return {
      data: dataList as T[],
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    };
  } catch (error) {
    console.error('Error in paginate function:', error);
    console.error('Table:', table, 'Where:', whereClause, 'Params:', whereParams);
    throw error;
  }
}

export function formatDate(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

export function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null;
  return new Date(dateString);
}

// Helper function to normalize query results
export function normalizeQueryResult<T = any>(result: any): T[] {
  if (Array.isArray(result)) {
    return result;
  }
  if (result) {
    return [result];
  }
  return [];
}

// Helper function to get first result or null
export function getFirstResult<T = any>(result: any): T | null {
  const normalized = normalizeQueryResult<T>(result);
  return normalized.length > 0 ? normalized[0] : null;
}

// Helper to convert MySQL TINYINT to boolean
export function convertMySQLBooleans<T extends Record<string, any>>(
  obj: T,
  fields: string[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (field in result) {
      (result as any)[field] = (result as any)[field] === 1 || (result as any)[field] === true;
    }
  }
  return result;
}

// Helper to convert array of objects with MySQL booleans
export function convertMySQLBooleansArray<T extends Record<string, any>>(
  arr: T[],
  fields: string[]
): T[] {
  return arr.map(obj => convertMySQLBooleans(obj, fields));
}

