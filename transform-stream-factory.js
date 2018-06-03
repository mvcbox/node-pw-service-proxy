'use strict';

const Transform = require('stream').Transform;

/**
 * @param {Function} handler
 * @returns {Stream}
 */
module.exports = function (handler) {
    return new Transform({
        objectMode: true,
        transform: handler
    });
};
