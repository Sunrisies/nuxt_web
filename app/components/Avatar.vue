<template>
  <div class="relative transition-all duration-1500  hover:scale-120 hover:rotate-360">
    <div 
      v-if="loading"
      :class="skeletonClasses"
    ></div>
    
    <div 
      v-else
      :class="avatarClasses"
      @click="handleClick"
    >
      <img 
        v-if="imageSrc"
        :src="imageSrc"
        :alt="alt"
        class="w-full h-full object-cover"
        @error="handleImageError"
      />
      <div 
        v-else
        :class="fallbackClasses"
      >
        {{ fallbackText }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  size: {
    type: Number,
    default: 16,
    validator: (value) => [16, 24, 32, 40, 48, 64, 80, 96].includes(value)
  },
  src: {
    type: String,
    default: '/blog.png'
  },
  alt: {
    type: String,
    default: 'Profile'
  },
  bordered: {
    type: Boolean,
    default: true
  },
  fallbackText: {
    type: String,
    default: 'Avatar'
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click', 'error'])

const imageError = ref(false)

const sizeClasses = {
  16: "xs:w-12 xs:h-12 tb:w-16 tb:h-16 pc:w-20 pc:h-20",
  24: "xs:w-20 xs:h-20 tb:w-24 tb:h-24 pc:w-32 pc:h-32",
  32: "xs:w-28 xs:h-28 tb:w-32 tb:h-32 pc:w-40 pc:h-40",
  40: "xs:w-32 xs:h-32 tb:w-40 tb:h-40 pc:w-48 pc:h-48",
  48: "xs:w-40 xs:h-40 tb:w-48 tb:h-48 pc:w-64 pc:h-64",
  64: "xs:w-56 xs:h-56 tb:w-64 tb:h-64 pc:w-80 pc:h-80",
  80: "xs:w-72 xs:h-72 tb:w-80 tb:h-80 pc:w-96 pc:h-96",
  96: "xs:w-88 xs:h-88 tb:w-96 tb:h-96 pc:w-128 pc:h-128",
}

const skeletonClasses = computed(() => {
  const base = [
    'animate-pulse',
    'bg-gray-200',
    'dark:bg-gray-700',
    'rounded-full',
    sizeClasses[props.size] || sizeClasses[16]
  ]
  
  if (props.bordered) {
    base.push('border-4 border-gray-300 dark:border-gray-600')
  }
  
  return base.join(' ')
})

const avatarClasses = computed(() => {
  const baseClasses = [
    'relative',
    'overflow-hidden',
    'cursor-pointer',
    'rounded-full',
    'shadow-lg',
    'transition-all',
    'duration-300',
    'hover:scale-105',
    sizeClasses[props.size] || sizeClasses[16]
  ]

  if (props.bordered) {
    baseClasses.push('border-4 border-primary/20 hover:border-primary/40')
  }

  return baseClasses.join(' ')
})

const fallbackClasses = computed(() => {
  return [
    'w-full',
    'h-full',
    'flex',
    'items-center',
    'justify-center',
    'bg-gradient-to-br',
    'from-primary/20',
    'to-secondary/20',
    'text-primary',
    'font-semibold',
    getFontSizeClass()
  ].join(' ')
})

function getFontSizeClass() {
  const sizeMap = {
    16: 'text-xs',
    24: 'text-sm',
    32: 'text-base',
    40: 'text-lg',
    48: 'text-xl',
    64: 'text-2xl',
    80: 'text-3xl',
    96: 'text-4xl'
  }
  return sizeMap[props.size] || 'text-base'
}

const imageSrc = computed(() => {
  if (imageError.value) return null
  if (props.src.startsWith('http') || props.src.startsWith('/')) {
    return props.src
  }
  return props.src
})

const handleClick = () => {
  emit('click')
}

const handleImageError = () => {
  imageError.value = true
  emit('error')
}
</script>