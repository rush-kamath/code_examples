const _ = require('lodash');
global.fetch = require("node-fetch");
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const AWS = require('aws-sdk');
AWS.config.update({
    region: "",
    accessKeyId: "",
    secretAccessKey: ""
});

const cognito = new AWS.CognitoIdentityServiceProvider();

let appConfig = {
    userPoolId: '',
    clientAppId: ''
};

// For user pool with required MFA
// during sign up
// 1. signUp user
// 2. confirm user with code

// To associate MFA
// 1. setup user mfa using accessToken parameter
// 2. generate QR code and capture in google authenticator or similar
// 3. verify the generated otp token and set user's preference
//
// during sign in
// 1. get user name, pwd, otp token and verify the code. otp token is optional
//

let user = {userName: '', email: '', password: ''};

function getUserPool() {
    let userPool = new AmazonCognitoIdentity.CognitoUserPool({
        UserPoolId: appConfig.userPoolId,
        ClientId: appConfig.clientAppId,
    });
    return userPool;
}
let createCognitoAttribute = (key, value) => {
    return new AmazonCognitoIdentity.CognitoUserAttribute({
        Name: key,
        Value: value,
    });
};

function signUp(user, callback) {
    let attributeList = [];
    attributeList.push(createCognitoAttribute('name', user.userName));
    attributeList.push(createCognitoAttribute('email', user.email));
    try {
        getUserPool().signUp(_.toLower(user.email), user.password, attributeList, null, function(err, result) {
            if (err) {
                console.log('Error occurred', err);
                return callback(null, { success: false, message: err.message, errorCode: err.name });
            }
            return callback(null, { success: true, data: result.user.username });
        });
    } catch (err) {
        console.log('Error occurred', err);
        return callback(null, { success: false, message: err.message, errorCode: err.name });
    }
}

// signUp(user, (err, data) => {
//     console.log(data);
// });

function getCognitoUser(app, email) {
    return new AmazonCognitoIdentity.CognitoUser({
        Username: _.toLower(email),
        Pool: getUserPool(app),
    });
}

function confirmSignup(callback) {
    let cognitoUser = getCognitoUser('default', user.email);
    cognitoUser.confirmRegistration('<registrationCode>', true, function(err, result) {
        if (err) {
            return callback(null, { success: false, message: err.message, errorCode: err.name });
        }
        return callback(null, { success: true, data: user.email });
    });
}

// confirmSignup((err, data) => {
//     console.log(data);
// });

function resendSignupConfirmCode(callback) {
    let cognitoUser = getCognitoUser('default', user.email);
    cognitoUser.resendConfirmationCode(function(err, result) {
        if (err) {
            return callback(null, { success: false, message: err.message, errorCode: err.name });
        }
        return callback(null, { success: true, data: user.email });
    });
}

// resendSignupConfirmCode((err, data) => {
//     console.log(data);
// });



let getAuthenticationDetails = (user) => {
    return new AmazonCognitoIdentity.AuthenticationDetails({
        Username: _.toLower(user.email),
        Password: user.password,
    });
};

async function setSmsMfa(appType, user) {
    let data = await cognito.adminUpdateUserAttributes({
        UserAttributes: [{Name: 'phone_number', Value: ''}, {Name: 'phone_number_verified', Value: "true"}],
        UserPoolId: appConfig.userPoolId,
        Username: user.email,
    }).promise();
    console.log(data);

    data = await cognito.adminSetUserMFAPreference({
        UserPoolId: appConfig.userPoolId,
        Username: user.email,
        SMSMfaSettings: {
            Enabled: true ,
            PreferredMfa: true
        }
    }).promise();
    console.log(data);
    // return data;
}

// setSmsMfa('appType', user)
//     .then(data => {
//         console.log(data);
//     })
//     .catch(err => {console.log(err)});

async function resetSMSMfa(appType, user) {
    let data = await cognito.adminSetUserMFAPreference({
        UserPoolId: appConfig.userPoolId,
        Username: user.email,
        SMSMfaSettings: {
            Enabled: false ,
            PreferredMfa: false
        }
    }).promise();

    return data;
}

// resetSMSMfa('appType', user);

async function setSoftwareMfa(appType, user) {
    let data = await cognito.adminInitiateAuth({
        AuthFlow: 'ADMIN_NO_SRP_AUTH',
        ClientId: appConfig.clientAppId,
        UserPoolId: appConfig.userPoolId,
        AuthParameters: {
            'USERNAME': user.email,
            'PASSWORD': user.password,
            // 'PASSWORD': 'Invalid',
        },
    }).promise();

    console.log(data);
    console.log(_.get(data, 'AuthenticationResult.AccessToken'));

    let tokenData = await cognito.associateSoftwareToken({
        AccessToken: _.get(data, 'AuthenticationResult.AccessToken'),
    }).promise();
    console.log(tokenData);
    return {secretCode: tokenData.SecretCode, session: data.Session, AccessToken: _.get(data, 'AuthenticationResult.AccessToken')};
}

// setSoftwareMfa('default', user)
//     .then(data => {
//         console.log(data);
//     }).catch(err => {
//         console.log(err);
// }) ;

async function verifyOtpToken(code, session, accessToken) {
    let data = await cognito.verifySoftwareToken({
        UserCode: code,
        Session: session,
        AccessToken: accessToken,
    }).promise();
console.log(data);

data = await cognito.adminSetUserMFAPreference({
    UserPoolId: appConfig.userPoolId,
    Username: user.email,
    SoftwareTokenMfaSettings: {
        Enabled: true ,
        PreferredMfa: true
    }
}).promise();
    return data;
}

// verifyOtpToken('', null, '')
//     .then(data => {
//         console.log(data);
//     });

async function resetSoftwareMfa(appType, user) {
    let data = await cognito.adminInitiateAuth({
        AuthFlow: 'ADMIN_NO_SRP_AUTH',
        ClientId: appConfig.clientAppId,
        UserPoolId: appConfig.userPoolId,
        AuthParameters: {
            'USERNAME': user.email,
            'PASSWORD': user.password,
        },
    }).promise(); // not required but done to verify password
    console.log(data);

    data = await cognito.adminSetUserMFAPreference({
        UserPoolId: appConfig.userPoolId,
        Username: user.email,
        SoftwareTokenMfaSettings: {
            Enabled: false ,
            PreferredMfa: false
        }
    }).promise();

    return data;
}

resetSoftwareMfa('app', user)
    .then(data => {
        console.log(data);
    });


async function changeSoftwareMfa(appType, user) {
    let data = await resetSoftwareMfa(appType, user);
    console.log(data);
    data = await setSoftwareMfa(appType, user);
    console.log(data);
}

// changeSoftwareMfa('appType', user);

async function setMfaPreference() {
    let data = await cognito.adminSetUserMFAPreference({
        UserPoolId: appConfig.userPoolId,
        Username: user.email,
        SoftwareTokenMfaSettings: {
            Enabled: true ,
            PreferredMfa: true
        }
    }).promise();
    console.log(data);
}

// setMfaPreference().then(data => {data});

async function do2StepAuthAdmin(appType, user) {
    let data = await cognito.adminInitiateAuth({
        AuthFlow: 'ADMIN_NO_SRP_AUTH',
        ClientId: appConfig.clientAppId,
        UserPoolId: appConfig.userPoolId,
        AuthParameters: {
            'USERNAME': user.email,
            'PASSWORD': user.password,
        },
    }).promise();

    console.log(data);

    data = await cognito.adminRespondToAuthChallenge({
        ChallengeName: "SOFTWARE_TOKEN_MFA",
        ClientId: appConfig.clientAppId,
        UserPoolId: appConfig.userPoolId,
        ChallengeResponses: {
            "USERNAME": '',
            "SOFTWARE_TOKEN_MFA_CODE": '',
        },
        Session: data.Session,
    }).promise();
    console.log(data);
}

async function do2StepAuth(appType, user, verificationCode) {
    let cognitoUser = getCognitoUser('default', user.email);
    let authenticationDetails = getAuthenticationDetails(user);

    return new Promise((resolve, reject) => {
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function(result) {
                console.log('Successfully authenticated', JSON.stringify(result));
                let {idToken, refreshToken, accessToken} = result;
                let {jwtToken, payload} = idToken;

                let response = {
                    user: {
                        emailAddress: payload.email,
                        userName: payload.name,
                    },
                    id_token: jwtToken,
                    refresh_token: refreshToken.token,
                };
                resolve({ success: true, data: response });
            },
            onFailure: function(err) {
                console.log('Auth Failure', err);
                reject({ success: false, message: err.message, errorCode: err.name });
            },
            mfaRequired: function(data, param2) {
              console.log('mfa required', data, param2);
            // cognitoUser.sendMFACode(mfaCode, this)
            },
            associateSecretCode: function(data, param2) {
              console.log('associateSecretCode: ', data, param2);
            },
            totpRequired: function(mfaType) {
                cognitoUser.sendMFACode(verificationCode, this, mfaType);
            },
        });
    });
}

// do2StepAuth('appType', user, )
//     .then(data => {console.log(data)});


