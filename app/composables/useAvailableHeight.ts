/**
 * 自动计算可用空间高度
 *
 * 接收顶部和底部的 ref，计算: containerHeight - top - bottom
 * containerHeight 默认是 window.innerHeight，
 * 也可通过 provide('layoutContainerHeight', xxx) 从布局层传入
 */
export function useAvailableHeight() {
  const availableHeight = ref(0)
  const topRef = ref<HTMLElement>()
  const bottomRef = ref<HTMLElement>()

  // 从布局层获取容器高度（如果提供）；SSR 时默认 800
  const fallback = ref(800)
  const containerHeight = inject<Ref<number>>("layoutContainerHeight", fallback)

  function calc() {
    const top = topRef.value?.offsetHeight ?? 0
    const bottom = bottomRef.value?.offsetHeight ?? 0
    availableHeight.value = containerHeight.value - top - bottom
  }

  let observer: ResizeObserver | null = null

  onMounted(() => {
    calc()
    observer = new ResizeObserver(calc)
    if (topRef.value) observer.observe(topRef.value)
    if (bottomRef.value) observer.observe(bottomRef.value)
  })

  onUnmounted(() => {
    observer?.disconnect()
  })

  return { availableHeight, topRef, bottomRef }
}
