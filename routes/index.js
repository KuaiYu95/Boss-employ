var express = require('express')
var router = express.Router()

const md5 = require('blueimp-md5');
const { UserModel, ChatModel } = require('../db/models')
const filter = {password: 0, _v: 0}  // 查询时过滤出指定的属性

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' })
})

// 注册的路由
router.post('/register', (req, res) => {
  // 读取请求参数数据
  const {username, password, type} = req.body
  // 处理
  UserModel.findOne({username}, (err, user) => {
    if(user) {
      res.send({code: 1, msg: '此用户已存在!'})
    } else {
      new UserModel({username, type, password: md5(password)}).save((err, user) => {
        // 生成一个cookie， 并交给浏览器保存
        // maxAge 持久化cookie, 浏览器会保存在本地文件
        res.cookie('userid', user._id, {maxAge: 1000*60*60*24*7})
        const data = {username, type, _id: user._id} // 响应数据中不要携带密码
        res.send({code: 0, data})
      })
    }
  })
  // 返回响应数据
})

// 登录的路由
router.post('/login', (req, res) => {
  console.log('login')
  const {username, password} = req.body
  // 根据 username 和 password 去数据库查询得到 user
  UserModel.findOne({username, password: md5(password)}, filter, (err, user) => {
    if (user) { // 登录成功
      res.cookie('userid', user._id, {maxAge: 1000*60*60*24*7})
      res.send({code: 0, data: user})
    } else {
      res.send({code: 1, msg: '用户名或密码错误!'})
    }
  })
})

// 更新用户信息的路由
router.post('/update', (req, res) => {
  // 先从cookie中得到useid
  const userid = req.cookies.userid
  if (!userid) {
    return res.send({code: 1, msg: '请先登录!'})
  }
  const user = req.body // 没有_id
  UserModel.findByIdAndUpdate({_id: userid}, user, (err, oldUser) => {

    if(!oldUser) {
      res.clearCookie('userid')
      return res.send({code: 1, msg: '请先登录!'})
    } else {  // 返回user数据对象
      const { _id, username, type } = oldUser
      const data = Object.assign(user, {_id, username, type})
      res.send({code: 0, data})
    }
  })
})

// 获取用户信息的路由（根据cookie中的userid）
router.get('/user', (req, res) => {
  // 先从cookie中得到useid
  const userid = req.cookies.userid
  if (!userid) {
    return res.send({code: 1, msg: '请先登录!'})
  }
  // 根据userid查询对应的user
  UserModel.findOne({_id: userid}, filter, (err, user) => {
    res.send({code: 0, data: user})
  })
})

// 获取用户列表（用户类型）
router.get('/userlist', (req, res) => {
  const { type } = req.query
  UserModel.find({type}, filter, (err, users) => {
    if(err) {console.log(err)}
    res.send({code: 0, data: users})
  })
})

// 获取当前用户所有相关聊天信息列表
router.get('/msglist', (req, res) => {
  // 获取 cookie 中的 userid
  const userid = req.cookies.userid
  // console.log(userid)

  // 查询得到所有 user 文档数组
  UserModel.find((err, userDocs) => {
    // 用对象存储所有 user 信息: key 为 user 的_id, val 为 name 和 header 组成的 user 对象
    const users = {}
    userDocs.forEach(doc => {
      users[doc._id] = {username: doc.username, header: doc.header}
    })
    // console.log(users)
    /*
    查询 userid 相关的所有聊天信息
    参数 1: 查询条件  参数 2: 过滤条件  参数 3: 回调函数
    */
    ChatModel.find({'$or': [{from: userid}, {to: userid}]}, filter, function (err, chatMsgs) {
        // 返回包含所有用户和当前用户相关的所有聊天消息的数据
        // console.log({users, chatMsgs})
        res.send({code: 0, data: {users, chatMsgs}})
    })
  })
})

// 修改指定消息为已读
router.post('/readmsg', function (req, res) {
  // 得到请求中的 from 和 to
  const from = req.body.from
  const to = req.cookies.userid
  /*
  更新数据库中的 chat 数据
  参数 1: 查询条件
  参数 2: 更新为指定的数据对象
  参数 3: 是否 1 次更新多条, 默认只更新一条
  参数 4: 更新完成的回调函数
  */
  ChatModel.update({from, to, read: false}, {read: true}, {multi: true}, (err,doc) => {
    console.log('/readmsg', doc)
    res.send({code: 0, data: doc.nModified}) // 更新的数量
  })
})

module.exports = router
