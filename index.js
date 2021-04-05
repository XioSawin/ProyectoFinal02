const mongoose = require('mongoose');
const express = require('express');
const app = express();

const productoModel = require('./models/productos');

app.use(express.json());


/* ----------------------- ROUTES PRODUCTS ----------------------- */
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
    // /productos?price=true&pgt=10&plt=100
    const { price } = req.query;
    const { pgt } = req.query;
    const { plt } = req.query;

    if(price) {
        productoModel.find( {
            precio: {$gte: pgt, $lte: plt}
        } )
        .then((productos) => res.send(productos))
        .catch((err) => res.send(err))
    }

    // FILTER PRODUCTS BY STOCK RANGE
    // /productos?stock=true&sgt=10&slt=100
    const { stock } = req.query;
    const { sgt } = req.query;
    const { slt } = req.query;

    if(stock) {
        productoModel.find( {
            stock: {$gte: sgt, $lte: slt}
        } )
        .then((productos) => res.send(productos))
        .catch((err) => res.send(err))
    }

    productoModel.find( {} )
        .then((productos) => res.send(productos))
        .catch((err) => res.send(err))
})

    // UPDATE BY PRODUCT CODE
app.put('/productos/:codigo', (req, res) => {
    const { codigo } = req.params;
    const { precio } = req.body;

    productoModel.updateOne({codigo: codigo}, {
        $set: {precio: precio}
    })
        .then((updatedProduct) => res.send(updatedProduct))
        .catch((err) => res.send(err))
})

    //READ BY PRODUCT NAME
app.get('/productos/:nombre', (req, res) => {
    const { nombre } = req.params;

    productoModel.findOne( {nombre: nombre} )
        .then((producto) => res.send(producto))
        .catch((err) => res.send(err))
})

    //DELETE BY PRODUCT CODE
app.delete('/productos/:codigo', (req, res) => {
    const { codigo } = req.params;

    productoModel.deleteOne( {codigo: codigo} )
        .then(() => res.sendStatus(200))
        .catch((err) => res.send(err))
})


/* ----------------------- SERVER + DB CONNECTION ----------------------- */

app.listen(3040, () => {
    mongoose.connect('mongodb://localhost:27017/ecommerce', 
        {
            useNewUrlParser: true, 
            useUnifiedTopology: true
        }
    )
        .then( () => console.log('Base de datos conectada') )
        .catch( (err) => console.log(error) ); 
})
