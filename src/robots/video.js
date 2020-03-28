const state = require('./state');
const gm = require('gm').subClass({ imageMagick: true });

async function robot() {

    const content = state.load();

    await converAllImages(content);
    await createAllSentenceImages(content);
    await createYouTubeThumbnail(content);

    state.save(content);

    async function converAllImages(content) {

        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {

            try {

                await convertImage(sentenceIndex);
            } catch (err) {

                Promise.resolve();
            }
        }
    }

    async function convertImage(sentenceIndex) {

        return new Promise((resolve, reject) => {

            const inputFile = `./content/${sentenceIndex}-original.png`;
            const outputFile = `./content/${sentenceIndex}-converted.png`;
            const width = 1920;
            const height = 1080;

            gm()
                .in(inputFile)
                .out('(')
                .out('-clone')
                .out('0')
                .out('-background', 'white')
                .out('-blur', '0x9')
                .out('-resize', `${width}x${height}^`)
                .out(')')
                .out('(')
                .out('-clone')
                .out('0')
                .out('-background', 'white')
                .out('-resize', `${width}x${height}`)
                .out(')')
                .out('-delete', '0')
                .out('-gravity', 'center')
                .out('-compose', 'over')
                .out('-composite')
                .out('-extent', `${width}x${height}`)
                .write(outputFile, error => {

                    if (error) {

                        return reject(error);
                    }

                    console.log(`> [video-robot] Image converted: ${outputFile}`);
                    resolve();
                })
        });
    }

    async function createAllSentenceImages(content) {

        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {

            try {

                await createSentenceImage(sentenceIndex, content.sentences[sentenceIndex].text);
            } catch (err) {
                console.error(err)
                Promise.resolve();
            }
        }
    }

    async function createSentenceImage(sentenceIndex, sentenceText) {

        return new Promise((resolve, reject) => {

            const outputFile = `./content/${sentenceIndex}-sentence.png`;

            const templateSettings = {
                0: {
                    size: '1920x400',
                    gravity: 'center'
                },
                1: {
                    size: '1920x1080',
                    gravity: 'center'
                },
                2: {
                    size: '800x1080',
                    gravity: 'west'
                },
                3: {
                    size: '1920x400',
                    gravity: 'center'
                },
                4: {
                    size: '1920x1080',
                    gravity: 'center'
                },
                5: {
                    size: '800x1080',
                    gravity: 'west'
                },
                6: {
                    size: '1920x400',
                    gravity: 'center'
                }

            }

            gm()
                .out('-size', templateSettings[sentenceIndex].size)
                .out('-gravity', templateSettings[sentenceIndex].gravity)
                .out('-background', 'transparent')
                .out('-fill', 'white')
                .out('-kerning', '-1')
                .out(`caption:${sentenceText}`)
                .write(outputFile, error => {

                    if (error) {

                        return reject(error)
                    }

                    console.log(`> [video-robot] Sentence created: ${outputFile}`)
                    resolve()
                })
        })
    }

    async function createYouTubeThumbnail() {

        return new Promise((resolve, reject) => {

            gm()
                .in('./content/0-converted.png')
                .write('./content/youtube-thumbnail.jpg', (error) => {

                    if (error) {

                        return reject(error)
                    }

                    console.log('> [video-robot] YouTube thumbnail created')
                    resolve()
                })
        })
    }
}

module.exports = robot;