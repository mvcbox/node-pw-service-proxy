'use strict';

const PwBuffer = require('pw-buffer');
const net = require('net');
const uuidv4 = require('uuid/v4');
const through2 = require('through2');

class PwServiceProxy
{
    /**
     * @param {Object} options
     */
    constructor(options) {
        this._options = options || {};
        this._handlers = [];
    }

    /**
     * @return {*}
     * @private
     */
    _createClientToServerStream() {
        return through2.obj(function (packet, enc, done) {
            console.log('========================================== C => S ==========================================');
            console.log({
                opcode: packet.opcode,
                length: packet.length,
                payload: packet.payload.buffer
            });
            console.log('============================================================================================');
            packet.payload.writeCUInt(packet.payload.length, true).writeCUInt(packet.opcode, true);
            this.push(packet.payload.buffer);
            done();
        });
    }

    /**
     * @return {*}
     * @private
     */
    _createServerToClientStream() {
        return through2.obj(function (packet, enc, done) {
            console.log('========================================== S => C ==========================================');
            console.log({
                opcode: packet.opcode,
                length: packet.length,
                payload: packet.payload.buffer
            });
            console.log('============================================================================================');
            packet.payload.writeCUInt(packet.payload.length, true).writeCUInt(packet.opcode, true);
            this.push(packet.payload.buffer);
            done();
        });
    }

    /**
     * @return {*}
     * @private
     */
    _createReadPacketStream() {
        let buffer = new PwBuffer({
            maxBufferLength: 1024**2 * 10
        });
        let packet;
        let oldPointer;

        return through2.obj(function (chunk, enc, done) {
            if (buffer.getFreeSpace() < 1024**2) {
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
            let alreadyClosed = false;
            let serverSocket = net.createConnection(options.connect);

            clientSocket
                .pipe(_this._createReadPacketStream())
                .pipe(_this._createClientToServerStream())
                .pipe(serverSocket)
                .pipe(_this._createReadPacketStream())
                .pipe(_this._createServerToClientStream())
                .pipe(clientSocket);

            function closeConnection() {
                if (alreadyClosed) {
                    return;
                }

                alreadyClosed = true;
                clientSocket.destroy().unref();
                serverSocket.destroy().unref();
            }

            serverSocket.on('close', closeConnection).on('error', closeConnection).setNoDelay(true);
            clientSocket.on('close', closeConnection).on('error', closeConnection).setNoDelay(true);
        }).listen(options.listen, function () {
            console.info('--------------------------- Proxy start -------------------------');
            console.info(JSON.stringify(options, null, 2));
        }).on('error', function (err) {
            console.error('--------------------------- Proxy error -------------------------');
            console.error(JSON.stringify(options, null, 2));
            console.error(err.stack);
        });

        return this;
    }

    /**
     * @param {string} name
     * @param {Function} handler
     */
    addClientHandler(name, handler) {
        this.handlers.push({
            name,
            handler
        });
    }
}

module.exports = PwServiceProxy;
