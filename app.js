/* ----------------------- IMPORTS ----------------------- */
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const handlebars = require('express-handlebars');
const MongoStore = require('connect-mongo');
const cluster = require('cluster');
const compression = require('compression');
const log4js = require('log4js');
const nodemailer = require('nodemailer');

const app = express();
app.use(compression());


/* ----------------------- CONSTANTS ----------------------- */
const portCL = 5504;
const FACEBOOK_APP_ID = '000000000000'; 
const FACEBOOK_APP_SECRET = 'aaaaaaaaaaaa'; // 
const modoCluster = 'CLUSTER';


/* ----------------------- EMAIL & SMS CONFIG ----------------------- */
// ethereal
let enviarEthereal = require('./email/ethereal');
// twilio
let enviarSMS = require('./sms/twilio');

/* -------------- PASSPORT w FACEBOOK & LOCAL STRATEGY-------------- */
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;

const bCrypt = require('bCrypt');
const LocalStrategy = require('passport-local').Strategy;

/* ----------------------------------------------------------------- */

/* MASTER */
if(modoCluster && cluster.isMaster) {
    // if Master, crea workers

    loggerInfo.info(`Master ${process.pid} is running`);

    // fork workers
    for (let i=0; i<numCPUs; i++){
        cluster.fork();
    };

    cluster.on('exit', (worker) => {
        loggerInfo.info(`Worker ${worker.process.pid} died`);
    });
} else {

    /* ----------------------- CONFIGURATION - MIDDLEWARES ----------------------- */

    app.use(express.json());
    app.use(express.urlencoded({extended:true}));
    app.use(express.static('public'));
    app.use(passport.initialize());
    app.use(passport.session());

    app.use(cookieParser());
    app.use(session({
        store: MongoStore.create({
            mongoUrl: 'mongodb+srv://XiomaraS:UZosgIq3UUSc8add@coderhouse.j2t64.mongodb.net/myFirstDatabase?retryWrites=true&w=majority',
            ttl: 600
        }),
        secret: 'secret',
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
            maxAge: 60000
        }
    }));


    app.engine(
        "hbs", 
        handlebars({
            extname: ".hbs",
            defaultLayout: 'index.hbs',
        })
    );

    /* ----------------------- SERIALIZE & DESERIALIZE ----------------------- */
    passport.serializeUser(function(user, cb) {
        cb(null, user);
    });

    passport.deserializeUser(function(obj, cb) {
        cb(null, obj);
    });


    /* ----------------------- REGISTRATION ----------------------- */

    /* -------------- local strategy -------------- */
    passport.use('register', new LocalStrategy({
        passReqToCallback: true
        },
        function(req, username, password, name, address, phone_number, avatar, age, done) {
            const findOrCreateUser = function(){
                User.findOne({'username':username}, function(err, user){
                    if(err){
                        console.log(`Error en el registro: "${err}"`);
                        return done(err);
                    }
                    // si user ya existe
                    if (user) {
                        console.log('Usuario ya existe');
                        console.log('message', 'Usuario ya existe en la base');
                        return done(null, false);
                    } else {
                        // si no existe, crear el usuario
                        var newUser = new User();

                        newUser.username = username;
                        newUser.password = createHash(password);
                        newUser.name = name;
                        newUser.address = address;
                        newUser.phone_number = phone_number;
                        newUser.avatar = avatar;
                        newUser.age = age;

                        newUser.save(function(err) {
                            if(err) {
                                console.log(`Error guardando el usuario: "${err}"`);
                                throw err;
                            }
                            console.log('Usuario registrado con exito');
                            return done(null, newUser);
                        });
                    }
                });
            }
            process.nextTick(findOrCreateUser);
        })
    )

    /* -------------- hash password -------------- */

    const createHash = function(password) {
        return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
    }

    /* ----------------------- LOGIN ----------------------- */

    app.get('/login', (req, res)=>{
        if(req.isAuthenticated()){
            res.render("welcome", {
                nombre: req.user.displayName,
                foto: req.user.photos[0].value,
                email: req.user.emails[0].value,
                contador: req.user.contador
            })
        }
        else {
            res.sendFile(process.cwd() + '/public/login.html')
        }
    })

    /* ----------------------- SERVER + DB CONNECTION ----------------------- */
    app.listen( process.env.PORT|| portCL, ()=>{
        loggerInfo.info(`Running on PORT ${portCL} - PID WORKER ${process.pid}`);
        
    })

}


