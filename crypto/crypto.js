const {randomBytes} = require('crypto');
let sessionId = randomBytes(32).toString('hex');
console.log(sessionId);

let lastLoginDate = Date.now();
console.log(lastLoginDate);

let keys = _.map(Array.from(Array(25).keys()), power => {
    const re = new RegExp('.{1,' + (power + 1) + '}', 'g');
    let splits = sessionId.match(re);
    splits.push(`${lastLoginDate << 2**power}`);
    let str = splits.sort().join('-');
    return sha1(str);
});

console.log(keys);
const crypto = require("crypto");

class Encrypter {
    constructor(encryptionKey, salt) {
        this.algorithm = "aes-192-cbc";
        this.key = crypto.scryptSync(encryptionKey, salt, 24);
    }

    encrypt(clearText) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        const encrypted = cipher.update(clearText, "utf8", "hex");
        return [
            encrypted + cipher.final("hex"),
            Buffer.from(iv).toString("hex"),
        ].join("|");
    }

    dencrypt(encryptedText) {
        const [encrypted, iv] = encryptedText.split("|");
        if (!iv) throw new Error("IV not found");
        const decipher = crypto.createDecipheriv(
            this.algorithm,
            this.key,
            Buffer.from(iv, "hex")
        );
        return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
    }
}

_.forEach(keys, key => {
    const encrypter = new Encrypter(key, lastLoginDate.toString());
    const clearText = `${sessionId}_rashmi.sandeep@frontm.com_${ Date.now()}`;
    const encrypted = encrypter.encrypt(clearText);
    const decrypted = encrypter.dencrypt(encrypted);

    console.log(encrypted, decrypted);

    const bytes = Buffer.byteLength(encrypted, "utf-8");
    console.log(bytes);

    // const clearText = `${sessionId}_rashmi.sandeep@frontm.com`;
    // let c = crypto.createHmac('md5', key).update(clearText).digest('hex');
    // console.log(c, Buffer.byteLength(c, "utf-8"));
    //
    // let c1 = crypto.createHmac('sha512', key).update(clearText).digest('hex');
    // console.log(c1, Buffer.byteLength(c1, "utf-8"));


    // const hash = crypto.pbkdf2Sync(clearText, key, 100, 64, 'sha256');
    // console.log(hash.toString('hex'));  // '3745e48...08d59ae'
    //
    // const hash1 = crypto.pbkdf2Sync(clearText, key, 100, 64, 'sha256');
    // console.log(hash1.toString('hex'));  // '3745e48...08d59ae'
});