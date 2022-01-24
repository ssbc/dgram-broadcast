const udp = require('dgram')
const pipe = require('stream').prototype.pipe
const os = require('os')

module.exports = function createStream(
  port,
  loopback = true,
  destinations = ['255.255.255.255']
) {
  const addresses = {}
  const socket = udp.createSocket({ type: 'udp4', reuseAddr: true })

  socket.readable = socket.writable = true

  socket.write = function write(message) {
    if (typeof message === 'string') message = Buffer.from(message, 'utf8')
    for (const destination of destinations) {
      socket.send(message, 0, message.length, port, destination)
    }
    return true
  }

  socket.end = function end() {
    socket.close()
  }

  socket.on('close', function close() {
    socket.emit('end')
  })

  let latestMsg = null

  socket.on('message', function onMessage(msg, other) {
    if (addresses[other.address] && other.port === port) {
      if (!loopback) return
      msg.loopback = true
    }

    msg.port = other.port
    msg.address = other.address

    // If paused, remember the latest message,
    // otherwise just drop those messages.
    if (socket.paused) return (latestMsg = msg)

    latestMsg = null
    socket.emit('data', msg)
  })

  socket.pause = function pause() {
    socket.paused = true
    return this
  }

  socket.resume = function resume() {
    socket.paused = false
    if (latestMsg) {
      const msg = latestMsg
      latestMsg = null
      socket.emit('data', msg)
    }
    return this
  }

  socket.bind(port)

  socket.on('listening', function onListening() {
    const ifaces = os.networkInterfaces()
    for (const k of Object.keys(ifaces)) {
      for (const address of ifaces[k]) {
        addresses[address.address] = true
      }
    }
    socket.setBroadcast(true)
  })

  socket.pipe = pipe

  return socket
}
