<script setup lang="ts">
import { Anchor, AnchorLink, useMessage } from 'yangdv';
const { message } = useMessage();

function add() {
  message({
    content: 'This is a message',
  });
}
</script>

<template>
  <Anchor class="menus">
    <AnchorLink href="#part-1" class="menu-item">part1</AnchorLink>
    <AnchorLink href="#part-2" class="menu-item">part2</AnchorLink>
    <AnchorLink href="#part-3" class="menu-item">part3</AnchorLink>
  </Anchor>

  <div id="part-1" class="part-1">
    <button @click="add">asdf</button>
  </div>
  <div id="part-2" class="part-2"></div>
  <div id="part-3" class="part-3"></div>
</template>

<style lang="scss">
.menus {
  position: fixed;
  top: 50%;
  left: 0;
  z-index: 999;
}

.menu-item.is-active {
  color: red;
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
</style>
