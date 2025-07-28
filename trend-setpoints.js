const NormalSdk = require("@normalframework/applications-sdk");

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
                    "device_address": {
                        "device_id": points[i].attrs.device_id,
                    }, "request": {
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
                    timeout: 3000,
                })
            } catch (e) {
                console.log("error encountered", e)
                continue
            }
            break
        }
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