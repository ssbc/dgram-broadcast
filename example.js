

var createUdpStream = require('./')

var stream = createUdpStream(8999)

stream.on('data', function (message) {
  console.log(message.toString(), message.address + ':' + message.port, message.loopback ? 'loopback' : '')
})

setInterval(function () {
  stream.write('hello there! ' + new Date())
}, 1000)
