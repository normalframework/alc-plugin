<template>
  <v-card rounded="0" flat>
    <v-window v-model="step" show-arrows>
      <v-window-item v-for="n in steps" :key="`card-${n.id}`" :value="n.id">
        <h3 class="text-h6">{{ n.title }}</h3>
        <br>
        <v-sheet>
          <div class="text-body-1">
            {{ n.description }}
          </div>
          <v-img :height="600" cover :src="n.img">          
          </v-img>
        </v-sheet>
      </v-window-item>
    </v-window>
  </v-card>
</template>


<script>
const defaultDesc = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
              reprehenderit in voluptate velit esse cillum dolore eu fugiat
              nulla pariatur. Excepteur sint occaecat cupidatat non proident,
              sunt in culpa qui officia deserunt mollit anim id est laborum.`
export default {
  data: () => ({
    steps: [
      { id: 1, title: "Step 1", description: "Lorem Ipsum", img: "images/step-1.png" },
      { id: 2, title: "Step 2", description: defaultDesc, img: "images/step-2.png" },
      { id: 3, title: "Step 3", description: defaultDesc, img: "images/step-3.png" },
      { id: 4, title: "Step 4", description: defaultDesc, img: "images/step-4.png" },
      { id: 5, title: "Step 5", description: defaultDesc, img: "images/step-5.png" },
      { id: 6, title: "Step 6", description: defaultDesc, img: "images/step-6.png" },
      { id: 7, title: "Step 7", description: defaultDesc, img: "images/step-7.png" }
    ],
    step: 1
  }),

  methods: {
    next() {
      this.step = this.step + 1 > this.steps.length
        ? 1
        : this.step + 1
    },
    prev() {
      this.step = this.step - 1 <= 0
        ? this.steps.length
        : this.step - 1
    },
  },
}
</script>