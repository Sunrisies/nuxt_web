export const formatChineseDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}年${month}月${day}日 ${hours}:${minutes}`
}


interface FormatOptions {
  showWeekday?: boolean;  // 是否显示星期，默认 true
  showTime?: boolean;     // 是否显示时分秒，默认 true
}

export const formatDateForDisplay = (
  dateString: string,
  options: FormatOptions = {}
): string => {
  try {
    const date = new Date(dateString);
    // 检查是否有效日期
    if (isNaN(date.getTime())) {
      return dateString;
    }

    // 合并默认配置
    const { showWeekday = true, showTime = true } = options;

    // 构建日期格式配置
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };

    // 动态添加星期
    if (showWeekday) {
      dateOptions.weekday = "long";
    }

    // 动态添加时间配置
    if (showTime) {
      dateOptions.hour = "2-digit";
      dateOptions.minute = "2-digit";
      dateOptions.second = "2-digit";
      dateOptions.hour12 = false; // 24小时制
    }

    return date.toLocaleString("zh-CN", dateOptions);
  } catch (error) {
    console.error(error);
    return dateString;
  }
};
