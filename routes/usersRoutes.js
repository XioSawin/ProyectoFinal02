const express = require('express');
const app = express();

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const router = express.Router();

const usersController = require('../controllers/usersControllers');

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
        usersController.registerUser(req, username, password, done)
    )
);

/* -------------- routes -------------- */

router.get('/register', usersController.RegisterOk);

router.post('/register', passport.authenticate('register', {failureRedirect: '/failregister'}), usersController.Redirect);

router.get('/failregister', usersController.RegisterFail);

/* ----------------------- LOGIN ----------------------- */

/* -------------- local strategy -------------- */

passport.use('login', new LocalStrategy({
        passReqToCallback: true
    },
        usersController.loginUser(req, username, password, done)
    )
);
    
/* -------------- routes -------------- */

router.get('/login', usersController.LoginOk);

router.post('/login', passport.authenticate('login', { failureRedirect: '/faillogin'}), usersController.Redirect);

router.get('/faillogin', usersController.LoginFail);

router.get('/logout', usersController.Logout);

module.exports = router;

