
var udp = require('dgram')
var pipe = require('stream').prototype.pipe
var os = require('os')

module.exports = function (port, loopback, family='IPv4') {
  const familySettings = {
    IPv4: {
      type: 'udp4',
      broadcastAddress: '255.255.255.255',
      localBind: '0.0.0.0'
    },
    IPv6: {
      type: 'udp6',
      broadcastAddress: 'ff02::114', // dns-sd experimental
      localBind: '::'
    }
  }
  const { type, localBind, broadcastAddress } = familySettings[family]

  const addresses = new Set()
  const socket = udp.createSocket({type, reuseAddr: true})

  socket.readable = socket.writable = true

  socket.write = function (message) {
    if('string' === typeof message)
      message = new Buffer(message, 'utf8')
    socket.send(message, 0, message.length, port, broadcastAddress)
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
    if(addresses.has(other.address) && other.port === port) {
      if(loopback === false) return
      msg.loopback = true
    }

    msg.port = other.port
    msg.address = other.address

    //if paused, remember the latest item.
    //otherwise just drop those messages.
    if(socket.paused)
      return latest = msg

    latest = null
    socket.emit('data', msg)
  })

  socket.pause = function () {
    socket.paused = true
    return this
  }

  socket.resume = function () {
    socket.paused = false
    if(latest) {
      var msg = latest
      latest = null
      socket.emit('data', msg)
    }
    return this
  }

  socket.bind(port, localBind)
  socket.on('listening', function () {
    const interfaces = os.networkInterfaces()
    const allAddresses = [].concat(...Object.values(interfaces))
    // Only listen on interfaces with the same family
    addresses.add(allAddresses
      .filter(({family: localFamily}) => family === localFamily)
      .map(({address}) => address))
    if (family === 'IPv4') {
      socket.setBroadcast(true)
    } else {
      socket.setMulticastLoopback(loopback)
      for (let iface of Object.keys(interfaces)) {
        socket.addMembership(broadcastAddress, `::%${iface}`)
      }
    }
  })

  socket.pipe = pipe

  return socket
}
