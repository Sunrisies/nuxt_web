<template>
  <div class="min-h-screen flex flex-col antialiased">
    <ScrollProgressBar />
    <div ref="headerRef"><AppHeader /></div>
    <main class="flex-1 flex flex-col">
      <slot />
    </main>
    <AppFooter />
    <ScrollToTopButton />
  </div>
</template>
