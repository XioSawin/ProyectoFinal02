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
const FACEBOOK_APP_ID = '494152521729245'; 
const FACEBOOK_APP_SECRET = '0054580944040256224462c493ac1ffb'; // 
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
app.use(express.json());
app.use(express.urlencoded({extended:true}));
//app.use(express.static(path.join(__dirname + "public")));
//app.use('/productos', productos.router);
//app.use('/carrito', require("./routes/carritoRoutes"));

*/