'use strict';

const PwBuffer = require('pw-buffer');
const net = require('net');
const through2 = require('through2');
const async = require('async');

class PwServiceProxy
{
    /**
     * @param {Object} options
     */
    constructor(options) {
        this._options = Object.assign({}, {
            bufferSize: 10485760,
            bufferFreeSpaceGc: 1048576
        }, options || {});
        this._clientHandlers = [];
        this._serverHandlers = [];
    }

    /**
     * @param {Array} handlers
     * @param {Stream} socket
     * @return {Stream}
     * @private
     */
    _createHandlersStream(handlers, socket) {
        return through2.obj(function (packet, enc, streamDone) {
            let _thisStream = this;

            async.each(handlers, function (handler, next) {
                if (
                    handler.only && handler.only.indexOf(packet.opcode) === -1 ||
                    handler.except && handler.except.indexOf(packet.opcode) !== -1
                ) {
                    return next();
                }

                handler.handler(packet, socket, next);
            }, function (err) {
                packet.payload.writeCUInt(packet.payload.length, true).writeCUInt(packet.opcode, true);
                _thisStream.push(packet.payload.buffer);
                streamDone();
            });
        });
    }

    /**
     * @return {Stream}
     * @private
     */
    _createReadPacketStream() {
        let buffer = new PwBuffer({
            maxBufferLength: this._options.bufferSize
        });
        let packet;
        let oldPointer;
        let _this = this;

        return through2.obj(function (chunk, enc, done) {
            if (buffer.getFreeSpace() < _this._options.bufferFreeSpaceGc) {
                buffer.gc();
            }

            buffer._writeNativeBuffer(chunk, false);

            while (true) {
                packet = {};
                oldPointer = buffer.pointer;

                if (!buffer.isReadableCUInt()) {
                    buffer.pointer = oldPointer;
                    break;
                }

                packet.opcode = buffer.readCUInt();

                if (!buffer.isReadableCUInt()) {
                    buffer.pointer = oldPointer;
                    break;
                }

                packet.length = buffer.readCUInt();

                if (!buffer.isReadable(packet.length)) {
                    buffer.pointer = oldPointer;
                    break;
                }

                packet.payload = buffer.readBuffer(packet.length, false, {
                    maxBufferLength: packet.length + 10
                });

                this.push(packet);
            }

            done();
        });
    }

    /**
     * @param {Object} options
     * @return {PwServiceProxy}
     */
    start(options) {
        let _this = this;

        net.createServer(function (clientSocket) {
            let remoteAddr = clientSocket.remoteAddress + ':' + clientSocket.remotePort;
            let alreadyClosed = false;
            let serverSocket = net.createConnection(options.connect);

            clientSocket
                .pipe(_this._createReadPacketStream())
                .pipe(_this._createHandlersStream(_this._clientHandlers, clientSocket))
                .pipe(serverSocket)
                .pipe(_this._createReadPacketStream())
                .pipe(_this._createHandlersStream(_this._serverHandlers, serverSocket))
                .pipe(clientSocket);

            function closeConnection() {
                if (alreadyClosed) {
                    return;
                }

                alreadyClosed = true;
                clientSocket.destroy().unref();
                serverSocket.destroy().unref();
                console.info('---------------------------------------------------------------------------');
                console.info('[' + new Date().toLocaleString() + ']: Client disconnected [' + remoteAddr + ']');
            }

            serverSocket.on('close', closeConnection).on('error', closeConnection).setNoDelay(true);
            clientSocket.on('close', closeConnection).on('error', closeConnection).setNoDelay(true);
            console.info('---------------------------------------------------------------------------');
            console.info('[' + new Date().toLocaleString() + ']: Client connected [' + remoteAddr + ']');
        }).listen(options.listen, function () {
            console.info('---------------------------------------------------------------------------');
            console.info('[' + new Date().toLocaleString() + ']: Proxy start');
        }).on('error', function (err) {
            console.info('---------------------------------------------------------------------------');
            console.error('[' + new Date().toLocaleString() + ']: Proxy error');
            console.error(JSON.stringify(options, null, 2));
            console.error(err.stack);
        });

        return this;
    }

    /**
     * @param {Array} handlers
     * @return {PwServiceProxy}
     */
    setClientHandlers(handlers) {
        this._clientHandlers = handlers;
        return this;
    }

    /**
     * @param {Array} handlers
     * @return {PwServiceProxy}
     */
    setServerHandlers(handlers) {
        this._serverHandlers = handlers;
        return this;
    }
}

module.exports = PwServiceProxy;
