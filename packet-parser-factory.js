'use strict';

const PwBuffer = require('pw-buffer');

/**
 * @param options
 */
module.exports = function (options) {
    options = Object.assign({}, options || {});
    let _buffer = new PwBuffer({
        maxBufferLength: options.bufferSize
    });
    let packet;
    let oldPointer;

    return function (buffer) {
        if (_buffer.getFreeSpace() < options.bufferFreeSpaceGc) {
            _buffer.gc();
        }

        let result = [];
        _buffer._writeNativeBuffer(buffer, false);

        while (true) {
            packet = {};
            oldPointer = _buffer.pointer;

            if (!_buffer.isReadableCUInt()) {
                _buffer.pointer = oldPointer;
                break;
            }

            packet.opcode = _buffer.readCUInt();

            if (!_buffer.isReadableCUInt()) {
                _buffer.pointer = oldPointer;
                break;
            }

            packet.length = _buffer.readCUInt();

            if (!_buffer.isReadable(packet.length)) {
                _buffer.pointer = oldPointer;
                break;
            }

            packet.payload = _buffer.readBuffer(packet.length, false, {
                maxBufferLength: packet.length + 10
            });

            result.push(packet);
        }

        return result;
    };
};
