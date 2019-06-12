

module.exports = (server) => {
  const ChatModel = require('../db/models').ChatModel
  const io = require('socket.io')(server)

  // 监视客户端于服务器的连接
  io.on('connection', (socket) => {
    console.log('------soket-io connected------')
    socket.on('sendMsg', ({from, to, content}) => {
      // 准备chatMsg对象相关数据
      const chat_id = [from, to].sort().join('_') // from_to / to_from
      const create_time = Date.now()
      // 处理数据
      const chatModel = new ChatModel({from, to, content, chat_id, create_time})
      // console.log('服务器接收到客户端发送的消息', content)
      chatModel.save((err, chatMsg) => {
        // 向客户端发消息
        io.emit('receiveMsg', chatMsg)
        // console.log('服务器向客户端发送消息', content)
      })
    })
  })
}