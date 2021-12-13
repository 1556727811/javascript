// promise执行的过程是执行 传入的回调函数 fn   fn里面又传入了两个函数
// 所以promise执行其实就是 fn里面的resolve 或者reject函数在执行
// resolve函数里面 改变了promise的状态  并且保存了resolve传入的参数   并且执行了then里面的回调函数  并且把参数传递给then回调函数
// 所以promise执行 是 传参fn执行---resolve执行--- resolve里面执行函数then里面的回调   
// 如果没有写then   那就到resolve那一步    只是改变状态
class MyPromise {
  constructor (fn) {
    this.__succ_res = null // 保存成功的返回结果
    this.__err_res = null // 保存失败的返回结果
    this.status = 'pending' // 标记处理的状态
    this.__queue = [] // 事件队列
    // 箭头函数绑定了this，如果使用es5写法，需要定义一个替代的this
    let _this = this
    function resolver (...arg) {
      // 原生应该不是用定时器实现的   但是姑且认为这里是一个异步把
      setTimeout(() => {
        if (_this.status === 'pending') {
          // 如果状态已经改变，不再执行本代码
          _this.__succ_res = arg
          _this.status = 'success'
          _this.__queue.forEach(json => {
            json.resolve(...arg)
          })
        };
      }, 0)
    };
    function rejecter (...arg) {
      setTimeout(() => {
        if (_this.status === 'pending') {
          // 如果状态已经改变，不再执行本代码
          _this.__err_res = arg
          _this.status = 'error'
          _this.__queue.forEach(json => {
            json.reject(...arg)
          })
        };
      }, 0)
    };
    try {
      fn(resolver, rejecter)
    } catch (err) {
      this.__err_res = [err]
      this.status = 'error'
      this.__queue.forEach(json => {
        json.reject(...err)
      })
    };
  }

  // then方法  传入两个参数  第一个是成功回调函数  第二个是失败回调函数
  then (onFulfilled, onRejected) {
    // 箭头函数绑定了this，如果使用es5写法，需要定义一个替代的this
    return new MyPromise((resFn, rejFn) => {
      // 定义两个方法   如果状态是pendingd 时候   成功就放到成功的数组队列  失败就放到失败的数组队列

      // 把onFulfilled  封装一下    returnVal是then成功回调函数的执行结果  
      //  resFn( returnVal) 新promise里面把结果resolve出去
      function handle (value) {
        // then方法的onFulfilled有return时，使用return的值，没有则使用回调函数resolve的值 
        let returnVal = value
        // 如果 then里面传入的回调函数onFulfilled是一个方法  就执行它 并且把执行结果 赋值给returnVal
        if (onFulfilled instanceof Function) {
          try {
            returnVal = onFulfilled(value)
          } catch (err) {
            // 代码错误处理
            rejFn(err)
            return
          }
        };
        // 如果执行结果returnVal存在并且里面有then方法 说明是一个promise   就调用returnVal的then方法
        if (returnVal && returnVal['then'] instanceof Function) { // 如果onFulfilled返回的是新Promise对象，则调用它的then方法
          returnVal.then(res => {
            resFn(res)
          }, err => {
            rejFn(err)
          })
        } else {
          // 最终都是为了resFn(回调函数结果)    把then回调函数结果 抛出去  执行一下新的promise的resolve   只有resolve了才能继续执行then的回调
          resFn(returnVal)
        };
      };


      function errBack (reason) {
        // 如果有onRejected回调，执行一遍
        if (onRejected instanceof Function) {
          try {
            let returnVal = onRejected(reason)
            // 执行onRejected回调有返回，判断是否thenable对象
            if (typeof returnVal !== 'undefined' && returnVal['then'] instanceof Function) {
              returnVal.then(res => {
                resFn(res)
              }, err => {
                rejFn(err)
              })
            } else {
              // 不是thenable的，直接丢给新对象resFn回调
              resFn(returnVal)
            };
          } catch (err) {
            // 代码错误处理
            rejFn(err)
            return
          }
        } else { // 传给下一个reject回调
          rejFn(reason)
        };
      };
      // 如果状态在promise的时候已经变成了success  直接执行then传入的回调函数
      if (this.status === 'success') {
        handle(...this.__succ_res)
      } else if (this.status === 'error') {
        errBack(...this.__err_res)
      } else {
        // 否则   进入then回调函数的队列   队列里面分两队  一个是成功回调 一个是失败回调
        this.__queue.push({resolve: handle, reject: errBack})
      };
    })
  }



  catch (errHandler) {
    return this.then(undefined, errHandler)
  }
  finally (finalHandler) {
    return this.then(finalHandler, finalHandler)
  }
};

// 实现all方法   传入的是一组的promise 返回一个新promise  必须所有的promise的状态都是resolve 新promise的状态才算resole
// 如果有一个是reject  新promise的状态就是reject

MyPromise.all = (arr) => {
  if (!Array.isArray(arr)) {
    throw new TypeError('参数应该是一个数组!')
  };
  // 返回一个新promise
  return new MyPromise(function (resolve, reject) {
    let i = 0, result = []
    // 定义一个next方法  设计模式里面的迭代器模式  相当于实现了for of循环
    next()
    function next () {
      // 如果不是MyPromise对象，需要转换
      // 这里用了一下 promise.resolve方法  Promise.resolve('foo');等价于 new Promise(resolve => resolve('foo'))  可以直接得到一个promise对象
      // arr[i]  数组里面的每一项都是一个promise实例   MyPromise.resolve(arr[i])  返回的就是arr[i]的实例  保存它的执行结果
      MyPromise.resolve(arr[i]).then(res => {
        // 这个res 是传入的arr[i]  执行的结果  把结果放到一个数组里面去
        result.push(res)
        i++
        if (i === arr.length) {
          // 遍历结束   把数组resolve出去   这样新promise的then就能获取到值
          resolve(result)
        } else {
          next()
        };
      }, reject)
    };

  })
}

// 实现race方法   只要传入的promise数组实例中有一个变了 新promise就会跟着变
// 感觉这个方法没什么用   可以用于多个请求只要有一个有返回值   就拿到结果  
MyPromise.race = arr => {
  if (!Array.isArray(arr)) {
    throw new TypeError('参数应该是一个数组!')
  };
  return new MyPromise((resolve, reject) => {
    let done = false
    arr.forEach(item => {
      // 如果不是MyPromise对象，需要转换
      MyPromise.resolve(item).then(res => {
        if (!done) {
          resolve(res)
          done = true
          // 在resolve后面执行的代码 说明状态已经变成了resolve
        };
      }, err => {
        if (!done) {
          reject(err)
          //  只要有一个变成了reject  也跟着变
          done = true
        };
      })
    })
  })
}

// 如果希望得到一个 Promise 对象，比较方便的方法就是直接调用Promise.resolve()方法。
MyPromise.resolve = (arg) => {
  if (typeof arg === 'undefined' || arg == null) { // 无参数/null
    return new MyPromise((resolve) => {
      resolve(arg)
    })
  } else if (arg instanceof MyPromise) {
    // 如果传入的参数  就是一个promise实例对象  就把它返回
    return arg
  } else if (arg['then'] instanceof Function) {
    // 如果then是个方法
    return new MyPromise((resolve, reject) => {
      arg.then((res) => {
        resolve(res)
      }, err => {
        reject(err)
      })
    })
  } else {
    return new MyPromise(resolve => {
      resolve(arg)
    })
  }
}

// reject方法同理上面的resolve
MyPromise.reject = (arg) => {
  return new MyPromise((resolve, reject) => {
    reject(arg)
  })
}
