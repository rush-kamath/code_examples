const AWS = require('aws-sdk');
const fs = require('fs');
const Axios = require('axios');

let userSession = {
    "accessKeyId": "",
    "identityId": "",
    "secretAccessKey": "",
    "sessionToken": ""
};
const s3 = new AWS.S3({
    endpoint: 's3.amazonaws.com',
    region: "",
    accessKeyId: userSession.accessKeyId,
    secretAccessKey: userSession.secretAccessKey,
    sessionToken: userSession.sessionToken,
});
//
(async () => {
    let params = { Bucket: 'S3_BUCKET', Key: 'path to S3 file',};
    let headers = await s3.headObject(params).promise(); // this is just to check that the file exists

    params.Expires = 5 * 60; // 5 min expiry
    let signedUrl = s3.getSignedUrl('getObject', params);
    console.log('this is the url::::', signedUrl, 'after the url');

    console.log(headers);

    const response = await Axios({
        method: 'GET',
        url: signedUrl,
        responseType: 'stream'
    });
    response.data.pipe(fs.createWriteStream('test1.mp4'));
})();
