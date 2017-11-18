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
             * @param {Function} res
             * @param {Function} next
             */
            handler: function (packet, res, next) {
                console.info(options.title);
                console.info({
                    opcode: packet.opcode,
                    length: packet.length,
                    payload: packet.payload.buffer
                });
                next();
            }
        };
    }
};