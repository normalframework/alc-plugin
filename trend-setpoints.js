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
/**
 * Invoke hook function
 * @param {NormalSdk.InvokeParams} params
 * @returns {NormalSdk.InvokeResult}
 */
module.exports = async ({ points, sdk, update, args }) => {
    //console.log(points)
    for (let i = 0; i < points.length; i++) {
        var res;
        for (let j = 0; j < 3; j++) {
            try {
                res = await sdk.http.post("/api/v2/bacnet/confirmed-service", {
                    "device_address": makeDeviceAddress(points[0]._point.attrs),
                    "request": {
                        "atomic_read_file": {
                            "file_identifier": {
                                "object_type": "OBJECT_TYPE_FILE",
                                "instance": points[i].attrs.instance,
                            },
                            "stream_access": {
                                "file_start_position": points[i].attrs.offset,
                                "requested_octet_count": 4,
                            },
                        }
                    }
                }, {
                    timeout: 10000,
                })
            } catch (e) {
                console.log("error encountered", e)
                continue
            }
            break
        }
        console.log(res)
        let data = Buffer.from(res.data.ack.atomicReadFile.streamAccess.fileData, 'base64')
        let value = data.readFloatBE(0)
        sdk.logEvent(`${points[i].uuid}: ${value}}`)
        res = await sdk.http.post("/api/v1/point/data", {
            "uuid": points[i].uuid,
            "values": [
                {
                    "ts": new Date().toISOString(),
                    "real": value,
                },
            ],
            "is_async": true,
        })
        console.log(res.data)
    }
};