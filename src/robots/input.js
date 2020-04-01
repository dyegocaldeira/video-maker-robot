const readline = require('readline-sync');
const state = require('./state.js');
const fs = require('fs');

function robot() {

    const content = {
        maximumSentences: 7
    };

    content.searchTerm = askAndReturnSearchTerm();
    content.prefix = askAndReturnPrefix();
    content.typeImg = askAndReturnTypeImg();

    createDirProcess(content);

    state.save(content);

    function askAndReturnSearchTerm() {

        return readline.question('Type a Wikipedia search term: ');
    }

    function askAndReturnPrefix() {

        const prefixes = ['Quem é', 'O que é', 'A história de'];
        const selectedPrefix = readline.keyInSelect(prefixes, 'Choose one option: ');
        const selectedPrefixText = prefixes[selectedPrefix];

        return selectedPrefixText;
    }

    function createDirProcess(content) {

        const dir = `./content/${content.searchTerm}`;

        if (!fs.existsSync(dir)) {

            fs.mkdirSync(dir);
        }
    }

    function askAndReturnTypeImg(content) {

        const prefixes = ['Foto', 'Face'];
        const selectedPrefix = readline.keyInSelect(prefixes, 'Choose one option: ');
        const selectedPrefixText = selectedPrefix ? 'photo' : 'face';

        return selectedPrefixText;
    }
}

module.exports = robot;