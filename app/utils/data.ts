export const formatChineseDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}年${month}月${day}日 ${hours}:${minutes}`
}


export const formatDateForDisplay = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    // 检查是否有效日期
    if (isNaN(date.getTime())) {
      return dateString;
    }
    // 使用 toLocaleString 同时显示日期和时间
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false, // 24小时制
    });
  } catch (error) {
    console.error(error);
    return dateString;
  }
};