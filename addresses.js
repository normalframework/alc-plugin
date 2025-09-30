
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
module.exports = { makeDeviceAddress }