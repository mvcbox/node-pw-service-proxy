'use strict';

const PwBuffer = require('pw-buffer');

/**
 * @param {Object} options
 * @returns {function(*=): Array}
 */
module.exports = function (options) {
    options = Object.assign({}, options || {});
    let result;
    let opcode;
    let length;
    let oldPointer;
    let buffer = new PwBuffer({
        maxBufferLength: options.bufferSize
    });

    return function (chunk) {
        if (buffer.getFreeSpace() < options.bufferFreeSpaceGc) {
            buffer.gc();
        }

        result = [];
        buffer._writeNativeBuffer(chunk);

        while (true) {
            if (!buffer.isReadableCUInt()) {
                break;
            }

            oldPointer = buffer._pointer;
            opcode = buffer.readCUInt();

            if (!buffer.isReadableCUInt()) {
                buffer._pointer = oldPointer;
                break;
            }

            length = buffer.readCUInt();

            if (!buffer.isReadable(length)) {
                buffer._pointer = oldPointer;
                break;
            }

            result.push({
                opcode,
                length,
                payload: buffer.readBuffer(length, false, {
                    maxBufferLength: length + 10
                })
            });
        }

        return result;
    };
};
