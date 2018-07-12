// we udp4 broadcast on ipv4
// we udp6 multicast on ipv6

var udp = require('dgram')
var pipe = require('stream').prototype.pipe
var os = require('os')

module.exports = function (port, loopback, family='IPv4') {
  const { type, broadcastAddress, localBind, broadcast } = {
    IPv4: {
      type: 'udp4',
      broadcastAddress: '255.255.255.255',
      localBind: '0.0.0.0',
      broadcast: true
    },
    IPv6: {
      type: 'udp6',
      broadcastAddress: 'ff02::114', // dns-sd experimental
      localBind: '::',
      broadcast: false,
    }
  }[family]
  if (family==='IPv6') loopback = true

  const addresses = new Set()
  const socket = udp.createSocket({type, reuseAddr: true})

  socket.readable = socket.writable = true

  socket.write = function (message) {
    if ('string' === typeof message) {
      message = new Buffer(message, 'utf8')
    }
    const iface = 'en0'
    let address = family === 'IPv4' ? broadcastAddress : `${broadcastAddress}%${iface}`
    socket.send(message, 0, message.length, port, address)
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

    socket.setBroadcast(broadcast)
    socket.setMulticastLoopback(loopback)

    if (family === 'IPv4') return
    for (let iface of Object.keys(interfaces)) {
      socket.addMembership(broadcastAddress, `::%${iface}`)
    }
  })

  socket.pipe = pipe

  return socket
}
