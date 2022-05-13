const express = require('express');
const { enableRat } = require('../dist');

const app = express();
app.use(express.static('public'));
enableRat(app);

app.set('view engine', 'rat');

app.get('/:subject', (req, res) => {
    const { subject } = req.params;
    const { names: sentNames, color: textColor } = req.query;
    const names = sentNames ? sentNames.split(',') : [];
    res.render('index', {
        subject,
        section1: 'Money',
        section1img: '/money.jpg',
        names,
        textColor: textColor || 'initial',
    });
});

app.listen(8080, () => {
    console.log('Listening on 8080!');
});
