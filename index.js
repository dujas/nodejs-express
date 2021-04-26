'use strict';

const express = require('express'),    
    bodyParser = require('body-parser'),
    cors = require('cors'),
    multer = require('multer'),
    fs = require('fs'),
    { Readable } = require('stream'),
    path = require('path');    

//
const { google } = require('googleapis');    
const googleConfig = require('./googleconfig');

//
const upload = multer();

const ENV = process.env.NODE_ENV;

const app = express();
app.use(bodyParser.json());
app.use(cors());
const port = 8080;

const _uploadToDrive = (file, authServiceAccClient) => {

    let folderId = '1HhbQBIm2xumYZr_UY5fLotK1ZutRt6_p'; // Id du dossier Google Drive

    return new Promise((resolve, reject) => {

        const drive = google.drive('v3');

        drive.files.create({
            auth: authServiceAccClient,
            resource: { 
                name: file.originalname,
                parents: [folderId] // emplacement de l'image 
            },
            media: {
                mimeType: file.mimetype,
                body: Readable.from(file.buffer)
            }
        }, (err, resp) => {
            if (err) {                
                res.status(500).send(err);
                reject();
            } else {
                let data = resp.data;
                let fileId = data.id;
                let fileUrl = `https://drive.google.com/file/d/${fileId}`;
                resolve(fileUrl);
            }            
        });        
    });
}

//
app.post("/api/submit",  upload.single('file'), (req, res) => {

    // id du fichier Google Sheet
    let ID = '11zQcFFXLuyLq5AO69aLGhp0EIli8k6zmwKHwn2A0IfI'; 

    // On genere un token pour authentifier notre requete aupres de Google
    const authServiceAccClient = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, 'googleconfig.json'),
        scopes: [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive"
        ]        
    });         

    // on recoit les donnees en format JSON
    let body = req.body;    
    let file = req.file;


    // On enregistre le fichier dans Drive
    _uploadToDrive(file, authServiceAccClient)
    .then(fileUrl => {

        // APi Sheets
        let sheets = google.sheets('v4');    
        
        // On transforme les donéees en un tableau à 2 dimensions
        let values = [ [ body.email, body.subject, body.message, fileUrl ] ];

        // On enregistre dans le fichier Sheet dans l'onglet "FORM"
        sheets.spreadsheets.values.append({
            auth: authServiceAccClient,
            spreadsheetId: ID,
            range: 'FORM!A:Z',
            valueInputOption: 'RAW',
            resource: {
                values: values,
                majorDimension: 'ROWS'
            }
        }, (err, resp) => {
            if (err) {
                res.status(500).send(err);
            } else {
                res.send('ok');
            }
        });
    })
})


//
app.get("/api", (req, res) => {

    // id du fichier Google Sheet
    let ID = '11zQcFFXLuyLq5AO69aLGhp0EIli8k6zmwKHwn2A0IfI'; 
    
    // je recupere les donnees du fichier Sheets
    const authServiceAccClient = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, 'googleconfig.json'),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]        
    });             
    let sheets = google.sheets('v4');
    sheets.spreadsheets.values.get({
        auth: authServiceAccClient,
        spreadsheetId: ID,
        range: "data!A1:B100",
        valueRenderOption: 'UNFORMATTED_VALUE'
    }, (err, resp) => {
        if (err) {
            res.status(500).send(err);
        } else {            
            let data = resp.data;
            let values = [];

            let header = [];
            let block = [];
            let comment = [];
            let formation = [];

            // je classe les valeurs par groupes 
            data.values.forEach((d) => {
                if (d.some(dd => (dd || '').toLowerCase().indexOf('header') > -1)) {
                    header.push(d);    
                }                
                if (d.some(dd => (dd || '').toLowerCase().indexOf('block') > -1)) {
                    block.push(d);    
                }                
                if (d.some(dd => (dd || '').toLowerCase().indexOf('comment') > -1)) {
                    comment.push(d);    
                }                
                if (d.some(dd => (dd || '').toLowerCase().indexOf('formation') > -1)) {
                    formation.push(d);    
                }                                
            });

            // je les converties en un objet JavaScript
            let oHeader = {};
            header.forEach(h => {
                oHeader[h[0]] = h[1];
            });


            let oBlock = {};
            block.forEach(h => {
                oBlock[h[0]] = h[1];
            });

            let oComment = {};
            comment.forEach(h => {
                oComment[h[0]] = h[1];
            });

            let oFormation = {};
            formation.forEach(h => {
                oFormation[h[0]] = h[1];
            });            


            // je renvoie les donnees au client
            res.send({ header: oHeader, block: oBlock, comment: oComment, formation: oFormation });
        }
    });    
});


// si on est en production
if ('production' === process.env.NODE_ENV) {

    app.use(express.static(path.join(__dirname, "build")));
    app.get("/*", (req, res) => {
      res.sendFile(path.join(__dirname, "build/index.html"));
    });
}


app.listen( port, () => {
    console.log( `[ ENV ]: ${ process.env.NODE_ENV || 'development' }` );
    console.log( `[ PORT ]: ${ port }` );
});

module.exports = app;