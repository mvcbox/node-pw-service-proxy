'use strict';

const Transform = require('stream').Transform;

/**
 * @param {Function} handler
 * @param {Object} options
 * @returns {Stream}
 */
module.exports = function (handler, options) {
    return new Transform(Object.assign({
        transform: handler
    }, options || {}));
};
