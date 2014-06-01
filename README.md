# broadcast-stream

A more obvious dgram broadcast.

broadcast stream has the correct defaults to just work
for broadcast on your local network.

## Example

broadcast on a port on your local network.

``` js
var createStream = require('broadcast-stream')

var stream = createStream(8999)

stream.on('data', function (msg) {
  console.log(msg.toString())
  console.log(msg.address, msg.port, msg.echo)
})

setInterval(function () {
  stream.write(new Buffer(new Date().toString(), 'utf8'))
}, 1000)

```

## api

### stream = createStream (port, loopback=true)

stream on the `port`. If `loopback` is false, do not output your own messages.
returns a stream.

### stream.on('data', msg)

`msg` is the message as a buffer,
`msg` also has `msg.address` and `msg.port` set to the address and port that originated the message.
if msg is a message that this stream sent, it will also have `msg.loopback = true`.

### back-pressure

udp does not have back-pressure, but the stream api does.
if the stream is paused, it will just drop messages.
if when the stream is resumed, it will emit the latest message.

## License

MIT
