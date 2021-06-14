const express = require('express');
const app = express();

const passport = require('passport');
const bCrypt = require('bCrypt');
const LocalStrategy = require('passport-local').Strategy;

const fs = require('fs');
const path = require ('path');

app.engine(
    "hbs", 
    handlebars({
        extname: ".hbs",
        defaultLayout: 'index.hbs',
    })
);

app.set("view engine", "hbs");
app.set("views", "./views");

app.use(express.static('public'));
app.use(passport.initialize());
app.use(passport.session());

const userModel = require('./models/user');

/* ----------------------- LOGGERS ----------------------- */
log4js.configure({
    appenders: {
        miLoggerConsole: {type: "console"},
        miLoggerFileWarning: {type: 'file', filename: 'warn.log'},
        miLoggerFileError: {type: 'file', filename: 'error.log'}
    },
    categories: {
        default: {appenders: ["miLoggerConsole"], level:"trace"},
        info: {appenders: ["miLoggerConsole"], level: "info"},
        warn: {appenders:["miLoggerFileWarning"], level: "warn"},
        error: {appenders: ["miLoggerFileError"], level: "error"}
    }
});

const loggerInfo = log4js.getLogger('info');
const loggerWarn = log4js.getLogger('warn');
const loggerError = log4js.getLogger('error');

/* -------------- upload files -------------- */

const multer = require('multer');

let storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});

let upload = multer ({storage: storage});


/* ----------------------- REGISTRATION ----------------------- */
const registerUser = (req, username, password, done) => {
    const findOrCreateUser = function(){
        userModel.findOne({'username':username}, function(err, user){
            if(err){
                loggerError.info(`Error en el registro: "${err}"`);
                return done(err);
            }
            // si user ya existe
            if (user) {
                loggerInfo.info('Usuario ya existe');
                loggerInfo.info('message', 'Usuario ya existe en la base');
                return done(null, false);
            } else {
                // si no existe, crear el usuario
                const {name, address, age, phoneNumber} = req.body;

                const phoneInputField = phoneNumber;
                const phoneInput = window.intlTelInpute(phoneInputField, {
                    utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
                });
                const intPhoneNumber = phoneInput.getNumber();


                const user = {
                    username,
                    password: createHash(password),
                    name, 
                    address,
                    age,
                    phoneNumber: intPhoneNumber,
                    avatar: {
                        data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
                        contentType: 'image/png'
                    }
                }
                const newUser = new userModel(user);
                newUser.save(function(err) {
                    if(err) {
                        loggerError.info(`Error guardando el usuario: "${err}"`);
                        throw err;
                    }
                    loggerInfo.info('Usuario registrado con exito');
                    return done(null, newUser);
                });
                
                enviarEthereal(adminEmail, "Nuevo Registro", JSON.stringify(newUser));
            }
        });
    }
    process.nextTick(findOrCreateUser);
}

/* -------------- hash password -------------- */

const createHash = function(password) {
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
}

/* -------------- routes -------------- */

const RegisterOk = (req, res) => {
    res.sendFile(process.cwd() + '/public/register.html');
}; 

const RegisterFail = (req, res) => {
    res.render('register-error', {});
}

const Redirect = (req, res) => {
    res.redirect('/');
}

module.exports = {
    registerUser,
    RegisterOk,
    RegisterFail,
    Redirect
};