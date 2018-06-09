'use strict';

const async = require('async');
const transformStreamFactory = require('./transform-stream-factory');
const packetParserFactory = require('./packet-parser-factory');

/**
 * @param {Object} handlers
 * @param {Stream} input
 * @param {Stream} output
 * @param {Object} packetParserOptions
 * @returns {Stream}
 */
module.exports = function (handlers, input, output, packetParserOptions) {
    let packetParser = packetParserFactory(packetParserOptions);

    return transformStreamFactory(function (chunk, enc, done) {
        let _stream = this;
        let packets = packetParser(chunk);

        if (!packets.length) {
            return done();
        }

        async.eachSeries(packets, function (packet, nextPacket) {
            async.eachSeries(handlers._list, function (handler, nextHandler) {
                if (
                    handler.only && handler.only.indexOf(packet.opcode) === -1 ||
                    handler.except && handler.except.indexOf(packet.opcode) !== -1
                ) {
                    return nextHandler();
                }

                handler.handler(packet, input, output, nextHandler);
            }, function (err) {
                if (!err) {
                    _stream.push(packet.payload.writeCUInt(packet.payload.length, true).writeCUInt(packet.opcode, true).buffer);
                }

                nextPacket();
            });
        }, function (err) {
            done();
        });
    });
};
