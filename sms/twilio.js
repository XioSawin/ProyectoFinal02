const accountSid = 'AC5a54161b248c473a42eca18650a4cd96';
const authToken = 'ffffffffffffffffffffffffffff';

const twilio = require('twilio');

const client = twilio(accountSid, authToken);

const enviarSMS = (mensaje) => { 
    let rta = client.messages.create({
            body: mensaje, 
            from: '+12566009360',
            to: '+54444444444444'
    })
    return rta;   
}

module.exports = enviarSMS();
