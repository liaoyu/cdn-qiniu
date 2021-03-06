var through = require('through2');
var fs = require('vinyl-fs');
var Q = require('q');
var through2Concurrent = require('through2-concurrent');
var getEtag = require('./lib/etag');
var util = require('./lib/util');
var highWaterMark = 1024;
var Qiniu = require('qiniu');

module.exports = function(options, callback) {
    Qiniu.conf.ACCESS_KEY = options.accessKey;
    Qiniu.conf.SECRET_KEY = options.secretKey;

    var context = {
        needUploadNum: 0, // 需要上传数量
        alreadyUploadNum: 0, // 已上传，文件大小相同的数量
        modifyFilesNum: 0, // 已上传，文件大小不一致的数量
        errorCheckNum: 0, // 错误处理数量

        logCheckDefer: Q.defer(),
        logAlreadyUploadDefer: Q.defer(),
        uploadDefer: Q.defer(),
        logUploadFailDefer: Q.defer(),
        options: options,

        qiniuRs: new Qiniu.rs.Client(),
        qiniuIo: Qiniu.io,

        errors: []
    };

    return fs.src(options.src)
        .pipe(init(options)) // 初始化属性值

        .pipe(checkRemoteFile(context)) // 是否存在文件
        .pipe(checkRemoteFile(context)) // retry
        .pipe(checkRemoteFile(context)) // retry
        .on('end', function() {
            console.log();
            context.logCheckDefer.resolve();
        })
        .pipe(logCheckFailed(context))
        .on('end', function() {
            context.logAlreadyUploadDefer.resolve();
        })
        .on('end', function() {
            context.uploadDefer.resolve();
        })
        .pipe(uploadFile(context)) // 上传文件
        .pipe(uploadFile(context)) // retry
        .pipe(uploadFile(context)) // retry
        .on('end', function() {
            context.logUploadFailDefer.resolve();
        })
        .pipe(logUploadFail(context))
        .on('end', function() {
            if (callback) {
                callback(context.errors.join(','), context);
            }
        })
        // the end;
        .pipe(through.obj());
};

function init(options) {
    if (options.isLogAlreadyUpload === undefined) {
        options.isLogAlreadyUpload = true;
    }
    return through2Concurrent.obj({highWaterMark: highWaterMark}, function(file, encoding, next) {
        var cdnpath = util.getCdnPath(file, options);
        var domain = options.domain || '';
        var cdnFullPath = domain + '/' + cdnpath;

        // 获取文件的源路径
        var pathMap = options.pathMap;
        var sourcePath = file.path;
        if (pathMap && pathMap[sourcePath]) {
            sourcePath = pathMap[sourcePath];
        }

        file.checkTryCount = 0;
        file.uploadTryCount = 0;
        file.cdnPath = cdnpath;
        file.sourcePath = sourcePath;
        file.cdnFullPath = cdnFullPath;
        file.needCheck = file.stat.isFile();
        file.needUpload = false;
        file.needCompare = false;

        next(null, file);
    });
}

function checkRemoteFile(context) {
    return through2Concurrent.obj({highWaterMark: highWaterMark}, function(file, encoding, next) {
        if (file.needCheck) {
            context.qiniuRs.stat(context.options.bucket, file.cdnPath, function(rerr, result, res) {
                if (rerr) {
                    if (rerr.code === 612) { // 文件不存在或已删除
                        file.needCheck = false;
                        file.needUpload = true;
                        context.needUploadNum++;

                        // 重试错误计算
                        if (file.checkTryCount > 0) {
                            context.errorCheckNum--;
                        }
                    } else {
                        file.needCheck = true;
                        file.checkTryCount++;
                        file.checkFailMsg = rerr.code;
                        file.checkFailRes = JSON.stringify(rerr);
                    }

                    pass();
                } else {
                    getEtag(file.contents, function(hash) {
                        // 本地hash计算出错
                        if (!hash) {
                            file.needCheck = true;
                            file.checkTryCount++;
                            file.checkFailMsg = 'HASH出错';
                            file.checkFailRes = JSON.stringify({file: file.path});

                            if (file.checkTryCount > 0) {
                                context.errorCheckNum++;
                            }
                        }
                        // 对比本地hash与cdn上的hash值
                        else {
                            file.needCheck = false;
                            file.needUpload = false;
                            (result.hash == hash) ? context.alreadyUploadNum++ : context.modifyFilesNum++;

                            if (context.options.isLogAlreadyUpload) {
                                context.logAlreadyUploadDefer.promise.then(function() {
                                    util.logAlreadyUpload(file);
                                });
                            }

                            // 重试错误计算
                            if (file.checkTryCount > 0) {
                                context.errorCheckNum--;
                            }
                        }

                        pass();
                    });
                }
            })

            function pass() {
                next(null, file);
                util.logCheck(context.alreadyUploadNum + context.modifyFilesNum, context.needUploadNum, context.errorCheckNum);
            }
        } else {
            next(null, file);
        }
    });
}

function logCheckFailed(context) {
    return through2Concurrent.obj({highWaterMark: highWaterMark}, function(file, encoding, next) {
        if (file.needCheck) {
            context.logCheckDefer.promise.then(function() {
                util.logCheckFail(file);
                context.errors.push(file.checkFailRes);
            });
        }
        next(null, file);
    });
}

function uploadFile(context) {
    return through2Concurrent.obj({highWaterMark: highWaterMark}, function(file, encoding, next) {
        if (file.needUpload) {
            var token = (new Qiniu.rs.PutPolicy(context.options.bucket)).token();
            var extra = new Qiniu.io.PutExtra();
            extra.checkCrc = 1;

            context.qiniuIo.putFile(token, file.cdnPath, file.path, extra, function(error, result) {
                file.uploadSuccess = false;
                if (error) {
                    file.uploadFailMsg = '上传出错';
                    file.uploadFailRes = JSON.stringify(error);
                    file.uploadTryCount++;
                } else {
                    file.uploadSuccess = true;
                    file.needUpload = false;

                    context.uploadDefer.promise.then(function() {
                        util.logUploadSuccess(file);
                    });
                }

                next(null, file);
            });
        } else {
            next(null, file);
        }
    });
}

function logUploadFail(context) {
    return through2Concurrent.obj({highWaterMark: highWaterMark}, function(file, encoding, next) {
        if (file.needUpload) {
            context.logUploadFailDefer.promise.then(function() {
                util.logUploadFail(file);
                context.errors.push(file.uploadFailRes);
            });
        }
        next(null, file);
    });
}
