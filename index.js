const { Pool } = require('pg');
const poolConfig = {
    user: process.env.user,
    host: process.env.host,
    database: process.env.database,
    password: process.env.password,
    port: process.env.port
};

exports.handler = async(event, context) => {
    console.log("productabot init");
    console.log(event);
    if (event.body) {
        event.body = JSON.parse(event.body);
    }

    if (['TokenGeneration_Authentication', 'TokenGeneration_RefreshTokens'].includes(event.triggerSource)) {
        event.response = {
            "claimsOverrideDetails": {
                "claimsToAddOrOverride": {
                    "https://hasura.io/jwt/claims": JSON.stringify({
                        "x-hasura-allowed-roles": ["user", "admin"],
                        "x-hasura-default-role": "user",
                        "x-hasura-user-id": event.request.userAttributes.sub,
                        "x-hasura-role": "user"
                    })
                }
            }
        };
        return context.done(null, event);
    }
    else if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
        let pool = new Pool(poolConfig);
        let response = await pool.query('INSERT INTO users(id, email, username, user_type) VALUES($1, $2, $3, $4) RETURNING *', [event.request.userAttributes['sub'], event.request.userAttributes['email'], event.request.userAttributes['custom:username'], event.request.userAttributes['custom:userType']]);
        console.log(response);
        pool.end();
        return context.done(null, event);
    }
    else if (event.triggerSource === 'CustomMessage_SignUp') {
        event.response.emailSubject = `Confirm your registration, ${event.request.userAttributes['custom:username']}!`;
        event.response.emailMessage = `Hey!<p><a href="https://app.productabot.com/login?username=${event.userName}&code=${event.request.codeParameter}">Click this link to complete your registration.</a><p>Thanks,<br>productabot<div style="display:none"><a>${event.request.codeParameter}</a><a>${event.request.codeParameter}</a></div>`;
        return context.done(null, event);
    }
    else if (event.path === '/public/reset') {
        //reset password
        return { statusCode: 200, body: JSON.stringify('success'), headers: { 'Access-Control-Allow-Origin': '*' } };
    }
    else if (event.triggerSource === 'CustomMessage_ForgotPassword') {
        event.response.emailSubject = `Reset your password, ${event.request.userAttributes['custom:username']}!`;
        event.response.emailMessage = `Hey!<p><a href="https://productabot.com/reset?username=${event.userName}&code=${event.request.codeParameter}">Click this link to reset your password.</a><p>Thanks,<br>productabot<div style="display:none"><a>${event.request.codeParameter}</a><a>${event.request.codeParameter}</a></div>`;

        return context.done(null, event);
    }
    else if (event.path === '/test_send_email') {
        const AWS = require('aws-sdk');
        AWS.config.update({ region: 'us-east-1' });
        let response = await new AWS.SES().sendEmail({
            Destination: {
                ToAddresses: [
                    'chris@heythisischris.com',
                ]
            },
            Message: {
                Body: {
                    Html: {
                        Charset: "UTF-8",
                        Data: "HTML_FORMAT_BODY"
                    },
                    Text: {
                        Charset: "UTF-8",
                        Data: "TEXT_FORMAT_BODY"
                    }
                },
                Subject: {
                    Charset: 'UTF-8',
                    Data: 'Test email'
                }
            },
            Source: 'noreply@productabot.com',
            ReplyToAddresses: ['noreply@productabot.com', ],
        }).promise();
        console.log(response);
    }
    else if (event.path === '/public/submitTimesheet') {
        const { submitTimesheet } = require('./submitTimesheet.js');
        return await submitTimesheet(event);
    }
};
