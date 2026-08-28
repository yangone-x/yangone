<script setup lang="ts">
import { Button } from 'yangdv';
</script>

<template>
  <div id="anchor-1" class="part part-1">
    <Button />
  </div>
</template>

<style lang="scss">
.menus {
  position: fixed;
  top: 50%;
  left: 0;
  z-index: 999;
}

.part-1 {
  height: 500px;
}

.part-2 {
  height: 600px;
}

.part-3 {
  height: 400px;
}

.part-4 {
  height: 800px;
}

.menu-item.active {
  color: red;
}
</style>
