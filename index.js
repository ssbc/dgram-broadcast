'use strict'

var udp = require('dgram')
var pipe = require('stream').prototype.pipe
var os = require('os')

/**
 * Default udp4 broadcast to 255.255.255.255
 * Will udp6 multicast to ff02::114 with (family = 'IPv6')
 */
module.exports = function (port, loopback, family) {
  family = family || 'IPv4'

  var config = {
    IPv4: {
      type: 'udp4',
      localBind: '0.0.0.0',
      broadcastAddress: '255.255.255.255',
      broadcast: true
    },
    IPv6: {
      type: 'udp6',
      localBind: '::',
      broadcastAddress: 'ff02::114', // dns-sd experimental
      broadcast: false
    }
  }[family]

  var type = config.type
  var localBind = config.localBind
  var broadcast = config.broadcast
  var broadcastAddress = config.broadcastAddress

  if (family === 'IPv6') loopback = true

  var addresses = []
  var socket = udp.createSocket({ type: type, reuseAddr: true })

  socket.readable = socket.writable = true

  socket.write = function (message) {
    if (typeof message === 'string') {
      message = Buffer.from(message, 'utf8')
    }
    socket.send(message, 0, message.length, port, 'ff02::114')
    return true
  }

  socket.end = function () {
    socket.close()
  }

  socket.on('close', function () {
    socket.emit('end')
  })

  var latest = null

  socket.on('message', function (msg, other) {
    console.log(msg.toString())

    if (!!addresses[other.address] && other.port === port) {
      if (loopback === false) return
      msg.loopback = true
    }

    msg.port = other.port
    msg.address = other.address

    // if paused, remember the latest item.
    // otherwise just drop those messages.
    if (socket.paused) {
      latest = msg
      return latest
    }

    latest = null
    socket.emit('data', msg)
  })

  socket.pause = function () {
    socket.paused = true
    return this
  }

  socket.resume = function () {
    socket.paused = false
    if (latest) {
      var msg = latest
      latest = null
      socket.emit('data', msg)
    }
    return this
  }

  socket.bind(port, localBind)
  socket.on('listening', function () {
    var interfaces = os.networkInterfaces()
    Object.values(interfaces)
      .forEach(function (address) {
        if (address.family === family) {
          addresses.push(address.address)
        }
      })

    socket.setBroadcast(broadcast)
    socket.setMulticastLoopback(loopback)

    if (family === 'IPv4') return

    // FIXME: can we set multiple multicast interfaces?
    // FIXME: or can we have multiple memberships?
    var iface = 'lo0'
    socket.setMulticastInterface('::%' + iface)
    socket.addMembership(broadcastAddress, '::%' + iface)
  })

  socket.pipe = pipe

  return socket
}
