import PDFDocument from 'pdfkit'
import { type TServiceResult, success, failure } from '../base.service'

/**
 * Column definition for PDF table export.
 * Maps entity fields to table columns with custom headers, accessors, and widths.
 */
export interface IPdfColumn<T> {
  header: string
  accessor: (row: T) => string
  width?: number
}

/**
 * Options for PDF document generation.
 */
export interface IPdfOptions {
  title: string
  subtitle?: string
  generatedBy?: string
  pageSize?: 'A4' | 'LETTER'
  orientation?: 'portrait' | 'landscape'
}

// Layout constants
const MARGIN = 40
const HEADER_BG_COLOR = '#2c3e50'
const HEADER_TEXT_COLOR = '#ffffff'
const ROW_EVEN_BG = '#f8f9fa'
const ROW_ODD_BG = '#ffffff'
const BORDER_COLOR = '#dee2e6'
const TITLE_FONT_SIZE = 18
const SUBTITLE_FONT_SIZE = 11
const TABLE_HEADER_FONT_SIZE = 9
const TABLE_BODY_FONT_SIZE = 8
const ROW_PADDING = 6
const FOOTER_FONT_SIZE = 8

/**
 * Generic PDF table generation service using PDFKit.
 * Creates professional-looking table-based PDF reports.
 */
export class PdfExporterService {
  /**
   * Generates a PDF buffer from the given data and column/options definitions.
   *
   * @param data - Array of items to export
   * @param columns - Column definitions with headers, accessors, and optional widths
   * @param options - PDF document options (title, subtitle, page size, etc.)
   * @returns PDF buffer wrapped in TServiceResult
   */
  async generate<T>(
    data: T[],
    columns: IPdfColumn<T>[],
    options: IPdfOptions
  ): Promise<TServiceResult<Buffer>> {
    try {
      const doc = new PDFDocument({
        size: options.pageSize ?? 'A4',
        layout: options.orientation ?? 'portrait',
        margin: MARGIN,
        bufferPages: true,
      })

      // Collect chunks into a buffer
      const chunks: Uint8Array[] = []
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))

      const result = new Promise<Buffer>(resolve => {
        doc.on('end', () => resolve(Buffer.concat(chunks)))
      })

      // Calculate usable page width
      const pageWidth = (doc.page.width as number) - MARGIN * 2

      // Calculate column widths
      const columnWidths = this.calculateColumnWidths(columns, pageWidth)

      // Draw document header
      this.drawDocumentHeader(doc, options)

      // Draw table
      this.drawTable(doc, data, columns, columnWidths, pageWidth)

      // Add page numbers to all pages
      this.addPageNumbers(doc)

      doc.end()

      const buffer = await result
      return success(buffer)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown PDF generation error'
      return failure(message, 'INTERNAL_ERROR')
    }
  }

  /**
   * Calculates column widths based on explicit widths or equal distribution.
   */
  private calculateColumnWidths<T>(columns: IPdfColumn<T>[], pageWidth: number): number[] {
    const explicitWidths = columns.map(c => c.width ?? 0)
    const totalExplicit = explicitWidths.reduce((sum, w) => sum + w, 0)
    const autoColumns = columns.filter(c => !c.width).length

    if (autoColumns === 0) {
      // All columns have explicit widths - normalize to page width
      const scale = pageWidth / totalExplicit
      return explicitWidths.map(w => w * scale)
    }

    // Distribute remaining space equally among auto columns
    const remainingWidth = pageWidth - totalExplicit
    const autoWidth = remainingWidth / autoColumns

    return columns.map(c => c.width ?? autoWidth)
  }

  /**
   * Draws the document title, subtitle, and generation metadata.
   */
  private drawDocumentHeader(doc: PDFKit.PDFDocument, options: IPdfOptions): void {
    // Title
    doc.fontSize(TITLE_FONT_SIZE).font('Helvetica-Bold').text(options.title, { align: 'center' })
    doc.moveDown(0.3)

    // Subtitle
    if (options.subtitle) {
      doc.fontSize(SUBTITLE_FONT_SIZE).font('Helvetica').text(options.subtitle, { align: 'center' })
      doc.moveDown(0.2)
    }

    // Generation metadata
    const generationDate = new Date().toLocaleString('es-VE', {
      dateStyle: 'long',
      timeStyle: 'short',
    })
    doc
      .fontSize(SUBTITLE_FONT_SIZE - 2)
      .font('Helvetica-Oblique')
      .fillColor('#666666')
      .text(`Generado: ${generationDate}`, { align: 'center' })

    if (options.generatedBy) {
      doc.text(`Por: ${options.generatedBy}`, { align: 'center' })
    }

    doc.fillColor('#000000')
    doc.moveDown(1)
  }

  /**
   * Draws the table with header and data rows.
   */
  private drawTable<T>(
    doc: PDFKit.PDFDocument,
    data: T[],
    columns: IPdfColumn<T>[],
    columnWidths: number[],
    pageWidth: number
  ): void {
    let y = doc.y

    // Draw table header
    y = this.drawTableHeader(doc, columns, columnWidths, y, pageWidth)

    // Draw data rows
    for (let i = 0; i < data.length; i++) {
      const row = data[i]!
      const values = columns.map(c => c.accessor(row))

      // Calculate row height based on content
      const rowHeight = this.calculateRowHeight(doc, values, columnWidths)

      // Check if we need a new page
      if (y + rowHeight > (doc.page.height as number) - MARGIN - 30) {
        doc.addPage()
        y = MARGIN
        y = this.drawTableHeader(doc, columns, columnWidths, y, pageWidth)
      }

      // Draw row background
      const bgColor = i % 2 === 0 ? ROW_EVEN_BG : ROW_ODD_BG
      doc
        .rect(MARGIN, y, pageWidth, rowHeight)
        .fill(bgColor)

      // Draw row content
      let x = MARGIN
      for (let j = 0; j < values.length; j++) {
        doc
          .fontSize(TABLE_BODY_FONT_SIZE)
          .font('Helvetica')
          .fillColor('#333333')
          .text(values[j] ?? '', x + 4, y + ROW_PADDING, {
            width: columnWidths[j]! - 8,
            height: rowHeight - ROW_PADDING,
            ellipsis: true,
          })
        x += columnWidths[j]!
      }

      // Draw bottom border
      doc
        .strokeColor(BORDER_COLOR)
        .lineWidth(0.5)
        .moveTo(MARGIN, y + rowHeight)
        .lineTo(MARGIN + pageWidth, y + rowHeight)
        .stroke()

      y += rowHeight
    }
  }

  /**
   * Draws the table header row with column names.
   */
  private drawTableHeader<T>(
    doc: PDFKit.PDFDocument,
    columns: IPdfColumn<T>[],
    columnWidths: number[],
    y: number,
    pageWidth: number
  ): number {
    const headerHeight = 24

    // Header background
    doc
      .rect(MARGIN, y, pageWidth, headerHeight)
      .fill(HEADER_BG_COLOR)

    // Header text
    let x = MARGIN
    for (let i = 0; i < columns.length; i++) {
      doc
        .fontSize(TABLE_HEADER_FONT_SIZE)
        .font('Helvetica-Bold')
        .fillColor(HEADER_TEXT_COLOR)
        .text(columns[i]!.header, x + 4, y + 7, {
          width: columnWidths[i]! - 8,
          ellipsis: true,
        })
      x += columnWidths[i]!
    }

    return y + headerHeight
  }

  /**
   * Calculates the height needed for a row based on content.
   */
  private calculateRowHeight(
    doc: PDFKit.PDFDocument,
    values: string[],
    columnWidths: number[]
  ): number {
    let maxHeight = ROW_PADDING * 2 + TABLE_BODY_FONT_SIZE

    for (let i = 0; i < values.length; i++) {
      const textHeight = doc
        .fontSize(TABLE_BODY_FONT_SIZE)
        .font('Helvetica')
        .heightOfString(values[i] ?? '', { width: columnWidths[i]! - 8 })

      const cellHeight = textHeight + ROW_PADDING * 2
      if (cellHeight > maxHeight) {
        maxHeight = cellHeight
      }
    }

    return Math.max(maxHeight, 20)
  }

  /**
   * Adds page numbers to all pages in the document.
   */
  private addPageNumbers(doc: PDFKit.PDFDocument): void {
    const pages = doc.bufferedPageRange()
    const totalPages = pages.count

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i)
      doc
        .fontSize(FOOTER_FONT_SIZE)
        .font('Helvetica')
        .fillColor('#999999')
        .text(
          `Pagina ${i + 1} de ${totalPages}`,
          MARGIN,
          (doc.page.height as number) - MARGIN + 10,
          { align: 'center', width: (doc.page.width as number) - MARGIN * 2 }
        )
    }
  }
}
