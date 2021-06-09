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
require('dotenv').config();

/* -------------- file imports -------------- */

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

/* ----------------------- EMAIL & SMS CONFIG ----------------------- */

/* --------- email & sms config --------- */
// ethereal
// let ethereal = require('./email/ethereal');

const adminEmail = 'clovis.kris@ethereal.email';

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'clovis.kris@ethereal.email',
        pass: 'XV2WSN8xc6KzP7bXnF'
    }
});

const enviarEthereal = (adminEmail, asunto, mensaje) => {
    const mailOptions ={
        from: 'Servidor Node.js',
        to: adminEmail,
        subject: asunto,
        html: mensaje
    }

    transporter.sendMail(mailOptions, (err, info) => {
        if(err) {
            loggerError.info(err);
        }
    })
}



// twilio
// let twilio = require('./sms/twilio');

const accountSid = 'AC5a54161b248c473a42eca18650a4cd96';
const authToken = process.env.TWILIO_TOKEN;

const adminNumber = process.env.WHATSAPP_NUMBER;

const twilio = require('twilio');

const client = twilio(accountSid, authToken);

const enviarSMS = (userNumber, mensaje) => { 
    let rta = client.messages.create({
            body: mensaje, 
            from: '+12566009360',
            to: userNumber
    })
    return rta;   
}

const enviarWhatsApp = (adminNumber, mensaje) => { 
    let rta = client.messages.create({
            body: mensaje, 
            from: 'whatsapp:+14155238886',
            to: adminNumber
    })
    return rta;   
}

/* ----------------------- CONSTANTS ----------------------- */
const portCL = 3304;
//const FACEBOOK_APP_ID = '494152521729245'; 
//const FACEBOOK_APP_SECRET = '0054580944040256224462c493ac1ffb'; // 
const numCPUs = require('os').cpus().length;
const modoCluster = process.argv[2] == 'CLUSTER';
const app = express();
app.use(compression());


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
    
    app.use(cookieParser());
    app.use(session({
        store: MongoStore.create({
            mongoUrl: process.env.DB_SESSIONS_CONN,
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

    app.set("view engine", "hbs");
    app.set("views", "./views");

    app.use(express.static('public'));
    app.use(passport.initialize());
    app.use(passport.session());

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
        function(req, username, password, done) {
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
                        const {name, address, age, phone_number, avatar} = req.body;
                        const user = {
                            username,
                            password: createHash(password),
                            name, 
                            address,
                            age,
                            phoneNumber: phone_number,
                            avatar
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
        })
    )

    /* -------------- hash password -------------- */

    const createHash = function(password) {
        return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
    }

    /* -------------- routes -------------- */

    app.get('/register', (req, res) => {
        res.sendFile(process.cwd() + '/public/register.html');
    })

    app.post('/register', passport.authenticate('register', {failureRedirect: '/failregister'}), (req, res) => {
        res.redirect('/');
    })

    app.get('/failregister', (req, res) => {
        res.render('register-error', {});
    })

    /* ----------------------- LOGIN ----------------------- */

    /* -------------- local strategy -------------- */

    passport.use('login', new LocalStrategy({
        passReqToCallback: true
    },
        function(req, username, password, done) {
            // ver en db si existe el username
            userModel.findOne({ 'username' : username },
                function(err, user) {
                    // If there is an error
                    if(err) {
                        return done(err);
                    }
                    // If username does not exist on db
                    if(!user) {
                        loggerError.info(`Usuario "${username}" no encontrado`);
                        loggerError.info('message', 'Usuario no encontrado');
                        return done(null, false);
                    }
                    // User exists but wrong pwrd
                    if(!isValidPassword(user, password)) {
                        loggerError.info('Contrasena no valida');
                        loggerError.info('message', 'Invalid Password');
                        return done(null, false);
                    }
                    // si alles is goed
                    return done(null, user);
                }
            );
        })
    );

    /* -------------- check valid password -------------- */
    const isValidPassword = function(user, password){
        return bCrypt.compareSync(password, user.password);
    } 
    
    /* -------------- routes -------------- */

    app.get('/login', (req, res)=>{
        if(req.isAuthenticated()){
            res.render("welcome", {
                email: req.user.username,
                name: req.user.name,
                address: req.user.address,
                phoneNumber: req.user.phoneNumber,
                age: req.user.age
            })
        }
        else {
            res.sendFile(process.cwd() + '/public/login.html')
        }
    })

    app.post('/login', passport.authenticate('login', { failureRedirect: '/faillogin'}), (req, res) => {
        res.redirect('/')
    })

    app.get('/faillogin', (req, res) => {
        res.render('login-error', {});
    })

    app.get('/logout', (req, res)=>{
        let nombre = req.user.name;

        req.logout();
        res.render("logout", { nombre });
        
    });

    /* ----------------------- PEDIDOS ----------------------- */

    app.post('/order', (req, res) => {
        const {order} = req.body;

        let nombre = req.user.name;
        let email = req.user.username;
        let phoneNumber = req.user.phoneNumber;

        let date = new Date().toLocaleString();

        let asunto = `Nuevo pedido de ${nombre}: ${email}`;
        let mensaje = `Pedido: ${order}`;

        let bodyWhatsApp = `Nuevo pedido de ${nombre}: ${email}. Pedido: ${order}.`


        // ethereal 
        enviarEthereal(adminEmail, asunto, mensaje);

        // whatsapp al admin
        enviarWhatsApp(adminNumber, bodyWhatsApp);

        // text al user
        enviarSMS(phoneNumber.toString(), 'Pedido recibido y en proceso');

        res.redirect('/');
                
    })

    /* ----------------------- SERVER + DB CONNECTION ----------------------- */
    app.listen( process.env.PORT|| portCL, ()=>{
        mongoose.connect(process.env.DB_CONN, 
            {
                useNewUrlParser: true, 
                useUnifiedTopology: true
            }
        )
            .then( () => loggerInfo.info('Base de datos conectada') )
            .catch( (err) => loggerError.info(err) );
        loggerInfo.info(`Running on PORT ${portCL} - PID WORKER ${process.pid}`);
        
    })

}


/* ----------------------- COMMMENTED ----------------------- */

/*

const productoModel = require('./models/producto');

----------------------- ROUTES PRODUCTS ----------------------- 
//CREATE PRODUCT
app.post('/productos', (req, res) => {
    const producto = req.body;
    
    const productSaved = new productoModel(producto);
    productSaved.save()
        .then( () => res.sendStatus(201) )
        .catch( (err) => res.send(err))
})
    
//READ ALL PRODUCTS
app.get('/productos', (req, res) => {

    // FILTER PRODUCTS BY PRICE RANGE
    const { preciogt } = req.query;
    const { preciolt } = req.query;

    // FILTER PRODUCTS BY STOCK RANGE
    const { stockgt } = req.query;
    const { stocklt } = req.query;

    productSaved.find( {} )
        .then((productos) => res.send(productos))
        .catch((err) => res.send(err))
})

// UPDATE BY PRODUCT CODE
app.put('/productos/:codigo', (req, res) => {
    const { codigo } = req.params;
    const { precio } = req.body;

    productSaved.updateOne({codigo: codigo}, {
        $set: {precio: precio}
    })
        .then((updatedProduct) => res.send(updatedProduct))
        .catch((err) => res.send(err))
})

//READ BY PRODUCT CODE
app.get('/productos/:codigo', (req, res) => {
    const { codigo } = req.params;

    userModel.findOne( {codigo: codigo} )
        .then((producto) => res.send(producto))
        .catch((err) => res.send(err))
})

//READ BY PRODUCT NAME
app.get('/productos/:nombre', (req, res) => {
    const { nombre } = req.params;

    userModel.findOne( {nombre: nombre} )
        .then((producto) => res.send(producto))
        .catch((err) => res.send(err))
})

//DELETE BY PRODUCT CODE
app.delete('/productos/:codigo', (req, res) => {
    const { codigo } = req.params;

    userModel.deleteOne( {codigo: codigo} )
        .then(() => res.sendStatus(200))
        .catch((err) => res.send(err))
})


 ----------------------- MIDDLEWARE ----------------------
//app.use(express.static(path.join(__dirname + "public")));
//app.use('/productos', productos.router);
//app.use('/carrito', require("./routes/carritoRoutes"));

*/