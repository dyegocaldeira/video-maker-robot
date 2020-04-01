const state = require('./state');
const gm = require('gm').subClass({ imageMagick: true });
const videoshow = require("videoshow");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
let ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
const fs = require('fs');
const path = require('path')

async function robot() {

    console.log(`> [Video-robot] Starting ...`);


    const content = state.load();

    await converAllImages(content);
    await createAllSentenceImages(content);
    await createYouTubeThumbnail(content);
    await renderVideoWithNode(content);

    state.save(content);

    async function converAllImages(content) {

        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {

            try {

                await convertImage(sentenceIndex);
            } catch (err) {

                Promise.resolve(`> [Video-robot] Converted error: ${err}`);
            }
        }
    }

    async function convertImage(sentenceIndex) {

        return new Promise((resolve, reject) => {

            const inputFile = path.resolve(__dirname, '..', '..', 'content', `${content.searchTerm}`, `${sentenceIndex}-original.png`);

            if (!fs.existsSync(inputFile)) {

                return reject();
            }

            const outputFile = path.resolve(__dirname, '..', '..', 'content', `${content.searchTerm}`, `${sentenceIndex}-converted.png`);
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
                        console.log(`error: ${error}`)
                        return reject(error);
                    }

                    console.log(`> [Video-robot] Image converted: ${outputFile}`);
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

            const outputFile = `./content/${content.searchTerm}/${sentenceIndex}-sentence.png`;

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

                    console.log(`> [Video-robot] Sentence created: ${outputFile}`)
                    resolve()
                })
        })
    }

    async function createYouTubeThumbnail() {

        return new Promise((resolve, reject) => {

            gm()
                .in(`./content/${content.searchTerm}/0-converted.png`)
                .write(`./content/${content.searchTerm}/youtube-thumbnail.jpg`, (error) => {

                    if (error) {

                        return reject(error)
                    }

                    console.log('> [Video-robot] YouTube thumbnail created')
                    resolve()
                })
        })
    }

    async function createAfterEffectsScript(content) {

        await state.saveScript(content);
    }

    async function renderVideoWithNode(content) {

        const images = [];

        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {

            if (fs.existsSync(`./content/${content.searchTerm}/${sentenceIndex}-converted.png`)) {

                images.push({
                    path: `./content/${content.searchTerm}/${sentenceIndex}-converted.png`,
                    caption: content.sentences[sentenceIndex].text,
                    transition: true,
                    transitionDuration: 1, // seconds, 
                });
            }
        }

        const videoOptions = {
            captionDelay: 2000,
            fps: 50,
            loop: 15, // seconds
            transition: true,
            transitionDuration: 1, // seconds
            videoBitrate: 1024,
            videoCodec: 'libx264',
            size: '1920x1080',
            audioBitrate: '128k',
            audioChannels: 2,
            format: 'mp4',
            pixelFormat: 'yuv420p',
            useSubRipSubtitles: false, // Use ASS/SSA subtitles instead
            subtitleStyle: {
                Fontname: 'Arial',
                Fontsize: '40',
                PrimaryColour: '11861244',
                SecondaryColour: '11861244',
                TertiaryColour: '11861244',
                BackColour: '-2147483640',
                Bold: '2',
                Italic: '0',
                BorderStyle: '2',
                Outline: '2',
                Shadow: '3',
                Alignment: '1', // left, middle, right
                MarginL: '40',
                MarginR: '60',
                MarginV: '40'
            }
        };

        // const audioParams = {
        //     fade: true,
        //     delay: 2,
        //     volume: 5
        // }

        // const logoParams = {
        //     start: 0,
        //     end: 10,
        //     xAxis: 20,
        //     yAxis: 20
        // }

        console.log(`> [Video-robot] Starting render video...`);

        let lastPercent;

        const { searchTerm, prefix } = content;

        videoshow(images, videoOptions)
            // .audio('/home/osboxes/repositories/video-maker-robot/src/templates/1/newsroom.mp3', audioParams)
            // .logo(`./content/youtube-thumbnail.jpg`, logoParams)
            .save(`./content/${content.searchTerm}/${prefix}-${searchTerm}.mp4`)
            .on('error', (err, stdout, stderr) => {

                console.error('Error:', err);
                console.error('ffmpeg stderr:', stderr);
            })
            .on('progress', progress => {

                const percent = Math.round(progress.percent);

                if (lastPercent !== percent) {

                    lastPercent = percent;

                    console.log(`> [Video-robot] Render processing: ${percent}%`);
                }
            })
            .on('end', output => {

                // console.error('Video created in:', output);
                console.log(`> [Video-robot] Rendering finished!`);
            });
    }
}

module.exports = robot;