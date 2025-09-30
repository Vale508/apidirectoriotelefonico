const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const app = express();
const session = require('express-session');
const path = require('path');
const cors = require('cors');

app.use(cors({
    origin: 'https://directoriotelefonico.vercel.app',
    credentials: true
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'clave-ultra-secretaa',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: true,
    sameSite: 'none'
  }
}));

//Configuracion base de datos
const db = {
  host: 'mysql-valerin.alwaysdata.net',
  user: 'valerin_bonilla',
  password: 'Valerin1229*.',
  database: 'valerin_directorio'
};
const handleDbError = (error, res) => {
  console.error('Error de base de datos:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
};
//api registrar
app.post('/api/registro', async (req, res) => {
  const { nombre, correo, contrasena } = req.body;
  console.log(nombre, correo, contrasena)
  if (!nombre || !correo || !contrasena) {
    return res.status(400).json({ success: false, message: 'Datos incompletos' });
  }
  let connection;
  try {
    connection = await mysql.createConnection(db);
    const [rows] = await connection.execute(
      'SELECT * FROM usuarios WHERE Correo = ? AND Contraseña = ?',
      [correo, contrasena]
    );
    if (rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Usuario ya existe' });
    }
    await connection.execute(
      `INSERT INTO usuarios (Nombre, Correo, Contraseña) VALUES (?, ?, ?)`,
      [nombre, correo, contrasena]
    );
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: { nombre, correo, contrasena }
    });
  }
  catch (error) {
    handleDbError(error, res);
  } finally {
    if (connection) await connection.end();
  }
})

//api iniciar sesion
app.post('/api/inisesion', async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json({ success: false, message: 'Correo y Contraseña son requeridos' });
  }

  let connection;
  try {
    connection = await mysql.createConnection(db);
    const [rows] = await connection.execute(
      'SELECT * FROM usuarios WHERE Correo = ? AND Contraseña = ?',
      [correo, contrasena]
    );
    console.log(rows)
    if (rows.length > 0) {
      const usuario = rows[0];

      req.session.usuario = usuario;
      console.log("Sesión guardada:", req.session.usuario);

      return res.status(200).json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: usuario,
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return res.status(500).json({
      success: false,
      message: 'Error del servidor',
    });
  } finally {
    if (connection) await connection.end();
  }
});

app.get('/api/contactos', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(db);
    const [contactos] = await connection.execute(`
      SELECT 
        Id_Contacto,
        Imagen,
        Nombre,
        Cargo,
        Telefono,
        Ciudad
      FROM contactos
    `);
    res.json({ success: true, data: contactos });
  } catch (error) {
    handleDbError(error, res);
  } finally {
    if (connection) await connection.end();
  }
});

// Editar contacto
app.put('/api/contactos/:id', async (req, res) => {
  const { id } = req.params;
  const { Nombre, Cargo, Telefono, Ciudad, Imagen } = req.body;

  if (!Nombre || !Cargo || !Telefono || !Ciudad) {
    return res.status(400).json({ success: false, message: 'Datos incompletos' });
  }

  let connection;
  try {
    connection = await mysql.createConnection(db);
    const [result] = await connection.execute(
      `UPDATE contactos SET Nombre = ?, Cargo = ?, Telefono = ?, Ciudad = ?, Imagen = ? WHERE Id_Contacto = ?`,
      [Nombre, Cargo, Telefono, Ciudad, Imagen || '', id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Contacto no encontrado' });
    }

    res.json({ success: true, message: 'Contacto actualizado correctamente' });
  } catch (error) {
    handleDbError(error, res);
  } finally {
    if (connection) await connection.end();
  }
});

// Eliminar contacto
app.delete('/api/contactos/:id', async (req, res) => {
  const { id } = req.params;
console.log('Eliminar contacto id:', id); 
  let connection;
  try {
    connection = await mysql.createConnection(db);
    const [result] = await connection.execute(
      `DELETE FROM contactos WHERE Id_Contacto = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Contacto no encontrado' });
    }

    res.json({ success: true, message: 'Contacto eliminado correctamente' });
  } catch (error) {
    handleDbError(error, res);
  } finally {
    if (connection) await connection.end();
  }
});

// Agregar un nuevo contacto
app.post('/api/contactos', async (req, res) => {
  const { Nombre, Cargo, Telefono, Ciudad, Imagen } = req.body;
  if (!Nombre || !Cargo || !Telefono || !Ciudad) {
    return res.status(400).json({ success: false, message: 'Datos incompletos' });
  }

  let connection;
  try {
    connection = await mysql.createConnection(db);
    const [result] = await connection.execute(
      `INSERT INTO contactos (Nombre, Cargo, Telefono, Ciudad, Imagen) VALUES (?, ?, ?, ?, ?)`,
      [Nombre, Cargo, Telefono, Ciudad, Imagen || '']
    );

    res.status(201).json({ 
      success: true, 
      message: 'Contacto creado correctamente',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error al crear contacto:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.end();
  }
});
app.get('/api/contactos/:id', async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await mysql.createConnection(db);
    const [rows] = await connection.execute(
      `SELECT Id_Contacto, Imagen, Nombre, Cargo, Telefono, Ciudad
       FROM contactos
       WHERE Id_Contacto = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contacto no encontrado' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error al obtener contacto:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  } finally {
    if (connection) await connection.end();
  }
});



app.get('/api/usuarios', (req, res) => {
  if (req.session.usuario) {
    res.json({ success: true, data: req.session.usuario });
  } else {
    res.status(401).json({ success: false, message: 'No hay sesión activa' });
  }
});

//cerrar sesion
app.post('/api/cerrarsesi', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error al destruir sesión:', err);
      return res.status(500).json({ success: false, message: 'Error al cerrar la sesión' });
    }
    res.clearCookie('connect.sid'); 
    res.json({ success: true, message: 'Sesión cerrada' });
  });
});

app.listen(5000, () => { });