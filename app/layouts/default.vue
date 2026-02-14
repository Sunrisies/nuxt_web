<template>
  <div class="min-h-screen flex flex-col antialiased">
    <ScrollProgressBar />
    <!-- <ClientOnly fallback-tag="div" fallback-class="w-14 h-7"> -->
    <AppHeader />
    <!-- </ClientOnly> -->

    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
    <ScrollToTopButton />

  </div>
</template>
