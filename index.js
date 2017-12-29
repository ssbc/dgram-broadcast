
var udp = require('dgram')
var pipe = require('stream').prototype.pipe
var os = require('os')

module.exports = function (port, loopback) {

  var addresses = {}
  var socket = udp.createSocket({type: 'udp4', reuseAddr: true})

// disable to test if this fixes: https://github.com/dominictarr/broadcast-stream/issues/5
//  process.on('exit', function () {
//    socket.dropMembership('255.255.255.255')
//    socket.close()
//  })

  socket.readable = socket.writable = true

  socket.write = function (message) {
    if('string' === typeof message)
      message = new Buffer(message, 'utf8')
    socket.send(message, 0, message.length, port, '255.255.255.255')
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
    if(addresses[other.address] && other.port === port) {
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

  socket.bind(port)
  socket.on('listening', function () {
    var ifaces = os.networkInterfaces()
    for(var k in ifaces)
      ifaces[k].forEach(function (address) {
        addresses[address.address] = true
      })
    socket.setBroadcast(true)
  })

  socket.pipe = pipe

  return socket
}
