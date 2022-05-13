import fs from 'fs';
import path from 'path';
import { Express } from 'express';
const renderRat = (
    content: string,
    opts: { [variable: string]: string },
    err: (err: string) => void
): string | void => {
    let updated = content;
    let cssFile: string | null = null;

    // Variable loops
    const loops = updated.matchAll(
        /!%([a-zA-Z0-9_]*?)% \*([a-zA-Z0-9_]*)\* ?{\s*(.*)\s*}/g
    );
    let next: IteratorResult<RegExpMatchArray, any>;
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
                next.value[3].replace(
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
    const cssProps: { [prop: string]: string } = {};
    while (props) {
        const line = updated.split('\n')[0];
        if (!line.startsWith('^ ')) {
            props = false;
            break;
        }
        updated = updated.slice(updated.indexOf(line) + line.length + 1);
        const regexMatch = line.matchAll(/^\^ ([a-zA-Z]*):\s*(.*)/g);
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
    updated = updated.replace(/(\S+)<(.*)>/g, `<a href="$2">$1</a>`);
    updated = updated.replace(/\s<([^a\n][^\n]*)>/g, `<a href="$1">$1</a>`);

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
        updated = updated.replace(
            /\{\.([a-zA-Z0-9-_]+)([^]*?)(?:\}|(?:\{[^]*?\})[^]*\})/g,
            `<div class="$1">$2</div>`
        );
        updated = updated.replace(
            /\|\.([a-zA-Z0-9-_]+)([^]*?)(?:\||(?:\|[^]*?\|)[^]*\|)/g,
            `<div class="centered $1">$2</div>`
        );
        updated = updated.replace(
            /\{([^]*?)(?:\}|(?:\{[^]*?\})[^]*\})/g,
            `<div>$1</div>`
        );
        updated = updated.replace(
            /\|([^]*?)(?:\}|(?:\|[^]*?\|)[^]*\|)/g,
            `<div class="centered">$1</div>`
        );
    } while (last !== updated);

    // ULs
    updated = updated.replace(/- (.*)/g, '<li>$1</li>');
    updated = updated.replace(/((<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');

    // OLs
    updated = updated.replace(/\d. (.*)/g, '<li class="oli">$1</li>');
    updated = updated.replace(
        /((<li class="oli">.*<\/li>\s*)+)/g,
        '<ol>$1</ol>'
    );

    // Videos
    updated = updated.replace(
        /\[{2}(.*)\]{2}/g,
        `<div><video><source src="$1"/></video></div>`
    );

    // Imgs
    updated = updated.replace(/\[(.*)\]/g, `<img src="$1"/>`);

    // Floating text
    updated = updated.replace(/(?<=\n\s*[^<]*)([^\s<][^<\n]*)/g, `<p>$1</p>`);
    updated = updated.replace(/(?<=^\s*)(<a.*)$/gm, '<p>$1</p>');

    // newlines
    updated = updated.replace(/(\r?\n){3}/g, '<br />');
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

const enableRat = (app: Express): void => {
    app.engine(
        'rat',
        (
            path: string,
            opts: { [option: string]: any },
            callback: (e: any, rendered?: string) => any
        ) => {
            fs.readFile(
                path,
                (err: NodeJS.ErrnoException | null, content: Buffer) => {
                    if (err) return callback(err);
                    const passedOptions: { [option: string]: string } = {};
                    for (const opt of Object.keys(opts)) {
                        if (
                            opt !== 'settings' &&
                            opt != 'cache' &&
                            opt !== '_locals'
                        )
                            passedOptions[opt] = opts[opt];
                    }
                    const rendered = renderRat(
                        content.toString(),
                        passedOptions,
                        callback
                    );
                    if (!rendered) return;
                    return callback(null, rendered);
                }
            );
        }
    );
};

module.exports = { enableRat, renderRat };
