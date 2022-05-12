const fs = require('fs');
const path = require('path');
const renderRat = (content, opts, err) => {
    let updated = content;
    let cssFile = null;

    // Variable loops
    const loops = updated.matchAll(
        /!%([a-zA-Z0-9_]*?)% \*([a-zA-Z0-9_]*)\* ?{\s*(.*)\s*}/g
    );
    while (!(next = loops.next()).done) {
        if (!opts[next.value[1]]) {
            err('Variable not defined: ' + next.value[1]);
            return;
        }
        if (!Array.isArray(opts[next.value[1]])) {
            err('Cannot loop over non-array variable: ' + next.value[1]);
            return;
        }
        let replaceString = '';
        for (const elem of opts[next.value[1]]) {
            replaceString +=
                next.value[3].replaceAll(
                    new RegExp(`%${next.value[2]}%`, 'g'),
                    elem
                ) + '\n';
        }
        updated = updated.replace(next.value[0], replaceString);
    }

    // Variables
    const vars = updated.matchAll(/(?<!\!)%([a-zA-Z0-9-_]*?)%/g);
    while (!(next = vars.next()).done) {
        if (!opts[next.value[1]]) {
            err('Variable not defined: ' + next.value[1]);
            return;
        }
        updated = updated.replace(next.value[0], opts[next.value[1]]);
    }

    // custom properties
    let props = true;
    const cssProps = {};
    while (props) {
        const line = updated.split('\n')[0];
        if (!line.startsWith('^ ')) {
            props = false;
            break;
        }
        updated = updated.slice(updated.indexOf(line) + line.length + 1);
        regexMatch = line.matchAll(/^\^ ([a-zA-Z]*):\s*(.*)/g);
        const next = regexMatch.next();
        switch (next.value[1]) {
            case 'theme':
                cssProps['--color-theme'] = next.value[2];
                break;
            case 'bg':
                cssProps['--bg-color'] = next.value[2];
                break;
            case 'css':
                cssFile = next.value[2];
                break;
            default:
                err(`Property not defined: ${next.value[1]}.`);
                return;
        }
    }

    // Links
    updated = updated.replaceAll(/(\S+)<(.*)>/g, `<a href="$2">$1</a>`);
    updated = updated.replaceAll(/\s<([^a\n][^\n]*)>/g, `<a href="$1">$1</a>`);

    // Headers
    const headerMatch = updated.matchAll(/(?<=(?:\n|^)(\s*)?)(>+)(.+)/g);
    while (!(next = headerMatch.next()).done) {
        if (next.value[2].length > 6) {
            err('Incorrect number of > before header; only accept 1-6');
            return;
        }
        updated = updated.replace(
            next.value[0],
            `<h${next.value[2].length}>${next.value[3]}</h${next.value[2].length}>`
        );
    }
    // Divs
    let last = updated;
    do {
        last = updated;
        updated = updated.replaceAll(
            /\{\.([a-zA-Z0-9-_]+)([^]*?)(?:\}|(?:\{[^]*?\})[^]*\})/g,
            `<div class="$1">$2</div>`
        );
        updated = updated.replaceAll(
            /\|\.([a-zA-Z0-9-_]+)([^]*?)(?:\||(?:\|[^]*?\|)[^]*\|)/g,
            `<div class="centered $1">$2</div>`
        );
        updated = updated.replaceAll(/\{([^]*?)(?:\}|(?:\{[^]*?\})[^]*\})/g, `<div>$1</div>`);
        updated = updated.replaceAll(
            /\|([^]*?)(?:\}|(?:\|[^]*?\|)[^]*\|)/g,
            `<div class="centered">$1</div>`
        );
    } while (last !== updated);

    // ULs
    updated = updated.replaceAll(/- (.*)/g, '<li>$1</li>');
    updated = updated.replaceAll(/((<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');

    // OLs
    updated = updated.replaceAll(/\d. (.*)/g, '<li class="oli">$1</li>');
    updated = updated.replaceAll(
        /((<li class="oli">.*<\/li>\s*)+)/g,
        '<ol>$1</ol>'
    );

    // Videos
    updated = updated.replaceAll(
        /\[{2}(.*)\]{2}/g,
        `<div><video><source src="$1"/></video></div>`
    );

    // Imgs
    updated = updated.replaceAll(/\[(.*)\]/g, `<img src="$1"/>`);

    // Floating text
    updated = updated.replaceAll(
        /(?<=\n\s*[^<]*)([^\s<][^<\n]*)/g,
        `<p>$1</p>`
    );
    updated = updated.replaceAll(/(?<=^\s*)(<a.*)$/gm, '<p>$1</p>');

    // newlines
    updated = updated.replaceAll(/(\r?\n){3}/g, '<br />');
    let cssText = '';
    if (!cssFile) {
        const text = fs.readFileSync(
            path.join(__dirname, './rat-def.css'),
            'utf8'
        );
        cssText += text;
        cssFile = 'none';
    }
    cssText +=
        '\n:root { \n' +
        Object.keys(cssProps)
            .map((prop) => `\t${prop}: ${cssProps[prop]};`)
            .join('\n') +
        '\n}';
    if (cssFile === 'none') {
        return `<head>\n<style>\n${cssText}\n</style>\n</head>\n<body>\n${updated}\n</body>`;
    }
    return `<head>\n<link rel="stylesheet" type="text/css" href=${cssFile} />\n<style>\n${cssText}\n</style>\n</head>\n<body>\n${updated}\n</body>`;
};

const enableRat = (app) => {
    app.engine('rat', (path, opts, callback) => {
        fs.readFile(path, (err, content) => {
            if (err) return callback(err);
            const passedOptions = {};
            for (const opt of Object.keys(opts)) {
                if (opt !== 'settings' && opt != 'cache' && opt !== '_locals')
                    passedOptions[opt] = opts[opt];
            }
            const rendered = renderRat(
                content.toString(),
                passedOptions,
                callback
            );
            return callback(null, rendered);
        });
    });
};

module.exports = { enableRat, renderRat };
