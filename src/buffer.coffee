_validate = (beacons)->
  for b in beacons
    if !b.major? or !b.minor? or !b.uuid? or !b.rssi?
      return false
    if ((typeof b.major isnt 'number') or
      (typeof b.minor isnt 'number') or
      (typeof b.rssi isnt 'number') or
      (typeof b.uuid isnt 'string')
    )
      return false
  return true

class Buffer
  constructor: (@length, @verify = true)->
    @buffer = []

  push: (beacons)->
    if @verify and !_validate(beacons)
      throw new Error('Invalid Beacons.')
    if @buffer.length >= @length
      @buffer.shift()
    return @buffer.push(beacons)

  last: (size)->
    if size > 0
      return @buffer.slice(-1 * size)
    return []

  clear: ->
    @buffer.length = 0
    return

  size: ->
    @buffer.length

if (typeof exports isnt 'undefined')
  module.exports = Buffer
else
  @BeaconsBuffer = Buffer
