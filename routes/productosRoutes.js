// required
const mongoose = require('mongoose');
const express = require('express');
const app = express();

const productoModel = require('../models/producto.js');


// timestamp

function getTimestamp(){
    let date = new Date();

    let d = date.getDate();
    let mo = date.getMonth() + 1;
    let y = date.getFullYear();
    let h = date.getHours();
    let mi = date.getMinutes();
    let s = date.getSeconds();

    let today = d + '/' + mo + '/' + y + ' ' + h + ':' + mi + ':' + s;

    return today;
}


// Lista de productos
let productList = [];

// administrador
const administrador = true;

// routes

router.get('/listar/:id?', (req, res)=>{ // get info by id if given - listar productos
    const { id } = req.params;

    if(id){
        const producto = productList.find(producto => producto.id == id);

        idString = id.toString()

        knex.from('products').select('*').where('id', '=', idString)
            .then((rows)=>{
                for(row of rows) {
                    console.log(`${row['id']} - ${row['nombre']} - ${row['descripcion']} - ${row['precio']}`)
                }
            }).catch((err) => {console.log(err); throw err})

        if(!producto){ 
            res.json({error: 'producto no encontrado'});
        }

        res.json(producto);
    }

    knex.from('products').select('*')
            .then((rows)=>{
                for(row of rows) {
                    console.log(`${row['id']} - ${row['nombre']} - ${row['descripcion']} - ${row['precio']}`)
                }
            }).catch((err) => {console.log(err); throw err})
    
    res.json(productList);
})

router.post('/agregar', (req, res) => { // post new product

    if (!administrador){
        res.json({error: -1, descripcion: "ruta no autorizada"});
    }

    const {nombre, descripcion, codigo, foto, precio, stock} = req.body;

    let id = (productList.length)+1;
    let timestamp = getTimestamp();

    const producto = new Producto(id, nombre, descripcion, codigo, foto, precio, stock);
    producto.setTimestamp();
    console.log(producto);

    knex('products').insert(producto)
        .then(() => console.log('producto ingresado'))
        .catch((err) => {console.log(err); throw err})
    productList.push(producto);
    //console.log(productList);

    res.sendStatus(201);
})

router.patch('/actualizar/:id', (req, res) => { // actualizar producto x id

    if (!administrador){
        res.json({error: -1, descripcion: "ruta no autorizada"});
    }

    const { id } = req.params;

    idString = id.toString()

    const producto = productList.find(producto => producto.id == id);

    if(!productList){ 
        res.sendStatus(404);
    }

    const {nombre, descripcion, codigo, foto, precio, stock} = req.body;

    producto.update(nombre, descripcion, codigo, foto, precio, stock);

    knex.from('products').select('*').where('id', '=', idString).update({
        nombre: nombre,
        descripcion: descripcion,
        codigo: codigo,
        foto: foto,
        precio: precio,
        stock: stock
    })
            .then(()=> console.log('producto actualizado'))
            .catch((err) => {console.log(err); throw err})
    
    res.sendStatus(204);
})

router.delete('/borrar/:id', (req, res) => { // borrar producto x id

    if (!administrador){
        res.json({error: -1, descripcion: "ruta no autorizada"});
    }

    const { id } = req.params;

    idString = id.toString()

    const producto = productList.find(producto => producto.id == id);

    if(!producto){ 
        res.sendStatus(404);
    }

    productList = productList.filter((producto) => producto.id != id)

    knex.from('products').select('*').where('id', '=', idString).del()
            .then(()=> console.log('producto eliminado'))
            .catch((err) => {console.log(err); throw err})
})

module.exports = {
    router, 
    productList
}

