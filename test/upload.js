var upyun_cdn = require('../');
var should = require('should');
var path = require('path');

var src = path.join(__dirname, 'a.txt');
var dest = '/' + Date.now() + '/';
var options = {
    src: src,
    dest: desc,
    bucket: 'qiniu-sdk-test',
    accessKey: '5UyUq-l6jsWqZMU6tuQ85Msehrs3Dr58G-mCZ9rE',
    secretKey: 'YaRsPKiYm4nGUt8mdz2QxeV5Q_yaUzVxagRuWTfM'
};

describe('TEST QINIU CDN UPLOAD: ', function() {

    describe('upload file', function() {
        it('upload one file', function(done) {
            upyun_cdn(options, function(err, result) {
                err.should.be.exactly('');
                result.needUploadNum.should.be.exactly(1);
                done();
            });
        });
    });

    describe('already upload check', function() {
        it('already has one file upload', function(done) {
            upyun_cdn(options, function(err, result) {
                err.should.be.exactly('');
                result.alreadyUploadNum.should.be.exactly(1);
                done();
            });
        });
    });
});
