qiniu_cdn
=========

七牛cdn上传模块


Usage
======

First, install qiniu_cdn as a development dependency:

	npm install qiniu_cdn --save

Then

	var qiniuUpload = require('./qiniu_cdn');

	qiniuUpload({
	    src: 'dir/**',
    	dest: 'key/',
      pathMap: {  // 上传路径与实际文件路径的映射
        '/Users/tmp/2017/2390392039.png': '/Users/name/test.png'
      }
	},{
    	accessKey: 'xxxxxxx',
	    secretKey: 'xxxx',
    	bucket: "xxxx",
      domain: ''  // 该 bucket 对应的域名，可不填
	});
