<template>
  <v-card rounded="0" flat>
    <v-window v-model="step" show-arrows>
      <v-window-item v-for="n in steps" :key="`card-${n.id}`" :value="n.id" eager>
        <h3 class="text-h6">{{ n.title }}</h3>
        <v-sheet>
          <div class="text-body-1">
            {{ n.description }}
          </div>
          <br>
          <v-img max-height="600" :src="n.img" eager>   
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
      { id: 1, title: "Step 1", description: "From the reports menu, open the Equipment submenu and select Point List", img: "images/step-1.png" },
      { id: 2, title: "Step 2", description: "Click to the Options tab, and ensure the “Type” and “Object ID | Device ID | Object Name” columns are checked, and that the “BACnet points” checkbox under the “Include Only” heading are checked. Then hit “Run”", img: 'images/step-2.png' },
      { id: 3, title: "Step 3", description: "After the report has completed, click the “CSV” button. Save the resulting download to your hard drive, and upload it in the next step.", img: "images/step-3.png" },
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