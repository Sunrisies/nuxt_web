export const formatChineseDateTime = (dateString: string): string => {
  if (!dateString) return "—"
  // 兼容 "2026-04-01 13:46:38" 和 "2026-04-01T13:46:38Z" 两种格式
  const cleaned = dateString.replace("T", " ").split(".")[0]
  const [datePart, timePart] = cleaned.split(" ")
  if (!datePart) return dateString
  const [y, m, d] = datePart.split("-")
  const [hh, mm] = timePart ? timePart.split(":") : ["00", "00"]
  if (!y || !m || !d) return dateString
  return `${y}年${m}月${d}日 ${hh}:${mm}`
}

interface FormatOptions {
  showWeekday?: boolean // 是否显示星期，默认 true
  showTime?: boolean // 是否显示时分秒，默认 true
}

export const formatDateForDisplay = (
  dateString: string,
  options: FormatOptions = {}
): string => {
  try {
    const date = new Date(dateString)
    // 检查是否有效日期
    if (isNaN(date.getTime())) {
      return dateString
    }

    // 合并默认配置
    const { showWeekday = true, showTime = true } = options

    // 构建日期格式配置
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric"
    }

    // 动态添加星期
    if (showWeekday) {
      dateOptions.weekday = "long"
    }

    // 动态添加时间配置
    if (showTime) {
      dateOptions.hour = "2-digit"
      dateOptions.minute = "2-digit"
      dateOptions.second = "2-digit"
      dateOptions.hour12 = false // 24小时制
    }

    return date.toLocaleString("zh-CN", dateOptions)
  } catch (error) {
    console.error(error)
    return dateString
  }
}
