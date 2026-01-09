export class DateUtils {
  static getDate(date: string = 'now'): Date {
    if (date === 'now') {
      const d = new Date()
      d.setMilliseconds(0)
      return d
    }

    const dateTimeMatch = date.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/)
    const dateWithTimeMatch = date.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/)
    const dateOnlyMatch = date.match(/(\d{2})\/(\d{2})\/(\d{4})/)

    if (dateTimeMatch) {
      const [, day, month, year, hours, minutes, seconds] = dateTimeMatch
      return new Date(
        parseInt(year!, 10),
        parseInt(month!, 10) - 1,
        parseInt(day!, 10),
        parseInt(hours!, 10),
        parseInt(minutes!, 10),
        parseInt(seconds!, 10),
        0
      )
    }

    if (dateWithTimeMatch) {
      const [, day, month, year, hours, minutes] = dateWithTimeMatch
      return new Date(
        parseInt(year!, 10),
        parseInt(month!, 10) - 1,
        parseInt(day!, 10),
        parseInt(hours!, 10),
        parseInt(minutes!, 10),
        0,
        0
      )
    }

    if (dateOnlyMatch) {
      const [, day, month, year] = dateOnlyMatch
      return new Date(parseInt(year!, 10), parseInt(month!, 10) - 1, parseInt(day!, 10), 0, 0, 0, 0)
    }

    const parsed = new Date(date)
    parsed.setMilliseconds(0)
    return parsed
  }

  static getDateTime(dateTime: string): Date {
    return this.getDate(dateTime)
  }

  static isBefore(date1: Date, date2: Date, include: boolean = false): boolean {
    const diff = date1.getTime() - date2.getTime()
    return include ? diff <= 0 : diff < 0
  }

  static isAfter(date1: Date, date2: Date, include: boolean = false): boolean {
    const diff = date1.getTime() - date2.getTime()
    return include ? diff >= 0 : diff > 0
  }

  static isWithin(
    date: Date,
    rangeFrom: Date,
    rangeTo: Date,
    withHead: boolean = false,
    withTail: boolean = false
  ): boolean {
    return this.isAfter(date, rangeFrom, withHead) && this.isBefore(date, rangeTo, withTail)
  }

  static daysBetween(from: Date, to: Date): number {
    const diffTime = Math.abs(to.getTime() - from.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  static addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  static formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }
}
