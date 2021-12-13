/*
 * @Description:
 * @Author: YH
 * @Date: 2021-10-13 15:32:27
 * @LastEditTime: 2021-10-13 15:36:27
 */
let obj = {
  a: 1,
  b: {
    c: 2,
    d: 3
  },
  f: undefined
}
obj.c = obj.b
obj.e = obj.a
obj.b.c = obj.c
obj.b.d = obj.b
obj.b.e = obj.b.c

let obj2

const { port1, port2 } = new MessageChannel()
port2.onmessage = ev => (obj2 = ev.data)
port1.postMessage(obj)
console.log(obj2) // 深拷贝

