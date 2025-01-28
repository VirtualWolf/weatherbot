import { readFile, writeFile } from 'node:fs/promises';

interface Database {
    [subject: string]: string[];
}

export async function factListener(messageText: string, botName: string) {
    const forgetFactRegex = new RegExp(`:${botName}: forget that (.*?) is (.*)`);
    const forgetFactMatched = messageText.match(forgetFactRegex);

    if (forgetFactMatched) {
        try {
            return await forgetFact({
                subject: forgetFactMatched[1],
                fact: forgetFactMatched[2],
            });
        } catch (err) {
            return [];
        }
    }

    const setFactRegex = new RegExp(`${botName}: (.*?) is (.*)`);
    const setFactMatched = messageText.match(setFactRegex);

    if (setFactMatched) {
        return await setFact({
            subject: setFactMatched[1],
            fact: setFactMatched[2],
        });
    }

    const getFactRegex = new RegExp(`${botName}: define (.*)`);
    const getFactMatched = messageText.match(getFactRegex);

    if (getFactMatched) {
        try {
            return await getFact(getFactMatched[1]);
        } catch (err) {
            return [];
        }
    }
}

async function getFact(subject: string) {
    const contents = await readDatabaseFile();

    const facts = contents[subject];

    if (facts) {
        const randomFact = facts[Math.floor(Math.random() * facts.length)];

        return [`${subject} is ${randomFact}`];
    } else {
        return [`${subject} is not something I know about.`];
    }
}

async function setFact({subject, fact}: {subject: string, fact: string}) {
    const contents = await readDatabaseFile();

    const existingFacts = contents[subject];

    if (existingFacts?.includes(fact)) {
        return ['This has already been noted.'];
    }

    if (Array.isArray(existingFacts)) {
        contents[subject].push(fact);
    } else {
        contents[subject] = [fact]
    }

    await writeDatabaseFile(contents);

    return ['Thanks, I have made a note of this.']
}

async function forgetFact({subject, fact}: {subject: string, fact: string}) {
    try {
        const contents = await readDatabaseFile();

        if (!contents[subject]) {
            throw new Error();
        }

        if (!contents[subject].includes(fact)) {
            throw new Error();
        }

        contents[subject] = contents[subject].filter(item => item !== fact);

        await writeDatabaseFile(contents);

        return [`I have forgetten that ${subject} is ${fact}`];
    } catch (err) {
        return [`I don't know anything about that.`];
    }
}

async function readDatabaseFile() {
    try {
        return await JSON.parse(await readFile('facts.json', { encoding: 'utf-8' })) as Database;
    } catch (err) {
        return {}
    }
}

async function writeDatabaseFile(contents: Database) {
    try {
        await writeFile('facts.json', JSON.stringify(
            Object.fromEntries(Object.entries(contents).sort())
        // Write the file with two spaces to make it human readable
        , null, "  "));
    } catch (err) {
        return [`Failed to write database file: ${err}`];
    }
}
