const NormalSdk = require("@normalframework/applications-sdk");

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Import generated service definition and messages
const { HplDriverService } = require('@buf/normalframework_nf.grpc_node/normalgw/hpl/v1/driver_grpc_pb');
const messages = require('@buf/normalframework_nf.grpc_node/normalgw/hpl/v1/driver_pb');
const { Timestamp } = require('google-protobuf/google/protobuf/timestamp_pb.js');

const server = new grpc.Server();
var started = false
var g_sdk = undefined


function findAlcLayerAttrs(splitAttrs) {
  const alcLayer = splitAttrs.find(attr => attr.layer.toLowerCase() === 'alc');
  if (!alcLayer || !alcLayer.attrsMap) {
    throw new Error('ALC layer missing or invalid');
  }

  const attrs = Object.fromEntries(alcLayer.attrsMap);
  if (!attrs.device_id || !attrs.offset || !attrs.instance) {
    throw new Error('device_id, offset, or instance missing in ALC layer');
  }

  return {
    deviceId: parseInt(attrs.device_id, 10),
    offset: parseInt(attrs.offset, 10),
    instance: parseInt(attrs.instance, 10)
  };
}

async function sendAtomicWriteFile(point, binvalue) {
  const { deviceId, offset, instance } = findAlcLayerAttrs(point.getSplitAttrsList().map(x => x.toObject()));
  console.log("writing", point.getUuid(), deviceId, instance, offset)

  const payload = {
    device_address: {
      device_id: deviceId,
    },
    request: {
      atomic_write_file: {
        file_identifier: {
          object_type: 'OBJECT_TYPE_FILE',
          instance: instance,
        },
        stream_access: {
          file_start_position: offset,
          file_data: Buffer.from(binvalue).toString('base64'),
        }
      }
    }
  };
  return g_sdk.http.post("/api/v2/bacnet/confirmed-service", payload)
}

function makeError(uuid, message) {
    const driverError = new messages.DriverError();
    driverError.setUuid(uuid);
    const errorMsg = new messages.Error();
    errorMsg.setMessage(message);
    errorMsg.setTs(new Timestamp()); // optional timestamp
    driverError.setError(errorMsg);
    return driverError
}

server.addService(HplDriverService, {
  write: async (call, callback) => {
    const writes = call.request.getWritesList(); // returns array of PointWrite objects      
    const reply = new messages.WriteReply();
    const errors = [];

    for (const write of writes) {
      const point = write.getPoint();
      const value = write.getValue().getNormalized().getReal();

      if (value < 60 || value > 85) {
          errors.push(makeError(write.getPoint().getUuid(), "value out of range"))
          continue
      }

      const binvalue = Buffer.alloc(4);
      binvalue.writeFloatBE(value);

      try {
        let res = await sendAtomicWriteFile(point, binvalue)
      } catch (err) {
          console.error('Write error:', err);
          errors.push(makeError(write.getPoint().getUuid(), err.message));
      }

    }
    reply.setErrorsList(errors);
    callback(null, reply);
  }
});

/**
 * Invoke hook function
 * @param {NormalSdk.InvokeParams} params
 * @returns {NormalSdk.InvokeResult}
 */
module.exports = async ({points, sdk, update, args}) => {
  g_sdk = sdk
  if (started) {
    return
  }
  server.bindAsync('[::1]:10001', grpc.ServerCredentials.createInsecure(), () => {
  console.log('✅ Server listening on port 10001');
  server.start();
  started = true;
});

};