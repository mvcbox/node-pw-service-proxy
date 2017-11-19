'use strict';

module.exports = {
    /**
     * @param {Object} options
     * @return {Function}
     */
    createLoggerHandler: function (options) {
        return {
            /**
             * @type {Array}
             */
            only: undefined,

            /**
             * @type {Array}
             */
            except: undefined,

            /**
             * @param {Object} packet
             * @param {Socket} socket
             * @param {Function} next
             */
            handler: function (packet, socket, next) {
                console.info("\n[" + new Date().toLocaleString() + ']: ' + options.title);
                console.info({
                    opcode: packet.opcode + ' [0x' + packet.opcode.toString(16).toUpperCase() + ']',
                    length: packet.length,
                    payload: packet.payload.buffer.toString('hex')
                });
                next();
            }
        };
    }
};