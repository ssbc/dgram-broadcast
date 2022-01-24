# dgram-broadcast

A more obvious dgram broadcast.

`dgram-broadcast` has the correct defaults to just work for broadcast on your
local area network.

## Example

Broadcast on port `8999` on your local area network.

```js
const createStream = require('dgram-broadcast')

const stream = createStream(8999)

stream.on('data', (msg) => {
  console.log(msg.toString())
  console.log(msg.address, msg.port, msg.echo)
})

setInterval(() => {
  stream.write(Buffer.from(new Date().toString(), 'utf8'))
}, 1000)
```

## API

### `stream = createStream(port, loopback=true, dest=['255.255.255.255'])`

Stream on the port `port`. `If `loopback` is false, do not output your own
messages. Returns a Node.js stream. `dest` is an array of all the destination
addresses on which to broadcast, by default it has only `255.255.255.255` as the
destination.

### `stream.on('data', (msg) => { ... })`

`msg` is the message as a buffer, it also has `msg.address` and `msg.port` set
to the address and port that originated the message. If `msg` is a message that
this stream sent, it will also have `msg.loopback = true`.

### Back-pressure

UDP does not have back-pressure, but the stream API in this module does. If the
stream is paused, it will just drop messages. If when the stream is resumed, it
will emit the latest message.

## License

MIT
