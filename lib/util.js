var path = require('path');
var gutil = require('gulp-util');
var colors = gutil.colors;

module.exports = {
    getCdnPath: function(file, options) {
        var cdnpath = path.relative(file.base, file.path);
        cdnpath = path.join(options.dest, cdnpath);
        if (cdnpath.indexOf('/') === 0) {
            cdnpath = cdnpath.substr(1);
        }
        return cdnpath;
    },

    logCheck: function(alreadyUploadNum, needUploadNum, errorCheckNum) {
        if (process.stdout.isTTY) {
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write('相同: ' + alreadyUploadNum + '\t\t' +
                                 '需要上传: ' + needUploadNum + '\t\t' +
                                 '错误:' + errorCheckNum);
         }
    },

    logCheckFail: function(file) {
        gutil.log(colors.red('检查对比'),
                  colors.red(file.sourcePath), '→', colors.red(file.cdnFullPath), '\n',
                  colors.red('失败原因：'), colors.red(file.checkFailMsg), '\n',
                  colors.red('返回信息：'), colors.red(file.checkFailRes));
    },

    logUploadSuccess: function(file) {
        gutil.log('上传七牛完毕', colors.green(file.sourcePath), '→', colors.green(file.cdnFullPath));
    },

    logUploadFail: function(file) {
        gutil.log(colors.red('上传七牛失败'),
                  colors.red(file.sourcePath), '→', colors.red(file.cdnFullPath), '\n',
                  colors.red('失败原因：'), colors.red(file.uploadFailMsg), '\n',
                  colors.red('返回信息：'), colors.red(file.uploadFailRes));
    },

    logAlreadyUpload: function(file) {
        gutil.log('七牛服务器已存在', colors.yellow(file.sourcePath), '→', colors.yellow(file.cdnFullPath));
    }
};
