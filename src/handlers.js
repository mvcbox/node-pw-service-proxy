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
             * @param {Socket} input
             * @param {Socket} output
             * @param {Function} next
             */
            handler: function (packet, input, output, next) {
                console.info("\n[" + new Date().toLocaleString() + ']: ' + options.title);
                console.info('Opcode: ', packet.opcode + ' [0x' + packet.opcode.toString(16).toUpperCase() + ']');
                console.info('Length: ', packet.length);
                console.info('Payload: ', packet.payload.buffer.toString('hex'));
                next();
            }
        };
    }
};