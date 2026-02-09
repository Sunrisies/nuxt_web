<template>
  <div class="min-h-screen flex flex-col antialiased">
    <ScrollProgressBar />
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
