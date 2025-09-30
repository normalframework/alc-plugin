const NormalSdk = require("@normalframework/applications-sdk");
const { v5 } = require('uuid');
const { Buffer } = require('buffer');
const fs = require("fs");
const { makeDeviceAddress } = require("./addresses.js")

/**
 * Write a Buffer to a file as base64, wrapped at a given line width.
 * @param {Buffer} buf - The data to encode
 * @param {string} filename - File to write to
 * @param {number} [lineWidth=76] - Number of characters per line
 */
function writeBufferAsBase64(buf, filename, lineWidth = 76) {
    // Encode as base64
    const base64 = buf.toString("base64");

    // Split into fixed-width lines
    const lines = base64.match(new RegExp(`.{1,${lineWidth}}`, "g")) || [];

    // Join with newlines
    const text = lines.join("\n");

    fs.writeFileSync(filename, text, "utf8");
    console.log(`Wrote ${filename} (${lines.length} lines of base64)`);
}

/**
 * Invoke hook function
 * @param {NormalSdk.InvokeParams} params
 * @returns {NormalSdk.InvokeResult}
 */

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = async ({ points, sdk, update, args }) => {
    console.log(points[0])
    let res = await sdk.http.get("/api/v1/point/points-id?uuids=" + points[0].uuid)
    console.log("parent", res.data.points[0].parentUuid)
    let offset = 0
    let chunksz = 400;
    let buffers = []
    while (true) {
        let res;
        // retry if we get ARF timeouts
        for (let i = 0; i < 3; i++) {
            try {
                res = await sdk.http.post("/api/v2/bacnet/confirmed-service", {
                    "device_address": makeDeviceAddress(points[0].attrs),
                    "request": {
                        "atomic_read_file": {
                            "file_identifier": {
                                "object_type": "OBJECT_TYPE_FILE",
                                "instance": points[0].attrs.instance,
                            },
                            "stream_access": {
                                "file_start_position": offset,
                                "requested_octet_count": chunksz,
                            },
                        }
                    }
                })
            } catch (e) {
                console.log("got exception, retrying")
                continue
            }
            break
        }
        // sleep otherwise we get timeouts, maybe hamering the bus too hard
        await sleep(500)
        let data = Buffer.from(res.data.ack.atomicReadFile.streamAccess.fileData, 'base64')
        buffers.push(data)
        console.log("read", data.length, "bytes")
        if (data.length < chunksz) {
            break
        } else {
            offset += chunksz
        }
    }
    let firmware = Buffer.concat(buffers)
    sdk.logEvent("read " + firmware.length)

    writeBufferAsBase64(firmware, `/app/${sdk.groupKey}.bin`)

    let pattern = Buffer.from('zone_temp_1', 'utf8');
    let stringOffset = 0;
    const dataView = new DataView(firmware.buffer); // Reuse the ArrayBuffer

    while (true) {
        stringOffset = firmware.indexOf(pattern, stringOffset+pattern.length);
        if (stringOffset === -1) {
            break
        }
        // Offsets relative to the binary buffer
        const offsetA = stringOffset - 140;
        const offsetB = stringOffset - 112;

        function readFloatBE(offset) {
            if (offset < 0 || offset + 4 > firmware.length) {
                throw new Error(`Offset ${offset} out of bounds`);
            }
            return dataView.getFloat32(offset, false); // false = big-endian
        }
        const valueA = readFloatBE(offsetA);
        const valueB = readFloatBE(offsetB);

        sdk.logEvent(`Value at offset -140 (${offsetA}):`, valueA);
        sdk.logEvent(`Value at offset -112 (${offsetB}):`, valueB);

        if (valueA < 32 || valueA > 100 || valueB < 0 || valueB > 180) {
            sdk.logEvent("values failed range test; skipping")
            continue
        }

        await sdk.http.post("/api/v1/point/points", {
            "points": [
                {
                    "layer": "alc",
                    "uuid": v5("zone_temp_lo", points[0].uuid),
                    "name": "zone_temp_lo",
                    "description": "firmware temperature setpoint",
                    "parent_name": res.data.points[0].parentName,
                    "parent_uuid": res.data.points[0].parentUuid,
                    "type": "POINT",
                    "hpl_driver": "alc",
                    "attrs": {
                        "instance": points[0].attrs.instance,
                        "offset": offsetA.toString(),
                        "test_value": valueA.toString(),
                        "device_id": points[0].attrs.device_id,
                        "bacnet_net": points[0].attrs.bacnet_net,
                        "bacnet_mac": points[0].attrs.bacnet_mac,
                        "bacnet_adr": points[0].attrs.bacnet_adr,
                    }
                },
                {
                    "layer": "alc",
                    "uuid": v5("zone_temp_hi", points[0].uuid),
                    "name": "zone_temp_hi",
                    "parent_name": res.data.points[0].parentName,
                    "parent_uuid": res.data.points[0].parentUuid,
                    "hpl_driver": "alc",
                    "type": "POINT",
                    "attrs": {
                        "instance": points[0].attrs.instance,
                        "offset": offsetB.toString(),
                        "test_value": valueB.toString(),
                        "device_id": points[0].attrs.device_id,
                        "bacnet_net": points[0].attrs.bacnet_net,
                        "bacnet_mac": points[0].attrs.bacnet_mac,
                        "bacnet_adr": points[0].attrs.bacnet_adr,
                    }
                },
            ]
        })
        return;
    }
    return NormalSdk.InvokeError("did not find any setpoints")

};