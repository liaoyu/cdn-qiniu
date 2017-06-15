cdn-qiniu
=========

七牛cdn上传模块


Usage
======

First, install cdn-qiniu as a development dependency:

  npm install cdn-qiniu --save

Then

  var qnUpload = require('cdn-qiniu');

  qnUpload({
      accessKey: 'xxxxxxx',
      secretKey: 'xxxx',
      bucket: "xxxx",
      domain: '',  // 该 bucket 对应的域名，可不填
      src: 'dir/**',
      dest: 'key/',
      pathMap: {  // 上传路径与实际文件路径的映射
        '/Users/tmp/2017/2390392039.png': '/Users/name/test.png'
      }
  });
