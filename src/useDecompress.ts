import { ZipReader, BlobReader, Entry, BlobWriter } from "@zip.js/zip.js";

interface Chapters {
    [key: string]: Entry[];
}

async function getEntries(file: any) {
    const reader = new ZipReader(new BlobReader(file));
    return reader.getEntries();
}

function chaptersObj(entries: any): [string, Entry[]][] {
    return Object.entries(
        entries.reduce((acc: Chapters, el: Entry) => {
            const chapter = el.filename.split("/")[2];

            if (!acc[chapter]) acc[chapter] = [];

            acc[chapter]!.push(el);

            return acc;
        }, {}),
    );
}

export async function decompressAndSort(file: any): Promise<[string, Entry[]][] | undefined> {
    const entries = await getEntries(file);

    if (!entries) return;

    const chapters = chaptersObj(entries)
        .sort((a, b) => {
            const aNumber = parseFloat(a[0].match(/\d+/g)!.slice(0, 1).join("."));
            const bNumber = parseFloat(b[0].match(/\d+/g)!.slice(0, 1).join("."));

            return aNumber - bNumber;
        })
        .map(([title, entries]) => {
            const sorted = entries.sort((a, b) => {
                const aNumber = parseInt(a.filename.split("/")[3].match(/\d+/g)![0]);
                const bNumber = parseInt(b.filename.split("/")[3].match(/\d+/g)![0]);

                return aNumber - bNumber;
            });

            return <[string, Entry[]]>[title, sorted];
        });

    return chapters;
}

export async function createUrl(entry: Entry) {
    return URL.createObjectURL(await entry.getData!(new BlobWriter()));
}
