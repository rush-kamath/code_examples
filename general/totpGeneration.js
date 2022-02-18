const otpauth = require('otpauth');
const QRCode = require('qrcode');
const fs = require('fs');
(async () => {
    // Create a new TOTP object.
    let issuer = 'CompanyName';
    let appNameAndEnv = 'TestAppDev';
    let totpSecret = '';

    let totp = new otpauth.TOTP({
        issuer: 'Company',
        label: appNameAndEnv,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: totpSecret
    });

    let uri = totp.toString();
    console.log(uri); //`otpauth://totp/${issuer}:${appNameAndEnv}?issuer=${issuer}&secret=${totpSecret}&digits=6&period=30`

    let qrString = await QRCode.toDataURL(uri);
    let base64Data = Buffer.from(qrString.replace(/^data:image\/\w+;base64,/, ""),'base64');
    fs.writeFileSync('qrCode.png', base64Data);
})();
