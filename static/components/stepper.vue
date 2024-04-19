<template>
  <v-stepper style="height: 100%; display: flex; flex-direction: column;" v-model="step" :items="items" show-actions editable>
    <template v-slot:item.1>
      <export-steps />
    </template>

    <template v-slot:item.2>
      <h3 class="text-h6">Select Exported file to upload</h3>
      <br>
      <v-file-input ref="fileupload" clearable @change="handleFileUpload($event)" accept=".csv" label="ALC Export" chips
        :loading="isLoading"></v-file-input>
    </template>

    <template v-slot:item.3>
      <template v-if="!uploadState.status">
        <div style="display: flex; justify-content: space-between;">
          <h3 class="text-h6">Preview Data</h3>
          <v-btn variant="elevated" color="#5865f2" @click="importData" :loading="isLoading">Import</v-btn>
        </div>
        <br>
        <ag-grid-vue :getRowStyle="getRowStyle" :columnDefs="columnDefs" :rowData="rowData"
          style="height: 600px; width: 100%; flex-grow: 1" class="ag-theme-alpine"></ag-grid-vue>
      </template>
      <template v-else>
        <v-card style="margin: 50px;" class="mx-auto" max-width="344">
          <v-card-text>
            <p class="text-h4 font-weight-black" style="color: green;">Import Success</p>
            <div style="display: flex; align-items: center; margin-top: 10px; gap: 8px;">
              <div class="text-h5">
                Total Points Updated:
              </div>
              <div class="text-h4">{{ uploadState.updatedCount }}</div>
            </div>
            <v-btn style="margin-top: 24px;" @click="uploadAnother">Upoad Another</v-btn>
          </v-card-text>
        </v-card>
      </template>
    </template>
  </v-stepper>
</template>

<script>
import exportSteps from './export-steps.vue';

var sdk = new nf(window.location.origin);

const createPointQuery = (point) => ({
  and: [
    {
      field: {
        property: "device_id",
        text: point?.["Device ID"].split(":")?.[1],
      },
    },
    {
      field: {
        property: "object_id",
        text: point?.["Object ID"].replace(":", "."),
      },
    },
  ],
});

export default {
  components: {
    ["export-steps"]: exportSteps,
  },
  data: () => ({
    filename: "",
    file: "",
    isLoading: false,
    content: [],
    parsed: false,
    step: 1,
    items: [
      'Export from ALC',
      'Upload Export',
      'Import to NF',
    ],
    columnDefs: [
      { field: "action", sortable: true, sort: "desc" },
      { field: "Location", sortable: true },
      { field: "Control Program", sortable: true },
      { field: "Name", sortable: true },
      { field: "Type", sortable: true },
      { field: "Object ID", sortable: true },
      { field: "Device ID", sortable: true },
      { field: "Object Name", sortable: true },
      { field: "Offset / Polarity", sortable: true },
      { field: "Exp:Num", sortable: true },
      { field: "I/O Type", sortable: true },
    ],
    rowData: [],
    uploadState: {}
  }),
  watch: {
    async content() {
      this.isLoading = true;
      await this.processData();
      this.isLoading = false;
    }
  },
  methods: {
    chunk: (arr, size) =>
      Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size),
      ),
    handleFileUpload(event) {
      this.file = event.target.files[0];
      this.parseFile();
    },
    parseFile() {
      Papa.parse(this.file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          this.content = results;
          this.parsed = true;
        }.bind(this),
      });
    },
    async importData() {
      this.isLoading = true;
      const updates = this.rowData.filter(r => r.action === 'Update')
        .map(r => ({ layer: 'alc', uuid: r.uuid, attrs: { name: r.Name, location: r.Location, control_program: r["Control Program"] } }))

      const chunks = this.chunk(updates, 100);

      for (const points of chunks) {
        await sdk.updatePoints(points);
      }
      this.isLoading = false;
      this.resetUploadState()
      this.uploadState = { status: 'success', updatedCount: updates.length }
    },
    async processData() {
      if (!this.parsed) return;
      const groups = this.chunk(this.content.data, 100);
      for (const group of groups) {
        const points = await sdk.getPoints({
          or: group.map(createPointQuery),
        });

        group.forEach((aclPoint) => {
          const point = points.find((p) => {
            return (
              p.attrs.device_id === aclPoint?.["Device ID"].split(":")?.[1] &&
              p.attrs.object_id ===
              aclPoint?.["Object ID"].replace(":", ".").toLowerCase()
            );
          })
          if (point) {
            aclPoint.action = "Update";
            aclPoint.uuid = point.uuid;
          } else {
            aclPoint.action = "Skip (point not defined)";
          }
        });
      }
      this.rowData = groups.flatMap(g => g);
    },
    resetUploadState() {
      this.$refs.fileupload.reset()
      this.file = "";
      this.content = [];
      this.parsed = false;
      this.rowData = []
    },
    uploadAnother() {
      this.resetUploadState();
      this.step = 2;
      this.uploadState = {};
    },
    getRowStyle: params => {
      if (params.node.data.action === 'Update') {
        return { background: '#90EE90' };
      }
    }
  }
}
</script>
<style>
.v-stepper-window {
  overflow: auto;
}
</style>