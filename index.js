'use strict';

const PwServiceProxy = require('./PwServiceProxy');

/**
 * @param {Object} [options]
 * @param {number} [options.bufferSize]
 * @param {number} [options.bufferFreeSpaceGc]
 * @param {boolean} [options.noDelay]
 * @param {boolean} [options.consoleLog]
 * @param {boolean} [options.consoleError]
 * @returns {PwServiceProxy}
 */
module.exports = function (options) {
    return new PwServiceProxy(options);
};
