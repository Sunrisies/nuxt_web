<template>
  <div class="navigation-page">
    <!-- 头部区域 - 固定 -->
    <header class="page-header">
      <div class="header-content">
        <h1 class="page-title">导航中心</h1>
        <p class="page-subtitle">发现优质工具，提升工作效率</p>
      </div>
      <!-- 搜索框 -->
      <div class="search-container">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索导航..."
          class="search-input"
        />
        <span class="search-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </span>
      </div>
    </header>

    <!-- 导航内容 -->
    <div class="navigation-container">
      <!-- 左侧分类导航 - 固定 -->
      <aside class="category-nav">
        <div class="nav-list">
          <a
            v-for="category in filteredCategories"
            :key="category.id"
            :href="`#category-${category.id}`"
            class="nav-item"
            :class="{ active: activeCategory === category.id }"
            @click.prevent="scrollToCategory(category.id)"
          >
            <span class="nav-icon">{{ category.name.charAt(0) }}</span>
            <span class="nav-text">{{ category.name }}</span>
            <span class="nav-count">{{ category.items.length }}</span>
          </a>
        </div>
      </aside>

      <!-- 右侧内容区域 - 可滚动 -->
      <main class="content-area">
        <div v-for="category in filteredCategories" :key="category.id" :id="`category-${category.id}`" class="category-section">
          <div class="category-header">
            <h2 class="category-title">
              <span class="title-icon">{{ category.name.charAt(0) }}</span>
              {{ category.name }}
            </h2>
            <span class="item-count">{{ category.items.length }} 个</span>
          </div>
          <div class="cards-grid">
            <a
              v-for="item in category.items"
              :key="item.id"
              :href="item.url"
              target="_blank"
              class="nav-card"
            >
              <div class="card-icon-wrapper">
                <img v-if="item.icon" :src="item.icon" :alt="item.name" class="card-icon" />
                <span v-else class="card-icon-placeholder">{{ item.name.charAt(0) }}</span>
              </div>
              <div class="card-content">
                <h3 class="card-title">{{ item.name }}</h3>
                <p v-if="item.description" class="card-description">{{ item.description }}</p>
              </div>
              <div class="card-arrow">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </a>
          </div>
        </div>
        
        <!-- 无结果提示 -->
        <div v-if="filteredCategories.length === 0" class="no-results">
          <div class="no-results-icon">🔍</div>
          <p>没有找到相关内容</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
interface NavItem {
  id: number
  name: string
  url: string
  description: string
  categoryId: number
  icon: string
}

interface Category {
  id: number
  name: string
  items: NavItem[]
}

const { data } = await useFetch<NavItem[]>("/api/navigationBar")

// 搜索查询
const searchQuery = ref('')

// 当前激活的分类
const activeCategory = ref<number | null>(null)

// 分类映射
const categoryMap: Record<number, string> = {
  3: "工具软件",
  4: "开发框架",
  6: "AI工具",
  7: "运营工具",
  10: "其他"
}

// 按分类分组数据
const categories = computed(() => {
  if (!data.value) return []

  const grouped: Record<number, NavItem[]> = {}

  data.value.data.forEach((item) => {
    if (!grouped[item.categoryId]) {
      grouped[item.categoryId] = []
    }
    grouped[item.categoryId].push(item)
  })

  return Object.entries(grouped).map(([id, items]) => ({
    id: Number(id),
    name: categoryMap[Number(id)] || `分类 ${id}`,
    items
  }))
})

// 过滤分类
const filteredCategories = computed(() => {
  if (!searchQuery.value) return categories.value
  
  const query = searchQuery.value.toLowerCase()
  
  return categories.value
    .map(category => ({
      ...category,
      items: category.items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      )
    }))
    .filter(category => category.items.length > 0)
})

// 滚动到指定分类
const scrollToCategory = (categoryId: number) => {
  const element = document.getElementById(`category-${categoryId}`)
  if (element) {
    const offset = 20 // 顶部留白
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
    window.scrollTo({
      top: elementPosition - offset,
      behavior: 'smooth'
    })
  }
}

// 监听滚动，更新激活的分类
onMounted(() => {
  const handleScroll = () => {
    const sections = document.querySelectorAll('.category-section')
    let currentSection = null

    sections.forEach((section) => {
      const sectionTop = section.getBoundingClientRect().top
      const sectionHeight = section.clientHeight
      if (sectionTop <= 100) {
        currentSection = section.id.replace('category-', '')
      }
    })

    if (currentSection) {
      activeCategory.value = Number(currentSection)
    }
  }

  window.addEventListener('scroll', handleScroll)
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })
})
</script>

<style lang="scss" scoped>
.navigation-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  display: flex;
  flex-direction: column;
}

// 头部样式 - 固定
.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px 20px 32px;
  text-align: center;
  color: white;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
}

.header-content {
  position: relative;
  z-index: 1;
  margin-bottom: 20px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-subtitle {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
}

.search-container {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 12px 45px 12px 18px;
  border: none;
  border-radius: 50px;
  font-size: 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  }
  
  &::placeholder {
    color: #999;
  }
}

.search-icon {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: #667eea;
  pointer-events: none;
}

// 导航容器
.navigation-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 20px 40px;
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 32px;
  align-items: start;
  margin-top: 160px;
  height: calc(100vh - 160px);
}

// 分类区域
.category-section {
  margin-bottom: 40px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 0 8px;
}

.category-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 18px;
}

.item-count {
  font-size: 14px;
  color: #999;
  padding: 4px 12px;
  background: #f5f7fa;
  border-radius: 20px;
}

// 左侧分类导航 - 固定
.category-nav {
  position: sticky;
  top: 160px;
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  height: fit-content;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  text-decoration: none;
  color: #666;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    background: #f5f7fa;
    color: #667eea;
  }
  
  &.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    
    .nav-icon {
      background: rgba(255, 255, 255, 0.2);
    }
    
    .nav-count {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }
  }
}

.nav-icon {
  width: 32px;
  height: 32px;
  background: #f5f7fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.nav-text {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-count {
  font-size: 12px;
  color: #999;
  padding: 4px 10px;
  background: #f5f7fa;
  border-radius: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

// 右侧内容区域 - 可滚动
.content-area {
  min-width: 0;
  overflow-y: auto;
  height: 100%;
  padding-right: 8px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(102, 126, 234, 0.2);
    border-radius: 3px;
    
    &:hover {
      background: rgba(102, 126, 234, 0.3);
    }
  }
}

// 卡片网格
.cards-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(5, 1fr);
}

// 导航卡片
.nav-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 16px;
  text-decoration: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
  opacity: 0;
  animation: slideInLeft 0.5s ease forwards;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    transform: scaleX(0);
    transition: transform 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(102, 126, 234, 0.2);
    border-color: rgba(102, 126, 234, 0.2);
    transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
    
    &::after {
      transform: scaleX(1);
    }
    
    .card-arrow {
      opacity: 1;
      transform: translateX(0);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
  }
}

// 入场动画
@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

// 离场动画
@keyframes slideOutRight {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(20px);
  }
}

.card-icon-wrapper {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  margin-right: 16px;
}

.card-icon {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  object-fit: contain;
  padding: 4px;
  background: #f5f7fa;
}

.card-icon-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  font-size: 24px;
  font-weight: 600;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin: 0 0 6px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-description {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-arrow {
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.3s ease;
  color: #667eea;
  flex-shrink: 0;
}

// 无结果提示
.no-results {
  text-align: center;
  padding: 80px 20px;
  color: #999;
}

.no-results-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

// 响应式设计
@media (max-width: 1400px) {
  .navigation-container {
    grid-template-columns: 200px 1fr;
  }
}

@media (max-width: 1200px) {
  .navigation-container {
    grid-template-columns: 1fr;
    height: calc(100vh - 140px);
    margin-top: 140px;
  }
  
  .category-nav {
    display: none;
  }
  
  .content-area {
    padding-right: 0;
  }
}

@media (max-width: 1024px) {
  .cards-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 30px 20px 50px;
  }
  
  .page-title {
    font-size: 28px;
  }
  
  .page-subtitle {
    font-size: 14px;
  }
  
  .search-input {
    padding: 14px 45px 14px 18px;
    font-size: 15px;
  }
  
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  
  .nav-card {
    padding: 16px;
  }
  
  .card-icon-wrapper {
    width: 48px;
    height: 48px;
    margin-right: 12px;
  }
  
  .card-title {
    font-size: 14px;
  }
  
  .card-description {
    font-size: 12px;
    -webkit-line-clamp: 1;
  }
}

@media (max-width: 640px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 24px 16px 40px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .page-subtitle {
    font-size: 13px;
  }
  
  .search-input {
    padding: 12px 40px 12px 16px;
    font-size: 14px;
  }
  
  .navigation-container {
    padding: 0 16px 32px;
  }
  
  .category-header {
    margin-bottom: 16px;
  }
  
  .category-title {
    font-size: 20px;
  }
  
  .title-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
  
  .nav-card {
    padding: 14px;
  }
  
  .card-icon-wrapper {
    width: 44px;
    height: 44px;
  }
}
</style>
