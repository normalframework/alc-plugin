const NormalSdk = require("@normalframework/applications-sdk");
const { Buffer } = require ('buffer');

function makeDeviceAddress(attrs) {
  // Split IP:port
  const [ipStr, portStr] = attrs.bacnet_mac.split(':');
  const ipParts = ipStr.split('.').map(octet => parseInt(octet, 10));
  const port = parseInt(portStr, 10);

  if (ipParts.length !== 4 || ipParts.some(n => isNaN(n) || n < 0 || n > 255)) {
    throw new Error(`Invalid IP address: ${ipStr}`);
  }
  if (isNaN(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port: ${portStr}`);
  }

  // Pack IP + Port into a 6-byte buffer
  const macBuf = Buffer.alloc(6);
  macBuf.set(ipParts, 0);
  macBuf.writeUInt16BE(port, 4);

  return {
    mac: macBuf.toString('base64'),                 // 6-byte packed binary → base64
    net: parseInt(attrs.bacnet_net, 10),            // BACnet network number
    adr: Buffer.from(attrs.bacnet_adr, 'hex').toString('base64'), // hex → base64
    // max_apdu: undefined or set if known
    device_id: parseInt(attrs.device_id, 10),
    // bbmd: undefined if not present
    port_id: 0                                      // default BACnet/IP
  };
}

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

async function sendAtomicReadFile(point) {
  const { deviceId, offset, instance } = findAlcLayerAttrs(point.getSplitAttrsList().map(x => x.toObject()));
  let res;
  for (let j = 0; j < 3; j++) {
      try {
          res = await g_sdk.http.post("/api/v2/bacnet/confirmed-service", {
              "device_address": makeDeviceAddress(point._point.attrs),
              "request": {
                  "atomic_read_file": {
                      "file_identifier": {
                          "object_type": "OBJECT_TYPE_FILE",
                          "instance": instance,
                      },
                      "stream_access": {
                          "file_start_position": offset,
                          "requested_octet_count": 4,
                      },
                  }
              }
          }, {
              timeout: 3000,
          })
      } catch (e) {
          console.log("error encountered", e)
          continue
      }
      break
  }
  const data = Buffer.from(res.data.ack.atomicReadFile.streamAccess.fileData, 'base64')
  const value = data.readFloatBE(0)
  sdk.logEvent(`${point.getUuid()}: ${value}}`)
  return value
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
  },
  read: async (call, callback) => {
    const reads = call.request.getReadsList(); // returns array of PointWrite objects      
    const reply = new messages.ReadReply();
    const errors = [];

    for (const read of reads) {
      const point = read.getPoint();

      try {
        let res = await sendAtomicReadFile(point)
      } catch (err) {
          console.error('Read error:', err);
          errors.push(makeError(read.getPoint().getUuid(), err.message));
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