'use strict';

const async = require('async');
const transformStreamFactory = require('./transform-stream-factory');

/**
 * @param {Object} handlers
 * @param {Stream} input
 * @param {Stream} output
 * @returns {Stream}
 */
module.exports = function (handlers, input, output) {
    return transformStreamFactory(function (packet, enc, streamNext) {
        let _thisStream = this;

        async.eachSeries(handlers._list, function (handler, next) {
            if (
                handler.only && handler.only.indexOf(packet.opcode) === -1 ||
                handler.except && handler.except.indexOf(packet.opcode) !== -1
            ) {
                return next();
            }

            handler.handler(packet, input, output, next);
        }, function (err) {
            if (!err) {
                packet.payload.writeCUInt(packet.payload.length, true).writeCUInt(packet.opcode, true);
                _thisStream.push(packet.payload.buffer);
            }

            streamNext();
        });
    });
};
