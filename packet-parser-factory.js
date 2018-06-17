'use strict';

const PwBuffer = require('pw-buffer');

/**
 * @param options
 */
module.exports = function (options) {
    options = Object.assign({}, options || {});
    let buffer = new PwBuffer({
        maxBufferLength: options.bufferSize
    });
    let result;
    let packet;
    let oldPointer;

    return function (chunk) {
        if (buffer.getFreeSpace() < options.bufferFreeSpaceGc) {
            buffer.gc();
        }

        result = [];
        buffer._writeNativeBuffer(chunk, false);

        while (true) {
            packet = {};
            oldPointer = buffer.pointer;

            if (!buffer.isReadableCUInt()) {
                buffer.pointer = oldPointer;
                break;
            }

            packet.opcode = buffer.readCUInt();

            if (!buffer.isReadableCUInt()) {
                buffer.pointer = oldPointer;
                break;
            }

            packet.length = buffer.readCUInt();

            if (!buffer.isReadable(packet.length)) {
                buffer.pointer = oldPointer;
                break;
            }

            packet.payload = buffer.readBuffer(packet.length, false, {
                maxBufferLength: packet.length + 10
            });

            result.push(packet);
        }

        return result;
    };
};
