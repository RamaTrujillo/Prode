<template>
  <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse">
    <!-- Stage label -->
    <div class="flex items-center justify-between mb-2">
      <div class="h-3 w-16 bg-slate-800 rounded" />
    </div>

    <!-- Teams row -->
    <div class="flex items-center justify-between gap-2">
      <!-- Home -->
      <div class="flex-1 flex items-center justify-end gap-2">
        <div class="h-3 w-20 bg-slate-800 rounded" />
        <div class="w-6 h-[18px] bg-slate-800 rounded-[2px] flex-shrink-0" />
      </div>

      <!-- Score / time -->
      <div class="min-w-[72px] flex justify-center">
        <div class="h-4 w-14 bg-slate-800 rounded" />
      </div>

      <!-- Away -->
      <div class="flex-1 flex items-center gap-2">
        <div class="w-6 h-[18px] bg-slate-800 rounded-[2px] flex-shrink-0" />
        <div class="h-3 w-20 bg-slate-800 rounded" />
      </div>
    </div>

    <!-- Prediction badge -->
    <div class="mt-3 flex justify-center">
      <div class="h-3 w-28 bg-slate-800 rounded-full" />
    </div>
  </div>
</template>
