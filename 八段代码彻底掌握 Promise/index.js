/*
 * @Description:
 * @Author: YH
 * @Date: 2021-09-24 10:53:49
 * @LastEditTime: 2021-09-24 15:16:40
 */
async function lcWait (timeout) {
  return new Promise(function (reslove, reject) {
    setTimeout(() => {
      console.log('延迟函数' + timeout)
      return reslove('延迟函数' + timeout)
    }, timeout)
  })
}

async function test () {
  for (let i = 0; i < 10; i++) {
    // await lcWait(2000 * i)
    await lcWait(200)
  }
}
test()
