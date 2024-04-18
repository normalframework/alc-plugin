import { ref, watchEffect } from "vue";
// import { AgGridVue } from "agGridVue"

// console.log("vue", AgGridVue)

var sdk = new nf("http://localhost:8080");

const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size),
  );

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

const updatePoints = async (points) => {
  await sdk.updatePoints(points);
};

export default {
  props: ["data"],
  // components: {
  //   AgGridVue,
  // },
  async mounted(props) {
    const data = JSON.parse(JSON.stringify(this.$props.data));
    const groups = chunk(data, 100);
    console.log(groups);

    for (const group of groups) {
      const points = await sdk.getPoints({
        or: group.map(createPointQuery),
      });

      group.forEach((aclPoint) => {
        if (
          points.find((p) => {
            return (
              p.attrs.device_id === aclPoint?.["Device ID"].split(":")?.[1] &&
              p.attrs.object_id ===
              aclPoint?.["Object ID"].replace(":", ".").toLowerCase()
            );
          })
        ) {
          aclPoint.action = "Update";
        } else {
          aclPoint.action = "Skip (point not defined)";
        }
      });

      console.log(points);
    }

    const points = await sdk.getPoints({
      and: [
        {
          field: {
            property: "object_id",
            text: "ai.1",
          },
        },
        {
          field: {
            property: "device_id",
            text: "240025",
          },
        },
      ],
    });

    this.rowData = groups.flatMap((g) => g);


  },
  data() {
    return {
      columnDefs: [
        { field: "action", sortable: true },
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
      rowData: []
    }
  },

  // setup(props) {
  //   const { data: initialData } = props;
  //   const gridRef = ref(null);

  //   const data = JSON.parse(JSON.stringify(initialData));

  //   watchEffect(async () => {
  //     const columnDefs = [
  //       { field: "action", sortable: true },
  //       { field: "Location", sortable: true },
  //       { field: "Control Program", sortable: true },
  //       { field: "Name", sortable: true },
  //       { field: "Type", sortable: true },
  //       { field: "Object ID", sortable: true },
  //       { field: "Device ID", sortable: true },
  //       { field: "Object Name", sortable: true },
  //       { field: "Offset / Polarity", sortable: true },
  //       { field: "Exp:Num", sortable: true },
  //       { field: "I/O Type", sortable: true },
  //     ];

  //     const groups = chunk(data, 100);
  //     console.log(groups);

  //     for (const group of groups) {
  //       const points = await sdk.getPoints({
  //         or: group.map(createPointQuery),
  //       });

  //       if (points.length) {
  //         console.log("group", group);
  //         console.log("points", points);
  //       }

  //       group.forEach((aclPoint) => {
  //         if (
  //           points.find((p) => {
  //             return (
  //               p.attrs.device_id === aclPoint?.["Device ID"].split(":")?.[1] &&
  //               p.attrs.object_id ===
  //                 aclPoint?.["Object ID"].replace(":", ".").toLowerCase()
  //             );
  //           })
  //         ) {
  //           aclPoint.action = "Update";
  //         } else {
  //           aclPoint.action = "Skip (point not defined)";
  //         }
  //       });

  //       console.log(points);
  //     }

  //     const points = await sdk.getPoints({
  //       and: [
  //         {
  //           field: {
  //             property: "object_id",
  //             text: "ai.1",
  //           },
  //         },
  //         {
  //           field: {
  //             property: "device_id",
  //             text: "240025",
  //           },
  //         },
  //       ],
  //     });

  //     console.log("points", points);

  //     const gridOptions = {
  //       columnDefs: columnDefs,
  //       rowData: groups.flatMap((g) => g),
  //     };

  //     new agGrid.Grid(gridRef.value, gridOptions);
  //   });

  //   return { gridRef };
  // },
  template: `
  <div class="grid-wrapper">
  <div class="grid-header"><button>Update Points</button></div>
    <ag-grid-vue
        :columnDefs="columnDefs"
        :rowData="rowData"
        style="height: 100%; width: 100%: flex-grow: 1"
        class="ag-theme-alpine"
    ></ag-grid-vue>
    </div>
    `,
};
