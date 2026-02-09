import Papa from 'papaparse'
import { type TServiceResult, success, failure } from '../base.service'

/**
 * Column definition for CSV export.
 * Maps entity fields to CSV columns with custom headers and accessors.
 */
export interface ICsvColumn<T> {
  header: string
  accessor: (row: T) => string | number | null | undefined
}

/**
 * Generic CSV generation service.
 * Converts an array of typed data into a CSV string using papaparse.
 */
export class CsvExporterService {
  /**
   * Generates a CSV string from the given data and column definitions.
   *
   * @param data - Array of items to export
   * @param columns - Column definitions with headers and accessors
   * @returns CSV string wrapped in TServiceResult
   */
  generate<T>(data: T[], columns: ICsvColumn<T>[]): TServiceResult<string> {
    try {
      const csvString = Papa.unparse({
        fields: columns.map(c => c.header),
        data: data.map(row => columns.map(c => c.accessor(row) ?? '')),
      })

      return success(csvString)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown CSV generation error'
      return failure(message, 'INTERNAL_ERROR')
    }
  }
}
