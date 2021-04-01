'use strict';

const express = require('express'),    
    cors = require('cors'),
    path = require('path');    

//
const { google } = require('googleapis');    
const googleConfig = require('./googleconfig');

const ENV = process.env.NODE_ENV;

const app = express();
app.use(cors());
const port = 8080;

app.get("/api", (req, res) => {

    // je recupere les donnees de la spreadsheet

    let ID = '11zQcFFXLuyLq5AO69aLGhp0EIli8k6zmwKHwn2A0IfI';
    
    const authServiceAccClient = new google.auth.JWT(
        googleConfig.client_email,
        null,
        googleConfig.private_key,
        ["https://www.googleapis.com/auth/spreadsheets"],
        null
    );     
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


            // je renvoie les donnee au client
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