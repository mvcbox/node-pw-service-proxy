'use strict';

const PwBuffer = require('pw-buffer');
const transformStream = require('./transform-stream-factory');

/**
 * @param {Object} options
 * @return {Stream}
 */
module.exports = function (options) {
    options = Object.assign({}, options || {});
    let buffer = new PwBuffer({
        maxBufferLength: options.bufferSize
    });
    let packet;
    let oldPointer;

    return transformStream(function (chunk, enc, done) {
        if (buffer.getFreeSpace() < options.bufferFreeSpaceGc) {
            buffer.gc();
        }

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

            this.push(packet);
        }

        done();
    });
};
